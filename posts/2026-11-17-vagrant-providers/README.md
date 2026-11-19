---
title: "Vagrant Providers: Understanding and Configuring Different Providers"
description: "Explore the various providers supported by HashiCorp Vagrant, including VirtualBox, VMware, Hyper-V, and Docker. Learn how to configure and switch between providers for efficient virtual machine management."
date: 2026-11-17
category: "Platform & Systems Engineering"
tags:
  - Virtualization
  - Vagrant
  - HashiCorp
  - Linux
  - DevOps
  - Cheat Sheet
  - CLI
draft: true
---

# Vagrant Providers: Complete Guide

## 1. What a provider is

Vagrant is the workflow layer (Vagrantfile, boxes, provisioning). A **provider** is the backend that actually creates the VM or container. Boxes are **provider-specific**: a VirtualBox box won't boot under VMware or libvirt.

```bash
vagrant up --provider=virtualbox
export VAGRANT_DEFAULT_PROVIDER=libvirt   # default for the shell
vagrant plugin list                       # installed provider plugins
```

Provider resolution order: `--provider` flag → `VAGRANT_DEFAULT_PROVIDER` → first usable provider by priority (plugin providers, then VirtualBox, etc.). `vagrant up` can silently pick the wrong one, so set it explicitly.

## 2. Comparison

| Provider | Ships with Vagrant | Platform | Type | Best for |
|---|---|---|---|---|
| VirtualBox | Yes | Win/Mac(Intel)/Linux | Type 2 hypervisor | Default, free, widest box support |
| VMware Desktop | Plugin | Win/Mac/Linux | Type 2 | Performance, Apple Silicon, nested virt |
| Hyper-V | Yes | Windows Pro/Ent only | Type 1 | Windows w/o VirtualBox conflicts |
| Docker | Yes | Any with Docker | Containers | Fast, lightweight, no full VM |
| libvirt (KVM) | Plugin | Linux | Type 1 (KVM) | Linux servers/workstations, best perf |
| Parallels | Plugin | macOS | Type 2 | Mac, incl. Apple Silicon |
| QEMU | Plugin | Mac/Linux | Emulator/KVM | Apple Silicon, non-x86 arches |
| Cloud (AWS, Azure, GCP, DO…) | Plugins | Any | Remote VMs | Dev/test on real cloud infra |

## 3. VirtualBox

Built in. Install VirtualBox, then:

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.network "private_network", ip: "192.168.56.10"
  config.vm.network "forwarded_port", guest: 80, host: 8080
  config.vm.provider "virtualbox" do |vb|
    vb.memory = 4096
    vb.cpus = 2
    vb.gui = false
    vb.customize ["modifyvm", :id, "--nested-hw-virt", "on"]
  end
end
```

- Private network IPs must be in `192.168.56.0/21` (the default VirtualBox host-only range) unless `/etc/vbox/networks.conf` allows others.
- Synced folders use `vboxsf` (needs Guest Additions; `vagrant-vbguest` plugin automates this).
- Weak spots: slower disk/network than KVM/VMware, limited Apple Silicon support, conflicts with Hyper-V on Windows.

## 4. VMware

Plugin plus the utility service. Both are free for personal and commercial use now that VMware Fusion/Workstation are free; check the current Broadcom/HashiCorp terms for your use case.

```bash
# Install VMware Workstation (Linux/Win) or Fusion (Mac) first, then:
# install vagrant-vmware-utility (OS package/installer from HashiCorp)
vagrant plugin install vagrant-vmware-desktop
```

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-22.04"
  config.vm.provider "vmware_desktop" do |v|
    v.vmx["memsize"] = "4096"
    v.vmx["numvcpus"] = "2"
    v.gui = false
  end
end
```

```bash
vagrant up --provider=vmware_desktop
```

- Faster I/O and graphics than VirtualBox, solid Apple Silicon support (ARM boxes only), good nested virtualization.
- The utility service must be running, otherwise you'll get "connection refused" errors.
- Boxes: `bento/*` publish VMware variants.

## 5. Hyper-V

Built in, Windows Pro/Enterprise/Education only.

```powershell
# Admin PowerShell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
# Run vagrant from an ELEVATED shell
vagrant up --provider=hyperv
```

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "generic/ubuntu2204"
  config.vm.provider "hyperv" do |h|
    h.memory = 4096
    h.cpus = 2
    h.enable_virtualization_extensions = true   # nested virt
    h.linked_clone = true
    h.vmname = "dev-box"
  end
  config.vm.synced_folder ".", "/vagrant", type: "smb"
end
```

Limitations:
- Must run as Administrator.
- No static private networks from the Vagrantfile; networking is via the Default Switch (DHCP). Use `config.vm.network "public_network", bridge: "..."` for bridging, or set the IP inside the guest.
- Synced folders need SMB (prompts for credentials) or `rsync`.
- Enabling Hyper-V turns Windows into a root partition on the hypervisor, which breaks older VirtualBox/VMware setups. Current VirtualBox and VMware can run on the Windows Hypervisor Platform but with a performance penalty.

## 6. Docker

Built in. Vagrant manages a container instead of a VM. No `config.vm.box` is required.

```ruby
Vagrant.configure("2") do |config|
  config.vm.provider "docker" do |d|
    d.image = "ubuntu:22.04"
    d.ports = ["8080:80"]
    d.volumes = ["/data:/data"]
    d.env = { "FOO" => "bar" }
    d.has_ssh = true          # only if the image runs sshd
    d.remains_running = true
  end
end
```

Or build from a Dockerfile:

```ruby
config.vm.provider "docker" do |d|
  d.build_dir = "."
  d.ports = ["3000:3000"]
