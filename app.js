// La Course GLORIUS — affichage de la course et déverrouillage des chiffres.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const money = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n || 0);
  const pct = (n) => new Intl.NumberFormat('fr-CA', { style: 'percent', maximumFractionDigits: 1 }).format(n || 0);
  const dateFr = (s) => new Date(s + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
  const moisCourt = (d) => d.toLocaleDateString('fr-CA', { month: 'short' }).replace('.', '');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
  };

  let race, vault, unlocked = null;

  async function load() {
    if (window.__DATA__) return window.__DATA__;
    const bust = '?t=' + Date.now();
    const [r, v] = await Promise.all([fetch('data/race.json' + bust), fetch('data/vault.json' + bust)]);
    return { race: await r.json(), vault: await v.json() };
  }

  // ---------- chiffrement ----------
  const normCode = (c) => String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
  const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function tryUnlock(code) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normCode(code)), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64d(vault.salt), iterations: vault.iterations, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    for (const e of vault.entries) {
      try {
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(e.iv) }, key, b64d(e.ct));
        return JSON.parse(new TextDecoder().decode(pt));
      } catch { /* pas cette entrée */ }
    }
    return null;
  }

  const byId = (id) => race.vendeurs.find((v) => v.id === id);
  const nomDe = (id) => byId(id)?.nom ?? '—';

  // ---------- jeton (icône) ----------
  function token(v, size = '') {
    const el = document.createElement('span');
    el.className = 'token ' + size;
    el.style.setProperty('--c', v.couleur);
    if (v.icone) {
      const img = document.createElement('img');
      img.src = v.icone; img.alt = '';
      el.append(img);
    } else {
      el.textContent = v.couloir;
    }
    return el;
  }

  // ---------- tableau des faits ----------
  function renderTote() {
    const s = race.saison, f = race.faits;
    if (s.terminee) {
      $('#t-semaine').textContent = 'Arrivée';
      $('#t-semaine-sub').textContent = `Résultat final. Nouvelle course le ${dateFr(s.prochaineCourse)}`;
    } else {
      $('#t-semaine').textContent = s.semaine ? `${s.semaine} / ${s.semainesTotal}` : 'Départ';
      $('#t-semaine-sub').textContent = s.derniereSemaine
        ? `Semaine du ${dateFr(s.derniereSemaine)}` : `La course part le ${dateFr(s.debut)}`;
    }

    const fill = (sel, id, sub) => {
      const box = $(sel); box.replaceChildren();
      if (!id) { box.textContent = '—'; $(sel + '-sub').textContent = sub || 'À venir'; return; }
      box.append(token(byId(id), 'sm'), document.createTextNode(nomDe(id)));
      $(sel + '-sub').textContent = sub;
    };
    fill('#t-meneur', f.meneur, f.serieTete > 1 ? `En tête depuis ${f.serieTete} semaines` : 'Prend la tête cette semaine');
    fill('#t-sprint', f.sprint, 'Meilleure semaine de l’écurie');
    fill('#t-remontee', f.remontee, f.remontee ? `Gagne ${f.remonteeRangs} rang${f.remonteeRangs > 1 ? 's' : ''}` : 'Personne n’a dépassé cette semaine');
    $('#photo-finish').hidden = !f.photoFinish;

    const cp = race.compagniePct;
    $('#t-compagnie').hidden = cp == null;
    if (cp != null) { $('#t-compagnie-val').textContent = pct(cp); $('#t-compagnie-bar').style.width = Math.min(100, cp * 100) + '%'; }
  }

  // ---------- piste ----------
  function renderTrack() {
    const ruler = $('#ruler'); ruler.replaceChildren();
    const d0 = new Date(race.saison.debut + 'T12:00:00'), d1 = new Date(race.saison.fin + 'T12:00:00');
    const span = d1 - d0;
    for (let m = new Date(d0.getFullYear(), d0.getMonth() + 1, 1); m <= d1; m.setMonth(m.getMonth() + 1)) {
      const t = document.createElement('span');
      t.style.left = ((m - d0) / span) * 100 + '%';
      t.textContent = moisCourt(m);
      ruler.append(t);
    }
    const weeks = race.saison.semainesTotal;
    const tape = $('#tape'); tape.replaceChildren();
    for (let w = 4; w < weeks; w += 4) {
      const n = document.createElement('span');
      n.style.left = (w / weeks) * 100 + '%';
      n.textContent = w;
      tape.append(n);
    }
    const today = race.saison.semaine / weeks;
    $('#track').style.setProperty('--weeks', weeks);
    $('#track').style.setProperty('--today', today);
    $('#today-label').hidden = !race.saison.semaine;

    const lanes = $('#lanes'); lanes.replaceChildren();
    for (const v of race.vendeurs) {
      const lane = document.createElement('li');
      lane.className = 'lane';
      lane.style.setProperty('--c', v.couleur);
      const plate = document.createElement('span');
      plate.className = 'plate'; plate.textContent = v.couloir;
      const run = document.createElement('div'); run.className = 'run';
      const horse = document.createElement('div');
      horse.className = 'horse'; horse.dataset.id = v.id;
      horse.style.setProperty('--p', v.positionPrec);
      horse.dataset.to = v.position;
      const tag = document.createElement('span'); tag.className = 'tag';
      const rang = v.rang ? `${v.rang}${v.rang === 1 ? 'er' : 'e'}` : '';
      tag.innerHTML = `<b></b><i></i><em></em>`;
      tag.querySelector('b').textContent = v.nom;
      tag.querySelector('i').textContent = rang;
      if (v.rangPrec && v.rang < v.rangPrec) tag.querySelector('em').textContent = '▲';
      if (v.rangPrec && v.rang > v.rangPrec) { const em = tag.querySelector('em'); em.textContent = '▼'; em.className = 'down'; }
      if (v.position > 0.62) horse.classList.add('flip');
      const sprite = v.animal && window.SPRITES?.[v.animal];
      if (sprite) {
        horse.classList.add('has-sprite');
        lane.classList.add('lane-' + v.animal);
        horse.dataset.animal = v.animal;
        const runner = document.createElement('span');
        runner.className = 'runner';
        runner.innerHTML = `<svg viewBox="0 0 80 56" aria-hidden="true">${sprite(v.couleur)}</svg>`;
        horse.append(runner, tag);
      } else {
        const runner = token(v); runner.classList.add('runner');
        horse.append(runner, tag);
      }
      if (unlocked?.role === 'vendeur' && unlocked.id === v.id) lane.classList.add('me');
      if (unlocked?.role === 'admin') {
        const a = unlocked.vendeurs.find((x) => x.id === v.id);
        const m = document.createElement('span'); m.className = 'lane-amt'; m.textContent = money(a?.total);
        run.append(m);
      }
      run.append(horse);
      lane.append(plate, run);
      lanes.append(lane);
    }
    gallop();
  }

  // Course d'arcade : chaque animal avance par bonds, à son propre rythme,
  // depuis la barrière de départ jusqu'à sa position de la semaine.
  let raceAnim = 0;
  const JUMP = { paresseux: 0, pandaroux: 14, abeille: 11, elephant: 7, tortue: 4 };
  function gallop() {
    cancelAnimationFrame(raceAnim);
    const plan = [...document.querySelectorAll('.horse')].map((h) => {
      const to = Number(h.dataset.to) || 0;
      const hops = Math.max(to > 0 ? 1 : 0, Math.round(to / 0.009));
      return { h, body: h.querySelector('.runner'), to, hops, step: hops ? to / hops : 0, jump: JUMP[h.dataset.animal] ?? 8 };
    });
    if (reduceMotion) { plan.forEach((p) => p.h.style.setProperty('--p', p.to)); return; }

    const HOP = 210;
    const maxHops = Math.max(1, ...plan.map((p) => p.hops));
    const RACE = Math.min(9000, Math.max(3500, maxHops * 235));
    const t0 = performance.now() + 500;
    for (const p of plan) {
      const free = Math.max(0, RACE - p.hops * HOP);
      const w = Array.from({ length: p.hops }, () => Math.random() ** 2 + 0.05);
      const sum = w.reduce((a, b) => a + b, 0) || 1;
      let t = t0;
      p.sched = w.map((x) => { t += (free * x) / sum; const s = t; t += HOP; return s; });
      p.h.style.setProperty('--p', 0);
      p.body.style.transform = '';
    }

    const frame = (now) => {
      let active = false;
      for (const p of plan) {
        let k = 0;
        while (k < p.sched.length && now >= p.sched[k] + HOP) k++;
        let pos = k * p.step, y = 0, moving = false;
        if (k < p.sched.length) {
          active = true;
          if (now >= p.sched[k]) {
            const f = (now - p.sched[k]) / HOP;
            pos += p.step * f; y = -Math.sin(Math.PI * f) * p.jump; moving = true;
          }
        }
        p.h.style.setProperty('--p', pos);
        p.body.style.transform = `translateY(${y.toFixed(1)}px)`;
        p.h.classList.toggle('running', moving);
      }
      if (active) raceAnim = requestAnimationFrame(frame);
      else plan.forEach((p) => { p.h.classList.remove('running'); p.h.style.setProperty('--p', p.to); });
    };
    raceAnim = requestAnimationFrame(frame);
  }

  // ---------- mes chiffres / admin ----------
  function sparkline(values, labels) {
    const w = 320, h = 72, pad = 6;
    const max = Math.max(1, ...values);
    const x = (i) => pad + (values.length < 2 ? 0 : (i / (values.length - 1)) * (w - pad * 2));
    const y = (v) => h - pad - (v / max) * (h - pad * 2);
    const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const last = values.length - 1;
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Ventes par semaine">
      <line x1="${pad}" x2="${w - pad}" y1="${h - pad}" y2="${h - pad}" class="spark-base"/>
      ${values.length ? `<polygon points="${x(0)},${h - pad} ${pts} ${x(last)},${h - pad}" class="spark-area"/>
      <polyline points="${pts}" class="spark-line"/>
      <circle cx="${x(last)}" cy="${y(values[last])}" r="3.5" class="spark-dot"/>` : ''}
    </svg>`;
  }

  function renderMine() {
    const box = $('#mine'), adm = $('#admin');
    box.hidden = unlocked?.role !== 'vendeur';
    adm.hidden = unlocked?.role !== 'admin';
    $('#unlock').hidden = !!unlocked;
    $('#who').hidden = !unlocked;
    if (!unlocked) return;

    if (unlocked.role === 'vendeur') {
      const u = unlocked, v = byId(u.id);
      $('#who-name').textContent = u.nom;
      $('#mine-token').replaceChildren(token(v));
      $('#m-total').textContent = money(u.total);
      $('#m-semaine').textContent = money(u.semaine);
      $('#m-meilleure').textContent = money(u.meilleure);
      $('#m-moyenne').textContent = money(u.moyenne);
      $('#m-panier').textContent = money(u.panier);
      $('#m-commandes').textContent = u.commandes;
      $('#m-rang').textContent = v.rang ? `${v.rang}${v.rang === 1 ? 'er' : 'e'} sur ${race.vendeurs.length}` : '—';
      $('#m-obj').textContent = pct(u.total / u.objectifPerso);
      $('#m-obj-sub').textContent = `de ta part de l’objectif (${money(u.objectifPerso)})`;
      $('#m-obj-bar').style.width = Math.min(100, (u.total / u.objectifPerso) * 100) + '%';
      $('#m-spark').innerHTML = sparkline(u.historique, u.semaines);
    } else {
      const a = unlocked, c = a.compagnie;
      $('#who-name').textContent = 'Accès complet';
      $('#a-total').textContent = money(c.total);
      $('#a-pct').textContent = pct(c.total / c.objectif) + ' de ' + money(c.objectif);
      $('#a-bar').style.width = Math.min(100, (c.total / c.objectif) * 100) + '%';
      $('#a-proj').textContent = money(c.projection);
      const rows = [...a.vendeurs].sort((x, y) => y.total - x.total).map((u) => {
        const v = byId(u.id);
        return `<tr><td><span class="dot" style="--c:${v.couleur}"></span>${escapeHtml(u.nom)}</td>
          <td>${money(u.total)}</td><td>${money(u.semaine)}</td><td>${money(u.meilleure)}</td>
          <td>${money(u.moyenne)}</td><td>${u.commandes}</td><td>${money(u.panier)}</td></tr>`;
      }).join('');
      $('#a-rows').innerHTML = rows;
      const na = a.nonAttribue || [];
      $('#a-na').hidden = !na.length;
      $('#a-na-list').textContent = na.map((n) => `${n.nom} : ${money(n.total)}`).join(' · ');
    }
  }
  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- événements ----------
  async function unlock(code, remember) {
    const msg = $('#unlock-msg');
    msg.textContent = 'Vérification…';
    const res = await tryUnlock(code);
    if (!res) { msg.textContent = 'Code non reconnu. Vérifie les lettres et les chiffres, puis réessaie.'; return false; }
    unlocked = res; msg.textContent = '';
    if (remember) store.set('course-code', code);
    renderMine(); renderTrack();
    return true;
  }

  async function start() {
    const data = await load();
    race = data.race; vault = data.vault;
    document.title = race.titre;
    $('#titre').textContent = race.titre;
    $('#saison').textContent = `${race.saison.debut.slice(0, 4)}–${race.saison.fin.slice(0, 4)}`;
    const fillBulbs = () => document.querySelectorAll('.bulbs').forEach((row) => {
      const n = Math.max(12, Math.floor(row.clientWidth / 26));
      if (row.children.length === n) return;
      row.replaceChildren(...Array.from({ length: n }, () => Object.assign(document.createElement('span'), { className: 'bulb' })));
    });
    fillBulbs(); window.addEventListener('resize', fillBulbs);
    $('#demo').hidden = !race.demo;
    $('#maj').textContent = 'Mis à jour le ' + new Date(race.misAJour).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
    renderTote(); renderMine(); renderTrack();

    $('#unlock').addEventListener('submit', (e) => {
      e.preventDefault();
      unlock($('#code').value, $('#remember').checked);
    });
    $('#logout').addEventListener('click', () => { unlocked = null; store.set('course-code', null); $('#code').value = ''; renderMine(); renderTrack(); });
    $('#replay').addEventListener('click', gallop);
    // Lien personnel : …/#c=CODE. Le code est retenu sur l'appareil puis retiré de l'adresse.
    const fromLink = (location.hash.match(/^#c=([0-9a-z]+)$/i) || [])[1];
    if (fromLink) { try { history.replaceState(null, '', location.pathname + location.search); } catch {} }
    const saved = fromLink || store.get('course-code');
    if (saved) unlock(saved, true);
  }

  start().catch((err) => {
    console.error(err);
    $('#lanes').innerHTML = '<li class="lane-empty">Impossible de charger la course. Recharge la page dans quelques minutes.</li>';
  });
})();
