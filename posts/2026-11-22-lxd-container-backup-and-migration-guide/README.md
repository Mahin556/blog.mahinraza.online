---
title: "LXD Container Backup and Migration Guide: Remote Copy vs. Export/Import"
description: "Learn how to back up and migrate LXD containers between Linux hosts using TLS remote copy, lxc export/import backups, and published golden image tarballs."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Backup
  - Migration
  - Linux
  - DevOps
draft: false
---

Moving stateful LXD containers between standalone Linux servers—or taking portable off-host backups—comes down to two approaches: **streaming directly over LXD's mutually authenticated HTTPS API** (`lxc copy` / `lxc move`) when the hosts can reach each other on port `8443`, or **exporting compressed tarballs** (`lxc export` or `lxc publish`) when hosts live behind separate firewalls.

---

## Method Comparison at a Glance

| Approach | Network API (`:8443`) Needed? | Preserves Snapshots & Config? | Best Use Case |
| :--- | :--- | :--- | :--- |
| **1. Remote Copy (`lxc copy` / `move`)** | **Yes** (direct TLS between hosts) | Optional (`--instance-only` vs. full) | **Fastest host-to-host migration** over LAN, VPN, or private network |
| **2. Instance Backup (`lxc export` / `import`)** | **No** (any file transfer / S3 / `scp`) | **Yes** (config + snapshots + rootfs) | **Off-site backups**, disaster recovery, and air-gapped host migrations |
| **3. Golden Image (`lxc publish` + `image export`)** | **No** | Rootfs & image metadata only | **Templating** a configured container to spin up multiple clones elsewhere |

---

## Lab Topology & Sample Workload

The examples below assume two standalone Ubuntu hosts with LXD (`5.21/stable`) installed on a shared private subnet:

- **Source host (`lxd-node-01`):** `172.42.42.101`
- **Target host (`lxd-node-02`):** `172.42.42.102`

Create a sample container with a marker file on **`lxd-node-01`**:

```bash
lxc launch ubuntu:24.04 app-01
lxc exec app-01 -- bash -c 'echo "migrated-ok" > /root/marker.txt'
```

---

## Method 1: Direct Remote Copy Over TLS (Preferred)

When `lxd-node-01` can reach `lxd-node-02` on TCP `8443`, LXD copies container filesystems directly over TLS with zero intermediate tarballs.

### Step 1: Expose the LXD API & Generate a Trust Token on Target (`lxd-node-02`)

Bind LXD to the target host's private IP (rather than `0.0.0.0` if the server also has a public NIC) and issue a one-time client trust token:

```bash
# Run on lxd-node-02 (target)
lxc config set core.https_address 172.42.42.102:8443
lxc config trust add lxd-node-01
```

*(Note: LXD `5.0+` uses one-time trust tokens via `lxc config trust add`. Older LXD `3.x`/`4.x` releases used a shared `core.trust_password` set during `lxd init`.)*

### Step 2: Register the Remote & Snapshot on Source (`lxd-node-01`)

Paste the token from Step 1 to register `lxd-node-02` as a named remote (`node02`), then take a clean snapshot:

```bash
# Run on lxd-node-01 (source)
lxc remote add node02 <paste-trust-token>
lxc remote list

# Stop briefly for a clean filesystem state (or snapshot live)
lxc stop app-01
lxc snapshot app-01 snap1
```

*(Tip: Add `--stateful` only if both hosts have identical CPU features and `CRIU` configured to checkpoint live RAM.)*

### Step 3: Copy (or Move) to `lxd-node-02`

Always reference the **remote alias** (`node02:`), not the remote machine's OS hostname:

```bash
# Copy from snapshot to target host (keeps original on source)
lxc copy app-01/snap1 node02:app-01

# Or move the entire container in one step (deletes source after transfer)
# lxc move app-01 node02:app-01
```

### Step 4: Start & Verify on `lxd-node-02`

```bash
# Run from lxd-node-01 using the remote prefix (or locally on lxd-node-02)
lxc start node02:app-01
lxc exec node02:app-01 -- cat /root/marker.txt
```

---

## Method 2: Offline Instance Backup (`lxc export` / `lxc import`)

When two LXD servers cannot reach each other on port `8443`—or you want an encrypted archive in S3/object storage—use `lxc export` and `lxc import`:

```bash
# 1. On lxd-node-01: export container (plus snapshots & config) to a tarball
lxc export app-01 app-01-backup.tar.gz

# Optional: add --instance-only to skip older snapshots, or --optimized-storage
# when both hosts use the exact same storage driver (ZFS -> ZFS or Btrfs -> Btrfs)

# 2. Copy archive to target host over SSH
scp app-01-backup.tar.gz ubuntu@172.42.42.102:~/

# 3. On lxd-node-02: import and start the restored container
lxc import ~/app-01-backup.tar.gz
lxc start app-01
lxc exec app-01 -- cat /root/marker.txt
```

---

## Method 3: Publish & Export as a Reusable Image

If your goal is turning a configured container into a **reusable base image** to launch multiple fresh instances across hosts, publish the snapshot into LXD's image store first:

```bash
# 1. On lxd-node-01: turn snapshot into a local image and export as .tar.gz
lxc publish app-01/snap1 --alias app-golden
lxc image export app-golden .

# 2. Transfer the generated <fingerprint>.tar.gz to lxd-node-02
scp *.tar.gz ubuntu@172.42.42.102:~/

# 3. On lxd-node-02: import image into local cache and launch new containers
lxc image import ~/*.tar.gz --alias app-golden
lxc launch app-golden app-clone-01
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Expose LXD HTTPS API on private IP | `lxc config set core.https_address <ip>:8443` |
| Generate client trust token (target) | `lxc config trust add <client-name>` |
| Add remote LXD host (source) | `lxc remote add <alias> <token-or-ip>` |
| Copy snapshot to remote LXD host | `lxc copy <container>/<snap> <remote>:<new-name>` |
| Move container to remote LXD host | `lxc move <container> <remote>:<new-name>` |
| Full offline backup & restore | `lxc export <name> backup.tar.gz` · `lxc import backup.tar.gz` |
| Publish snapshot as portable image | `lxc publish <name>/<snap> --alias <img-alias>` · `lxc image export <img-alias>` |

---

## Key Takeaways

1. **Prefer `lxc copy` / `lxc move` over TLS** when hosts have private network connectivity—bind `core.https_address` to a private IP and authenticate with `lxc config trust add` tokens rather than weak passwords.
2. **Use the remote alias (`node02:`), not the server hostname**, in all cross-host `lxc` commands.
3. **Use `lxc export` / `lxc import` for true backups** (preserves container config, devices, and snapshots), and **`lxc publish` + `lxc image export`** when creating golden base templates.
