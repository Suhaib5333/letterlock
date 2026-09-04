// Renders docs/launch-plan/index.html (the tabbed launch plan) to a shareable A4 PDF.
// Usage: node docs/launch-plan/pdf.mjs [out.pdf]   (default: docs/launch-plan/Letterlock-Launch-Plan.pdf)
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const S = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(S, 'Letterlock-Launch-Plan.pdf');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
await p.goto(pathToFileURL(path.join(S, 'index.html')).href);
await p.addStyleTag({ content: `
  :root{color-scheme:light}
  html,body{background:#fff !important}
  body{font-size:12.5px;orphans:3;widows:3}
  .wrap{max-width:none;padding:0}
  .tabs{display:none !important}
  [role=tabpanel]{display:block !important}
  [role=tabpanel] + [role=tabpanel]{margin-top:34px;padding-top:26px;border-top:2px solid var(--line-strong)}
  .panel-title{font-size:24px;margin-top:0;break-after:avoid}
  h2{font-size:18px;margin:22px 0 10px;break-after:avoid}
  h3{break-after:avoid}
  .panel-sub, h2 + p, .panel-title + p{break-after:avoid}
  .panel-title, h2{break-inside:avoid}
  #p-decisions, #p-copyright, #p-review, #p-purchases, #p-mobiletv, #p-backend{break-before:page;margin-top:0;padding-top:0;border-top:0}
  .flow, .tablewrap, .rail, .total{break-before:avoid} footer{display:none}
  #p-decisions .tablewrap{break-inside:auto}
  .lede{font-size:14px}
  details.phase summary .arrow{display:none}
  details.phase summary{cursor:default}
  details.phase{break-inside:avoid}
  .rail{break-inside:avoid}
  .rail a{color:var(--ink-2)}
  .tablewrap{overflow:visible;break-inside:avoid}
  table{min-width:0;font-size:11.5px}
  th,td{padding:7px 9px}
  tr,.card,ol.tl li,.flow div,.total div,.callout{break-inside:avoid}
  .flow,.total,.grid2,ul{break-inside:avoid}
  thead{display:table-header-group}
  .total .big{font-size:19px}
  footer{margin-top:24px}
  a{text-decoration:none;color:inherit}
`});
await p.evaluate(() => {
  document.documentElement.setAttribute('data-theme','light');
  document.querySelectorAll('[role=tabpanel]').forEach(el => el.hidden = false);
  document.querySelectorAll('details').forEach(d => d.open = true);
  const lede = document.querySelector('.lede'); if (lede) lede.textContent = 'The plain-words version of the launch plan for the team. Canonical source: LAUNCH_PLAN.md in the repo.';
  document.querySelectorAll('.panel-sub, ol.tl li, p, td').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/ Pick a tab\./g,'.').replace(/the "([^"]+)" tab/g,'the "$1" section').replace(/Click a phase to open it\./,'');
  });
});
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
await p.pdf({ path: OUT, format: 'A4', printBackground: true,
  margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
  displayHeaderFooter: true, headerTemplate: '<div></div>',
  footerTemplate: '<div style="width:100%;font-size:8.5px;color:#737b99;font-family:sans-serif;padding:0 14mm;display:flex;justify-content:space-between"><span>Letterlock · Store launch plan · 5 Sep 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
});
await b.close(); console.log('pdf ok');
