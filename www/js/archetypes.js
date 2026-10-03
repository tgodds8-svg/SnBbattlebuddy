/* SnB Loadouts — build-archetype taxonomy.
 *
 * Derived purely from existing data fields (no number/formula/data changes):
 *  - weapons: damage_types keys + status_effects effect names
 *  - furniture: perk_text keyword signals
 * Ambiguous items land in "general" rather than being guessed.
 * Plain-language, community-edition voice throughout.
 */
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

  // damage_types key -> archetype (weapons)
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
  // status effect name -> archetype (weapons). Taunted is utility — no archetype.
  _STATUS: {
    Stormstruck: 'electric', 'Shell-shocked': 'explosive', Flooded: 'flooding',
    Ablaze: 'fire', Punctured: 'piercing', 'Torn Sails': 'tearing', Poisoned: 'toxic',
  },
  // perk_text keyword -> archetype (furniture), checked in order of appearance
  _PERK_PATS: [
    ['electric', /electric|stormstruck|leyden/i],
    ['explosive', /explos/i],
    ['flooding', /flood/i],
    ['fire', /abla|burn|\bfire\b/i],
    ['piercing', /pierc/i],
    ['tearing', /tearing/i],
    ['toxic', /toxic|poison/i],
    ['support', /repair|\bheal/i],
  ],

  /** Archetype list for a weapon, primary first. Always non-empty. */
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

  /** Archetype list for a furniture piece, primary first. Always non-empty. */
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

  /** Small icon chips showing every archetype an item serves. HTML string. */
  chips(list) {
    return '<span class="arch-chips">' + list.map(a => {
      const m = this.META[a] || this.META.general;
      return `<span class="arch-chip" title="${m.name} — ${m.blurb}">${m.icon}</span>`;
    }).join('') + '</span>';
  },
};

