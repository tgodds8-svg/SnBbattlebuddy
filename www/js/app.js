/* SnB Loadouts — Main UI Controller (Commercial & APK-Ready Edition) */
'use strict';

const S = {
  loadout: null,
  buffs: {},
  mastery: { relentlessForce: false, weaknessFinder: false, firepowerOrder: false },
  stacking: null,
  assumptions: {
    rangeM: 300,
    weakpointRate: 20,
    weakpointBonus: 50,
    impetusUptime: 0.5,
    firepowerOrderUptime: 0.15,
    stormstruckArcs: 2,
  },
};

const MASTERY_COSTS = { relentlessForce: 10, weaknessFinder: 30, firepowerOrder: 50 };
const LS_KEY = 'snb-loadouts-v1';
const ONBOARD_KEY = 'snb-v2-onboarded';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => (n == null ? '—' : Number(n).toLocaleString());

function itemBadge(item) {
  if (typeof Icons !== 'undefined' && Icons.verifiedBadge) return Icons.verifiedBadge(item);
  return item && item.estimated ? '<span class="est-badge" title="Community estimate">est.</span>' : '';
}

function shipVisual(ship) {
  if (typeof Icons !== 'undefined' && Icons.shipSvg) return Icons.shipSvg(ship);
  return '⛵';
}

function weaponVisual(w) {
  if (typeof Icons !== 'undefined' && Icons.weaponSvg) return Icons.weaponSvg(w);
  return '🔫';
}

function rarityCls(item) {
  return (typeof Icons !== 'undefined' && Icons.rarityClass) ? Icons.rarityClass(item) : '';
}

