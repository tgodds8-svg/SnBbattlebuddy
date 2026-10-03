/* SnB Loadouts — community edition UI logic.
 *
 * Quick Build (default): Ship → Guns → Damage. All power-user depth
 * (furniture, season buffs, mastery, stacking, assumptions, compare,
 * data reference) lives one tap away in the Tune tab.
 *
 * Fidelity contract: the calculator (js/calculator.js) and data
 * (js/data.js + data/*.json) are untouched. Every number, formula,
 * default assumption and est. badge behaves exactly as in v1.
 */
'use strict';

const S = {
  loadout: null,          // { name, shipName, weaponSlots[], furniture[], minorSlots }
  buffs: {},              // seasonal node name -> bool
  mastery: { relentlessForce: false, weaknessFinder: false, firepowerOrder: false },
  stacking: null,
  assumptions: { rangeM: 300, weakpointRate: 20, weakpointBonus: 50, impetusUptime: 0.5, firepowerOrderUptime: 0.15, stormstruckArcs: 2 },
};

const MASTERY_COSTS = { relentlessForce: 10, weaknessFinder: 30, firepowerOrder: 50 };
const LS_KEY = 'snb-loadouts-v1'; // same key as v1 — saved loadouts carry over
const ONBOARD_KEY = 'snb-v2-onboarded';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const estBadge = flag => flag ? '<span class="est-badge" title="Unverified — community number, confirm in game">est.</span>' : '';
const fmt = n => (n == null ? '—' : Number(n).toLocaleString());

const SHIP_ICONS = {
  'Dhow': '🛶', 'Bedar': '⛵', 'Hulk': '🚢', 'Cutter': '⛵', 'Barge': '🛳',
  'Sloop': '⛵', 'Padewakang': '⛵', 'Snow': '⛵', 'Brigantine': '⛵',
  'Sambuk': '⛵', 'Barque': '🚢', 'Brig': '⛵', 'Battle Junk': '🛶',
  'Schooner': '⛵', 'Frigate': '🚢', 'Sloop of War': '⛵', 'Corvette': '🚢',
  'Galleon': '🚢', 'Junk': '🛶',
};
const shipIcon = s => SHIP_ICONS[s.class] || '⛵';

