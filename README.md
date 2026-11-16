# Mahin Raza — DevOps & Cloud Engineering Blog

Personal engineering blog covering **AWS, Kubernetes, Observability, OpenTelemetry, Prometheus, Incident Response, and Site Reliability Engineering**, built with **Astro + Tailwind CSS** and deployed as a static site on **Cloudflare Pages** at [`https://blog.mahinraza.online`](https://blog.mahinraza.online).

---

## Table of Contents

1. [Built-In Features](#1-built-in-features)
2. [Step-by-Step: How to Create & Publish an Article](#2-step-by-step-how-to-create--publish-an-article)
   - [Format A: Single Markdown File (Fastest)](#format-a-single-markdown-file-fastest)
   - [Format B: Folder Post (With Images / Custom Cover Card)](#format-b-folder-post-with-images--custom-cover-card)
   - [Format C: Existing / Inline-Header Posts](#format-c-existing--inline-header-posts)
3. [Complete Frontmatter & Metadata Reference](#3-complete-frontmatter--metadata-reference)
4. [Writing Content: Markdown Features](#4-writing-content-markdown-features)
5. [Creating `social-media.png` Cover Images (3 Ways)](#5-creating-social-mediapng-cover-images-3-ways)
6. [Categories & Automatic Tag Routing](#6-categories--automatic-tag-routing)
7. [Site Customization (Profile, Comments, Theme)](#7-site-customization-profile-comments-theme)
8. [Project Structure](#8-project-structure)
9. [CLI Commands & Local Development](#9-cli-commands--local-development)
10. [Deploying to Cloudflare Pages](#10-deploying-to-cloudflare-pages)

---

## 1. Built-In Features

- **Zero-Database Git Workflow:** Add a Markdown file in [`posts/`](./posts) and `git push` — everything builds statically.
- **Instant Client-Side Search (`/` or `⌘K` / `Ctrl+K`):** Full-text search modal powered by `/search-index.json` across titles, descriptions, categories, and tags.
- **Automatic Article Enhancements:**
  - Sticky desktop & collapsible mobile **Table of Contents** generated from `##` and `###` headings.
  - **Last Updated Date Tracking:** Supports explicit `updated: YYYY-MM-DD` frontmatter or automatic detection from Git modification commits.
  - **Reading progress bar**, automatic **word-count reading time**, and **scroll-to-top** button.
  - **Syntax-highlighted code blocks** (Shiki `github-dark`) with language labels and one-click **Copy** buttons.
  - **Click-to-zoom image lightbox** and automatic asset syncing for folder posts.
  - **GitHub Discussions Comments (Giscus)** synced automatically with Light/Dark mode.
  - **Related Blogs** recommendations scored by shared tags and category.
- **Full SEO & Feeds:**
  - Canonical URLs, OpenGraph & Twitter/X large-image cards, JSON-LD (`BlogPosting`, `WebSite`, `BreadcrumbList`), `/sitemap-index.xml`, and `/rss.xml`.
- **Self-Serve Social Card Builder:** Offline browser tool ([`tools/social-card-generator.html`](./tools/social-card-generator.html)), blank PNG frame ([`social-media-image-template.png`](./social-media-image-template.png)), and CLI generator.

---

## 2. Step-by-Step: How to Create & Publish an Article

Every article lives inside [`posts/`](./posts) and uses a `YYYY-MM-DD-your-post-slug` naming convention (this sets both the URL `/posts/YYYY-MM-DD-your-post-slug/` and default publish date).

### Format A: Single Markdown File (Fastest)

Use this when your post only has text and code blocks (no local images).

1. Create `posts/2026-11-15-eks-pod-autoscaling.md`:

````markdown
---
title: "How to Tune Kubernetes Pod Autoscaling for Latency-Sensitive Workloads"
description: "Configure HPA custom metrics, startup probes, and scale-down stabilization windows on EKS without latency spikes."
date: 2026-11-15
category: "Kubernetes & Containers"
tags:
  - Kubernetes
  - EKS
  - Autoscaling
  - Prometheus
draft: false
---

Start with a clear problem statement in your opening paragraph.

## Configure Startup Probes Before Scaling Rules

Explain the concept and include commands or configuration snippets:

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30
  periodSeconds: 2
```

### Verify HPA Stabilization Windows

Sub-sections using `###` appear indented in the Table of Contents.
````

---

### Format B: Folder Post (With Images / Custom Cover Card)

Use this whenever you want to include screenshots, architecture diagrams, or a custom `social-media.png` preview card.

1. Create a folder `posts/2026-11-15-eks-pod-autoscaling/` with `README.md` (or `index.md`):

```text
posts/2026-11-15-eks-pod-autoscaling/
├── README.md           # Your Markdown post (with frontmatter)
├── social-media.png    # Optional 1280x720 OpenGraph cover card
├── architecture.svg    # Co-located diagram
└── grafana-panel.png   # Co-located screenshot
```

2. Reference images inside `README.md` using standard relative paths:

```markdown
![EKS Autoscaling Architecture](./architecture.svg)
```

At build time, `npm run sync-assets` automatically copies co-located images to `/post-assets/<slug>/`.

---

### Format C: Existing / Inline-Header Posts

Existing articles in `posts/<folder>/README.md` that use inline metadata lines instead of `---` YAML frontmatter are fully supported without migration:

```markdown
# How to Alert on Queue Backlog Without Paging on Batch Spikes

Author: [Mahin556](https://github.com/Mahin556)

Tags: Monitoring, Queue, Prometheus, SQS

Category: SRE & Incident Response

Description: Alert on queue age, deadlines and stalled progress while distinguishing normal batch accumulation from failed consumers.

Start writing your article body here...
```

All inline metadata lines (`Author:`, `Tags:`, `Category:`, `Description:`, `Updated:`, `Comments:`) at the top of the file are parsed and automatically stripped before rendering HTML.

---

### Publishing Your Article Live

Once your Markdown file is saved, commit and push to GitHub:

```bash
git add posts/
git commit -m "post: add EKS pod autoscaling guide"
git push
```

**What happens automatically after `git push`:**
1. **GitHub CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)):** Validates all posts (checks titles, dates, tags, balanced code fences, and relative image paths) and runs a test Astro build.
2. **Cloudflare Pages:** Builds `npm run build` and deploys the updated static site, RSS feed, search index, and sitemap to `https://blog.mahinraza.online`.

---

## 3. Complete Frontmatter & Metadata Reference

| Field | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | **Yes** (or `# Heading`) | Inferred from slug | Post title displayed on the article, cards, RSS, and OpenGraph tags. |
| `description` | Optional | Auto-extracted from 1st paragraph | 1–2 sentence summary used for SEO meta description and post cards. |
| `date` | Optional | `YYYY-MM-DD` from filename | Publication date (`YYYY-MM-DD`). |
| `updated` | Optional | Auto-detected from Git modification commits | Last updated date (`YYYY-MM-DD`). Set `updated: false` to hide even when modified in Git. |
| `tags` | Optional | `["DevOps"]` | YAML list (`[AWS, EKS]`) or comma-separated string (`AWS, EKS`). |
| `category` | Optional | Auto-inferred from `tags` | Explicit category track name (see [Section 6](#6-categories--automatic-tag-routing)). |
| `author` | Optional | `Mahin556` (`Mahin Raza`) | GitHub username or `[handle](url)` mapped via [`Authors.json`](./Authors.json). |
| `draft` | Optional | `false` | Set `draft: true` to hide a work-in-progress post from all builds and feeds. |
| `image` | Optional | `./social-media.png` or `/og-default.png` | Custom OpenGraph cover image path or URL (`1280x720` recommended). |
| `comments` | Optional | `true` | Set `comments: false` to disable the Giscus comment section on a specific post. |

---

## 4. Writing Content: Markdown Features

- **Section Headings (`##` and `###`):**
  - Use `##` for main sections and `###` for sub-sections (do not repeat `#` H1 inside the body if `title` is already set in frontmatter).
  - Every `##` and `###` gets a clickable `#` anchor link and is added to the **On this page** Table of Contents.
- **Code Blocks & Syntax Highlighting:**
  - Supported languages include `bash`, `shell`, `yaml`, `json`, `hcl` / `terraform`, `promql`, `dockerfile`, `python`, `go`, `typescript`, `javascript`, `rust`, `sql`, `nginx`, `toml`, `ini`, `powershell`, `diff`, `graphql`, `html`, `css`, and `text`.
  - Every fenced code block automatically renders a top header bar with the language name and a **Copy** button.
- **Inline Code:** Wrap commands, flags, or metric names in single backticks (`` `kubectl get pods` ``).
- **Callouts / Blockquotes:** Prefix lines with `> ` to render a highlighted teal callout box.
- **Tables:** Standard GitHub-Flavored Markdown (`| Col A | Col B |`) renders responsive bordered tables.
- **Images:** Clicking any image inside an article opens a full-screen zoom lightbox (`ESC` to close).

---

## 5. Creating `social-media.png` Cover Images (3 Ways)

Custom `social-media.png` images are **optional** — any post without one automatically uses [`public/og-default.png`](./public/og-default.png). When you want a custom card for a folder post, choose any of these 3 methods:

### Method 1: 1-Click Browser Builder (No Install Needed)
1. Double-click [`tools/social-card-generator.html`](./tools/social-card-generator.html) to open it in Chrome or Edge.
2. Enter your **Post Title** (and optional category kicker or font size adjustment).
3. Click **Download `social-media.png`** and place it inside `posts/YYYY-MM-DD-your-slug/social-media.png`.

### Method 2: Blank Template in Canva / Figma / Photoshop
1. Open [`social-media-image-template.png`](./social-media-image-template.png) (`1280 × 720`).
2. Place your title text in the center area using:
   - **Font:** `Poppins Bold` (included locally at [`src/fonts/Poppins-Bold.ttf`](./src/fonts/Poppins-Bold.ttf))
   - **Size:** `52px – 56px`
   - **Color:** `#0F172A` (dark slate) or `#0F766E` (teal accent)

### Method 3: Automated CLI Generator (Requires Node.js)
```bash
# Generate social-media.png for all folder posts that don't have one yet
npm run generate-social-image

# Generate for one specific post folder
npm run generate-social-image -- posts/2026-11-15-eks-pod-autoscaling

# Force-regenerate all folder posts (after editing generate-template.ts)
npm run generate-template
npm run generate-social-image -- --force
```

---

## 6. Categories & Automatic Tag Routing

Every post belongs to **one category**. If you omit `category:` in frontmatter, [`src/lib/posts.ts`](./src/lib/posts.ts) automatically assigns the best category by scoring your `tags` (your **1st tag** carries the highest weight):

| Category Track | URL | Auto-Matched Tag Keywords |
| :--- | :--- | :--- |
| **Kubernetes & Containers** | `/category/kubernetes-containers/` | `kubernetes`, `eks`, `k8s`, `docker`, `container`, `csi driver`, `autoscaling`, `helm`, `pod` |
| **Cloud & Storage** | `/category/cloud-storage/` | `aws`, `efs`, `s3`, `ec2`, `lambda`, `iam`, `cloud`, `storage`, `datasync`, `cloudwatch`, `sqs` |
| **Observability & Tracing** | `/category/observability-tracing/` | `opentelemetry`, `prometheus`, `promql`, `tracing`, `monitoring`, `observability`, `logging`, `sampling` |
| **SRE & Incident Response** | `/category/sre-incident-response/` | `sre`, `incident response`, `sli`, `slo`, `alerting`, `alertmanager`, `chaos engineering`, `on-call` |
| **Security & Networking** | `/category/security-networking/` | `security`, `oauth`, `authentication`, `authorization`, `pkce`, `dns`, `networking`, `tls`, `owasp` |
| **Platform & Systems Engineering** | `/category/platform-systems-engineering/` | `linux`, `performance`, `python`, `async`, `api`, `batch job`, `queue`, `http` *(default fallback)* |

> **Tip:** You can also type any custom `category: "Your New Track"` in frontmatter and a category page will be created for it automatically, or edit `CATEGORY_DEFINITIONS` in [`src/lib/posts.ts`](./src/lib/posts.ts).

---

## 7. Site Customization (Profile, Comments, Theme)

- **Site Title, Domain, Bio, Portfolio & GitHub URLs:** Edit [`src/lib/site.ts`](./src/lib/site.ts) (`SITE_CONFIG`).
- **Author Profiles:** Edit [`Authors.json`](./Authors.json).
- **Light / Dark Theme:** Defaults to **Light Mode** (`#f8fafc` / `#ffffff`) with a persistent Sun/Moon toggle in [`src/components/Header.astro`](./src/components/Header.astro) (`localStorage` key `'theme-preference'`) and zero-FOUC initialization in [`src/layouts/BaseLayout.astro`](./src/layouts/BaseLayout.astro).
- **Blog Comments (Giscus / GitHub Discussions):** Configured in [`src/lib/site.ts`](./src/lib/site.ts) (`SITE_CONFIG.comments`) and [`src/components/Comments.astro`](./src/components/Comments.astro). Enable **Discussions** on `Mahin556/blog.mahinraza.online`, install the [giscus GitHub App](https://github.com/apps/giscus), grab your IDs from [giscus.app](https://giscus.app), and set `PUBLIC_GISCUS_REPO_ID` + `PUBLIC_GISCUS_CATEGORY_ID` in `.env` / Cloudflare Pages environment variables (or directly in `src/lib/site.ts`).
- **Theme Colors & Card/Tag Accents:** Edit [`src/lib/colors.ts`](./src/lib/colors.ts) and [`src/styles/global.css`](./src/styles/global.css).
- **Favicon:** Edit [`public/favicon.svg`](./public/favicon.svg).

---

## 8. Project Structure

```text
.
├── .github/workflows/
│   └── ci.yml                     # Validates posts & tests Astro build on push/PR
├── posts/                         # All blog articles (.md files or <slug>/README.md folders)
├── public/
│   ├── favicon.svg                # Brand terminal icon
│   ├── og-default.png             # Default 1280x720 OpenGraph social image
│   ├── robots.txt                 # Search crawler rules + sitemap pointer
│   ├── _headers                   # Cloudflare Pages security & cache headers
│   └── _redirects                 # Cloudflare Pages URL redirects
├── src/
│   ├── components/                # Header, Footer, FeaturedPost, PostCard, Comments, SearchModal, TOC, TagPills
│   ├── fonts/                     # Poppins-Bold.ttf used by CLI social card generator
│   ├── layouts/BaseLayout.astro   # Global HTML head, SEO meta, OpenGraph, JSON-LD
│   ├── lib/                       # Post loader, Markdown/Shiki renderer, colors, site config
│   ├── pages/                     # Home, /posts/[slug], /categories, /tags, /rss.xml, /search-index.json
│   ├── scripts/                   # validate-blogs, sync-post-assets, generate-social-image, update-post
│   └── styles/global.css          # Typography, code block headers, TOC rail, lightbox styles
├── tools/
│   └── social-card-generator.html # Standalone offline browser tool to build social-media.png cards
├── Authors.json                   # Author metadata registry
├── social-media-image-template.png# Blank 1280x720 card frame
└── astro.config.mjs               # Astro static build & sitemap config
```

---

## 9. CLI Commands & Local Development

Requires **Node.js 20+** when running locally.

```bash
# Install dependencies
npm install

# Start local dev server with hot reload at http://localhost:4321
npm run dev

# Validate all Markdown posts (checks frontmatter, dates, tags, code fences, images)
npm run validate

# Build production static site into ./dist (syncs folder post assets automatically)
npm run build

# Preview production build locally
npm run preview

# Stamp or update `updated: YYYY-MM-DD` on an existing blog post
npm run update-post

# Generate OpenGraph social-media.png cards for folder posts
npm run generate-social-image
```

---

## 10. Deploying to Cloudflare Pages

1. Sign in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the `Mahin556/blog.mahinraza.online` GitHub repository.
3. Configure build settings:
   - **Production branch:** `main` (or `master`)
   - **Framework preset:** `Astro`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable:** `NODE_VERSION` = `20`
4. Click **Save and Deploy**.
5. Under **Custom domains** → **Set up a custom domain**, attach **`blog.mahinraza.online`**.
