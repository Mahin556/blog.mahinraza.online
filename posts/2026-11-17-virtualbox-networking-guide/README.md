---
draft: true
---

# VirtualBox Networking: Complete Guide

## 1. Modes at a glance

| Mode | VM → Internet | VM → Host | Host → VM | VM ↔ VM | LAN → VM |
|---|---|---|---|---|---|
| Not attached | No | No | No | No | No |
| NAT | Yes | Yes (via `10.0.2.2`) | Port forward only | No | Port forward only |
| NAT Network | Yes | Yes | Port forward only | Yes | Port forward only |
| Bridged | Yes | Yes | Yes | Yes | Yes |
| Internal | No | No | No | Yes (same name) | No |
| Host-only | No | Yes | Yes | Yes | No |
| Generic driver | Depends | Depends | Depends | Depends | Depends |
| Cloud (OCI) | Yes | No | Via tunnel | Yes | Via tunnel |

Each VM has up to 8 adapters (4 in the GUI, 8 via CLI). Each is configured independently.

## 2. NAT (default)

Per-VM private NAT engine. Guest sits behind the host like a home router.

Defaults for adapter 1:

| Item | Value |
|---|---|
| Guest IP | `10.0.2.15` |
| Gateway | `10.0.2.2` (also the host's loopback alias) |
| DNS | `10.0.2.3` |
| Subnet | `10.0.2.0/24` (adapter 2 gets `10.0.3.0/24`, and so on) |

```bash
VBoxManage modifyvm "vm" --nic1 nat
VBoxManage modifyvm "vm" --natnet1 "192.168.9.0/24"      # change subnet (guest = .15, gw = .2)
```

### Port forwarding

Format: `name,proto,hostip,hostport,guestip,guestport`

```bash
# VM powered off
VBoxManage modifyvm "vm" --natpf1 "ssh,tcp,127.0.0.1,2222,,22"
VBoxManage modifyvm "vm" --natpf1 "web,tcp,127.0.0.1,8080,,80"
VBoxManage modifyvm "vm" --natpf1 delete "web"

# VM running
VBoxManage controlvm "vm" natpf1 "api,tcp,127.0.0.1,3000,,3000"
VBoxManage controlvm "vm" natpf1 delete "api"

ssh -p 2222 user@127.0.0.1
```

- Leave `hostip` empty and the port binds on all host interfaces (LAN exposed). Set `127.0.0.1` to keep it local.
- Host ports below 1024 need root on Linux/macOS.
- Leave `guestip` empty unless the guest has multiple IPs.

### DNS

```bash
VBoxManage modifyvm "vm" --natdnshostresolver1 on   # use host resolver (VPN/split DNS, /etc/hosts)
VBoxManage modifyvm "vm" --natdnsproxy1 on          # proxy DNS via host
```

Use `--natdnshostresolver1 on` when the guest resolves slowly or can't resolve names behind a VPN.

### Tuning

```bash
VBoxManage modifyvm "vm" --natsettings1 "1500,64,64,64,64"   # mtu,socksnd,sockrcv,tcpsnd,tcprcv (KB)
VBoxManage modifyvm "vm" --nataliasmode1 proxyonly           # or log, sameports
VBoxManage modifyvm "vm" --nattftpprefix1 /srv/tftp         # built-in TFTP for PXE
VBoxManage modifyvm "vm" --nattftpfile1 pxelinux.0
```

### NAT limitations

- Guest isn't reachable inbound except via forwards.
- VMs on separate NAT adapters can't see each other.
- ICMP (ping) works for outbound only, with some quirks.
- No raw sockets or multicast from the guest to the outside.

## 3. NAT Network

Shared NAT among multiple VMs. Like NAT, but the VMs share a subnet and can talk to each other.

```bash
VBoxManage natnetwork add --netname natnet1 --network "10.0.5.0/24" --enable --dhcp on
VBoxManage natnetwork list
VBoxManage natnetwork modify --netname natnet1 --port-forward-4 "ssh-vm1:tcp:[127.0.0.1]:2201:[10.0.5.15]:22"
VBoxManage natnetwork modify --netname natnet1 --port-forward-4 delete ssh-vm1
VBoxManage natnetwork start --netname natnet1
VBoxManage natnetwork stop --netname natnet1
VBoxManage natnetwork remove --netname natnet1

VBoxManage modifyvm "vm1" --nic1 natnetwork --nat-network1 natnet1
VBoxManage modifyvm "vm2" --nic1 natnetwork --nat-network1 natnet1
```

- Port forwarding must target the guest IP explicitly (no empty `guestip`).
- Disable DHCP (`--dhcp off`) to assign static IPs.
- The host is not on this subnet. VMs reach the host via the gateway address (`.1`) and the host reaches VMs only through forwards.
- IPv6: `--ipv6 on`, `--loopback-4`/`--loopback-6` for mapping host loopback.

## 4. Bridged

VM gets its own MAC and IP on your physical LAN.

```bash
VBoxManage list bridgedifs                                  # find the adapter name
VBoxManage modifyvm "vm" --nic1 bridged --bridgeadapter1 "eth0"
```

- Wired Ethernet works reliably.
- Wi-Fi works on most hosts but fails when the AP blocks multiple MACs per client (enterprise networks, hotspots, hotel Wi-Fi). Switch to NAT + forwards or Host-only + NAT.
- On Linux, bridging uses the `vboxnetflt` kernel module. Verify with `lsmod | grep vboxnetflt`.
- Bridging to a Linux bridge (`br0`) works, but you must give `--bridgeadapter1 br0`.
- Switch port security (one MAC per port) breaks bridged mode.
- The VM is exposed to the LAN. Harden before use.

### Promiscuous mode

```bash
VBoxManage modifyvm "vm" --nicpromisc1 deny         # default
VBoxManage modifyvm "vm" --nicpromisc1 allow-vms    # promisc between VMs only
VBoxManage modifyvm "vm" --nicpromisc1 allow-all    # needed for packet capture, nested VBox, macvlan, some router VMs
```

## 5. Internal Network

VM-to-VM only, isolated from host and internet. Same `intnet` name = same segment.

```bash
VBoxManage modifyvm "vm1" --nic1 intnet --intnet1 "lab"
VBoxManage modifyvm "vm2" --nic1 intnet --intnet1 "lab"
```

No DHCP by default. Either assign static IPs in the guests or run VirtualBox's DHCP server:

```bash
VBoxManage dhcpserver add --network=lab \
  --server-ip=10.10.10.1 --netmask=255.255.255.0 \
  --lower-ip=10.10.10.100 --upper-ip=10.10.10.200 --enable
VBoxManage dhcpserver remove --network=lab
```

(On 6.x use `--netname lab`, `--ip`, `--lowerip`, `--upperip`.)

Common pattern: a router/firewall VM (NAT or bridged on NIC1, internal on NIC2) in front of isolated VMs on the internal net.

## 6. Host-only

Host ↔ VMs private network. No internet unless you add a NAT adapter.

### Classic (vboxnetN interfaces)

```bash
VBoxManage hostonlyif create                  # creates vboxnet0
VBoxManage hostonlyif ipconfig vboxnet0 --ip 192.168.56.1 --netmask 255.255.255.0
VBoxManage list hostonlyifs
VBoxManage hostonlyif remove vboxnet0

VBoxManage modifyvm "vm" --nic2 hostonly --hostonlyadapter2 vboxnet0
```

DHCP:

```bash
VBoxManage dhcpserver add --interface=vboxnet0 \
  --server-ip=192.168.56.100 --netmask=255.255.255.0 \
  --lower-ip=192.168.56.101 --upper-ip=192.168.56.254 --enable
```

### VirtualBox 7.0+ host-only networks

Cross-platform replacement that doesn't need host interface management:

```bash
VBoxManage hostonlynet add --name=hostnet1 --netmask=255.255.255.0 \
  --lower-ip=192.168.57.101 --upper-ip=192.168.57.254 --enable
VBoxManage modifyvm "vm" --nic2 hostonlynet --host-only-net2=hostnet1
```

### Address range restriction (Linux, macOS, Solaris)

Since 6.1.28, the host-only interface IP must be in the allowed list. Default allowed: `192.168.56.0/21` (and IPv6 `fe80::/10`-style link-local equivalent). To allow others, create `/etc/vbox/networks.conf`:

```
* 10.0.0.0/8 192.168.0.0/16
* 2001::/64
```

Format: `* <cidr> [<cidr>...]`. Create the directory and file if missing. No restart needed for new interfaces.

### Internet + host access (the standard dev setup)

NIC1 = NAT (internet, default route), NIC2 = Host-only (static IP from the host).

```bash
VBoxManage modifyvm "vm" --nic1 nat
VBoxManage modifyvm "vm" --nic2 hostonly --hostonlyadapter2 vboxnet0
```

## 7. Adapter types

```bash
VBoxManage modifyvm "vm" --nictype1 virtio
```

| Type | Use |
|---|---|
| `82540EM` (Intel PRO/1000 MT Desktop) | Default; broad OS support |
| `82543GC` | Intel PRO/1000 T Server; older guests |
| `82545EM` | Intel PRO/1000 MT Server; use for Windows Server / some Linux |
| `Am79C970A` / `Am79C973` | AMD PCnet; legacy |
| `virtio` | Fastest for Linux guests; needs virtio drivers on Windows |

Pick `virtio` for Linux guests that need throughput. Pick Intel for Windows or unknown guests.

## 8. Other per-NIC controls

```bash
VBoxManage modifyvm "vm" --macaddress2 080027AABBCC      # fixed MAC (use for DHCP reservations)
VBoxManage modifyvm "vm" --cableconnected2 on|off        # simulate cable unplug
VBoxManage controlvm "vm" setlinkstate2 off              # unplug cable live
VBoxManage modifyvm "vm" --nic3 none                     # disable adapter
VBoxManage modifyvm "vm" --nictrace1 on --nictracefile1 /tmp/vm.pcap   # packet capture (Wireshark)
```

Bandwidth limits:

```bash
VBoxManage bandwidthctl "vm" add Limit --type network --limit 10m
VBoxManage modifyvm "vm" --nicbandwidthgroup1 Limit
VBoxManage bandwidthctl "vm" set Limit --limit 50m       # change live
```

## 9. Inspecting state

```bash
VBoxManage showvminfo "vm" --machinereadable | grep -E '^(nic|macaddress|bridgeadapter|hostonly|intnet|Forwarding|natnet)'
VBoxManage list vms
VBoxManage list hostonlyifs
VBoxManage list hostonlynets
VBoxManage list dhcpservers
VBoxManage list natnets
VBoxManage list bridgedifs
VBoxManage guestproperty enumerate "vm" | grep Net     # needs Guest Additions
VBoxManage guestproperty get "vm" "/VirtualBox/GuestInfo/Net/1/V4/IP"
```

## 10. Guest-side configuration (Ubuntu)

Interface names are predictable (`enp0s3` NAT, `enp0s8` second NIC, `enp0s9` third). Check with `ip -br a`.

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true            # NAT
    enp0s8:
      addresses: [192.168.56.10/24]   # host-only static
      # no gateway here; NAT keeps the default route
```

```bash
sudo netplan apply
```

For a bridged static IP with default route:

```yaml
    enp0s3:
      addresses: [192.168.1.60/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

Don't give two NICs default gateways without route metrics or you'll get asymmetric routing. If both NAT and bridged are present, set `dhcp4-overrides: {route-metric: 200}` on the one you don't want as primary.

## 11. Host-side configuration notes

### Linux

- Modules: `vboxdrv`, `vboxnetflt` (bridged), `vboxnetadp` (host-only). Rebuild with `sudo /sbin/vboxconfig` after kernel updates; Secure Boot requires signed modules.
- UFW/iptables can block host-only traffic. Allow the interface: `sudo ufw allow in on vboxnet0`.
- Docker's iptables rules can interfere with VM forwarding on the same host. Check `iptables -L FORWARD -n`.
- To share the host's internet with a host-only-only VM instead of using a NAT NIC, you'd enable `net.ipv4.ip_forward=1` and add an iptables MASQUERADE rule. Adding a NAT adapter is simpler.

### Windows

- Host-only creates a "VirtualBox Host-Only Ethernet Adapter". Windows may classify it as a Public network and block inbound. Set it to Private, or allow in Windows Defender Firewall.
- VirtualBox coexisting with Hyper-V/WSL2/Credential Guard uses the Windows Hypervisor Platform; networking works but expect lower performance.
- Bridged to Wi-Fi uses a filter driver. If it breaks after an update, reinstall the VirtualBox NDIS6 bridged driver (re-run the installer, "Repair").
- Reset adapters: Device Manager → Network adapters → uninstall the Host-Only adapter, then `VBoxManage hostonlyif create`.

### macOS

- Allow the VirtualBox system extension in System Settings → Privacy & Security, otherwise host-only/bridged fail.
- Create `/etc/vbox/networks.conf` for non-default host-only ranges.
- Apple Silicon: VirtualBox 7.1+ supports ARM guests only; NAT, bridged, and host-only work.

## 12. Recipes

**SSH into a VM from the host, nothing else**
```bash
VBoxManage modifyvm "vm" --nic1 nat --natpf1 "ssh,tcp,127.0.0.1,2222,,22"
```

**Dev VM with static host-reachable IP + internet**
```bash
VBoxManage modifyvm "vm" --nic1 nat --nic2 hostonly --hostonlyadapter2 vboxnet0
# guest: enp0s8 = 192.168.56.10/24
```

**Multi-VM cluster with internet, no host dependency**
```bash
VBoxManage natnetwork add --netname k8s --network "10.0.5.0/24" --enable --dhcp on
# each VM: --nic1 natnetwork --nat-network1 k8s
```

**Isolated attack/test lab**
```bash
# all VMs: --nic1 intnet --intnet1 "lab"
VBoxManage dhcpserver add --network=lab --server-ip=10.10.10.1 --netmask=255.255.255.0 \
  --lower-ip=10.10.10.100 --upper-ip=10.10.10.200 --enable
```

**VM as a real LAN server (test web/avatar server on your network)**
```bash
VBoxManage modifyvm "vm" --nic1 bridged --bridgeadapter1 "eth0"
# guest: static IP in LAN subnet, outside the router's DHCP pool
```

**Router/firewall VM fronting an isolated segment**
```bash
VBoxManage modifyvm "fw"  --nic1 bridged --bridgeadapter1 eth0 --nic2 intnet --intnet2 "lan"
VBoxManage modifyvm "app" --nic1 intnet --intnet1 "lan"
# fw: enable ip_forward + NAT/masquerade; app gateway = fw's lan IP
```

## 13. Vagrant mapping

| Vagrantfile | VirtualBox equivalent |
|---|---|
| default NIC1 | NAT + SSH forward (host 2222 → guest 22, auto-corrected) |
| `forwarded_port` | NAT port-forward rule |
| `private_network, ip: "192.168.56.10"` | Host-only adapter (NIC2) + `vboxnetN` |
| `private_network, virtualbox__intnet: "name"` | Internal network |
| `public_network` | Bridged |
| `vb.customize ["modifyvm", :id, "--nictype2", "virtio"]` | Raw `modifyvm` passthrough |

## 14. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `E_ACCESSDENIED` / "IP address is not within allowed ranges" | Add the range to `/etc/vbox/networks.conf` |
| Host-only interface missing / `vboxnet0` not found | `VBoxManage hostonlyif create`; Linux: `sudo modprobe vboxnetadp`; macOS: allow the kernel/system extension |
| Guest can't reach host over host-only | Host firewall blocking `vboxnet0`; wrong subnet; adapter not "up" in the guest (`ip link set enp0s8 up`) |
| Guest has no internet on NAT | DNS: set `--natdnshostresolver1 on`; VPN overriding routes; check `ip route` in the guest |
| Slow DNS / `apt` hangs | `--natdnshostresolver1 on`, `--natdnsproxy1 on`; IPv6 resolution stalls (disable IPv6 in the guest or prefer IPv4) |
| Port forward doesn't work | Service bound to `127.0.0.1` inside guest; guest firewall (`ufw`); wrong guest port; host port already in use |
| Bridged adapter gets no DHCP | Wi-Fi/AP blocks extra MACs; switch port security; wrong `--bridgeadapter` |
| Bridged VM can't talk to the host | Host NIC driver quirk (some Wi-Fi drivers); use host-only as a second NIC |
| Two VMs have the same IP | Cloned VM with identical MAC: regenerate (`VBoxManage modifyvm "vm" --macaddress1 auto`), reset `/etc/machine-id` for DHCP client IDs |
| NICs renamed after cloning/adding adapters | Netplan matches old names; update config or match by MAC |
| Windows: Host-only works then stops after reboot | Network profile set to Public, or adapter disabled by VPN/security software |
| Windows: "Failed to open/create the internal network" / `NS_ERROR_FAILURE` | Bridged/host-only filter driver broken; repair/reinstall VirtualBox, re-enable "VirtualBox NDIS6 Bridged Networking Driver" on the adapter properties |
| Linux: `vboxnetflt` missing | Run `sudo /sbin/vboxconfig`; Secure Boot: sign the modules or disable Secure Boot |
| Performance poor | Use `virtio` NIC type, install Guest Additions, avoid NAT for bulk transfer (use host-only or bridged) |

Debug tooling:

```bash
VBoxManage modifyvm "vm" --nictrace1 on --nictracefile1 /tmp/vm.pcap
tail -f ~/VirtualBox\ VMs/vm/Logs/VBox.log
VBoxManage showvminfo "vm" --details
sudo tcpdump -i vboxnet0 -n
```

Tell me your host OS and topology and I'll give you the exact `VBoxManage` commands and guest netplan.