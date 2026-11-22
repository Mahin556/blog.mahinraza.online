---
title: "LXD CPU and Memory Limits Guide: Live cgroups Scaling with lxc config set"
description: "Cap and scale CPU, RAM, swap, and process limits live on running LXD containers using Linux cgroups—covering limits.cpu, CPU allowances, limits.memory, and fork-bomb protection."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Resource Management
  - Linux
  - DevOps
draft: false
---

Run `free -h` or `nproc` inside a freshly launched LXD container and you will see your **entire physical host's RAM and CPU cores**. Left uncapped on a shared server, a single memory leak or runaway build job can trigger the host kernel's OOM killer. Because LXD maps `limits.*` keys directly onto Linux **`cgroups`** (and virtualizes `/proc/meminfo` & `/proc/cpuinfo` via **`lxcfs`**), you can cap, raise, or lower resources **live without restarting the container**.

---

## 1. Scaling CPU & Memory Live (`lxc config set`)

Apply per-instance CPU and RAM limits on the fly—changes take effect inside the running container instantaneously:

```bash
# Cap 'web-01' at 512 MiB RAM and 1 vCPU while it is RUNNING
lxc config set web-01 limits.memory 512MiB
lxc config set web-01 limits.cpu 1

# Verify immediately inside the container (shows 512Mi RAM and 1 core)
lxc exec web-01 -- sh -c 'free -h && nproc'

# Scale RAM up to 1 GiB live during a traffic spike — zero downtime
lxc config set web-01 limits.memory 1GiB
lxc exec web-01 -- free -h

# Inspect or remove an instance-level override
lxc config show web-01
lxc config unset web-01 limits.memory
```

*(Want the same limits across 10 containers instead of one? Set the exact same keys on a profile via `lxc profile set small-tier limits.memory 1GiB`.)*

---

## 2. CPU Pinning vs. Scheduler Allowance

LXD gives you two complementary ways to govern CPU usage:

| Key & Example | How the Linux Kernel Enforces It | Best Use Case |
| :--- | :--- | :--- |
| **`limits.cpu=2`** | Pins container to **2 cores** (`cpuset`), auto-rebalanced by LXD; `nproc` prints `2` | Sizing Java/Go/Node runtimes that auto-tune thread pools from `nproc` |
| **`limits.cpu=0,1`** *(or `0-3`)* | Pins container to **exact physical CPU IDs** | Isolating noisy workloads or NUMA-sensitive databases |
| **`limits.cpu.allowance=25%`** | Soft proportional scheduler weight when host CPUs are busy (bursts to 100% when idle) | Fair sharing across dev/CI containers without wasting idle cores |
| **`limits.cpu.allowance=50ms/100ms`** | Hard CFS time-slice cap (**50% of 1 core max**, even if host is idle) | Strict multi-tenant throttling |

---

## 3. Memory Enforcement, Swap & Fork-Bomb Protection

Fine-tune how the kernel handles memory pressure, swap, and runaway process trees:

```bash
# Hard cap (default): OOM-killer stops processes at 2 GiB
# Soft cap: allows bursting above 2 GiB unless the host runs low on RAM
lxc config set db-01 limits.memory 2GiB
lxc config set db-01 limits.memory.enforce hard

# Disable swap inside the container (required for kubelet & latency-critical DBs)
lxc config set db-01 limits.memory.swap false

# Cap total processes/threads to prevent fork bombs from starving the host PID table
lxc config set web-01 limits.processes 500
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Cap container RAM live | `lxc config set <name> limits.memory 1GiB` *(or `20%`)* |
| Cap / pin vCPU count live | `lxc config set <name> limits.cpu 2` *(or `0-3`)* |
| Hard CPU time-slice ceiling | `lxc config set <name> limits.cpu.allowance 50ms/100ms` |
| Disable container swap usage | `lxc config set <name> limits.memory.swap false` |
| Guard against fork bombs | `lxc config set <name> limits.processes 500` |
| Remove custom limit key | `lxc config unset <name> <key>` |

---

## Key Takeaways

1. **`limits.memory` and `limits.cpu` update live** via Linux `cgroups` and `lxcfs`—apps inside the container immediately see the updated `free -h` and `nproc` values with zero reboot.
2. Use **`limits.cpu=N`** when runtimes (JVM, Go `GOMAXPROCS`, Nginx `worker_processes auto`) inspect visible core counts, and **`limits.cpu.allowance`** for fractional CPU shares.
3. Add **`limits.memory.swap=false`** for Kubernetes/database nodes and **`limits.processes`** on untrusted or CI containers to prevent host-wide PID exhaustion.
