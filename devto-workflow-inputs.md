# DEV (`dev.to`) GitHub Workflow Inputs Explained

This guide explains every setting inside the `workflow_dispatch` block of [`.github/workflows/publish-devto.yml`](./.github/workflows/publish-devto.yml).

---

## 1. What `workflow_dispatch` and `inputs` Mean

```yaml
workflow_dispatch:
  inputs:
```

- **`workflow_dispatch`:** Enables manual triggering in GitHub. It adds a **"Run workflow"** button under your repository's **Actions → Publish Opted-In Posts to DEV (dev.to)** tab so you can run the sync anytime from the GitHub website without making a new `git push`.
- **`inputs`:** Defines the form controls (checkboxes and text boxes) shown in the popup menu when you click **Run workflow**.

### Common Properties Inside Every Input

Each option (`dry_run`, `update_existing`, `force_update`, `post_path`) uses four standard GitHub Actions fields:

| Property | Meaning |
| :--- | :--- |
| **`description`** | The helper text shown next to the input field in the GitHub Actions UI. |
| **`required`** | `false` means you do not have to fill it in manually; GitHub will use the `default` value. |
| **`default`** | The initial value pre-filled when you open the **Run workflow** dialog. |
| **`type`** | Controls the UI input type: `boolean` renders a **checkbox** (`true` / `false`), and `string` renders a **text box**. |

---

## 2. Meaning of Each Option

### 1) `dry_run`
```yaml
dry_run:
  description: 'Preview opted-in posts without publishing to dev.to'
  required: false
  default: false
  type: boolean
```
- **What it does:** Runs the script in safe **preview mode** (`--dry-run`).
- **When `false` (default / unchecked):** Actually publishes and updates your opted-in articles on `dev.to`.
- **When `true` (checked):** Does **not** create or edit anything on `dev.to`. It only prints a summary in the GitHub Action logs showing which articles *would* be synced, their tags, cover image URL, and canonical URL.
- **When to use it:** Check this box first whenever you want to verify everything looks right before publishing live.

---

### 2) `update_existing`
```yaml
update_existing:
  description: 'Also update articles that already exist on dev.to'
  required: false
  default: true
  type: boolean
```
- **What it does:** Controls whether the workflow is allowed to update articles that have **already been published** on `dev.to` in the past.
- **When `true` (default / checked):**
  - Brand-new `devto: true` posts are **created** on `dev.to`.
  - Existing `dev.to` posts whose Markdown/title/tags changed are **updated** on `dev.to` *(unless that specific post has `devto_update: false` in its frontmatter)*.
- **When `false` (unchecked):** Passes `--no-update` to the script. Only **brand-new** articles are published; any article that already exists on `dev.to` is skipped completely.
- **When to use it:** Uncheck this if you edited several old blog posts on your website and want to publish a new post without updating any older posts on `dev.to`.

---

### 3) `force_update`
```yaml
force_update:
  description: 'Force update on dev.to (overrides devto_update: false and unchanged check)'
  required: false
  default: false
  type: boolean
```
- **What it does:** Passes `--force` to override all skip checks and push the article to `dev.to` unconditionally.
- **When `false` (default / unchecked):** Normal smart mode:
  1. Respects `devto_update: false` in frontmatter (won't overwrite locked posts).
  2. Skips API calls if the article on `dev.to` is already identical (`[=] Unchanged`).
- **When `true` (checked):** Forces an API update even if:
  1. The post has `devto_update: false` in frontmatter, **or**
  2. The Markdown body didn't change (for example, you only replaced `social-media.png` and want `dev.to` to refresh the cover image), **or**
  3. You targeted a single post via `post_path` that didn't have `devto: true` set yet.
- **When to use it:** Use this when you want to force-refresh a post on `dev.to` right away regardless of frontmatter locks or unchanged text.

---

### 4) `post_path`
```yaml
post_path:
  description: 'Optional single post path or slug (e.g. posts/2026-11-13-my-post.md)'
  required: false
  default: ''
  type: string
```
- **What it does:** Filters the run to **one specific blog post** instead of scanning all posts.
- **When empty `''` (default):** Checks every post inside `posts/` and syncs all posts that have `devto: true`.
- **When filled in:** Syncs **only** the matching post. You can type any of these formats:
  - Folder path: `posts/2026-11-17-vagrant-guide`
  - Full file path: `posts/2026-11-17-vagrant-guide/README.md`
  - Single file path: `posts/2026-11-15-eks-pod-autoscaling.md`
  - Just the slug: `2026-11-17-vagrant-guide`

---

## 3. Quick Cheat Sheet: Which Combination Should I Use?

| What You Want to Do | `dry_run` | `update_existing` | `force_update` | `post_path` |
| :--- | :---: | :---: | :---: | :--- |
| **Normal sync of all `devto: true` posts** | `false` | `true` | `false` | *(leave empty)* |
| **Test/preview without posting to `dev.to`** | `true` | `true` | `false` | *(empty or slug)* |
| **Publish ONLY new posts (never update old ones)** | `false` | `false` | `false` | *(leave empty)* |
| **Sync/update just ONE edited post** | `false` | `true` | `false` | `2026-11-17-vagrant-guide` |
| **Force-overwrite ONE post on `dev.to` (even if `devto_update: false` or only cover image changed)** | `false` | `true` | `true` | `2026-11-17-vagrant-guide` |
