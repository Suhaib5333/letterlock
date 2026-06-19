import { PACKS } from '../src/content/index.ts';
import fs from 'node:fs';
import path from 'node:path';

const TMP = 'C:/Users/Asus/AppData/Local/Temp';
const summary = [];

for (const p of PACKS) {
  if (p.hideBoardLetters) continue;
  const skinny = {};
  for (const [L, qs] of Object.entries(p.letters)) {
    if (qs.length < 5) skinny[L] = qs.length;
  }
  if (Object.keys(skinny).length === 0) continue;
  // Dump existing answers per letter (across all letters, not just skinny — so
  // the agent can dedupe globally and pick fresh answers).
  const all = {};
  for (const [L, qs] of Object.entries(p.letters)) {
    all[L] = qs.map(q => q.a);
  }
  const out = { id: p.id, name: p.name, difficulty: p.difficulty, skinny, allAnswers: all };
  const fname = `${TMP}/gap-${p.id}.json`;
  fs.writeFileSync(fname, JSON.stringify(out, null, 2));
  summary.push({ id: p.id, name: p.name, skinny, file: fname });
}

console.log(JSON.stringify(summary, null, 2));
