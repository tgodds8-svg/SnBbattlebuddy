/* Interactive seasonal mastery tree — Y3S2 (Offline-Safe & Live-Synced).
 * Reads directly from DB.masteryTree (with fetch fallback) so Android WebViews
 * and local file:// launches load the 565-node map reliably without CORS errors.
 */
'use strict';

const MasteryTree = {
  PRESET_COUNTS: {
    'Hardened Munitions': 1, 'Volatile Arsenal': 1, 'Adaptive Arsenal': 1,
    'Impetus Order': 1, 'Vital Strike': 1, 'Fire And Steel': 1,
    'Deadeye': 12, 'Enhanced Damage': 12, 'Ready Fire': 8, 'Swift Strikes': 4,
    'Reactive Compounds': 10,
    'Persistent Compounds': 5, 'Enhanced Payload': 5, 'Concentrated Payload': 5,
    'Heavy Shot Lg': 7, 'Precision Shot': 3, 'Carved Shot Lg': 2, 'Long Gun Drills': 1
  },

  selected: new Set(),
  nodes: [],
  byKey: {},
  center: { '10': 'batteringForce', '30': 'weaknessFinder', '50': 'stormblazeOrder' },
  zoom: 1,
  searchQuery: '',

  clusterColor(name) {
    if (name === 'Reactive Compounds') return '#ff8c42';
    if (name === 'Persistent Compounds' || name === 'Enhanced Payload' || name === 'Concentrated Payload') return '#b388ff';
    if (name === 'Heavy Shot Lg' || name === 'Precision Shot' || name === 'Carved Shot Lg' || name === 'Long Gun Drills') return '#4dd0e1';
    return '#f5d76e';
  },

  selectedKeys() {
    return Array.from(this.selected);
  },

  save() {
    try {
      localStorage.setItem('snb-tree', JSON.stringify({
        sel: Array.from(this.selected),
        center: this.center
      }));
    } catch (e) {}
  },

  loadSaved() {
    try {
      const raw = JSON.parse(localStorage.getItem('snb-tree') || 'null');
      if (raw && Array.isArray(raw.sel)) {
        raw.sel.forEach(k => this.selected.add(k));
      }
      if (raw && raw.center) {
        this.center = { ...this.center, ...raw.center };
      }
    } catch (e) {}
  },

  presetKeys() {
    const counts = {};
    const out = [];
    this.nodes.forEach(n => {
      const want = this.PRESET_COUNTS[n.name];
      if (!want) return;
      counts[n.name] = (counts[n.name] || 0) + 1;
      if (counts[n.name] <= want) out.push(n.key);
    });
    return out;
  },

  parsePct(effect) {
    const m = /^(Weapon Damage|Weapon Weakpoint \(Critical\) Damage|Weapon Reload Time|Weapon Projectile Speed) ([+-]?\d+)%/.exec(effect || '');
    return m ? { label: m[1], value: parseInt(m[2], 10) } : null;
  },

  render() {
    const svg = document.getElementById('tree-svg');
    if (!svg || !this.nodes.length) return;

    const xs = this.nodes.map(n => n.position.x);
    const ys = this.nodes.map(n => n.position.y);
    const minX = Math.min(...xs) - 50;
    const maxX = Math.max(...xs) + 50;
    const minY = Math.min(...ys) - 50;
    const maxY = Math.max(...ys) + 50;

    const baseW = maxX - minX;
    const baseH = maxY - minY;
    const w = baseW / this.zoom;
    const h = baseH / this.zoom;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    svg.setAttribute('viewBox', `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);

    const q = this.searchQuery.trim().toLowerCase();
    const parts = [];

    // Draw prerequisite edges subtly for visual clarity
    this.nodes.forEach(n => {
      (n.requisite || []).forEach(reqKey => {
        const parent = this.byKey[reqKey];
        if (!parent) return;
        const activeEdge = this.selected.has(n.key) && this.selected.has(parent.key);
        parts.push(`<line x1="${parent.position.x}" y1="${parent.position.y}" x2="${n.position.x}" y2="${n.position.y}" stroke="${activeEdge ? '#d8a94e' : '#1a2c44'}" stroke-width="${activeEdge ? 3 : 1.5}" />`);
      });
    });

    // Draw nodes
    this.nodes.forEach(n => {
      const isSel = this.selected.has(n.key);
      const isCenter = n.role === 'seasonalPerk';
      const isKey = n.role === 'keyBuff';
      const isMatch = q && (n.name.toLowerCase().includes(q) || (n.effect || '').toLowerCase().includes(q));

      const r = isCenter ? 24 : (isKey ? 17 : 11);
      const fill = isSel ? this.clusterColor(n.name) : (isMatch ? '#3fd0c9' : '#16202e');
      const stroke = isMatch ? '#3fd0c9' : (isSel ? '#ffffff' : '#6c7c94');
      const sw = isMatch ? 4 : 2;
      const tip = `${n.name} — ${n.effect || ''}`.replace(/"/g, '&quot;');

      if (isCenter) {
        const x = n.position.x, y = n.position.y;
        parts.push(`<polygon points="${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" data-key="${n.key}"><title>${tip}</title></polygon>`);
      } else {
        parts.push(`<circle cx="${n.position.x}" cy="${n.position.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" data-key="${n.key}"><title>${tip}</title></circle>`);
      }
    });

    svg.innerHTML = parts.join('');
    svg.querySelectorAll('[data-key]').forEach(el => {
      el.addEventListener('click', () => {
        const k = el.getAttribute('data-key');
        if (this.selected.has(k)) this.selected.delete(k);
        else this.selected.add(k);
        this.save();
        this.render();
        if (typeof refreshNumbers === 'function') refreshNumbers();
      });
    });

    this.updatePanel();
  },

  updatePanel() {
    const countEl = document.getElementById('tree-count');
    if (countEl) {
      const over = this.selected.size > 90 ? ' ⚠ over 90 cap' : '';
      countEl.textContent = `${this.selected.size} / 80 preset · / 90 max${over}`;
    }

    const groups = {};
    this.selected.forEach(k => {
      const n = this.byKey[k];
      if (!n) return;
      groups[n.name] = (groups[n.name] || 0) + 1;
    });
    const names = Object.keys(groups).sort();
    const listEl = document.getElementById('tree-selected-list');
    if (listEl) {
      listEl.innerHTML = names.length
        ? names.map(nm => `<div class="tree-chip">${nm} <b>×${groups[nm]}</b></div>`).join('')
        : '<p class="hint">Tap nodes on the map to select, or load the preset allocation.</p>';
    }

    const sums = {};
    this.selected.forEach(k => {
      const n = this.byKey[k];
      if (!n) return;
      const p = this.parsePct(n.effect);
      if (p) sums[p.label] = (sums[p.label] || 0) + p.value;
    });
    const mathEl = document.getElementById('tree-math');
    if (mathEl) {
      const lines = Object.keys(sums).map(lb => {
        const v = sums[lb];
        return `<div>${lb}: <strong>${v > 0 ? '+' : ''}${v}%</strong> <span class="hint">(sum of node texts)</span></div>`;
      });
      mathEl.innerHTML = (lines.length ? lines.join('') : '<p class="hint">No simple % stat nodes selected yet.</p>') +
        '<p class="hint">Stacking mode (additive vs multiplicative) is configurable in the Tune tab.</p>';
    }

    const cEl = document.getElementById('tree-center');
    if (cEl) {
      cEl.innerHTML = ['10', '30', '50'].map(tier => {
        const n = this.byKey[this.center[tier]];
        return `<div><strong>Tier ${tier}:</strong> ${n ? `${n.name} — ${n.effect}` : 'none'}</div>`;
      }).join('');
    }
    const noteEl = document.getElementById('tree-unstoppable-note');
    if (noteEl) noteEl.hidden = this.center['10'] !== 'unstoppableForce';
  },

  buildCenterSelects() {
    ['10', '30', '50'].forEach(tier => {
      const sel = document.getElementById('center-' + tier);
      if (!sel) return;
      sel.innerHTML = '';
      this.nodes
        .filter(n => n.role === 'seasonalPerk' && String(n.group) === tier)
        .forEach(n => {
          const o = document.createElement('option');
          o.value = n.key;
          o.textContent = n.name;
          sel.appendChild(o);
        });
      sel.value = this.center[tier];
      sel.addEventListener('change', () => {
        this.center[tier] = sel.value;
        this.save();
        this.updatePanel();
      });
    });
  },

  bindControls() {
    const btnOpt = document.getElementById('btn-tree-optimum');
    const btnClear = document.getElementById('btn-tree-clear');
    const btnZoomIn = document.getElementById('btn-tree-zoom-in');
    const btnZoomOut = document.getElementById('btn-tree-zoom-out');
    const btnZoomReset = document.getElementById('btn-tree-zoom-reset');
    const searchInp = document.getElementById('tree-search');
    const syncChk = document.getElementById('tree-sync-dps');

    if (btnOpt) btnOpt.addEventListener('click', () => {
      this.selected = new Set(this.presetKeys());
      this.save();
      this.render();
      if (typeof refreshNumbers === 'function') refreshNumbers();
    });
    if (btnClear) btnClear.addEventListener('click', () => {
      this.selected = new Set();
      this.save();
      this.render();
      if (typeof refreshNumbers === 'function') refreshNumbers();
    });
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => {
      this.zoom = Math.min(3.5, +(this.zoom + 0.35).toFixed(2));
      this.render();
    });
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => {
      this.zoom = Math.max(0.75, +(this.zoom - 0.35).toFixed(2));
      this.render();
    });
    if (btnZoomReset) btnZoomReset.addEventListener('click', () => {
      this.zoom = 1;
      this.render();
    });
    if (searchInp) searchInp.addEventListener('input', e => {
      this.searchQuery = e.target.value;
      this.render();
    });
    if (syncChk) syncChk.addEventListener('change', () => {
      if (typeof refreshNumbers === 'function') refreshNumbers();
    });
  },

  async init() {
    this.bindControls();
    this.loadSaved();

    const applyTreeData = (d) => {
      this.nodes = (d && d.nodes) || [];
      this.byKey = {};
      this.nodes.forEach(n => { this.byKey[n.key] = n; });
      const errEl = document.getElementById('tree-error');
      if (errEl) errEl.hidden = this.nodes.length > 0;
      if (this.nodes.length) {
        this.buildCenterSelects();
        this.render();
      }
    };

    // Reuse DB.masteryTree if already loaded by data.js
    if (typeof DB !== 'undefined' && DB.masteryTree && Array.isArray(DB.masteryTree.nodes) && DB.masteryTree.nodes.length) {
      applyTreeData(DB.masteryTree);
      return;
    }

    try {
      const res = await fetch('data/mastery_tree_y3s2.json');
      const data = await res.json();
      applyTreeData(data);
    } catch (e) {
      const errEl = document.getElementById('tree-error');
      if (errEl) errEl.hidden = false;
    }
  }
};

window.MasteryTree = MasteryTree;
