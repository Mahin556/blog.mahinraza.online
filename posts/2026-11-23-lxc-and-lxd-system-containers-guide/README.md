---
title: "LXC and LXD Tutorial Series: Complete Guide to Linux System Containers"
description: "An end-to-end practical tutorial and learning roadmap for LXC and LXD—covering installation, storage pools, lxdbr0 networking, profiles, nested Docker/Kubernetes, backups, and multi-node clustering."
date: 2026-11-23
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Virtualization
  - Linux
  - Ubuntu
  - DevOps
draft: false
---

**Linux System Containers (`LXC` + `LXD`)** sit in the sweet spot between heavy hardware virtual machines (`KVM`, `VirtualBox`) and single-process application containers (`Docker`, `Podman`). Each LXD container boots a full, stateful Linux OS (`systemd`, `apt`/`dnf`, `sshd`, cron) in **under two seconds**, idles at **~50 MiB of RAM**, shares your host kernel dynamically, and supports snapshots, live `cgroups` limits, managed networking, and clustering.

This guide serves as both a **hands-on overview** and the **complete tutorial roadmap** linking every LXD article in this series from initial host setup to multi-node clusters.

> **Prerequisite Foundations:** New to hypervisors vs. OS-level namespaces? Start with [Virtualization, Virtual Machines, and Hypervisors: A Practical Guide](/posts/2026-11-17-virtualization-virtualMachine-and-hypervisor/).

---

## Architecture at a Glance: VMs vs. LXD vs. Docker

| Dimension | Virtual Machines (`KVM` / `VirtualBox`) | System Containers (`LXC` + `LXD`) | App Containers (`Docker` / `OCI`) |
| :--- | :--- | :--- | :--- |
| **Primary Unit** | Virtual hardware + dedicated kernel | Full Linux OS userland (`systemd`, services) | Single app binary + runtime libs |
| **Kernel Model** | Separate guest kernel per VM | **Shared host Linux kernel** | **Shared host Linux kernel** |
| **Memory & Disk** | Static RAM lock · `.qcow2`/`.vdi` disk | **Dynamic RAM sharing** · persistent rootfs | Dynamic RAM · ephemeral image layers |
| **Boot Time** | `10–30s` | **`< 2s`** | `< 500ms` |

- **`LXC` (`liblxc`):** Low-level Linux userspace runtime managing namespaces, `cgroups v2`, AppArmor, and `seccomp`.
- **`LXD`:** Background daemon built atop `liblxc` (and `QEMU` for `--vm` virtual machines) exposing a local Unix socket and TLS REST API (`:8443`).
- **`lxc`:** The CLI client you run daily (`lxc launch`, `lxc list`, `lxc exec`) to talk to the `lxd` daemon.

---

## `LXC` vs. `LXD` vs. `lxc`

Newcomers are almost always tripped up by three nearly identical names. Here is the exact distinction:

1. **`LXC` (*Linux Containers* / `liblxc`):** The low-level userspace C library and classic hyphenated tools (`lxc-create`, `lxc-start`, `lxc-attach`) that configure Linux kernel namespaces, `cgroups`, `seccomp`, and AppArmor profiles directly.
2. **`LXD` (*Linux Container Daemon*):** The high-level system manager built **on top of `liblxc`** (and `QEMU` when running LXD virtual machines). `lxd` runs as a background root daemon exposing a **REST API** over a local Unix socket (`/var/snap/lxd/common/lxd/unix.socket`) and optional mutually authenticated HTTPS (`:8443`) for multi-host clusters.
3. **`lxc` (space-separated CLI, e.g., `lxc launch`):** The **command-line client for LXD**! Whenever you run `lxc list`, `lxc exec`, or `lxc snapshot`, your CLI sends REST API requests to the `lxd` daemon, which in turn instructs `liblxc` and the Linux kernel to manage your containers.

> **Ecosystem Note:** Canonical actively develops and supports **LXD** (distributed primarily via `snap`), and starting with LXD `4.0+`, the exact same `lxc` CLI can even launch full QEMU/KVM virtual machines alongside LXC system containers simply by passing `--vm` (`lxc launch ubuntu:24.04 my-vm --vm`). You may also encounter **Incus**, a community-maintained fork from the Linux Containers project that shares nearly identical architecture and `incus <subcommand>` syntax.

---

## Complete LXD Tutorial Series Roadmap

- [LXD Quick Start Guide: Launch Your First Linux System Container in 60 Seconds](https://blog.mahinraza.online/posts/2026-11-22-lxd-quick-start-guide/)
- [Installing and Initializing LXD on Linux: A Step-by-Step Setup Guide](https://blog.mahinraza.online/posts/2026-11-22-lxd-installation-and-initialization-guide/)
- [LXD Image Remotes Guide: Discovering, Caching, and Launching Multi-Distro Containers](https://blog.mahinraza.online/posts/2026-11-22-lxd-image-remotes-guide/)
- [LXD Boot Autostart Guide: Controlling Startup Order, Priorities, and Delays](https://blog.mahinraza.online/posts/2026-11-22-lxd-boot-autostart-guide/)
- [LXD Bridge Networking (lxdbr0): DNS, Static IPs, Port Forwarding, and Firewall Fixes](https://blog.mahinraza.online/posts/2026-11-22-lxd-bridge-networking-guide/)
- [LXD Container Cloning and Lifecycle Guide: Copy, Snapshot Clones, Rename, and Delete](https://blog.mahinraza.online/posts/2026-11-22-lxd-cloning-and-lifecycle-guide/)
- [LXD Clustering Guide: Multi-Node Setup, Fan Networking, and Failover](https://blog.mahinraza.online/posts/2026-11-22-lxd-clustering-guide/)
- [LXD Container Backup and Migration Guide: Remote Copy vs. Export/Import](https://blog.mahinraza.online/posts/2026-11-22-lxd-container-backup-and-migration-guide/)
- [LXD CPU and Memory Limits Guide: Live cgroups Scaling with lxc config set](https://blog.mahinraza.online/posts/2026-11-22-lxd-cpu-and-memory-limits-guide/)
- [LXD Disk Quotas Guide: Enforcing Default and Per-Container Storage Limits](https://blog.mahinraza.online/posts/2026-11-22-lxd-disk-quotas-guide/)
- [LXD DNS and Service Discovery Guide: Host Access and .lxd Name Resolution](https://blog.mahinraza.online/posts/2026-11-22-lxd-dns-and-service-discovery-guide/)
- [LXD File Transfer Guide: Pushing, Pulling, and Editing Container Files (lxc file)](https://blog.mahinraza.online/posts/2026-11-22-lxd-file-transfer-guide/)
- [LXD Nested Containers Guide: Running Docker, Podman, and LXD Inside LXD](https://blog.mahinraza.online/posts/2026-11-22-lxd-nested-containers-guide/)
- [LXD Profiles Guide: Resource Limits, Stacking Precedence, and Devices](https://blog.mahinraza.online/posts/2026-11-22-lxd-profiles-guide/)
- [LXD Snapshots Guide: Point-in-Time Rollbacks, Schedules, and Auto-Expiry](https://blog.mahinraza.online/posts/2026-11-22-lxd-snapshots-and-rollbacks-guide/)
- [LXD Storage Pools and Drivers Guide: ZFS, Btrfs, LVM, dir, and Ceph](https://blog.mahinraza.online/posts/2026-11-22-lxd-storage-pools-and-drivers-guide/)
