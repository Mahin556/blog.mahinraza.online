#!/usr/bin/env bash

set -euo pipefail

export PATH="/snap/bin:$PATH"

MY_USER="vagrant"
LXD_CHANNEL="5.21/stable"
PRESEED_FILE="/vagrant/lxd-preseed.yaml"

echo "Disabling swap on host..."
sudo swapoff -a
sudo sed -i '/\sswap\s/s/^/#/' /etc/fstab

echo "Configuring kernel modules and sysctl for Kubernetes in LXD..."
cat <<'EOF' | sudo tee /etc/modules-load.d/k8s-lxc.conf >/dev/null
overlay
br_netfilter
ip_tables
ip6_tables
nf_nat
nf_conntrack
xt_conntrack
tun
EOF

for mod in overlay br_netfilter ip_tables ip6_tables nf_nat nf_conntrack xt_conntrack tun; do
    sudo modprobe "$mod" || true
done

cat <<'EOF' | sudo tee /etc/sysctl.d/99-k8s-lxc.conf >/dev/null
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
net.netfilter.nf_conntrack_max = 524288
fs.inotify.max_user_instances = 8192
fs.inotify.max_user_watches = 524288
EOF

sudo sysctl --system >/dev/null

if ! command -v snap >/dev/null 2>&1; then
    echo "Installing snapd..."
    sudo apt-get update
    sudo apt-get install -y snapd
fi

sudo systemctl enable --now snapd.socket

if ! snap list core >/dev/null 2>&1; then
    echo "Installing core snap..."
    sudo snap install core
fi

if ! snap list lxd >/dev/null 2>&1; then
    echo "Installing LXD ($LXD_CHANNEL)..."
    sudo snap install lxd --channel="$LXD_CHANNEL"
else
    echo "LXD is already installed."
fi

if ! command -v kubectl >/dev/null 2>&1; then
    echo "Installing kubectl..."
    sudo snap install kubectl --classic
else
    echo "kubectl is already installed."
fi

echo "Waiting for LXD to become ready..."
sudo lxd waitready --timeout=60

if ! id "$MY_USER" >/dev/null 2>&1; then
    echo "Creating user: $MY_USER"
    sudo useradd -m "$MY_USER"
fi

if ! id -nG "$MY_USER" | grep -qw lxd; then
    echo "Adding $MY_USER to the lxd group..."
    sudo usermod -aG lxd "$MY_USER"
else
    echo "$MY_USER is already a member of the lxd group."
fi

echo "Initializing LXD..."
sudo lxd init --preseed < "$PRESEED_FILE"

echo
echo "========== LXD Installation Summary =========="
sudo lxc version
sudo lxc network list
sudo lxc storage list
sudo lxc profile list

if [[ -f /vagrant/lxc.sh ]]; then
    echo "Running LXD provisioning..."
    bash /vagrant/lxc.sh provision < /dev/null
    echo
    echo "========== Kubernetes Cluster Nodes =========="
    sudo -u "$MY_USER" kubectl get nodes || true
else
    echo "Error: /vagrant/lxc.sh not found."
    exit 1
fi
