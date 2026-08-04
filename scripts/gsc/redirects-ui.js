/**
 * redirects-ui.js
 *
 * Local web UI for reviewing and editing redirects in astro.config.mjs.
 * Checks each target URL live, highlights broken ones, lets you edit inline.
 *
 * Usage:
 *   node scripts/gsc/redirects-ui.js
 *   → open http://localhost:4399
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { loadRedirectsMap } from './lib/redirects-map.js';

const PORT = 4399;
const CONFIG_PATH = path.resolve(process.cwd(), 'astro.config.mjs');

// ── HTTP check ────────────────────────────────────────────────────────────────

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });
    req.on('error', (e) => resolve({ status: 'ERR', ok: false, err: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', ok: false }); });
  });
}

// ── Write changes back to astro.config.mjs ────────────────────────────────────

function applyChanges(changes) {
  // changes: { from: '/old', to: '/new' }[]
  let config = fs.readFileSync(CONFIG_PATH, 'utf8');
  const applied = [];
  const failed  = [];

  for (const { from, to } of changes) {
    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(['"]${escapedFrom}['"]\\s*:\\s*)['"][^'"]+['"]`, 'g');
    const next = config.replace(re, (_, prefix) => `${prefix}'${to}'`);
    if (next !== config) {
      config = next;
      applied.push({ from, to });
    } else {
      failed.push(from);
    }
  }

  if (applied.length > 0) fs.writeFileSync(CONFIG_PATH, config);
  return { applied, failed };
}

// ── Read body ─────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

// ── HTML ──────────────────────────────────────────────────────────────────────

function buildPage(rows) {
  const rowsHtml = rows.map((r) => {
    const statusClass = r.ok ? 'ok' : 'broken';
    const statusLabel = r.ok ? `✅ ${r.status}` : `❌ ${r.status}`;
    return `
    <tr class="${statusClass}" data-from="${esc(r.from)}">
      <td class="from"><code>${esc(r.from)}</code></td>
      <td class="arrow">→</td>
      <td class="to">
        <input type="text" value="${esc(r.to)}" data-original="${esc(r.to)}" spellcheck="false" />
      </td>
      <td class="status">${statusLabel}</td>
      <td class="actions">
        <button class="btn-recheck" title="Re-check target">↺</button>
      </td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirect Review — Medidraken</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      background: #0f1117;
      color: #e2e8f0;
      padding: 32px 24px;
    }

    h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; color: #f8fafc; }
    .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .btn {
      padding: 7px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity .15s;
    }
    .btn:hover { opacity: .85; }
    .btn-save   { background: #2563eb; color: #fff; }
    .btn-reload { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
    .btn-recheck { background: none; border: none; color: #64748b; font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
    .btn-recheck:hover { color: #e2e8f0; background: #1e293b; }

    .filter-row { display: flex; gap: 8px; align-items: center; }
    label { color: #64748b; font-size: 13px; }
    input[type=checkbox] { accent-color: #2563eb; }

    #toast {
      position: fixed; top: 20px; right: 20px;
      background: #16a34a; color: #fff;
      padding: 10px 18px; border-radius: 8px;
      font-size: 13px; font-weight: 500;
      opacity: 0; transition: opacity .3s;
      pointer-events: none; z-index: 999;
    }
    #toast.error { background: #dc2626; }
    #toast.show  { opacity: 1; }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      text-align: left;
      padding: 8px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #475569;
      border-bottom: 1px solid #1e293b;
    }

    tbody tr {
      border-bottom: 1px solid #1a2030;
      transition: background .1s;
    }
    tbody tr:hover { background: #141921; }
    tbody tr.broken { background: #1f0f0f; }
    tbody tr.broken:hover { background: #261212; }
    tbody tr.dirty td.from code { color: #fbbf24; }

    td { padding: 9px 12px; vertical-align: middle; }
    td.from code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; color: #94a3b8; }
    td.arrow { color: #334155; width: 24px; padding: 0; text-align: center; }
    td.to { width: 42%; }
    td.status { white-space: nowrap; font-size: 13px; width: 90px; }
    td.actions { width: 40px; text-align: center; }

    input[type=text] {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 5px;
      color: #e2e8f0;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      padding: 5px 9px;
      outline: none;
      transition: border-color .15s;
    }
    input[type=text]:focus { border-color: #2563eb; }
    input[type=text].changed { border-color: #f59e0b; background: #1c1a0f; }

    .checking { color: #64748b; font-size: 13px; }
    .badge-broken { display: inline-block; background: #7f1d1d; color: #fca5a5; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; }
    .badge-ok     { display: inline-block; background: #14532d; color: #86efac; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; }

    #summary { font-size: 13px; color: #64748b; }
    #summary .count-broken { color: #f87171; font-weight: 600; }
    #summary .count-ok     { color: #4ade80; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Redirect Review</h1>
  <p class="subtitle">astro.config.mjs · medidraken.com · <span id="summary">checking…</span></p>

  <div class="toolbar">
    <button class="btn btn-save" id="btn-save">Save changes</button>
    <button class="btn btn-reload" id="btn-reload">↺ Re-check all</button>
    <div class="filter-row">
      <input type="checkbox" id="filter-broken" />
      <label for="filter-broken">Show broken only</label>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Old path (from)</th>
        <th></th>
        <th>Target (to)</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="tbody">
      ${rowsHtml}
    </tbody>
  </table>

  <div id="toast"></div>

  <script>
    // ── State ──────────────────────────────────────────────────────────────
    const tbody  = document.getElementById('tbody');
    const btnSave   = document.getElementById('btn-save');
    const btnReload = document.getElementById('btn-reload');
    const filterBroken = document.getElementById('filter-broken');
    const toast  = document.getElementById('toast');

    function showToast(msg, isError = false) {
      toast.textContent = msg;
      toast.className = 'show' + (isError ? ' error' : '');
      setTimeout(() => toast.className = '', 2800);
    }

    // ── Mark changed inputs ───────────────────────────────────────────────
    tbody.addEventListener('input', (e) => {
      if (e.target.tagName !== 'INPUT') return;
      const input = e.target;
      const changed = input.value.trim() !== input.dataset.original;
      input.classList.toggle('changed', changed);
      input.closest('tr').classList.toggle('dirty', changed);
      updateSummary();
    });

    // ── Per-row re-check ──────────────────────────────────────────────────
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-recheck');
      if (!btn) return;
      const tr  = btn.closest('tr');
      const input = tr.querySelector('input');
      const url = input.value.trim();
      const statusTd = tr.querySelector('.status');
      statusTd.innerHTML = '<span class="checking">checking…</span>';
      btn.disabled = true;
      try {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        tr.classList.toggle('broken', !data.ok);
        tr.classList.toggle('ok',      data.ok);
        statusTd.innerHTML = data.ok
          ? '<span class="badge-ok">✅ ' + data.status + '</span>'
          : '<span class="badge-broken">❌ ' + data.status + '</span>';
      } catch {
        statusTd.textContent = '❌ ERR';
      }
      btn.disabled = false;
      updateSummary();
    });

    // ── Re-check all ──────────────────────────────────────────────────────
    btnReload.addEventListener('click', async () => {
      const rows = [...tbody.querySelectorAll('tr')];
      btnReload.disabled = true;
      btnReload.textContent = 'Checking…';
      await Promise.all(rows.map(async (tr) => {
        const input = tr.querySelector('input');
        const url = input.value.trim();
        const statusTd = tr.querySelector('.status');
        statusTd.innerHTML = '<span class="checking">…</span>';
        try {
          const res = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          const data = await res.json();
          tr.classList.toggle('broken', !data.ok);
          tr.classList.toggle('ok',      data.ok);
          statusTd.innerHTML = data.ok
            ? '<span class="badge-ok">✅ ' + data.status + '</span>'
            : '<span class="badge-broken">❌ ' + data.status + '</span>';
        } catch {
          statusTd.textContent = '❌ ERR';
        }
      }));
      btnReload.disabled = false;
      btnReload.textContent = '↺ Re-check all';
      updateSummary();
    });

    // ── Save ──────────────────────────────────────────────────────────────
    btnSave.addEventListener('click', async () => {
      const changes = [];
      for (const tr of tbody.querySelectorAll('tr')) {
        const input = tr.querySelector('input');
        if (input.value.trim() !== input.dataset.original) {
          changes.push({ from: tr.dataset.from, to: input.value.trim() });
        }
      }
      if (changes.length === 0) { showToast('Nothing changed.'); return; }

      btnSave.disabled = true;
      btnSave.textContent = 'Saving…';
      try {
        const res  = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes }),
        });
        const data = await res.json();
        if (data.ok) {
          // Update originals so dirty state resets
          for (const tr of tbody.querySelectorAll('tr')) {
            const input = tr.querySelector('input');
            input.dataset.original = input.value.trim();
            input.classList.remove('changed');
            tr.classList.remove('dirty');
          }
          showToast(\`Saved \${data.applied} change(s) to astro.config.mjs\`);
        } else {
          showToast('Save failed: ' + (data.error ?? 'unknown error'), true);
        }
      } catch (e) {
        showToast('Save failed: ' + e.message, true);
      }
      btnSave.disabled = false;
      btnSave.textContent = 'Save changes';
      updateSummary();
    });

    // ── Filter: broken only ───────────────────────────────────────────────
    filterBroken.addEventListener('change', () => {
      for (const tr of tbody.querySelectorAll('tr')) {
        const hide = filterBroken.checked && tr.classList.contains('ok');
        tr.style.display = hide ? 'none' : '';
      }
    });

    // ── Summary ───────────────────────────────────────────────────────────
    function updateSummary() {
      const rows   = [...tbody.querySelectorAll('tr')];
      const broken = rows.filter(r => r.classList.contains('broken')).length;
      const ok     = rows.filter(r => r.classList.contains('ok')).length;
      const dirty  = rows.filter(r => r.classList.contains('dirty')).length;
      const el = document.getElementById('summary');
      const parts = [];
      if (ok)     parts.push(\`<span class="count-ok">\${ok} OK</span>\`);
      if (broken) parts.push(\`<span class="count-broken">\${broken} broken</span>\`);
      if (dirty)  parts.push(\`\${dirty} unsaved change(s)\`);
      el.innerHTML = parts.join(' · ') || 'all clear';
    }

    updateSummary();
  </script>
</body>
</html>`;
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Server ────────────────────────────────────────────────────────────────────

async function buildRows() {
  const map = loadRedirectsMap();
  const entries = Object.entries(map);
  const results = await Promise.all(
    entries.map(async ([from, to]) => {
      const check = await checkUrl(to);
      return { from, to, ...check };
    })
  );
  return results;
}

const server = http.createServer(async (req, res) => {
  // ── API: check a single URL ──
  if (req.method === 'POST' && req.url === '/api/check') {
    const body = JSON.parse(await readBody(req));
    const result = await checkUrl(body.url);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── API: save changes ──
  if (req.method === 'POST' && req.url === '/api/save') {
    const body = JSON.parse(await readBody(req));
    try {
      const { applied, failed } = applyChanges(body.changes);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, applied: applied.length, failed }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── Main page ──
  if (req.method === 'GET' && req.url === '/') {
    const rows = await buildRows();
    const html = buildPage(rows);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Redirect Review UI`);
  console.log(`  → http://localhost:${PORT}\n`);
  console.log(`  Ctrl+C to stop\n`);
});
