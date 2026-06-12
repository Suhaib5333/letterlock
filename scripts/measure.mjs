import { chromium } from '@playwright/test';
const b = await chromium.launch();
const vp = { width: Number(process.env.W||375), height: Number(process.env.H||667) };
const ctx = await b.newContext({ viewport: vp });
const p = await ctx.newPage();
await p.goto('http://localhost:4173'); await p.evaluate(()=>localStorage.clear()); await p.goto('http://localhost:4173');
if (process.env.PACK) { await p.getByTestId('pack-'+process.env.PACK).click(); }
await p.getByTestId('play-button').click();
if (process.env.PACK) await p.getByTestId('mode-single').click();
await p.getByTestId('start-match').click();
await p.waitForSelector('[data-testid="game-screen"]');
await p.locator('.ll-hex.claimable').first().click();
await p.waitForSelector('[data-testid="question-card"]');
await p.waitForTimeout(300);
const m = await p.evaluate(() => {
  const vis = (s) => { const e = document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {bot:Math.round(r.bot??r.bottom), top:Math.round(r.top), visible: r.bottom<=window.innerHeight+1 && r.top>=-1}; };
  const board=document.querySelector('.ll-board');
  return {
    innerH: window.innerHeight,
    boardH: board?Math.round(board.getBoundingClientRect().height):null,
    reveal: vis('[data-testid="reveal-answer"]') || vis('[data-testid="charade-qr"]'),
    skip: vis('[data-testid="skip-question"]'),
    hostpad: vis('[data-testid="host-pad"]'),
    qcardScrollOverflow: (()=>{const e=document.querySelector('.qcard-scroll');return e?e.scrollHeight-e.clientHeight:null;})(),
  };
});
console.log(`vp ${vp.width}x${vp.height} pack=${process.env.PACK||'GK'}`, JSON.stringify(m));
await b.close();
