// Delete every question whose answer leaks into its own text, from the given
// pack FILES, but only while the pack stays at 200+ questions.
// `node scripts/dropleaks.mjs src/content/olympics.ts src/content/pets.ts`
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const files = process.argv.slice(2);
const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
const { leaks } = await server.ssrLoadModule('/src/content/leakRules.ts');

for (const file of files) {
  const mod = await server.ssrLoadModule('/' + file.replace(/\\/g, '/'));
  const pack = Object.values(mod).find((v) => v && typeof v === 'object' && v.letters);
  const all = Object.values(pack.letters).flat();
  // Duplicate answers are always wrong, so they go with the leaks. (Answers in
  // the wrong letter bucket need no fixing: the loader re-buckets on load.)
  const seen = new Set();
  const bad = all.filter((q) => {
    const k = q.a.toLowerCase();
    const dupe = seen.has(k);
    seen.add(k);
    return dupe || leaks(q, pack.locale);
  });
  const left = all.length - bad.length;
  if (left < Number(process.env.MIN ?? 200)) {
    console.log(`${pack.id}: SKIPPED, dropping ${bad.length} of ${all.length} would leave ${left}`);
    continue;
  }
  // Each question is one line in the source file; match on the question text.
  const lines = readFileSync(file, 'utf8').split('\n');
  const texts = new Set(bad.map((q) => q.q));
  const kept = lines.filter((l) => {
    const m = l.match(/\{ q: '((?:[^'\\]|\\.)*)'/);
    if (!m) return true;
    return !texts.has(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  });
  writeFileSync(file, kept.join('\n'));
  console.log(`${pack.id}: dropped ${lines.length - kept.length} of ${bad.length} leaks, ${all.length} -> ${left}`);
}
await server.close();
