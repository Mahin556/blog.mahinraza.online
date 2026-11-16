#!/usr/bin/env npx tsx

/**
 * Blog Post Update Helper (`npm run update-post`)
 *
 * Stamps `updated: YYYY-MM-DD` on a blog post and lets you choose whether the update
 * should also sync to DEV Community (`dev.to`).
 *
 * Examples:
 *   npm run update-post                                              # Interactive post & DEV sync selector
 *   npm run update-post -- posts/2026-11-17-vagrant-guide            # Interactive DEV sync prompt for a post
 *   npm run update-post -- 2026-11-17-vagrant-guide --devto          # Update post & enable DEV update sync
 *   npm run update-post -- 2026-11-17-vagrant-guide --no-devto       # Update blog only (skip DEV update)
 *   npm run update-post -- 2026-11-17-vagrant-guide --devto --sync-now # Also push update to dev.to immediately
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { clearPostsCache, loadAllPosts, type BlogPost } from '../lib/posts';
import { runPublishDevto } from './publish-devto';

function formatLocalTodayISO(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hasDevtoApiKeyConfigured(): boolean {
  if (process.env.DEVTO_API_KEY?.trim()) return true;
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, 'utf-8');
  return /^DEVTO_API_KEY\s*=\s*\S+/m.test(content);
}

function upsertYamlKey(fmLines: string[], keyPattern: RegExp, newLine: string, insertAfter?: RegExp): string[] {
  const existingIdx = fmLines.findIndex((l) => keyPattern.test(l.trim()));
  if (existingIdx !== -1) {
    const next = [...fmLines];
    next[existingIdx] = newLine;
    return next;
  }

  if (insertAfter) {
    const anchorIdx = fmLines.findIndex((l) => insertAfter.test(l.trim()));
    if (anchorIdx !== -1) {
      const next = [...fmLines];
      next.splice(anchorIdx + 1, 0, newLine);
      return next;
    }
  }

  return [...fmLines, newLine];
}

function applyPostUpdateMetadata(
  filePath: string,
  updatedDateStr: string,
  syncToDevto: boolean
): void {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';

  // Case 1: YAML frontmatter (`--- ... ---`)
  const yamlMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (yamlMatch) {
    const restContent = raw.slice(yamlMatch[0].length);
    let fmLines = yamlMatch[1].split(/\r?\n/);

    fmLines = upsertYamlKey(
      fmLines,
      /^(updated|updatedDate|lastUpdated|lastmod|modified)\s*:/i,
      `updated: ${updatedDateStr}`,
      /^(date|pubDate)\s*:/i
    );

    if (syncToDevto) {
      const hasDraft = fmLines.some((l) => /^devto\s*:\s*draft\b/i.test(l.trim()));
      if (!hasDraft) {
        fmLines = upsertYamlKey(
          fmLines,
          /^(devto|devio|publish_to_devto)\s*:/i,
          'devto: true'
        );
      }
      fmLines = upsertYamlKey(
        fmLines,
        /^(devto_update|devio_update|update_devto|update_devio)\s*:/i,
        'devto_update: true',
        /^(devto|devio|publish_to_devto)\s*:/i
      );
    } else {
      fmLines = upsertYamlKey(
        fmLines,
        /^(devto_update|devio_update|update_devto|update_devio)\s*:/i,
        'devto_update: false',
        /^(devto|devio|publish_to_devto)\s*:/i
      );
    }

    const updatedRaw = `---${newline}${fmLines.join(newline)}${newline}---${newline}${restContent}`;
    fs.writeFileSync(filePath, updatedRaw, 'utf-8');
    return;
  }

  // Case 2: Inline header metadata lines at top (`Author:`, `Tags:`, `DevTo:`, etc.)
  const lines = raw.split(/\r?\n/);
  let lastMetaIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || (i === 0 && trimmed.startsWith('# '))) continue;
    if (
      /^(Author|Tags|Category|Description|Updated|Last\s*Updated|Modified|DevTo|DevIo|PublishToDevTo|DevToUpdate|DevIoUpdate|UpdateDevTo|UpdateDevIo|Hashnode|PublishToHashnode|Comments):\s*/i.test(
        trimmed
      )
    ) {
      lastMetaIdx = i;
      continue;
    }
    break;
  }

  if (lastMetaIdx !== -1) {
    const updatedIdx = lines.findIndex(
      (l, idx) => idx <= lastMetaIdx + 2 && /^(Updated|Last\s*Updated|Modified):\s*/i.test(l.trim())
    );
    if (updatedIdx !== -1) {
      lines[updatedIdx] = `Updated: ${updatedDateStr}`;
    } else {
      lines.splice(lastMetaIdx + 1, 0, `Updated: ${updatedDateStr}`);
      lastMetaIdx++;
    }

    if (syncToDevto) {
      const devtoIdx = lines.findIndex(
        (l, idx) => idx <= lastMetaIdx + 2 && /^(DevTo|DevIo|PublishToDevTo):\s*/i.test(l.trim())
      );
      if (devtoIdx !== -1) {
        if (!/draft/i.test(lines[devtoIdx])) {
          lines[devtoIdx] = 'DevTo: true';
        }
      } else {
        lines.splice(lastMetaIdx + 1, 0, 'DevTo: true');
        lastMetaIdx++;
      }
    }

    const devtoUpdateIdx = lines.findIndex(
      (l, idx) =>
        idx <= lastMetaIdx + 2 &&
        /^(DevToUpdate|DevIoUpdate|UpdateDevTo|UpdateDevIo):\s*/i.test(l.trim())
    );
    const updateLine = `DevToUpdate: ${syncToDevto ? 'true' : 'false'}`;
    if (devtoUpdateIdx !== -1) {
      lines[devtoUpdateIdx] = updateLine;
    } else {
      lines.splice(lastMetaIdx + 1, 0, updateLine);
    }

    fs.writeFileSync(filePath, lines.join(newline), 'utf-8');
    return;
  }

  // Case 3: Plain Markdown file with no YAML frontmatter or inline metadata yet
  const fmBlock = [
    '---',
    `updated: ${updatedDateStr}`,
    ...(syncToDevto ? ['devto: true', 'devto_update: true'] : ['devto_update: false']),
    '---',
    '',
  ].join(newline);

  fs.writeFileSync(filePath, `${fmBlock}${raw.replace(/^\r?\n+/, '')}`, 'utf-8');
}

