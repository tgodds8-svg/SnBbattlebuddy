/* SnB Loadouts — data layer.
 * Loads the baked-in JSON data files (fully offline) and exposes
 * normalized lookup helpers. Entries flagged estimated:true are
 * unverified community numbers; the UI must surface that. */
'use strict';

const DB = {
  weapons: [],
  ships: [],
  furniture: [],
  mechanics: null,
  seasonal: null,
  masteryTree: null,
  meta: {},

  async load() {
    const [weapons, ships, furniture, mechanics, seasonal, masteryTree] = await Promise.all([
      fetch('data/weapons.json').then(r => r.json()),
      fetch('data/ships.json').then(r => r.json()),
      fetch('data/furniture.json').then(r => r.json()),
      fetch('data/mechanics.json').then(r => r.json()),
      fetch('data/seasonal_buffs.json').then(r => r.json()),
      fetch('data/mastery_tree_y3s2.json').then(r => r.json()),
    ]);
    this.weapons = weapons.weapons || [];
    this.ships = ships.ships || [];
    this.furniture = furniture.furniture || [];
    this.mechanics = mechanics.mechanics || {};
    this.seasonal = seasonal;
    this.masteryTree = masteryTree;
    this.meta = {
      weapons_verified: weapons.last_verified,
      ships_verified: ships.last_verified,
      furniture_verified: furniture.last_verified,
      season: seasonal.season || 'Y3S2',
      season_dates: seasonal.season_dates || null,
    };
    // Raw payloads for reference tables (status effects etc.)
    this.raw = { weapons, ships, furniture, mechanics, seasonal, masteryTree };
  },

  weaponByName(name) { return this.weapons.find(w => w.name === name) || null; },
  shipByName(name) { return this.ships.find(s => s.name === name) || null; },
  furnitureByName(name) { return this.furniture.find(f => f.name === name) || null; },

  /** Weapons valid for a slot position (broadside_port/starboard match "broadside"). */
  weaponsForSlot(position) {
    const pos = position.toLowerCase();
    return this.weapons.filter(w => {
      const slots = (w.slot || '').toLowerCase().split('/');
      return slots.some(s => {
        if (pos === 'auxiliary') return s.includes('aux');
        if (pos.startsWith('broadside')) return s.includes('broadside');
        return s.includes(pos) || pos.includes(s);
      });
    });
  },

  /** Slot positions for a ship, expanding e.g. auxiliary stations. */
  slotsForShip(ship) {
    const out = [];
    (ship.weapon_slots || []).forEach(ws => {
      const n = ws.stations || 1;
      for (let i = 0; i < n; i++) {
        out.push({ position: ws.position, index: i, notes: ws.notes || '' });
      }
    });
    return out;
  },

  /** Documented seasonal nodes (buffs tab). */
  seasonalNodes() { return (this.seasonal && this.seasonal.nodes) || []; },

  /** Full Y3S2 mastery tree catalog (565 nodes). */
  masteryNodes() { return (this.masteryTree && this.masteryTree.nodes) || []; },

  statusReference() {
    return (this.raw && this.raw.weapons.status_effect_reference) || {};
  },
};
