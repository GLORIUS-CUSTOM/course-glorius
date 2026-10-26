// Mise à jour hebdomadaire de la course.
// Lit les ventes nettes (avant taxes) par vendeur dans Shopify, calcule les positions,
// écrit data/race.json (public : positions seulement) et data/vault.json (chiffres chiffrés).
//
// Variables d'environnement (secrets GitHub) :
//   SHOPIFY_SHOP           ex. ywj29m-uh.myshopify.com
//   SHOPIFY_CLIENT_ID      identifiant de l'app (Dev Dashboard)
//   SHOPIFY_CLIENT_SECRET  secret de l'app
//   CODES_ACCES            JSON : {"v1":"code", "v2":"code", ..., "admin":["code JF","code Julie-Han"]}
//   SHOPIFY_API_VERSION    optionnel, défaut 2026-10
//
// Mode démo : node scripts/update.mjs --demo  (données inventées, codes demo1..demo5 et demoadmin)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

const subtle = webcrypto.subtle;
const ROOT = new URL('../', import.meta.url);
const cfg = JSON.parse(await readFile(new URL('config.json', ROOT), 'utf8'));
const DEMO = process.argv.includes('--demo');
const ITERATIONS = 250000;

// ---------- dates ----------
const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(s + 'T12:00:00Z');
const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const mondayOf = (s) => { const d = parse(s); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return iso(d); };
const todayToronto = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());

// La saison repart à zéro chaque année à la date « debutAnnuel » (MM-JJ, début de l'exercice).
// DATE_COURSE (AAAA-MM-JJ) permet de simuler une autre date.
const { objectifCompagnie } = cfg.saison;
const debutAnnuel = cfg.saison.debutAnnuel || '11-01';
const refDate = process.env.DATE_COURSE || (DEMO ? '2027-01-25' : todayToronto());
const seasonOf = (d) => {
  const yy = Number(d.slice(0, 4));
  const deb = d >= `${yy}-${debutAnnuel}` ? `${yy}-${debutAnnuel}` : `${yy - 1}-${debutAnnuel}`;
  return { debut: deb, fin: addDays(`${Number(deb.slice(0, 4)) + 1}-${debutAnnuel}`, -1) };
};
let { debut, fin } = seasonOf(refDate);
// Tant que la première semaine de la nouvelle saison n'est pas terminée,
// on garde affiché le résultat final de la saison précédente.
let terminee = false;
if (addDays(mondayOf(debut), 6) >= refDate) { ({ debut, fin } = seasonOf(addDays(debut, -1))); terminee = true; }
// Avant la toute première saison, les animaux attendent à la barrière.
const premiere = cfg.saison.premiereSaison;
if (premiere && debut < premiere) { ({ debut, fin } = seasonOf(premiere)); terminee = false; }
const allWeeks = [];
for (let w = mondayOf(debut); w <= mondayOf(fin); w = addDays(w, 7)) allWeeks.push(w);

// ---------- Shopify ----------
async function shopifyRows(sinceDate, untilDate) {
  const shop = process.env.SHOPIFY_SHOP;
  const version = process.env.SHOPIFY_API_VERSION || '2026-10';
  const tokRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
    }),
  });
  if (!tokRes.ok) throw new Error(`Jeton Shopify refusé (${tokRes.status}) : ${await tokRes.text()}`);
  const { access_token } = await tokRes.json();

  const q = `FROM sales SHOW net_sales, orders GROUP BY staff_member_name TIMESERIES week SINCE ${sinceDate} UNTIL ${untilDate}`;
  const res = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': access_token },
    body: JSON.stringify({
      query: 'query($q: String!) { shopifyqlQuery(query: $q) { parseErrors tableData { columns { name } rows } } }',
      variables: { q },
    }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error('Erreur GraphQL : ' + JSON.stringify(json.errors));
  const r = json.data.shopifyqlQuery;
  if (r.parseErrors?.length) throw new Error('Erreur ShopifyQL : ' + r.parseErrors.join('; '));
  const cols = r.tableData.columns.map((c) => c.name);
  let rows = r.tableData.rows;
  if (typeof rows === 'string') rows = JSON.parse(rows);
  return rows.map((row) => (Array.isArray(row) ? Object.fromEntries(cols.map((c, i) => [c, row[i]])) : row));
}

