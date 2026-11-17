/* SnB Loadouts — build-archetype taxonomy & verified starter templates. */
'use strict';

const Archetypes = {
  ORDER: ['electric', 'explosive', 'flooding', 'fire', 'piercing', 'tearing', 'toxic', 'support', 'general'],

  META: {
    electric:  { icon: '⚡', name: 'Electric',  blurb: 'Shock damage and Stormstruck — lightning that punishes wet targets' },
    explosive: { icon: '💥', name: 'Explosive', blurb: 'Big booms — bombards, mortars and area damage' },
    flooding:  { icon: '🌊', name: 'Flooding',  blurb: 'Water damage that leaves ships Flooded and sinking' },
    fire:      { icon: '🔥', name: 'Fire',      blurb: 'Burning damage and Ablaze — damage over time' },
    piercing:  { icon: '🎯', name: 'Piercing',  blurb: 'Punches through hulls and weak points' },
    tearing:   { icon: '✂️', name: 'Tearing',   blurb: 'Rips sails apart — slows ships down' },
    toxic:     { icon: '☠️', name: 'Toxic',     blurb: 'Poison that eats hulls over time' },
    support:   { icon: '🛠️', name: 'Support',   blurb: 'Repair and healing — keeps you and your allies afloat' },
    general:   { icon: '🌐', name: 'General',   blurb: 'Fits any build — plain damage, reload, sailing' },
  },

  _DMG: {
    electric: 'electric', shock: 'electric',
    explosive: 'explosive',
    flooding: 'flooding',
    burning: 'fire', fire: 'fire',
    piercing: 'piercing',
    tearing: 'tearing',
    toxic: 'toxic',
    repair: 'support',
  },

  _STATUS: {
    Stormstruck: 'electric', 'Shell-shocked': 'explosive', Flooded: 'flooding',
    Ablaze: 'fire', Burning: 'fire', Punctured: 'piercing', 'Torn Sails': 'tearing',
    Poisoned: 'toxic', Toxic: 'toxic',
  },

  _PERK_PATS: [
    ['electric', /electric|stormstruck|leyden/i],
    ['explosive', /explos|shell-shock/i],
    ['flooding', /flood/i],
    ['fire', /abla|burn|\bfire\b|charred/i],
    ['piercing', /pierc|punctur/i],
    ['tearing', /tearing|torn sails/i],
    ['toxic', /toxic|poison/i],
    ['support', /repair|\bheal/i],
  ],

  weaponArchetypes(w) {
    const sig = [];
    const push = a => { if (a && !sig.includes(a)) sig.push(a); };
    const dt = (w && w.damage_types) || {};
    Object.keys(dt).forEach(k => { if (k !== 'basic') push(this._DMG[k]); });
    ((w && w.status_effects) || []).forEach(s => {
      const e = (s && typeof s === 'object') ? s.effect : s;
      push(this._STATUS[e]);
    });
    return sig.length ? sig : ['general'];
  },

  furnitureArchetypes(f) {
    const t = String((f && f.perk_text) || '').toLowerCase();
    const hits = [];
    this._PERK_PATS.forEach(([a, pat]) => {
      const m = t.match(pat);
      if (m) hits.push([m.index, a]);
    });
    hits.sort((x, y) => x[0] - y[0]);
    const sig = [];
    hits.forEach(([, a]) => { if (!sig.includes(a)) sig.push(a); });
    return sig.length ? sig : ['general'];
  },

  chips(list) {
    return '<span class="arch-chips">' + list.map(a => {
      const m = this.META[a] || this.META.general;
      return `<span class="arch-chip" title="${m.name} — ${m.blurb}">${m.icon}</span>`;
    }).join('') + '</span>';
  },
};

