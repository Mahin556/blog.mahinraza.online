---
draft: true
---

# Vagrant Networking: Complete Guide

## 1. Network types

| Type | Directive | Reachable from | Use case |
|---|---|---|---|
| Forwarded port | `forwarded_port` | Host (localhost) | Quick access to a service |
| Private network | `private_network` | Host + other VMs | Isolated dev network, multi-VM |
| Public network | `public_network` | Your LAN | VM appears as a real LAN device |

Every VM also gets a NAT adapter (eth0) by default, used for SSH and outbound internet. Additional networks add eth1, eth2, etc.

## 2. Forwarded ports

```ruby
config.vm.network "forwarded_port", guest: 80, host: 8080
config.vm.network "forwarded_port", guest: 443, host: 8443, host_ip: "127.0.0.1"
config.vm.network "forwarded_port", guest: 53, host: 5353, protocol: "udp"
config.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
```

- `host_ip: "127.0.0.1"` binds only to localhost. Without it, some providers bind to `0.0.0.0` and expose the port to your LAN.
- `auto_correct: true` picks another host port on collision. Vagrant prints the actual port at `vagrant up`.
- Ports below 1024 need root on the host (Linux/Mac). Forward to 8080 instead.
- SSH (guest 22 → host 2222) is auto-forwarded with auto-correct.
- Supported by VirtualBox, VMware, Parallels. Hyper-V does not support forwarded ports. libvirt doesn't implement it natively either (use private network IP instead).

## 3. Private network

### Static IP

```ruby
config.vm.network "private_network", ip: "192.168.56.10"
```

### DHCP

```ruby
config.vm.network "private_network", type: "dhcp"
```

### IPv6

```ruby
config.vm.network "private_network", ip: "fde4:8dba:82e1::c4", netmask: "64"
```

### Custom subnet

```ruby
config.vm.network "private_network", ip: "10.20.30.10", netmask: "255.255.255.0"
```

### Provider specifics

| Provider | Notes |
|---|---|
| VirtualBox | Host-only network. Default allowed range `192.168.56.0/21`. For other ranges, add to `/etc/vbox/networks.conf` (VirtualBox 6.1.28+): `* 10.0.0.0/8` |
| VMware | Creates/uses vmnet host-only networks. Configure with `vmware-netcfg` or `vmnet-cfgcli` |
| libvirt | Creates an isolated libvirt network (virbr). Static IP is set via the libvirt network definition |
| Hyper-V | No static private networks. Uses Default Switch (DHCP), or set the IP inside the guest |
| Docker | Not supported. Use Docker networks |

### Avoid these IPs

- `.1` (host side of the host-only network)
- `.2` (VirtualBox DHCP server on some setups)
- Avoid collisions with VPN/corporate ranges. `192.168.56.x` is rarely used elsewhere, which is why it's the default.

## 4. Public (bridged) network

```ruby
config.vm.network "public_network"
config.vm.network "public_network", bridge: "eth0"
config.vm.network "public_network", bridge: ["en0: Wi-Fi (AirPort)", "en1: Ethernet"]
config.vm.network "public_network", ip: "192.168.1.50"
config.vm.network "public_network", bridge: "eth0", use_dhcp_assigned_default_route: true
```

- Without `bridge:`, Vagrant prompts you to pick an interface at every `up`. Set it explicitly for automation.
- Bridge list is a priority order; Vagrant uses the first that exists.
- Static IP must be in your LAN subnet and outside the DHCP pool.
- `use_dhcp_assigned_default_route: true` makes the bridged interface the default route instead of NAT. Needed if the VM must reach LAN-only resources by default.
- Many corporate/Wi-Fi networks block extra MACs on one port, so bridging over Wi-Fi often fails.
- Security: the VM is exposed to your LAN. Change default creds and the `vagrant` user's insecure key.

## 5. Provider-specific bridging examples

**VirtualBox**
```ruby
config.vm.network "public_network", bridge: "Intel(R) Ethernet Connection"
```
Find names with `VBoxManage list bridgedifs`.

**libvirt**
```ruby
config.vm.network "public_network",
  dev: "br0",
  mode: "bridge",
  type: "bridge"
```
Requires a host bridge (`br0`) created beforehand via netplan/NetworkManager. Alternatively use macvtap: `dev: "eth0", mode: "bridge", type: "direct"`. Note: with macvtap, host and guest can't talk to each other.

