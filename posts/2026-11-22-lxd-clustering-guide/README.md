---
title: "LXD Clustering Guide: Multi-Node Setup, Fan Networking, and Failover"
description: "Learn how to build a 3-node LXD cluster on Ubuntu, configure cross-node Fan overlay networking, place instances across hosts, and troubleshoot failover and unpack errors."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Clustering
  - Containers
  - Networking
  - Linux
  - DevOps
draft: false
---

**LXD clustering** links multiple Linux hosts into a single unified management plane backed by a distributed **dqlite** (Raft-replicated SQLite) database over port `8443/tcp`. 

Once clustered, you can run `lxc` commands from any member node to launch, inspect, and `exec` into containers across your entire fleet.

---

## 1. Quorum Rules & 3-Node Lab Setup

- **Minimum 3 nodes (odd count):** Raft consensus requires a strict majority (`(N/2) + 1`) to maintain quorum and elect a new database leader if one host goes offline.
- **Routable private network:** Every node must reach every other node on a shared private or LAN subnet (`8443/tcp` for cluster API + UDP `8472` VXLAN for Fan overlay traffic).

### Lab `Vagrantfile` (`ubuntuvm01` – `ubuntuvm03`)

```ruby
Vagrant.configure("2") do |config|
  (1..3).each do |i|
    config.vm.define "ubuntuvm0#{i}" do |node|
      node.vm.box = "ubuntu/jammy64"
      node.vm.hostname = "ubuntuvm0#{i}"
      node.vm.network "private_network", ip: "172.42.42.10#{i}"
      node.vm.provider "virtualbox" do |v|
        v.name = "ubuntuvm0#{i}"
        v.memory = 2048
        v.cpus = 2
      end
    end
  end
end
```

Boot the VMs (`vagrant up`), open a shell on each (`vagrant ssh ubuntuvm01`..`03`), and install LXD:

```bash
sudo snap install lxd --channel=5.21/stable
sudo usermod -aG lxd "$USER"
newgrp lxd
```

*(Note: LXD uses `systemd` socket activation—the daemon stays idle until your first `lxc` or `lxd` command triggers it.)*

---

## 2. Bootstrapping Node 1 & Joining Nodes 2–3

### Step 1: Bootstrap `ubuntuvm01`

Run `sudo lxd init` on **`ubuntuvm01`** and answer the key clustering prompts as follows:

| `lxd init` Prompt | Value | Why It Matters |
| :--- | :--- | :--- |
| Enable LXD clustering? | **`yes`** | Initializes the distributed `dqlite` store on `:8443` |
| Cluster node name | `ubuntuvm01` | Unique hostname in `lxc cluster list` |
| IP or DNS address to reach node | **`172.42.42.101`** | **Do not accept `10.0.2.15`** (Vagrant's isolated NAT NIC) |
| Joining an existing cluster? | **`no`** | Bootstraps the first seed node |
| Create new local storage pool? | `yes` (`zfs`, `btrfs`, or `dir`) | Stores container root filesystems locally per node |
| Create new **Fan overlay network**? | **`yes`** | Creates `lxdfan0` for cross-node container networking |
| Fan underlay subnet | **`172.42.42.0/24`** | Explicitly target the private subnet instead of `auto` |

### Step 2: Join `ubuntuvm02` and `ubuntuvm03`

On modern LXD (`5.0+`), generate a one-time **join token** for each new member from `ubuntuvm01`:

```bash
# Run on ubuntuvm01
lxc cluster add ubuntuvm02
lxc cluster add ubuntuvm03
```

*(Older LXD `3.x`/`4.x` releases prompt for a shared cluster trust password instead of a join token.)*

Next, run **`sudo lxd init`** on `ubuntuvm02` (`172.42.42.102`) and `ubuntuvm03` (`172.42.42.103`):
- Set **Enable clustering?** → `yes` and **Joining an existing cluster?** → **`yes`**.
- Provide the node's private IP (`172.42.42.102` / `.103`), paste the join token (or cluster IP `172.42.42.101` + trust password), and accept local storage defaults.
- **Warning:** Joining a cluster wipes any pre-existing containers or images on the joining node.

Verify all three nodes report `ONLINE` from any terminal:

```bash
lxc cluster list
lxc cluster show ubuntuvm02
```

---

## 3. Launching & Managing Containers Across Nodes

Once clustered, every node shares the same API view—`lxc list` gains a **`LOCATION`** column, and `lxc exec` automatically proxies across hosts:

```bash
# Auto-placed on the least-loaded node (fewest instances)
lxc launch ubuntu:24.04 web-01
lxc launch ubuntu:24.04 web-02

# Pin an instance to a specific node with --target
lxc launch ubuntu:24.04 web-03 --target ubuntuvm03

# Inspect placement and open a shell from ANY cluster node
lxc list
lxc exec web-01 -- bash
```

---

## 4. Fixing Cross-Node Fan Networking (`lxdfan0`)

If containers on the **same** node can ping each other, but containers on **different** nodes time out:

1. **Cause:** Leaving `fan.underlay_subnet` set to `auto` during `lxd init` on multi-NIC VMs often binds `lxdfan0` to Vagrant's non-routable `10.0.2.0/24` NAT subnet instead of `172.42.42.0/24`.
2. **Fix:** Point `lxdfan0` at the routable inter-node subnet, then recreate (or restart) existing containers so they receive updated `240.x.x.x` Fan IPs:

```bash
lxc network show lxdfan0
lxc network set lxdfan0 fan.underlay_subnet 172.42.42.0/24

# Refresh container leases onto the updated Fan subnet
lxc restart web-01 web-02 web-03
lxc list
```

> **DNS Note:** Cross-node connectivity over `lxdfan0` works reliably by **container IP**, whereas built-in `.lxd` hostname resolution is scoped to each node's local `dnsmasq` instance unless you configure cluster-wide DNS zones or OVN networking.

---

## 5. Node Failover & Common Troubleshooting

### What Happens When a Node Goes Offline?

```bash
# Simulate a hard node outage on ubuntuvm03
sudo poweroff

# Check status from ubuntuvm01 (~20s heartbeat delay before OFFLINE)
lxc cluster list
lxc list
```

- **Heartbeat delay:** Dead nodes remain `ONLINE` briefly until the ~20-second cluster heartbeat expires, during which `lxc list` may pause waiting on the unreachable host before marking it `OFFLINE` and its containers `ERROR`.
- **No automatic migration on local storage:** With per-node storage (`dir`, `zfs`, `btrfs`), container root filesystems live on that host's disk—when `ubuntuvm03` boots back up (`vagrant up ubuntuvm03`), it rejoins `ONLINE` and restarts its containers automatically. Automatic cross-node failover requires shared **`ceph`** storage (or planned maintenance via `lxc cluster evacuate <node>`).

### Fixing `unsquashfs` Container Unpack Failures

If `lxc launch` fails with `Unpack failed, Failed to run: unsquashfs ...` when auto-placing an instance, check the **target node** where LXD scheduled the container (not necessarily the node where you ran the command):

- **Low RAM (`< 1 GiB` VMs):** Kernel OOM killer terminates `unsquashfs` mid-extraction (use `2 GiB+` RAM per VM).
- **Full storage pool / root disk:** Vagrant base boxes have small disks that fill up after caching multiple OS images.
- **Corrupt cached image:** Delete the cached image on the failing node and retry.

```bash
# Run on the failing target node
lxc list -c ns4L
df -h /var/snap/lxd/common/lxd
free -m
sudo dmesg | grep -i -E 'oom|killed process'

# Drop a corrupt cached image if needed
lxc image list
lxc image delete <fingerprint>
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Bootstrap first cluster node | `sudo lxd init` *(clustering: `yes`, joining: `no`)* |
| Generate join token for new node | `lxc cluster add <node-name>` |
| Join node to existing cluster | `sudo lxd init` *(joining: `yes`)* |
| Inspect cluster health & node details | `lxc cluster list` · `lxc cluster show <node>` |
| Launch instance (auto least-loaded) | `lxc launch ubuntu:24.04 <name>` |
| Launch instance on specific node | `lxc launch ubuntu:24.04 <name> --target <node>` |
| Update Fan overlay underlay subnet | `lxc network set lxdfan0 fan.underlay_subnet 172.42.42.0/24` |
| Evacuate node before maintenance | `lxc cluster evacuate <node>` · `lxc cluster restore <node>` |

---

## Key Takeaways

1. Always run at least **3 nodes** (odd number) so `dqlite` keeps quorum if one node fails.
2. Bind clustering and `lxdfan0` (`fan.underlay_subnet`) to your **routable private subnet**, never Vagrant's `10.0.2.15` NAT interface.
3. Default placement chooses the **least-loaded** node; override anytime with `--target <node>`.
4. Local storage pools keep containers pinned to their host during outages—use **Ceph** (or `lxc cluster evacuate` before planned reboots) if workloads must move across nodes.