end
```

- On Mac/Windows, Vagrant spins up a host VM (`docker_host`) automatically if needed.
- Containers need `has_ssh = true` and an SSH-capable image for `vagrant ssh`. Otherwise use `vagrant docker-exec -it -- bash`.
- Many Vagrant features (private networks, snapshots, some provisioners) don't apply. For most container workflows, plain Docker Compose is simpler, and the provider is mainly useful when you want one Vagrantfile spanning VMs and containers.

## 7. libvirt / KVM (Linux)

Best performance on Linux. Likely the right fit for your Ubuntu servers.

```bash
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients \
  libvirt-dev build-essential ruby-dev libxml2-dev libxslt1-dev zlib1g-dev
sudo usermod -aG libvirt,kvm $USER      # re-login after
vagrant plugin install vagrant-libvirt
```

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "generic/ubuntu2204"
  config.vm.provider "libvirt" do |lv|
    lv.memory = 4096
    lv.cpus = 2
    lv.cpu_mode = "host-passthrough"
    lv.nested = true
    lv.storage_pool_name = "default"
    lv.management_network_address = "192.168.121.0/24"
  end
  config.vm.network "private_network", ip: "192.168.50.10"
end
```

```bash
vagrant up --provider=libvirt
```

- Synced folders: NFS (default, needs `nfs-kernel-server`) or `rsync`; there is no native shared-folder driver, and `9p`/`virtiofs` are available via config.
- Can't coexist with VirtualBox running VMs at the same time (both want KVM/VT-x).
- Check if `vagrant plugin install` fails on build deps; it compiles native gems.

## 8. Parallels (macOS)

```bash
# Requires Parallels Desktop Pro/Business
vagrant plugin install vagrant-parallels
vagrant up --provider=parallels
```

```ruby
config.vm.provider "parallels" do |prl|
  prl.memory = 4096
  prl.cpus = 2
  prl.update_guest_tools = true
end
```

Strong Apple Silicon support (ARM64 guests) and good performance, but paid.

## 9. QEMU (Apple Silicon / cross-arch)

```bash
brew install qemu
vagrant plugin install vagrant-qemu
```

```ruby
config.vm.provider "qemu" do |q|
  q.arch = "aarch64"
  q.machine = "virt,accel=hvf,highmem=off"
  q.cpu = "cortex-a72"
  q.memory = "4G"
  q.smp = 2
end
```

A free route for ARM Macs where VirtualBox is limited. Networking and synced folders are more limited than the other providers.

## 10. Cloud providers (plugins)

| Target | Plugin |
|---|---|
| AWS EC2 | `vagrant-aws` |
| Azure | `vagrant-azure` |
| Google Cloud | `vagrant-google` |
| DigitalOcean | `vagrant-digitalocean` |

```ruby
config.vm.box = "digital_ocean"
config.vm.provider :digital_ocean do |do_, override|
  override.ssh.private_key_path = "~/.ssh/id_rsa"
  do_.token = ENV["DO_TOKEN"]
  do_.image = "ubuntu-22-04-x64"
  do_.region = "lon1"
  do_.size = "s-2vcpu-4gb"
end
```

Maintenance status varies. Several are community-maintained and lag behind; for real cloud infra, Terraform is usually the better tool.

## 11. Multi-provider Vagrantfile

One file, multiple backends:

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "generic/ubuntu2204"   # has virtualbox, vmware, libvirt, hyperv variants
  config.vm.hostname = "dev"

  config.vm.provider "virtualbox" do |vb, override|
    vb.memory = 2048
    override.vm.network "private_network", ip: "192.168.56.10"
  end
  config.vm.provider "libvirt" do |lv, override|
    lv.memory = 2048
    override.vm.network "private_network", ip: "192.168.50.10"
  end
  config.vm.provider "hyperv" do |h|
    h.memory = 2048
  end
end
```

Use `override` to change non-provider config (network, box, synced folders) per provider.

## 12. Choosing

| Situation | Pick |
|---|---|
| Linux dev machine/server | **libvirt** |
| Windows, Hyper-V already on | **Hyper-V** |
| Windows/Linux, no Hyper-V, free | **VirtualBox** |
| Max performance, Mac/Win/Linux | **VMware** |
| Apple Silicon | **VMware** or **Parallels** (QEMU if free is required) |
| Fast disposable app env | **Docker** (or just Compose) |
| Need real cloud | Terraform; cloud plugins only for simple cases |

## 13. Common failures

- **"No usable default provider"**: provider not installed or plugin missing; run `vagrant plugin list`.
- **Box "doesn't support the provider"**: box lacks that provider variant; check `vagrant box list` (the provider is shown in parentheses) and pick a box that publishes it (`generic/*`, `bento/*`).
- **VT-x/KVM conflicts**: only one hypervisor can hold VT-x. Stop libvirt/VMware VMs before using VirtualBox, and vice versa.
- **Hyper-V + VirtualBox on Windows**: choose one, or use `bcdedit /set hypervisorlaunchtype off` and reboot (this disables Hyper-V and WSL2).
- **NFS synced folder hangs**: install `nfs-kernel-server`, open the firewall for NFS, or use `type: "rsync"`.
- **Stale state**: `vagrant global-status --prune`, then `vagrant destroy -f`. Provider VMs are tracked in `.vagrant/` per project.
- **Licensing**: Vagrant moved to the Business Source License (BSL) in 2023. Check the current terms if you use it commercially, and consider OpenTofu-style forks/alternatives if that matters to you.

Tell me your host OS and target workload and I'll give you a tailored Vagrantfile.