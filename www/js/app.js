/* SnB Loadouts — app UI logic. */
'use strict';

const S = {
  loadout: null,          // { name, shipName, weaponSlots[], furniture[], minorSlots }
  buffs: {},              // seasonal node name -> bool
  mastery: { relentlessForce: false, weaknessFinder: false, firepowerOrder: false },
  stacking: null,
  assumptions: { rangeM: 300, weakpointRate: 20, weakpointBonus: 50, impetusUptime: 0.5, firepowerOrderUptime: 0.15, stormstruckArcs: 2 },
};

const MASTERY_COSTS = { relentlessForce: 10, weaknessFinder: 30, firepowerOrder: 50 };
const LS_KEY = 'snb-loadouts-v1';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const estBadge = flag => flag ? '<span class="est-badge" title="Unverified — community number, confirm in game">est.</span>' : '';

/* ---------------- tabs ---------------- */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('tab-' + t.dataset.tab).classList.add('active');
  if (t.dataset.tab === 'dps') renderDps();
  if (t.dataset.tab === 'builder') renderBuilder();
}));

/* ---------------- loadout model ---------------- */
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

/* ---------------- ships tab ---------------- */
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
      d.className = 'card';
      d.innerHTML = `<h3>${esc(s.name)}${estBadge(s.estimated)}</h3>
        <div class="meta">${esc(s.class || '')} · ${esc(s.size || '')} · ${esc(s.role || '')}</div>
        <div class="stats">
          <span class="stat">Hull <b>${s.hull ? s.hull.toLocaleString() : '—'}</b></span>
          <span class="stat">Speed <b>${s.speed_kn != null ? s.speed_kn + ' kn' : '—'}</b></span>
          <span class="stat">Guns <b>${(s.weapon_slots || []).length}</b></span>
        </div>`;
      d.addEventListener('click', () => {
        S.loadout = newLoadout(s.name);
        ensureMinorSlots();
        document.querySelector('[data-tab="builder"]').click();
      });
      list.appendChild(d);
    });
}

/* ---------------- generic picker modal ---------------- */
let pickerOnPick = null;
function openPicker(title, items, renderFn, onPick, showClear) {
  pickerOnPick = onPick;
  $('picker-search').value = '';
  $('picker-search').placeholder = 'Search ' + title + '…';
  $('picker-clear-row').style.display = showClear ? '' : 'none';
  const draw = q => {
    const box = $('picker-list');
    box.innerHTML = '';
    items
      .filter(it => !q || renderFn(it).toLowerCase().includes(q.toLowerCase()))
      .slice(0, 200)
      .forEach(it => {
        const b = document.createElement('button');
        b.className = 'picker-item';
        b.innerHTML = renderFn(it);
        b.addEventListener('click', () => { closePicker(); onPick(it); });
        box.appendChild(b);
      });
  };
  $('picker-search').oninput = e => draw(e.target.value);
  draw('');
  $('picker-modal').hidden = false;
}
function closePicker() { $('picker-modal').hidden = true; pickerOnPick = null; }
$('picker-close').addEventListener('click', closePicker);
$('picker-modal').addEventListener('click', e => { if (e.target === $('picker-modal')) closePicker(); });

/* ---------------- builder ---------------- */
function slotLabel(slot) {
  const pos = slot.position.replace(/_/g, ' ');
  return slot.index > 0 ? `${pos} ${slot.index + 1}` : pos;
}

