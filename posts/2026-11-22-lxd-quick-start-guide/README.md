---
title: "LXD Quick Start Guide: Launch Your First Linux System Container in 60 Seconds"
description: "Get up and running with LXD and the lxc CLI on Ubuntu—install LXD via Snap, initialize storage and networking, launch an Ubuntu 24.04 container, and learn essential commands."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Linux
  - Ubuntu
  - DevOps
draft: false
---

**LXD** manages full Linux **system containers** (complete OS, `systemd`, and persistent storage sharing your host kernel) through the **`lxc` command-line client**. If you are on Ubuntu (`22.04` or `24.04 LTS`), you can go from a fresh host to a running, networked container in under a minute.

---

## Running LXD on Ubuntu

### Step 1: Install LXD & Grant Socket Access

Install the LXD LTS Snap, wait for the socket-activated daemon, and add your user to the `lxd` group so you don't need `sudo` for `lxc` commands:

```bash
sudo snap install lxd --channel=5.21/stable

sudo lxd waitready --timeout=60

sudo usermod -aG lxd "$USER"

newgrp lxd
```

*(Tip: Check daemon service status anytime with `snap services lxd` and verify client/server versions with `lxc version`.)*

### Step 2: Initialize Default Storage & Bridge Networking

Create a default local storage pool and the `lxdbr0` private NAT bridge automatically:

```bash
lxd init --auto
```

*(Want custom ZFS disk sizes, bridge subnets, or clustering? Run interactive `lxd init` instead of `--auto`.)*

### Step 3: Launch an Ubuntu 24.04 System Container

Pull the official Ubuntu `24.04` image and boot a stateful container named `web-01` (subsequent launches clone from cache in ~2 seconds):

```bash
lxc launch ubuntu:24.04 web-01
```

### Step 4: Run Commands or Open a Shell Inside the Container

Unlike single-process app containers, `web-01` runs a full Ubuntu OS with `systemd` and `apt`:

```bash
# Run commands directly from the host
lxc exec web-01 -- apt update
lxc exec web-01 -- apt install -y nginx

# Or drop into an interactive root bash session
lxc exec web-01 -- bash
```

### Step 5: Verify Container IP & HTTP Response

Inspect `web-01`'s DHCP lease on `lxdbr0` and test Nginx directly from your host:

```bash
lxc list
curl -I "http://$(lxc list web-01 -c 4 --format csv | cut -d' ' -f1)"
```

---

## Other useful `lxc` commands

Getting the lxd version:

```bash
lxc version
```

Explore built-in `lxc` subcommands, flags without leaving the terminal:

```bash
lxc --help
lxc <command> --help
lxc <command> <subcommand>.. --help

lxc launch --help
lxc config device --help
```

Search pre-built OS images across LXD's default remotes (`ubuntu:` and multi-distro `images:`):

```bash
lxc image list ubuntu: 24.04 amd64
lxc image list images: debian/12 amd64
lxc image list images: alpine/3.20
```

Copy files between host and container
```bash
lxc file push ./nginx.conf web-01/etc/nginx/nginx.conf
lxc file pull web-01/var/log/nginx/access.log ./access.log
```

Take and restore an instant point-in-time snapshot
```bash
lxc snapshot web-01 clean-nginx
lxc restore web-01 clean-nginx
```

Stop, restart, or delete a container
```bash
lxc restart web-01
lxc stop web-01
lxc delete web-01          # Or: lxc delete --force web-01 (stops + deletes)
```

---

## Key Takeaways

1. **`lxd` is the background daemon; `lxc` is the CLI client**—adding your user to the `lxd` group lets you run `lxc` commands without `sudo` (note that `lxd` group membership carries root-equivalent host privileges).
2. **`lxd init --auto`** configures a working local storage pool and `lxdbr0` NAT bridge in seconds for labs and workstations.
3. System containers persist packages, configs, and logs across reboots just like lightweight VMs while booting in under two seconds.
