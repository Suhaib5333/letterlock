// Print pack/question totals per group. `node scripts/packstats.mjs`
import { createServer } from 'vite';

const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
const { PACKS } = await server.ssrLoadModule('/src/content/index.ts');
const count = (p) => Object.values(p.letters).reduce((n, qs) => n + qs.length, 0);
const byGroup = {};
let total = 0;
for (const p of PACKS) {
  const n = count(p);
  total += n;
  (byGroup[p.group] ??= []).push(`${p.id}=${n}`);
}
for (const [g, ids] of Object.entries(byGroup)) console.log(`${g} (${ids.length}): ${ids.join(', ')}`);
console.log(`\nTOTAL: ${PACKS.length} packs, ${total} questions`);
console.log(`UNDER 200: ${PACKS.filter((p) => count(p) < 200).map((p) => `${p.id}=${count(p)}`).join(', ') || 'none'}`);
await server.close();
