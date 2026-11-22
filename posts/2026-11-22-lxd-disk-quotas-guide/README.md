---
title: "LXD Disk Quotas Guide: Enforcing Default and Per-Container Storage Limits"
description: "Prevent runaway containers from filling your LXD storage pool—learn how to set default root disk quotas in profiles, override per-container limits, and verify ZFS/Btrfs quota support."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Storage
  - Quotas
  - ZFS
  - Btrfs
  - Linux
  - DevOps
draft: false
---

Even when you initialize LXD with a bounded **`ZFS`** or **`Btrfs`** storage pool (for example, `30GiB`), LXD does **not** set a per-container root disk limit on the `default` profile out of the box. Left uncapped, a single misbehaving container writing gigabytes of debug logs can fill the entire pool and stall every other container on the host.

---

## 1. Which Storage Drivers Support Disk Quotas?

Before setting a `size` limit, confirm your storage pool uses a quota-capable backend (`lxc storage list`):

| Driver | Root Disk Quotas (`size=`) | Live Resize Support | Notes |
| :--- | :--- | :--- | :--- |
| **`zfs`** *(Recommended)* | **Yes** (dataset `quota` / `refquota`) | Grow & shrink live | Enable `volume.zfs.use_refquota=true` if snapshots shouldn't count against container `df -h` |
| **`btrfs`** | **Yes** (subvolume `qgroups`) | Grow & shrink live | Lightweight CoW quotas; works inside nested containers |
| **`lvm`** / **`ceph`** | **Yes** (block LV / RBD volume) | Grow live (shrink offline) | Block-backed `ext4`/`xfs` filesystem per container |
| **`dir`** | **No** *(by default)* | N/A | Only works if the underlying host `ext4`/`xfs` mount explicitly enables Linux project quotas |

---

## 2. Enforce a Default Root Quota on All Containers

Set `size=` on the `root` disk device inside the **`default` profile** right after running `lxd init` so every newly launched container inherits a safe ceiling:

```bash
# 1. Inspect pool driver and current free vs. used capacity
lxc storage list
lxc storage info default

# 2. Enforce a 20 GiB default root disk cap across the 'default' profile
lxc profile device set default root size=20GiB
lxc profile show default

# 3. Verify the 20 GiB ceiling inside a container
lxc launch ubuntu:24.04 web-01
lxc exec web-01 -- df -h /
```

*(Optional ZFS tip: Run `lxc storage set default volume.zfs.use_refquota true` so snapshots don't eat into the container's visible `20GiB` quota.)*

---

## 3. Override Disk Quotas for Specific Containers

When a database or build container needs more space than the `default` profile allows, use **`lxc config device override`** the first time (because `root` is inherited from `default`), and `lxc config device set` for any future resizes on that container:

```bash
# First custom resize on a container inheriting 'root' from 'default'
lxc config device override db-01 root size=50GiB

# Subsequent resizes on the already-overridden 'root' device
lxc config device set db-01 root size=80GiB

# Verify live inside the running container (instant on ZFS & Btrfs)
lxc exec db-01 -- df -h /
```

---

## 4. Quotas on Custom Persistent Volumes & Extra Pools

Keep high-churn data (PostgreSQL, Prometheus TSDB, uploads) on a **custom storage volume** with its own independent quota—or on a dedicated secondary NVMe pool:

```bash
# Create & resize an isolated custom volume inside the 'default' pool
lxc storage volume create default pg-data size=15GiB
lxc storage volume attach default pg-data db-01 /var/lib/postgresql
lxc storage volume set default pg-data size=30GiB

# Or add a separate pool on a dedicated secondary disk anytime after lxd init
lxc storage create fast-nvme zfs source=/dev/nvme1n1
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Check pool usage & total size | `lxc storage info <pool>` |
| Set default root quota (all containers) | `lxc profile device set default root size=20GiB` |
| Override single container quota (1st time) | `lxc config device override <name> root size=50GiB` |
| Resize already-overridden container root | `lxc config device set <name> root size=80GiB` |
| Revert container back to profile quota | `lxc config device remove <name> root` |
| Resize custom storage volume | `lxc storage volume set <pool> <vol> size=30GiB` |

---

## Key Takeaways

1. **`lxd init` caps the pool, not individual containers**—always set `lxc profile device set default root size=<limit>` on multi-container hosts.
2. Use **`zfs`** or **`btrfs`** for instant, live grow-and-shrink root disk quotas; standard `dir` pools do not enforce `size=` limits without host project quotas.
3. Use **`lxc config device override <name> root size=...`** when customizing a profile-inherited `root` disk on a single container.
