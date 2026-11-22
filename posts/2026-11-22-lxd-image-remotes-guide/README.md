---
title: "LXD Image Remotes Guide: Discovering, Caching, and Launching Multi-Distro Containers"
description: "Learn how LXD Simplestreams image remotes work—search ubuntu: and images: catalogs, fix legacy remote URLs, launch multi-distro containers, and manage your local image cache."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Images
  - Linux
  - Ubuntu
  - DevOps
draft: false
---

Unlike Docker Hub (which distributes layered application images), LXD pulls clean, pre-built **OS root filesystem images** (and UEFI disk images for `--vm`) from **Simplestreams / LXD image servers** called **remotes**.

---

## 1. Inspecting Configured Image Remotes

List every image server and LXD host registered on your client:

```bash
lxc remote list
```

| Remote | Contents & Source | Example Target |
| :--- | :--- | :--- |
| **`ubuntu:`** | Official Ubuntu Cloud Images (`cloud-init`, SSH, server tooling) | `ubuntu:24.04` or `ubuntu:noble` |
| **`ubuntu-minimal:`** | Stripped-down official Ubuntu Minimal images (smaller disk footprint, faster boot) | `ubuntu-minimal:24.04` |
| **`images:`** | Canonical multi-distro catalog (`https://images.lxd.canonical.com`) — Debian, Rocky, AlmaLinux, Alpine, Fedora | `images:debian/12` or `images:rockylinux/9` |
| **`local:`** *(Default)* | Your host's local cached images and instances | Implicit when no `remote:` prefix is given |

> **Missing or Broken `images:` Remote?** Older installations pointed to `images.linuxcontainers.org`, which phased out Canonical LXD clients in 2024. On LXD `5.21` / `6.x`, point `images:` to Canonical's Simplestreams catalog:
> ```bash
> lxc remote add images https://images.lxd.canonical.com --protocol=simplestreams
> # Or update an existing remote URL:
> lxc remote set-url images https://images.lxd.canonical.com
> ```

---

## 2. Searching Distribution Images

Always include the trailing colon (`:`) after the remote name, followed by optional filter keywords (distro, release, or CPU architecture):

```bash
# Search official Ubuntu 24.04 LTS (Noble) x86_64 images
lxc image list ubuntu: 24.04 amd64

# Search Debian 12, Rocky Linux 9, or Alpine 3.20 on 'images:'
lxc image list images: debian/12 amd64
lxc image list images: rockylinux/9
lxc image list images: alpine/3.20

# View size, architecture, and aliases for a specific image
lxc image info ubuntu:24.04
```

*(Tip: Append `/cloud` on `images:` targets—such as `images:debian/12/cloud`—when you need `cloud-init` pre-installed inside non-Ubuntu distributions.)*

---

## 3. Launching Containers & Managing the Local Cache

Use **`lxc launch`** to pull (if not cached), create, and boot an instance in one step—or **`lxc init`** to create it in a `STOPPED` state so you can attach profiles or volumes before first boot:

```bash
# Download + create + start immediately
lxc launch ubuntu:24.04 web-01
lxc launch images:debian/12 db-01

# Create stopped without booting yet
lxc init images:alpine/3.20 edge-proxy
```

*(Omit the instance name—`lxc launch ubuntu:24.04`—to let LXD generate a random two-word name like `keen-falcon`.)*

### How Local Image Caching Works

- **First launch of an OS:** Downloads a `~120–180 MiB` compressed squashfs image into your storage pool.
- **Subsequent launches:** Clones from your local cache in **1–2 seconds**—and LXD automatically refreshes cached images in the background (`images.auto_update_interval`, every 6 hours by default).

```bash
# Inspect locally cached images and launch a second node in ~2 seconds
lxc image list
lxc launch ubuntu:24.04 web-02

# Prune an unused cached image by fingerprint to reclaim disk space
lxc image delete <fingerprint>
```

> **Shared Kernel Rule:** Even though `web-01` runs Ubuntu `24.04` userland and `db-01` runs Debian `12` userland, running `uname -r` inside **both** containers returns your **host machine's Linux kernel version**. Need a separate guest kernel instead? Add `--vm` (`lxc launch ubuntu:24.04 vm-01 --vm`).

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| List configured remotes | `lxc remote list` |
| Fix / update `images:` remote URL | `lxc remote set-url images https://images.lxd.canonical.com` |
| Search remote catalog | `lxc image list images: debian/12 amd64` |
| Inspect remote or local image metadata | `lxc image info ubuntu:24.04` |
| Create & start container (`launch`) | `lxc launch <remote>:<image> <name>` |
| Create stopped container (`init`) | `lxc init <remote>:<image> <name>` |
| List / delete locally cached images | `lxc image list` · `lxc image delete <fingerprint>` |

---

## Key Takeaways

1. Always include the **trailing colon (`:`)** when querying remotes (`ubuntu:`, `images:`); omitting it references local instances instead.
2. Ensure `images:` points to **`https://images.lxd.canonical.com`** on Canonical LXD hosts.
3. Use `images:<distro>/<release>/cloud` when your automation relies on `cloud-init` user-data inside Debian, Rocky, or AlmaLinux containers.
