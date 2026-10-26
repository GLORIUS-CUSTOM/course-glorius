// Génère un code d'accès pour chaque vendeur et deux codes admin.
// Usage : node scripts/generate-codes.mjs
// Copie le JSON affiché dans le secret GitHub CODES_ACCES, puis remets à chacun son code.
import { readFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';

const cfg = JSON.parse(await readFile(new URL('../config.json', import.meta.url), 'utf8'));
const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // sans 0/o, 1/l/i
const code = () => Array.from({ length: 3 }, () =>
  Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('')).join('-');

const codes = Object.fromEntries(cfg.vendeurs.map((v) => [v.id, code()]));
codes.admin = [code(), code()];

console.log('\nCodes à remettre :');
for (const v of cfg.vendeurs) console.log(`  ${v.nom.padEnd(20)} ${codes[v.id]}`);
console.log(`  ${'Admin 1'.padEnd(20)} ${codes.admin[0]}`);
console.log(`  ${'Admin 2'.padEnd(20)} ${codes.admin[1]}`);
console.log('\nValeur du secret CODES_ACCES :\n');
console.log(JSON.stringify(codes));
