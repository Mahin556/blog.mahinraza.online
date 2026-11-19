// Built-in Starter Templates for blog.mahinraza.online Visual Diagram Studio
window.DIAGRAM_PRESETS = {
  // =========================================================================
  // 1. VIRTUALIZATION & LINUX SYSTEMS
  // =========================================================================
  'pipeline-vagrant': {
    group: 'Virtualization & Linux',
    label: 'Pipeline: Vagrant Up 6-Step Execution',
    mode: 'pipeline',
    kicker: '// EXECUTION PIPELINE',
    badge: '$ vagrant up',
    title: 'What Happens Under the Hood During "vagrant up"',
    fileName: 'vagrant-up-workflow',
    pipelineCols: 3,
    steps: [
      { badge: 'STEP 1', title: 'Parse Vagrantfile', desc: 'Evaluates Ruby DSL configuration and resolves box, CPU/RAM, networking, and provisioners.', code: 'Vagrant.configure("2")', theme: 'default' },
      { badge: 'STEP 2', title: 'Fetch & Cache Box', desc: 'Checks global box cache first; downloads the .box image once from HCP Registry if missing.', code: '~/.vagrant.d/boxes/', theme: 'default' },
      { badge: 'STEP 3', title: 'Clone Base Image', desc: 'Calls provider CLI to import disk (VDI / QCOW2) and allocate configured vCPUs and vRAM.', code: 'VBoxManage import', theme: 'default' },
      { badge: 'STEP 4', title: 'Wire Virtual Network', desc: 'Attaches NAT adapter for SSH (2222->22), host-only private IPs, and custom port forwards.', code: '127.0.0.1:2222 · 192.168.56.x', theme: 'default' },
      { badge: 'STEP 5', title: 'Boot, SSH & Mount', desc: 'Boots Guest OS, rotates default key to a unique SSH keypair, and mounts synced folder.', code: 'Host ./ <-> Guest /vagrant', theme: 'default' },
      { badge: 'STEP 6', title: 'Run Provisioners', desc: 'Executes Shell scripts, Ansible playbooks, or package installs. Ready for SSH!', code: '$ vagrant ssh', theme: 'teal' }
    ]
  },

  'compare-hypervisors': {
    group: 'Virtualization & Linux',
    label: 'Comparison (2-Way): Type 1 vs. Type 2 Hypervisors',
    mode: 'comparison',
    kicker: '// HYPERVISOR TAXONOMY',
    badge: '',
    title: 'Type 1 (Bare-Metal) vs. Type 2 (Hosted) Hypervisors',
    fileName: 'type1-vs-type2-hypervisors',
    left: {
      title: 'Type 1 Hypervisor (Bare-Metal)',
      pill: 'Production / Cloud',
      theme: 'teal',
      nodes: [
        { name: 'Guest VM 1', top: 'K8s Worker', bottom: 'Linux OS' },
        { name: 'Guest VM 2', top: 'PostgreSQL', bottom: 'Linux OS' },
        { name: 'Guest VM 3', top: 'AD / Core', bottom: 'Windows OS' }
      ],
      layers: [
        { title: 'No desktop Host OS layer in between', sub: '', style: 'notice' },
        { title: 'Type 1 Bare-Metal Hypervisor', sub: 'Linux KVM · VMware ESXi · Hyper-V · AWS Nitro', style: 'teal' },
        { title: 'Physical Server Hardware (Bare Metal)', sub: 'Xeon / EPYC CPUs · ECC RAM · NVMe · 25GbE NIC', style: 'dark' }
      ],
      footer: 'Near-native speed · Minimal attack surface · Cloud scale'
    },
    right: {
      title: 'Type 2 Hypervisor (Hosted)',
      pill: 'Dev / Local Labs',
      theme: 'sky',
      nodes: [
        { name: 'Guest VM 1', top: 'Kubeadm Lab', bottom: 'Ubuntu Guest' },
        { name: 'Guest VM 2', top: 'Test Sandbox', bottom: 'Rocky Guest' },
        { name: 'Host Apps', top: 'IDE & Browser', bottom: 'Share Host RAM' }
      ],
      layers: [
        { title: 'Type 2 Hosted Hypervisor Application', sub: 'Oracle VirtualBox · VMware Workstation · Parallels', style: 'sky' },
        { title: 'Host Operating System', sub: 'Windows 11 · macOS · Ubuntu Desktop (Device Drivers)', style: 'slate' },
        { title: 'Physical Workstation / Laptop Hardware', sub: 'Desktop CPU · System RAM · Local SSD · Wi-Fi', style: 'dark' }
      ],
      footer: 'Instant desktop setup · Easy local testing · Extra OS hop'
    }
  },

  'compare-virt': {
    group: 'Virtualization & Linux',
    label: 'Comparison (2-Way): Traditional Server vs. Virtualized Host',
    mode: 'comparison',
    kicker: '// ARCHITECTURE COMPARISON',
    badge: '',
    title: 'Traditional Dedicated Server vs. Virtualized Host',
    fileName: 'traditional-vs-virtualized',
    left: {
      title: '1. Traditional Dedicated Server',
      pill: '~15-25% Utilized',
      theme: 'amber',
      nodes: [
        { name: 'Single App', top: 'App + Runtime', bottom: '1 OS Only' },
        { name: 'Idle Capacity', top: 'Unused CPU/RAM', bottom: 'Stranded Cost' }
      ],
      layers: [
        { title: 'Single Host Operating System', sub: 'Tightly coupled to physical server hardware', style: 'slate' },
        { title: 'Physical Server Hardware', sub: 'CPU · RAM · NVMe Storage · Physical NIC', style: 'dark' }
      ],
      footer: 'Hardware underutilization · Slow manual provisioning'
    },
    right: {
      title: '2. Virtualized Host System',
      pill: 'Isolated & Efficient',
      theme: 'teal',
      nodes: [
        { name: 'Guest VM 1', top: 'Web API', bottom: 'Ubuntu 24.04' },
        { name: 'Guest VM 2', top: 'Database', bottom: 'Rocky Linux 9' },
        { name: 'Guest VM 3', top: 'Worker', bottom: 'Debian 12' }
      ],
      layers: [
        { title: 'Hypervisor / Virtual Machine Monitor (VMM)', sub: 'CPU Scheduling · Memory SLAT (EPT) · Virtual I/O', style: 'teal' },
        { title: 'Physical Host Hardware', sub: 'Shared Physical CPU · Host RAM · NVMe · NIC', style: 'dark' }
      ],
      footer: 'High hardware density · Kernel isolation · Portable images'
    }
  },

  'threeway-compute': {
    group: 'Virtualization & Linux',
    label: '3-Way Matrix: Bare Metal vs. Virtual Machines vs. Containers',
    mode: 'threeway',
    kicker: '// COMPUTE ISOLATION SPECTRUM',
    badge: 'Stack Comparison',
    title: 'Bare Metal vs. Virtual Machines vs. Linux Containers',
    fileName: 'baremetal-vs-vms-vs-containers',
    columns: [
      {
        title: '1. Bare Metal',
        pill: 'Zero Abstraction',
        theme: 'slate',
        items: 'Dedicated App & Binaries\nSingle Host OS & Kernel\nDirect Hardware Drivers\nPhysical CPU / RAM / NVMe',
        metric: 'Boot: Minutes · Overhead: 0%',
        footer: 'Best for raw I/O, HPC & custom hypervisors'
      },
      {
        title: '2. Virtual Machines',
        pill: 'Hardware Isolation',
        theme: 'sky',
        items: 'Isolated App + Libraries\nDedicated Guest OS Kernel\nHypervisor (KVM / Nitro / ESXi)\nShared Physical Server',
        metric: 'Boot: Seconds · Strong VT-x Boundary',
        footer: 'Best for multi-tenant cloud & mixed OS kernels'
      },
      {
        title: '3. Containers',
        pill: 'OS Virtualization',
        theme: 'teal',
        items: 'App + Minimal OCI Image\nNamespaces + cgroups v2\nContainer Runtime (containerd)\nShared Host Linux Kernel',
        metric: 'Boot: Milliseconds · Image: MBs',
        footer: 'Best for high-density microservices & K8s pods'
      }
    ]
  },

  'stack-lxd': {
    group: 'Virtualization & Linux',
    label: 'Stack: LXC / LXD System Containers Architecture',
    mode: 'stack',
    kicker: '// SYSTEM CONTAINERS',
    badge: 'LXD Daemon + LXC',
    title: 'LXC & LXD System Containers on a Shared Linux Kernel',
    fileName: 'lxc-lxd-architecture',
    nodes: [
      { name: 'lxc: ubuntu-web', pills: 'systemd init (PID 1)\nNGINX + OpenSSH\nRootfs (/var/snap/lxd)', spec: 'lxdbr0: 10.10.0.11 · cgroup limits', theme: 'teal' },
      { name: 'lxc: rocky-db', pills: 'systemd init (PID 1)\nPostgreSQL 16\nZFS / Btrfs Volume', spec: 'lxdbr0: 10.10.0.12 · cgroup limits', theme: 'teal' },
      { name: 'lxd-vm: win-test', pills: 'Full Guest Kernel\nQEMU Backend\nUEFI SecureBoot', spec: 'lxdbr0: 10.10.0.20 · KVM VM', theme: 'sky' }
    ],
    layers: [
      { title: 'LXD REST API & CLI (`lxc launch`, Snapshots, Clustering, Profiles)', sub: 'Manages both OS system containers (liblxc) and KVM virtual machines (QEMU)', style: 'teal' },
      { title: 'Linux Kernel Isolation Primitives', sub: 'Namespaces (pid, net, mnt, user) · cgroups v2 · AppArmor / Seccomp · KVM', style: 'slate' },
      { title: 'Physical Linux Host Hardware', sub: 'Host CPU · System RAM · ZFS / Btrfs Storage Pool · Bridge NIC', style: 'dark' }
    ]
  },

  // =========================================================================
  // 2. KUBERNETES & CONTAINERS
  // =========================================================================
  'stack-k8s': {
    group: 'Kubernetes & Containers',
    label: 'Cluster Stack: Kubernetes Control Plane & Workers',
    mode: 'stack',
    kicker: '// KUBERNETES LAB TOPOLOGY',
    badge: 'kubeadm v1.31',
    title: 'Multi-Node Kubernetes Cluster on Vagrant & VirtualBox',
    fileName: 'k8s-kubeadm-cluster-stack',
    nodes: [
      { name: 'masternode (Control Plane)', pills: 'kube-apiserver + etcd\nkube-scheduler & controller\nCalico CNI Control', spec: '192.168.56.11 · 2 vCPU · 4 GB', theme: 'teal' },
      { name: 'workernode-01 (Data Plane)', pills: 'kubelet + kube-proxy\nApplication Pods (NGINX)\ncontainerd CRI Runtime', spec: '192.168.56.12 · 2 vCPU · 4 GB', theme: 'sky' },
      { name: 'workernode-02 (Data Plane)', pills: 'kubelet + kube-proxy\nStateful Workloads & CSI\ncontainerd CRI Runtime', spec: '192.168.56.13 · 2 vCPU · 4 GB', theme: 'sky' }
    ],
    layers: [
      { title: 'Host-Only Private Network (192.168.56.0/24) + Pod Overlay (10.244.0.0/16)', sub: 'Node-to-node East/West traffic + VXLAN / BGP pod routing', style: 'notice' },
      { title: 'Vagrant Automation + VirtualBox Hypervisor Provider', sub: 'Provisioned declaratively from a single multi-machine Vagrantfile', style: 'teal' },
      { title: 'Host Workstation Hardware (Linux / macOS / Windows)', sub: '8+ CPU Cores · 16+ GB System RAM · SSD Storage', style: 'dark' }
    ]
  },

  'hub-ingress': {
    group: 'Kubernetes & Containers',
    label: 'Hub Flow: Kubernetes Ingress -> Services -> Pods',
    mode: 'hub',
    kicker: '// KUBERNETES NORTH-SOUTH TRAFFIC',
    badge: 'HTTPS :443',
    title: 'Kubernetes Ingress & Gateway Traffic Routing',
    fileName: 'k8s-ingress-traffic-flow',
    leftHeader: '1. External Clients & DNS',
    leftArrow: 'TLS 1.3',
    centerTitle: '2. Ingress / Gateway Controller',
    centerSub: 'Terminates TLS, matches Host & Path rules, enforces rate limits, forwards to ClusterIP Endpoints.',
    centerCode: 'ingress-nginx / Envoy Gateway',
    rightArrow: 'Pod IP',
    rightHeader: '3. Backend Services & Pods',
    leftCards: [
      { title: 'api.mahinraza.online', sub: 'Mobile & Web Clients', code: 'GET /v1/orders' },
      { title: 'auth.mahinraza.online', sub: 'OIDC Login Traffic', code: 'POST /oauth/token' },
      { title: 'Cloudflare / AWS NLB', sub: 'External L4 Entrypoint', code: ' LoadBalancer VIP' }
    ],
    rightCards: [
      { title: 'orders-svc (ClusterIP)', sub: '3 Ready Pod Endpoints', code: '10.244.1.18:8080' },
      { title: 'auth-svc (ClusterIP)', sub: '2 Ready Pod Endpoints', code: '10.244.2.41:8443' },
      { title: 'metrics-svc (Internal)', sub: 'Scraped by Prometheus', code: ':9090 /metrics' }
    ]
  },

  'pipeline-cicd': {
    group: 'Kubernetes & Containers',
    label: 'Pipeline: Zero-Downtime GitOps CI/CD Flow',
    mode: 'pipeline',
    kicker: '// GITOPS DELIVERY PIPELINE',
    badge: 'main -> production',
    title: 'Zero-Downtime Kubernetes GitOps Release Flow',
    fileName: 'gitops-release-pipeline',
    pipelineCols: 4,
    steps: [
      { badge: '01', title: 'Git Push & PR', desc: 'Engineer pushes code; GitHub Actions runs unit tests, linters, and Trivy scan.', code: 'git push origin feat/*', theme: 'default' },
      { badge: '02', title: 'Build OCI Image', desc: 'Builds multi-arch container image and signs immutable digest with Cosign.', code: 'ghcr.io/app@sha256:9f3c', theme: 'sky' },
      { badge: '03', title: 'Update Manifests', desc: 'CI commits new image digest into Kubernetes Helm / Kustomize Git repo.', code: 'kustomize edit set image', theme: 'default' },
      { badge: '04', title: 'Argo CD Sync', desc: 'Argo CD reconciles cluster state and performs progressive canary rollout.', code: 'kubectl rollout status', theme: 'teal' }
    ]
  },

  'decision-pod': {
    group: 'Kubernetes & Containers',
    label: 'Decision Flowchart: Kubernetes Pod Failure Triage',
    mode: 'decision',
    kicker: '// TROUBLESHOOTING RUNBOOK',
    badge: 'kubectl describe pod',
    title: 'Debugging Unhealthy Kubernetes Pods Systematically',
    fileName: 'k8s-pod-troubleshooting-tree',
    trigger: 'Alert: Pod Stuck in Pending, ImagePullBackOff, or CrashLoopBackOff',
    checks: [
      {
        condition: '1. Is Pod Phase stuck in "Pending"?',
        yesTitle: 'Scheduler / Capacity Block',
        yesDesc: 'Check node CPU/RAM requests, Taints/Tolerations, or unbound PVC (`WaitForFirstConsumer`).',
        yesCode: 'kubectl get events --sort-by=.lastTimestamp',
        noLabel: 'Container Created -> Check Next'
      },
      {
        condition: '2. Status shows "ImagePullBackOff" or "ErrImagePull"?',
        yesTitle: 'Registry Auth / Tag Error',
        yesDesc: 'Verify image tag exists, `imagePullSecrets` token is valid, and NAT/VPC egress reaches registry.',
        yesCode: 'kubectl describe pod <name>',
        noLabel: 'Image Pulled -> Check Next'
      },
      {
        condition: '3. Container exits with Exit Code 137 (OOMKilled)?',
        yesTitle: 'Memory Limit Exceeded',
        yesDesc: 'Cgroup killed process. Raise `resources.limits.memory` or profile heap leak.',
        yesCode: 'Last State: Terminated (137)',
        noLabel: 'Exit Code 1 -> Check App Logs'
      }
    ],
    finalBox: 'Inspect previous crash logs: `kubectl logs <pod> --previous` & verify ConfigMap/Secret env vars'
  },

  // =========================================================================
  // 3. CLOUD & STORAGE (AWS / EFS)
  // =========================================================================
  'boundary-vpc-efs': {
    group: 'Cloud & Storage',
    label: 'Cloud VPC Zones: Multi-AZ EKS & Amazon EFS Mount Targets',
    mode: 'boundary',
    kicker: '// AWS CLOUD NETWORK TOPOLOGY',
    badge: 'vpc-0a1b2c (10.0.0.0/16)',
    title: 'Multi-AZ Amazon EKS to EFS Architecture Without Cross-AZ Fees',
    fileName: 'aws-eks-efs-vpc-topology',
    outerLabel: 'AWS Region (ap-south-1) · Production VPC (10.0.0.0/16) · VPC DNS Enabled',
    zones: [
      {
        name: 'Public Subnet Tier (DMZ)',
        cidr: '10.0.1.0/24 & 10.0.2.0/24',
        theme: 'sky',
        items: 'Application Load Balancer (ALB)\nNAT Gateways (AZ-a & AZ-b)\nInternet Gateway (IGW) Route'
      },
      {
        name: 'Private Compute Tier (EKS Workers)',
        cidr: '10.0.11.0/24 & 10.0.12.0/24',
        theme: 'teal',
        items: 'EKS Worker Nodes + efs-csi-node\nTLS Stunnel / efs-proxy (:2049)\nIAM Role for Service Accounts (IRSA)'
      },
      {
        name: 'Isolated Storage Tier (Amazon EFS)',
        cidr: 'Mount Targets in AZ-a & AZ-b',
        theme: 'amber',
        items: 'AZ-local EFS ENI Mount Targets\nEFS Access Point (uid/gid 1000)\nSG Rule: Allow TCP 2049 from EKS SG'
      }
    ],
    bottomNote: 'AZ-local DNS resolution (`fs-id.efs.region.amazonaws.com`) mounts same-AZ ENI -> sub-ms latency & $0 cross-AZ transfer'
  },

  'threeway-storage': {
    group: 'Cloud & Storage',
    label: '3-Way Matrix: Amazon EBS vs. Amazon EFS vs. Amazon S3',
    mode: 'threeway',
    kicker: '// AWS STORAGE SELECTION',
    badge: 'Block vs File vs Object',
    title: 'Choosing Between Amazon EBS, EFS, and S3 in Production',
    fileName: 'aws-ebs-vs-efs-vs-s3',
    columns: [
      {
        title: 'Amazon EBS (gp3/io2)',
        pill: 'Block Storage',
        theme: 'slate',
        items: 'Single-AZ NVMe Block Volume\n1 Pod / EC2 Attach (RWO)\nSub-millisecond Disk Latency\nDatabases (PostgreSQL, etcd)',
        metric: 'Up to 256,000 IOPS (io2)',
        footer: 'Best for low-latency single-writer stateful DBs'
      },
      {
        title: 'Amazon EFS',
        pill: 'Shared POSIX File',
        theme: 'teal',
        items: 'Multi-AZ Regional NFSv4.1\n1,000s of Pods Attach (RWX)\nElastic Auto-Scaling Capacity\nCMS, Shared ML Artifacts, Home Dirs',
        metric: 'ReadWriteMany (RWX) POSIX',
        footer: 'Best for multi-pod shared Linux filesystems'
      },
      {
        title: 'Amazon S3',
        pill: 'Object Storage',
        theme: 'sky',
        items: 'Global HTTP/REST Object API\n11 Nines (99.999999999%) Durability\nImmutable Keys + Lifecycle Tiers\nBackups, Data Lakes, Logs, Assets',
        metric: 'Virtually Unlimited Scale',
        footer: 'Best for blobs, backups, telemetry & static media'
      }
    ]
  },

  'pipeline-datasync': {
    group: 'Cloud & Storage',
    label: 'Pipeline: Zero-Data-Loss EFS Encryption Migration',
    mode: 'pipeline',
    kicker: '// STORAGE MIGRATION WORKFLOW',
    badge: 'AWS DataSync + TLS',
    title: 'Migrating Unencrypted EFS to KMS-Encrypted EFS Safely',
    fileName: 'efs-datasync-migration',
    pipelineCols: 4,
    steps: [
      { badge: 'PHASE 1', title: 'Provision Target', desc: 'Create KMS-encrypted EFS, AZ Mount Targets, and matching Access Points.', code: 'encrypted = true', theme: 'default' },
      { badge: 'PHASE 2', title: 'Initial Bulk Sync', desc: 'Run AWS DataSync task preserving POSIX UID/GID, permissions, and timestamps.', code: 'VerifyMode: ONLY_FILES_TRANSFERRED', theme: 'sky' },
      { badge: 'PHASE 3', title: 'Freeze & Delta Sync', desc: 'Scale writers to 0 briefly and execute final incremental DataSync delta pass.', code: 'Duration: ~1-3 mins', theme: 'amber' },
      { badge: 'PHASE 4', title: 'Cutover PV/Mounts', desc: 'Point Kubernetes PVCs / fstab to encrypted fs-id and verify RWX health.', code: 'mount -t efs -o tls', theme: 'teal' }
    ]
  },

  // =========================================================================
  // 4. OBSERVABILITY & TRACING
  // =========================================================================
  'hub-otel': {
    group: 'Observability & Tracing',
    label: 'Hub Flow: Centralized OpenTelemetry Collector Pipeline',
    mode: 'hub',
    kicker: '// OBSERVABILITY PIPELINE',
    badge: 'OTLP gRPC :4317',
    title: 'Centralized OpenTelemetry Collector Architecture',
    fileName: 'otel-collector-pipeline',
    leftHeader: '1. Instrumented Services',
    leftArrow: 'OTLP',
    centerTitle: '2. OTel Collector Gateway',
    centerSub: 'Receivers -> Memory Limiter -> Batch & Tail Sampling -> Redaction -> Exporters',
    centerCode: 'otelcol-contrib v0.112',
    rightArrow: 'Export',
    rightHeader: '3. Telemetry Backends',
    leftCards: [
      { title: 'Go Checkout API', sub: 'Traces + RED Metrics', code: 'otel-go SDK' },
      { title: 'Python Async Worker', sub: 'Structured Logs + Spans', code: 'opentelemetry-py' },
      { title: 'Kubernetes Nodes', sub: 'Host & Kubelet Metrics', code: 'kubeletstats' }
    ],
    rightCards: [
      { title: 'Grafana Tempo / Jaeger', sub: 'Distributed Trace Storage', code: 'OTLP / gRPC' },
      { title: 'Prometheus / Mimir', sub: 'Long-Term Metrics TSDB', code: 'Remote Write' },
      { title: 'Grafana Loki', sub: 'Indexed Log Aggregation', code: 'HTTP Push' }
    ]
  },

  'threeway-pillars': {
    group: 'Observability & Tracing',
    label: '3-Way Matrix: Metrics vs. Logs vs. Distributed Traces',
    mode: 'threeway',
    kicker: '// TELEMETRY CORRELATION',
    badge: 'Exemplars + trace_id',
    title: 'Correlating Metrics, Logs, and Traces During an Outage',
    fileName: 'metrics-logs-traces-correlation',
    columns: [
      {
        title: '1. Metrics (RED / USE)',
        pill: 'Unsampled Aggregates',
        theme: 'teal',
        items: 'Numeric Time-Series Counters\nCheap O(1) Storage per Series\nPowers SLO Burn-Rate Paging\nLinks to Traces via Exemplars',
        metric: 'Answers: "Is there a problem?"',
        footer: 'Prometheus · VictoriaMetrics · Mimir'
      },
      {
        title: '2. Distributed Traces',
        pill: 'Request Causality',
        theme: 'sky',
        items: 'DAG of Timed Parent/Child Spans\nPropagates W3C traceparent\nPinpoints Slow Service/DB Hop\nTail-Sampled on Errors/Latency',
        metric: 'Answers: "Where is latency?"',
        footer: 'OpenTelemetry · Tempo · Jaeger'
      },
      {
        title: '3. Structured Logs',
        pill: 'Deep Event Context',
        theme: 'slate',
        items: 'JSON Events with trace_id & span_id\nExact Stack Traces & SQL Errors\nHigh Volume -> Retain Strategically\nFiltered Instantly by Trace ID',
        metric: 'Answers: "Why did it fail?"',
        footer: 'Loki · OpenSearch · ClickHouse'
      }
    ]
  },

  'sequence-trace': {
    group: 'Observability & Tracing',
    label: 'Sequence Flow: W3C Trace Context Propagation',
    mode: 'sequence',
    kicker: '// DISTRIBUTED TRACING FLOW',
    badge: 'W3C traceparent',
    title: 'End-to-End Trace Context Propagation Across Services',
    fileName: 'w3c-trace-context-sequence',
    actors: ['Client Browser', 'API Gateway', 'Orders Service', 'PostgreSQL DB'],
    messages: [
      { from: 0, to: 1, label: 'POST /checkout (HTTPS)', code: 'Edge generates root trace_id', dashed: false },
      { from: 1, to: 2, label: 'gRPC CreateOrder()', code: 'traceparent: 00-4bf92f...-a3f1-01', dashed: false },
      { from: 2, to: 3, label: 'INSERT INTO orders ...', code: 'db.system=postgresql (14ms)', dashed: false },
      { from: 3, to: 2, label: 'COMMIT OK', code: 'Child DB span closed', dashed: true },
      { from: 2, to: 1, label: '201 Created (order_id)', code: 'Server span exported via OTLP', dashed: true },
      { from: 1, to: 0, label: 'HTTP 201 + x-trace-id header', code: 'Total latency: 48ms', dashed: true }
    ]
  },

  // =========================================================================
  // 5. SRE & INCIDENT RESPONSE
  // =========================================================================
  'timeline-incident': {
    group: 'SRE & Incident Response',
    label: 'Timeline: Production Incident Response & Mitigation',
    mode: 'timeline',
    kicker: '// INCIDENT LIFECYCLE TIMELINE',
    badge: 'SEV-1 · TTR: 22m',
    title: 'Anatomy of a Fast, Blameless SEV-1 Incident Mitigation',
    fileName: 'sev1-incident-timeline',
    events: [
      { time: '14:02 UTC (T+0m)', badge: 'DETECTION', title: 'Multi-Window SLO Burn Alert Fires', desc: 'Checkout 5xx error budget burn > 14.4x threshold; PagerDuty wakes Primary On-Call.', code: 'http_requests_5xx_ratio > 2%', theme: 'amber' },
      { time: '14:05 UTC (T+3m)', badge: 'TRIAGE & IC', title: 'Incident Declared & Roles Assigned', desc: 'IC opens #inc-2026-1116 channel, posts provisional SEV-1 status, checks recent deploys.', code: 'Release v2.18.4 rolled out at 13:59', theme: 'sky' },
      { time: '14:11 UTC (T+9m)', badge: 'MITIGATION', title: 'Rollback Executed First (Before Root-Cause)', desc: 'Ops Lead rolls Argo CD back to v2.18.3 with abort guardrails; DB connection pool drains.', code: 'kubectl rollout undo deploy/checkout', theme: 'teal' },
      { time: '14:24 UTC (T+22m)', badge: 'RECOVERY', title: 'SLIs Green & Evidence Preserved', desc: 'Error rate back < 0.01%; logs, traces, and heap profiles archived for blameless review.', code: 'Customer impact ended (22m)', theme: 'teal' }
    ]
  },

  'tree-alertmanager': {
    group: 'SRE & Incident Response',
    label: 'Hierarchy Tree: Alertmanager Routing & Inhibition',
    mode: 'tree',
    kicker: '// ALERT ROUTING HIERARCHY',
    badge: 'alertmanager.yml',
    title: 'Symptom-First Alertmanager Routing & Team Escalation Tree',
    fileName: 'alertmanager-routing-tree',
    root: { title: 'Root Route (group_by: [cluster, service])', sub: 'group_wait: 30s · group_interval: 5m · Inhibition suppresses downstream noise', code: 'receiver: default-slack' },
    branches: [
      {
        title: 'severity="critical"',
        sub: 'SLO Fast-Burn Pages',
        theme: 'teal',
        leaves: ['team="payments" -> PagerDuty Payments', 'team="platform" -> PagerDuty Infra']
      },
      {
        title: 'severity="warning"',
        sub: 'Ticket / Daytime Review',
        theme: 'sky',
        leaves: ['Disk > 80% in 24h -> Jira Auto-Ticket', 'Slow Burn -> #sre-triage Slack']
      },
      {
        title: 'alertname="Watchdog"',
        sub: 'Dead-Man Switch Canary',
        theme: 'slate',
        leaves: ['Continuous Ping -> Healthchecks / Cronitor', 'Pages if pipeline goes silent > 5m']
      }
    ]
  },

  'decision-mitigation': {
    group: 'SRE & Incident Response',
    label: 'Decision Flowchart: Rollback vs. Failover vs. Fix-Forward',
    mode: 'decision',
    kicker: '// INCIDENT COMMAND DECISION TREE',
    badge: 'Minimize MTTR',
    title: 'Choosing Rollback, Traffic Failover, or Fix-Forward Under Pressure',
    fileName: 'rollback-failover-fixforward',
    trigger: 'Active Customer-Impacting Outage Confirmed on Production SLI',
    checks: [
      {
        condition: '1. Did a code, config, or flag change ship shortly before onset?',
        yesTitle: 'Revert / Disable Feature Flag',
        yesDesc: 'Fastest, lowest-risk path. Revert image tag or flip kill-switch flag immediately.',
        yesCode: 'Target MTTR: < 5 minutes',
        noLabel: 'No Recent Deploy -> Check Infra'
      },
      {
        condition: '2. Is failure isolated to a single AZ, Region, or Upstream Dependency?',
        yesTitle: 'Drain / Failover Traffic',
        yesDesc: 'Shift weight away from unhealthy AZ/region or trip circuit-breaker to degraded mode.',
        yesCode: 'Verify healthy capacity first!',
        noLabel: 'Global State / Schema Issue'
      },
      {
        condition: '3. Did an irreversible DB migration or expired cert cause the break?',
        yesTitle: 'Controlled Fix-Forward',
        yesDesc: 'Peer-review minimal hotfix in incident channel, test in staging, deploy with abort criteria.',
        yesCode: 'Two-person eyes required',
        noLabel: 'Escalate to DB / Security SME'
      }
    ],
    finalBox: 'Verify SLI recovery for 15 minutes before downgrading incident severity'
  },

  // =========================================================================
  // 6. SECURITY & NETWORKING
  // =========================================================================
  'sequence-oauth': {
    group: 'Security & Networking',
    label: 'Sequence Flow: OAuth 2.0 Authorization Code + PKCE',
    mode: 'sequence',
    kicker: '// AUTHENTICATION PROTOCOL',
    badge: 'RFC 7636 (PKCE)',
    title: 'OAuth 2.0 Authorization Code Flow with PKCE',
    fileName: 'oauth2-pkce-sequence',
    actors: ['User / SPA Client', 'Authorization Server', 'Resource API'],
    messages: [
      { from: 0, to: 1, label: '1. GET /authorize + code_challenge (S256)', code: 'Client keeps code_verifier secret in memory', dashed: false },
      { from: 1, to: 0, label: '2. User Authenticates -> 302 Redirect + code', code: 'Short-lived single-use auth code', dashed: true },
      { from: 0, to: 1, label: '3. POST /oauth/token (code + code_verifier)', code: 'IdP hashes verifier == challenge', dashed: false },
      { from: 1, to: 0, label: '4. Returns Access JWT + Refresh Token', code: 'Prevents auth-code interception', dashed: true },
      { from: 0, to: 2, label: '5. GET /v1/profile (Bearer <JWT>)', code: 'API validates JWKS signature & aud/exp', dashed: false },
      { from: 2, to: 0, label: '6. 200 OK JSON Payload', code: 'Zero-trust authorized response', dashed: true }
    ]
  },

  'sequence-dns-tls': {
    group: 'Security & Networking',
    label: 'Sequence Flow: DNS Lookup + TLS 1.3 Handshake',
    mode: 'sequence',
    kicker: '// NETWORKING FUNDAMENTALS',
    badge: '1-RTT TLS 1.3',
    title: 'What Happens Before Your First HTTPS Byte Arrives',
    fileName: 'dns-tls13-handshake-sequence',
    actors: ['Linux Client', 'Recursive DNS', 'Edge Server (:443)'],
    messages: [
      { from: 0, to: 1, label: '1. UDP/53 Query: A blog.mahinraza.online?', code: 'Checks /etc/hosts & local stub cache first', dashed: false },
      { from: 1, to: 0, label: '2. DNS Answer: 104.21.x.x (TTL 300s)', code: 'Resolved via Root -> .online -> Cloudflare NS', dashed: true },
      { from: 0, to: 2, label: '3. TCP SYN -> SYN-ACK -> ACK', code: '1st Network Round-Trip (TCP 3-way)', dashed: false },
      { from: 0, to: 2, label: '4. TLS 1.3 ClientHello + KeyShare (X25519)', code: 'SNI: blog.mahinraza.online + ALPN h2', dashed: false },
      { from: 2, to: 0, label: '5. ServerHello + Cert + Finished', code: 'Ephemeral forward-secret session keys ready', dashed: true },
      { from: 0, to: 2, label: '6. Encrypted HTTP/2 GET /posts/...', code: 'Application data flows over AEAD cipher', dashed: false }
    ]
  },

  'boundary-zerotrust': {
    group: 'Security & Networking',
    label: 'Trust Zones: Edge WAF -> DMZ -> mTLS Service Mesh',
    mode: 'boundary',
    kicker: '// ZERO-TRUST SECURITY BOUNDARIES',
    badge: 'Defense in Depth',
    title: 'Validating Identity & Trace Context Across Trust Boundaries',
    fileName: 'zero-trust-network-zones',
    outerLabel: 'Enterprise Cloud Perimeter · Default-Deny NetworkPolicies & Strict Header Sanitization',
    zones: [
      {
        name: '1. Untrusted Internet Edge',
        cidr: 'Cloudflare WAF / DDoS Shield',
        theme: 'amber',
        items: 'Rate Limiting & Bot Mitigation\nTLS 1.3 Termination\nDrop spoofed X-Forwarded-* headers'
      },
      {
        name: '2. Ingress & Auth Boundary',
        cidr: 'API Gateway / Envoy',
        theme: 'sky',
        items: 'Validate OIDC JWT & Scopes\nSanitize external trace/baggage\nEnforce request body limits'
      },
      {
        name: '3. Internal mTLS Workload Mesh',
        cidr: 'SPIFFE / Istio / Cilium',
        theme: 'teal',
        items: 'Workload-to-workload mTLS certs\nL7 AuthorizationPolicies\nKMS-encrypted RDS / Vault secrets'
      }
    ],
    bottomNote: 'Never trust external headers (`x-user-id`, `baggage`) inside Zone 3 unless cryptographically verified at Zone 2'
  },

  // =========================================================================
  // 7. MULTI-TOPIC DIFFERENTIAL COMPARISONS (2, 3, 4, 5+ TOPICS)
  // =========================================================================
  'diff-4-vagrant-net': {
    group: 'Multi-Topic Differentials (2, 3, 4+ Topics)',
    label: '4-Topic Differential: Vagrant Networking Modes (NAT vs Port vs Private vs Bridge)',
    mode: 'differential',
    diffStyle: 'matrix',
    kicker: '// 4-WAY NETWORKING DIFFERENTIAL',
    badge: 'config.vm.network',
    title: 'Vagrant Networking Modes Compared: NAT vs. Port Forward vs. Private vs. Bridge',
    fileName: 'vagrant-4-networking-modes',
    criteriaHeader: 'Dimension',
    topics: [
      { name: '1. Default NAT', badge: 'eth0 (Built-in)', theme: 'slate', verdict: 'Outbound internet & vagrant ssh' },
      { name: '2. Forwarded Port', badge: '127.0.0.1:8080->80', theme: 'sky', verdict: 'Testing single web/API port' },
      { name: '3. Private Network', badge: '192.168.56.x', theme: 'teal', verdict: 'Multi-VM K8s & DB clusters' },
      { name: '4. Public Bridge', badge: 'LAN DHCP / Static', theme: 'amber', verdict: 'LAN device & mobile testing' }
    ],
    rows: [
      { label: 'Guest -> Internet', values: ['[+] Yes (via Host NAT)', '[+] Yes (via eth0 NAT)', '[+] Yes (via eth0 NAT)', '[+] Direct via Router'] },
      { label: 'Host -> Guest Access', values: ['[-] SSH port 2222 only', '[+] Mapped ports only', '[+] All ports via IP', '[+] All ports via LAN IP'] },
      { label: 'VM <-> VM East-West', values: ['[-] Isolated per VM', '[-] Isolated per VM', '[+] Full subnet routing', '[+] Full LAN routing'] },
      { label: 'Wi-Fi / LAN Security', values: ['[+] Unreachable on LAN', '[+] Safe with 127.0.0.1', '[+] Host-only isolated', '[!] Exposed to LAN peers'] },
      { label: 'Vagrantfile Config', values: ['Zero config required', 'forwarded_port', 'private_network', 'public_network'] }
    ]
  },

  'diff-4-vagrant-providers': {
    group: 'Multi-Topic Differentials (2, 3, 4+ Topics)',
    label: '4-Topic Differential: VirtualBox vs. KVM (libvirt) vs. VMware vs. Docker',
    mode: 'differential',
    diffStyle: 'cards',
    kicker: '// PROVIDER SELECTION MATRIX',
    badge: '--provider <name>',
    title: 'Comparing 4 Vagrant Providers: VirtualBox vs. KVM vs. VMware vs. Docker',
    fileName: 'vagrant-4-providers-comparison',
    criteriaHeader: 'Capability',
    topics: [
      { name: 'VirtualBox', badge: 'Cross-Platform', theme: 'sky', verdict: 'Default starter labs on Win/Linux' },
      { name: 'Linux KVM (libvirt)', badge: 'Type 1 Native', theme: 'teal', verdict: 'Fastest multi-node Linux K8s labs' },
      { name: 'VMware Desktop', badge: 'Workstation/Fusion', theme: 'violet', verdict: 'Best for Apple Silicon ARM64 Macs' },
      { name: 'Docker Provider', badge: 'OS Containers', theme: 'slate', verdict: 'Ultra-lightweight userspace apps' }
    ],
    rows: [
      { label: 'Isolation Layer', values: ['Type 2 Hosted VMM', '[+] Type 1 Kernel KVM', 'Type 2 Hosted VMM', '[!] Shared Host Kernel'] },
      { label: 'CPU / Disk Speed', values: ['Moderate overhead', '[+] Near-bare-metal', '[+] High I/O throughput', '[+] Native speed'] },
      { label: 'Apple Silicon (M1-M4)', values: ['[!] Beta / Limited', '[-] Linux hosts only', '[+] Full ARM64 support', '[+] Multi-arch OCI'] },
      { label: 'Custom Kernel / kubeadm', values: ['[+] Full Guest Kernel', '[+] Full + Nested Virt', '[+] Full Guest Kernel', '[-] Shares Host Kernel'] }
    ]
  },

  'diff-3-k8s-services': {
    group: 'Multi-Topic Differentials (2, 3, 4+ Topics)',
    label: '3-Topic Differential: Kubernetes ClusterIP vs. NodePort vs. LoadBalancer',
    mode: 'differential',
    diffStyle: 'matrix',
    kicker: '// KUBERNETES NETWORKING',
    badge: 'Service spec.type',
    title: 'Kubernetes Service Types: ClusterIP vs. NodePort vs. LoadBalancer',
    fileName: 'k8s-service-types-differential',
    criteriaHeader: 'Attribute',
    topics: [
      { name: 'ClusterIP', badge: 'Internal Default', theme: 'teal', verdict: 'Internal microservice East-West RPCs' },
      { name: 'NodePort', badge: '30000-32767', theme: 'sky', verdict: 'Bare-metal / Vagrant labs & custom LBs' },
      { name: 'LoadBalancer', badge: 'Cloud NLB / ALB', theme: 'violet', verdict: 'Direct public L4/L7 cloud exposure' }
    ],
    rows: [
      { label: 'Network Scope', values: ['[+] Cluster-internal VIP', '[!] Every Worker Node IP', '[+] Public / Internal Cloud VIP'] },
      { label: 'Port Range', values: ['Any port (80, 5432, etc.)', 'Restricted 30000-32767', 'Standard ports (80, 443)'] },
      { label: 'Cloud Cost', values: ['[+] $0 (iptables / IPVS)', '[+] $0 (host port bind)', '[!] Hourly NLB/ALB charge per Svc'] },
      { label: 'Production Pattern', values: ['Pair with Ingress / Gateway', 'On-prem MetalLB / HAProxy', 'Single Ingress Controller VIP'] }
    ]
  },

  'diff-2-k8s-workloads': {
    group: 'Multi-Topic Differentials (2, 3, 4+ Topics)',
    label: '2-Topic Differential: Kubernetes Deployment vs. StatefulSet',
    mode: 'differential',
    diffStyle: 'matrix',
    kicker: '// KUBERNETES WORKLOAD CONTROLLERS',
    badge: 'Stateless vs Stateful',
    title: 'Kubernetes Deployment vs. StatefulSet: Key Architectural Differences',
    fileName: 'deployment-vs-statefulset',
    criteriaHeader: 'Dimension',
    topics: [
      { name: 'Deployment (Stateless)', badge: 'Interchangeable Pods', theme: 'sky', verdict: 'REST APIs, Web Frontends, Queue Workers' },
      { name: 'StatefulSet (Stateful)', badge: 'Sticky Pod Identity', theme: 'teal', verdict: 'PostgreSQL, Kafka, etcd, Redis Cluster' }
    ],
    rows: [
      { label: 'Pod Naming & DNS', values: ['Random hash (`api-7d9f8-x2k`)', '[+] Ordinal (`db-0`, `db-1.svc`)'] },
      { label: 'Storage Binding', values: ['Shared PVC or ephemeral', '[+] Dedicated `volumeClaimTemplates` per Pod'] },
      { label: 'Rollout & Scaling', values: ['[+] Parallel surge / fast scale', 'Ordered sequential (`0 -> 1 -> 2`)'] },
      { label: 'Node Failure Behavior', values: ['Replaces immediately on new node', '[!] Waits safely to prevent split-brain'] }
    ]
  }
};
