// Build the Addon Product Marketing Guide: combine chapter markdown -> styled HTML -> PDF.
// No external deps: custom markdown->HTML + Chrome DevTools Protocol via Node global WebSocket/fetch.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DIR = __dirname;
const REPO_ROOT = path.resolve(DIR, '..', '..');
const CHAPTER_FILES = [
  '01-intro.md',
  '02-personas.md',
  '03-module-catalog.md',
  '04-module-vendor-warehouse.md',
  '05-module-analytics-agent.md',
  '06-glossary-cheatsheet.md',
];
const CHROME = '/Users/akshaypareek/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';

// ---------- Markdown -> HTML ----------
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const toc = []; // {level, title, id}

function mdToHtml(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    // Heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = slug(text);
      if (level === 1 || level === 2) toc.push({ level, title: text, id });
      const cls = level === 1 ? ' class="chapter"' : '';
      out.push(`<h${level} id="${id}"${cls}>${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }

    // Blockquote (consecutive >)
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // Table (pipe with a separator row next)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]+$/.test(lines[i + 1])) {
      const parseRow = (r) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const header = parseRow(line);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      let t = '<table><thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
      for (const row of rows) {
        t += '<tr>' + row.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
      }
      t += '</tbody></table>';
      out.push(t);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${buf.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${buf.join('')}</ol>`);
      continue;
    }

    // Paragraph (gather until blank or block start)
    const buf = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^---\s*$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]+$/.test(lines[i + 1]))
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---------- Assemble ----------
const combinedMd = CHAPTER_FILES.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n\n');
fs.writeFileSync(path.join(DIR, 'Product-Marketing-Guide.md'), combinedMd);

const body = mdToHtml(combinedMd);

const tocHtml = toc
  .map((t) => `<div class="toc-item toc-l${t.level}"><a href="#${t.id}"><span class="toc-title">${esc(t.title)}</span></a></div>`)
  .join('\n');

const css = `
@page { size: A4; margin: 20mm 18mm 22mm 18mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1f2630; font-size: 10.6pt; line-height: 1.5; margin: 0; }
h1, h2, h3, h4 { color: #14233b; line-height: 1.25; font-weight: 700; }
h1.chapter { font-size: 22pt; page-break-before: always; margin: 0 0 6pt; padding-bottom: 8pt; border-bottom: 3px solid #d4623a; color: #b14a26; }
h2 { font-size: 14.5pt; margin: 18pt 0 6pt; padding-left: 9pt; border-left: 4px solid #d4623a; }
h3 { font-size: 11.6pt; margin: 13pt 0 4pt; color: #2b3a55; }
h4 { font-size: 10.8pt; margin: 10pt 0 3pt; color: #2b3a55; }
p { margin: 5pt 0; }
ul, ol { margin: 5pt 0 7pt; padding-left: 20pt; }
li { margin: 2.5pt 0; }
strong { color: #14233b; }
code { background: #eef1f5; color: #b14a26; padding: 1px 4px; border-radius: 3px; font-size: 9pt; font-family: "SF Mono", Menlo, monospace; }
hr { border: 0; border-top: 1px solid #e2e6ec; margin: 12pt 0; }
a { color: #1f2630; text-decoration: none; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0 12pt; font-size: 9.2pt; }
th { background: #14233b; color: #fff; text-align: left; padding: 6pt 8pt; font-weight: 600; }
td { border: 1px solid #dfe3ea; padding: 5pt 8pt; vertical-align: top; }
tbody tr:nth-child(even) { background: #f6f8fa; }
blockquote { margin: 9pt 0; padding: 7pt 12pt; background: #f3f1ea; border-left: 4px solid #c9a14a; color: #4a4233; font-size: 9.2pt; border-radius: 0 4px 4px 0; }
table, blockquote, ul, ol, h2, h3 { page-break-inside: avoid; }
h2, h3, h4 { page-break-after: avoid; }

/* Cover */
.cover { height: 257mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; text-align: center; }
.cover .kicker { letter-spacing: 4px; text-transform: uppercase; color: #d4623a; font-weight: 700; font-size: 11pt; }
.cover h1.title { font-size: 46pt; margin: 10pt 0 4pt; border: 0; padding: 0; color: #14233b; page-break-before: avoid; }
.cover .sub { font-size: 15pt; color: #46566e; margin: 0 0 26pt; }
.cover .rule { width: 90px; height: 5px; background: #d4623a; margin: 0 auto 26pt; border-radius: 3px; }
.cover .blurb { max-width: 130mm; margin: 0 auto; color: #46566e; font-size: 11pt; line-height: 1.6; }
.cover .meta { margin-top: 34pt; color: #8893a4; font-size: 9.5pt; }

/* TOC */
.toc-page { page-break-after: always; }
.toc-page h1 { font-size: 24pt; border: 0; padding: 0; page-break-before: avoid; color: #14233b; margin-bottom: 4pt; }
.toc-page .toc-rule { width: 70px; height: 4px; background: #d4623a; margin: 0 0 16pt; border-radius: 3px; }
.toc-item { padding: 2pt 0; }
.toc-l1 { font-weight: 700; color: #14233b; font-size: 11pt; margin-top: 7pt; border-bottom: 1px dotted #cfd5de; padding-bottom: 3pt; }
.toc-l2 { padding-left: 16pt; color: #46566e; font-size: 9.8pt; }
.toc-l2 .toc-title:before { content: "› "; color: #d4623a; }
`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Addon — Product Marketing Guide</title>
<style>${css}</style></head>
<body>
<section class="cover">
  <div class="kicker">Product Marketing Guide</div>
  <h1 class="title">Addon</h1>
  <div class="sub">The AI-Native Operating System for Manufacturing</div>
  <div class="rule"></div>
  <div class="blurb">A complete, non-technical guide to understanding, demoing, and selling every module of Addon — from yarn at the gate, through every production floor, into the warehouse, and out to the customer, with AI doing the heavy lifting.</div>
  <div class="meta">Prepared for the Marketing &amp; Sales team · Grounded in the live Addon product</div>