/* ------------------------------------------------------------------ */
/* Curated starter templates: one per archetype, full-catalog coverage. */
/* Every name below was verified against data/weapons.json,            */
/* data/furniture.json and data/ships.json.                            */
/* ------------------------------------------------------------------ */
const TEMPLATES = [
  {
    id: 'stormcaller', archetype: 'electric', name: 'Stormcaller',
    tagline: 'Frigate · Electric',
    synergy: 'Thunder Dragon Cannons deal electric damage and slap Stormstruck on everything they touch. Leyden Vault Array turns that into bonus electric damage plus faster electric reloads — and it hits Stormstruck targets even harder. St. Elmo\u2019s Chains makes your lightning arc to nearby ships whenever you hit a Flooded target, so sail with a flooding friend and watch it chain.',
    ship: 'Frigate',
    weapons: [
      { position: 'bow', name: 'Divine Thunder', shots: 1 },
      { position: 'broadside_port', name: 'Thunder Dragon Cannon', shots: 6 },
      { position: 'broadside_starboard', name: 'Thunder Dragon Cannon', shots: 6 },
      { position: 'stern', name: 'Divine Thunder', shots: 1 },
    ],
    furniture: { major: "St. Elmo's Chains", minors: ['Leyden Vault Array', 'Cannonball Charging Station', 'Copper Fastening Station'] },
  },
  {
    id: 'demolitionist', archetype: 'explosive', name: 'Demolitionist',
    tagline: 'Snow · Explosive',
    synergy: 'Everything here booms. Bombards and the Explosive Demi-cannons stack Shell-shocked, and Wyrm\u2019s Breath Churner piles secondary damage onto all your explosive weapons. Honest note: no explosive minor furniture exists in the data yet, so the minors are plain damage and stamina to keep you in the fight.',
    ship: 'Snow',
    weapons: [
      { position: 'bow', name: 'Bombard V', shots: 1 },
      { position: 'broadside_port', name: 'Explosive Demi-cannon III', shots: 1 },
      { position: 'broadside_starboard', name: 'Explosive Demi-cannon III', shots: 1 },
      { position: 'stern', name: 'Bombard V', shots: 1 },
      { position: 'auxiliary', name: 'Mortar III', shots: 1 },
    ],
    furniture: { major: "Wyrm's Breath Churner", minors: ['BREECHLOCK FURNACE', 'STERILE GALLEY I'] },
  },
  {
    id: 'tidecaller', archetype: 'flooding', name: 'Tidecaller',
    tagline: 'Padewakang · Flooding',
    synergy: 'Drowning Cabinet is the heart of any flooding build: more flooding weapon damage, faster flooding reloads, and Flooded lasts longer on your targets. Torpedoes and Flooding Demi-cannons stack Flooded fast — drown them first, then let the water do the work.',
    ship: 'Padewakang',
    weapons: [
      { position: 'bow', name: 'Torpedo III', shots: 1 },
      { position: 'broadside_port', name: 'Flooding Demi-cannon III', shots: 1 },
      { position: 'broadside_starboard', name: 'Flooding Demi-cannon III', shots: 1 },
      { position: 'stern', name: 'Woundcaller', shots: 1 },
      { position: 'auxiliary', name: 'De Breker', shots: 1 },
    ],
    furniture: { major: 'DROWNING CABINET', minors: ['Lead Kettle I', 'Rifled Barrel Workshop', 'Debris Locker'] },
  },
  {
    id: 'pyromaniac', archetype: 'fire', name: 'Pyromaniac',
    tagline: 'Barque · Fire',
    synergy: 'Hellshot Smithy feeds all your fire damage, and the fuel stations stretch every burn. Burning Culverins and Fire Long Guns keep Ablaze rolling while the Infernal Maw drops sea-fire mines in your wake — everything that catches fire stays on fire.',
    ship: 'Barque',
    weapons: [
      { position: 'bow', name: 'Fire Long Gun III', shots: 1 },
      { position: 'broadside_port', name: 'Burning Culverin III', shots: 1 },
      { position: 'broadside_starboard', name: 'Burning Culverin III', shots: 1 },
      { position: 'stern', name: 'Fire Long Gun III', shots: 1 },
      { position: 'auxiliary', name: 'Infernal Maw', shots: 1 },
    ],
    furniture: { major: 'HELLSHOT SMITHY', minors: ['Sea Fire Works I', 'Volatile Fuel I', 'Sticky Fuel Station I'] },
  },
  {
    id: 'needlepoint', archetype: 'piercing', name: 'Needlepoint',
    tagline: 'Brig · Piercing',
    synergy: 'Piercing is about weak points and raw hull damage. Shot Carving Station sharpens the whole setup, and the ballast and kegs keep your shots flying flat and fast. Aim for the waterline and watch hull bars disappear.',
    ship: 'Brig',
    weapons: [
      { position: 'bow', name: 'Ballista III', shots: 1 },
      { position: 'broadside_port', name: 'Piercing Demi-cannon III', shots: 1 },
      { position: 'broadside_starboard', name: 'Piercing Demi-cannon III', shots: 1 },
      { position: 'stern', name: 'Long Gun V', shots: 1 },
      { position: 'auxiliary', name: "L'Aiguille", shots: 1 },
    ],
    furniture: { major: 'Shot Carving Station', minors: ['DYNAMIC BALLAST CONTROL', 'High-Velocity Kegs'] },
  },
  {
    id: 'sailshredder', archetype: 'tearing', name: 'Sailshredder',
    tagline: 'Sambuk · Tearing',
    synergy: 'Honest note: no furniture in the data buffs tearing specifically yet, so this runs on raw sail-shredding. Tearing guns stack Torn Sails and slow your target to a crawl, while Megaphone and the Breechlock keep your reloads and damage honest. Shred their sails, then pick them apart at your leisure.',
    ship: 'Sambuk',
    weapons: [
      { position: 'bow', name: 'Tearing Long Gun III', shots: 1 },
      { position: 'broadside_port', name: 'Tearing Culverin III', shots: 1 },
      { position: 'broadside_starboard', name: 'Tearing Culverin III', shots: 1 },
      { position: 'stern', name: 'Tearing Long Gun III', shots: 1 },
    ],
    furniture: { major: 'Megaphone', minors: ['BREECHLOCK FURNACE', 'STERILE GALLEY I'] },
  },
  {
    id: 'plaguedoctor', archetype: 'toxic', name: 'Plague Doctor',
    tagline: 'Snow · Toxic',
    synergy: 'Stinkpot Station is the heart of any poison build, and the benches stretch your Poisoned duration and damage. Stack Poisoned with every volley and let it eat the hull while you circle out of range.',
    ship: 'Snow',
    weapons: [
      { position: 'bow', name: 'La Piqûre', shots: 1 },
      { position: 'broadside_port', name: 'Brightmaw', shots: 1 },
      { position: 'broadside_starboard', name: 'Brightmaw', shots: 1 },
      { position: 'stern', name: 'Blightbearer', shots: 1 },
    ],
    furniture: { major: 'Stinkpot Station', minors: ['La Potence Schematics I', 'Curare Crushing Bench', 'Apothecary Tool Bench'] },
  },
  {
    id: 'lifeline', archetype: 'support', name: 'Lifeline',
    tagline: 'Barque · Support',
    synergy: 'First Aid Station plus the hull and joinery pieces keep you — and anyone near you — patched up. Repair guns heal on hit; the broadsides carry plain Demi-cannons for self-defense while the repair pieces do the real work. Swap First Aid Station for Buoy Locker I if you run a Springloader.',
    ship: 'Barque',
    weapons: [
      { position: 'bow', name: 'Repair Long Gun III', shots: 1 },
      { position: 'broadside_port', name: 'Demi-cannon V', shots: 1 },
      { position: 'broadside_starboard', name: 'Demi-cannon V', shots: 1 },
      { position: 'stern', name: 'Repair Bombard III', shots: 1 },
      { position: 'auxiliary', name: 'Repair Mortar III', shots: 1 },
    ],
    furniture: { major: 'First Aid Station', minors: ['DOUBLE-PLANKED HULL I', 'ORGAN HARVESTING STATION', 'Joinery Workshop I'] },
  },
  {
    id: 'firstcommand', archetype: 'general', name: 'First Command',
    tagline: 'Sloop · Beginner',
    synergy: 'No element, no problem. Plain guns, faster reloads the more you land hits, extra damage up close, and stamina to keep you moving. Learn the ropes here — then pick an element above and go deep.',
    ship: 'Sloop',
    weapons: [
      { position: 'bow', name: 'Culverin V', shots: 1 },
      { position: 'broadside_port', name: 'Demi-cannon V', shots: 1 },
      { position: 'broadside_starboard', name: 'Demi-cannon V', shots: 1 },
    ],
    furniture: { major: 'Megaphone', minors: ['BREECHLOCK FURNACE', 'STERILE GALLEY I'] },
  },
];
