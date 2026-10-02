/* SnB Loadouts — DPS calculator engine.
 *
 * HONESTY MODEL (read before trusting numbers):
 * - The armor-mitigation formula is UNPUBLISHED. Absolute DPS numbers are
 *   ESTIMATES. Relative comparisons between two loadouts are armor-
 *   independent and much more trustworthy — use compareLoadouts().
 * - Additive vs multiplicative stacking of % bonuses is UNPUBLISHED.
 *   Every modifier pool has a user-toggleable stacking mode.
 * - Demi-cannon range falloff curve is unpublished; the model below is an
 *   estimate flagged as such.
 * - Status DoT values are only modeled where published (Stormstruck);
 *   everything else is a user-editable assumption.
 */
'use strict';

const Calc = {

  /* ------------------------------------------------------------------ */
  /* Modifier pools. Each pool collects decimal bonuses (0.15 = +15%)   */
  /* from furniture / mastery / seasonal / ascension, then combines     */
  /* them additively or multiplicatively per the user's toggle.         */
  /* ------------------------------------------------------------------ */
  POOLS: ['weaponDamage', 'secondaryDamage', 'reload'],

  defaultStacking() {
    // Community convention leans multiplicative; official word: none.
    return { weaponDamage: 'multiplicative', secondaryDamage: 'multiplicative', reload: 'multiplicative' };
  },

  combine(pool, values, mode) {
    if (!values.length) return 1;
    if (mode === 'additive') return 1 + values.reduce((a, b) => a + b, 0);
    return values.reduce((a, b) => a * (1 + b), 1);
  },

  /* ------------------------------------------------------------------ */
  /* Known furniture → structured modifiers. Parsed from official and   */
  /* community sources (see mechanics.json). Anything not listed here   */
  /* falls back to user-entered custom modifiers on the slot.          */
  /* Format: { pool, value, appliesTo, note }                           */
  /* appliesTo: 'all' | weapon type ('demi-cannon') | family | 'status' */
  /* ------------------------------------------------------------------ */
  MOD_TEMPLATES: {
    'LEYDEN VAULT ARRAY': [
      { pool: 'weaponDamage', value: 0.08, appliesTo: 'status:Stormstruck', note: '+8% damage vs Stormstruck targets' },
      { pool: 'reload', value: 0.06, appliesTo: 'status:electric', note: '-6% electric weapon reload' },
    ],
    'COPPER FASHIONING STATION': [
      { pool: 'secondaryDamage', value: 0.12, appliesTo: 'status:electric', note: '+12% electric secondary damage' },
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'demi-cannon', note: '+19% demi-cannon secondary damage' },
    ],
    'RAM ROD WORKSHOP': [
      { pool: 'reload', value: 0.07, appliesTo: 'broadside', note: '-7% broadside reload' },
      { pool: 'secondaryDamage', value: 0.07, appliesTo: 'broadside', note: '+7% broadside secondary damage' },
    ],
    'DEMI-CANNON WORKS I': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'demi-cannon', note: '+19% demi-cannon secondary damage' },
    ],
    'BOMBARD WORKS': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'bombard', note: '+19% bombard secondary damage' },
    ],
    'TUNING STATION I': [
      { pool: 'secondaryDamage', value: 0.20, appliesTo: 'torpedo', note: '+20% torpedo secondary damage' },
    ],
    'TORPEDO WORKS': [
      { pool: 'secondaryDamage', value: 0.19, appliesTo: 'torpedo', note: '+19% torpedo secondary damage' },
    ],
    'PLATOONING STATION I': [
      { pool: 'secondaryDamage', value: 0.20, appliesTo: 'torpedo', note: '+20% torpedo secondary damage' },
    ],
    'MAINTAINED ARSENAL I': [
      { pool: 'weaponDamage', value: 0.13, appliesTo: 'auxiliary', note: '+13% auxiliary weapon damage' },
    ],
    'DAYCURVAGE STATION': [
      { pool: 'weaponDamage', value: 0.10, appliesTo: 'all', note: '+10% weapon damage' },
    ],
    'SIPHON FURNACE': [
      { pool: 'weaponDamage', value: 0.10, appliesTo: 'status:Poisoned', note: '+10% toxic weapon damage if target poisoned' },
    ],
    "WORM'S BREATH TURNER": [
      { pool: 'weaponDamage', value: 0.05, appliesTo: 'explosive', note: '+5% explosive weapon damage' },
      { pool: 'secondaryDamage', value: 0.20, appliesTo: 'explosive', note: '+20% explosive secondary damage' },
    ],
    'BREECHLOCK FURNACE': [
      // Proximity-scaled in reality (+30% up close, -3%/50m). v1: flat average, user-tunable.
      { pool: 'secondaryDamage', value: 0.15, appliesTo: 'all', note: '+~15% secondary up close (scales down with range — tune me)' },
    ],
    'ORGAN HARVESTING STATION': [
      { pool: 'weaponDamage', value: 0.05, appliesTo: 'rocket', note: '+5% rocket damage per 20% hull missing (modeled at full missing)' },
      { pool: 'secondaryDamage', value: 0.10, appliesTo: 'rocket', note: '+10% rocket secondary damage' },
      { pool: 'reload', value: 0.05, appliesTo: 'rocket', note: '-5% rocket reload' },
    ],
    'HELLFIRE REGALIA': [], // placeholder: no published numbers
  },

  templateFor(furnitureName) {
    if (!furnitureName) return [];
    return this.MOD_TEMPLATES[furnitureName.toUpperCase()] || [];
  },

  /* Does a modifier's appliesTo match this weapon/slot? */
  modifierMatches(mod, weapon, slotPosition) {
    const t = (mod.appliesTo || 'all').toLowerCase();
    if (t === 'all') return true;
    const wtype = (weapon.type || '').toLowerCase();
    const wfam = (weapon.family || '').toLowerCase();
    if (t.startsWith('status:')) {
      const want = t.slice(7);
      // Match against status effects, damage types, and perk text — e.g.
      // "electric" matches a Stormstruck weapon whose perks mention Electric.
      const blob = JSON.stringify([weapon.status_effects, weapon.damage_types, weapon.perks]).toLowerCase();
      return blob.includes(want);
    }
    if (t === 'broadside') return slotPosition.toLowerCase().startsWith('broadside');
    if (t === 'auxiliary') return slotPosition.toLowerCase() === 'auxiliary';
    return wtype.includes(t) || wfam.includes(t) || t.includes(wtype);
  },

  /* ------------------------------------------------------------------ */
  /* Range falloff (ESTIMATED — exact curves unpublished).               */
  /* Demi-cannons: full damage <= 120m, linear falloff to 50% at max    */
  /* range. Everything else: no falloff modeled (unknown).              */
  /* ------------------------------------------------------------------ */
  rangeMultiplier(weapon, rangeM) {
    const wtype = (weapon.type || '').toLowerCase();
    if (!wtype.includes('demi')) return { mult: 1, note: null };
    const maxR = weapon.range_m || 500;
    if (rangeM <= 120) return { mult: 1, note: null };
    const fall = Math.min(1, (rangeM - 120) / Math.max(1, maxR - 120));
    return { mult: 1 - 0.5 * fall, note: 'demi-cannon falloff (estimated)' };
  },

  /* ------------------------------------------------------------------ */
  /* Status DoT contributions. Only Stormstruck has published ticks.     */
  /* Returns { dps, notes[] }.                                          */
  /* ------------------------------------------------------------------ */
  statusDps(weapon, assumptions) {
    let dps = 0;
    const notes = [];
    const unmodeled = [];
    (weapon.status_effects || []).forEach(s => {
      const eff = (s.effect || '').toLowerCase();
      if (eff.includes('stormstruck')) {
        // Published: 1000/3s + up to 4 arcs of 2000/3s.
        const arcs = assumptions.stormstruckArcs != null ? assumptions.stormstruckArcs : 2;
        dps += 1000 / 3 + Math.min(4, arcs) * (2000 / 3);
        notes.push('Stormstruck DoT modeled (published ticks)');
      } else {
        unmodeled.push(s.effect);
      }
    });
    if (unmodeled.length) notes.push('Unmodeled status: ' + unmodeled.join(', ') + ' (no published tick values)');
    // User override for unmodeled/assumed status DPS.
    if (assumptions.extraStatusDps) {
      dps += assumptions.extraStatusDps;
      notes.push('User-assumed status DPS included');
    }
    return { dps, notes };
  },

  /* ------------------------------------------------------------------ */
  /* Per-weapon DPS.                                                     */
  /* slot: { weapon, position, shotsPerVolley, ascension:{tier,flat,pct}, */
  /*         customMods:[{pool,value}], extraStatusDps }                 */
  /* ctx: { furnitureMods:[], mastery:{...}, buffs:{...}, stacking,       */
  /*        assumptions:{rangeM, weakpointRate, weakpointBonus,           */
  /*        impetusUptime, stormstruckArcs} }                             */
  /* ------------------------------------------------------------------ */
  weaponDps(slot, ctx) {
    const weapon = slot.weapon;
    const notes = [];
    let estimated = !!weapon.estimated;

    const asc = slot.ascension || {};
    const baseDamage = (weapon.damage_per_shot || 0) + (asc.flat || 0);

    // Collect % modifiers per pool.
    const pools = { weaponDamage: [], secondaryDamage: [], reload: [] };
    const pushMod = (pool, value, src) => {
      if (value) pools[pool].push(value);
    };

    (ctx.furnitureMods || []).forEach(m => {
      if (this.modifierMatches(m, weapon, slot.position)) pushMod(m.pool, m.value, m.note);
    });
    // Ascension % damage joins the weapon-damage pool.
    if (asc.pct) pushMod('weaponDamage', asc.pct, 'ascension');
    // Mastery: Relentless Force +15% weapon damage, scaled by Impetus uptime.
    if (ctx.mastery && ctx.mastery.relentlessForce) {
      const uptime = ctx.assumptions.impetusUptime != null ? ctx.assumptions.impetusUptime : 0.5;
      pushMod('weaponDamage', 0.15 * uptime, 'Relentless Force (uptime-adjusted)');
      notes.push('Relentless Force @ ' + Math.round(uptime * 100) + '% uptime (estimated)');
      estimated = true;
    }
    // Seasonal buffs that modify weapon damage (documented nodes only).
    (ctx.buffMods || []).forEach(m => {
      if (this.modifierMatches(m, weapon, slot.position)) pushMod(m.pool, m.value, m.note);
    });
    // Slot-level custom modifiers (user-entered, e.g. unparsed furniture).
    (slot.customMods || []).forEach(m => pushMod(m.pool, m.value, 'custom'));

    const stacking = ctx.stacking || this.defaultStacking();
    const dmgMult = this.combine('weaponDamage', pools.weaponDamage, stacking.weaponDamage);
    // Reload pool stores reductions as positive decimals; combine into a (1 - r) factor.
    const reloadFactor = stacking.reload === 'additive'
      ? Math.max(0.1, 1 - pools.reload.reduce((a, b) => a + b, 0))
      : pools.reload.reduce((a, b) => a * (1 - b), 1);

    const reload = weapon.reload_time_s || 6;
    if (!weapon.reload_time_s) { notes.push('Reload unpublished — assumed 6s'); estimated = true; }
    const shots = slot.shotsPerVolley || 1;
    const cycle = reload * reloadFactor; // volley treated as near-instant

    // Weakpoint modeling.
    let wpRate = (ctx.assumptions.weakpointRate || 0) / 100;
    if (ctx.mastery && ctx.mastery.weaknessFinder) {
      const uptime = ctx.assumptions.impetusUptime != null ? ctx.assumptions.impetusUptime : 0.5;
      wpRate += 0.20 * uptime; // 20% conversion chance while Impetus-gen buff active
      notes.push('Weakness Finder conversion included (estimated)');
      estimated = true;
    }
    // Firepower Order: 8s of full conversion per aux-triggered dump; model as uptime input.
    if (ctx.mastery && ctx.mastery.firepowerOrder) {
      const fpo = ctx.assumptions.firepowerOrderUptime != null ? ctx.assumptions.firepowerOrderUptime : 0.15;
      wpRate = wpRate + (1 - wpRate) * fpo;
      notes.push('Firepower Order window included (estimated)');
      estimated = true;
    }
    const wpBonus = (ctx.assumptions.weakpointBonus || 50) / 100;
    const wpMult = 1 + Math.min(1, wpRate) * wpBonus;

    const range = ctx.assumptions.rangeM != null ? ctx.assumptions.rangeM : 300;
    const { mult: rangeMult, note: rangeNote } = this.rangeMultiplier(weapon, range);
    if (rangeNote) { notes.push(rangeNote); estimated = true; }

    const volleyDamage = baseDamage * shots * dmgMult * wpMult * rangeMult;
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

  /* ------------------------------------------------------------------ */
  /* Full loadout: per-weapon breakdown + totals.                        */
  /* loadout: { ship, weaponSlots:[slot...], furniture:[{item,customMods}] */
  /* ------------------------------------------------------------------ */
  loadoutDps(loadout, ctx) {
    // Gather furniture modifiers (templates + user custom).
    const furnitureMods = [];
    (loadout.furniture || []).forEach(f => {
      if (!f.item) return;
      this.templateFor(f.item.name).forEach(m => furnitureMods.push({ ...m, src: f.item.name }));
      (f.customMods || []).forEach(m => furnitureMods.push({ ...m, src: f.item.name + ' (custom)' }));
      if (!this.templateFor(f.item.name).length && !(f.customMods || []).length) {
        // No parseable numbers — flag it.
        furnitureMods._unparsed = furnitureMods._unparsed || [];
        furnitureMods._unparsed.push(f.item.name);
      }
    });
    const fullCtx = { ...ctx, furnitureMods };

    const weapons = (loadout.weaponSlots || [])
      .filter(s => s.weapon)
      .map(s => this.weaponDps(s, fullCtx));

    const sustained = weapons.reduce((a, w) => a + w.dps, 0);
    const alpha = weapons
      .filter(w => w.position.toLowerCase().startsWith('broadside'))
      .reduce((a, w) => a + w.volleyDamage, 0);

    const unparsed = furnitureMods._unparsed || [];
    return {
      weapons,
      sustainedDps: Math.round(sustained),
      broadsideAlpha: Math.round(alpha),
      estimated: weapons.some(w => w.estimated),
      unparsedFurniture: unparsed,
    };
  },

  /* Armor-independent relative comparison. */
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