/* ---------------- bottom tabs ---------------- */
function switchTab(name) {
  document.querySelectorAll('.btab').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  $('tab-' + name).classList.add('active');
  if (name === 'build') { renderStatusBar(); renderQuickDps(); }
  if (name === 'advanced') renderAdvanced();
  window.scrollTo(0, 0);
}
document.querySelectorAll('.btab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/* ---------------- step nav ---------------- */
document.querySelectorAll('.step').forEach(st => st.addEventListener('click', () => {
  document.querySelectorAll('.step').forEach(x => x.classList.remove('active'));
  st.classList.add('active');
  $(st.dataset.step).scrollIntoView({ behavior: 'smooth', block: 'start' });
}));
$('btn-goto-ships').addEventListener('click', () => {
  document.querySelector('[data-step="step-1"]').click();
});
$('btn-goto-tune').addEventListener('click', () => switchTab('advanced'));

/* ---------------- onboarding ---------------- */
$('onboard-dismiss').addEventListener('click', () => {
  $('onboard-card').hidden = true;
  try { localStorage.setItem(ONBOARD_KEY, '1'); } catch {}
});

/* ---------------- loadout model (unchanged from v1) ---------------- */
function blankSlot(position, index) {
  return { position, index, weapon: null, shotsPerVolley: 1, ascension: { tier: 'none', flat: 0, pct: 0 }, customMods: [], extraStatusDps: 0 };
}
function newLoadout(shipName) {
  const ship = DB.shipByName(shipName);
  return {
    name: shipName + ' build',
    shipName,
    weaponSlots: DB.slotsForShip(ship).map(s => blankSlot(s.position, s.index)),
    furniture: [{ kind: 'major', item: null, customMods: [] }],
    minorSlots: 4,
  };
}
function ensureMinorSlots() {
  if (!S.loadout) return;
  const minors = S.loadout.furniture.filter(f => f.kind === 'minor');
  while (minors.length < S.loadout.minorSlots) {
    const f = { kind: 'minor', item: null, customMods: [] };
    S.loadout.furniture.push(f); minors.push(f);
  }
  while (minors.length > S.loadout.minorSlots) {
    const i = S.loadout.furniture.map((f, idx) => f.kind === 'minor' ? idx : -1).filter(i => i >= 0).pop();
    S.loadout.furniture.splice(i, 1); minors.pop();
  }
}
function filledCount() {
  return S.loadout ? S.loadout.weaponSlots.filter(s => s.weapon).length : 0;
}

/* ---------------- assumptions (unchanged defaults from v1) ---------------- */
function readAssumptions() {
  S.assumptions.rangeM = +$('assume-range').value || 300;
  S.assumptions.weakpointRate = +$('assume-weakpoint').value || 0;
  S.assumptions.weakpointBonus = +$('assume-weakpoint-bonus').value || 0;
}
['assume-range', 'assume-weakpoint', 'assume-weakpoint-bonus'].forEach(id =>
  $(id).addEventListener('change', () => { readAssumptions(); refreshNumbers(); }));

function buildCtx() {
  readAssumptions();
  return {
    stacking: S.stacking,
    mastery: { ...S.mastery },
    // v1 fidelity: documented seasonal nodes are informational; DPS-relevant seasonal effects live in Mastery.
    buffMods: [],
    assumptions: { ...S.assumptions },
  };
}

/* ---------------- step 1: ships ---------------- */
function renderShips(filter = '', cls = '') {
  const list = $('ship-list');
  const classes = [...new Set(DB.ships.map(s => s.class).filter(Boolean))].sort();
  const sel = $('ship-class-filter');
  if (!sel.options.length || sel.options.length === 1) {
    classes.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
  }
  list.innerHTML = '';
  DB.ships
    .filter(s => s.playable !== false)
    .filter(s => !filter || s.name.toLowerCase().includes(filter.toLowerCase()))
    .filter(s => !cls || s.class === cls)
    .forEach(s => {
      const d = document.createElement('div');
      d.className = 'card' + (S.loadout && S.loadout.shipName === s.name ? ' selected' : '');
      const guns = (s.weapon_slots || []).length;
      d.innerHTML = `<div class="card-top"><span class="card-ico">${shipIcon(s)}</span>
        <div><h3>${esc(s.name)}${estBadge(s.estimated)}</h3>
        <div class="meta">${esc(s.class || '')}${s.role ? ' · ' + esc(s.role) : ''}</div></div></div>
        <div class="stats">
          <span class="stat">Hull <b>${s.hull ? fmt(s.hull) : '—'}</b></span>
          <span class="stat">Speed <b>${s.speed_kn != null ? s.speed_kn + ' kn' : '—'}</b></span>
          <span class="stat">Gun positions <b>${guns}</b></span>
        </div>`;
      d.addEventListener('click', () => selectShip(s.name));
      list.appendChild(d);
    });
}
function selectShip(name) {
  S.loadout = newLoadout(name);
  ensureMinorSlots();
  renderShips($('ship-search').value, $('ship-class-filter').value);
  renderBuildAll();
  document.querySelector('[data-step="step-2"]').click();
}
$('ship-search').addEventListener('input', e => renderShips(e.target.value, $('ship-class-filter').value));
$('ship-class-filter').addEventListener('change', e => renderShips($('ship-search').value, e.target.value));

/* example preset: Luke's Frigate build (unchanged from v1) */
$('btn-load-preset').addEventListener('click', () => {
  const L = newLoadout('Frigate');
  L.name = 'Example: Frigate electric build';
  const put = (pos, weaponName, shots) => {
    const s = L.weaponSlots.find(x => x.position === pos && !x.weapon);
    if (!s) return;
    const w = DB.weaponByName(weaponName);
    if (w) { s.weapon = w; s.shotsPerVolley = shots || 1; }
  };
  const td = DB.weapons.find(w => w.family === 'Thunder Dragon') || DB.weapons.find(w => /thunder dragon/i.test(w.name));
  if (td) {
    L.weaponSlots.filter(s => s.position.startsWith('broadside')).forEach(s => { s.weapon = td; s.shotsPerVolley = 6; });
  }
  put('bow', 'Culverin V', 1);
  const maw = DB.weaponByName('Infernal Maw');
  const aux = L.weaponSlots.find(x => x.position === 'auxiliary' && !x.weapon);
  if (maw && aux) {
    aux.weapon = maw; aux.shotsPerVolley = 1;
    aux.ascension = { tier: 'mythic', flat: 71, pct: 0.331 };
  }
  const leyden = DB.furniture.find(f => /leyden/i.test(f.name));
  if (leyden) L.furniture[0] = { kind: 'major', item: leyden, customMods: [] };
  L.minorSlots = 4;
  S.loadout = L;
  ensureMinorSlots();
  renderShips($('ship-search').value, $('ship-class-filter').value);
  renderBuildAll();
  document.querySelector('[data-step="step-3"]').click();
});

/* ---------------- templates: curated starter builds ---------------- */
function templateKitLine(t) {
  const wnames = [...new Set((t.weapons || []).map(w => w.name))];
  const fnames = [t.furniture && t.furniture.major, ...((t.furniture && t.furniture.minors) || [])].filter(Boolean);
  return [...wnames, ...fnames].join(' · ');
}
function renderTemplates() {
  const box = $('template-list');
  if (!box) return;
  box.innerHTML = '';
  TEMPLATES.forEach(t => {
    const meta = Archetypes.META[t.archetype] || Archetypes.META.general;
    const d = document.createElement('button');
    d.className = 'template-card';
    d.innerHTML = `<div class="t-head"><span class="arch-ico">${meta.icon}</span>
        <div><h3>${esc(t.name)}</h3><div class="meta">${esc(t.tagline)}</div></div></div>
      <p class="t-synergy">${esc(t.synergy)}</p>
      <div class="t-kit">${esc(templateKitLine(t))}</div>
      <span class="t-use">Use this template →</span>`;
    d.addEventListener('click', () => loadTemplate(t));
    box.appendChild(d);
  });
}
function loadTemplate(t) {
  const L = newLoadout(t.ship);
  L.name = 'Template: ' + t.name;
  (t.weapons || []).forEach(spec => {
    const s = L.weaponSlots.find(x => x.position === spec.position && !x.weapon);
    if (!s) return;
    const w = DB.weaponByName(spec.name);
    if (w) { s.weapon = w; s.shotsPerVolley = spec.shots || 1; }
  });
  if (t.furniture) {
    const fm = DB.furnitureByName(t.furniture.major);
    if (fm) L.furniture[0] = { kind: 'major', item: fm, customMods: [] };
    L.minorSlots = (t.furniture.minors || []).length;
    (t.furniture.minors || []).forEach(nm => {
      const it = DB.furnitureByName(nm);
      if (it) L.furniture.push({ kind: 'minor', item: it, customMods: [] });
    });
  }
  S.loadout = L;
  ensureMinorSlots();
  renderShips($('ship-search').value, $('ship-class-filter').value);
  switchTab('build');
  renderBuildAll();
  renderFurniture();
  document.querySelector('[data-step="step-2"]').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------------- generic picker modal (unchanged logic from v1) ---------------- */
/* Pass groupFn(item)->[archetypes...] to group items under collapsible
 * archetype subcategories (primary archetype = first entry). */
function openPicker(title, items, renderFn, onPick, showClear, groupFn) {
  $('picker-search').value = '';
  $('picker-search').placeholder = 'Search ' + title + '…';
  $('picker-clear-row').style.display = showClear ? '' : 'none';
  const draw = q => {
    const box = $('picker-list');
    box.innerHTML = '';
    const ql = (q || '').toLowerCase();
    const match = it => !q || renderFn(it).toLowerCase().includes(ql);
    const addBtn = it => {
      const b = document.createElement('button');
      b.className = 'picker-item';
      b.innerHTML = renderFn(it);
      b.addEventListener('click', () => { closePicker(); onPick(it); });
      return b;
    };
    if (!groupFn) {
      items.filter(match).slice(0, 200).forEach(it => box.appendChild(addBtn(it)));
    } else {
      Archetypes.ORDER.forEach(a => {
        const list = items.filter(it => groupFn(it)[0] === a && match(it));
        if (!list.length) return;
        const meta = Archetypes.META[a];
        const det = document.createElement('details');
        det.className = 'arch-group';
        det.open = true;
        const sum = document.createElement('summary');
        sum.innerHTML = `<span class="arch-ico">${meta.icon}</span>` +
          `<span class="arch-name">${meta.name}</span>` +
          `<span class="arch-count">${list.length}</span>` +
          `<span class="arch-blurb">${esc(meta.blurb)}</span>`;
        det.appendChild(sum);
        list.slice(0, 200).forEach(it => det.appendChild(addBtn(it)));
        box.appendChild(det);
      });
    }
  };
  $('picker-search').oninput = e => draw(e.target.value);
  draw('');
  $('picker-modal').hidden = false;
}
function closePicker() { $('picker-modal').hidden = true; }
$('picker-close').addEventListener('click', closePicker);
$('picker-modal').addEventListener('click', e => { if (e.target === $('picker-modal')) closePicker(); });

/* ---------------- step 2: weapon slots ---------------- */
function slotLabel(slot) {
  const pos = slot.position.replace(/_/g, ' ');
  return slot.index > 0 ? `${pos} ${slot.index + 1}` : pos;
}
function weaponPickerMeta(w) {
  return `${esc(w.type || '')} · ${w.damage_per_shot ? fmt(w.damage_per_shot) + ' dmg' : '? dmg'} · ${w.reload_time_s ? w.reload_time_s + 's reload' : '? reload'}${w.range_m ? ' · ' + w.range_m + 'm' : ''}`;
}
function renderWeaponSlots() {
  const has = !!S.loadout;
  $('build-no-ship').hidden = has;
  $('weapon-slots').innerHTML = '';
  if (!has) return;
  const L = S.loadout;
  ensureMinorSlots();
  L.weaponSlots.forEach((slot, i) => {
    const w = slot.weapon;
    const d = document.createElement('div');
    d.className = 'slot' + (w ? ' filled' : '');
    d.innerHTML = `<span class="slot-pos">${esc(slotLabel(slot))}</span>
      <span class="slot-name">${w ? esc(w.name) + estBadge(w.estimated) : '<span style="color:var(--ink-dim)">Tap to pick a weapon</span>'}
      ${w ? `<span class="slot-sub">${weaponPickerMeta(w)}${slot.ascension.tier !== 'none' ? ' · ' + esc(slot.ascension.tier) : ''}</span>` : ''}</span>
      ${w ? '<span class="slot-edit">edit</span>' : ''}`;
    d.addEventListener('click', () => {
      const items = DB.weaponsForSlot(slot.position);
      openPicker('weapons that fit here', items,
        it => `<div class="pname">${esc(it.name)}${estBadge(it.estimated)} ${Archetypes.chips(Archetypes.weaponArchetypes(it))}</div><div class="pmeta">${weaponPickerMeta(it)}</div>`,
        it => { slot.weapon = it; refreshNumbers(); },
        true,
        it => Archetypes.weaponArchetypes(it));
      $('picker-clear').onclick = () => { slot.weapon = null; closePicker(); refreshNumbers(); };
    });
    d.querySelector('.slot-edit')?.addEventListener('click', e => { e.stopPropagation(); openWeaponEditor(i); });
    $('weapon-slots').appendChild(d);
  });
}

/* weapon detail editor (unchanged fields from v1) */
function openWeaponEditor(slotIdx) {
  const slot = S.loadout.weaponSlots[slotIdx];
  const w = slot.weapon;
  $('weapon-modal-title').textContent = w.name;
  const body = $('weapon-modal-body');
  const tiers = ['none', 'basic', 'advanced', 'special', 'mythic'];
  body.innerHTML = `
    <div class="perk-text">${esc((w.perks || []).join('\n')) || 'No perk text in data.'}
${(w.status_effects || []).map(s => 'Status: ' + s.effect + (s.application ? ' — ' + s.application : '')).join('\n')}</div>
    <div class="field"><label>Shots per volley <span class="hint">(data doesn't track this — set per weapon)</span></label>
      <input id="we-shots" type="number" min="1" max="40" value="${slot.shotsPerVolley}"></div>
    <div class="field"><label>Ascension tier</label>
      <select id="we-tier">${tiers.map(t => `<option value="${t}"${slot.ascension.tier === t ? ' selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
    <div class="field"><label>Ascension flat damage / shot</label>
      <input id="we-flat" type="number" step="1" value="${slot.ascension.flat || 0}"></div>
    <div class="field"><label>Ascension % damage (decimal, e.g. 0.15)</label>
      <input id="we-pct" type="number" step="0.01" value="${slot.ascension.pct || 0}"></div>
    <div class="field"><label>Assumed extra status DPS <span class="hint">(for unmodeled damage-over-time)</span></label>
      <input id="we-status" type="number" step="1" value="${slot.extraStatusDps || 0}"></div>
    <div class="field"><label>Custom modifiers <span class="hint">(bonus type / decimal / applies to)</span></label>
      <div id="we-mods"></div>
      <button id="we-addmod" class="btn">+ Add modifier</button></div>
    <button id="we-done" class="btn btn-primary">Done</button>`;
  const modsBox = body.querySelector('#we-mods');
  const modRow = (m) => {
    const r = document.createElement('div');
    r.className = 'mod-row';
    r.innerHTML = `<select>${Calc.POOLS.map(p => `<option${m.pool === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
      <input type="number" step="0.01" placeholder="0.15" value="${m.value || ''}">
      <input type="text" placeholder="applies to…" value="${esc(m.appliesTo || 'all')}">
      <button class="btn btn-danger">✕</button>`;
    r.querySelector('.btn-danger').addEventListener('click', () => r.remove());
    modsBox.appendChild(r);
  };
  (slot.customMods || []).forEach(modRow);
  body.querySelector('#we-addmod').addEventListener('click', () => modRow({ pool: 'weaponDamage', value: '', appliesTo: 'all' }));
  body.querySelector('#we-done').addEventListener('click', () => {
    slot.shotsPerVolley = Math.max(1, +body.querySelector('#we-shots').value || 1);
    slot.ascension = {
      tier: body.querySelector('#we-tier').value,
      flat: +body.querySelector('#we-flat').value || 0,
      pct: +body.querySelector('#we-pct').value || 0,
    };
    slot.extraStatusDps = +body.querySelector('#we-status').value || 0;
    slot.customMods = [...modsBox.querySelectorAll('.mod-row')].map(r => ({
      pool: r.querySelector('select').value,
      value: +r.querySelectorAll('input')[0].value || 0,
      appliesTo: r.querySelectorAll('input')[1].value || 'all',
    })).filter(m => m.value);
    $('weapon-modal').hidden = true;
    refreshNumbers();
  });
  $('weapon-modal').hidden = false;
}
$('weapon-close').addEventListener('click', () => $('weapon-modal').hidden = true);
$('weapon-modal').addEventListener('click', e => { if (e.target === $('weapon-modal')) $('weapon-modal').hidden = true; });

/* ---------------- step 3: damage (live) ---------------- */
function quickResult() {
  if (!S.loadout || !filledCount()) return null;
  return Calc.loadoutDps(S.loadout, buildCtx());
}
function renderQuickDps() {
  const r = quickResult();
  const has = !!r;
  $('qdps-empty').hidden = has;
  $('qdps-main').hidden = !has;
  // step-3 nav state
  document.querySelector('[data-step="step-3"]').classList.toggle('done', has);
  document.querySelector('[data-step="step-1"]').classList.toggle('done', !!S.loadout);
  document.querySelector('[data-step="step-2"]').classList.toggle('done', filledCount() > 0);
  if (!has) return;
  $('qdps-total').textContent = fmt(r.sustainedDps);
  $('qdps-alpha').textContent = fmt(r.broadsideAlpha);
  const box = $('qdps-breakdown');
  box.innerHTML = '';
  r.weapons.forEach(w => {
    const d = document.createElement('div');
    d.className = 'dps-row';
    d.innerHTML = `<span class="wdps">${fmt(w.dps)} <small>dps</small></span>
      <div class="wname">${esc(w.name)}${estBadge(w.estimated)} <small>· ${esc(w.position.replace(/_/g, ' '))}${w.tier !== 'none' ? ' · ' + esc(w.tier) : ''}</small></div>
      <div class="wstats">volley ${fmt(w.volleyDamage)} · reload cycle ${w.cycle}s${w.statusDps ? ' · status ' + fmt(w.statusDps) : ''}</div>
      ${w.notes.length ? `<div class="wstats">⚠ ${w.notes.map(esc).join(' · ')}</div>` : ''}`;
    box.appendChild(d);
  });
  if (r.unparsedFurniture.length) {
    const n = document.createElement('div');
    n.className = 'notice small';
    n.innerHTML = `These furniture pieces have no structured numbers and added <strong>nothing</strong> to the calc — tune them in the Tune tab: ${r.unparsedFurniture.map(esc).join(', ')}`;
    box.prepend(n);
  }
}

/* ---------------- status bar ---------------- */
function renderStatusBar() {
  const bar = $('build-status');
  if (!S.loadout) { bar.hidden = true; return; }
  bar.hidden = false;
  const ship = DB.shipByName(S.loadout.shipName);
  const n = filledCount();
  const total = S.loadout.weaponSlots.length;
  const r = quickResult();
  bar.innerHTML = `<span class="ship-ico">${ship ? shipIcon(ship) : '⛵'}</span>
    <span><strong>${esc(S.loadout.shipName)}</strong> · ${n}/${total} guns</span>
    ${r ? `<span class="live-dps">${fmt(r.sustainedDps)} dps</span>` : ''}`;
}

function renderBuildAll() {
  renderStatusBar();
  renderWeaponSlots();
  renderQuickDps();
}
function refreshNumbers() {
  renderBuildAll();
}

/* ---------------- Tune tab: loadout save/load (unchanged from v1) ---------------- */
function getSaved() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function setSaved(o) { localStorage.setItem(LS_KEY, JSON.stringify(o)); }
$('btn-save-loadout').addEventListener('click', () => {
  if (!S.loadout) return;
  const all = getSaved();
  all[S.loadout.name || 'Unnamed'] = S.loadout;
  setSaved(all);
  renderSavedList();
  refreshCompareSelects();
});
$('btn-load-loadout').addEventListener('click', () => {
  const box = $('saved-list');
  box.hidden = !box.hidden;
  if (!box.hidden) renderSavedList();
});
function renderSavedList() {
  const box = $('saved-list');
  const all = getSaved();
  box.innerHTML = '';
  Object.keys(all).forEach(name => {
    const c = document.createElement('span');
    c.className = 'saved-chip';
    c.innerHTML = `${esc(name)} <span class="del">✕</span>`;
    c.addEventListener('click', e => {
      if (e.target.classList.contains('del')) {
        const a2 = getSaved(); delete a2[name]; setSaved(a2); renderSavedList(); refreshCompareSelects();
      } else {
        S.loadout = all[name];
        renderShips($('ship-search').value, $('ship-class-filter').value);
        switchTab('build');
        renderBuildAll();
      }
    });
    box.appendChild(c);
  });
  if (!Object.keys(all).length) box.innerHTML = '<span class="hint">No saved loadouts yet.</span>';
}

/* ---------------- Tune tab: furniture (unchanged logic from v1) ---------------- */
$('minor-slot-count').addEventListener('change', e => {
  if (!S.loadout) return;
  S.loadout.minorSlots = Math.max(0, Math.min(8, +e.target.value || 0));
  renderFurniture();
  refreshNumbers();
});
function renderFurniture() {
  const has = !!S.loadout;
  $('adv-no-loadout').hidden = has;
  $('adv-loadout').hidden = !has;
  const fs = $('furniture-slots');
  fs.innerHTML = '';
  if (!has) { $('minor-slot-count').value = 4; return; }
  const L = S.loadout;
  ensureMinorSlots();
  $('minor-slot-count').value = L.minorSlots;
  L.furniture.forEach((f, i) => {
    const it = f.item;
    const d = document.createElement('div');
    d.className = 'slot' + (it ? ' filled' : '');
    d.innerHTML = `<span class="slot-pos">${f.kind === 'major' ? '★ Major' : 'Minor'}</span>
      <span class="slot-name">${it ? esc(it.name) + estBadge(it.estimated) : '<span style="color:var(--ink-dim)">Tap to pick furniture</span>'}
      ${it ? `<span class="slot-sub">${esc((it.perk_text || '').slice(0, 90))}…</span>` : ''}</span>
      ${it ? '<span class="slot-edit">edit</span>' : ''}`;
    d.addEventListener('click', () => {
      const items = DB.furniture.filter(x => (x.tier || '').toLowerCase() === f.kind);
      openPicker('furniture', items,
        x => `<div class="pname">${esc(x.name)}${estBadge(x.estimated)} ${Archetypes.chips(Archetypes.furnitureArchetypes(x))}</div><div class="pmeta">${esc(x.tier || '')} · ${esc((x.perk_text || '').slice(0, 110))}…</div>`,
        x => { f.item = x; renderFurniture(); refreshNumbers(); },
        true,
        x => Archetypes.furnitureArchetypes(x));
      $('picker-clear').onclick = () => { f.item = null; f.customMods = []; closePicker(); renderFurniture(); refreshNumbers(); };
    });
    d.querySelector('.slot-edit')?.addEventListener('click', e => { e.stopPropagation(); openFurnitureEditor(i); });
    fs.appendChild(d);
  });
}

/* furniture detail editor (unchanged logic from v1) */
function openFurnitureEditor(fIdx) {
  const f = S.loadout.furniture[fIdx];
  $('weapon-modal-title').textContent = f.item.name;
  const body = $('weapon-modal-body');
  const known = Calc.templateFor(f.item.name);
  body.innerHTML = `
    <div class="perk-text">${esc(f.item.perk_text || '')}</div>
    ${known.length ? `<div class="notice small">Known bonuses auto-applied:<br>${known.map(m => '• ' + esc(m.note)).join('<br>')}</div>`
      : `<div class="notice small">No structured numbers for this piece — add custom modifiers below (bonus type / decimal / applies to).</div>`}
    <div class="field"><label>Custom modifiers</label>
      <div id="we-mods"></div>
      <button id="we-addmod" class="btn">+ Add modifier</button></div>
    <button id="we-done" class="btn btn-primary">Done</button>`;
  const modsBox = body.querySelector('#we-mods');
  const modRow = (m) => {
    const r = document.createElement('div');
    r.className = 'mod-row';
    r.innerHTML = `<select>${Calc.POOLS.map(p => `<option${m.pool === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
      <input type="number" step="0.01" placeholder="0.15" value="${m.value || ''}">
      <input type="text" placeholder="applies to…" value="${esc(m.appliesTo || 'all')}">
      <button class="btn btn-danger">✕</button>`;
    r.querySelector('.btn-danger').addEventListener('click', () => r.remove());
    modsBox.appendChild(r);
  };
  (f.customMods || []).forEach(modRow);
  body.querySelector('#we-addmod').addEventListener('click', () => modRow({ pool: 'weaponDamage', value: '', appliesTo: 'all' }));
  body.querySelector('#we-done').addEventListener('click', () => {
    f.customMods = [...modsBox.querySelectorAll('.mod-row')].map(r => ({
      pool: r.querySelector('select').value,
      value: +r.querySelectorAll('input')[0].value || 0,
      appliesTo: r.querySelectorAll('input')[1].value || 'all',
    })).filter(m => m.value);
    $('weapon-modal').hidden = true;
    refreshNumbers();
  });
  $('weapon-modal').hidden = false;
}

/* ---------------- Tune tab: season buffs (unchanged logic from v1) ---------------- */
function renderBuffs() {
  const sd = DB.meta.season_dates;
  $('season-dates').textContent = sd ? `${sd.start} → ${sd.end}` : '';
  const box = $('buff-list');
  box.innerHTML = '';
  DB.seasonalNodes().forEach(n => {
    const d = document.createElement('div');
    d.className = 'buff-card';
    const on = !!S.buffs[n.name];
    d.innerHTML = `<div class="buff-info"><h3>${esc(n.name)}${n.type === 'mechanic' ? '' : estBadge(n.confidence !== 'confirmed')}</h3>
      <p>${esc(n.description || '')}</p>
      ${n.stacking_note ? `<p><em>Stacking: ${esc(n.stacking_note)}</em></p>` : ''}</div>
      <label class="switch"><input type="checkbox"${on ? ' checked' : ''} aria-label="${esc(n.name)}"><span class="slider"></span></label>`;
    d.querySelector('input').addEventListener('change', e => { S.buffs[n.name] = e.target.checked; refreshNumbers(); });
    box.appendChild(d);
  });
}

/* ---------------- Tune tab: mastery (unchanged logic from v1) ---------------- */
const MASTERY_PERKS = [
  { key: 'relentlessForce', name: 'Relentless Force', unlock: 10, desc: 'Generate 1 Impetus per 8 weapon hits (32 for demi-cannons), max 10 stacks. Generating Impetus: +15% weapon damage & +15% repair for 5s.' },
  { key: 'weaknessFinder', name: 'Weakness Finder', unlock: 30, desc: 'Generating Impetus: 20% chance to convert any shot into a weakpoint hit for 5s.' },
  { key: 'firepowerOrder', name: 'Firepower Order', unlock: 50, desc: 'At 10 Impetus, fire an auxiliary weapon to consume all 10: every hit becomes a weakpoint hit for 8s.' },
];
function masteryUsed() {
  return Object.keys(MASTERY_COSTS).reduce((a, k) => a + (S.mastery[k] ? MASTERY_COSTS[k] : 0), 0);
}
function renderMastery() {
  const used = masteryUsed();
  $('mastery-used').textContent = used;
  $('mastery-fill').style.width = Math.min(100, used / 90 * 100) + '%';
  const box = $('mastery-list');
  box.innerHTML = '';
  MASTERY_PERKS.forEach(p => {
    const d = document.createElement('div');
    d.className = 'buff-card';
    const on = !!S.mastery[p.key];
    d.innerHTML = `<div class="buff-info"><h3>${esc(p.name)} <span class="hint">unlock ${p.unlock} · costs ${MASTERY_COSTS[p.key]} pts</span></h3><p>${esc(p.desc)}</p></div>
      <label class="switch"><input type="checkbox"${on ? ' checked' : ''} aria-label="${esc(p.name)}"><span class="slider"></span></label>`;
    d.querySelector('input').addEventListener('change', e => {
      if (e.target.checked && masteryUsed() + MASTERY_COSTS[p.key] > 90) {
        e.target.checked = false;
        alert('That would exceed the 90-point cap.');
        return;
      }
      S.mastery[p.key] = e.target.checked;
      renderMastery();
      refreshNumbers();
    });
    box.appendChild(d);
  });
}

/* ---------------- Tune tab: stacking (unchanged logic from v1) ---------------- */
const POOL_INFO = {
  weaponDamage: ['Weapon damage %', 'Furniture / mastery / ascension % damage bonuses'],
  secondaryDamage: ['Secondary damage %', 'Status & secondary-damage bonuses'],
  reload: ['Reload reduction %', 'How multiple -% reload sources combine'],
};
function renderStacking() {
  const box = $('stacking-toggles');
  box.innerHTML = '';
  Object.keys(POOL_INFO).forEach(pool => {
    const [title, sub] = POOL_INFO[pool];
    const row = document.createElement('div');
    row.className = 'stack-row';
    row.innerHTML = `<div class="stack-name">${title}<small>${sub}</small></div>`;
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', title);
    ['additive', 'multiplicative'].forEach(mode => {
      const b = document.createElement('button');
      b.textContent = mode === 'additive' ? 'Additive' : 'Multipl.';
      b.className = S.stacking[pool] === mode ? 'on' : '';
      b.setAttribute('aria-pressed', S.stacking[pool] === mode ? 'true' : 'false');
      b.addEventListener('click', () => { S.stacking[pool] = mode; renderStacking(); refreshNumbers(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    box.appendChild(row);
  });
}

/* ---------------- Tune tab: compare (unchanged logic from v1) ---------------- */
function refreshCompareSelects() {
  const all = getSaved();
  const names = Object.keys(all);
  if (S.loadout) names.unshift('« current: ' + (S.loadout.name || 'Unnamed') + ' »');
  [$('compare-a'), $('compare-b')].forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = names.map(n => `<option${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  });
}
function resolveCompareLoadout(label) {
  if (!label) return null;
  if (label.startsWith('« current:')) return S.loadout;
  return getSaved()[label] || null;
}
$('btn-compare').addEventListener('click', () => {
  const a = resolveCompareLoadout($('compare-a').value);
  const b = resolveCompareLoadout($('compare-b').value);
  const box = $('compare-result');
  if (!a || !b) { box.innerHTML = '<span class="hint">Pick two loadouts.</span>'; return; }
  const r = Calc.compare(a, b, buildCtx());
  const cls = v => v >= 0 ? 'win' : 'lose';
  const sign = v => (v >= 0 ? '+' : '') + v + '%';
  box.innerHTML = `<div class="dps-row">
    <div class="wname">${esc(r.a.name)} vs ${esc(r.b.name)}</div>
    <div class="wstats">Damage per second: ${fmt(r.a.sustainedDps)} vs ${fmt(r.b.sustainedDps)}
      → <span class="${cls(r.sustainedDeltaPct)}">${sign(r.sustainedDeltaPct)}</span></div>
    <div class="wstats">Broadside alpha: ${fmt(r.a.broadsideAlpha)} vs ${fmt(r.b.broadsideAlpha)}
      → <span class="${cls(r.alphaDeltaPct)}">${sign(r.alphaDeltaPct)}</span></div>
    <div class="wstats">Relative numbers — armor cancels out, so these are the trustworthy ones.</div>
  </div>`;
});

/* ---------------- Tune tab: data reference ---------------- */
function renderReference() {
  const m = DB.meta;
  $('data-verified-line').textContent =
    `Game data last checked — weapons ${m.weapons_verified || '?'}, ships ${m.ships_verified || '?'}, furniture ${m.furniture_verified || '?'}.`;

  // status effects
  const ref = DB.statusReference();
  $('status-ref-table').innerHTML = '<table><tr><th>Effect</th><th>What it does</th></tr>' +
    Object.keys(ref).map(k => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(ref[k])}</td></tr>`).join('') + '</table>';

  const drawShips = q => {
    $('ref-ship-table').innerHTML = '<table><tr><th>Ship</th><th>Class</th><th>Hull</th><th>Speed</th><th>Gun pos.</th></tr>' +
      DB.ships.filter(s => s.playable !== false)
        .filter(s => !q || (s.name + ' ' + (s.class || '')).toLowerCase().includes(q.toLowerCase()))
        .map(s => `<tr><td><strong>${esc(s.name)}</strong>${estBadge(s.estimated)}</td><td>${esc(s.class || '—')}</td>` +
          `<td class="num">${s.hull ? fmt(s.hull) : '—'}</td><td class="num">${s.speed_kn != null ? s.speed_kn + ' kn' : '—'}</td>` +
          `<td class="num">${(s.weapon_slots || []).length}</td></tr>`).join('') + '</table>';
  };
  const drawWeapons = q => {
    $('ref-weapon-table').innerHTML = '<table><tr><th>Weapon</th><th>Type</th><th>Dmg/shot</th><th>Reload</th><th>Range</th></tr>' +
      DB.weapons
        .filter(w => !q || (w.name + ' ' + (w.type || '') + ' ' + (w.family || '')).toLowerCase().includes(q.toLowerCase()))
        .map(w => `<tr><td><strong>${esc(w.name)}</strong>${estBadge(w.estimated)}</td><td>${esc(w.type || '—')}</td>` +
          `<td class="num">${w.damage_per_shot ? fmt(w.damage_per_shot) : '—'}</td>` +
          `<td class="num">${w.reload_time_s ? w.reload_time_s + 's' : '—'}</td>` +
          `<td class="num">${w.range_m ? w.range_m + 'm' : '—'}</td></tr>`).join('') + '</table>';
  };
  drawShips(''); drawWeapons('');
  $('ref-ship-search').oninput = e => drawShips(e.target.value);
  $('ref-weapon-search').oninput = e => drawWeapons(e.target.value);
}

/* ---------------- render advanced tab ---------------- */
function renderAdvanced() {
  renderFurniture();
  renderBuffs();
  renderMastery();
  renderStacking();
  renderSavedList();
  refreshCompareSelects();
}

/* ---------------- boot ---------------- */
(async function boot() {
  try {
    await DB.load();
  } catch (err) {
    document.getElementById('main').innerHTML =
      '<div class="notice">Failed to load game data: ' + esc(err.message) + '</div>';
    return;
  }
  try {
    if (!localStorage.getItem(ONBOARD_KEY)) $('onboard-card').hidden = false;
  } catch {}
  S.stacking = Calc.defaultStacking();
  renderShips();
  renderTemplates();
  renderBuildAll();
  renderReference();
  renderAdvanced();
})();
