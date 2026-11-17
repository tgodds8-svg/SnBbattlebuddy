/* SnB Loadouts — Custom SVG Ship & Weapon Silhouettes + Rarity Helpers */
'use strict';

const Icons = {
  shipSvg(ship) {
    const size = (ship && ship.size) || 'medium';
    const cls = ((ship && ship.class) || '').toLowerCase();
    if (cls.includes('dhow') || size === 'extra-small') {
      return `<svg viewBox="0 0 64 36" class="snb-svg"><path d="M8 24 Q32 32 56 24 L50 30 Q32 35 14 30 Z" fill="currentColor"/><path d="M30 23 L30 6 L48 21 Z" fill="currentColor" opacity=".85"/></svg>`;
    }
    if (cls.includes('junk')) {
      return `<svg viewBox="0 0 64 36" class="snb-svg"><path d="M6 23 L14 31 L50 31 L58 21 L48 23 L16 23 Z" fill="currentColor"/><path d="M22 22 L22 5 L34 8 L34 22 Z M37 22 L37 7 L49 10 L49 22 Z" fill="currentColor" opacity=".85"/><path d="M20 11 L35 12 M20 16 L35 17 M36 13 L50 14 M36 18 L50 19" stroke="#0a1420" stroke-width="1.4"/></svg>`;
    }
    if (size === 'large') {
      return `<svg viewBox="0 0 64 36" class="snb-svg"><path d="M4 21 L12 31 L52 31 L60 19 L50 22 L14 22 Z" fill="currentColor"/><path d="M18 21 L18 6 L27 8 L27 21 Z M30 21 L30 4 L40 6 L40 21 Z M43 21 L43 8 L51 10 L51 21 Z" fill="currentColor" opacity=".85"/><rect x="16" y="25" width="32" height="2.2" fill="#0a1420" opacity=".65"/></svg>`;
    }
    if (size === 'small') {
      return `<svg viewBox="0 0 64 36" class="snb-svg"><path d="M10 24 L16 31 L48 31 L54 23 L44 25 L20 25 Z" fill="currentColor"/><path d="M28 24 L28 6 L44 21 Z M25 24 L25 10 L14 22 Z" fill="currentColor" opacity=".85"/></svg>`;
    }
    return `<svg viewBox="0 0 64 36" class="snb-svg"><path d="M7 22 L14 31 L50 31 L57 21 L47 24 L17 24 Z" fill="currentColor"/><path d="M23 23 L23 6 L34 8 L34 23 Z M37 23 L37 8 L47 10 L47 23 Z" fill="currentColor" opacity=".85"/></svg>`;
  },

  weaponSvg(w) {
    const t = ((w && w.type) || '').toLowerCase().replace(/-/g, ' ');
    if (t.includes('torpedo')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><rect x="8" y="9" width="28" height="6" rx="3" fill="currentColor"/><polygon points="36,9 43,12 36,15" fill="currentColor"/><polygon points="6,7 11,10 11,14 6,17" fill="currentColor" opacity=".8"/></svg>`;
    }
    if (t.includes('mortar')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><path d="M10 18 L34 18 L36 21 L8 21 Z" fill="currentColor"/><path d="M15 17 L24 6 L31 11 L22 18 Z" fill="currentColor" opacity=".9"/></svg>`;
    }
    if (t.includes('rocket')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><path d="M10 14 L34 7 L36 11 L12 18 Z" fill="currentColor"/><polygon points="34,7 41,7 36,11" fill="currentColor"/><rect x="12" y="16" width="22" height="3" fill="currentColor" opacity=".75"/></svg>`;
    }
    if (t.includes('ballista')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><rect x="10" y="11" width="28" height="2.5" fill="currentColor"/><path d="M28 4 Q34 12 28 20" stroke="currentColor" stroke-width="2.5" fill="none"/><line x1="14" y1="12" x2="28" y2="4" stroke="currentColor" stroke-width="1"/><line x1="14" y1="12" x2="28" y2="20" stroke="currentColor" stroke-width="1"/></svg>`;
    }
    if (t.includes('springloader')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><circle cx="24" cy="12" r="7" fill="currentColor"/><line x1="24" y1="2" x2="24" y2="22" stroke="currentColor" stroke-width="2"/><line x1="14" y1="12" x2="34" y2="12" stroke="currentColor" stroke-width="2"/></svg>`;
    }
    if (t.includes('sea fire')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><rect x="6" y="10" width="20" height="5" rx="2" fill="currentColor"/><path d="M28 12 Q34 6 42 12 Q34 18 28 12 Z" fill="currentColor" opacity=".85"/></svg>`;
    }
    if (t.includes('demi')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><path d="M10 9 L30 7 L30 17 L10 15 Z" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor" opacity=".85"/></svg>`;
    }
    if (t.includes('bombard')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><path d="M11 8 L28 6 L28 18 L11 16 Z" fill="currentColor"/><circle cx="35" cy="9" r="3" fill="currentColor" opacity=".85"/></svg>`;
    }
    if (t.includes('long gun')) {
      return `<svg viewBox="0 0 48 24" class="snb-svg"><path d="M8 10 L40 9 L40 14 L8 15 Z" fill="currentColor"/><circle cx="14" cy="17" r="3" fill="currentColor" opacity=".85"/></svg>`;
    }
    return `<svg viewBox="0 0 48 24" class="snb-svg"><path d="M9 10 L35 9 L35 15 L9 15 Z" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor" opacity=".85"/></svg>`;
  },

  rarityClass(item) {
    const r = String((item && (item.rarity || item.category)) || '').toLowerCase();
    if (r.includes('exotic')) return 'rarity-exotic';
    if (r.includes('seasonal')) return 'rarity-seasonal';
    if (r.includes('epic')) return 'rarity-epic';
    if (r.includes('rare')) return 'rarity-rare';
    if (r.includes('advanced')) return 'rarity-advanced';
    return 'rarity-common';
  },

  verifiedBadge(item) {
    if (!item) return '';
    if (item.estimated) {
      return '<span class="est-badge" title="Community estimate — confirm in game">est.</span>';
    }
    if (item.verified_from_gameplay) {
      return '<span class="ver-badge" title="Verified from in-game card">✓ card</span>';
    }
    return '';
  },
};
