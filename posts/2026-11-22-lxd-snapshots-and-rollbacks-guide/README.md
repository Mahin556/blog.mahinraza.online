---
title: "LXD Snapshots Guide: Point-in-Time Rollbacks, Schedules, and Auto-Expiry"
description: "Capture and restore LXD container snapshots in milliseconds—covering Copy-on-Write rollbacks, non-destructive snapshot branching, cron schedules, and automatic retention."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Snapshots
  - Backup
  - Linux
  - DevOps
draft: false
---

Point-in-time **snapshots** are one of LXD's highest-leverage day-2 features. Before running `apt full-upgrade`, applying firewall rules, or testing a database schema migration, you can snapshot a container and roll back in seconds if anything breaks. On **`zfs`** and **`btrfs`** pools, snapshots use Copy-on-Write pointers—consuming near-zero initial disk space and completing in milliseconds.

---

## 1. Creating Snapshots & Rolling Back (`lxc snapshot` / `restore`)

Capture a named snapshot (or omit the name to auto-generate `snap0`, `snap1`, …) and roll back cleanly at any time:

```bash
# 1. Seed sample release files inside 'web-01'
lxc exec web-01 -- bash -c 'mkdir -p /srv/releases/{v1,v2,v3}'

# 2. Capture a named point-in-time snapshot (add --reuse to overwrite an existing name)
lxc snapshot web-01 pre-migration

# 3. Check snapshot count in 'lxc list' and timestamps at the bottom of 'lxc info'
lxc list web-01
lxc info web-01

# 4. Simulate a destructive mistake and roll back instantaneously
lxc exec web-01 -- rm -rf /srv/releases
lxc restore web-01 pre-migration
lxc exec web-01 -- ls -la /srv/releases
```

> **ZFS Rollback Rule:** On `zfs` storage pools, ZFS can only roll directly back to the **most recent** snapshot (unless newer snapshots are deleted first). If you need files from an older snapshot without deleting newer ones, branch it into a separate container instead (`lxc copy web-01/old-snap web-inspect`).

---

## 2. Branching & Deleting Snapshots

Clone any historical snapshot into an isolated container for debugging—without interrupting the live workload—and prune obsolete snapshots once changes are verified:

```bash
# Branch a new stopped container directly from a snapshot
lxc copy web-01/pre-migration web-forensics
lxc start web-forensics

# Delete a snapshot when no longer needed
lxc delete web-01/pre-migration
```

---

## 3. Automated Snapshot Schedules & Retention

LXD includes a built-in scheduler and expiry engine (configurable per container or across a tier via `lxc profile set`)—no external `cron` scripts required:

```bash
# Take daily snapshots at midnight, name by date, and auto-prune after 7 days
lxc config set db-01 snapshots.schedule "@daily"
lxc config set db-01 snapshots.schedule.stopped false
lxc config set db-01 snapshots.pattern "auto-{{ creation_date|date:'2006-01-02' }}"
lxc config set db-01 snapshots.expiry "7d"
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Take named snapshot | `lxc snapshot <name> <snap>` |
| Overwrite existing snapshot name | `lxc snapshot <name> <snap> --reuse` |
| List snapshots & creation dates | `lxc info <name>` |
| Roll container back to snapshot | `lxc restore <name> <snap>` |
| Clone new container from snapshot | `lxc copy <name>/<snap> <new-container>` |
| Delete a snapshot | `lxc delete <name>/<snap>` |
| Schedule daily 7-day retention | `lxc config set <name> snapshots.schedule "@daily"` · `...snapshots.expiry "7d"` |

---

## Key Takeaways

1. Use **`zfs`** or **`btrfs`** storage pools so `lxc snapshot` and `lxc restore` complete instantaneously via Copy-on-Write rather than slow `dir` `rsync` copies.
2. Prefer **`lxc copy <name>/<snap> <clone>`** when recovering a single config file or inspecting older state on ZFS without rolling back the entire live container.
3. Combine **`snapshots.schedule`** with **`snapshots.expiry`** so automated snapshots never accumulate unbounded disk usage—and pair local snapshots with off-host `lxc export` backups for true disaster recovery.
