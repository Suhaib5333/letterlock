// Validate ONE pack file before it is registered. Reports the question count,
// letter coverage, duplicate answers and every answer that leaks into its own
// question. `node scripts/checkpack.mjs src/content/olympics.ts`
import { createServer } from 'vite';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/checkpack.mjs src/content/<file>.ts');

const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
const mod = await server.ssrLoadModule('/' + file.replace(/\\/g, '/'));
const { leaks } = await server.ssrLoadModule('/src/content/leakRules.ts');
const { bucketLetter } = await server.ssrLoadModule('/src/core/packs.ts');
const pack = Object.values(mod).find((v) => v && typeof v === 'object' && v.letters);
if (!pack) throw new Error('no RawPack export found in ' + file);

const bad = [];
const misfiled = [];
const seen = new Map();
const dupes = [];
let total = 0;
for (const [letter, qs] of Object.entries(pack.letters)) {
  for (const q of qs) {
    total++;
    if (leaks(q, pack.locale)) bad.push(`${q.a}  <<  ${q.q}`);
    if (bucketLetter(q.a, pack.locale) !== letter) misfiled.push(`${q.a} filed under ${letter}`);
    const k = q.a.toLowerCase();
    if (seen.has(k)) dupes.push(q.a);
    seen.set(k, true);
  }
}
const letters = Object.entries(pack.letters).filter(([, qs]) => qs.length > 0);

console.log(`pack:      ${pack.id} (${pack.name})`);
console.log(`questions: ${total}   ${total >= 210 ? 'OK' : 'TOO FEW (need 210+)'}`);
console.log(`letters:   ${letters.length}   ${letters.length >= 20 ? 'OK' : 'TOO FEW (need 20+)'}`);
console.log(`duplicates: ${dupes.length}${dupes.length ? '  ' + dupes.slice(0, 20).join(', ') : ''}`);
console.log(`misfiled:  ${misfiled.length}${misfiled.length ? '  ' + misfiled.slice(0, 20).join(' | ') : ''}`);
console.log(`LEAKS:     ${bad.length}`);
if (bad.length) console.log(bad.join('\n'));
await server.close();
process.exit(bad.length || dupes.length || total < 210 || letters.length < 20 ? 1 : 0);
