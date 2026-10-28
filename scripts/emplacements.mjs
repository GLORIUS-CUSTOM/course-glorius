// Rattache chaque produit (variante) à tous les emplacements GLORIUS actifs.
// Ne touche ni aux prix, ni aux quantités, ni au suivi d'inventaire : ajoute seulement
// l'emplacement là où il manque. Utilise la même app Shopify que la course
// (accès requis : read_products, write_inventory, read_locations).
//
//   SIMULATION=true  → compte seulement ce qui serait changé, sans rien modifier.

const shop = process.env.SHOPIFY_SHOP;
const version = process.env.SHOPIFY_API_VERSION || '2026-10';
const SIMULATION = process.env.SIMULATION === 'true';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tokRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET }),
});
if (!tokRes.ok) throw new Error(`Jeton Shopify refusé (${tokRes.status}) : ${await tokRes.text()}`);
const { access_token, scope } = await tokRes.json();
console.log('Accès accordés à l\'app :', scope);

async function gql(query, variables = {}) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': access_token },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    const throttled = json.errors?.some((e) => e.extensions?.code === 'THROTTLED');
    if (throttled || res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (json.errors?.length) throw new Error('Erreur GraphQL : ' + JSON.stringify(json.errors).slice(0, 800));
    const t = json.extensions?.cost?.throttleStatus;
    if (t && t.currentlyAvailable < 400) await sleep(((400 - t.currentlyAvailable) / t.restoreRate) * 1000);
    return json.data;
  }
  throw new Error('Shopify reste saturé, réessaie plus tard.');
}

const { locations } = await gql('{ locations(first: 50) { nodes { id name isActive } } }');
const locs = locations.nodes.filter((l) => l.isActive);
console.log('Emplacements :', locs.map((l) => l.name).join(' · '));

const todo = [];
let after = null, total = 0;
do {
  const d = await gql(`query($after: String) { productVariants(first: 250, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { inventoryItem { id inventoryLevels(first: 20) { nodes { location { id } } } } } } }`, { after });
  for (const v of d.productVariants.nodes) {
    total++;
    const have = new Set(v.inventoryItem.inventoryLevels.nodes.map((n) => n.location.id));
    const missing = locs.filter((l) => !have.has(l.id)).map((l) => l.id);
    if (missing.length) todo.push({ id: v.inventoryItem.id, missing });
  }
  after = d.productVariants.pageInfo.hasNextPage ? d.productVariants.pageInfo.endCursor : null;
  if (total % 2500 < 250) console.log(`  ${total} variantes lues…`);
} while (after);

console.log(`Variantes : ${total} · à rattacher : ${todo.length}`);
if (SIMULATION || !todo.length) { console.log(SIMULATION ? 'Simulation : rien n\'a été modifié.' : 'Tout est déjà rattaché.'); process.exit(0); }

const BATCH = 25;
let done = 0, errors = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const chunk = todo.slice(i, i + BATCH);
  const body = chunk.map((t, k) => `a${k}: inventoryBulkToggleActivation(inventoryItemId: "${t.id}", inventoryItemUpdates: [${
    t.missing.map((l) => `{ locationId: "${l}", activate: true }`).join(', ')}]) { userErrors { message } }`).join('\n');
  const d = await gql(`mutation {\n${body}\n}`);
  for (const r of Object.values(d)) { if (r.userErrors?.length) { errors++; if (errors <= 5) console.log('  ', r.userErrors[0].message); } else done++; }
  if ((i / BATCH) % 40 === 0) console.log(`  ${Math.min(i + BATCH, todo.length)} / ${todo.length}`);
}
console.log(`Terminé : ${done} rattachées, ${errors} erreurs.`);