/* Curated starter templates — verified against JSON catalogs. */
const TEMPLATES = [
  {
    id: 'stormcaller', archetype: 'electric', name: 'Stormcaller',
    tagline: 'Frigate · Electric',
    synergy: 'Thunder Dragon Cannons deal electric damage and inflict Stormstruck. Leyden Vault Array boosts damage against Stormstruck targets and speeds up electric reloads, while St. Elmo’s Chains arcs lightning to nearby ships off Flooded targets.',
    ship: 'Frigate',
    armor: 'Celestial Dance',
    weapons: [
      { position: 'bow', name: 'Divine Thunder', shots: 1 },
      { position: 'broadside_port', name: 'Thunder Dragon Cannon', shots: 17 },
      { position: 'broadside_starboard', name: 'Thunder Dragon Cannon', shots: 17 },
      { position: 'stern', name: 'Divine Thunder', shots: 1 },
    ],
    furniture: { major: "St. Elmo's Chains", minors: ['Leyden Vault Array', 'Cannonball Charging Station', 'Copper Fastening Station'] },
  },
  {
    id: 'demolitionist', archetype: 'explosive', name: 'Demolitionist',
    tagline: 'Snow · Explosive',
    synergy: 'Heavy explosive broadsides and Bombards stack Shell-shocked to disable enemy weapons, while Wyrms’ Breath Churner piles +25% secondary damage onto all explosive weaponry.',
    ship: 'Snow',
    armor: 'Black Prince',
    weapons: [
      { position: 'bow', name: 'Bombard V', shots: 1 },
      { position: 'broadside_port', name: 'Explosive Demi-cannon III', shots: 7 },
      { position: 'broadside_starboard', name: 'Explosive Demi-cannon III', shots: 7 },
      { position: 'stern', name: 'Bombard V', shots: 1 },
      { position: 'auxiliary', name: 'Mortar III', shots: 1 },
    ],
    furniture: { major: "Wyrms' Breath Churner", minors: ['BREECHLOCK FURNACE', 'STERILE GALLEY I'] },
  },
  {
    id: 'tidecaller', archetype: 'flooding', name: 'Tidecaller',
    tagline: 'Padewakang · Flooding',
    synergy: 'Drowning Cabinet cuts flooding weapon reloads by 10% and extends Flooded duration. Torpedoes and Flooding Demi-cannons rapidly stack Flooded to deal unrepairable Severe Damage.',
    ship: 'Padewakang',
    armor: 'Rhapsody of the Deep',
    weapons: [
      { position: 'bow', name: 'Torpedo III', shots: 1 },
      { position: 'broadside_port', name: 'Flooding Demi-cannon III', shots: 6 },
      { position: 'broadside_starboard', name: 'Flooding Demi-cannon III', shots: 6 },
      { position: 'stern', name: 'Woundcaller', shots: 1 },
      { position: 'auxiliary', name: 'De Breker', shots: 1 },
    ],
    furniture: { major: 'Drowning Cabinet', minors: ['Lead Kettle I', 'Rifled Barrel Workshop', 'Debris Locker'] },
  },
  {
    id: 'pyromaniac', archetype: 'fire', name: 'Pyromaniac',
    tagline: 'Barque · Fire',
    synergy: 'Hellshot Smithy applies Charred on heavy burning hits (+30% burning damage taken) and spreads fire across nearby targets while Infernal Maw drops sea-fire mines.',
    ship: 'Barque',
    armor: 'Phoenix Crest',
    weapons: [
      { position: 'bow', name: 'Fire Long Gun III', shots: 1 },
      { position: 'broadside_port', name: 'Burning Culverin III', shots: 6 },
      { position: 'broadside_starboard', name: 'Burning Culverin III', shots: 6 },
      { position: 'stern', name: 'Fire Long Gun III', shots: 1 },
      { position: 'auxiliary', name: 'Infernal Maw', shots: 1 },
    ],
    furniture: { major: 'HELLSHOT SMITHY', minors: ['Sea Fire Works I', 'Volatile Fuel I', 'Sticky Fuel Station I'] },
  },
  {
    id: 'needlepoint', archetype: 'piercing', name: 'Needlepoint',
    tagline: 'Brig · Piercing',
    synergy: 'Built for precision weakpoint hits and armor penetration. Shot Carving Station turns weakpoint hits into Taunt while speeding up piercing reloads.',
    ship: 'Brig',
    armor: 'Needle Shield',
    weapons: [
      { position: 'bow', name: 'Ballista III', shots: 1 },
      { position: 'broadside_port', name: 'Piercing Demi-cannon III', shots: 6 },
      { position: 'broadside_starboard', name: 'Piercing Demi-cannon III', shots: 6 },
      { position: 'stern', name: 'Long Gun V', shots: 1 },
      { position: 'auxiliary', name: "L'Aiguille", shots: 1 },
    ],
    furniture: { major: 'Shot Carving Station', minors: ['DYNAMIC BALLAST CONTROL', 'High-Velocity Kegs'] },
  },
  {
    id: 'sailshredder', archetype: 'tearing', name: 'Sailshredder',
    tagline: 'Sambuk · Tearing',
    synergy: 'Tearing guns stack Torn Sails and cut enemy speed by 75%, while Megaphone and Breechlock Furnace keep your reloads and close-range damage sharp.',
    ship: 'Sambuk',
    armor: 'Crimson Lotus',
    weapons: [
      { position: 'bow', name: 'Tearing Long Gun III', shots: 1 },
      { position: 'broadside_port', name: 'Tearing Culverin III', shots: 6 },
      { position: 'broadside_starboard', name: 'Tearing Culverin III', shots: 6 },
      { position: 'stern', name: 'Tearing Long Gun III', shots: 1 },
    ],
    furniture: { major: 'Megaphone', minors: ['BREECHLOCK FURNACE', 'STERILE GALLEY I'] },
  },
  {
    id: 'plaguedoctor', archetype: 'toxic', name: 'Plague Doctor',
    tagline: 'Snow · Toxic',
    synergy: 'Stinkpot Station powers up Poisoned targets within 250m while draining enemy crew stamina so they cannot brace.',
    ship: 'Snow',
    armor: 'Wrathful Ward',
    weapons: [
      { position: 'bow', name: 'La Piqûre', shots: 1 },
      { position: 'broadside_port', name: 'Brightmaw', shots: 7 },
      { position: 'broadside_starboard', name: 'Brightmaw', shots: 7 },
      { position: 'stern', name: 'Blightbearer', shots: 1 },
    ],
    furniture: { major: 'Stinkpot Station', minors: ['La Potence Schematics I', 'Curare Crushing Bench', 'Apothecary Tool Bench'] },
  },
  {
    id: 'lifeline', archetype: 'support', name: 'Lifeline',
    tagline: 'Barque · Support',
    synergy: 'First Aid Station plus Joinery Workshop keep you and your fleet patched up. Repair guns heal on hit while broadside Demi-cannons handle self-defense.',
    ship: 'Barque',
    armor: 'Ouroboros',
    weapons: [
      { position: 'bow', name: 'Repair Long Gun III', shots: 1 },
      { position: 'broadside_port', name: 'Demi-cannon V', shots: 6 },
      { position: 'broadside_starboard', name: 'Demi-cannon V', shots: 6 },
      { position: 'stern', name: 'Repair Bombard III', shots: 1 },
      { position: 'auxiliary', name: 'Repair Mortar III', shots: 1 },
    ],
    furniture: { major: 'First Aid Station', minors: ['DOUBLE-PLANKED HULL I', 'Joinery Workshop I', 'STERILE GALLEY I'] },
  },
  {
    id: 'firstcommand', archetype: 'general', name: 'First Command',
    tagline: 'Sloop · Beginner',
    synergy: 'No element, no problem. Plain guns, faster reloads the more hits you land, and extra damage up close.',
    ship: 'Sloop',
    armor: 'Kawaca II',
    weapons: [
      { position: 'bow', name: 'Culverin V', shots: 1 },
      { position: 'broadside_port', name: 'Demi-cannon V', shots: 3 },
      { position: 'broadside_starboard', name: 'Demi-cannon V', shots: 3 },
    ],
    furniture: { major: 'Megaphone', minors: ['BREECHLOCK FURNACE', 'STERILE GALLEY I'] },
  },
];
