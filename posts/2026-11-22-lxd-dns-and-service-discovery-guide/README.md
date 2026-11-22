---
title: "LXD DNS and Service Discovery Guide: Host Access and .lxd Name Resolution"
description: "Reach LXD containers directly from your Linux host and use built-in .lxd DNS service discovery—covering east-west container resolution, host systemd-resolved setup, and custom DNS zones."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Networking
  - DNS
  - Linux
  - DevOps
draft: false
---

Every container attached to LXD's default **`lxdbr0`** bridge connects to your host via a virtual Ethernet (`veth`) pair and receives an IP from LXD's managed `dnsmasq` service. That architecture gives you **direct host-to-container routing** and **zero-config `.lxd` DNS discovery** between containers without manual `/etc/hosts` edits or port-forwarding rules.

---

## 1. Direct Host-to-Container Access

Because your Linux host owns the gateway interface on `lxdbr0` (for example, `10.149.213.1`), any process on your host—`curl`, `psql`, `ssh`, or a local browser—can connect straight to a container's `IPV4` address:

```bash
# Inspect web-01's assigned bridge IP and curl its HTTP service from the host
lxc list web-01
curl -I "http://$(lxc list web-01 -c 4 --format csv | cut -d' ' -f1)"

# View all active DHCP leases and MAC mappings on lxdbr0
lxc network list-leases lxdbr0
```

*(Need external LAN clients outside your host to reach `web-01` too? Add an LXD `proxy` device—see the [LXD Bridge Networking Guide](/posts/2026-11-21-lxd-bridge-networking-guide/).)*

---

## 2. Container-to-Container `.lxd` Service Discovery

Containers on the same LXD bridge automatically resolve each other at **`<instance-name>.lxd`** (or bare `<instance-name>`) via `lxdbr0`'s built-in DNS server:

```bash
# East-west DNS resolution works out of the box between containers
lxc exec db-01 -- ping -c 2 web-01.lxd
lxc exec web-01 -- ping -c 2 db-01.lxd
```

Prefer a custom internal domain (such as `.lab` or `.internal`) instead of `.lxd`? Change `dns.domain` on the bridge:

```bash
lxc network set lxdbr0 dns.domain internal
# Containers now resolve web-01.internal and db-01.internal
```

---

## 3. Resolve `*.lxd` Hostnames Directly from Your Host OS

By default, **containers** query `lxdbr0`'s `dnsmasq` server, while your **host OS** queries your router or cloud DNS—meaning `curl http://web-01.lxd` works inside containers but fails on your host terminal.

On Linux distributions using **`systemd-resolved`** (Ubuntu `22.04`/`24.04`, Debian `12`, Fedora), delegate the `~lxd` search domain on `lxdbr0` to LXD's gateway IP:

```bash
LXD_GW=$(lxc network get lxdbr0 ipv4.address | cut -d'/' -f1)
sudo resolvectl dns lxdbr0 "$LXD_GW"
sudo resolvectl domain lxdbr0 '~lxd'

# Now your host terminal and browser resolve *.lxd directly!
curl -I http://web-01.lxd
```

*(Note: `resolvectl` runtime settings reset if `lxdbr0` restarts; add those two commands to a lightweight `systemd` oneshot unit `After=snap.lxd.activate.service` if you want permanent host-side `.lxd` resolution across reboots.)*

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Check container IP & bridge leases | `lxc list` · `lxc network list-leases lxdbr0` |
| Get `lxdbr0` gateway / DNS server IP | `lxc network get lxdbr0 ipv4.address` |
| Test east-west `.lxd` DNS | `lxc exec <src> -- ping -c 2 <target>.lxd` |
| Change bridge DNS suffix | `lxc network set lxdbr0 dns.domain <domain>` |
| Enable `.lxd` DNS on Linux host | `sudo resolvectl dns lxdbr0 <gw-ip>` · `sudo resolvectl domain lxdbr0 '~lxd'` |

---

## Key Takeaways

1. Your host sits directly on **`lxdbr0`**, so you never need port forwarding just to reach container services from the host itself.
2. **`dnsmasq` registers `<container>.lxd` automatically** on DHCP lease assignment—making multi-container app/DB wiring resilient even when container IPs change.
3. Point **`systemd-resolved`** (`resolvectl`) at `lxdbr0`'s gateway IP with domain `~lxd` to access `http://<container>.lxd` straight from your host browser or CLI.
