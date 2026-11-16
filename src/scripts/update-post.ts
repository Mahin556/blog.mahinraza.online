#!/usr/bin/env npx tsx

/**
 * Blog Post Last-Updated Helper (`npm run update-post`)
 *
 * Stamps `updated: YYYY-MM-DD` on a blog post in `posts/`.
 *
 * Examples:
 *   npm run update-post                                              # Interactive post selector
 *   npm run update-post -- posts/2026-11-17-vagrant-guide            # Stamp today's date on a post
 *   npm run update-post -- 2026-11-17-vagrant-guide --date 2026-11-20
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadAllPosts, type BlogPost } from '../lib/posts';

function formatLocalTodayISO(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function upsertYamlKey(
  fmLines: string[],
  keyPattern: RegExp,
  newLine: string,
  insertAfter?: RegExp
): string[] {
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

function applyPostUpdateDate(filePath: string, updatedDateStr: string): void {
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

    const updatedRaw = `---${newline}${fmLines.join(newline)}${newline}---${newline}${restContent}`;
    fs.writeFileSync(filePath, updatedRaw, 'utf-8');
    return;
  }

  // Case 2: Inline header metadata lines at top (`Author:`, `Tags:`, etc.)
  const lines = raw.split(/\r?\n/);
  let lastMetaIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || (i === 0 && trimmed.startsWith('# '))) continue;
    if (
      /^(Author|Tags|Category|Description|Updated|Last\s*Updated|Modified|Comments):\s*/i.test(
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
      (l, idx) =>
        idx <= lastMetaIdx + 2 && /^(Updated|Last\s*Updated|Modified):\s*/i.test(l.trim())
    );
    if (updatedIdx !== -1) {
      lines[updatedIdx] = `Updated: ${updatedDateStr}`;
    } else {
      lines.splice(lastMetaIdx + 1, 0, `Updated: ${updatedDateStr}`);
    }

    fs.writeFileSync(filePath, lines.join(newline), 'utf-8');
    return;
  }

  // Case 3: Plain Markdown file with no YAML frontmatter or inline metadata yet
  const fmBlock = ['---', `updated: ${updatedDateStr}`, '---', ''].join(newline);
  fs.writeFileSync(filePath, `${fmBlock}${raw.replace(/^\r?\n+/, '')}`, 'utf-8');
}

async function main() {
  const args = process.argv.slice(2);
  let dateArg: string | undefined;
  let targetArg: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--date' && args[i + 1]) {
      dateArg = args[++i];
    } else if (arg.startsWith('--date=')) {
      dateArg = arg.slice('--date='.length);
    } else if (!arg.startsWith('--') && !targetArg) {
      targetArg = arg;
    }
  }

  const updatedDateStr = dateArg?.trim() || formatLocalTodayISO();
  if (
    Number.isNaN(new Date(`${updatedDateStr}T00:00:00.000Z`).getTime()) &&
    Number.isNaN(new Date(updatedDateStr).getTime())
  ) {
    console.error(`Invalid --date "${updatedDateStr}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  const allPosts = loadAllPosts();
  if (allPosts.length === 0) {
    console.error('No blog posts found in posts/.');
    process.exit(1);
  }

  const rl = !targetArg ? readline.createInterface({ input, output }) : null;

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
        console.log(`  ${idx + 1}. ${p.title} (${p.slug})`);
      });
      const answer = (
        await rl.question(`\nSelect post to mark as updated [1-${allPosts.length} or slug]: `)
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

    const absFilePath = path.join(process.cwd(), selectedPost.sourcePath);
    applyPostUpdateDate(absFilePath, updatedDateStr);

    console.log(`\nUpdated post metadata in ${selectedPost.sourcePath}:`);
    console.log(`  • updated: ${updatedDateStr}`);
    console.log('\nNext step: commit & push your changes (`git add posts/ && git commit && git push`).');
  } finally {
    rl?.close();
  }
}

main().catch((err) => {
  console.error('Error updating post:', err);
  process.exit(1);
});
