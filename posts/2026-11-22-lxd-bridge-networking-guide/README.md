---
title: "LXD Bridge Networking (lxdbr0): DNS, Static IPs, Port Forwarding, and Firewall Fixes"
description: "A concise guide to LXD's default lxdbr0 bridge—covering subnet configuration, .lxd DNS resolution, static IPs, proxy port forwarding, and UFW/Docker firewall fixes."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Networking
  - Linux
  - DNS
  - Firewall
  - DevOps
draft: false
---

When you run `lxd init`, LXD creates **`lxdbr0`** a managed virtual Linux bridge attached to every container via your `default` profile. Out of the box, `lxdbr0` runs a lightweight `dnsmasq` service that gives containers:

- **Automatic IPv4/IPv6 DHCP leases** (for example, `10.149.213.11`).
- **Outbound internet access** via NAT masquerading through your host's primary interface.
- **Built-in `.lxd` DNS discovery** so containers can reach each other by name (`ping db-01.lxd`).

---

## 1. Inspecting & Customizing `lxdbr0`

Check your bridge subnet, configuration, and active container DHCP leases:

```bash
lxc network list
lxc network show lxdbr0
lxc network list-leases lxdbr0
```

Need a predictable subnet instead of a random `auto` range, or want to disable IPv6 on the bridge?

```bash
# Set a fixed IPv4 gateway/subnet and disable IPv6
lxc network set lxdbr0 ipv4.address 10.240.10.1/24
lxc network set lxdbr0 ipv6.address none
```

*(Restart running containers after changing the bridge subnet so they request a lease in the new range.)*

---

## 2. Static IPs & Host Port Forwarding

### Assign a Static IP on `lxdbr0`

Override the `eth0` device inherited from the `default` profile to pin a fixed DHCP reservation (must fall inside `lxdbr0`'s subnet):

```bash
lxc config device override web-01 eth0 ipv4.address=10.240.10.10
lxc restart web-01
```

### Forward a Host Port to a Container (`proxy` Device)

Because `lxdbr0` is a private NAT network, external machines cannot reach container IPs directly. Use an LXD **`proxy` device** to forward a host port (e.g., `8080`) into a container port (`80`):

```bash
lxc config device add web-01 http80 proxy \
  listen=tcp:0.0.0.0:8080 \
  connect=tcp:127.0.0.1:80
```

---

## 3. Using `.lxd` Internal DNS

Containers on `lxdbr0` resolve `<container-name>.lxd` automatically:

```bash
lxc exec app-01 -- ping -c 2 web-01.lxd
```

### Resolve `*.lxd` Names Directly from Your Host OS

On hosts using `systemd-resolved` (Ubuntu `22.04`/`24.04`, Fedora), you can also resolve `http://web-01.lxd` directly from your host terminal or browser:

```bash
LXD_GW=$(lxc network get lxdbr0 ipv4.address | cut -d'/' -f1)
sudo resolvectl dns lxdbr0 "$LXD_GW"
sudo resolvectl domain lxdbr0 '~lxd'
```

*(Note: `resolvectl` settings reset if `lxdbr0` restarts unless persisted in a `systemd` unit.)*

---

## 4. Fixing Host Firewalls & Docker Blocking `lxdbr0`

If `lxc list` shows a container `RUNNING` with a **blank `IPV4` column**—or containers get an IP but `apt update` hangs—your host firewall or Docker is dropping DHCP (`UDP 67/68`), DNS (`53`), or routed traffic on `lxdbr0`.

### Ubuntu / Debian with `UFW`

```bash
sudo ufw allow in on lxdbr0 comment 'LXD DHCP and DNS'
sudo ufw route allow in on lxdbr0 comment 'LXD outbound routing'
sudo ufw route allow out on lxdbr0 comment 'LXD inbound return routing'
```

### Rocky Linux / RHEL / Fedora with `firewalld`

```bash
sudo firewall-cmd --permanent --zone=trusted --add-interface=lxdbr0
sudo firewall-cmd --reload
```

### Running Docker & LXD on the Same Host

Docker changes the host kernel's `iptables` `FORWARD` policy to `DROP`, breaking internet access for `lxdbr0` containers. Allow `lxdbr0` in Docker's `DOCKER-USER` chain:

```bash
sudo iptables -I DOCKER-USER -i lxdbr0 -j ACCEPT
sudo iptables -I DOCKER-USER -o lxdbr0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
```

*(Save rules with `netfilter-persistent save` so they survive reboots.)*

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| View bridge config & subnet | `lxc network show lxdbr0` |
| List active container IPs/MACs | `lxc network list-leases lxdbr0` |
| Change `lxdbr0` IPv4 subnet | `lxc network set lxdbr0 ipv4.address 10.240.10.1/24` |
| Assign static IP to container | `lxc config device override <name> eth0 ipv4.address=10.240.10.10` |
| Forward host port `8080` → `80` | `lxc config device add <name> web proxy listen=tcp:0.0.0.0:8080 connect=tcp:127.0.0.1:80` |
| Remove port forward | `lxc config device remove <name> web` |

---

## Key Takeaways

- `lxdbr0` gives every container private NAT networking, automatic DHCP, and zero-config `<name>.lxd` service discovery.
- Pin static IPs cleanly via `lxc config device override <name> eth0 ipv4.address=...` instead of editing netplan inside the container.
- Expose specific services outside the host using an LXD `proxy` device.
- Whenever containers miss an IPv4 lease or lose internet access, check `UFW`, `firewalld`, and Docker's `DOCKER-USER` chain first.
