---
title: "LXD Profiles Guide: Resource Limits, Stacking Precedence, and Devices"
description: "Learn how to create, stack, and manage LXD profiles to apply live CPU and memory limits, autostart policies, and network or disk devices across containers."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Linux
  - Resource Management
  - DevOps
draft: false
---

An **LXD profile** is a reusable template of **configuration keys** (CPU/RAM limits, autostart policies, `cloud-init`, security flags) and **hardware devices** (NICs, disks, GPUs, proxy ports) that can be attached to any number of containers or LXD VMs—either at launch or live while instances are running.

---

## 1. Inspecting the Built-In `default` Profile

Every instance you create automatically receives the **`default`** profile unless you explicitly pass `--profile` (`-p`).

```bash
lxc profile list
lxc profile show default
```

Out of the box, `default` has an empty `config: {}` block and two essential `devices`:
- **`eth0` (`nic`):** Connects the instance to your `lxdbr0` bridge.
- **`root` (`disk`):** Mounts `/` from your default storage pool.

> **Note:** The `default` profile is permanent—LXD blocks both `lxc profile delete default` and `lxc profile rename default <new-name>`.

---

## 2. Creating, Copying & Editing Profiles

By default, an unthrottled LXD container sees **all** host CPU cores (`nproc`) and host RAM (`free -m`). Create dedicated profiles to enforce predictable sizing tiers:

```bash
# Option A: Create an empty profile (good for add-on overrides like CPU/RAM caps)
lxc profile create small-tier

# Option B: Clone 'default' so the new profile already includes eth0 + root disk
lxc profile copy default web-tier
```

You can modify a profile either **imperatively** via CLI flags or **declaratively** in your `$EDITOR` as YAML:

```bash
# Set and read individual config keys from the CLI
lxc profile set small-tier limits.cpu 2
lxc profile set small-tier limits.memory 2GiB
lxc profile get small-tier limits.memory

# Or edit the full YAML definition interactively
lxc profile edit small-tier
```

Example `small-tier` YAML output (`lxc profile show small-tier`):

```yaml
name: small-tier
description: "2 vCPU / 2 GiB RAM cap with host-reboot autostart"
config:
  boot.autostart: "true"
  limits.cpu: "2"
  limits.memory: 2GiB
devices:
  eth0:
    name: eth0
    network: lxdbr0
    type: nic
  root:
    path: /
    pool: default
    type: disk
```

---

## 3. Applying & Removing Profiles Live

Profile changes take effect **immediately** via Linux `cgroups` without restarting the container:

```bash
# Launch a standard Ubuntu 24.04 container (uses 'default')
lxc launch ubuntu:24.04 app-01

# Attach 'small-tier' on top of 'default' and verify live limits
lxc profile add app-01 small-tier
lxc info app-01 | grep -i profiles
lxc exec app-01 -- sh -c 'nproc && free -h'

# Detach 'small-tier' to return to uncapped host resources
lxc profile remove app-01 small-tier
```

---

## 4. Launch Behavior & Multi-Profile Precedence

### Launching with `--profile` (`-p`)

Passing `--profile` at launch **replaces** `default` rather than appending to it:

```bash
# WRONG if 'small-tier' has no root disk or eth0 device — launch will fail!
# lxc launch ubuntu:24.04 app-02 -p small-tier

# RIGHT: Stack an add-on profile AFTER 'default'
lxc launch ubuntu:24.04 app-02 -p default -p small-tier

# Or use a standalone profile that was copied from 'default'
lxc launch ubuntu:24.04 web-01 -p web-tier
```

### Conflict Resolution (Last Profile Wins)

When multiple profiles define the same key or device name, LXD merges them in order and **the last profile listed wins**:

```bash
lxc profile create large-cpu
lxc profile set large-cpu limits.cpu 4

# Order: default -> small-tier (2 CPU, 2GiB RAM) -> large-cpu (4 CPU)
lxc profile assign app-01 default,small-tier,large-cpu
lxc exec app-01 -- nproc   # Outputs: 4 (while keeping 2GiB RAM from small-tier)
```

---

## 5. Managing Devices Inside a Profile

Profiles also standardize storage quotas, extra NICs, or host directory mounts across containers:

```bash
# Enforce a 20 GiB root disk quota on every container using 'web-tier'
lxc profile device set web-tier root size=20GiB

# Remove an unused profile (must not be attached to any instances)
lxc profile delete large-cpu
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| List / inspect profiles | `lxc profile list` · `lxc profile show <profile>` |
| Create blank / cloned profile | `lxc profile create <name>` · `lxc profile copy default <name>` |
| Set / get config key | `lxc profile set <profile> <key> <val>` · `lxc profile get <profile> <key>` |
| Edit profile YAML interactively | `lxc profile edit <profile>` |
| Add / remove profile on container | `lxc profile add <instance> <profile>` · `lxc profile remove <instance> <profile>` |
| Replace full profile stack | `lxc profile assign <instance> default,<profile2>` |
| Launch with stacked profiles | `lxc launch ubuntu:24.04 <name> -p default -p <profile>` |
| Set device property in profile | `lxc profile device set <profile> <dev> <key>=<val>` |

---

## Key Takeaways

1. **`default` holds `eth0` and `root`**—it applies automatically at launch and cannot be deleted or renamed.
2. **CPU and memory limits apply live** (`limits.cpu`, `limits.memory`) without container restarts.
3. **Passing `-p <profile>` at launch drops `default`**—either copy `default` first or pass `-p default -p <profile>`.
4. **Last profile wins:** When stacking profiles, later profiles override conflicting keys from earlier ones.
5. Set **`boot.autostart=true`** on service profiles so critical containers automatically start after host reboots.
