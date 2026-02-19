#!/usr/bin/env node
/**
 * Next.js App Router guardrail script.
 * Fails if apps/web uses Pages Router or forbidden patterns.
 * Run from repo root: node scripts/guardrails/check-next-router.mjs
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const webDir = join(repoRoot, 'apps', 'web');
const pagesDir = join(webDir, 'pages');

const forbiddenPatterns = [
  { pattern: 'next/router', name: 'next/router (use next/navigation)' },
  { pattern: 'getServerSideProps', name: 'getServerSideProps' },
  { pattern: 'getStaticProps', name: 'getStaticProps' },
  { pattern: 'getInitialProps', name: 'getInitialProps' },
  { pattern: 'pages/api', name: 'pages/api (use app/api/**/route.ts)' },
];

let failed = false;

// 1) Fail if apps/web/pages exists (source directory; .next is under apps/web/.next)
if (existsSync(pagesDir)) {
  console.error('[guardrails:next] FORBIDDEN: apps/web/pages directory exists. Use App Router (app/) only.');
  failed = true;
}

// 2) Search apps/web for forbidden patterns (exclude node_modules and .next)
const searchDir = webDir;
for (const { pattern, name } of forbiddenPatterns) {
  try {
    const cmd = `grep -r -l -F '${pattern.replace(/'/g, "'\\''")}' '${searchDir}' --exclude-dir=node_modules --exclude-dir=.next --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mjs' 2>/dev/null || true`;
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const files = out.trim() ? out.trim().split('\n').filter(Boolean) : [];
    if (files.length > 0) {
      console.error(`[guardrails:next] FORBIDDEN: "${name}" found in:`);
      files.forEach((f) => console.error(`  - ${f}`));
      failed = true;
    }
  } catch (e) {
    // grep exits 1 when no match; that's success for us
    if (e.status !== 1) throw e;
  }
}

if (failed) {
  process.exit(1);
}

console.log('[guardrails:next] OK: App Router discipline checks passed.');
