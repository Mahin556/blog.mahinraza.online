---
title: "LXD Nested Containers Guide: Running Docker, Podman, and LXD Inside LXD"
description: "Learn how to safely run Docker, Podman, and nested LXD inside unprivileged LXD system containers using security.nesting, syscall interception, and optimal storage drivers."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Docker
  - Containers
  - Security
  - Linux
  - DevOps
draft: false
---

Running **Docker**, **Podman**, **`k3s`**, or even an inner **LXD daemon** inside an LXD system container lets you spin up isolated CI runners and multi-node container labs without full VM overhead. Because LXD locks down inner `procfs`/`sysfs` mounts by default, nested runtimes only work once you enable **`security.nesting=true`**.

---

## 1. Unprivileged vs. Privileged Isolation

Every LXD container launches **unprivileged by default** (`security.privileged=false`) using Linux **User Namespaces**:

| Mode | Container `root` (`UID 0`) Maps To | Host Blast Radius | Recommended Use |
| :--- | :--- | :--- | :--- |
| **Unprivileged** *(Default)* | High unprivileged host UID (e.g., `1000000`) | **Low** — container escape lands with zero host `root` capabilities | **Default for production & Docker/Podman nesting** |
| **Privileged** (`security.privileged=true`) | Real **`UID 0` (`root`)** on the host kernel | **High** — shares root UID with physical host | **Disposable, trusted local labs only** |

---

## 2. Running Docker or Podman Inside Unprivileged LXD

Enable `security.nesting=true` along with `mknod` and `setxattr` syscall interception so unprivileged inner image layers extract cleanly:

```bash
# 1. Launch an unprivileged Ubuntu 24.04 container configured for Docker
lxc launch ubuntu:24.04 docker-lab \
  -c security.nesting=true \
  -c security.syscalls.intercept.mknod=true \
  -c security.syscalls.intercept.setxattr=true

# 2. Install Docker and verify a nested container run
lxc exec docker-lab -- bash -c "apt update && apt install -y docker.io && docker run --rm hello-world"
```

Need to enable nesting on an **already existing** container? `security.nesting` can be applied and restarted in seconds:

```bash
lxc config set app-01 security.nesting=true
lxc config set app-01 security.syscalls.intercept.mknod=true
lxc config set app-01 security.syscalls.intercept.setxattr=true
lxc restart app-01
```

### Storage Pool Gotcha: Docker `overlay2` on ZFS Hosts

- **`btrfs` or `dir` (on `ext4`/`xfs`) host pools:** Docker's `overlay2` storage driver works out of the box.
- **`zfs` host pools:** Linux OverlayFS cannot mount directly atop a ZFS container rootfs. Give `/var/lib/docker` a dedicated `ext4`-backed LXD volume so `overlay2` runs at native speed:

```bash
lxc storage volume create default docker-data size=20GiB block.filesystem=ext4
lxc storage volume attach default docker-data docker-lab /var/lib/docker
```

---

## 3. Running LXD Inside LXD & Toggling `security.privileged`

You can also run a nested LXD daemon inside an unprivileged container (`security.nesting=true`) as long as the inner `lxd init` selects **`btrfs`** or **`dir`** (unprivileged containers cannot manage host-level ZFS pools).

If a legacy lab tool or multi-layer nested bridge still hits namespace restrictions, you can enable `security.privileged=true` on a throwaway lab instance. Unlike live CPU/RAM limits, **changing `security.privileged` remaps every file UID on disk and requires stopping the container first**:

```bash
lxc stop docker-lab
lxc config set docker-lab security.nesting=true
lxc config set docker-lab security.privileged=true
lxc start docker-lab
```

> **Security Rule:** Keep `security.privileged=false` anywhere untrusted workloads or external network traffic can reach the container.

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Launch container with nesting | `lxc launch ubuntu:24.04 <name> -c security.nesting=true` |
| Add Docker syscall intercepts | `lxc config set <name> security.syscalls.intercept.mknod=true` · `...setxattr=true` |
| Check security flags on container | `lxc config show <name> \| grep security` |
| Reusable Docker nesting profile | `lxc profile create docker` → `lxc profile set docker security.nesting=true` |
| Attach `ext4` Docker volume on ZFS | `lxc storage volume create default <vol> size=20GiB block.filesystem=ext4` |

---

## Key Takeaways

1. **Unprivileged nesting (`security.nesting=true`) is enough for Docker, Podman, and inner LXD**—you rarely need `security.privileged=true`.
2. Add **`mknod` and `setxattr` syscall interception** so unprivileged `docker pull` / `apt` image layers unpack without permission errors.
3. On **ZFS** LXD hosts, mount a custom `block.filesystem=ext4` volume at `/var/lib/docker` (or use a `btrfs` pool) so Docker's `overlay2` driver works cleanly.
4. Toggling **`security.privileged`** shifts filesystem UID ownership and always requires `lxc stop` first.