async function main() {
  const args = process.argv.slice(2);
  let dateArg: string | undefined;
  let syncDevtoFlag: boolean | undefined;
  let syncNowFlag = false;
  let targetArg: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--devto' || arg === '--devio' || arg === '--sync-devto') {
      syncDevtoFlag = true;
    } else if (arg === '--no-devto' || arg === '--no-devio' || arg === '--no-sync-devto') {
      syncDevtoFlag = false;
    } else if (arg === '--sync-now' || arg === '--publish-now') {
      syncNowFlag = true;
    } else if (arg === '--date' && args[i + 1]) {
      dateArg = args[++i];
    } else if (arg.startsWith('--date=')) {
      dateArg = arg.slice('--date='.length);
    } else if (!arg.startsWith('--') && !targetArg) {
      targetArg = arg;
    }
  }

  const updatedDateStr = dateArg?.trim() || formatLocalTodayISO();
  if (Number.isNaN(new Date(`${updatedDateStr}T00:00:00.000Z`).getTime()) && Number.isNaN(new Date(updatedDateStr).getTime())) {
    console.error(`Invalid --date "${updatedDateStr}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  const allPosts = loadAllPosts();
  if (allPosts.length === 0) {
    console.error('No blog posts found in posts/.');
    process.exit(1);
  }

  const rl =
    !targetArg || syncDevtoFlag === undefined
      ? readline.createInterface({ input, output })
      : null;

  try {
    let selectedPost: BlogPost | undefined;

    if (targetArg) {
      const norm = targetArg.replace(/\\/g, '/').replace(/\/+$/, '');
      selectedPost = allPosts.find(
        (p) =>
          p.slug === norm ||
          p.sourcePath === norm ||
          p.sourcePath.startsWith(`${norm}/`) ||
          norm.endsWith(`/${p.slug}`) ||
          norm.endsWith(`/${p.slug}.md`)
      );
      if (!selectedPost) {
        console.error(`No blog post matched "${targetArg}".`);
        process.exit(1);
      }
    } else if (rl) {
      console.log('\nAvailable blog posts:\n');
      allPosts.forEach((p, idx) => {
        const devBadge = p.devto ? ' [dev.to]' : '';
        console.log(`  ${idx + 1}. ${p.title} (${p.slug})${devBadge}`);
      });
      const answer = (
        await rl.question(`\nSelect post to update [1-${allPosts.length} or slug]: `)
      ).trim();

      const asNum = Number(answer);
      if (Number.isInteger(asNum) && asNum >= 1 && asNum <= allPosts.length) {
        selectedPost = allPosts[asNum - 1];
      } else {
        selectedPost = allPosts.find(
          (p) => p.slug === answer || p.sourcePath.includes(answer)
        );
      }

      if (!selectedPost) {
        console.error(`Could not find post matching "${answer}".`);
        process.exit(1);
      }
    }

    if (!selectedPost) {
      process.exit(1);
    }

    let shouldUpdateDevto = syncDevtoFlag;
    if (shouldUpdateDevto === undefined && rl) {
      const defaultYes = selectedPost.devto && selectedPost.devtoUpdate;
      const promptHint = defaultYes ? '[Y/n]' : '[y/N]';
      const ans = (
        await rl.question(
          `Also update/sync "${selectedPost.title}" on DEV (dev.to)? ${promptHint}: `
        )
      )
        .trim()
        .toLowerCase();

      if (!ans) {
        shouldUpdateDevto = defaultYes;
      } else {
        shouldUpdateDevto = ans === 'y' || ans === 'yes';
      }
    }

    const finalSyncDevto = Boolean(shouldUpdateDevto);
    const absFilePath = path.join(process.cwd(), selectedPost.sourcePath);

    applyPostUpdateMetadata(absFilePath, updatedDateStr, finalSyncDevto);

    console.log(`\nUpdated post metadata in ${selectedPost.sourcePath}:`);
    console.log(`  • updated:      ${updatedDateStr}`);
    console.log(
      `  • dev.to sync:  ${
        finalSyncDevto
          ? 'ENABLED (devto: true, devto_update: true)'
          : 'BLOG ONLY (devto_update: false — existing dev.to post will not be overwritten)'
      }`
    );

    if (finalSyncDevto && !syncNowFlag && rl && hasDevtoApiKeyConfigured()) {
      const nowAns = (
        await rl.question(
          '\nDEVTO_API_KEY detected. Sync update to dev.to right now? (Choose N to let GitHub Actions sync on git push) [y/N]: '
        )
      )
        .trim()
        .toLowerCase();
      syncNowFlag = nowAns === 'y' || nowAns === 'yes';
    }

    if (finalSyncDevto && syncNowFlag) {
      console.log('\nSyncing updated post to DEV Community (dev.to)...\n');
      clearPostsCache();
      await runPublishDevto([selectedPost.sourcePath, '--update']);
    } else {
      console.log('\nNext step: commit & push your changes (`git add posts/ && git commit && git push`).');
    }
  } finally {
    rl?.close();
  }
}

main().catch((err) => {
  console.error('Error updating post:', err);
  process.exit(1);
});
