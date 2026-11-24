#!/usr/bin/env bash
set -euo pipefail

# Kubernetes Bootstrapping Script
# Tested on Ubuntu 24.04 inside LXD

# Configuration
KUBERNETES_VERSION="1.36"
CALICO_VERSION="3.33.0"
POD_NETWORK_CIDR="192.168.0.0/16"
ROOT_PASSWORD="kubeadmin"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

handle_error() {
    log "Error on line $1"
    exit 1
}

trap 'handle_error $LINENO' ERR

install_packages() {
    local packages=("$@")
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -qq -y "${packages[@]}"
}

prepare_lxc_environment() {
    log "TASK 0: Preparing LXC mounts and devices for Kubernetes"
    if [[ ! -e /dev/kmsg ]]; then
        ln -s /dev/console /dev/kmsg
    fi

    cat <<'EOF' > /etc/systemd/system/lxc-rshared.service
[Unit]
Description=Make root mount shared for Kubernetes and CSI
Before=containerd.service kubelet.service
DefaultDependencies=no

[Service]
Type=oneshot
ExecStart=/bin/mount --make-rshared /
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable --now lxc-rshared.service
}

main_tasks() {
    prepare_lxc_environment

    log "TASK 1: Installing essential packages"
    install_packages net-tools curl openssh-server software-properties-common

    log "TASK 2: Installing containerd runtime"
    install_packages apt-transport-https ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    install_packages containerd.io
    mkdir -p /etc/containerd
    containerd config default > /etc/containerd/config.toml
    sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
    systemctl restart containerd
    systemctl enable containerd

    log "TASK 3: Setting up Kubernetes repo"
    curl -fsSL "https://pkgs.k8s.io/core:/stable:/v${KUBERNETES_VERSION}/deb/Release.key" | gpg --dearmor --yes -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v${KUBERNETES_VERSION}/deb/ /" > /etc/apt/sources.list.d/kubernetes.list

    log "TASK 4: Installing Kubernetes components"
    install_packages kubeadm kubelet kubectl
    apt-mark hold kubelet kubeadm kubectl >/dev/null
    systemctl enable kubelet

    log "TASK 5: Enabling SSH password authentication"
    mkdir -p /etc/ssh/sshd_config.d
    shopt -s nullglob
    for cfg in /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf; do
        sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication yes/' "$cfg"
    done
    shopt -u nullglob

    cat <<'EOF' > /etc/ssh/sshd_config.d/01-k8s-root-ssh.conf
PermitRootLogin yes
PasswordAuthentication yes
EOF

    # Enable and start SSH
    systemctl daemon-reload
    systemctl enable --now ssh
    systemctl restart ssh

    log "TASK 6: Setting root password"
    echo "root:${ROOT_PASSWORD}" | chpasswd
    if ! grep -q "export TERM=xterm" /etc/bash.bashrc; then
        echo "export TERM=xterm" >> /etc/bash.bashrc
    fi
}

# Master node specific tasks
master_tasks() {
    log "TASK 7: Pulling required containers"
    kubeadm config images pull

    log "TASK 8: Initializing Kubernetes Cluster"
    kubeadm init --pod-network-cidr="${POD_NETWORK_CIDR}" --ignore-preflight-errors=all >> /root/kubeinit.log 2>&1

    log "TASK 9: Copying kube admin config"
    mkdir -p /root/.kube
    cp -f /etc/kubernetes/admin.conf /root/.kube/config
    export KUBECONFIG=/etc/kubernetes/admin.conf

    log "TASK 10: Deploying Calico network"
    kubectl create -f "https://raw.githubusercontent.com/projectcalico/calico/v${CALICO_VERSION}/manifests/v3_projectcalico_org.yaml"
    kubectl create -f "https://raw.githubusercontent.com/projectcalico/calico/v${CALICO_VERSION}/manifests/tigera-operator.yaml"
    kubectl wait --for=condition=Established crd/installations.operator.tigera.io --timeout=90s
    kubectl create -f "https://raw.githubusercontent.com/projectcalico/calico/v${CALICO_VERSION}/manifests/custom-resources.yaml"

    log "TASK 11: Generating cluster join command"
    joinCommand=$(kubeadm token create --print-join-command 2>/dev/null)
    echo "$joinCommand --ignore-preflight-errors=all" > /joincluster.sh
    chmod +x /joincluster.sh
}

# Worker node specific tasks
worker_tasks() {
    log "TASK 7: Joining node to Kubernetes Cluster"
    install_packages sshpass
    local master_host="kmaster.lxd"
    if ! getent hosts "$master_host" >/dev/null 2>&1; then
        master_host="kmaster"
    fi
    sshpass -p "${ROOT_PASSWORD}" scp -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no "root@${master_host}:/joincluster.sh" /joincluster.sh
    bash /joincluster.sh >> /tmp/joincluster.log 2>&1
}

main() {
    main_tasks

    if [[ $(hostname) =~ .*master.* ]]; then
        master_tasks
    elif [[ $(hostname) =~ .*worker.* ]]; then
        worker_tasks
    else
        log "Unknown node type. Exiting."
        exit 1
    fi

    log "Bootstrap completed successfully"
}

main