</section>

<section class="toc-page">
  <h1>Table of Contents</h1>
  <div class="toc-rule"></div>
  ${tocHtml}
</section>

<main>
${body}
</main>
</body></html>`;

const htmlPath = path.join(DIR, 'Product-Marketing-Guide.html');
fs.writeFileSync(htmlPath, html);
console.log('Wrote', htmlPath, '(' + toc.filter((t) => t.level === 1).length + ' chapters in TOC)');

// ---------- Print to PDF via CDP ----------
const PDF_OUT = path.join(REPO_ROOT, 'Product-Marketing-Guide.pdf');
const PORT = 9333;

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const proc = spawn(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=/tmp/addon-pdf-${PORT}`,
    'about:blank',
  ], { stdio: 'ignore' });

  // Wait for devtools endpoint
  let ver = null;
  for (let k = 0; k < 50; k++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      ver = await r.json();
      break;
    } catch (e) { await wait(200); }
  }
  if (!ver) { proc.kill(); throw new Error('Chrome devtools endpoint did not come up'); }

  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  const sessionEvents = {};
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result);
    } else if (m.method) {
      const h = sessionEvents[m.method];
      if (h) h(m.params);
    }
  };
  const send = (method, params = {}, sessionId) => {
    const id = ++msgId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify(payload));
    });
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  await send('Page.enable', {}, sessionId);
  const loaded = new Promise((res) => { sessionEvents['Page.loadEventFired'] = res; });
  await send('Page.navigate', { url: 'file://' + htmlPath }, sessionId);
  await loaded;
  await wait(600); // let fonts/layout settle

  const footer = '<div style="font-size:8px; color:#8893a4; width:100%; text-align:center; padding-top:2px;">Addon — Product Marketing Guide &nbsp;·&nbsp; Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
  const header = '<div></div>';

  const result = await send('Page.printToPDF', {
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: header,
    footerTemplate: footer,
    marginTop: 0.6, marginBottom: 0.7, marginLeft: 0.5, marginRight: 0.5,
    paperWidth: 8.27, paperHeight: 11.69,
    preferCSSPageSize: false,
  }, sessionId);

  fs.writeFileSync(PDF_OUT, Buffer.from(result.data, 'base64'));
  ws.close();
  proc.kill();
  console.log('Wrote', PDF_OUT, '(' + (fs.statSync(PDF_OUT).size / 1024).toFixed(0) + ' KB)');
}

main().catch((e) => { console.error('BUILD FAILED:', e); process.exit(1); });
