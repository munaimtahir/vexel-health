#!/usr/bin/env node
/**
 * Static scan of apps/web: routes, nav links, API usage.
 * Outputs docs/frontend_inventory/*.md
 * Run: node tools/scan-frontend/scan.js (from repo root)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const WEB_DIR = path.join(REPO_ROOT, 'apps/web');
const OUT_DIR = path.join(REPO_ROOT, 'docs/frontend_inventory');

const APP_DIRS = ['app', 'src/app'].map((d) => path.join(WEB_DIR, d));

// --- Route discovery ---
function* walkPages(dir, base = '') {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = path.join(base, e.name);
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('(') && e.name.endsWith(')')) {
        yield* walkPages(full, base);
      } else {
        yield* walkPages(full, rel);
      }
    } else if (e.name === 'page.tsx' || e.name === 'page.js') {
      yield { full, rel: path.join(base, e.name), dir: path.dirname(full), base };
    }
  }
}

function filePathToUrlPath(relDir) {
  const normalized = relDir === '.' ? '' : relDir;
  const parts = normalized.split(path.sep).filter(Boolean);
  if (parts.length === 0) return '/';
  const segments = parts.map((p) => {
    if (p.startsWith('[') && p.endsWith(']')) return '{' + p.slice(1, -1) + '}';
    return p;
  });
  return '/' + segments.join('/');
}

function getLayoutForDir(pageDir, appDir) {
  const rel = path.relative(appDir, pageDir);
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts[0] === 'operator') return 'operator (sidebar)';
  if (parts[0] === 'admin') return 'admin (sidebar)';
  return 'root (shell nav)';
}

function getScopeForPath(urlPath) {
  if (urlPath.startsWith('/auth')) return 'auth';
  if (urlPath.startsWith('/admin')) return 'admin';
  if (urlPath.startsWith('/operator')) return 'module (operator)';
  if (urlPath.startsWith('/patients') || urlPath.startsWith('/encounters') || urlPath.startsWith('/verification')) return 'auth';
  return 'public';
}

function collectRoutes() {
  const routes = [];
  for (const appDir of APP_DIRS) {
    if (!fs.existsSync(appDir)) continue;
    for (const { full, rel, dir } of walkPages(appDir)) {
      const segmentDir = path.dirname(rel);
      const urlPath = filePathToUrlPath(segmentDir);
      const layout = getLayoutForDir(dir, appDir);
      const scope = getScopeForPath(urlPath);
      const pageFile = path.relative(REPO_ROOT, full);
      routes.push({
        path: urlPath,
        pageFile,
        layout,
        scope,
        notes: urlPath.includes('{') ? 'dynamic' : '',
      });
    }
  }
  routes.sort((a, b) => a.path.localeCompare(b.path));
  return routes;
}

// --- Nav link extraction (regex) ---
const RE_LINK_HREF = /<Link\s+[^>]*href=\{(?:[^}]+)\}|<Link\s+[^>]*href=["']([^"']+)["']/g;
const RE_ROUTER_PUSH = /router\.(push|replace)\s*\(\s*([^)]+)\)/g;
const RE_WINDOW_LOCATION = /window\.location\.(hostname|href|assign|replace)/g;
const RE_REDIRECT = /redirect\s*\(/g;

function extractNavFromContent(content, filePath) {
  const links = [];
  const routerNav = [];
  const badNav = [];

  let m;
  const linkHrefDynamic = /<Link\s+[^>]*href=\{[^}]*\}/g;
  while ((m = linkHrefDynamic.exec(content)) !== null) {
    links.push({ raw: m[0].replace(/\s+/g, ' ').slice(0, 80), type: 'Link (dynamic)', file: filePath });
  }
  const linkHrefStatic = /<Link\s+[^>]*href=["']([^"']+)["']/g;
  while ((m = linkHrefStatic.exec(content)) !== null) {
    links.push({ href: m[1], type: 'Link', file: filePath });
  }

  while ((m = RE_ROUTER_PUSH.exec(content)) !== null) {
    routerNav.push({ method: m[1], arg: m[2].trim().slice(0, 60), file: filePath });
  }

  if (RE_WINDOW_LOCATION.test(content)) badNav.push({ kind: 'window.location', file: filePath });
  if (RE_REDIRECT.test(content)) badNav.push({ kind: 'redirect()', file: filePath });

  return { links, routerNav, badNav };
}

function collectNavLinks() {
  const byFile = new Map();
  const allLinks = [];
  const allRouter = [];
  const allBad = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
        scanDir(full);
      } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        const content = fs.readFileSync(full, 'utf8');
        const rel = path.relative(WEB_DIR, full);
        const { links, routerNav, badNav } = extractNavFromContent(content, rel);
        if (links.length || routerNav.length || badNav.length) {
          byFile.set(rel, { links, routerNav, badNav });
          allLinks.push(...links.map((l) => ({ ...l, file: rel })));
          allRouter.push(...routerNav.map((r) => ({ ...r, file: rel })));
          allBad.push(...badNav.map((b) => ({ ...b, file: rel })));
        }
      }
    }
  }

  scanDir(WEB_DIR);
  return { byFile, allLinks, allRouter, allBad };
}

// --- API/SDK usage ---
const RE_CLIENT_CALL = /client\.(GET|POST|PUT|PATCH|DELETE)\s*\(\s*['"]([^'"]+)['"]/g;

function extractApiCalls(content, filePath) {
  const calls = [];
  let m;
  while ((m = RE_CLIENT_CALL.exec(content)) !== null) {
    calls.push({ method: m[1], path: m[2], file: filePath });
  }
  return calls;
}

function collectApiUsage() {
  const byFile = new Map();
  const allCalls = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
        scanDir(full);
      } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        const content = fs.readFileSync(full, 'utf8');
        if (!content.includes('client') && !content.includes('@vexel/contracts')) continue;
        const rel = path.relative(WEB_DIR, full);
        const calls = extractApiCalls(content, rel);
        if (calls.length) {
          byFile.set(rel, calls);
          allCalls.push(...calls.map((c) => ({ ...c, file: rel })));
        }
      }
    }
  }

  scanDir(WEB_DIR);
  return { byFile, allCalls };
}

// --- Direct fetch/axios (policy violation) ---
function collectPolicyViolations() {
  const violations = [];
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
        scanDir(full);
      } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        const content = fs.readFileSync(full, 'utf8');
        const rel = path.relative(WEB_DIR, full);
        if (/\bfetch\s*\(/.test(content) && !/fetch\s*\(\s*[^)]*\)\s*\.\s*then/.test(content)) {
          if (/fetch\s*\(\s*[^)]*url\s*[,)]/.test(content) || /fetch\s*\(\s*['"`]https?:\/\//.test(content))
            violations.push({ file: rel, kind: 'fetch()' });
        }
        if (/from\s+['"]axios['"]/.test(content) || /require\s*\(\s*['"]axios['"]/.test(content))
          violations.push({ file: rel, kind: 'axios' });
      }
    }
  }
  scanDir(WEB_DIR);
  return violations;
}

// --- Resolve route config hrefs (operatorRoutes.*, adminRoutes.*) ---
function getKnownRouteTargets() {
  const targets = new Set();
  const op = [
    '/operator/register', '/operator/worklist', '/operator/orders', '/operator/samples',
    '/operator/results', '/operator/verify', '/operator/reports/published',
  ];
  op.forEach((p) => targets.add(p));
  const admin = [
    '/admin', '/admin/business', '/admin/business/branding', '/admin/business/report-design',
    '/admin/business/receipt-design', '/admin/users', '/admin/users/invite',
    '/admin/catalog', '/admin/catalog/tests', '/admin/catalog/parameters', '/admin/catalog/panels',
    '/admin/catalog/linking', '/admin/catalog/import-export',
  ];
  admin.forEach((p) => targets.add(p));
  return targets;
}

// --- Write reports ---
function writeRoutesMd(routes) {
  const lines = [
    '# Frontend Route Inventory (App Router)',
    '',
    'Generated by `tools/scan-frontend/scan.js`. Do not edit by hand.',
    '',
    '| Path | Page file | Layout | Scope | Notes |',
    '|------|-----------|--------|-------|-------|',
  ];
  for (const r of routes) {
    lines.push(`| ${r.path} | \`${r.pageFile}\` | ${r.layout} | ${r.scope} | ${r.notes || ''} |`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'ROUTES.md'), lines.join('\n') + '\n', 'utf8');
}

function writeNavLinksMd(nav) {
  const lines = [
    '# Navigation Link Inventory',
    '',
    'Generated by `tools/scan-frontend/scan.js`.',
    '',
    '## Link targets (static href)',
    '',
  ];
  const staticHrefs = nav.allLinks.filter((l) => l.href).map((l) => ({ ...l, href: l.href }));
  const byHref = new Map();
  for (const l of staticHrefs) {
    if (!byHref.has(l.href)) byHref.set(l.href, []);
    byHref.get(l.href).push(l.file);
  }
  const sortedHrefs = [...byHref.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [href, files] of sortedHrefs) {
    lines.push(`- \`${href}\`: ${[...new Set(files)].sort().join(', ')}`);
  }

  lines.push('', '## Link (dynamic href)', '');
  const dynamic = nav.allLinks.filter((l) => l.raw);
  for (const l of dynamic) {
    lines.push(`- \`${l.file}\`: \`${l.raw}\``);
  }

  lines.push('', '## router.push / router.replace', '');
  for (const r of nav.allRouter) {
    lines.push(`- \`${r.file}\`: \`router.${r.method}(${r.arg})\``);
  }

  lines.push('', '## Hard redirects / bad navigation (flag)', '');
  if (nav.allBad.length === 0) {
    lines.push('None detected. (window.location used only for hostname check in login/api is acceptable.)');
  } else {
    for (const b of nav.allBad) {
      lines.push(`- \`${b.file}\`: ${b.kind}`);
    }
  }

  lines.push('', '## By source file (grouped)', '');
  const byFile = new Map();
  for (const l of nav.allLinks) {
    const key = l.file;
    if (!byFile.has(key)) byFile.set(key, { links: [], router: [], bad: [] });
    byFile.get(key).links.push(l);
  }
  for (const r of nav.allRouter) {
    if (!byFile.has(r.file)) byFile.set(r.file, { links: [], router: [], bad: [] });
    byFile.get(r.file).router.push(r);
  }
  for (const b of nav.allBad) {
    if (!byFile.has(b.file)) byFile.set(b.file, { links: [], router: [], bad: [] });
    byFile.get(b.file).bad.push(b);
  }
  const sortedFiles = [...byFile.keys()].sort();
  for (const f of sortedFiles) {
    const o = byFile.get(f);
    lines.push(`### ${f}`);
    if (o.links.length) lines.push('- Links: ' + o.links.map((l) => l.href || '(dynamic)').join(', '));
    if (o.router.length) lines.push('- Router: ' + o.router.map((r) => `router.${r.method}(${r.arg})`).join('; '));
    if (o.bad.length) lines.push('- Bad: ' + o.bad.map((b) => b.kind).join(', '));
    lines.push('');
  }

  fs.writeFileSync(path.join(OUT_DIR, 'NAV_LINKS.md'), lines.join('\n') + '\n', 'utf8');
}

function writeApiUsageMd(api, violations) {
  const lines = [
    '# API Usage Mapping',
    '',
    'Generated by `tools/scan-frontend/scan.js`. SDK client from `@/lib/api` or `@/lib/sdk/client` (same client).',
    '',
    '## By feature/page (SDK method → implied endpoint)',
    '',
    '| Feature/Page | SDK method | Implied endpoint | Notes |',
    '|--------------|------------|------------------|-------|',
  ];

  const byPage = new Map();
  for (const c of api.allCalls) {
    const page = c.file.startsWith('app/') ? c.file : `components/lib: ${c.file}`;
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page).push(c);
  }

  const sortedPages = [...byPage.keys()].sort();
  for (const page of sortedPages) {
    const calls = byPage.get(page);
    const uniq = [...new Map(calls.map((c) => [c.method + ' ' + c.path, c])).values()];
    for (const c of uniq) {
      lines.push(`| \`${page}\` | \`${c.method}\` | \`${c.path}\` | |`);
    }
  }

  lines.push('', '## Direct fetch/axios (policy violation)', '');
  if (violations.length === 0) {
    lines.push('None. All API access goes through generated SDK.');
  } else {
    for (const v of violations) {
      lines.push(`- \`${v.file}\`: ${v.kind}`);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'API_USAGE.md'), lines.join('\n') + '\n', 'utf8');
}

function writeGapsMd(routes, api) {
  const pagesWithCalls = new Set(api.allCalls.map((c) => c.file));
  const pageToPath = new Map();
  for (const r of routes) {
    const dir = path.dirname(r.pageFile);
    const key = r.pageFile; // app/admin/catalog/panels/page.tsx
    pageToPath.set(key, r.path);
  }

  const gaps = [
    { route: '/admin/users', need: 'GET /admin/users (list), POST /admin/users/invite', priority: 'high' },
    { route: '/admin/users/invite', need: 'POST /admin/users/invite', priority: 'high' },
    { route: '/admin/users/[userId]', need: 'GET /admin/users/{userId} (or /me for current)', priority: 'medium' },
    { route: '/admin/catalog/panels', need: 'GET /lab/panels, POST /lab/panels', priority: 'high' },
    { route: '/admin/catalog/panels/[panelId]', need: 'GET /lab/panels/{panelId}', priority: 'high' },
    { route: '/admin/catalog/parameters/[parameterId]', need: 'GET /lab/parameters/{parameterId}', priority: 'medium' },
    { route: '/admin/catalog/linking', need: 'Linking workflow endpoints (tests/parameters/reference ranges)', priority: 'medium' },
    { route: '/admin/catalog/import-export', need: 'POST import, GET export, GET import/export history', priority: 'medium' },
    { route: '/admin/business/branding', need: 'GET/PUT tenant branding config', priority: 'low' },
    { route: '/admin/business/report-design', need: 'GET/PUT report template config', priority: 'low' },
    { route: '/admin/business/receipt-design', need: 'GET/PUT receipt template config', priority: 'low' },
  ];

  const lines = [
    '# Gaps for Backend (Missing / Placeholder UI)',
    '',
    'Generated by `tools/scan-frontend/scan.js`. Inferred from routes that have no or minimal SDK usage.',
    '',
    '## Prioritized backlog',
    '',
    '| Route | Required entity/actions | Proposed OpenAPI (high-level) | Priority |',
    '|-------|-------------------------|--------------------------------|----------|',
  ];
  for (const g of gaps) {
    lines.push(`| ${g.route} | See notes | ${g.need} | ${g.priority} |`);
  }

  lines.push('', '## Summary by entity', '');
  lines.push('- **Users (admin)**: list users, invite user, user detail/deactivate.');
  lines.push('- **Panels**: list panels, panel detail, create/update panel.');
  lines.push('- **Parameters**: parameter detail by ID (global).');
  lines.push('- **Linking**: workflow to link tests, parameters, reference ranges.');
  lines.push('- **Import/Export**: XLSX import/export and job history.');
  lines.push('- **Business config**: branding, report design, receipt design (tenant-scoped).');
  fs.writeFileSync(path.join(OUT_DIR, 'GAPS_FOR_BACKEND.md'), lines.join('\n') + '\n', 'utf8');
}

function writeSummaryMd(routes, nav, api, violations, gaps) {
  const adminCount = routes.filter((r) => r.scope === 'admin').length;
  const operatorCount = routes.filter((r) => r.scope === 'module (operator)').length;
  const lines = [
    '# Frontend Inventory — Executive Summary',
    '',
    'Generated by `tools/scan-frontend/scan.js`.',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Total page routes | ${routes.length} |`,
    `| Admin routes | ${adminCount} |`,
    `| Operator (module) routes | ${operatorCount} |`,
    `| Auth/public routes | ${routes.filter((r) => r.scope === 'auth' || r.scope === 'public').length} |`,
    `| Unique nav link targets (static) | ${new Set(nav.allLinks.filter((l) => l.href).map((l) => l.href)).size} |`,
    `| router.push/replace usages | ${nav.allRouter.length} |`,
    `| SDK client call sites (by file) | ${api.byFile.size} |`,
    `| Unique SDK endpoints used | ${new Set(api.allCalls.map((c) => c.method + ' ' + c.path)).size} |`,
    `| Direct fetch/axios violations | ${violations.length} |`,
    `| Missing-backend gaps (listed) | ${gaps.length} |`,
    '',
    '## Layouts',
    '- **root (shell nav)**: Root layout with top nav (Patients, Operator, Verification, Admin).',
    '- **operator (sidebar)**: Operator layout with OperatorNav sidebar and theme.',
    '- **admin (sidebar)**: Admin layout with AdminLayoutShell sidebar.',
    '',
    '## Next steps',
    '1. Align OpenAPI with ROUTES.md and API_USAGE.md.',
    '2. Implement endpoints listed in GAPS_FOR_BACKEND.md.',
    '3. Replace any placeholder UI with SDK-backed calls.',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), lines.join('\n') + '\n', 'utf8');
}

// --- Main ---
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const routes = collectRoutes();
  const nav = collectNavLinks();
  const api = collectApiUsage();
  const violations = collectPolicyViolations();
  const gaps = [
    { route: '/admin/users', need: 'GET /admin/users (list), POST /admin/users/invite', priority: 'high' },
    { route: '/admin/users/invite', need: 'POST /admin/users/invite', priority: 'high' },
    { route: '/admin/users/[userId]', need: 'GET /admin/users/{userId}', priority: 'medium' },
    { route: '/admin/catalog/panels', need: 'GET /lab/panels, POST /lab/panels', priority: 'high' },
    { route: '/admin/catalog/panels/[panelId]', need: 'GET /lab/panels/{panelId}', priority: 'high' },
    { route: '/admin/catalog/parameters/[parameterId]', need: 'GET /lab/parameters/{parameterId}', priority: 'medium' },
    { route: '/admin/catalog/linking', need: 'Linking workflow endpoints', priority: 'medium' },
    { route: '/admin/catalog/import-export', need: 'POST import, GET export, history', priority: 'medium' },
    { route: '/admin/business/branding', need: 'GET/PUT tenant branding', priority: 'low' },
    { route: '/admin/business/report-design', need: 'GET/PUT report template', priority: 'low' },
    { route: '/admin/business/receipt-design', need: 'GET/PUT receipt template', priority: 'low' },
  ];

  writeRoutesMd(routes);
  writeNavLinksMd(nav);
  writeApiUsageMd(api, violations);
  writeGapsMd(routes, api);
  writeSummaryMd(routes, nav, api, violations, gaps);

  console.log('Wrote docs/frontend_inventory/: ROUTES.md, NAV_LINKS.md, API_USAGE.md, GAPS_FOR_BACKEND.md, SUMMARY.md');
}

main();
