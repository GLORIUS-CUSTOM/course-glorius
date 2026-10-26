# La Course GLORIUS

Course de chevaux des ventes de l'équipe GLORIUS. Chaque lundi, une tâche automatique lit
les ventes nettes avant taxes de chaque vendeur dans Shopify, puis fait avancer les chevaux.

- **Tout le monde** voit la piste et la position de chaque cheval.
- **Chaque vendeur** entre son code d'accès pour voir ses propres chiffres.
- **Les codes admin** montrent les chiffres de tout le monde et le total de GLORIUS.

Les chiffres sont chiffrés dans `data/vault.json` : sans le bon code, ils sont illisibles,
même en fouillant le code de la page.

## Fichiers

| Fichier | Rôle |
|---|---|
| `config.json` | Saison, objectif, vendeurs (nom affiché, noms au POS, icône, couleur) |
| `index.html`, `style.css`, `app.js` | La page |
| `icones/` | Les icônes des vendeurs (PNG ou SVG carrés) |
| `scripts/update.mjs` | Lit Shopify et recalcule la course |
| `scripts/generate-codes.mjs` | Génère les codes d'accès |
| `.github/workflows/mise-a-jour.yml` | Lance la mise à jour chaque lundi |
| `data/` | Positions publiques et coffre chiffré, réécrits chaque lundi |

## Mise en place

### 1. Les vendeurs
Dans `config.json`, pour chaque vendeur :
- `nom` : le nom affiché sur la piste ;
- `nomsPOS` : le ou les noms exacts sous lesquels il apparaît dans les rapports Shopify
  (par exemple `"Patrick Feio"`, ou son courriel s'il n'a pas de nom au POS) ;
- `icone` : le chemin de son image, par exemple `"icones/patrick.png"` ;
- `couleur` : la couleur de son couloir.

### 2. L'app Shopify (JF, propriétaire de la boutique)
1. Va sur le **Dev Dashboard** de Shopify (dev.shopify.com) avec le compte de la boutique.
2. Crée une app, par exemple « Course GLORIUS ».
3. Dans les accès, coche **read_reports** (lecture des rapports), publie une version,
   puis installe l'app sur la boutique GLORIUS.
4. Dans les paramètres de l'app, copie l'**ID client** et le **secret client**.

### 3. Les secrets GitHub
Dans le dépôt : **Settings → Secrets and variables → Actions → New repository secret**.

| Nom | Valeur |
|---|---|
| `SHOPIFY_SHOP` | l'adresse myshopify de la boutique (celle de l'admin, ex. `xxxx.myshopify.com`) |
| `SHOPIFY_CLIENT_ID` | l'ID client de l'app |
| `SHOPIFY_CLIENT_SECRET` | le secret client de l'app |
| `CODES_ACCES` | le JSON produit à l'étape 4 |

### 4. Les codes d'accès
Sur un ordinateur avec Node : `node scripts/generate-codes.mjs`.
Copie la ligne JSON dans le secret `CODES_ACCES` et remets à chacun son code.
Pour changer le code de quelqu'un, modifie sa valeur dans le secret : il sera actif à la
prochaine mise à jour.

### 5. La page
**Settings → Pages → Build and deployment** : source « Deploy from a branch »,
branche `main`, dossier `/ (root)`.

### 6. Première mise à jour
**Actions → Mise à jour de la course → Run workflow**. Ensuite, elle tourne seule chaque lundi matin.

## Bon à savoir
- **La course repart à zéro chaque 1er novembre** (début de l'exercice, réglé par `debutAnnuel`
  dans `config.json`). Le résultat final reste affiché jusqu'à la fin de la première semaine
  de la nouvelle saison, puis les animaux reviennent à la barrière.
- La position d'un cheval est relative au meneur. Le meneur court au rythme du calendrier
  (à la moitié de la piste à mi-saison). Les autres sont placés selon leurs ventes comparées
  à celles du meneur. Les positions ne révèlent donc pas de montant en dollars.
- Une vente compte pour le vendeur sélectionné au POS. Le partage co-vendeur sera ajouté
  quand l'extension l'enregistrera sur les commandes.
- Les ventes faites sous un nom absent de `nomsPOS` apparaissent dans la vue admin,
  sous « Ventes non reliées », pour qu'on corrige la config.
- Aperçu local avec des données inventées : `node scripts/update.mjs --demo`
  (codes `demo1` à `demo5` et `demoadmin`). Relance une vraie mise à jour avant de publier.
