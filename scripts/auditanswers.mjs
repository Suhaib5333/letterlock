// Robustly extract every answer string from each content pack and flag ones that
// look like clue-restatements / padded answers (the "Ukraine's capital is Kyiv" bug).
import { readdirSync, readFileSync } from 'node:fs';

const dir = 'src/content';
const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'index.ts');

// match  a: '...'  or  a: "..."  (with escaped quotes), capturing the raw literal
const ansRe = /\ba:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;

// real-bug patterns (NOT legit titles): possessive+is, "capital is", "X is Y" sentences,
// padded geographic/descriptor prefixes.
const sentence = /(^|\s)(is|are|was|were)\s/i;
const cluey = /\b(capital is|capital of|the answer|begins with|borders the)\b/i;
const padPrefix = /^(Afrika|Ancient|Famous|Modern|Old|The land of|Land of|City of|Country of|Region of|Easy|Astonishing|Brilliant|Coveted|Global)\s+[A-Z]/;

let total = 0;
for (const f of files) {
  const t = readFileSync(`${dir}/${f}`, 'utf8');
  const flagged = [];
  let m;
  while ((m = ansRe.exec(t))) {
    const raw = m[1];
    const a = raw.slice(1, -1).replace(/\\(.)/g, '$1'); // unescape
    if (sentence.test(a) || cluey.test(a) || padPrefix.test(a)) flagged.push(a);
  }
  if (flagged.length) {
    total += flagged.length;
    console.log(`\n${f}: ${flagged.length}`);
    flagged.forEach((a) => console.log('   • ' + a));
  }
}
console.log(`\n=== TOTAL real-bug-pattern answers: ${total} ===`);
