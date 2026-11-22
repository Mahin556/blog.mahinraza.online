---
title: "LXD Boot Autostart Guide: Controlling Startup Order, Priorities, and Delays"
description: "Configure LXD container startup and shutdown behavior across host reboots using boot.autostart, boot.autostart.priority, startup delays, and graceful stop ordering."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Linux
  - Systemd
  - DevOps
draft: false
---

When a physical Linux host reboots after a kernel upgrade or power event, starting every container at the exact same second often causes application crash loops—for example, `web-01` failing health checks because PostgreSQL inside `db-01.lxd` hasn't finished recovery yet. LXD's **`boot.*`** configuration keys let you control which instances boot, in what order, and how long LXD waits between tiers.

---

## 1. Understanding `boot.autostart` States

By default (`boot.autostart` unset), LXD remembers each container's **last power state**—restarting instances that were `RUNNING` before the reboot while leaving `STOPPED` ones off. Set `boot.autostart` explicitly when you want deterministic behavior:

| `boot.autostart` Value | Behavior on Host Boot / LXD Restart | Best Use Case |
| :--- | :--- | :--- |
| *(Unset — Default)* | Restores last state (`RUNNING` → starts, `STOPPED` → stays off) | General workstations & mixed environments |
| **`true`** | **Always starts**, even if manually stopped earlier | Critical production services (DBs, proxies, DNS) |
| **`false`** | **Never starts automatically**, even if running before reboot | Heavy dev/lab or batch containers started on demand |

---

## 2. Multi-Tier Startup Order & Delays

Combine **`boot.autostart.priority`** (**higher integer starts first**) and **`boot.autostart.delay`** (seconds LXD pauses **after** booting that container before starting the next one):

```bash
# Tier 1: Start PostgreSQL first (priority 50) and wait 10s for socket readiness
lxc config set db-01 boot.autostart true
lxc config set db-01 boot.autostart.priority 50
lxc config set db-01 boot.autostart.delay 10

# Tier 2: Start Redis cache second (priority 30) and wait 3s
lxc config set cache-01 boot.autostart true
lxc config set cache-01 boot.autostart.priority 30
lxc config set cache-01 boot.autostart.delay 3

# Tier 3: Start web frontend last (priority 10) once DB & cache are ready
lxc config set web-01 boot.autostart true
lxc config set web-01 boot.autostart.priority 10
```

---

## 3. Graceful Host Shutdown Ordering & Timeouts

During a host shutdown, you usually want the **reverse** order—stopping `web-01` first so active HTTP requests drain cleanly before `db-01` shuts down. Higher **`boot.stop.priority`** values stop **first**:

```bash
# Stop web-01 before db-01 on host shutdown
lxc config set web-01 boot.stop.priority 50
lxc config set db-01 boot.stop.priority 10

# Give slow-flushing databases up to 60s before LXD forces stop (default: 30s)
lxc config set db-01 boot.host_shutdown_timeout 60
```

---

## 4. Applying via Profiles & Testing Without a Host Reboot

Standardize autostart across an entire service tier with a profile, and verify `boot.autostart=true` behavior safely by restarting the LXD Snap daemon:

```bash
# Apply autostart to every container using 'prod-tier'
lxc profile set prod-tier boot.autostart true

# Test that a stopped 'boot.autostart=true' container comes back automatically
lxc stop web-01
sudo snap restart lxd
lxc list web-01
```

---

## Quick Command Cheat Sheet

| Key / Task | Command |
| :--- | :--- |
| Always / never start on host boot | `lxc config set <name> boot.autostart true` *(or `false`)* |
| Set startup priority (higher = earlier) | `lxc config set <name> boot.autostart.priority 50` |
| Wait N seconds before starting next | `lxc config set <name> boot.autostart.delay 10` |
| Set shutdown priority (higher = stops first) | `lxc config set <name> boot.stop.priority 50` |
| Extend host shutdown grace window | `lxc config set <name> boot.host_shutdown_timeout 60` |
| Inspect effective `boot.*` settings | `lxc config show <name> \| grep boot` |

---

## Key Takeaways

1. Leaving **`boot.autostart` unset** restores each container's pre-reboot state; set **`true`** for always-on services and **`false`** for on-demand lab nodes.
2. Higher **`boot.autostart.priority`** starts earlier, and **`boot.autostart.delay`** gives stateful dependencies (`PostgreSQL`, `MySQL`, `etcd`) breathing room before dependent apps boot.
3. Pair startup ordering with **`boot.stop.priority`** and **`boot.host_shutdown_timeout`** so frontends stop first and databases flush cleanly during host reboots.