// ---------- test de connexion ----------
if (process.env.TEST_SHOPIFY === 'true') {
  const t = todayToronto();
  const rows = await shopifyRows(addDays(t, -60), t);
  const noms = {};
  for (const r of rows) if (r.staff_member_name) noms[r.staff_member_name] = (noms[r.staff_member_name] || 0) + (Number(r.net_sales) || 0);
  console.log('Connexion Shopify réussie. Noms POS vus dans les ventes des 60 derniers jours :');
  for (const [n, v] of Object.entries(noms)) console.log(`  « ${n} » : ${v.toFixed(2)} $`);
  process.exit(0);
}

// ---------- démo ----------
function demoRows(weeks) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const forces = [1.15, 0.95, 1.05, 0.8, 0.9];
  const rows = [];
  for (const w of weeks) {
    cfg.vendeurs.forEach((v, i) => {
      const sales = Math.round((6500 + rnd() * 9000) * forces[i % forces.length]);
      rows.push({ week: w, staff_member_name: v.nom, net_sales: String(sales), orders: String(3 + Math.floor(rnd() * 8)) });
    });
  }
  return rows;
}

// ---------- chiffrement ----------
const normCode = (c) => String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
const b64 = (buf) => Buffer.from(buf).toString('base64');

async function deriveKey(code, salt) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(normCode(code)), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}
async function encrypt(code, salt, payload) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return { iv: b64(iv), ct: b64(ct) };
}

// ---------- calcul ----------
const today = refDate;
const done = allWeeks.filter((w) => addDays(w, 6) < today); // semaines terminées
const k = done.length;

let rows = [];
if (k > 0) {
  rows = DEMO ? demoRows(done) : await shopifyRows(debut, addDays(done[k - 1], 6));
}

const byName = new Map();
cfg.vendeurs.forEach((v) => [v.nom, ...(v.nomsPOS || [])].forEach((n) => byName.set(n.trim().toLowerCase(), v.id)));
const weekIdx = new Map(done.map((w, i) => [w, i]));
const stats = Object.fromEntries(cfg.vendeurs.map((v) => [v.id, { semaines: Array(k).fill(0), commandes: 0 }]));
const nonAttribue = {};
let totalCompagnie = 0;

for (const row of rows) {
  const amount = Number(row.net_sales) || 0;
  const orders = Number(row.orders) || 0;
  const wi = weekIdx.get(mondayOf(String(row.week).slice(0, 10)));
  if (wi === undefined || (!amount && !orders)) continue;
  totalCompagnie += amount;
  const name = (row.staff_member_name || '').trim();
  const id = byName.get(name.toLowerCase());
  if (!id) { nonAttribue[name || '(sans vendeur)'] = (nonAttribue[name || '(sans vendeur)'] || 0) + amount; continue; }
  stats[id].semaines[wi] += amount;
  stats[id].commandes += orders;
}

const cumulAt = (id, n) => stats[id].semaines.slice(0, n).reduce((a, b) => a + b, 0);
const rankAt = (n) => {
  const order = cfg.vendeurs.map((v) => ({ id: v.id, t: cumulAt(v.id, n) })).sort((a, b) => b.t - a.t);
  const ranks = {}; order.forEach((o, i) => { ranks[o.id] = i > 0 && o.t === order[i - 1].t ? ranks[order[i - 1].id] : i + 1; });
  return { ranks, max: order[0]?.t || 0, leader: order[0]?.t > 0 ? order[0].id : null };
};
const posAt = (id, n) => { const { max } = rankAt(n); return max > 0 ? (cumulAt(id, n) / max) * (n / allWeeks.length) : 0; };

const now = rankAt(k);
const prev = rankAt(Math.max(0, k - 1));

// série en tête du meneur actuel
let serie = 0;
if (now.leader) for (let n = k; n >= 1 && rankAt(n).leader === now.leader; n--) serie++;

