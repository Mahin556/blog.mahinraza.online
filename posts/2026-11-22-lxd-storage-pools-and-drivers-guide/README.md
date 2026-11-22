---
title: "LXD Storage Pools and Drivers Guide: ZFS, Btrfs, LVM, dir, and Ceph"
description: "Compare LXD storage backends (ZFS, Btrfs, LVM, dir, and Ceph) and learn how to create storage pools, pick loop files vs. block disks, and attach custom volumes."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Storage
  - ZFS
  - Btrfs
  - Linux
  - DevOps
draft: false
---

Every LXD host uses one or more **storage pools** to store cached OS images, container and VM root filesystems, snapshots, and custom data volumes. Because your storage driver is the hardest setting to change once stateful containers are running, picking the right backend upfront saves hours of migration work later.

---

## 1. Comparing LXD Storage Drivers

| Driver | Snapshots & Clones | Disk Quotas | LXD VMs (`--vm`) | Best Fit & Trade-Offs |
| :--- | :--- | :--- | :--- | :--- |
| **`zfs`** *(Default)* | **Instant CoW** (zero initial space) | **Yes** | **Yes** (ZVOLs) | **Best overall for servers & labs.** Built-in LZ4 compression and checksums; uses extra host RAM (ARC). Cannot run inside unprivileged containers. |
| **`btrfs`** | **Instant CoW** (subvolumes) | **Yes** | **Yes** | **Best for nested containers (Docker/LXD)** or hosts already formatted with Btrfs; lower RAM usage than ZFS. |
| **`lvm`** | **Fast CoW** (thinpool) | **Yes** | **Yes** (LVs) | **Enterprise RHEL / Rocky Linux** hosts where ZFS modules aren't included in the stock kernel. |
| **`dir`** | **Slow full copy** (`rsync`) | **No** | **Yes** | **Fallback only** on restricted VPS kernels where ZFS, Btrfs, and loop devices are unavailable. |
| **`ceph`** | **Instant distributed CoW** | **Yes** | **Yes** (RBD) | **Multi-node HA LXD clusters** needing shared storage and cross-node failover. |

### Quick Rule of Thumb
- **Bare-metal or dedicated VM:** Pick **`zfs`** on a dedicated secondary disk.
- **Running Docker/K8s inside LXD or low-RAM laptop:** Pick **`btrfs`**.
- **RHEL / Rocky / AlmaLinux without ZFS:** Pick **`lvm`**.
- **Locked-down budget VPS:** Fall back to **`dir`**.

---

## 2. Creating Storage Pools: Loop File vs. Dedicated Disk

You can configure your primary pool during `lxd init` or add extra pools anytime with `lxc storage create`.

### Option A: Sparse Loop File (Labs & Single-Disk VMs)

Creates an auto-growing image file under `/var/snap/lxd/common/lxd/disks/`—easy to set up without repartitioning, with slight double-filesystem overhead:

```bash
# Create a 30 GiB loop-backed ZFS or Btrfs pool
lxc storage create lab-pool zfs size=30GiB
lxc storage create btrfs-pool btrfs size=20GiB
```

### Option B: Dedicated Block Device (Recommended for Production)

Point LXD directly at an empty raw disk or partition (such as `/dev/nvme1n1` or `/dev/sdb`) for bare-metal I/O performance:

```bash
# Create a ZFS pool backed directly by an empty NVMe drive
lxc storage create fast-nvme zfs source=/dev/nvme1n1
```

---

## 3. Inspecting Pools & Targeting a Pool at Launch

Check pool health, driver type, and real disk consumption:

```bash
lxc storage list
lxc storage show default
lxc storage info default
```

By default, `lxc launch` places containers on the pool defined in your `default` profile. Use `--storage` (`-s`) to place a workload on a different pool:

```bash
# Launch a database container onto the dedicated NVMe pool
lxc launch ubuntu:24.04 db-01 --storage fast-nvme
```

---

## 4. Custom Persistent Volumes (`lxc storage volume`)

Just like Docker volumes or cloud EBS disks, LXD lets you create standalone **custom storage volumes** that live independently of any container's lifecycle—ideal for databases, uploads, or shared directories:

```bash
# 1. Create a 10 GiB custom volume inside the 'default' pool
lxc storage volume create default pg-data size=10GiB

# 2. Mount the volume inside container 'db-01' at /var/lib/postgresql
lxc storage volume attach default pg-data db-01 /var/lib/postgresql

# 3. List custom volumes in the pool
lxc storage volume list default
```

If `db-01` is ever deleted or rebuilt, `pg-data` stays intact in the storage pool ready to attach to a replacement container (`lxc storage volume detach default pg-data db-01`).

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| List all storage pools | `lxc storage list` |
| View free vs. used pool space | `lxc storage info <pool>` |
| Create loop-backed ZFS pool | `lxc storage create <pool> zfs size=30GiB` |
| Create raw-disk ZFS pool | `lxc storage create <pool> zfs source=/dev/sdb` |
| Launch container on specific pool | `lxc launch ubuntu:24.04 app-01 --storage <pool>` |
| Create & attach custom volume | `lxc storage volume create <pool> <vol> size=10GiB` · `lxc storage volume attach <pool> <vol> <container> /mnt/data` |
| Delete unused pool or volume | `lxc storage volume delete <pool> <vol>` · `lxc storage delete <pool>` |

---

## Key Takeaways

- Prefer Copy-on-Write drivers (**`zfs`** or **`btrfs`**) over **`dir`** so snapshots and container clones complete instantaneously without duplicating disk blocks.
- Use sparse loop files (`size=30GiB`) for quick single-disk labs, and dedicated block devices (`source=/dev/nvme1n1`) for production I/O.
- Keep stateful application data on **custom storage volumes** (`lxc storage volume`) so you can upgrade or replace containers without touching persistent data.
