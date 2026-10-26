// Coureurs dessinés de profil, tournés vers la droite. Les éléments .leg-a / .leg-b
// battent en alternance quand l'animal bondit ; .wing bat des ailes.
// viewBox 0 0 80 56, sol à y = 52.
window.SPRITES = (() => {
  const L = 'stroke="#f1efe9" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
  const eye = (x, y) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#0b0b0c"/><circle cx="${x + .6}" cy="${y - .6}" r=".6" fill="#fff"/>`;

  return {
    tortue: (c) => `
      <g class="leg leg-b"><rect x="22" y="38" width="7" height="13" rx="3" fill="${c}" ${L}/></g>
      <g class="leg leg-b"><rect x="48" y="38" width="7" height="13" rx="3" fill="${c}" ${L}/></g>
      <path d="M13 41c-3 0-5 1-6 3" fill="none" ${L}/>
      <ellipse cx="68" cy="34" rx="9" ry="6.5" fill="${c}" ${L}/>
      ${eye(71, 32)}
      <path d="M10 42C10 24 25 14 38 14s28 10 28 28z" fill="${c}" ${L}/>
      <path d="M10 42h56M24 42l3-12h22l3 12M27 30l4-11M49 30l-4-11M38 14v16" fill="none" ${L} opacity=".75"/>
      <g class="leg leg-a"><rect x="16" y="39" width="8" height="13" rx="3" fill="${c}" ${L}/></g>
      <g class="leg leg-a"><rect x="54" y="39" width="8" height="13" rx="3" fill="${c}" ${L}/></g>`,

    elephant: (c) => `
      <g class="leg leg-b"><rect x="24" y="34" width="9" height="18" rx="3" fill="${c}" ${L}/></g>
      <g class="leg leg-b"><rect x="48" y="34" width="9" height="18" rx="3" fill="${c}" ${L}/></g>
      <path d="M12 24c-4 2-5 6-4 10" fill="none" ${L}/>
      <ellipse cx="35" cy="28" rx="24" ry="15" fill="${c}" ${L}/>
      <path d="M64 28c6 3 9 8 8 14-1 4-4 6-7 5" fill="none" stroke="#f1efe9" stroke-width="7" stroke-linecap="round"/>
      <path d="M64 28c6 3 9 8 8 14-1 4-4 6-7 5" fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round"/>
      <circle cx="60" cy="22" r="11" fill="${c}" ${L}/>
      <path d="M56 13c-9-2-14 5-12 13 2 6 7 8 11 6" fill="${c}" ${L}/>
      ${eye(64, 20)}
      <path d="M62.5 28c3 4.5 10 5.5 16.5-1.5-.5 6-7 10.5-14.5 8.5-2.5-1-3-4-2-7z" fill="#f6efdc"/>
      <g class="leg leg-a"><rect x="17" y="35" width="10" height="17" rx="3" fill="${c}" ${L}/></g>
      <g class="leg leg-a"><rect x="42" y="35" width="10" height="17" rx="3" fill="${c}" ${L}/></g>`,

    paresseux: (c) => `
      <g class="limb limb-b"><path d="M26 26c-1-7-1-14 0-19" fill="none" stroke="#f1efe9" stroke-width="8" stroke-linecap="round"/>
      <path d="M26 26c-1-7-1-14 0-19" fill="none" stroke="${c}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M23 7c0-3 3-4 5-2M25.5 8c0-3 3-4 5-2" fill="none" stroke="#e8dcc0" stroke-width="1.6" stroke-linecap="round"/></g>
      <ellipse cx="38" cy="30" rx="18" ry="11" fill="${c}" ${L}/>
      <path d="M26 33c4 3 10 4 16 3M30 25c3-2 7-2 10-1" fill="none" stroke="#f1efe9" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>
      <circle cx="57" cy="31" r="9.5" fill="${c}" ${L}/>
      <ellipse cx="58.5" cy="32" rx="7" ry="5.6" fill="#e8dcc0"/>
      <path d="M53 30.5c1.5-1.6 4-1.8 5.5-.4M59.5 30.5c1.5-1.4 4-1.2 5.3.5" fill="none" stroke="#3a2a1e" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="55.6" cy="30.8" r="1.2" fill="#0b0b0c"/><circle cx="62.2" cy="30.8" r="1.2" fill="#0b0b0c"/>
      <ellipse cx="59" cy="33.6" rx="1.6" ry="1.1" fill="#3a2a1e"/>
      <path d="M56.5 35.5c1.5 1.2 3.5 1.2 5 0" fill="none" stroke="#3a2a1e" stroke-width="1" stroke-linecap="round"/>
      <g class="limb limb-a"><path d="M50 25c1-6 2-12 4-18" fill="none" stroke="#f1efe9" stroke-width="8" stroke-linecap="round"/>
      <path d="M50 25c1-6 2-12 4-18" fill="none" stroke="${c}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M51 7c0-3 3-4 5-2M53.5 8c0-3 3-4 5-2" fill="none" stroke="#e8dcc0" stroke-width="1.6" stroke-linecap="round"/></g>`,


    abeille: (c) => `
      <g class="wing"><ellipse cx="34" cy="12" rx="9" ry="13" transform="rotate(-25 34 20)" fill="rgba(241,239,233,.35)" ${L}/></g>
      <path d="M14 30l-8 2" ${L}/>
      <ellipse cx="34" cy="31" rx="20" ry="13" fill="${c}" ${L}/>
      <path d="M26 19c-2 8-2 16 0 24M36 18c-2 9-2 17 0 26M45 20c-2 7-2 15 0 22" fill="none" stroke="#0b0b0c" stroke-width="5"/>
      <ellipse cx="34" cy="31" rx="20" ry="13" fill="none" ${L}/>
      <circle cx="59" cy="28" r="9" fill="#0b0b0c" ${L}/>
      <circle cx="62" cy="26" r="2.4" fill="#f1efe9"/><circle cx="62.6" cy="25.6" r="1.1" fill="#0b0b0c"/>
      <path d="M60 19c1-6 5-9 9-8M64 21c3-4 7-5 10-3" fill="none" ${L}/>
      <g class="wing wing-front"><ellipse cx="42" cy="12" rx="9" ry="14" transform="rotate(15 42 22)" fill="rgba(241,239,233,.55)" ${L}/></g>
      <g class="leg leg-a"><path d="M30 43l-2 7M40 43l1 7" ${L}/></g>`,

    pandaroux: (c) => `
      <g class="tail"><path d="M28 42c-9 2-17-1-20-8 4-3 11-2 18 2" fill="${c}" ${L}/>
      <path d="M12 33.5l1.5 3.5M17 34l1 4M22 35.5l.5 3.5" stroke="#f1efe9" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="leg leg-b"><ellipse cx="44" cy="49" rx="4.5" ry="5" fill="#2a120a" ${L}/></g>
      <g class="leg leg-b arm"><ellipse cx="34" cy="34" rx="3.6" ry="6.5" fill="#2a120a" ${L}/></g>
      <circle cx="40" cy="36" r="14" fill="${c}" ${L}/>
      <ellipse cx="42" cy="39" rx="8" ry="9" fill="#2a120a"/>
      <path d="M33 10l-1-8 7 4M49 7l5-6 2 9" fill="#f1efe9" ${L}/>
      <circle cx="44" cy="17" r="12" fill="${c}" ${L}/>
      <ellipse cx="52" cy="23.2" rx="6.8" ry="5.2" fill="#f1efe9"/>
      <ellipse cx="47" cy="11.5" rx="2.6" ry="1.5" fill="#f1efe9"/><ellipse cx="54" cy="12.5" rx="2.2" ry="1.4" fill="#f1efe9"/>
      ${eye(48, 16)}${eye(54.5, 16.5)}
      <path d="M52.8 20.6h4.4l-2.2 2.7z" fill="#0b0b0c" stroke="#0b0b0c" stroke-width="1.8" stroke-linejoin="round"/>
      <g class="leg leg-a arm"><ellipse cx="49" cy="34" rx="3.6" ry="6.5" fill="#2a120a" ${L}/></g>
      <g class="leg leg-a"><ellipse cx="36" cy="49.5" rx="4.5" ry="5" fill="#2a120a" ${L}/></g>`,

  };
})();
