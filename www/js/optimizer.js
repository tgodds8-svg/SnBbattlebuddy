/* SnB Loadouts — loadout optimizer ("the machine") & Flagship Presets. */
'use strict';

const Optimizer = {

  ENEMIES: {
    'open-seas': {
      name: 'Open Seas (PvE)', icon: '🌊',
      archetypes: ['electric', 'explosive', 'fire'],
      note: 'General PvE. Electric brings published Stormstruck ticks; explosive and fire bring heavy AoE.',
    },
    'la-peste': {
      name: 'La Peste', icon: '☠️',
      archetypes: ['electric', 'explosive', 'piercing'],
      note: 'No published weakness data for La Peste — optimizing for raw DPS with status coverage.',
    },
    'maelstrom': {
      name: 'Maelstrom', icon: '🌀',
      archetypes: ['electric', 'explosive', 'flooding'],
      note: 'No published weakness data for the Maelstrom — optimizing for raw DPS with status coverage.',
    },
    'pvp': {
      name: 'PvP Helm Wager / Cutthroat', icon: '⚔️',
      archetypes: ['tearing', 'explosive', 'electric'],
      note: 'Players dodge and repair. Tearing wrecks sails (slows escapes); alpha burst punishes mistakes.',
    },
  },

  OBJECTIVES: {
    'dps': {
      name: 'Sustained DPS Race', icon: '🔥',
      note: 'Maximum damage over time. Best for grinding and boss fights.',
    },
    'alpha': {
      name: 'Alpha Broadside Strike', icon: '💥',
      note: 'Biggest single broadside dump. Best for ambushes and PvP punishes.',
    },
    'survive': {
      name: 'Outlast & Tank', icon: '🛡️',
      note: 'Stay afloat first, kill second. Repair furniture + heavy armor.',
    },
    'speed': {
      name: 'Pursuit & Ramming', icon: '💨',
      note: 'Speed and positioning. Sailing furniture first; guns stay honest.',
    },
  },

  CURATED_MAJORS: {
    electric: "St. Elmo's Chains",
    explosive: "Wyrms' Breath Churner",
    flooding: 'Drowning Cabinet',
    fire: 'HELLSHOT SMITHY',
    piercing: 'Shot Carving Station',
    tearing: 'Megaphone',
    toxic: 'Stinkpot Station',
    support: 'First Aid Station',
    general: 'Megaphone',
  },

  PRESETS: [
    {
      id: 'flagship-brig-ram',
      name: 'In Too Deep — Brigantine Ram',
      tagline: 'Brigantine · Flooding Ram & Hit-and-Run',
      ship: 'Brigantine',
      armor: 'Leviathan',
      weapons: [
        { position: 'bow', name: 'The Drowned One' },
        { position: 'broadside_port', name: 'Carronade' },
        { position: 'broadside_starboard', name: 'Carronade' },
        { position: 'stern', name: 'Carronade' },
        { position: 'auxiliary', name: 'De Breker' },
      ],
      furniture: {
        major: 'Drowning Cabinet',
        minors: ['Trunnion Furnace', 'BREECHLOCK FURNACE', 'COUNTERTHRUST LOCKER', 'Caustic Spall Station', 'Beam Supports'],
      },
      why: 'The ram is the primary weapon here: Counterthrust Locker grants +300% acceleration for 5s after ramming to disengage cleanly while Drowned One and Carronades punish Flooded targets with severe damage.',
    },
    {
      id: 'flagship-junk-fire',
      name: 'Relentless — Junk Inferno',
      tagline: 'Junk · Sustained Fire & Ablaze Spread',
      ship: 'Junk',
      armor: 'Phoenix Crest',
      weapons: [
        { position: 'bow', name: 'Nashkar' },
        { position: 'broadside_port', name: 'Phoenix Talons' },
        { position: 'broadside_starboard', name: 'Phoenix Talons' },
        { position: 'stern', name: 'Hellepoort' },
        { position: 'auxiliary', name: 'Infernal Maw' },
      ],
      furniture: { major: 'HELLSHOT SMITHY', minors: ['Sea Fire Works I', 'Volatile Fuel I', 'Sticky Fuel Station I', 'Gunpowder Bench I', 'Beam Supports'] },
      why: 'Hellshot Smithy applies Charred on heavy burning hits (+30% burning damage taken) and spreads fire across nearby hulls. Nashkar and Hellepoort sustain hull health through lifesteal while Phoenix Talons stack Ablaze.',
    },
    {
      id: 'flagship-frigate-taunt',
      name: 'Iron Bastion — Frigate Taunt Loop',
      tagline: 'Frigate · Non-Electric Tank & Weakpoint Control',
      ship: 'Frigate',
      armor: 'Royal Custodian',
      weapons: [
        { position: 'bow', name: 'Lange Kartouwe' },
        { position: 'broadside_port', name: 'Faule Ilse' },
        { position: 'broadside_starboard', name: 'Faule Ilse' },
        { position: 'stern', name: "Urban's Great Gun" },
        { position: 'auxiliary', name: 'Infernal Maw' },
      ],
      furniture: {
        major: 'Shot Carving Station',
        minors: ['Beam Supports', 'Decoy Deck', 'Maintained Arsenal I', 'Accelerated Gunrail Smithy', 'Inverted Flag Rack'],
      },
      why: 'Built for shock-resistant encounters: Lange Kartouwe triggers guaranteed 7,500 delayed explosions on weakpoint hits to feed Shot Carving Station’s Taunting Charge, while Faule Ilse shreds weakpoints.',
    },
    {
      id: 'flagship-frigate-electric',
      name: 'Tempest — Frigate Electric Storm',
      tagline: 'Frigate · Stormstruck Chain Lightning',
      ship: 'Frigate',
      armor: 'Living Bastion',
      weapons: [
        { position: 'bow', name: 'Divine Thunder' },
        { position: 'broadside_port', name: 'Thunder Dragon Cannon' },
        { position: 'broadside_starboard', name: 'Thunder Dragon Cannon' },
        { position: 'stern', name: 'Divine Thunder' },
        { position: 'auxiliary', name: 'Infernal Maw' },
      ],
      furniture: {
        major: "St. Elmo's Chains",
        minors: ['Leyden Vault Array', 'Cannonball Charging Station', 'Copper Fastening Station'],
      },
      why: 'Thunder Dragon Cannons apply Stormstruck across broadsides while Leyden Vault Array adds +8% damage vs Stormstruck targets and -6% electric reload. St. Elmo’s Chains arcs lightning to nearby ships off Flooded targets.',
    },
    {
      id: 'flagship-garuda-loop',
      name: 'Sharpshooter — Garuda Weakpoint Loop',
      tagline: 'Garuda · Long-Range Piercing & Taunt Control',
      ship: 'Garuda',
      armor: 'Crimson Lotus',
      weapons: [
        { position: 'bow', name: 'Lange Kartouwe' },
        { position: 'broadside_port', name: 'Faule Ilse' },
        { position: 'broadside_starboard', name: 'Phoenix Talons' },
        { position: 'stern', name: "Urban's Great Gun" },
        { position: 'auxiliary', name: 'Infernal Maw' },
      ],
      furniture: {
        major: 'Shot Carving Station',
        minors: ['Beam Supports', 'Decoy Deck', 'Maintained Arsenal I', 'Accelerated Gunrail Smithy', 'Inverted Flag Rack'],
      },
      why: 'Pairs Garuda’s Deadeye range scaling with Lange Kartouwe weakpoint explosions and Faule Ilse ricochets, keeping targets Taunted for +14% bonus damage via Inverted Flag Rack.',
    },
    {
      id: 'flagship-galleon-maw',
      name: 'Hellfire — Galleon Minefield & Broadside',
      tagline: 'Galleon · Buoy Saturation & Heavy Broadside',
      ship: 'Galleon',
      armor: 'Living Bastion',
      weapons: [
        { position: 'bow', name: 'Fire Long Gun III' },
        { position: 'broadside_port', name: 'Faule Ilse' },
        { position: 'broadside_starboard', name: 'Faule Ilse' },
        { position: 'stern', name: 'Fire Long Gun III' },
        { position: 'auxiliary', name: 'Infernal Maw' },
      ],
      furniture: {
        major: 'Buoy Locker I',
        minors: ['Sea Fire Works I', 'BREECHLOCK FURNACE'],
      },
      why: 'Buoy Locker I saturates the water with Infernal Maw Sea Fire Mines while 17-gun Faule Ilse broadsides shred hulls at close range.',
    },
  ],

  scoreCtx(mastery) {
    return {
      stacking: Calc.defaultStacking(),
      mastery: mastery || {},
      assumptions: {
        rangeM: 300,
        weakpointRate: 20,
        weakpointBonus: 50,
        impetusUptime: 0.5,
        firepowerOrderUptime: 0.15,
        stormstruckArcs: 2,
      },
    };
  },

  weaponScore(weapon, position, ctx) {
    const r = Calc.weaponDps(
      { weapon, position, shotsPerVolley: 1, ascension: { tier: 'none', flat: 0, pct: 0 } },
      ctx
    );
    return r.dps;
  },

  pickWeapons(ship, archetype, ctx, objective, includeEstimated) {
    const rangeM = (ctx.assumptions && ctx.assumptions.rangeM) || 300;
    const slots = DB.slotsForShip(ship);
    return slots.map(s => {
      let cands = DB.weaponsForSlot(s.position)
        .filter(w => (w.range_m || 9999) >= rangeM)
        .filter(w => includeEstimated || !w.estimated);

      if (archetype !== 'general') {
        const strict = cands.filter(w => Archetypes.weaponArchetypes(w).includes(archetype));
        const withGeneral = cands.filter(w => {
          const a = Archetypes.weaponArchetypes(w);
          return a.includes(archetype) || a.includes('general');
        });
        if (strict.length >= 2) cands = strict;
        else if (withGeneral.length >= 2) cands = withGeneral;
      }

      let best = null;
      cands.forEach(w => {
        const score = this.weaponScore(w, s.position, ctx);
        const finalScore = (objective === 'alpha' && s.position.toLowerCase().startsWith('broadside'))
          ? (w.damage_per_shot || 0)
          : score;
        if (!best || finalScore > best.score) best = { position: s.position, weapon: w, score: finalScore };
      });
      return best;
    }).filter(Boolean);
  },

  pickMajor(archetype) {
    const curated = this.CURATED_MAJORS[archetype];
    if (curated) {
      const item = DB.furnitureByName(curated);
      if (item) return item;
    }
    const cands = DB.furniture.filter(f => (f.tier || '').toLowerCase() === 'major');
    const scored = cands.map(f => {
      const arch = Archetypes.furnitureArchetypes(f);
      const tmpl = Calc.templateFor(f.name);
      return {
        item: f,
        score: (arch.includes(archetype) ? 3 : 0) + (tmpl.length > 0 ? 2 : 0) + (f.verified_from_gameplay ? 1 : 0),
      };
    }).filter(s => s.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.length ? scored[0].item : null;
  },

  pickMinors(weapons, archetype, count) {
    const cands = DB.furniture.filter(f => (f.tier || '').toLowerCase() !== 'major');
    const scored = cands.map(f => {
      const tmpl = Calc.templateFor(f.name);
      let value = 0;
      const hits = [];
      tmpl.forEach(m => {
        weapons.forEach(w => {
          if (Calc.modifierMatches(m, w.weapon, w.position)) {
            value += m.value;
            hits.push(m.note);
          }
        });
      });
      const arch = Archetypes.furnitureArchetypes(f);
      if (arch.includes(archetype)) value += 0.05;
      return { item: f, value, hits, hasTemplate: tmpl.length > 0 };
    });
    scored.sort((a, b) => b.value - a.value);
    return scored.slice(0, count);
  },

  toLoadout(shipName, weaponPicks, major, minors, label, armorItem) {
    const ship = DB.shipByName(shipName);
    return {
      name: label,
      shipName,
      armor: armorItem || null,
      weaponSlots: weaponPicks.map(p => ({
        position: p.position,
        index: 0,
        weapon: p.weapon,
        shotsPerVolley: DB.defaultVolleyFor(ship, p.position),
        ascension: { tier: 'none', flat: 0, pct: 0 },
        customMods: [],
        extraStatusDps: 0,
      })),
      furniture: [
        { kind: 'major', item: major, customMods: [] },
        ...minors.map(m => ({ kind: 'minor', item: m.item, customMods: [] })),
      ],
      minorSlots: minors.length,
    };
  },

  explain(loadout, archetype, enemy, objective, result) {
    const lines = [];
    const meta = Archetypes.META[archetype] || Archetypes.META.general;
    lines.push(`${meta.icon} <strong>${meta.name} core</strong> — ${meta.blurb}.`);

    const synergies = [];
    (loadout.furniture || []).forEach(f => {
      if (!f.item) return;
      Calc.templateFor(f.item.name).forEach(m => {
        const helped = (loadout.weaponSlots || []).filter(s =>
          s.weapon && Calc.modifierMatches(m, s.weapon, s.position));
        if (helped.length) {
          const names = [...new Set(helped.map(s => s.weapon.name))];
          synergies.push(`<strong>${this._esc(f.item.name)}</strong>: ${this._esc(m.note)} → ${names.map(this._esc).join(', ')}`);
        }
      });
    });
    if (synergies.length) {
      lines.push('Synergies at work:<ul>' + synergies.map(s => `<li>${s}</li>`).join('') + '</ul>');
    }

    const ship = DB.shipByName(loadout.shipName);
    if (ship && ship.ship_perks && ship.ship_perks.length) {
      lines.push('Ship perks: ' + ship.ship_perks.map(p => `<strong>${this._esc(p.name)}</strong>`).join(', ') + '.');
    }

    const caveats = [];
    if (result.estimated) caveats.push('contains community-estimated stats');
    if (result.unparsedFurniture && result.unparsedFurniture.length) {
      caveats.push('utility/unparsed furniture: ' + result.unparsedFurniture.map(this._esc).join(', '));
    }
    caveats.push('armor mitigation curve is unpublished — relative rankings are the strongest signal');
    if (enemy.note) caveats.push(this._esc(enemy.note));
    lines.push('<span class="why-caveat">Notes: ' + caveats.join(' · ') + '.</span>');

    return lines.join('<br>');
  },

  _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  },

  optimize(shipName, enemyId, objectiveId, opts) {
    opts = opts || {};
    const ship = DB.shipByName(shipName);
    if (!ship) return { error: 'Unknown ship: ' + shipName };
    const enemy = this.ENEMIES[enemyId] || this.ENEMIES['open-seas'];
    const objective = this.OBJECTIVES[objectiveId] || this.OBJECTIVES['dps'];
    const ctx = this.scoreCtx(opts.mastery);
    if (opts.rangeM) ctx.assumptions.rangeM = opts.rangeM;
    const includeEstimated = !!opts.includeEstimated;

    let archetypes = [...enemy.archetypes];
    if (objectiveId === 'survive') archetypes = ['support', ...archetypes];
    if (objectiveId === 'speed') archetypes = ['general', ...archetypes];
    archetypes = [...new Set(archetypes)].slice(0, 3);

    const minorCount = Math.max(0, ((ship.furniture_slots && ship.furniture_slots.total) || 5) - 1);

    const results = archetypes.map(arch => {
      const weaponPicks = this.pickWeapons(ship, arch, ctx, objectiveId, includeEstimated);
      let major, minors, furnNote = null, armorPick = DB.armorByName('Leviathan') || DB.armorByName('Black Prince');
      if (objectiveId === 'survive') {
        major = DB.furnitureByName('First Aid Station') || this.pickMajor('support');
        minors = this.pickMinors(weaponPicks, 'support', minorCount);
        armorPick = DB.armorByName('Ouroboros') || DB.armorByName('Living Bastion') || armorPick;
        furnNote = 'Survival furniture & armor prioritized: repair first, DPS second.';
      } else if (objectiveId === 'speed') {
        major = DB.furnitureByName('War Drums') || this.pickMajor('general');
        minors = this.pickMinors(weaponPicks, 'general', minorCount);
        const ct = DB.furnitureByName('COUNTERTHRUST LOCKER');
        if (ct && minors.length && !minors.some(m => m.item.name === ct.name)) {
          minors[minors.length - 1] = { item: ct, value: 0, hits: [], hasTemplate: false };
        }
        furnNote = 'Speed furniture prioritized: mobility & ramming first.';
      } else {
        major = this.pickMajor(arch);
        minors = this.pickMinors(weaponPicks, arch, minorCount);
      }

      const loadout = this.toLoadout(
        shipName,
        weaponPicks,
        major,
        minors.map(m => (m.item ? m : { item: null })),
        `${Archetypes.META[arch].name} — ${enemy.name}`,
        armorPick
      );
      const result = Calc.loadoutDps(loadout, ctx);
      let why = this.explain(loadout, arch, enemy, objective, result);
      if (furnNote) why = `<strong>${furnNote}</strong><br>` + why;
      if (major && !Calc.templateFor(major.name).length) {
        why += `<br><span class="why-caveat">${this._esc(major.name)}: utility/proc perk — picked for build synergy.</span>`;
      }
      return { loadout, archetype: arch, result, why, weaponPicks };
    });

    const key = objectiveId === 'alpha'
      ? (r => r.result.broadsideAlpha)
      : (r => r.result.sustainedDps);
    results.sort((a, b) => key(b) - key(a));

    return { results, scenario: { enemy, objective, shipName } };
  },

  presetLoadout(presetId) {
    const p = this.PRESETS.find(x => x.id === presetId);
    if (!p) return null;
    const ship = DB.shipByName(p.ship);
    const weaponSlots = p.weapons.map(w => {
      const weapon = DB.weaponByName(w.name);
      return {
        position: w.position,
        index: 0,
        weapon,
        shotsPerVolley: DB.defaultVolleyFor(ship, w.position),
        ascension: { tier: 'none', flat: 0, pct: 0 },
        customMods: [],
        extraStatusDps: 0,
      };
    }).filter(s => s.weapon);
    const major = DB.furnitureByName(p.furniture.major);
    const minors = p.furniture.minors.map(n => DB.furnitureByName(n)).filter(Boolean);
    const armor = p.armor ? DB.armorByName(p.armor) : null;
    return {
      name: p.name,
      shipName: p.ship,
      armor,
      weaponSlots,
      furniture: [
        { kind: 'major', item: major || null, customMods: [] },
        ...minors.map(m => ({ kind: 'minor', item: m, customMods: [] })),
      ],
      minorSlots: minors.length,
      _presetWhy: p.why,
      _presetTagline: p.tagline,
    };
  },
};
