// Removes every logo entry whose slug is in scripts/badlogos.json (wordmark/acronym
// spoilers found by checklogos.mjs) from the logo pack files.
import { readFileSync, writeFileSync } from 'node:fs';

const bad = new Set(JSON.parse(readFileSync('scripts/badlogos.json', 'utf8')));
const files = ['src/content/logos.ts', 'src/content/logosExtra.ts'];
const slugRe = /q\(\s*(['"]).*?\1\s*,\s*(['"])([A-Za-z0-9.\-]+)\2/;

let totalRemoved = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  let removed = 0;
  const kept = lines.filter((line) => {
    const m = line.match(slugRe);
    if (m && bad.has(m[3])) {
      removed++;
      return false;
    }
    return true;
  });
  writeFileSync(f, kept.join('\n'));
  totalRemoved += removed;
  console.log(`${f}: removed ${removed} spoiler logos`);
}
console.log(`Total removed: ${totalRemoved}`);
