/* SnB Loadouts — DPS & Survivability calculator engine (Pro Edition).
 *
 * HONESTY MODEL:
 * - Armor mitigation curve is UNPUBLISHED. Absolute DPS numbers are
 *   ESTIMATES. Relative comparisons between two loadouts are armor-
 *   independent and much more trustworthy — use compare().
 * - Additive vs multiplicative stacking of % bonuses is UNPUBLISHED.
 *   Every modifier pool has a user-toggleable stacking mode.
 * - Selected Mastery Tree nodes (tree.js) feed into ctx.treeMods
 *   when "Sync Tree Nodes to DPS" is enabled.
 */
'use strict';

const Calc = {

  POOLS: ['weaponDamage', 'secondaryDamage', 'reload'],

  defaultStacking() {
    return { weaponDamage: 'multiplicative', secondaryDamage: 'multiplicative', reload: 'multiplicative' };
  },

  combine(pool, values, mode) {
    if (!values.length) return 1;
    if (mode === 'additive') return 1 + values.reduce((a, b) => a + b, 0);
    return values.reduce((a, b) => a * (1 + b), 1);
  },

  /* Verified Y3S2 furniture modifiers. Keys normalized via DB._resolveKey */
  MOD_TEMPLATES: {
    'leyden vault array': [
      { pool: 'weaponDamage', value: 0.08, appliesTo: 'status:Stormstruck', note: '+8% damage vs Stormstruck targets' },
      { pool: 'reload', value: 0.06, appliesTo: 'status:electric', note: '-6% electric weapon reload' },
    ],
    'copper fastening station': [
      { pool: 'secondaryDamage', value: 0.12, appliesTo: 'status:electric', note: '+12% electric secondary damage' },
    ],
    'ramrod workshop': [
      { pool: 'reload', value: 0.07, appliesTo: 'broadside', note: '-7% broadside reload' },
      { pool: 'secondaryDamage', value: 0.07, appliesTo: 'broadside', note: '+7% broadside secondary damage' },
    ],
    'fuse-fusing station': [
      { pool: 'reload', value: 0.09, appliesTo: 'bow/stern', note: '-9% front/rear reload' },
      { pool: 'secondaryDamage', value: 0.09, appliesTo: 'bow/stern', note: '+9% front/rear secondary damage' },
    ],
    'demi-cannon works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'demi-cannon', note: '+19% demi-cannon secondary damage' },
    ],
    'bombard works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'bombard', note: '+19% bombard secondary damage' },
    ],
    'culverin works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'culverin', note: '+19% culverin secondary damage' },
    ],
    'long gun works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'long gun', note: '+19% long gun secondary damage' },
    ],
    'ballista works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'ballista', note: '+19% ballista secondary damage' },
    ],
    'mortar works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'mortar', note: '+19% mortar secondary damage' },
    ],
    'rocket works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'rocket', note: '+19% rocket secondary damage' },
    ],
    'sea fire works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'sea fire', note: '+19% sea fire secondary damage' },
    ],
    'tuning station': [
      { pool: 'secondaryDamage', value: 0.20, appliesTo: 'torpedo', note: '+20% torpedo secondary damage' },
    ],
    'torpedo works i': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'torpedo', note: '+19% torpedo secondary damage' },
    ],
    'maintained arsenal i': [
      { pool: 'weaponDamage', value: 0.13, appliesTo: 'auxiliary', note: '+13% auxiliary weapon damage' },
    ],
    'front powder kegs i': [
      { pool: 'weaponDamage', value: 0.10, appliesTo: 'bow', note: '+10% front weapon damage' },
    ],
    'port powder kegs i': [
      { pool: 'weaponDamage', value: 0.10, appliesTo: 'broadside_port', note: '+10% port weapon damage' },
    ],
    'starboard powder kegs i': [
      { pool: 'weaponDamage', value: 0.10, appliesTo: 'broadside_starboard', note: '+10% starboard weapon damage' },
    ],
    'atelier de cuivrage': [
      { pool: 'weaponDamage', value: 0.10, appliesTo: 'all', note: '+10% weapon damage (above 50% hull)' },
    ],
    'siphon furnace': [
      { pool: 'weaponDamage', value: 0.10, appliesTo: 'status:Poisoned', note: '+10% toxic weapon damage vs Poisoned' },
    ],
    'stinkpot station': [
      { pool: 'weaponDamage', value: 0.08, appliesTo: 'status:toxic', note: '+8% toxic damage (+10% within 250m)' },
    ],
    'wyrms breath churner': [
      { pool: 'weaponDamage', value: 0.05, appliesTo: 'explosive', note: '+5% explosive weapon damage' },
      { pool: 'secondaryDamage', value: 0.25, appliesTo: 'explosive', note: '+25% explosive secondary damage' },
    ],
    'bilgefire barrels': [
      { pool: 'weaponDamage', value: 0.05, appliesTo: 'broadside', note: '+5% broadside weapon damage' },
      { pool: 'secondaryDamage', value: 0.10, appliesTo: 'broadside', note: '+10% broadside secondary damage' },
    ],
    'drowning cabinet': [
      { pool: 'reload', value: 0.10, appliesTo: 'status:flooding', note: '-10% flooding weapon reload' },
    ],
    'shot carving station': [
      { pool: 'reload', value: 0.05, appliesTo: 'piercing', note: '-5% piercing weapon reload' },
    ],
    'plaguebringers ward': [
      { pool: 'reload', value: 0.07, appliesTo: 'status:toxic', note: '-7% toxic weapon reload' },
      { pool: 'weaponDamage', value: 0.04, appliesTo: 'status:toxic', note: '+4% toxic weapon damage' },
    ],
    'cascade coil bench': [
      { pool: 'weaponDamage', value: 0.13, appliesTo: 'sea fire', note: '+13% sea fire weapon damage' },
      { pool: 'secondaryDamage', value: 0.15, appliesTo: 'sea fire', note: '+15% sea fire secondary damage' },
    ],
    'breechlock furnace': [
      { pool: 'secondaryDamage', value: 0.10, appliesTo: 'all', note: '+~10% avg secondary up close (+20% at 0m, -2%/50m)' },
    ],
    'organ harvesting station': [
      { pool: 'weaponDamage', value: 0.05, appliesTo: 'rocket', note: '+5% rocket damage per 20% hull missing' },
      { pool: 'secondaryDamage', value: 0.10, appliesTo: 'rocket', note: '+10% rocket secondary damage' },
      { pool: 'reload', value: 0.05, appliesTo: 'rocket', note: '-5% rocket reload' },
    ],
  },

  templateFor(furnitureName) {
    if (!furnitureName) return [];
    const key = (typeof DB !== 'undefined' && DB._resolveKey)
      ? DB._resolveKey(furnitureName)
      : furnitureName.toLowerCase().replace(/[\u2018\u2019']/g, '').trim();
    return this.MOD_TEMPLATES[key] || [];
  },

  modifierMatches(mod, weapon, slotPosition) {
    const t = (mod.appliesTo || 'all').toLowerCase().replace(/-/g, ' ');
    if (t === 'all') return true;
    const wtype = (weapon.type || '').toLowerCase().replace(/-/g, ' ');
    const wfam = (weapon.family || '').toLowerCase().replace(/-/g, ' ');
    const pos = (slotPosition || '').toLowerCase();

    if (t.startsWith('status:')) {
      const want = t.slice(7);
      const blob = JSON.stringify([weapon.status_effects, weapon.damage_types, weapon.perks]).toLowerCase();
      return blob.includes(want);
    }
    if (t === 'broadside') return pos.startsWith('broadside');
    if (t === 'broadside_port' || t === 'broadside_starboard') return pos === t;
    if (t === 'bow') return pos === 'bow';
    if (t === 'stern') return pos === 'stern';
    if (t === 'bow/stern') return pos === 'bow' || pos === 'stern';
    if (t === 'auxiliary') return pos === 'auxiliary';
    return wtype.includes(t) || wfam.includes(t) || (wtype && t.includes(wtype));
  },

  /* Convert selected Mastery Tree nodes into structured Calc modifiers. */
  treeModifiers(selectedKeys) {
    if (!selectedKeys || !selectedKeys.length || typeof DB === 'undefined') return [];
    const byKey = {};
    DB.masteryNodes().forEach(n => { byKey[n.key] = n; });
    const mods = [];
    selectedKeys.forEach(k => {
      const n = byKey[k];
      if (!n) return;
      switch (n.name) {
        case 'Enhanced Damage':
          mods.push({ pool: 'weaponDamage', value: 0.10, appliesTo: 'all', src: 'Tree: Enhanced Damage' });
          break;
        case 'Hardened Munitions':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'all', src: 'Tree: Hardened Munitions' });
          break;
        case 'Ready Fire':
          mods.push({ pool: 'reload', value: 0.03, appliesTo: 'all', src: 'Tree: Ready Fire' });
          break;
        case 'Deadeye':
          mods.push({ pool: 'weakpointBonus', value: 0.20, appliesTo: 'all', src: 'Tree: Deadeye' });
          break;
        case 'Precision Shot':
          mods.push({ pool: 'weakpointBonus', value: 0.10, appliesTo: 'long gun', src: 'Tree: Precision Shot' });
          break;
        case 'Precision Bolts':
          mods.push({ pool: 'weakpointBonus', value: 0.20, appliesTo: 'ballista', src: 'Tree: Precision Bolts' });
          break;
        case 'Heavy Shot Lg':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'long gun', src: 'Tree: Heavy Shot Lg' });
          break;
        case 'Long Gun Drills':
          mods.push({ pool: 'reload', value: 0.10, appliesTo: 'long gun', src: 'Tree: Long Gun Drills' });
          break;
        case 'Heavy Shot':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'culverin', src: 'Tree: Heavy Shot' });
          break;
        case 'Heavy Grapeshot':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'demi-cannon', src: 'Tree: Heavy Grapeshot' });
          break;
        case 'Volley Fire':
          mods.push({ pool: 'weaponDamage', value: 0.10, appliesTo: 'demi-cannon', src: 'Tree: Volley Fire' });
          mods.push({ pool: 'weaponDamage', value: 0.10, appliesTo: 'culverin', src: 'Tree: Volley Fire' });
          break;
        case 'Heavy Bolts':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'ballista', src: 'Tree: Heavy Bolts' });
          break;
        case 'Volatile Fuel Sf':
          mods.push({ pool: 'weaponDamage', value: 0.30, appliesTo: 'sea fire', src: 'Tree: Volatile Fuel Sf' });
          break;
        case 'Sea Fire Drills':
          mods.push({ pool: 'reload', value: 0.10, appliesTo: 'sea fire', src: 'Tree: Sea Fire Drills' });
          break;
        case 'Heavy Bombs':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'bombard', src: 'Tree: Heavy Bombs' });
          break;
        case 'Bombard Drills':
          mods.push({ pool: 'reload', value: 0.05, appliesTo: 'bombard', src: 'Tree: Bombard Drills' });
          break;
        case 'Loaded Torpedoes':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'torpedo', src: 'Tree: Loaded Torpedoes' });
          break;
        case 'All Hands On Deck':
          mods.push({ pool: 'weaponDamage', value: 0.10, appliesTo: 'bombard', src: 'Tree: All Hands On Deck' });
          mods.push({ pool: 'weaponDamage', value: 0.10, appliesTo: 'long gun', src: 'Tree: All Hands On Deck' });
          mods.push({ pool: 'weaponDamage', value: 0.10, appliesTo: 'torpedo', src: 'Tree: All Hands On Deck' });
          break;
        case 'Heavy Shells':
          mods.push({ pool: 'weaponDamage', value: 0.30, appliesTo: 'mortar', src: 'Tree: Heavy Shells' });
          break;
        case 'High Yield Mines':
          mods.push({ pool: 'weaponDamage', value: 0.30, appliesTo: 'springloader', src: 'Tree: High Yield Mines' });
          break;
        case 'Heavy Payload':
          mods.push({ pool: 'weaponDamage', value: 0.20, appliesTo: 'rocket', src: 'Tree: Heavy Payload' });
          break;
        case 'Heavy Weaponry':
          mods.push({ pool: 'weaponDamage', value: 0.15, appliesTo: 'mortar', src: 'Tree: Heavy Weaponry' });
          mods.push({ pool: 'weaponDamage', value: 0.15, appliesTo: 'rocket', src: 'Tree: Heavy Weaponry' });
          mods.push({ pool: 'weaponDamage', value: 0.15, appliesTo: 'springloader', src: 'Tree: Heavy Weaponry' });
          break;
        case 'Reactive Compounds':
          mods.push({ pool: 'secondaryDamage', value: 0.20, appliesTo: 'all', src: 'Tree: Reactive Compounds' });
          break;
      }
    });
    return mods;
  },

  rangeMultiplier(weapon, rangeM) {
    const wtype = (weapon.type || '').toLowerCase().replace(/-/g, ' ');
    if (!wtype.includes('demi')) return { mult: 1, note: null };
    const maxR = weapon.range_m || 500;
    if (rangeM <= 120) return { mult: 1, note: null };
    const fall = Math.min(1, (rangeM - 120) / Math.max(1, maxR - 120));
    return { mult: 1 - 0.5 * fall, note: 'demi-cannon falloff (estimated)' };
  },

  statusDps(weapon, assumptions) {
    let dps = 0;
    const notes = [];
    const unmodeled = [];
    (weapon.status_effects || []).forEach(s => {
      const eff = (typeof s === 'string' ? s : (s.effect || '')).toLowerCase();
      if (eff.includes('stormstruck')) {
        const arcs = assumptions.stormstruckArcs != null ? assumptions.stormstruckArcs : 2;
        dps += 1000 / 3 + Math.min(4, arcs) * (2000 / 3);
        notes.push('Stormstruck DoT modeled (published ticks)');
      } else if (eff) {
        unmodeled.push(typeof s === 'string' ? s : s.effect);
      }
    });
    if (unmodeled.length) notes.push('Unmodeled status: ' + unmodeled.join(', ') + ' (no published tick values)');
    if (assumptions.extraStatusDps) {
      dps += assumptions.extraStatusDps;
      notes.push('User-assumed status DPS included');
    }
    return { dps, notes };
  },

  weaponDps(slot, ctx) {
    const weapon = slot.weapon;
    const notes = [];
    let estimated = !!weapon.estimated;

    const asc = slot.ascension || {};
    const baseDamage = (weapon.damage_per_shot || 0) + (asc.flat || 0);
    if (weapon.damage_per_shot == null) {
      notes.push('Base damage unpublished in data');
      estimated = true;
    }

    const pools = { weaponDamage: [], secondaryDamage: [], reload: [] };
    let extraWpBonus = 0;

    const pushMod = (pool, value) => {
      if (!value) return;
      if (pool === 'weakpointBonus') { extraWpBonus += value; return; }
      if (pools[pool]) pools[pool].push(value);
    };

    (ctx.furnitureMods || []).forEach(m => {
      if (this.modifierMatches(m, weapon, slot.position)) pushMod(m.pool, m.value);
    });
    (ctx.treeMods || []).forEach(m => {
      if (this.modifierMatches(m, weapon, slot.position)) pushMod(m.pool, m.value);
    });
    if (asc.pct) pushMod('weaponDamage', asc.pct);

    if (ctx.mastery && ctx.mastery.relentlessForce) {
      const uptime = ctx.assumptions.impetusUptime != null ? ctx.assumptions.impetusUptime : 0.5;
      pushMod('weaponDamage', 0.15 * uptime);
      notes.push('Relentless Force @ ' + Math.round(uptime * 100) + '% uptime (estimated)');
      estimated = true;
    }
    (ctx.buffMods || []).forEach(m => {
      if (this.modifierMatches(m, weapon, slot.position)) pushMod(m.pool, m.value);
    });
    (slot.customMods || []).forEach(m => pushMod(m.pool, m.value));

    const stacking = ctx.stacking || this.defaultStacking();
    const dmgMult = this.combine('weaponDamage', pools.weaponDamage, stacking.weaponDamage);
    const secMult = this.combine('secondaryDamage', pools.secondaryDamage, stacking.secondaryDamage);

    let effectiveMult = dmgMult;
    if (secMult > 1 && weapon.damage_types) {
      const dt = weapon.damage_types;
      const elemSum = Object.entries(dt)
        .filter(([k, v]) => k !== 'basic' && typeof v === 'number')
        .reduce((a, [, v]) => a + v, 0);
      if (elemSum > 0 && baseDamage > 0) {
        const secShare = Math.min(1, elemSum / baseDamage);
        effectiveMult = dmgMult * (1 + secShare * (secMult - 1));
      }
    }

    const reloadFactor = stacking.reload === 'additive'
      ? Math.max(0.1, 1 - pools.reload.reduce((a, b) => a + b, 0))
      : pools.reload.reduce((a, b) => a * (1 - b), 1);

    const reload = weapon.reload_time_s || 6;
    if (!weapon.reload_time_s) { notes.push('Reload unpublished — assumed 6s'); estimated = true; }
    const shots = slot.shotsPerVolley || 1;
    const cycle = reload * reloadFactor;

    let wpRate = (ctx.assumptions.weakpointRate || 0) / 100;
    if (ctx.mastery && ctx.mastery.weaknessFinder) {
      const uptime = ctx.assumptions.impetusUptime != null ? ctx.assumptions.impetusUptime : 0.5;
      wpRate += 0.20 * uptime;
      notes.push('Weakness Finder conversion included (estimated)');
      estimated = true;
    }
    if (ctx.mastery && ctx.mastery.firepowerOrder) {
      const fpo = ctx.assumptions.firepowerOrderUptime != null ? ctx.assumptions.firepowerOrderUptime : 0.15;
      wpRate = wpRate + (1 - wpRate) * fpo;
      notes.push('Firepower Order window included (estimated)');
      estimated = true;
    }
    const wpBonus = ((ctx.assumptions.weakpointBonus || 50) / 100) + extraWpBonus;
    const wpMult = 1 + Math.min(1, wpRate) * wpBonus;

    const range = ctx.assumptions.rangeM != null ? ctx.assumptions.rangeM : 300;
    const { mult: rangeMult, note: rangeNote } = this.rangeMultiplier(weapon, range);
    if (rangeNote) { notes.push(rangeNote); estimated = true; }

    const volleyDamage = baseDamage * shots * effectiveMult * wpMult * rangeMult;
    const hitDps = volleyDamage / Math.max(0.1, cycle);

    const st = this.statusDps(weapon, {
      stormstruckArcs: ctx.assumptions.stormstruckArcs,
      extraStatusDps: slot.extraStatusDps || 0,
    });
    st.notes.forEach(n => notes.push(n));
    if (st.notes.some(n => n.startsWith('Unmodeled'))) estimated = true;

    const totalDps = hitDps + st.dps;
    return {
      name: weapon.name,
      position: slot.position,
      tier: asc.tier || 'none',
      volleyDamage: Math.round(volleyDamage),
      cycle: +cycle.toFixed(2),
      hitDps: Math.round(hitDps),
      statusDps: Math.round(st.dps),
      dps: Math.round(totalDps),
      estimated,
      notes,
    };
  },

  loadoutDps(loadout, ctx) {
    const furnitureMods = [];
    const unparsed = [];
    (loadout.furniture || []).forEach(f => {
      if (!f.item) return;
      const tmpl = this.templateFor(f.item.name);
      tmpl.forEach(m => furnitureMods.push({ ...m, src: f.item.name }));
      (f.customMods || []).forEach(m => furnitureMods.push({ ...m, src: f.item.name + ' (custom)' }));
      if (!tmpl.length && !(f.customMods || []).length) {
        unparsed.push(f.item.name);
      }
    });

    const treeMods = (ctx.includeTree && ctx.treeKeys) ? this.treeModifiers(ctx.treeKeys) : [];
    const fullCtx = { ...ctx, furnitureMods, treeMods };

    const weapons = (loadout.weaponSlots || [])
      .filter(s => s.weapon)
      .map(s => this.weaponDps(s, fullCtx));

    const sustained = weapons.reduce((a, w) => a + w.dps, 0);
    const alpha = weapons
      .filter(w => w.position.toLowerCase().startsWith('broadside'))
      .reduce((a, w) => a + w.volleyDamage, 0);

    return {
      weapons,
      sustainedDps: Math.round(sustained),
      broadsideAlpha: Math.round(alpha),
      estimated: weapons.some(w => w.estimated),
      unparsedFurniture: unparsed,
      treeActiveCount: treeMods.length,
    };
  },

  armorSummary(ship, armor, furnitureList) {
    if (!ship) return null;
    let hull = ship.hull || 0;
    let armorVal = (armor && armor.armor_value) || ship.armor || 0;
    let hullPct = 0;
    let armorPct = 0;

    (furnitureList || []).forEach(f => {
      const txt = (f && f.item && f.item.perk_text) || '';
      const hm = /increases max hull health by (\d+)%/i.exec(txt);
      if (hm) hullPct += parseInt(hm[1], 10) / 100;
      const am = /increases armor rating(?: of equipped armor)? by (\d+)%/i.exec(txt);
      if (am) armorPct += parseInt(am[1], 10) / 100;
    });

    const totalHull = hull ? Math.round(hull * (1 + hullPct)) : null;
    const totalArmor = armorVal ? Math.round(armorVal * (1 + armorPct)) : null;
    const mitigation = (armor && armor.damage_mitigation) || {};

    return {
      shipName: ship.name,
      armorName: armor ? armor.name : null,
      baseHull: hull || null,
      totalHull,
      baseArmor: armorVal || null,
      totalArmor,
      mitigation,
    };
  },

  compare(a, b, ctx) {
    const ra = this.loadoutDps(a, ctx);
    const rb = this.loadoutDps(b, ctx);
    const pct = (x, y) => y ? ((x - y) / y) * 100 : 0;
    return {
      a: { name: a.name, sustainedDps: ra.sustainedDps, broadsideAlpha: ra.broadsideAlpha },
      b: { name: b.name, sustainedDps: rb.sustainedDps, broadsideAlpha: rb.broadsideAlpha },
      sustainedDeltaPct: +pct(ra.sustainedDps, rb.sustainedDps).toFixed(1),
      alphaDeltaPct: +pct(ra.broadsideAlpha, rb.broadsideAlpha).toFixed(1),
    };
  },
};
