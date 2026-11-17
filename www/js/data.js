/* SnB Loadouts — data layer (verified & normalized edition).
 * Loads baked-in JSON data files cleanly inside WebViews/Capacitor APKs
 * and exposes alias-safe, case-insensitive lookup helpers. */
'use strict';

const DB = {
  weapons: [],
  ships: [],
  armors: [],
  furniture: [],
  mechanics: null,
  seasonal: null,
  masteryTree: null,
  meta: {},
  raw: {},

  norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[\u2018\u2019']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  ALIASES: {
    'worms breath turner': 'wyrms breath churner',
    'wyrms breath churner': 'wyrms breath churner',
    'daycurvage station': 'atelier de cuivrage',
    'nashkar long gun': 'nashkar',
    'buoy locker': 'buoy locker i',
    'spiteful spikes station': 'spikes station',
    'pain piper': 'pain-piper',
    'cannonball-charging station': 'cannonball charging station',
    'riffled barrel workshop': 'rifled barrel workshop',
  },

  _resolveKey(name) {
    const k = this.norm(name);
    return this.ALIASES[k] || k;
  },

  async load() {
    const fetchJson = (url, fallback) =>
      fetch(url).then(r => (r.ok ? r.json() : fallback)).catch(() => fallback);

    const [weapons, ships, furniture, mechanics, seasonal, masteryTree, armorRaw] = await Promise.all([
      fetchJson('data/weapons.json', { weapons: [] }),
      fetchJson('data/ships.json', { ships: [] }),
      fetchJson('data/furniture.json', { furniture: [] }),
      fetchJson('data/mechanics.json', { mechanics: {} }),
      fetchJson('data/seasonal_buffs.json', { nodes: [] }),
      fetchJson('data/mastery_tree_y3s2.json', { nodes: [] }),
      fetchJson('data/armor.json', []),
    ]);

    this.weapons = weapons.weapons || [];
    this.ships = ships.ships || [];
    this.furniture = furniture.furniture || [];
    this.armors = Array.isArray(armorRaw) ? armorRaw : (armorRaw.armors || armorRaw.armor || []);
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
    this.raw = { weapons, ships, furniture, mechanics, seasonal, masteryTree, armors: this.armors };
  },

  weaponByName(name) {
    const key = this._resolveKey(name);
    if (!key) return null;
    const matches = this.weapons.filter(w => this._resolveKey(w.name) === key);
    if (!matches.length) return null;
    return matches.find(w => w.reload_time_s && w.damage_per_shot) || matches[0];
  },

  shipByName(name) {
    const key = this._resolveKey(name);
    return key ? (this.ships.find(s => this._resolveKey(s.name) === key) || null) : null;
  },

  furnitureByName(name) {
    const key = this._resolveKey(name);
    return key ? (this.furniture.find(f => this._resolveKey(f.name) === key) || null) : null;
  },

  armorByName(name) {
    const key = this._resolveKey(name);
    return key ? (this.armors.find(a => this._resolveKey(a.name) === key) || null) : null;
  },

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

  slotsForShip(ship) {
    if (!ship) return [];
    let rawSlots = ship.weapon_slots;
    if (!rawSlots || !rawSlots.length) {
      rawSlots = [
        { position: 'bow' },
        { position: 'broadside_port' },
        { position: 'broadside_starboard' },
        { position: 'stern' },
        { position: 'auxiliary' },
      ];
    }
    const out = [];
    rawSlots.forEach(ws => {
      const n = ws.stations || 1;
      for (let i = 0; i < n; i++) {
        out.push({
          position: ws.position,
          index: i,
          notes: ws.notes || '',
          gunports: ws.gunports || ((ws.gunports_upper || 0) + (ws.gunports_lower || 0)) || null,
        });
      }
    });
    return out;
  },

  defaultVolleyFor(ship, position) {
    const pos = (position || '').toLowerCase();
    if (!pos.startsWith('broadside')) return 1;
    if (!ship) return 6;
    const slot = (ship.weapon_slots || []).find(s => (s.position || '').toLowerCase() === pos);
    if (slot) {
      const total = slot.gunports || ((slot.gunports_upper || 0) + (slot.gunports_lower || 0));
      if (total > 0) return total;
    }
    if (ship.size === 'large') return 14;
    if (ship.size === 'small' || ship.size === 'extra-small') return 3;
    return 6;
  },

  seasonalNodes() { return (this.seasonal && this.seasonal.nodes) || []; },
  masteryNodes() { return (this.masteryTree && this.masteryTree.nodes) || []; },
  statusReference() {
    return (this.raw && this.raw.weapons && this.raw.weapons.status_effect_reference) || {};
  },
};
