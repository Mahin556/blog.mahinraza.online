---
title: "Migrating VMs from Digital Ocean to GCP: A Comprehensive Guide"
description: "This guide provides a step-by-step approach to migrating virtual machines (VMs) from Digital Ocean to Google Cloud Platform (GCP). It covers the necessary preparations, tools, and best practices to ensure a smooth transition."
date: 2026-11-17
category: "Cloud Migration"
tags:
  - Digital Ocean
  - Google Cloud Platform
  - Migration
  - Cloud Computing
  - Linux
  - DevOps
draft: true
---

I my current  organization i have given a task to migrate all the VMs from Digital Ocean to GCP. I have done some research and found that there are multiple ways to do this. In this blog post, I will share my experience and the steps I took to successfully migrate VMs from Digital Ocean to GCP.

DO snapshots can’t be exported, and GCP’s Migrate to Virtual Machines doesn’t support DO as a source.

The route that works is to stream the raw disk to GCS, gcloud compute images import it, and boot a VM from the image. The import auto-installs the GCP guest environment and fixes grub/networking.

1. DO droplet: inspect the disk and OS
```bash
bash
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
df -h /
lsb_release -ds
crontab -l > /root/crontab.bak
```

```bash
export PROJECT_ID=<PROJECT_ID>
export BUCKET=<BUCKET>
export REGION=<REGION>
export ZONE=<ZONE>
```

### Local machine
```bash
gcloud config set project $PROJECT_ID

gcloud services enable compute.googleapis.com cloudbuild.googleapis.com storage.googleapis.com

gcloud storage buckets create gs://$BUCKET --location=$REGION

gcloud compute addresses create msp-ftp-ip --region=$REGION

MYIP=$(curl -s https://ifconfig.me)

gcloud compute addresses describe msp-ftp-ip --region=$REGION --format='value(address)'

gcloud compute firewall-rules create uploader-ssh --target-tags=msp-ftp \
  --allow=tcp:22 --source-ranges=142.0.113.254,${MYIP}/32
```

### DO droplet: stream the disk
```bash
snap install google-cloud-cli --classic

gcloud auth login --no-launch-browser

gcloud config set project $PROJECT_ID

systemctl stop cron vsftpd && sync

dd if=/dev/vda bs=4M status=progress | gcloud storage cp - gs://$BUCKET/ftp.raw

systemctl start cron

gcloud storage ls -l gs://$BUCKET/ftp.raw     # expect ~26843545600 bytes (25 GiB)
```
Don’t start this within 10 minutes of 22:00 UTC. If it breaks mid-stream, rerun the dd line.

### Local machine: import + boot
```bash
gcloud storage buckets add-iam-policy-binding gs://digital-ocean-to-gcp-migration-bucket \
  --member=serviceAccount:service-474294215709@gcp-sa-vmmigration.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer

gcloud migration vms image-imports create ftp-image-import2 \
  --location=us-central1 \
  --source-file=gs://digital-ocean-to-gcp-migration-bucket/ftp.raw \
  --image-name=ftp-image

gcloud compute instances create msp-ftp --zone=$ZONE --machine-type=e2-small \
  --image=ftp-image --boot-disk-size=25GB --address=msp-ftp-ip --tags=msp-ftp
```

### New VM: immediately

```bash
gcloud compute ssh ftp --zone=$ZONE --command="sudo apt update && sudo apt install -y net-tools"

sudo crontab -l > /root/crontab.bak && sudo crontab -r

sudo systemctl disable --now vsftpd

echo 'datasource_list: [ GCE, None ]' | sudo tee /etc/cloud/cloud.cfg.d/90_gce.cfg

sudo cloud-init clean

systemctl --failed; timedatectl | grep 'Time zone'
```
If SSH fails: gcloud compute instances get-serial-port-output ftp --zone=$ZONE.

### New VM: creds + safe test

```bash
# sudo sed -i 's/password="[^"]*"/password=Sys.getenv("DB_PASS")/' /root/scripts/update_trade_automate.R

# echo 'DB_PASS=<DB_PASS>' | sudo tee /root/.Renviron >/dev/null && sudo chmod 600 /root/.Renviron

find /home/peconic/trades -type f -newermt "$(date -u +%F)"      # must print nothing, else skip next line
sudo Rscript /root/scripts/update_trade_automate.R               # expect: Error: No new trades
```

### Cutover (after the 22:00 UTC run finishes on DO)

DO:

```bash
crontab -r
tar czpf /tmp/trades.tgz -C /home/peconic trades
```

Local machine:

```bash
scp root@<DO_IP>:/tmp/trades.tgz .
gcloud compute scp trades.tgz ftp:/tmp/ --zone=$ZONE
```
New VM:

```bash
sudo tar xzpf /tmp/trades.tgz -C /home/peconic && sudo chown -R peconic:peconic /home/peconic/trades
sudo crontab /root/crontab.bak && sudo crontab -l
```
Send the uploader (142.0.113.254) the new IP.

Verify next day
```bash
sudo grep 'Accepted publickey for peconic' /var/log/auth.log | tail -3
ls -l --time-style=full-iso /home/peconic/trades | tail -2
sudo tail -20 /var/log/trade_automate.log
```
Plus a DB row-count check.

Cleanup (after a few clean days)
```bash
gcloud storage rm gs://$BUCKET/ftp.raw
gcloud compute images delete ftp-image
```

On DO: `snap remove google-cloud-cli`, rotate the insider DB password and update `/root/.Renviron` on the new VM, then delete the droplet.

