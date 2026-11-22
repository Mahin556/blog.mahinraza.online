---
title: "LXD File Transfer Guide: Pushing, Pulling, and Editing Container Files (lxc file)"
description: "Copy files and directories between your Linux host and LXD containers with lxc file push and pull, set UID/GID permissions, edit container configs from your host editor, and mount shared folders."
date: 2026-11-22
category: "Platform & Systems Engineering"
tags:
  - LXD
  - LXC
  - Containers
  - CLI
  - Linux
  - DevOps
draft: false
---

With LXD, you don't need an SSH server running inside a container just to copy TLS certificates, Nginx configs, or application logs. The **`lxc file`** subcommand transfers, edits, and deletes files directly over the LXD daemon API—and even works on **`STOPPED`** containers when you need to repair a broken config that prevents booting.

---

## 1. Pushing & Pulling Files and Directories

> **Syntax Watchout:** Unlike `scp` (`host:/path`), `lxc file` uses a **forward slash** (`<instance>/<path>`). Using a colon (`web-01:/root/`) makes LXD look for a remote server named `web-01` and fail!

```bash
# Push a single file from host into /root/ inside web-01
echo "Hello from LXD host" > ./hello.txt
lxc file push ./hello.txt web-01/root/hello.txt

# Create missing parent directories automatically (-p / --create-dirs)
lxc file push -p ./site.conf web-01/etc/nginx/conf.d/site.conf

# Pull a log file from the container back to your current host directory
lxc file pull web-01/var/log/nginx/access.log ./web-01-access.log

# Copy entire directories recursively (-r / --recursive)
lxc file pull -r web-01/etc/nginx/ ./nginx-backup/
lxc file push -r ./static-assets/ web-01/var/www/html/
```

*(Note: When pushing into an existing directory path without naming the destination filename, keep the trailing slash—e.g., `web-01/root/`.)*

---

## 2. Controlling Ownership & Permissions on Push

By default, pushed files inherit your local file mode and UID/GID. When deploying private keys, scripts, or service configs, set container ownership and permissions explicitly in one command:

```bash
# Push a TLS private key owned by root:root with strict 0600 permissions
lxc file push --uid 0 --gid 0 --mode 0600 ./privkey.pem web-01/etc/ssl/private/privkey.pem

# Push an executable healthcheck script owned by ubuntu (UID 1000)
lxc file push --uid 1000 --gid 1000 --mode 0755 ./check.sh web-01/home/ubuntu/check.sh
```

---

## 3. Live Host Editing (`edit`), Cleanup & Shared Mounts

Minimal Alpine or stripped-down Ubuntu containers often lack `vim` or `nano`. **`lxc file edit`** pulls the target file transparently into your **host's `$EDITOR`** and writes changes back into the container as soon as you save:

```bash
# Edit a container config using your host's vim/nano/VS Code
lxc file edit web-01/etc/nginx/nginx.conf

# Delete a file or directory (-f) inside the container from the host
lxc file delete web-01/tmp/installer.tar.gz
```

Need **continuous two-way file sharing** (such as live-reloading source code) instead of repeated `push`/`pull` commands? Attach a host directory as a **`disk` device** with `shift=true` so unprivileged container UIDs can read and write cleanly:

```bash
lxc config device add web-01 shared-src disk source=/srv/project path=/opt/project shift=true
```

---

## Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| Push file into container | `lxc file push <local-file> <name>/<container-path>` |
| Push & create parent dirs (`-p`) | `lxc file push -p app.conf <name>/etc/myapp/app.conf` |
| Push with UID/GID & mode | `lxc file push --uid 0 --gid 0 --mode 0600 key.pem <name>/etc/ssl/key.pem` |
| Pull file from container | `lxc file pull <name>/var/log/syslog ./syslog` |
| Push / pull directory (`-r`) | `lxc file pull -r <name>/etc/nginx/ ./backup/` |
| Edit container file in host `$EDITOR` | `lxc file edit <name>/etc/nginx/nginx.conf` |
| Delete file inside container | `lxc file delete <name>/tmp/test.txt` |

---

## Key Takeaways

1. Always use **`<instance>/<path>`** (forward slash, no colon) unless referencing an external LXD remote (`node02:web-01/etc/hosts`).
2. `lxc file push`, `pull`, and `edit` work on **both running and stopped containers**, making recovery from bad `/etc` edits effortless.
3. Use `lxc file` for one-off configs, certs, and log collection, and a **`disk` device (`shift=true`)** when host and container need continuous live access to the same directory.