function renderBuilder() {
  const has = !!S.loadout;
  $('builder-empty').hidden = has;
  $('builder-main').hidden = !has;
  if (!has) return;
  const L = S.loadout;
  $('loadout-name').value = L.name || '';
  ensureMinorSlots();

  // weapon slots
  const ws = $('weapon-slots');
  ws.innerHTML = '';
  L.weaponSlots.forEach((slot, i) => {
    const w = slot.weapon;
    const d = document.createElement('div');
    d.className = 'slot' + (w ? ' filled' : '');
    d.innerHTML = `<span class="slot-pos">${esc(slotLabel(slot))}</span>
      <span class="slot-name">${w ? esc(w.name) + estBadge(w.estimated) : '<span style="color:var(--ink-dim)">— empty —</span>'}
      ${w ? `<span class="slot-sub">${esc(w.type || '')}${slot.ascension.tier !== 'none' ? ' · ' + esc(slot.ascension.tier) : ''} · ${slot.shotsPerVolley}/volley</span>` : ''}</span>
      ${w ? '<span class="slot-edit">edit</span>' : ''}`;
    d.addEventListener('click', () => {
      const ship = DB.shipByName(L.shipName);
      const items = DB.weaponsForSlot(slot.position);
      openPicker('weapons', items,
        it => `<div class="pname">${esc(it.name)}${estBadge(it.estimated)}</div><div class="pmeta">${esc(it.type || '')} · ${it.damage_per_shot ? it.damage_per_shot.toLocaleString() + ' dmg' : '? dmg'} · ${it.reload_time_s ? it.reload_time_s + 's reload' : '? reload'} · ${it.range_m ? it.range_m + 'm' : ''}</div>`,
        it => { slot.weapon = it; renderBuilder(); },
        true);
      $('picker-clear').onclick = () => { slot.weapon = null; closePicker(); renderBuilder(); };
    });
    // long-press / edit button opens the detail editor instead of re-picking
    d.querySelector('.slot-edit')?.addEventListener('click', e => { e.stopPropagation(); openWeaponEditor(i); });
    ws.appendChild(d);
  });

  // furniture slots
  const fs = $('furniture-slots');
  fs.innerHTML = '';
  $('minor-slot-count').value = L.minorSlots;
  L.furniture.forEach((f, i) => {
    const it = f.item;
    const d = document.createElement('div');
    d.className = 'slot' + (it ? ' filled' : '');
    d.innerHTML = `<span class="slot-pos">${f.kind === 'major' ? '★ Major' : 'Minor'}</span>
      <span class="slot-name">${it ? esc(it.name) + estBadge(it.estimated) : '<span style="color:var(--ink-dim)">— empty —</span>'}
      ${it ? `<span class="slot-sub">${esc((it.perk_text || '').slice(0, 90))}…</span>` : ''}</span>
      ${it ? '<span class="slot-edit">edit</span>' : ''}`;
    d.addEventListener('click', () => {
      const items = DB.furniture.filter(x => (x.tier || '').toLowerCase() === f.kind);
      openPicker('furniture', items,
        x => `<div class="pname">${esc(x.name)}${estBadge(x.estimated)}</div><div class="pmeta">${esc(x.tier || '')} · ${esc((x.perk_text || '').slice(0, 110))}…</div>`,
        x => { f.item = x; renderBuilder(); },
        true);
      $('picker-clear').onclick = () => { f.item = null; f.customMods = []; closePicker(); renderBuilder(); };
    });
    d.querySelector('.slot-edit')?.addEventListener('click', e => { e.stopPropagation(); openFurnitureEditor(i); });
    fs.appendChild(d);
  });

  renderStacking();
}

$('minor-slot-count').addEventListener('change', e => {
  if (!S.loadout) return;
  S.loadout.minorSlots = Math.max(0, Math.min(8, +e.target.value || 0));
  renderBuilder();
});
$('loadout-name').addEventListener('input', e => { if (S.loadout) S.loadout.name = e.target.value; });

/* stacking toggles */
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
    ['additive', 'multiplicative'].forEach(mode => {
      const b = document.createElement('button');
      b.textContent = mode === 'additive' ? 'Additive' : 'Multipl.';
      b.className = S.stacking[pool] === mode ? 'on' : '';
      b.addEventListener('click', () => { S.stacking[pool] = mode; renderStacking(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    box.appendChild(row);
  });
}

/* weapon detail editor */
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
    <div class="field"><label>Assumed extra status DPS <span class="hint">(for unmodeled DoTs)</span></label>
      <input id="we-status" type="number" step="1" value="${slot.extraStatusDps || 0}"></div>
    <div class="field"><label>Custom modifiers <span class="hint">(pool / value / applies-to)</span></label>
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
    renderBuilder();
  });
  $('weapon-modal').hidden = false;
}
$('weapon-close').addEventListener('click', () => $('weapon-modal').hidden = true);
$('weapon-modal').addEventListener('click', e => { if (e.target === $('weapon-modal')) $('weapon-modal').hidden = true; });

/* furniture detail editor (custom modifiers for unparsed perk text) */
function openFurnitureEditor(fIdx) {
  const f = S.loadout.furniture[fIdx];
  $('weapon-modal-title').textContent = f.item.name;
  const body = $('weapon-modal-body');
  const known = Calc.templateFor(f.item.name);
  body.innerHTML = `
    <div class="perk-text">${esc(f.item.perk_text || '')}</div>
    ${known.length ? `<div class="notice small">Known modifiers auto-applied:<br>${known.map(m => '• ' + esc(m.note)).join('<br>')}</div>`
      : `<div class="notice small">No structured numbers for this piece — add custom modifiers below (pool / decimal / applies-to).</div>`}
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
    renderBuilder();
  });
  $('weapon-modal').hidden = false;
}

/* ---------------- save / load ---------------- */
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
        document.querySelector('[data-tab="builder"]').click();
      }
    });
    box.appendChild(c);
  });
  if (!Object.keys(all).length) box.innerHTML = '<span class="hint">No saved loadouts yet.</span>';
}

/* sample preset: Luke's Frigate "Help me?" */
$('btn-load-preset').addEventListener('click', () => {
  const L = newLoadout('Frigate');
  L.name = 'Help me? (preset)';
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
  document.querySelector('[data-tab="builder"]').click();
});

/* ---------------- seasonal buffs tab ---------------- */
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
      <label class="switch"><input type="checkbox"${on ? ' checked' : ''}><span class="slider"></span></label>`;
    d.querySelector('input').addEventListener('change', e => { S.buffs[n.name] = e.target.checked; });
    box.appendChild(d);
  });
}