**Hyper-V**
```ruby
config.vm.network "public_network", bridge: "Default Switch"
```
Or an external switch you created: `New-VMSwitch -Name ExternalSwitch -NetAdapterName "Ethernet" -AllowManagementOS $true`.

**VMware**
```ruby
config.vm.network "public_network", bridge: "en0: Wi-Fi"
```

## 6. Multi-VM networking

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"

  config.vm.define "web" do |web|
    web.vm.hostname = "web"
    web.vm.network "private_network", ip: "192.168.56.10"
    web.vm.network "forwarded_port", guest: 80, host: 8080
  end

  config.vm.define "db" do |db|
    db.vm.hostname = "db"
    db.vm.network "private_network", ip: "192.168.56.11"
  end
end
```

VMs on the same private network reach each other by IP. For name resolution, add hosts entries:

```ruby
config.vm.provision "shell", inline: <<-SHELL
  echo "192.168.56.10 web" >> /etc/hosts
  echo "192.168.56.11 db"  >> /etc/hosts
SHELL
```

Or use the `vagrant-hostmanager` plugin:

```bash
vagrant plugin install vagrant-hostmanager
```
```ruby
config.hostmanager.enabled = true
config.hostmanager.manage_host = true      # edits host /etc/hosts
config.hostmanager.manage_guest = true
config.hostmanager.ignore_private_ip = false
```

Or `vagrant-hosts` for simpler guest-only management.

## 7. Provider NAT details

### VirtualBox NAT (default adapter 1)
- Outbound only; the host can't reach the guest except via forwarded ports.
- Guest reaches the host at `10.0.2.2`.
- DNS: guest resolver points to `10.0.2.3`.
- Fix slow DNS inside the guest:

```ruby
config.vm.provider "virtualbox" do |vb|
  vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
  vb.customize ["modifyvm", :id, "--natdnsproxy1", "on"]
end
```

### Additional NIC types (VirtualBox)
```ruby
config.vm.provider "virtualbox" do |vb|
  vb.customize ["modifyvm", :id, "--nictype1", "virtio"]
  vb.customize ["modifyvm", :id, "--nicpromisc2", "allow-all"]   # promiscuous, needed for some nested/bridge setups
end
```

### Internal network (VM-to-VM only, host can't reach)
```ruby
config.vm.network "private_network", ip: "192.168.100.10", virtualbox__intnet: "isolated-net"
```
Use `virtualbox__intnet: true` for the default internal network name.

### libvirt
- Default management network `192.168.121.0/24` (`vagrant-libvirt` network, NAT) carries SSH.
- Isolated private networks:

```ruby
config.vm.network "private_network",
  ip: "192.168.50.10",
  libvirt__network_name: "mynet",
  libvirt__dhcp_enabled: false,
  libvirt__forward_mode: "none"     # or "nat", "route", "veryisolated"
```

## 8. Multiple adapters and ordering

Network directives create adapters in order:

```ruby
config.vm.network "private_network", ip: "192.168.56.10"   # eth1
config.vm.network "public_network", bridge: "eth0"          # eth2
```

Interface names inside the guest vary. Ubuntu 18.04+ uses predictable names (`enp0s8`, `enp0s9`), not `eth1`. Don't hardcode; reference by IP or MAC if scripting.

Set a MAC for stable identification (VirtualBox):

```ruby
config.vm.network "private_network", ip: "192.168.56.10", mac: "080027AABBCC"
```

## 9. Hostname, DNS, and /etc/hosts

```ruby
config.vm.hostname = "dev.local"
```

Vagrant sets the hostname and adds a `127.0.1.1` entry for it. If a service (e.g., Apache, Hadoop) resolves the hostname to loopback and misbehaves, override in provisioning:

```ruby
config.vm.provision "shell", inline: "sed -i '/127.0.1.1/d' /etc/hosts && echo '192.168.56.10 dev.local dev' >> /etc/hosts"
```

Custom DNS in the guest (netplan Ubuntu):

```ruby
config.vm.provision "shell", inline: <<-SHELL
  mkdir -p /etc/systemd/resolved.conf.d
  printf "[Resolve]\nDNS=1.1.1.1 8.8.8.8\n" > /etc/systemd/resolved.conf.d/dns.conf
  systemctl restart systemd-resolved
