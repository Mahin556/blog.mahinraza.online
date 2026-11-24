#!/usr/bin/env bash

set -euo pipefail

export PATH="/snap/bin:$PATH"

NODES=("kmaster" "kworkerone" "kworkertwo")
PROFILE_NAME="k8s"
UBUNTU_VERSION="24.04"
PROFILE_CONFIG_FILE="k8s-profile-config.yaml"
BOOTSTRAP_SCRIPT="kube-bootstrap.sh"

usage() {
  echo "Usage: $0 [provision|destroy]" >&2
  exit 1
}

if [[ -z "${1:-}" ]]; then
  usage
fi

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

check_dependencies() {
  local deps=("lxc")
  for dep in "${deps[@]}"; do
    if ! command -v "$dep" &> /dev/null; then
      log "Error: $dep is not installed. Please install it and try again."
      exit 1
    fi
  done
}

create_k8s_profile() {
  if ! lxc profile show "$PROFILE_NAME" &> /dev/null < /dev/null; then
    log "Creating $PROFILE_NAME profile"
    lxc profile create "$PROFILE_NAME" < /dev/null
  else
    log "$PROFILE_NAME profile already exists; updating configuration"
  fi

  if [[ -f "/vagrant/$PROFILE_CONFIG_FILE" ]]; then
    lxc profile edit "$PROFILE_NAME" < "/vagrant/$PROFILE_CONFIG_FILE"
  else
    log "Warning: /vagrant/$PROFILE_CONFIG_FILE not found. Profile not configured."
  fi
}

wait_for_node() {
  local node=$1
  log "Waiting for $node network and boot to finish..."
  for _ in {1..30}; do
    if lxc exec "$node" -n -- sh -c 'ip -4 addr show dev eth0 | grep -q "inet "' < /dev/null 2>/dev/null; then
      break
    fi
    sleep 2
  done

  lxc exec "$node" -n -- sh -c 'if command -v cloud-init >/dev/null 2>&1; then cloud-init status --wait >/dev/null 2>&1 || true; fi' < /dev/null
}

provision_node() {
  local node=$1
  log "Bringing up $node"
  if ! lxc info "$node" &> /dev/null < /dev/null; then
    lxc launch "ubuntu:$UBUNTU_VERSION" "$node" --profile "$PROFILE_NAME" < /dev/null
    wait_for_node "$node"
    log "Running provisioner script"
    if [[ -f "/vagrant/$BOOTSTRAP_SCRIPT" ]]; then
      log "Copying bootstrap script to $node"
      lxc file push "/vagrant/$BOOTSTRAP_SCRIPT" "$node/tmp/$BOOTSTRAP_SCRIPT" < /dev/null
      log "Running bootstrap script on $node"
      lxc exec "$node" -n -- bash "/tmp/$BOOTSTRAP_SCRIPT" < /dev/null
    else
      log "Error: /vagrant/$BOOTSTRAP_SCRIPT not found. Node created but not provisioned."
      exit 1
    fi
  else
    log "Warning: $node already exists. Skipping creation."
  fi
}

copy_kubeconfig() {
  local master_node="${NODES[0]}"
  log "Copying kubeconfig from $master_node to Vagrant VM..."

  if lxc exec "$master_node" -n -- test -f /etc/kubernetes/admin.conf < /dev/null; then
    mkdir -p "$HOME/.kube"
    lxc file pull "$master_node/etc/kubernetes/admin.conf" "$HOME/.kube/config" < /dev/null
    chmod 600 "$HOME/.kube/config"

    if id "vagrant" &>/dev/null && [[ -d "/home/vagrant" && "$HOME" != "/home/vagrant" ]]; then
      mkdir -p /home/vagrant/.kube
      cp -f "$HOME/.kube/config" /home/vagrant/.kube/config
      chown -R vagrant:vagrant /home/vagrant/.kube
      chmod 600 /home/vagrant/.kube/config
    fi
    log "kubeconfig copied to ~/.kube/config (and /home/vagrant/.kube/config)"
  else
    log "Warning: /etc/kubernetes/admin.conf not found on $master_node"
  fi
}

kubeprovision() {
  create_k8s_profile
  for node in "${NODES[@]}"; do
    provision_node "$node"
  done
  copy_kubeconfig
  log "Kubernetes cluster provisioned successfully"
}

kubedestroy() {
  for node in "${NODES[@]}"; do
    if lxc info "$node" &> /dev/null < /dev/null; then
      log "Destroying $node"
      lxc delete --force "$node" < /dev/null
    else
      log "Node $node does not exist. Skipping."
    fi
  done
  rm -f "$HOME/.kube/config" /home/vagrant/.kube/config
  log "Kubernetes cluster destroyed successfully"
}

main() {
  check_dependencies

  case "$1" in
    provision)
      log "Provisioning Kubernetes Cluster"
      kubeprovision
      ;;
    destroy)
      log "Destroying Kubernetes Cluster"
      kubedestroy
      ;;
    *)
      usage
      ;;
  esac
}

main "$@"
