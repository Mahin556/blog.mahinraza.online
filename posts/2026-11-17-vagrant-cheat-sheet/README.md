---
title: "Vagrant Cheat Sheet: A Quick Reference Guide"
description: "A concise cheat sheet for HashiCorp Vagrant, covering essential commands, configuration, and tips for managing virtual machine environments efficiently."
date: 2026-11-17
category: "Platform & Systems Engineering"
tags:
  - Virtualization
  - Vagrant
  - HashiCorp
  - Linux
  - DevOps
  - Cheat Sheet
  - CLI
draft: true
---

### Vagrant Command Reference

#### Vagrant Box Commands (7 Commands)
| Command | Description | Example |
| :--- | :--- | :--- |
| `vagrant box add` | Adds a box to your local repository. | `vagrant box add ubuntu/focal64` |
| `vagrant box list` | Lists all boxes in your local repository. | `vagrant box list` |
| `vagrant box outdated` | Checks if any local boxes are outdated. | `vagrant box outdated` |
| `vagrant box update` | Updates a box to a new version. | `vagrant box update ubuntu/focal64` |
| `vagrant box repackage` | Repackages a box with a new name. | `vagrant box repackage ubuntu/focal64 --name my-new-box` |
| `vagrant box prune` | Removes outdated boxes from local repository. | `vagrant box prune` |
| `vagrant box remove` | Removes a box from your local repository. | `vagrant box remove ubuntu/focal64` |

**Location of VM Boxes on your system:**
- **Mac OS X and Linux:** `~/.vagrant.d/boxes`
- **Windows:** `C:/Users/USERNAME/.vagrant.d/boxes`

#### General Vagrant Commands
| Command | Description |
| :--- | :--- |
| `vagrant init` | Initializes a new Vagrant environment by creating a `Vagrantfile`. |
| `vagrant up` | Creates and configures the guest machine. |
| `vagrant ssh` | Logs into the guest machine via SSH. |
| `vagrant ssh-config` | Outputs OpenSSH configuration to connect to the VM. |
| `vagrant halt` | Gracefully stops the guest machine. |
| `vagrant suspend` | Suspends the guest machine (saves state). |
| `vagrant resume` | Resumes a suspended guest machine. |
| `vagrant reload` | Restarts the guest machine. |
| `vagrant destroy` | Stops and **deletes all traces** of the guest machine. |
| `vagrant status` | Shows the current status of the Vagrant environment. |
| `vagrant package` | Packages a running VM into a reusable box. |
| `vagrant provision` | Runs configured provisioners against the running VM. |

#### Plugin Commands
| Command | Description |
| :--- | :--- |
| `vagrant plugin install` | Installs a Vagrant plugin. |
| `vagrant plugin list` | Lists all installed plugins. |
| `vagrant plugin uninstall` | Uninstalls a plugin. |

---

### Part 4: Useful Tips & Tricks

- **Get Help:** Use the `--help` flag with any command to see all available options.
    ```bash
    vagrant --help
    vagrant <sub-command> --help
    vagrant box --help
    ```
- **VirtualBox Commands:** If using VirtualBox as your provider, you can use these commands to manage VMs directly:
    - **List all VMs:** `vboxmanage list vms`
    - **List running VMs:** `vboxmanage list runningvms`
- **Recommended Terminal for Windows:** Use **Git Bash** for a Linux-like command-line experience with better color support.

---

### Summary & Key Takeaways
- **Vagrant** is an open-source tool by **HashiCorp** that automates the creation and management of virtual machines.
- It uses a configuration file called a **`Vagrantfile`** to define VMs.
- A **Box** is a pre-configured VM image.
- The core command to start and provision VMs is **`vagrant up`**.
- Vagrant makes it easy to create **reproducible, consistent, and portable** development environments.
- The workflow is: **Install Vagrant → Install a Provider (VirtualBox) → `vagrant init` → Configure Vagrantfile → `vagrant up` → `vagrant ssh`**.