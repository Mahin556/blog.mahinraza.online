---
draft: true
---
### Kubernetes cluster with kubeadm

##### Nodes

```bash
cat << EOF > Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.define "masternode" do |server1|
    server1.vm.box      = "ubuntu/jammy64"
    server1.vm.hostname = "masternode"
    server1.vm.network "private_network", ip: "192.168.56.11"
    server1.vm.provider "virtualbox" do |vb|
      vb.name   = "masternode"
      vb.memory = 2048
      vb.cpus   = 2
    end
  end
  config.vm.define "workernode" do |server2|
    server2.vm.box      = "ubuntu/jammy64"
    server2.vm.hostname = "workernode"
    server2.vm.network "private_network", ip: "192.168.56.12"
    server2.vm.provider "virtualbox" do |vb|
      vb.name   = "workernode"
      vb.memory = 2048
      vb.cpus   = 2
    end
  end
end
EOF
```

```bash
vagrant up
```

# Execute on Both "Master" & "Worker" Nodes:

### Make DNS local entries - Change it as per your requirement
sudo cat >> /etc/hosts << EOF
192.168.56.11 masternode
192.168.56.12 workernode
EOF

### Disable Swap: Required for Kubernetes to function correctly.
sudo swapoff -a
sudo sed -i.bak -e '/swap/s/^/#/g' /etc/fstab
sleep 2

### Load Necessary Kernel Modules: Required for Kubernetes networking.

sudo cat > /etc/modules-load.d/kubernetes.conf << EOF
br_netfilter
overlay
EOF
sudo modprobe overlay
sudo modprobe br_netfilter

### Set Sysctl Parameters: Helps with networking.
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system
lsmod | grep br_netfilter
lsmod | grep overlay

### Install Containerd:
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sleep 2

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

sudo apt-get install -y containerd.io

containerd config default | sed -e 's/SystemdCgroup = false/SystemdCgroup = true/' -e 's/sandbox_image = "registry.k8s.io\/pause:3.6"/sandbox_image = "registry.k8s.io\/pause:3.9"/' | sudo tee /etc/containerd/config.toml

sudo systemctl restart containerd

sudo systemctl is-active containerd

### Install Kubernetes Components:
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

### to lock the versions of the listed packages so they won’t be automatically upgraded during apt upgrade or apt full-upgrade
sudo apt-mark hold kubelet kubeadm kubectl