// sprint de la semaine : meilleure semaine la plus récente
let sprint = null, best = 0;
if (k > 0) cfg.vendeurs.forEach((v) => { const s = stats[v.id].semaines[k - 1]; if (s > best) { best = s; sprint = v.id; } });

// plus forte remontée
let remontee = null, gain = 0;
if (k > 1) cfg.vendeurs.forEach((v) => { const g = prev.ranks[v.id] - now.ranks[v.id]; if (g > gain) { gain = g; remontee = v.id; } });

const positions = cfg.vendeurs.map((v) => posAt(v.id, k)).sort((a, b) => b - a);
const photoFinish = k > 0 && positions.length > 1 && positions[0] > 0 && (positions[0] - positions[1]) / positions[0] < 0.03;

const objectifPerso = objectifCompagnie / cfg.vendeurs.length;
const race = {
  demo: DEMO,
  titre: cfg.titre,
  misAJour: new Date().toISOString(),
  saison: { debut, fin, terminee, prochaineCourse: terminee ? addDays(fin, 1) : null, semaine: k, semainesTotal: allWeeks.length, derniereSemaine: k ? done[k - 1] : null },
  compagniePct: cfg.afficherObjectifCompagniePourTous ? totalCompagnie / objectifCompagnie : null,
  faits: { meneur: now.leader, serieTete: serie, sprint, remontee, remonteeRangs: gain, photoFinish },
  vendeurs: cfg.vendeurs.map((v, i) => ({
    id: v.id, nom: v.nom, icone: v.icone, animal: v.animal || null, couleur: v.couleur, couloir: i + 1,
    position: posAt(v.id, k), positionPrec: posAt(v.id, Math.max(0, k - 1)),
    rang: k ? now.ranks[v.id] : null, rangPrec: k > 1 ? prev.ranks[v.id] : null,
  })),
};

// ---------- coffre chiffré ----------
const codes = DEMO
  ? { ...Object.fromEntries(cfg.vendeurs.map((v, i) => [v.id, `demo${i + 1}`])), admin: ['demoadmin'] }
  : JSON.parse(process.env.CODES_ACCES || '{}');

const vendeurPayload = (v) => {
  const s = stats[v.id]; const total = cumulAt(v.id, k);
  return {
    role: 'vendeur', id: v.id, nom: v.nom, total, commandes: s.commandes,
    semaine: k ? s.semaines[k - 1] : 0, meilleure: Math.max(0, ...s.semaines),
    moyenne: k ? total / k : 0, panier: s.commandes ? total / s.commandes : 0,
    objectifPerso, historique: s.semaines, semaines: done,
  };
};
const adminPayload = {
  role: 'admin',
  compagnie: { total: totalCompagnie, objectif: objectifCompagnie, projection: k ? (totalCompagnie / k) * allWeeks.length : 0 },
  vendeurs: cfg.vendeurs.map(vendeurPayload),
  nonAttribue: Object.entries(nonAttribue).map(([nom, total]) => ({ nom, total })),
  semaines: done,
};

const salt = webcrypto.getRandomValues(new Uint8Array(16));
const entries = [];
for (const v of cfg.vendeurs) {
  if (!codes[v.id]) { console.warn(`Aucun code pour ${v.id} (${v.nom})`); continue; }
  entries.push(await encrypt(codes[v.id], salt, vendeurPayload(v)));
}
for (const c of [].concat(codes.admin || [])) entries.push(await encrypt(c, salt, adminPayload));
entries.sort(() => webcrypto.getRandomValues(new Uint8Array(1))[0] - 128); // ordre aléatoire

await mkdir(new URL('data/', ROOT), { recursive: true });
await writeFile(new URL('data/race.json', ROOT), JSON.stringify(race, null, 2));
await writeFile(new URL('data/vault.json', ROOT), JSON.stringify({ salt: b64(salt), iterations: ITERATIONS, entries }, null, 2));

console.log(`Semaines terminées : ${k}/${allWeeks.length} · ventes saison : ${totalCompagnie.toFixed(2)} $`);
if (Object.keys(nonAttribue).length) console.log('Noms POS non reliés à un vendeur :', nonAttribue);