/* ---------------- navigation & tabs ---------------- */
function switchTab(name) {
  document.querySelectorAll('.btab').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = $('tab-' + name);
  if (panel) panel.classList.add('active');
  if (name === 'build') renderBuildAll();
  if (name === 'advanced') renderAdvanced();
  if (name === 'optimize' && typeof OptimizerUI !== 'undefined') OptimizerUI.init();
  window.scrollTo(0, 0);
}
document.querySelectorAll('.btab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

document.querySelectorAll('.step').forEach(st => st.addEventListener('click', () => {
  document.querySelectorAll('.step').forEach(x => x.classList.remove('active'));
  st.classList.add('active');
  const target = $(st.dataset.step);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

$('btn-goto-ships')?.addEventListener('click', () => document.querySelector('[data-step="step-1"]')?.click());
$('btn-goto-tune')?.addEventListener('click', () => switchTab('advanced'));
$('onboard-dismiss')?.addEventListener('click', () => {
  $('onboard-card').hidden = true;
  try { localStorage.setItem(ONBOARD_KEY, '1'); } catch {}
});

/* ---------------- loadout model ---------------- */
function blankSlot(position, index, ship) {
  return {
    position,
    index,
    weapon: null,
    shotsPerVolley: DB.defaultVolleyFor ? DB.defaultVolleyFor(ship, position) : 1,
    ascension: { tier: 'none', flat: 0, pct: 0 },
    customMods: [],
    extraStatusDps: 0,
  };
}

function newLoadout(shipName) {
  const ship = DB.shipByName(shipName);
  return {
    name: shipName + ' Build',
    shipName,
    armor: null,
    weaponSlots: DB.slotsForShip(ship).map(s => blankSlot(s.position, s.index, ship)),
    furniture: [{ kind: 'major', item: null, customMods: [] }],
    minorSlots: Math.max(0, ((ship && ship.furniture_slots && ship.furniture_slots.total) || 5) - 1),
  };
}

function ensureMinorSlots() {
  if (!S.loadout) return;
  const minors = S.loadout.furniture.filter(f => f.kind === 'minor');
  while (minors.length < S.loadout.minorSlots) {
    const f = { kind: 'minor', item: null, customMods: [] };
    S.loadout.furniture.push(f);
    minors.push(f);
  }
  while (minors.length > S.loadout.minorSlots) {
    const idx = S.loadout.furniture.map((f, i) => f.kind === 'minor' ? i : -1).filter(i => i >= 0).pop();
    if (idx >= 0) S.loadout.furniture.splice(idx, 1);
    minors.pop();
  }
}

function filledCount() {
  return S.loadout ? S.loadout.weaponSlots.filter(s => s.weapon).length : 0;
}

/* ---------------- context & assumptions ---------------- */
function readAssumptions() {
  if ($('assume-range')) S.assumptions.rangeM = +$('assume-range').value || 300;
  if ($('assume-weakpoint')) S.assumptions.weakpointRate = +$('assume-weakpoint').value || 0;
  if ($('assume-weakpoint-bonus')) S.assumptions.weakpointBonus = +$('assume-weakpoint-bonus').value || 0;
}
['assume-range', 'assume-weakpoint', 'assume-weakpoint-bonus'].forEach(id =>
  $(id)?.addEventListener('change', () => { readAssumptions(); refreshNumbers(); }));

function buildCtx() {
  readAssumptions();
  const treeBridge = (typeof Tree !== 'undefined' && Tree.getSelected)
    ? { includeTree: Tree.isApplied(), treeKeys: Tree.getSelected() }
    : { includeTree: false, treeKeys: [] };
  return {
    stacking: S.stacking || Calc.defaultStacking(),
    mastery: { ...S.mastery },
    buffMods: [],
    assumptions: { ...S.assumptions },
    ...treeBridge,
  };
}

/* ---------------- step 1: ships ---------------- */
function renderShips(filter = '', cls = '') {
  const list = $('ship-list');
  if (!list) return;
  const classes = [...new Set(DB.ships.map(s => s.class).filter(Boolean))].sort();
  const sel = $('ship-class-filter');
  if (sel && sel.options.length <= 1) {
    classes.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      sel.appendChild(o);
    });
  }
  list.innerHTML = '';
  DB.ships
    .filter(s => s.playable !== false)
    .filter(s => !filter || s.name.toLowerCase().includes(filter.toLowerCase()))
    .filter(s => !cls || s.class === cls)
    .forEach(s => {
      const d = document.createElement('div');
      d.className = 'card' + (S.loadout && S.loadout.shipName === s.name ? ' selected' : '');
      const guns = DB.slotsForShip(s).length;
      d.innerHTML = `<div class="card-top"><span class="card-ico ship-ico-wrap">${shipVisual(s)}</span>
        <div><h3>${esc(s.name)} ${itemBadge(s)}</h3>
        <div class="meta">${esc(s.class || '')}${s.role ? ' · ' + esc(s.role) : ''}</div></div></div>
        <div class="stats">
          <span class="stat">Hull <b>${s.hull ? fmt(s.hull) : '—'}</b></span>
          <span class="stat">Speed <b>${s.speed_kn != null ? s.speed_kn + ' kn' : '—'}</b></span>
          <span class="stat">Slots <b>${guns}</b></span>
        </div>`;
      d.addEventListener('click', () => selectShip(s.name));
      list.appendChild(d);
    });
}

function selectShip(name) {
  S.loadout = newLoadout(name);
  ensureMinorSlots();
  renderShips($('ship-search')?.value || '', $('ship-class-filter')?.value || '');
  renderBuildAll();
  document.querySelector('[data-step="step-2"]')?.click();
}
$('ship-search')?.addEventListener('input', e => renderShips(e.target.value, $('ship-class-filter')?.value || ''));
$('ship-class-filter')?.addEventListener('change', e => renderShips($('ship-search')?.value || '', e.target.value));

/* ---------------- templates ---------------- */
function renderTemplates() {
  const box = $('template-list');
  if (!box || typeof TEMPLATES === 'undefined') return;
  box.innerHTML = '';
  TEMPLATES.forEach(t => {
    const meta = Archetypes.META[t.archetype] || Archetypes.META.general;
    const d = document.createElement('button');
    d.className = 'template-card';
    const wnames = [...new Set((t.weapons || []).map(w => w.name))];
    const fnames = [t.armor, t.furniture && t.furniture.major, ...((t.furniture && t.furniture.minors) || [])].filter(Boolean);
    d.innerHTML = `<div class="t-head"><span class="arch-ico">${meta.icon}</span>
        <div><h3>${esc(t.name)}</h3><div class="meta">${esc(t.tagline)}</div></div></div>
      <p class="t-synergy">${esc(t.synergy)}</p>
      <div class="t-kit">${esc([...wnames, ...fnames].join(' · '))}</div>
      <span class="t-use">Load Template →</span>`;
    d.addEventListener('click', () => loadTemplate(t));
    box.appendChild(d);
  });
}

function loadTemplate(t) {
  const L = newLoadout(t.ship);
  L.name = t.name;
  if (t.armor) L.armor = DB.armorByName(t.armor);
  (t.weapons || []).forEach(spec => {
    const s = L.weaponSlots.find(x => x.position === spec.position && !x.weapon);
    if (!s) return;
    const w = DB.weaponByName(spec.name);
    if (w) { s.weapon = w; s.shotsPerVolley = spec.shots || s.shotsPerVolley; }
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
  renderShips($('ship-search')?.value || '', $('ship-class-filter')?.value || '');
  switchTab('build');
  document.querySelector('[data-step="step-2"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------------- picker modal ---------------- */
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
      b.className = 'picker-item ' + rarityCls(it);
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
        sum.innerHTML = `<span class="arch-ico">${meta.icon}</span><span class="arch-name">${meta.name}</span><span class="arch-count">${list.length}</span><span class="arch-blurb">${esc(meta.blurb)}</span>`;
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
$('picker-close')?.addEventListener('click', closePicker);
$('picker-modal')?.addEventListener('click', e => { if (e.target === $('picker-modal')) closePicker(); });

/* ---------------- step 2: weapon & armor slots ---------------- */
function slotLabel(slot) {
  const pos = slot.position.replace(/_/g, ' ');
  return slot.index > 0 ? `${pos} ${slot.index + 1}` : pos;
}

function weaponPickerMeta(w) {
  return `${esc(w.type || '')} · ${w.damage_per_shot ? fmt(w.damage_per_shot) + ' dmg' : '? dmg'} · ${w.reload_time_s ? w.reload_time_s + 's' : '? reload'}${w.range_m ? ' · ' + w.range_m + 'm' : ''}`;
}

function renderArmorSlot() {
  const box = $('armor-slot-box');
  if (!box) return;
  box.innerHTML = '';
  if (!S.loadout) return;
  const ar = S.loadout.armor;
  const d = document.createElement('div');
  d.className = 'slot ' + (ar ? 'filled ' + rarityCls(ar) : '');
  const mit = ar && ar.damage_mitigation
    ? Object.entries(ar.damage_mitigation).filter(([, v]) => v != null).map(([k, v]) => `${k} ${v}%`).join(' · ')
    : '';
  d.innerHTML = `<span class="slot-pos">🛡️ Hull Armor</span>
    <span class="slot-name">${ar ? esc(ar.name) + ' ' + itemBadge(ar) : '<span style="color:var(--ink-dim)">Tap to equip hull armor</span>'}
    ${ar ? `<span class="slot-sub">Armor ${ar.armor_value ? fmt(ar.armor_value) : '—'}${mit ? ' · ' + esc(mit) : ''}</span>` : ''}</span>`;
  d.addEventListener('click', () => {
    openPicker('hull armor', DB.armors,
      a => `<div class="pname">${esc(a.name)} ${itemBadge(a)}</div><div class="pmeta">${esc(a.category || '')} · Armor ${a.armor_value ? fmt(a.armor_value) : '—'} · ${esc((a.perks || [])[0] || '')}</div>`,
      a => { S.loadout.armor = a; refreshNumbers(); },
      true
    );
    $('picker-clear').onclick = () => { S.loadout.armor = null; closePicker(); refreshNumbers(); };
  });
  box.appendChild(d);
}

function renderWeaponSlots() {
  const has = !!S.loadout;
  if ($('build-no-ship')) $('build-no-ship').hidden = has;
  if ($('quick-swap-bar')) $('quick-swap-bar').hidden = !has;
  const box = $('weapon-slots');
  if (!box) return;
  box.innerHTML = '';
  if (!has) return;
  ensureMinorSlots();
  renderArmorSlot();

  S.loadout.weaponSlots.forEach((slot, i) => {
    const w = slot.weapon;
    const d = document.createElement('div');
    d.className = 'slot ' + (w ? 'filled ' + rarityCls(w) : '');
    d.innerHTML = `<span class="slot-pos">${esc(slotLabel(slot))}</span>
      ${w ? `<span class="w-ico-wrap">${weaponVisual(w)}</span>` : ''}
      <span class="slot-name">${w ? esc(w.name) + ' ' + itemBadge(w) : '<span style="color:var(--ink-dim)">Tap to equip weapon</span>'}
      ${w ? `<span class="slot-sub">${weaponPickerMeta(w)} · ×${slot.shotsPerVolley}${slot.ascension.tier !== 'none' ? ' · ' + esc(slot.ascension.tier) : ''}</span>` : ''}</span>
      ${w ? '<span class="slot-edit">tune</span>' : ''}`;
    d.addEventListener('click', () => {
      const items = DB.weaponsForSlot(slot.position);
      openPicker('weapons for ' + slotLabel(slot), items,
        it => `<div class="pname">${esc(it.name)} ${itemBadge(it)} ${Archetypes.chips(Archetypes.weaponArchetypes(it))}</div><div class="pmeta">${weaponPickerMeta(it)}</div>`,
        it => { slot.weapon = it; refreshNumbers(); },
        true,
        it => Archetypes.weaponArchetypes(it)
      );
      $('picker-clear').onclick = () => { slot.weapon = null; closePicker(); refreshNumbers(); };
    });
    d.querySelector('.slot-edit')?.addEventListener('click', e => { e.stopPropagation(); openWeaponEditor(i); });
    box.appendChild(d);
  });
}

/* Quick-swap: mirror port weapon onto starboard (and vice versa) */
$('btn-mirror-broadsides')?.addEventListener('click', () => {
  if (!S.loadout) return;
  const port = S.loadout.weaponSlots.find(s => s.position === 'broadside_port');
  const stbd = S.loadout.weaponSlots.find(s => s.position === 'broadside_starboard');
  if (!port || !stbd) return;
  const src = port.weapon ? port : stbd;
  const dst = port.weapon ? stbd : port;
  if (!src.weapon) return;
  dst.weapon = src.weapon;
  dst.shotsPerVolley = src.shotsPerVolley;
  dst.ascension = { ...src.ascension };
  dst.customMods = JSON.parse(JSON.stringify(src.customMods || []));
  dst.extraStatusDps = src.extraStatusDps || 0;
  refreshNumbers();
});

/* Share / Import Build Code */
$('btn-share-build')?.addEventListener('click', () => {
  if (!S.loadout) return;
  const payload = {
    n: S.loadout.name,
    s: S.loadout.shipName,
    a: S.loadout.armor ? S.loadout.armor.name : null,
    w: S.loadout.weaponSlots.map(sl => sl.weapon ? [sl.position, sl.weapon.name, sl.shotsPerVolley, sl.ascension] : null).filter(Boolean),
    f: S.loadout.furniture.map(fn => fn.item ? [fn.kind, fn.item.name] : null).filter(Boolean),
  };
  const code = 'SNB1:' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
  prompt('Copy your shareable build code:', code);
});

$('btn-import-build')?.addEventListener('click', () => {
  const raw = prompt('Paste a build code (SNB1:...):');
  if (!raw || !raw.trim().startsWith('SNB1:')) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(raw.trim().slice(5)))));
    const L = newLoadout(data.s);
    L.name = data.n || L.name;
    if (data.a) L.armor = DB.armorByName(data.a);
    (data.w || []).forEach(([pos, wname, shots, asc]) => {
      const slot = L.weaponSlots.find(x => x.position === pos && !x.weapon);
      const w = DB.weaponByName(wname);
      if (slot && w) {
        slot.weapon = w;
        slot.shotsPerVolley = shots || slot.shotsPerVolley;
        if (asc) slot.ascension = asc;
      }
    });
    if (data.f && data.f.length) {
      L.furniture = [];
      let minors = 0;
      data.f.forEach(([kind, fname]) => {
        const it = DB.furnitureByName(fname);
        L.furniture.push({ kind, item: it || null, customMods: [] });
        if (kind === 'minor') minors++;
      });
      L.minorSlots = Math.max(L.minorSlots, minors);
    }
    S.loadout = L;
    ensureMinorSlots();
    switchTab('build');
  } catch {
    alert('Invalid build code.');
  }
});

/* ---------------- weapon detail editor + verified card rolls ---------------- */
function openWeaponEditor(slotIdx) {
  const slot = S.loadout.weaponSlots[slotIdx];
  const w = slot.weapon;
  $('weapon-modal-title').textContent = w.name;
  const body = $('weapon-modal-body');
  const tiers = ['none', 'basic', 'advanced', 'special', 'mythic'];
  const rolls = w.player_rolls || [];

  body.innerHTML = `
    <div class="perk-text">${esc((w.perks || []).join('\n')) || 'No perk text in data.'}
${(w.status_effects || []).map(s => 'Status: ' + (typeof s === 'string' ? s : s.effect)).join('\n')}</div>
    ${rolls.length ? `<div class="field"><label>Verified Card Rolls <span class="hint">(tap to apply base damage)</span></label>
      <div class="saved-list">${rolls.map((r, ri) => `<button type="button" class="saved-chip" data-roll="${ri}">GS ${r.gear_score} · ${r.damage_per_shot || '?'} dmg</button>`).join('')}</div></div>` : ''}
    <div class="field"><label>Shots per volley <span class="hint">(guns firing per broadside/salvo)</span></label>
      <input id="we-shots" type="number" min="1" max="40" value="${slot.shotsPerVolley}"></div>
    <div class="field"><label>Ascension tier</label>
      <select id="we-tier">${tiers.map(t => `<option value="${t}"${slot.ascension.tier === t ? ' selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
    <div class="field"><label>Ascension flat damage / shot</label>
      <input id="we-flat" type="number" step="1" value="${slot.ascension.flat || 0}"></div>
    <div class="field"><label>Ascension % damage (decimal, e.g. 0.15)</label>
      <input id="we-pct" type="number" step="0.01" value="${slot.ascension.pct || 0}"></div>
    <div class="field"><label>Assumed extra status DPS</label>
      <input id="we-status" type="number" step="1" value="${slot.extraStatusDps || 0}"></div>
    <div class="field"><label>Custom modifiers</label>
      <div id="we-mods"></div>
      <button id="we-addmod" type="button" class="btn">+ Add modifier</button></div>
    <button id="we-done" type="button" class="btn btn-primary">Done</button>`;

  body.querySelectorAll('[data-roll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = rolls[+btn.dataset.roll];
      if (r && r.damage_per_shot && w.damage_per_shot) {
        body.querySelector('#we-flat').value = r.damage_per_shot - w.damage_per_shot;
        body.querySelector('#we-tier').value = 'mythic';
      }
    });
  });

  const modsBox = body.querySelector('#we-mods');
  const modRow = m => {
    const r = document.createElement('div');
    r.className = 'mod-row';
    r.innerHTML = `<select>${Calc.POOLS.map(p => `<option${m.pool === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
      <input type="number" step="0.01" placeholder="0.15" value="${m.value || ''}">
      <input type="text" placeholder="applies to…" value="${esc(m.appliesTo || 'all')}">
      <button type="button" class="btn btn-danger">✕</button>`;
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
$('weapon-close')?.addEventListener('click', () => $('weapon-modal').hidden = true);
$('weapon-modal')?.addEventListener('click', e => { if (e.target === $('weapon-modal')) $('weapon-modal').hidden = true; });

/* ---------------- step 3: live damage & survivability ---------------- */
function quickResult() {
  if (!S.loadout || !filledCount()) return null;
  return Calc.loadoutDps(S.loadout, buildCtx());
}

function renderQuickDps() {
  const r = quickResult();
  const has = !!r;
  if ($('qdps-empty')) $('qdps-empty').hidden = has;
  if ($('qdps-main')) $('qdps-main').hidden = !has;
  document.querySelector('[data-step="step-3"]')?.classList.toggle('done', has);
  document.querySelector('[data-step="step-1"]')?.classList.toggle('done', !!S.loadout);
  document.querySelector('[data-step="step-2"]')?.classList.toggle('done', filledCount() > 0);
  if (!has) return;

  $('qdps-total').textContent = fmt(r.sustainedDps);
  $('qdps-alpha').textContent = fmt(r.broadsideAlpha);
  if ($('qdps-tree-pill')) {
    $('qdps-tree-pill').hidden = !r.treeActiveCount;
    $('qdps-tree-pill').textContent = `+${r.treeActiveCount} tree nodes active`;
  }

  const box = $('qdps-breakdown');
  box.innerHTML = '';
  r.weapons.forEach(w => {
    const d = document.createElement('div');
    d.className = 'dps-row';
    d.innerHTML = `<span class="wdps">${fmt(w.dps)} <small>dps</small></span>
      <div class="wname">${esc(w.name)}${w.estimated ? ' <span class="est-badge">est.</span>' : ''} <small>· ${esc(w.position.replace(/_/g, ' '))}${w.tier !== 'none' ? ' · ' + esc(w.tier) : ''}</small></div>
      <div class="wstats">volley ${fmt(w.volleyDamage)} · reload cycle ${w.cycle}s${w.statusDps ? ' · status ' + fmt(w.statusDps) : ''}</div>
      ${w.notes.length ? `<div class="wstats">⚠ ${w.notes.map(esc).join(' · ')}</div>` : ''}`;
    box.appendChild(d);
  });
  if (r.unparsedFurniture.length) {
    const n = document.createElement('div');
    n.className = 'notice small';
    n.innerHTML = `Utility/unmodeled furniture (no flat DPS modifier): ${r.unparsedFurniture.map(esc).join(', ')}`;
    box.prepend(n);
  }
}

/* ---------------- status bar & header pill ---------------- */
function renderStatusBar() {
  const bar = $('build-status');
  const pill = $('header-live-pill');
  if (!S.loadout) {
    if (bar) bar.hidden = true;
    if (pill) pill.hidden = true;
    return;
  }
  const ship = DB.shipByName(S.loadout.shipName);
  const surv = Calc.armorSummary ? Calc.armorSummary(ship, S.loadout.armor, S.loadout.furniture) : null;
  const n = filledCount();
  const total = S.loadout.weaponSlots.length;
  const r = quickResult();

  if (bar) {
    bar.hidden = false;
    bar.innerHTML = `<span class="ship-ico">${shipVisual(ship)}</span>
      <span><strong>${esc(S.loadout.shipName)}</strong> · ${n}/${total} guns${surv && surv.totalArmor ? ' · 🛡️ ' + fmt(surv.totalArmor) : ''}</span>
      ${r ? `<span class="live-dps">${fmt(r.sustainedDps)} dps</span>` : ''}`;
  }
  if (pill) {
    pill.hidden = false;
    $('pill-dps').textContent = r ? fmt(r.sustainedDps) : '0';
    $('pill-armor').textContent = surv && surv.totalArmor ? fmt(surv.totalArmor) : '—';
  }
}

function renderBuildAll() {
  renderStatusBar();
  renderWeaponSlots();
  renderQuickDps();
}
function refreshNumbers() {
  renderBuildAll();
}

/* ---------------- Tune tab: save/load, furniture, buffs, mastery, stacking, compare ---------------- */
function getSaved() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function setSaved(o) { localStorage.setItem(LS_KEY, JSON.stringify(o)); }

$('btn-save-loadout')?.addEventListener('click', () => {
  if (!S.loadout) return;
  const nm = ($('loadout-name')?.value || S.loadout.name || 'Unnamed').trim();
  S.loadout.name = nm;
  const all = getSaved();
  all[nm] = S.loadout;
  setSaved(all);
  renderSavedList();
  refreshCompareSelects();
});
$('btn-load-loadout')?.addEventListener('click', () => {
  const box = $('saved-list');
  box.hidden = !box.hidden;
  if (!box.hidden) renderSavedList();
});

function renderSavedList() {
  const box = $('saved-list');
  if (!box) return;
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
        switchTab('build');
      }
    });
    box.appendChild(c);
  });
  if (!Object.keys(all).length) box.innerHTML = '<span class="hint">No saved loadouts yet.</span>';
}

$('minor-slot-count')?.addEventListener('change', e => {
  if (!S.loadout) return;
  S.loadout.minorSlots = Math.max(0, Math.min(8, +e.target.value || 0));
  renderFurniture();
  refreshNumbers();
});

function renderFurniture() {
  const has = !!S.loadout;
  if ($('adv-no-loadout')) $('adv-no-loadout').hidden = has;
  if ($('adv-loadout')) $('adv-loadout').hidden = !has;
  const fs = $('furniture-slots');
  if (!fs) return;
  fs.innerHTML = '';
  if (!has) return;
  const L = S.loadout;
  if ($('loadout-name')) $('loadout-name').value = L.name || '';
  ensureMinorSlots();
  $('minor-slot-count').value = L.minorSlots;
  L.furniture.forEach((f, i) => {
    const it = f.item;
    const d = document.createElement('div');
    d.className = 'slot' + (it ? ' filled' : '');
    d.innerHTML = `<span class="slot-pos">${f.kind === 'major' ? '★ Major' : 'Minor'}</span>
      <span class="slot-name">${it ? esc(it.name) + ' ' + itemBadge(it) : '<span style="color:var(--ink-dim)">Tap to pick furniture</span>'}
      ${it ? `<span class="slot-sub">${esc((it.perk_text || '').slice(0, 90))}…</span>` : ''}</span>
      ${it ? '<span class="slot-edit">tune</span>' : ''}`;
    d.addEventListener('click', () => {
      const items = DB.furniture.filter(x => (x.tier || '').toLowerCase() === f.kind);
      openPicker('furniture', items,
        x => `<div class="pname">${esc(x.name)} ${itemBadge(x)} ${Archetypes.chips(Archetypes.furnitureArchetypes(x))}</div><div class="pmeta">${esc(x.tier || '')} · ${esc((x.perk_text || '').slice(0, 110))}…</div>`,
        x => { f.item = x; renderFurniture(); refreshNumbers(); },
        true,
        x => Archetypes.furnitureArchetypes(x)
      );
      $('picker-clear').onclick = () => { f.item = null; f.customMods = []; closePicker(); renderFurniture(); refreshNumbers(); };
    });
    d.querySelector('.slot-edit')?.addEventListener('click', e => { e.stopPropagation(); openFurnitureEditor(i); });
    fs.appendChild(d);
  });
}

function openFurnitureEditor(fIdx) {
  const f = S.loadout.furniture[fIdx];
  $('weapon-modal-title').textContent = f.item.name;
  const body = $('weapon-modal-body');
  const known = Calc.templateFor(f.item.name);
  body.innerHTML = `
    <div class="perk-text">${esc(f.item.perk_text || '')}</div>
    ${known.length ? `<div class="notice small">Auto-applied modifiers:<br>${known.map(m => '• ' + esc(m.note)).join('<br>')}</div>`
      : `<div class="notice small">No auto-parsed DPS modifiers — add custom modifiers below if desired.</div>`}
    <div class="field"><label>Custom modifiers</label><div id="we-mods"></div><button id="we-addmod" type="button" class="btn">+ Add modifier</button></div>
    <button id="we-done" type="button" class="btn btn-primary">Done</button>`;
  const modsBox = body.querySelector('#we-mods');
  const modRow = m => {
    const r = document.createElement('div');
    r.className = 'mod-row';
    r.innerHTML = `<select>${Calc.POOLS.map(p => `<option${m.pool === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
      <input type="number" step="0.01" placeholder="0.15" value="${m.value || ''}">
      <input type="text" placeholder="applies to…" value="${esc(m.appliesTo || 'all')}">
      <button type="button" class="btn btn-danger">✕</button>`;
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

function renderBuffs() {
  const sd = DB.meta.season_dates;
  if ($('season-dates')) $('season-dates').textContent = sd ? `${sd.start} → ${sd.end}` : '';
  const box = $('buff-list');
  if (!box) return;
  box.innerHTML = '';
  DB.seasonalNodes().forEach(n => {
    const d = document.createElement('div');
    d.className = 'buff-card';
    const on = !!S.buffs[n.name];
    d.innerHTML = `<div class="buff-info"><h3>${esc(n.name)}</h3><p>${esc(n.description || '')}</p></div>
      <label class="switch"><input type="checkbox"${on ? ' checked' : ''}><span class="slider"></span></label>`;
    d.querySelector('input').addEventListener('change', e => { S.buffs[n.name] = e.target.checked; refreshNumbers(); });
    box.appendChild(d);
  });
}

const MASTERY_PERKS = [
  { key: 'relentlessForce', name: 'Relentless Force', unlock: 10, desc: 'Generate 1 Impetus per 8 weapon hits (32 for demi-cannons), max 10 stacks. +15% weapon damage & +15% repair for 5s.' },
  { key: 'weaknessFinder', name: 'Weakness Finder', unlock: 30, desc: 'Generating Impetus: 20% chance to convert any shot into a weakpoint hit for 5s.' },
  { key: 'firepowerOrder', name: 'Firepower Order', unlock: 50, desc: 'At 10 Impetus, fire an auxiliary weapon to consume all 10: every hit becomes a weakpoint hit for 8s.' },
];
function masteryUsed() {
  return Object.keys(MASTERY_COSTS).reduce((a, k) => a + (S.mastery[k] ? MASTERY_COSTS[k] : 0), 0);
}
function renderMastery() {
  const used = masteryUsed();
  if ($('mastery-used')) $('mastery-used').textContent = used;
  if ($('mastery-fill')) $('mastery-fill').style.width = Math.min(100, used / 90 * 100) + '%';
  const box = $('mastery-list');
  if (!box) return;
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
        alert('Exceeds 90-point cap.');
        return;
      }
      S.mastery[p.key] = e.target.checked;
      renderMastery();
      refreshNumbers();
    });
    box.appendChild(d);
  });
}

const POOL_INFO = {
  weaponDamage: ['Weapon damage %', 'Furniture / tree / ascension % damage bonuses'],
  secondaryDamage: ['Secondary damage %', 'Elemental & secondary-damage bonuses'],
  reload: ['Reload reduction %', 'How multiple -% reload sources combine'],
};
function renderStacking() {
  const box = $('stacking-toggles');
  if (!box) return;
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
      b.addEventListener('click', () => { S.stacking[pool] = mode; renderStacking(); refreshNumbers(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    box.appendChild(row);
  });
}

function refreshCompareSelects() {
  const all = getSaved();
  const names = Object.keys(all);
  if (S.loadout) names.unshift('« current: ' + (S.loadout.name || 'Unnamed') + ' »');
  [$('compare-a'), $('compare-b')].forEach(sel => {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = names.map(n => `<option${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  });
}
function resolveCompareLoadout(label) {
  if (!label) return null;
  if (label.startsWith('« current:')) return S.loadout;
  return getSaved()[label] || null;
}
$('btn-compare')?.addEventListener('click', () => {
  const a = resolveCompareLoadout($('compare-a').value);
  const b = resolveCompareLoadout($('compare-b').value);
  const box = $('compare-result');
  if (!a || !b) { box.innerHTML = '<span class="hint">Pick two loadouts.</span>'; return; }
  const r = Calc.compare(a, b, buildCtx());
  const cls = v => v >= 0 ? 'win' : 'lose';
  const sign = v => (v >= 0 ? '+' : '') + v + '%';
  box.innerHTML = `<div class="dps-row">
    <div class="wname">${esc(r.a.name)} vs ${esc(r.b.name)}</div>
    <div class="wstats">Sustained DPS: ${fmt(r.a.sustainedDps)} vs ${fmt(r.b.sustainedDps)} → <span class="${cls(r.sustainedDeltaPct)}">${sign(r.sustainedDeltaPct)}</span></div>
    <div class="wstats">Broadside alpha: ${fmt(r.a.broadsideAlpha)} vs ${fmt(r.b.broadsideAlpha)} → <span class="${cls(r.alphaDeltaPct)}">${sign(r.alphaDeltaPct)}</span></div>
  </div>`;
});

/* ---------------- reference tables (including Armor Codex) ---------------- */
function renderReference() {
  const m = DB.meta;
  if ($('data-verified-line')) {
    $('data-verified-line').textContent = `Data verified — weapons ${m.weapons_verified || '?'}, ships ${m.ships_verified || '?'}, furniture ${m.furniture_verified || '?'}.`;
  }
  const ref = DB.statusReference();
  if ($('status-ref-table')) {
    $('status-ref-table').innerHTML = '<table><tr><th>Effect</th><th>Description</th></tr>' +
      Object.keys(ref).map(k => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(ref[k])}</td></tr>`).join('') + '</table>';
  }
  const drawShips = q => {
    if (!$('ref-ship-table')) return;
    $('ref-ship-table').innerHTML = '<table><tr><th>Ship</th><th>Class</th><th>Hull</th><th>Speed</th><th>Slots</th></tr>' +
      DB.ships.filter(s => s.playable !== false)
        .filter(s => !q || (s.name + ' ' + (s.class || '')).toLowerCase().includes(q.toLowerCase()))
        .map(s => `<tr><td><strong>${esc(s.name)}</strong> ${itemBadge(s)}</td><td>${esc(s.class || '—')}</td><td class="num">${s.hull ? fmt(s.hull) : '—'}</td><td class="num">${s.speed_kn != null ? s.speed_kn + ' kn' : '—'}</td><td class="num">${DB.slotsForShip(s).length}</td></tr>`).join('') + '</table>';
  };
  const drawWeapons = q => {
    if (!$('ref-weapon-table')) return;
    $('ref-weapon-table').innerHTML = '<table><tr><th>Weapon</th><th>Type</th><th>Dmg/shot</th><th>Reload</th><th>Range</th></tr>' +
      DB.weapons.filter(w => !q || (w.name + ' ' + (w.type || '')).toLowerCase().includes(q.toLowerCase()))
        .map(w => `<tr><td><strong>${esc(w.name)}</strong> ${itemBadge(w)}</td><td>${esc(w.type || '—')}</td><td class="num">${w.damage_per_shot ? fmt(w.damage_per_shot) : '—'}</td><td class="num">${w.reload_time_s ? w.reload_time_s + 's' : '—'}</td><td class="num">${w.range_m ? w.range_m + 'm' : '—'}</td></tr>`).join('') + '</table>';
  };
  const drawArmors = q => {
    if (!$('ref-armor-table')) return;
    $('ref-armor-table').innerHTML = '<table><tr><th>Armor</th><th>Tier</th><th>Rating</th><th>Key Perk</th></tr>' +
      DB.armors.filter(a => !q || (a.name + ' ' + (a.category || '')).toLowerCase().includes(q.toLowerCase()))
        .map(a => `<tr><td><strong>${esc(a.name)}</strong> ${itemBadge(a)}</td><td>${esc(a.category || '—')}</td><td class="num">${a.armor_value ? fmt(a.armor_value) : '—'}</td><td>${esc(((a.perks || [])[0] || a.perk || '—').slice(0, 80))}</td></tr>`).join('') + '</table>';
  };
  drawShips(''); drawWeapons(''); drawArmors('');
  $('ref-ship-search')?.addEventListener('input', e => drawShips(e.target.value));
  $('ref-weapon-search')?.addEventListener('input', e => drawWeapons(e.target.value));
  $('ref-armor-search')?.addEventListener('input', e => drawArmors(e.target.value));
}

function renderAdvanced() {
  renderFurniture();
  renderBuffs();
  renderMastery();
  renderStacking();
  renderSavedList();
  refreshCompareSelects();
}

/* ---------------- optimizer UI ---------------- */
const OptimizerUI = {
  inited: false,
  init() {
    if (this.inited) return;
    this.buildControls();
    this.inited = true;
  },
  buildControls() {
    const shipSel = $('opt-ship');
    if (!shipSel) return;
    shipSel.innerHTML = DB.ships.filter(s => s.playable !== false)
      .map(s => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('');
    if ([...shipSel.options].some(o => o.value === 'Frigate')) shipSel.value = 'Frigate';
    $('opt-enemy').innerHTML = Object.entries(Optimizer.ENEMIES)
      .map(([id, e]) => `<option value="${id}">${e.icon} ${esc(e.name)}</option>`).join('');
    $('opt-objective').innerHTML = Object.entries(Optimizer.OBJECTIVES)
      .map(([id, o]) => `<option value="${id}">${o.icon} ${esc(o.name)}</option>`).join('');
    $('btn-optimize').addEventListener('click', () => this.run());
    this.renderPresets();
  },
  run() {
    const out = Optimizer.optimize($('opt-ship').value, $('opt-enemy').value, $('opt-objective').value, {
      mastery: {
        relentlessForce: $('opt-m-relentless').checked,
        weaknessFinder: $('opt-m-weakness').checked,
        firepowerOrder: $('opt-m-firepower').checked,
      },
      rangeM: Math.max(50, +$('opt-range').value || 300),
      includeEstimated: $('opt-estimated').checked,
    });
    const box = $('opt-results');
    if (out.error) { box.innerHTML = `<div class="notice">${esc(out.error)}</div>`; return; }
    box.innerHTML = out.results.map((r, i) => {
      const meta = Archetypes.META[r.archetype] || Archetypes.META.general;
      const guns = r.loadout.weaponSlots.map(s => `<li><strong>${esc(s.position)}</strong>: ${esc(s.weapon.name)}</li>`).join('');
      const furn = r.loadout.furniture.map(f => f.item ? `<li>${esc(f.item.name)} <span class="hint">(${esc(f.kind)})</span></li>` : '').join('');
      const medals = ['🥇', '🥈', '🥉'];
      return `<div class="template-card">
        <div class="t-head"><h3>${medals[i] || ''} ${meta.icon} ${esc(r.loadout.name)}</h3></div>
        <div class="t-kit">Sustained <strong>${fmt(r.result.sustainedDps)}</strong> DPS · Alpha <strong>${fmt(r.result.broadsideAlpha)}</strong></div>
        <div class="t-synergy"><strong>Weapons</strong><ul>${guns}</ul></div>
        <div class="t-synergy"><strong>Armor & Furniture</strong><ul>${r.loadout.armor ? '<li>🛡️ ' + esc(r.loadout.armor.name) + '</li>' : ''}${furn}</ul></div>
        <div class="t-synergy">${r.why}</div>
        <button class="t-use" data-apply="${i}">Send to Builder →</button>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-apply]').forEach(btn => {
      btn.addEventListener('click', () => {
        S.loadout = out.results[+btn.dataset.apply].loadout;
        ensureMinorSlots();
        switchTab('build');
      });
    });
  },
  renderPresets() {
    const box = $('opt-presets');
    if (!box) return;
    box.innerHTML = Optimizer.PRESETS.map(p => {
      const l = Optimizer.presetLoadout(p.id);
      if (!l) return '';
      const res = Calc.loadoutDps(l, Optimizer.scoreCtx({}));
      const guns = l.weaponSlots.map(s => esc(s.weapon.name)).join(' · ');
      return `<div class="template-card">
        <div class="t-head"><h3>${esc(p.name)}</h3><span class="meta">${esc(p.tagline)}</span></div>
        <div class="t-kit">Sustained <strong>${fmt(res.sustainedDps)}</strong> DPS · Alpha <strong>${fmt(res.broadsideAlpha)}</strong></div>
        <div class="t-kit">${guns}</div>
        <div class="t-synergy">${esc(p.why)}</div>
        <button class="t-use" data-preset="${p.id}">Load in Builder →</button>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const l = Optimizer.presetLoadout(btn.dataset.preset);
        if (l) { S.loadout = l; ensureMinorSlots(); switchTab('build'); }
      });
    });
  },
};

/* ---------------- boot ---------------- */
(async function boot() {
  try {
    await DB.load();
  } catch (err) {
    if ($('main')) $('main').innerHTML = '<div class="notice">Failed to load game data: ' + esc(err.message) + '</div>';
    return;
  }
  try {
    if (!localStorage.getItem(ONBOARD_KEY) && $('onboard-card')) $('onboard-card').hidden = false;
  } catch {}
  S.stacking = Calc.defaultStacking();
  renderShips();
  renderTemplates();
  renderBuildAll();
  renderReference();
  renderAdvanced();
  if (typeof Tree !== 'undefined' && Tree.init) Tree.init();
})();
