---
title: "Installing and Initializing LXD on Linux: A Step-by-Step Setup Guide"
description: "Learn how to install LXD on Linux, configure user permissions, set up storage pools and the lxdbr0 network bridge with lxd init, and automate setup with YAML preseeds."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - Linux
  - Ubuntu
  - DevOps
draft: false
---

Before you can launch system containers with LXD, your Linux host needs three things: the **LXD daemon**, **`lxd` group permissions** for your user, and an initialized **storage pool + network bridge (`lxdbr0`)**.

This guide walks through installing and configuring LXD step by step—both interactively with `lxd init` and automatically using a YAML preseed file.

> **Related Foundations:** New to how OS-level namespaces and `cgroups` compare to hardware hypervisors (`Intel VT-x` / `AMD-V`)? Pair this setup guide with [Virtualization, Virtual Machines, and Hypervisors: A Practical Guide](https://blog.mahinraza.online/posts/2026-11-17-virtualization-virtualMachine-and-hypervisor/) and [VirtualBox CLI Guide: Provisioning and Managing VMs with VBoxManage](https://blog.mahinraza.online/posts/2026-11-19-virtualbox-cli-vboxmanage/).

---

## Quick Start (Ubuntu / Debian)

On a fresh **Ubuntu `22.04` or `24.04 LTS`** machine where you want sensible defaults immediately, these commands install the LXD LTS Snap, grant your admin account socket access, initialize default storage and `lxdbr0` networking non-interactively, and verify connectivity with a disposable Ubuntu 24.04 container:

```bash
# 1. Install the LXD 5.21 LTS track and wait for the socket-activated daemon
sudo snap install lxd --channel=5.21/stable
sudo lxd waitready --timeout=60

# 2. Grant your user access to the LXD Unix socket (log out/in afterward to persist) so you can run `lxc` commands without `sudo`
sudo usermod -aG lxd "$USER"

# 3. Initialize default storage pool and lxdbr0 NAT bridge automatically
sg lxd -c "lxd init --auto"

# 4. Smoke-test container launch, IPv4 DHCP lease, and outbound HTTPS
sg lxd -c "lxc launch ubuntu:24.04 smoke-test"
sg lxd -c "lxc exec smoke-test -- ip -4 addr show eth0"
sg lxd -c "lxc delete --force smoke-test"
```

---

`lxd init --auto` is great for disposable laptop sandboxes, but for better control over disk size, storage drivers (`ZFS` vs. `dir`), and networking, follow the full steps below.


## Step 1: Pre-Flight Host Checks & Kernel Preparation

### Update the System (and Create a Non-Root User if Needed)

If you provisioned a bare-metal box or cloud VPS that dropped you directly into `root`, create a dedicated administrative account first and apply pending kernel upgrades before installing LXD:


```bash
# Optional: run only if logged in as root on a fresh VPS
adduser devops
usermod -aG sudo devops
su - devops

# Refresh package metadata and apply latest kernel & security updates
sudo apt update && sudo apt full-upgrade -y

# Reboot if a newer kernel was installed so containers boot on the patched kernel
[ -f /var/run/reboot-required ] && sudo reboot
```

### Verify ZFS / Btrfs Kernel Support & Optional KVM Acceleration

Run a 10-second capability check on your host before deciding which storage backend and instance types to enable:

```bash
# 1. Check Linux kernel version (5.15+ or 6.x with cgroup v2 recommended)
uname -r
stat -fc %T /sys/fs/cgroup   # Prints 'cgroup2fs' on modern cgroups v2 hosts

# 2. Check if the ZFS kernel module is available (for Copy-on-Write ZFS pools)
modinfo zfs >/dev/null 2>&1 && echo "ZFS module: AVAILABLE" || echo "ZFS module: MISSING"

# 3. Optional: Verify /dev/kvm if you also plan to run LXD Virtual Machines (--vm)
[ -e /dev/kvm ] && echo "KVM hardware virtualization: READY" || echo "KVM: UNAVAILABLE (containers still work!)"
```

> **Cloud Minimal Kernel Tip:** Standard Ubuntu Server images include `zfs.ko` out of the box via `linux-modules-extra-$(uname -r)`. However, stripped-down cloud kernels (such as `linux-kvm` or container-optimized VPS kernels) sometimes omit ZFS modules. If `modinfo zfs` reports missing on Ubuntu, either install full kernel modules (`sudo apt install -y linux-generic zfsutils-linux`) or choose **`btrfs`** or **`lvm`** during `lxd init`.

---

## Step 2: Installing LXD Across Linux Distributions

### Why Canonical Ships LXD as a Snap

Unlike standalone CLI binaries, LXD orchestrates a tight matrix of low-level system components: `liblxc`, `QEMU`, `OVMF` UEFI firmware, `ZFS` and `Btrfs` userspace tools, `dnsmasq`, `dqlite` (for clustering), and `CRIU` (for live migration). Canonical packages LXD as a self-contained **Snap** so all of those dependencies stay version-locked and isolated from host library upgrades.

### Choosing the Right Snap Channel (`LTS` vs. Feature Track)

| Snap Channel | Release Cadence | Support Window | Recommended Environment |
| :--- | :--- | :--- | :--- |
| **`5.21/stable`** *(LTS)* | Conservative bugfix & security backports | Supported through **June 2029** | Production hosts, shared lab servers, Kubernetes-on-LXD clusters |
| **`latest/stable`** *(6.x LTS/Current)* | Latest stable LXD release series | Rolling / current LTS track | Workstations and labs needing the newest UI & API features |

### Option A: Ubuntu (`22.04` / `24.04 LTS`) & Debian (`12 Bookworm`)

On Ubuntu Server, `snapd` is pre-installed (and sometimes `lxd` is already pre-seeded). On Debian `12`, install `snapd` first:

```bash
# Install snapd if missing (required on minimal Debian 12 / Ubuntu installs)
which snap >/dev/null 2>&1 || {
  sudo apt update && sudo apt install -y snapd
  sudo systemctl start snapd
  sudo snap install core
}

# Check if LXD is already installed (and remove any legacy apt lxd/lxc1 conflicts if present)
snap list lxd 2>/dev/null || sudo snap install lxd --channel=5.21/stable

# Wait until the LXD daemon socket is active and ready to accept API calls
sudo lxd waitready --timeout=60
```

> **Production Stability Tip — Hold Automatic Snap Refreshes:** By default, `snapd` refreshes snaps automatically four times a day. While live LXD refreshes usually leave running containers untouched, holding auto-refreshes lets you upgrade LXD strictly during scheduled maintenance windows:
> ```bash
> # Pin LXD against unattended background refreshes
> sudo snap refresh --hold=forever lxd
>
> # Later, upgrade manually during a planned maintenance window:
> sudo snap refresh lxd --channel=5.21/stable
> ```

### Option B: RHEL, Rocky Linux, AlmaLinux (`9.x`) & Fedora

Enable EPEL (on Enterprise Linux), enable `snapd.socket`, create the classic `/snap` symlink required by confined snaps, and install LXD:

```bash
# Rocky Linux / AlmaLinux 9 (skip epel-release on Fedora)
sudo dnf install -y epel-release
sudo dnf install -y snapd

# Enable snapd socket and create classic snap symlink
sudo systemctl enable --now snapd.socket
sudo ln -s /var/lib/snapd/snap /snap

# Log out/in (or wait a few seconds for snapd seed), then install LXD LTS
sudo snap install lxd --channel=5.21/stable
sudo lxd waitready --timeout=60
```

### Option C: Arch Linux / Manjaro (Native Package)

Arch Linux ships up-to-date native `lxc` and `lxd` packages directly in its official repositories without requiring `snapd`. When using native distro packages, you must explicitly configure subordinate UID/GID ranges (`/etc/subuid` and `/etc/subgid`) so unprivileged containers can remap `root`:

```bash
sudo pacman -S --needed lxc lxd dnsmasq

# Grant root a 65,536-ID unprivileged namespace range (Snap LXD handles this internally)
echo "root:1000000:65536" | sudo tee -a /etc/subuid /etc/subgid

# Enable socket activation for the LXD daemon
sudo systemctl enable --now lxd.socket
```

### Understanding LXD Socket Activation

If you check service status immediately after installing LXD, you might notice the main daemon appears inactive until your first `lxc` command runs. LXD uses **`systemd` socket activation** (`snap.lxd.daemon.unix.socket` on Snap, `lxd.socket` on native packages): the Unix socket listens continuously with zero idle footprint and wakes the `lxd` daemon automatically the instant a client connects—or immediately at boot whenever any instance has `boot.autostart=true`.

---

## Step 3: Configuring `lxd` Unix Socket Permissions Safely

All communication between the `lxc` CLI client and the `lxd` background daemon flows over a local root-owned Unix domain socket:

- **Snap installation path:** `/var/snap/lxd/common/lxd/unix.socket`
- **Native package path:** `/var/lib/lxd/unix.socket`

Access to that socket is gated by the **`lxd` Unix group**. Add your administrative user so you can run `lxc` commands cleanly without prefixing every command with `sudo`:

```bash
# Add your current user to the 'lxd' group
sudo usermod -aG lxd "$USER"

# Activate the group in your current terminal session (log out and SSH back in to make permanent)
newgrp lxd

# Confirm 'lxd' appears in your active groups and verify both Client and Server versions
id -nG
lxc version
```

Healthy output confirms both sides of the Unix socket are talking cleanly:

```text
Client version: 5.21.2 LTS
Server version: 5.21.2 LTS
```

> **Critical Security Boundary (`lxd` Group = Host `root`):** Anyone in the `lxd` group with unrestricted access to the `default` project can attach the host's `/` root filesystem into a privileged container (`lxc config device add pwn host-root disk source=/ path=/mnt/root`) and edit `/etc/shadow` or `/etc/sudoers` on the host. Treat `lxd` group membership exactly like passwordless `sudo`. On multi-user team servers, isolate developers using **restricted LXD Projects** (`lxc project create team-a -c features.profiles=true -c restricted=true`) and TLS/OIDC client certificates rather than shared local `lxd` group access.

---

## Step 4: Initialize LXD (`lxd init`)

Before creating containers, LXD needs a **storage pool** (for images, container disks, and snapshots) and a **network bridge** (for container IPs, DNS, and internet access) wired into its `default` profile.

Start the interactive wizard:

```bash
lxd init
```

### Prompt-by-Prompt Walkthrough (Standalone Server / Workstation)

Below is a battle-tested interactive session for a single host, followed by what each answer configures under the hood:

```text
Would you like to use LXD clustering? (yes/no) [default=no]: no
Do you want to configure a new storage pool? (yes/no) [default=yes]: yes
Name of the new storage pool [default=default]: default
Name of the storage backend to use (btrfs, ceph, dir, lvm, zfs) [default=zfs]: zfs
Create a new ZFS pool? (yes/no) [default=yes]: yes
Would you like to use an existing empty block device (e.g. a disk or partition)? (yes/no) [default=no]: no
Size in GiB of the new loop device (1GiB minimum) [default=30GiB]: 30GiB
Would you like to connect to a MAAS server? (yes/no) [default=no]: no
Would you like to create a new local network bridge? (yes/no) [default=yes]: yes
What should the new bridge be called? [default=lxdbr0]: lxdbr0
What IPv4 address should be used? (CIDR subnet notation, “auto” or “none”) [default=auto]: auto
What IPv6 address should be used? (CIDR subnet notation, “auto” or “none”) [default=auto]: auto
Would you like the LXD server to be available over the network? (yes/no) [default=no]: no
Would you like stale cached images to be updated automatically? (yes/no) [default=yes]: yes
Would you like a YAML "lxd init" preseed to be printed? (yes/no) [default=no]: yes
```

### What Every `lxd init` Decision Actually Does

1. **Use LXD Clustering (`no` for single hosts):** Clustering joins 3+ LXD servers using a distributed `dqlite` Raft database so instances can be scheduled and migrated across nodes. Keep this `no` unless bootstrapping a multi-node cluster.
2. **Storage Pool & Backend (`zfs` or `btrfs` recommended):** Creates the `default` storage pool where LXD stores downloaded base images, container root filesystems, custom volumes, and snapshots, and attaches it as the `/` root device in the `default` profile.
3. **Existing Block Device vs. Loop Device:**
   - Answering **`no`** creates a sparse loop file at `/var/snap/lxd/common/lxd/disks/default.img` (consumes physical disk space only as data is written, up to `30GiB`). Perfect for laptops and single-disk cloud VMs.
   - Answering **`yes`** lets you hand LXD a dedicated raw disk or partition (such as `/dev/nvme1n1` or `/dev/sdb`), bypassing your host's ext4/XFS filesystem layer completely for near-bare-metal storage I/O.
4. **Connect to MAAS (`no`):** Canonical *Metal as a Service* integrates LXD with bare-metal rack IPAM; leave `no` outside MAAS data centers.
5. **Local Network Bridge (`lxdbr0` with `auto`):** Generates a random non-conflicting private IPv4 `/24` subnet (e.g., `10.149.213.1/24`) and ULA IPv6 `/64` subnet, spawns a dedicated `dnsmasq` process bound strictly to `lxdbr0`, and enables outbound NAT masquerading. *(Tip: Type `none` for IPv6 if your host has IPv6 disabled via sysctl or strict corporate firewall policies.)*
6. **Expose LXD Over the Network (`no`):** Principle of least privilege—keep the REST API bound exclusively to the local Unix socket unless you need remote `lxc` CLI management or clustering over HTTPS (`:8443`).
7. **Auto-Update Cached Images (`yes`):** Once you pull an image like `ubuntu:24.04`, LXD caches it locally for 2-second launches and refreshes the cached image in the background every 6 hours so newly launched containers already include recent security patches.
8. **Print YAML Preseed (`yes`):** Prints the exact declarative YAML representation of all your answers so you can commit it directly into Git!


### Unattended Provisioning with Declarative YAML Preseeds

Clicking or typing through `lxd init` manually doesn't scale when provisioning hosts with **Ansible**, **Terraform**, **Packer**, or **`cloud-init`**. LXD supports full Infrastructure-as-Code bootstrap via `lxd init --preseed`.

Exporting Live Configuration Anytime (`lxd init --dump`):

```bash
# Already configured a host interactively and want to turn its exact storage, bridge, and profile setup into version-controlled YAML? Run:
lxd init --dump > lxd-preseed.yaml
```

Below is a clean, reproducible preseed manifest (`lxd-preseed.yaml`) that configures a `ZFS` storage pool, a pinned `10.240.10.1/24` `lxdbr0` bridge (avoiding random subnet drift across dev/staging hosts), automatic image refreshes, and sensible default `2 GiB RAM` / `20 GiB disk` guardrails:

```bash
cat <<'EOF' > lxd-preseed.yaml
config:
  images.auto_update_interval: "6"
networks:
  - name: lxdbr0
    type: bridge
    description: "Managed LXD local NAT bridge"
    config:
      ipv4.address: 10.240.10.1/24
      ipv4.nat: "true"
      ipv6.address: none
storage_pools:
  - name: default
    driver: zfs
    description: "Default ZFS Copy-on-Write storage pool"
    config:
      size: 40GiB
profiles:
  - name: default
    description: "Default LXD profile with safe resource guardrails"
    config:
      limits.memory: 2GiB
    devices:
      eth0:
        name: eth0
        network: lxdbr0
        type: nic
      root:
        path: /
        pool: default
        size: 20GiB
        type: disk
projects: []
cluster: null
EOF

# Apply declaratively in CI, Ansible, or cloud-init userdata
sudo lxd waitready --timeout=60
sudo lxd init --preseed < lxd-preseed.yaml
```

*(Provisioning a bare-metal server with an empty secondary disk `/dev/nvme1n1`? Simply replace `size: 40GiB` under `storage_pools[0].config` with `source: /dev/nvme1n1`.)*

*(Tip: You can export your current LXD setup to YAML anytime with `lxd init --dump`.)*

---

## Step 5: Post-Install Verification, Unprivileged Smoke Test & Firewall Rules

```bash
# 1. Verify configured image remotes (ubuntu:, ubuntu-minimal:, images:)
lxc remote list

# 2. Confirm storage pool and managed network bridge state
lxc storage list
lxc network list

# 3. Launch two lightweight Ubuntu 24.04 containers
lxc launch ubuntu:24.04 verify-a
lxc launch ubuntu:24.04 verify-b

# 4. Confirm both received IPv4 addresses on lxdbr0 within a few seconds
lxc list

# 5. Verify east-west .lxd internal DNS + outbound internet access
lxc exec verify-a -- ping -c 2 verify-b.lxd
lxc exec verify-a -- curl -Is https://ubuntu.com | head -n 1

# 6. Prove unprivileged user namespace isolation (Container UID 0 -> Host UID 1000000!)
lxc exec verify-a -- awk '{print "Container UID "$1" maps to Host UID "$2" (range "$3")"}' /proc/self/uid_map

# 7. Clean up smoke-test instances (cached ubuntu:24.04 image stays ready for 2s launches!)
lxc delete --force verify-a verify-b
```

> **Missing or Broken `images:` Remote?** Older tutorials reference `images.linuxcontainers.org`, which restricted Canonical LXD clients in 2024. On modern LXD (`5.21` / `6.x`), multi-distro images (`Debian`, `Rocky Linux`, `Alpine`, `Fedora`) live on Canonical's Simplestreams server (`https://images.lxd.canonical.com`). Add or update it in one command if needed:
> ```bash
> lxc remote add images https://images.lxd.canonical.com --protocol=simplestreams
> # Or update an older installation's existing URL:
> lxc remote set-url images https://images.lxd.canonical.com
> ```


### Allow `lxdbr0` Through Host Firewalls (If Needed)

If `lxc list` shows **no IPv4 address** or containers cannot reach the internet, your host firewall (or Docker) is likely blocking `lxdbr0`:

```bash
# Fix 1: If UFW is enabled on Ubuntu/Debian
sudo ufw allow in on lxdbr0
sudo ufw route allow in on lxdbr0
sudo ufw route allow out on lxdbr0

# Fix 2: If Docker is installed on the same host (Docker drops routed bridge traffic by default)
sudo iptables -I DOCKER-USER -i lxdbr0 -j ACCEPT
sudo iptables -I DOCKER-USER -o lxdbr0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
```

---

## Common Issues & Quick Fixes

| Symptom / Error Message | Root Cause | Exact CLI Fix |
| :--- | :--- | :--- |
| `Permission denied` connecting to `/var/snap/lxd/common/lxd/unix.socket` | Current login shell has not loaded your new `lxd` Unix group membership yet. | Run `sudo usermod -aG lxd "$USER" && newgrp lxd`, then log out and reconnect SSH. |
| `Error: Failed to create storage pool "default": The "zfs" tool isn't working` | Host kernel lacks `zfs.ko` (common on minimal cloud kernels or inside unprivileged VMs/containers). | Install `linux-modules-extra-$(uname -r)` on Ubuntu, or re-run `lxd init` selecting **`btrfs`** or **`lvm`**. |
| `lxc list` shows container `RUNNING` but **`IPV4` column is empty** | `UFW` or `firewalld` is dropping DHCP (`UDP 67/68`) packets arriving on `lxdbr0`. | Run `sudo ufw allow in on lxdbr0 && sudo ufw route allow in on lxdbr0 && sudo ufw route allow out on lxdbr0`. |
| Container gets an IPv4 on `lxdbr0`, can ping gateway, **cannot reach internet** | Docker Engine on the same host set `iptables` `FORWARD` policy to `DROP`, or IPv4 forwarding is disabled. | verify `sysctl net.ipv4.ip_forward` is `1`, and add `sudo iptables -I DOCKER-USER -i lxdbr0 -j ACCEPT` + `RELATED,ESTABLISHED` return rule. |
| `Failed Creating network "lxdbr0": Failed to run: ip6tables-restore` | Host kernel booted with `ipv6.disable=1`, so `lxdbr0` fails configuring `ipv6.address: auto`. | Disable IPv6 on the bridge: `lxc network set lxdbr0 ipv6.address none` (or set `ipv6.address: none` in preseed). |
| `Error: Failed to retrieve image metadata` from `images:` | `images:` remote still points to legacy `images.linuxcontainers.org` URL. | Run `lxc remote set-url images https://images.lxd.canonical.com`. |

---

## Essential LXD Setup & Host Admin Cheat Sheet

| Administrative Task | Command |
| :--- | :--- |
| Install LXD LTS & wait for socket | `sudo snap install lxd --channel=5.21/stable && sudo lxd waitready` |
| Pin LXD against auto-upgrades | `sudo snap refresh --hold=forever lxd` |
| Grant admin user socket access | `sudo usermod -aG lxd "$USER" && newgrp lxd` |
| Check CLI & daemon versions | `lxc version` |
| Interactive / automatic / YAML init | `lxd init` · `lxd init --auto` · `lxd init --preseed < lxd-preseed.yaml` |
| Export current host setup as YAML | `lxd init --dump > lxd-preseed.yaml` |
| Inspect storage pools & capacity | `lxc storage list` · `lxc storage info default` · `lxc storage show default` |
| Set default container disk quota | `lxc profile device set default root size=20GiB` |
| Inspect `lxdbr0` bridge & leases | `lxc network list` · `lxc network show lxdbr0` · `lxc network list-leases lxdbr0` |
| Inspect daemon logs when debugging | `sudo journalctl -u snap.lxd.daemon -n 100 --no-pager` |

---

## Key Takeaways

- Install LXD via `snap` so all container and storage dependencies stay matched.
- Add your admin user to the `lxd` group to run `lxc` commands without `sudo`—and remember `lxd` group access equals host `root`.
- Use **`zfs`** or **`btrfs`** in `lxd init` for instant snapshots and disk quotas, or **`dir`** as a quick fallback on restricted VMs.
- If containers don't get an IP or internet access on `lxdbr0`, permit `lxdbr0` traffic in `UFW` or Docker's `DOCKER-USER` chain.

---

## References & Further Reading

1. **Canonical LXD Installation & Snap Channel Documentation** — Supported distributions, LTS support lifecycles, and installation options: [documentation.ubuntu.com/lxd/en/latest/installing](https://documentation.ubuntu.com/lxd/en/latest/installing/)
2. **Initializing LXD & Preseed YAML Reference** — Complete schema for interactive `lxd init`, `--auto`, `--dump`, and `--preseed` automation: [documentation.ubuntu.com/lxd/en/latest/howto/initialize](https://documentation.ubuntu.com/lxd/en/latest/howto/initialize/)
3. **LXD Storage Drivers Comparison (`ZFS`, `Btrfs`, `LVM`, `Ceph`, `dir`)** — Feature matrix, Copy-on-Write behavior, block device sizing, and quotas: [documentation.ubuntu.com/lxd/en/latest/reference/storage_drivers](https://documentation.ubuntu.com/lxd/en/latest/reference/storage_drivers/)
4. **Bridge Firewalling & Docker Coexistence Guide** — Official Canonical guidance on preventing `UFW`, `firewalld`, and Docker `FORWARD` rules from breaking `lxdbr0`: [documentation.ubuntu.com/lxd/en/latest/howto/network_bridge_firewalld](https://documentation.ubuntu.com/lxd/en/latest/howto/network_bridge_firewalld/)