SHELL
```

## 10. Provisioning static IPs on guests

Vagrant configures static IPs by writing netplan/ifupdown config for known guests. For unusual guests, or when it doesn't work, provision it yourself:

```yaml
# /etc/netplan/60-private.yaml
network:
  version: 2
  ethernets:
    enp0s8:
      addresses: [192.168.56.10/24]
```
```bash
netplan apply
```

## 11. Synced folders over network (NFS / SMB)

Network-based sync needs a private network on the guest:

```ruby
config.vm.network "private_network", ip: "192.168.56.10"
config.vm.synced_folder ".", "/vagrant", type: "nfs", nfs_version: 4, nfs_udp: false
```

- NFS on the host: install `nfs-kernel-server` (Linux). macOS has it built-in. Windows doesn't support NFS; use SMB or rsync.
- Host firewall must allow NFS from the guest subnet.
- Vagrant edits `/etc/exports` (needs sudo; configure sudoers to avoid prompts).
- SMB (Windows/Hyper-V): `type: "smb"`, prompts for host credentials.

## 12. Firewall and security notes

- Forwarded ports bound to `0.0.0.0` expose guest services to your LAN. Use `host_ip: "127.0.0.1"`.
- Host UFW/firewalld can block libvirt/VirtualBox networks. For libvirt with UFW, allow traffic on `virbr*` and enable forwarding (`DEFAULT_FORWARD_POLICY="ACCEPT"` in `/etc/default/ufw`).
- Docker's iptables rules can interfere with libvirt/VirtualBox host-only forwarding on the same host.
- Bridged mode puts the VM on your LAN with the default `vagrant/vagrant` credentials and insecure key unless you change them.

## 13. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `The specified host network collides with a non-hostonly network` | Private network IP collides with an existing host interface or bridged network. Change subnet |
| `Vagrant was unable to configure the network` / IP not applied | Guest OS interface naming mismatch. Check `ip a` in guest, provision manually |
| `Error: IP address ... is not within allowed ranges` (VirtualBox) | Add the range to `/etc/vbox/networks.conf` |
| Can't reach guest at private IP | Host firewall, wrong subnet, VPN overriding routes, or interface down. Run `ip a` in guest, `ip route` on host |
| Forwarded port not working | Service bound to `127.0.0.1` inside the guest. Bind to `0.0.0.0` |
| Slow SSH / slow DNS | `UseDNS no` in guest `sshd_config`; enable VirtualBox DNS proxy (see section 7) |
| Port collision on `up` | Use `auto_correct: true` or change host port |
| Bridged VM gets no DHCP | Wi-Fi bridge limitation, switch port security, or wrong bridge interface |
| Hyper-V: VM IP changes on each boot | Default Switch DHCP. Use `vagrant ssh -c "ip a"` or a hostname-based lookup; or use an external switch with a static IP |
| `vagrant up` hangs at "Waiting for machine to boot" | NAT/SSH issue: check `vb.gui = true`, console login, NIC type, VPN conflicts, or nested hypervisor conflict |

Useful commands:

```bash
vagrant ssh-config                     # SSH host/port/key Vagrant uses
vagrant ssh -c "ip -br a; ip route"    # guest network state
VBoxManage list hostonlyifs            # VirtualBox host-only nets
VBoxManage list dhcpservers
virsh net-list --all                   # libvirt networks
virsh net-dhcp-leases default          # libvirt leases
VAGRANT_LOG=debug vagrant up           # verbose logs
```

## 14. Quick reference examples

**Web app, localhost access only**
```ruby
config.vm.network "forwarded_port", guest: 80, host: 8080, host_ip: "127.0.0.1"
```

**Multi-VM cluster, host-reachable**
```ruby
config.vm.network "private_network", ip: "192.168.56.#{10 + i}"
```

**VM as LAN server (e.g., test DNS, Pi-hole, avatar test server)**
```ruby
config.vm.network "public_network", bridge: "eth0", ip: "192.168.1.60"
```

**Fully isolated lab (VirtualBox)**
```ruby
config.vm.network "private_network", ip: "10.10.10.5", virtualbox__intnet: "lab"
```

**Dual-homed (NAT out + private + bridged)**
```ruby
config.vm.network "private_network", ip: "192.168.56.20"
config.vm.network "public_network", bridge: "eth0", use_dhcp_assigned_default_route: true
```

Give me your provider and host OS and I'll write the exact network config.