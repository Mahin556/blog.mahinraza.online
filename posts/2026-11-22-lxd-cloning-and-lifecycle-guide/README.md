---
title: "LXD Container Cloning and Lifecycle Guide: Copy, Snapshot Clones, Rename, and Delete"
description: "Manage stateful LXD container lifecycles—start, stop, clone instances or snapshots with lxc copy, sync replicas with --refresh, rename with lxc move, and protect critical workloads from accidental deletion."
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

Unlike ephemeral application containers where `docker rm` discards writable layer changes, **LXD system containers are stateful**: stopping or rebooting a container preserves installed packages, `/etc` configs, databases, and logs intact—just like a virtual machine.

---

## 1. Start, Stop, Restart & Freeze

LXD sends clean `systemd` signals inside the container so databases and web servers flush state gracefully before shutting down:

```bash
lxc stop web-01           # Graceful OS shutdown (pass -f / --force if hung)
lxc start web-01          # Boot stopped container (< 2 seconds)
lxc restart web-01        # Graceful in-place reboot

# Freeze / unfreeze processes instantly in RAM without stopping
lxc pause web-01
lxc start web-01
```

---

## 2. Cloning Containers & Snapshots (`lxc copy`)

`lxc copy` duplicates a container into a new **`STOPPED`** instance—automatically assigning a **fresh `eth0` MAC address** so the clone receives its own unique DHCP IP when booted. On **`zfs`** and **`btrfs`** pools, clones use Copy-on-Write blocks and finish in under a second:

```bash
# 1. Clone a golden container and boot the copy
lxc copy web-01 web-staging
lxc start web-staging

# 2. Skip historical snapshots or target a different storage pool
lxc copy web-01 web-slim --instance-only
lxc copy web-01 web-nvme --storage fast-pool

# 3. Branch a new container from a snapshot without touching the live workload
lxc snapshot web-01 pre-upgrade
lxc copy web-01/pre-upgrade web-debug && lxc start web-debug

# 4. Incrementally sync changes onto an existing standby clone
lxc copy web-01 web-staging --refresh
```

> **Static IP Watchout:** If `web-01` had a hardcoded `ipv4.address` override on `eth0` (rather than DHCP), update or clear `eth0` on `web-staging` before starting it so both containers don't claim the same IP (`lxc config device set web-staging eth0 ipv4.address=10.240.10.11`).

---

## 3. Renaming (`lxc move`) & Safe Deletion (`lxc delete`)

LXD uses `lxc move` for both **local renames** (container must be stopped first) and cross-host moves:

```bash
# Rename a container locally
lxc stop web-staging
lxc move web-staging web-canary
lxc start web-canary
```

To remove an instance permanently, stop it first—or pass `--force` (`-f`). For critical stateful workloads, enable **deletion protection** so an accidental `lxc delete -f` is rejected:

```bash
# Protect a production database container against accidental deletion
lxc config set db-01 security.protection.delete true

# Stop and delete disposable instances
lxc stop web-debug && lxc delete web-debug
lxc delete --force web-canary
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Start / graceful stop / reboot | `lxc start <name>` · `lxc stop <name>` · `lxc restart <name>` |
| Clone container (CoW on ZFS/Btrfs) | `lxc copy <src> <dst>` |
| Clone without older snapshots | `lxc copy <src> <dst> --instance-only` |
| Clone directly from a snapshot | `lxc copy <src>/<snap> <dst>` |
| Incremental delta sync to clone | `lxc copy <src> <dst> --refresh` |
| Rename container locally | `lxc stop <old> && lxc move <old> <new> && lxc start <new>` |
| Prevent accidental deletion | `lxc config set <name> security.protection.delete true` |
| Stop & delete in one command | `lxc delete --force <name>` |

---

## Key Takeaways

1. **`lxc copy` creates a stopped clone with a new MAC address**, preventing DHCP IP collisions on `lxdbr0` out of the box (remember to update any manual static IP overrides before starting).
2. On **`zfs`** and **`btrfs`** storage pools, cloning an instance or branching from `container/snapshot` is an instant Copy-on-Write operation that consumes near-zero initial disk space.
3. Local renames via **`lxc move <old> <new>`** require stopping the container first, and **`security.protection.delete=true`** guards stateful containers against accidental `lxc delete -f`.
