// Print every question whose answer leaks into its own text, for a pack id
// substring. `node scripts/leaks.mjs harry` (mirrors content.test.ts rules).
import { createServer } from 'vite';

const needle = (process.argv[2] ?? '').toLowerCase();
const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
const { PACKS } = await server.ssrLoadModule('/src/content/index.ts');
const test = await server.ssrLoadModule('/src/content/leakRules.ts');
for (const p of PACKS) {
  if (needle && !p.id.toLowerCase().includes(needle)) continue;
  const bad = [];
  for (const qs of Object.values(p.letters)) {
    for (const q of qs) if (test.leaks(q, p.locale)) bad.push(`${q.a}  <<  ${q.q}`);
  }
  if (bad.length) console.log(`\n### ${p.id} (${bad.length})\n` + bad.join('\n'));
}
await server.close();
