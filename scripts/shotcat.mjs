import { chromium } from '@playwright/test';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch();
for (const vp of [{ n: 'desktop', w: 1440, h: 900 }, { n: 'phone', w: 390, h: 844 }]) {
  const c = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await c.newPage();
  await p.goto('http://localhost:4173');
  await sleep(400);
  await p.screenshot({ path: `verify-shots/home-${vp.n}.png` });
  await p.getByTestId('open-categories').click();
  await sleep(500);
  await p.screenshot({ path: `verify-shots/catmenu-${vp.n}.png` });
  await p.getByTestId('category-search').fill('movie');
  await sleep(300);
  await p.screenshot({ path: `verify-shots/catmenu-search-${vp.n}.png` });
  await c.close();
}
await b.close();
console.log('done');
