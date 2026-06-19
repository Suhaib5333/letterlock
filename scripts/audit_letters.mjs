import { PACKS } from '../src/content/index.ts';

const report = [];
for (const p of PACKS) {
  if (p.hideBoardLetters) continue; // letterless packs serve from whole pool
  const skinny = [];
  for (const [L, qs] of Object.entries(p.letters)) {
    if (qs.length < 5) skinny.push(`${L}:${qs.length}`);
  }
  if (skinny.length) report.push({ id: p.id, name: p.name, skinny });
}
console.log(`packs with <5/letter: ${report.length}`);
for (const r of report) console.log(`${r.id} | ${r.name} | ${r.skinny.join(' ')}`);