/* ---------------- mastery tab ---------------- */
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
      <label class="switch"><input type="checkbox"${on ? ' checked' : ''}><span class="slider"></span></label>`;
    d.querySelector('input').addEventListener('change', e => {
      if (e.target.checked && masteryUsed() + MASTERY_COSTS[p.key] > 90) {
        e.target.checked = false;
        alert('That would exceed the 90-point cap.');
        return;
      }
      S.mastery[p.key] = e.target.checked;
      renderMastery();
    });
    box.appendChild(d);
  });
}

/* ---------------- assumptions ---------------- */
function readAssumptions() {
  S.assumptions.rangeM = +$('assume-range').value || 300;
  S.assumptions.weakpointRate = +$('assume-weakpoint').value || 0;
  S.assumptions.weakpointBonus = +$('assume-weakpoint-bonus').value || 0;
}
['assume-range', 'assume-weakpoint', 'assume-weakpoint-bonus'].forEach(id =>
  $(id).addEventListener('change', readAssumptions));

function buildCtx() {
  readAssumptions();
  return {
    stacking: S.stacking,
    mastery: { ...S.mastery },
    buffMods: [], // v1: documented seasonal nodes are informational; DPS-relevant ones live in Mastery
    assumptions: { ...S.assumptions },
  };
}

/* ---------------- DPS tab ---------------- */
function renderDps() {
  const has = !!(S.loadout && S.loadout.weaponSlots.some(s => s.weapon));
  $('dps-empty').hidden = has;
  $('dps-main').hidden = !has;
  if (!has) return;
  const ctx = buildCtx();
  const r = Calc.loadoutDps(S.loadout, ctx);
  $('dps-total').textContent = r.sustainedDps.toLocaleString();
  $('dps-alpha').textContent = r.broadsideAlpha.toLocaleString();
  const box = $('dps-breakdown');
  box.innerHTML = '';
  r.weapons.forEach(w => {
    const d = document.createElement('div');
    d.className = 'dps-row';
    d.innerHTML = `<span class="wdps">${w.dps.toLocaleString()} <small style="color:var(--ink-dim)">dps</small></span>
      <div class="wname">${esc(w.name)}${estBadge(w.estimated)} <small>· ${esc(w.position.replace(/_/g, ' '))} · ${esc(w.tier)}</small></div>
      <div class="wstats">volley ${w.volleyDamage.toLocaleString()} · cycle ${w.cycle}s · hit ${w.hitDps.toLocaleString()} + status ${w.statusDps.toLocaleString()}</div>
      ${w.notes.length ? `<div class="wstats">⚠ ${w.notes.map(esc).join(' · ')}</div>` : ''}`;
    box.appendChild(d);
  });
  if (r.unparsedFurniture.length) {
    const n = document.createElement('div');
    n.className = 'notice small';
    n.innerHTML = `These furniture pieces have no structured numbers and contributed <strong>nothing</strong> to the calc — add custom modifiers in the Builder: ${r.unparsedFurniture.map(esc).join(', ')}`;
    box.prepend(n);
  }
  refreshCompareSelects();
}

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
    <div class="wstats">Sustained: ${r.a.sustainedDps.toLocaleString()} vs ${r.b.sustainedDps.toLocaleString()}
      → <span class="${cls(r.sustainedDeltaPct)}">${sign(r.sustainedDeltaPct)}</span></div>
    <div class="wstats">Broadside alpha: ${r.a.broadsideAlpha.toLocaleString()} vs ${r.b.broadsideAlpha.toLocaleString()}
      → <span class="${cls(r.alphaDeltaPct)}">${sign(r.alphaDeltaPct)}</span></div>
    <div class="wstats">Relative numbers — armor cancels out, so these are the trustworthy ones.</div>
  </div>`;
});

/* ---------------- boot ---------------- */
$('ship-search').addEventListener('input', e => renderShips(e.target.value, $('ship-class-filter').value));
$('ship-class-filter').addEventListener('change', e => renderShips($('ship-search').value, e.target.value));

(async function boot() {
  try {
    await DB.load();
  } catch (err) {
    document.getElementById('main').innerHTML =
      '<div class="notice">Failed to load game data: ' + esc(err.message) + '</div>';
    return;
  }
  S.stacking = Calc.defaultStacking();
  renderShips();
  renderBuffs();
  renderMastery();
  renderSavedList();
})();
