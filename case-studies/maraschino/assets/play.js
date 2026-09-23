/* ── Maraschino playground core · vanilla port of app/src components ──
   Pin.tsx, PinMenu.tsx, ToolRail.tsx, TrayDock.tsx, Cherry.tsx, Polaroid.tsx, Lasso.tsx, PinPopover.tsx, BoardCanvas.tsx (pin/lasso/drag logic).
   Same numbers, same timings, no React. Every colour and size is read from assets/tokens/tokens.css, the file the
   app generates from src/lib/tokens.ts (D-048) — `npm run tokens:portfolio` in the app refreshes it. The literals
   below are only fallbacks for a page that failed to load that stylesheet. */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- tokens (tokens.css ← lib/tokens.ts) */
  const rootStyle = (() => { try { return getComputedStyle(document.documentElement); } catch (e) { return null; } })();
  /** a custom property from tokens.css, or the fallback if the sheet is missing */
  const tok = (name, fb) => { const v = rootStyle && rootStyle.getPropertyValue('--' + name).trim(); return v || fb; };
  const num = (name, fb) => { const v = parseFloat(tok(name, '')); return Number.isFinite(v) ? v : fb; };
  const T = {
    board: { bg: tok('color-board-bg', '#E2EBF1'), dot: tok('color-board-dot', '#A9BECD'), dotGap: num('board-dot-gap', 22) },
    ink: { strong: tok('color-ink-strong', '#1F2A33'), body: tok('color-ink-body', '#42525F'), muted: tok('color-ink-muted', '#7C8E9C'),
           faint: tok('color-ink-faint', '#B6C5D1'), onDark: tok('color-ink-on-dark', '#FFFFFF') },
    surface: { panel: tok('color-surface-panel', '#F2F9F9'), panelSoft: tok('color-surface-panel-soft', '#F5F8FA'),
               line: tok('color-surface-line', '#D8E3EB'), polaroid: tok('color-surface-polaroid', '#FCFCFA') },
    brand: { cherry: tok('color-brand-cherry', '#C11717'), cherryDeep: tok('color-brand-cherry-deep', '#8E1F1A'),
             cherryEmpty: tok('color-cherry-empty', '#C3CFD9') },
    /** the one navy every shadow is drawn in (D-048b) */
    shadow: tok('color-shadow', '#1F364A'),
    menu: { ring: num('shadow-menu-ring', 0.12), near: num('shadow-menu-near', 0.16), far: num('shadow-menu-far', 0.20) },
    mask: tok('color-mask', '#000000'),
    ease: { spring: tok('motion-ease-spring', 'cubic-bezier(0.34, 1.56, 0.64, 1)') },
    pin: { size: num('pin-size', 24),
           light: { k: num('pin-light-k', -0.58), sy: num('pin-light-sy', 0.24) },
           lightLifted: { k: num('pin-light-lifted-k', -0.82), sy: num('pin-light-lifted-sy', 0.24) },
           shadow: tok('color-pin-parts-shadow', '#1B2C3B'),
           shaft: { light: tok('color-pin-parts-shaft-light', '#E4E8EC'), mid: tok('color-pin-parts-shaft-mid', '#B9C0C8'),
                    dark: tok('color-pin-parts-shaft-dark', '#8E97A1') },
           specular: tok('color-pin-parts-specular', '#FFFFFF'), glow: tok('color-pin-parts-glow', '#FFFFFF'),
           stroke: tok('color-pin-parts-stroke', '#FFFFFF'),
           hole: { rx: num('pin-hole-rx', 5.5), ry: num('pin-hole-ry', 3.3), fill: tok('color-pin-parts-hole', '#0B1015'),
                   opacity: num('pin-hole-opacity', 0.92), blur: num('pin-hole-blur', 0.35) } },
    polaroid: { border: num('polaroid-border', 14), chinRatio: num('polaroid-chin-ratio', 0.19), chinMin: num('polaroid-chin-min', 62),
                radius: num('polaroid-radius', 3) },
  };

  /* ---------------------------------------------------------------- lucide icons (lucide-react 1.34, inner nodes) */
  const ICON = {
    palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
    type: '<path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/>',
    'layout-template': '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    clapperboard: '<path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="M4.929 4.929 19.07 19.071"/>',
    'message-square-text': '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M7 11h10"/><path d="M7 15h6"/><path d="M7 7h8"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    'trash-2': '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  };
  const icon = (name, size, sw = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

  /* ---------------------------------------------------------------- pin types (lib/pinTypes.ts, D-029) */
  const PIN_TYPES = [
    { id: 'color',   label: 'Color',   color: tok('color-pin-color-hue', '#C13A2B'), shade: tok('color-pin-color-shade', '#8E2A1F'), icon: 'palette',         hint: 'palette, hue, warmth' },
    { id: 'type',    label: 'Type',    color: tok('color-pin-type-hue', '#2F6FE4'), shade: tok('color-pin-type-shade', '#2657B1'), icon: 'type',            hint: 'lettering, hierarchy' },
    { id: 'format',  label: 'Format',  color: tok('color-pin-format-hue', '#E4B10F'), shade: tok('color-pin-format-shade', '#9D7A0C'), icon: 'layout-template', hint: 'poster, cover, ad — and how it\'s composed' },
    { id: 'texture', label: 'Texture', color: tok('color-pin-texture-hue', '#7A3FD1'), shade: tok('color-pin-texture-shade', '#522F85'), icon: 'layers',          hint: 'grain, finish, material' },
    { id: 'subject', label: 'Subject', color: tok('color-pin-subject-hue', '#2EA85C'), shade: tok('color-pin-subject-shade', '#1C6839'), icon: 'user',            hint: 'casting, pose, wardrobe, setting' },
    { id: 'theme',   label: 'Theme',   color: tok('color-pin-theme-hue', '#E8702A'), shade: tok('color-pin-theme-shade', '#B7541A'), icon: 'clapperboard',    hint: 'the world it belongs to' },
    { id: 'avoid',   label: 'Avoid',   color: tok('color-pin-avoid-hue', '#141414'), shade: tok('color-pin-avoid-shade', '#000000'), icon: 'ban',             hint: 'never do this' },
  ];
  const pinType = (id) => PIN_TYPES.find((t) => t.id === id) || PIN_TYPES[0];

  /* ---------------------------------------------------------------- pin geometry (Pin.tsx, D-030) */
  const VB = 150, HEAD = 42, CX = 58, CY = 40;
  const TIP = { x: CX - 34, y: CY + 82 };
  const BL = { x: TIP.x, y: TIP.y }, BR = { x: TIP.x + 7, y: TIP.y + 2 };
  const TOP_L = { x: CX - 8, y: CY + 16 }, TOP_R = { x: CX + 2, y: CY + 20 };
  const unit = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy); return { x: dx / m, y: dy / m }; };
  const BW = Math.hypot(BR.x - BL.x, BR.y - BL.y);
  const SAG = (BW / 2) * (T.pin.hole.ry / T.pin.hole.rx);
  const D = SAG / 0.75;
  const DIR_L = unit(TOP_L, BL), DIR_R = unit(TOP_R, BR);
  const C1 = { x: BL.x + DIR_L.x * D, y: BL.y + DIR_L.y * D };
  const C2 = { x: BR.x + DIR_R.x * D, y: BR.y + DIR_R.y * D };
  const ENTRY = { x: TIP.x + 3.5, y: TIP.y + 1 + SAG * 0.42 };
  const f2 = (n) => n.toFixed(2);
  const SHAFT = `M ${TOP_L.x} ${TOP_L.y} L ${BL.x} ${BL.y} C ${f2(C1.x)} ${f2(C1.y)} ${f2(C2.x)} ${f2(C2.y)} ${BR.x} ${BR.y} L ${TOP_R.x} ${TOP_R.y} Z`;
  const PIN_ANCHOR = { x: ENTRY.x / VB, y: ENTRY.y / VB };
  const PIN_HEAD = { x: CX / VB, y: CY / VB };
  const PIN_HEAD_R = HEAD / VB;
  const castTransform = (k, sy) => `translate(${TIP.x} ${TIP.y}) matrix(1 0 ${k} ${sy} 0 0) translate(${-TIP.x} ${-TIP.y})`;

  let uidN = 0;
  const uid = () => 'm' + (++uidN).toString(36);

  function pinSVG(type, o = {}) {
    const size = o.size || T.pin.size, selected = !!o.selected, dragging = !!o.dragging;
    const t = pinType(type);
    const u = (o.uid || uid()) + (selected ? 's' : '') + (dragging ? 'd' : '');
    const box = size * 1.5;
    const L = dragging ? T.pin.lightLifted : T.pin.light;
    const sx = CX - HEAD * 0.34, sy = CY - HEAD * 0.40;
    return `<svg width="${box}" height="${box}" viewBox="0 0 ${VB} ${VB}" aria-hidden="true">
<defs>
<linearGradient id="sh-${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${T.pin.shaft.light}"/><stop offset="45%" stop-color="${T.pin.shaft.mid}"/><stop offset="100%" stop-color="${T.pin.shaft.dark}"/></linearGradient>
<radialGradient id="bd-${u}" cx="38%" cy="32%" r="72%"><stop offset="0%" stop-color="${t.color}"/><stop offset="72%" stop-color="${t.color}"/><stop offset="100%" stop-color="${t.shade}"/></radialGradient>
<filter id="soft-${u}" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="${dragging ? 6.5 : 4}"/></filter>
<filter id="tight-${u}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${T.pin.hole.blur}"/></filter>
</defs>
<g transform="${castTransform(L.k, L.sy)}" filter="url(#soft-${u})" opacity="${dragging ? 0.18 : 0.26}"><path d="${SHAFT}" fill="${T.pin.shadow}"/><circle cx="${CX}" cy="${CY}" r="${HEAD}" fill="${T.pin.shadow}"/></g>
${selected ? `<g filter="url(#soft-${u})" opacity="0.95"><g fill="${T.pin.glow}" stroke="${T.pin.glow}" stroke-width="13" stroke-linejoin="round"><path d="${SHAFT}"/><circle cx="${CX}" cy="${CY}" r="${HEAD}"/></g></g>` : ''}
${dragging ? '' : `<ellipse cx="${ENTRY.x}" cy="${ENTRY.y}" rx="${T.pin.hole.rx}" ry="${T.pin.hole.ry}" fill="${T.pin.hole.fill}" opacity="${T.pin.hole.opacity}" filter="url(#tight-${u})"/>`}
<path d="${SHAFT}" fill="url(#sh-${u})"/>
<circle cx="${CX}" cy="${CY}" r="${HEAD}" fill="url(#bd-${u})"/>
<ellipse cx="${sx}" cy="${sy}" rx="${HEAD * 0.20}" ry="${HEAD * 0.15}" fill="${T.pin.specular}" opacity="0.78" transform="rotate(-28 ${sx} ${sy})"/>
</svg>`;
  }

  /* ---------------------------------------------------------------- cherries (Cherry.tsx) */
  const CHERRY_PATHS = '<path d="M1283.411,143.865l-.988,4.754c-12.105-4.762-26.054-2.443-40.748-2.16l-1.278-83.28-40.896-.577-1.59-41.823-123.596-.009-.248,123.43,41.988,1.647,1.108,41.123c14.898.563,26.936-.64,41.398,1.459.122,13.196-1.477,25.867.527,41.115,28.409.613,53.915-1.531,82.652,2.144.55,13.249-2.125,25.676,2.117,39.984l80.667-.558c1.946-15.469,1.682-27.473.077-42.644-15.22.751-27.428,2.141-41.379-.406-.006-27.872,1.238-54.731-.8-79.446,13.19,5.823,27.896,4.069,42.628,5.365l-.071,74.594,42.306,2.088-.42,40.611c-14.984,1.576-27.203.474-42.025.032l-.038,42.052-83.381-.149-.906-41.587-83.456-.184c.93-16.137,2.046-28.399-.882-41.965l-39.787-.338-.892-40.884-40.807-.839-1.676-41.139-40.907-.275-.813-83.472-40.753.516-.369,83.366-41.652,1.093.058,165.536,41.762.823.131,124.519,83.635.451.914,41.078,41.068.988-.258,251.38-41.032.071-1.752,41.661-250.116-.169-.969-41.81-41.129-.495-.483-82.821-168.112-.457c1.874-15.643,2.664-27.26-.483-40.483l-40.192-1.344.013-250.835,40.825-.507c2.376-13.627.99-25.732,0-40.895l126.293-.858.384-83.758,41.669-.558.296-83.305,40.868-.689c2.326-15.221.742-27.917.731-41.033l41.375-.748.368-41.153,41.721-.751.334-41.597c13.283.692,26.772,2.432,41.723-1.405l.681-39.253,41.142-.446.59-41.612,41.487.073.309,83.261,42.279.509c-.448-14.665-1.582-26.727.076-42.345l123.978-.018c2.337,15.372,1.24,27.571-.163,42.762,14.353-.854,26.564-1.839,42.323-.234,1.756,15.167.827,27.425-.041,42.207,14.255-1.092,26.633-2.121,42.434-.065l.152,80.688ZM949.28,64.271c-13.612-3.745-28.163-2.434-42.368-1.127l-.584,41.351-41.661.803-.665,41.492c-14.395-1.029-25.612-2.194-40.31,1.102l-1.02,81.074-40.818.693-.479,83.844,82.798.259.583,41.537,41.913.186.108,83.432,41.849-.068.016-125.161-41.917-.569.044-166.031,41.597-1.815.913-81.001c13.23,3.64,25.436-.595,41.009-2.989l-.077-40.139-41.366.029.433,43.099ZM613.877,562.476c0,4.244,6.155,4.787,9.268,4.108,11.002-2.401,22.108-.606,33.033-.601l1.073,42.192,123.71-.519c4.117-15.385,1.493-28.572.013-41.148l-1.079-9.168c2.778-.568,3.503-3.334,3.368-5.222-.192-2.686-2.133-5.397-2.958-7.207.953-18.592-.205-41.322,3.311-63.43,13.916-.234,27.535,2.485,39.074-2.675,6.193-11.501,2.694-24.268,3.654-39.307,11.165-.834,26.284,3.546,36.705-2.215,8.132-5.354,7.693-31.697-.418-37.454-9.361-6.57-25.643-1.749-36.592-2.093-.356-15.333,2.316-28.032-3.642-41.285l-166.008-1.553-.238,42.273-42.263.304-.011,165.001ZM829.249,689.545c8.898,6.469,21.335,4.348,34.409,3.484l1.324,38.658,165.672.169,4.011-40.928,40.148-2.049.208-164.979c-15.939-.387-29.985,2.479-42.305-3.998l-.638-38.672-167.571.394-.779,41.222-40.262,1.453-1.053,155.862c-.035,5.165,4.805,7.909,6.835,9.385Z"/><path d="M1325.051,153.983c-14.732-1.295-29.438.458-42.628-5.365l.988-4.754,39.811,1.216c1.917.559,1.831,6.885,1.829,8.902Z"/><path d="M949.28,64.271l-.433-43.099,41.366-.029.077,40.139c-15.574,2.395-27.78,6.629-41.009,2.989Z"/><path d="M779.895,557.339l.41-12.429c.824,1.809,2.765,4.52,2.958,7.207.135,1.888-.59,4.654-3.368,5.222Z"/><path d="M623.145,566.584c-3.113.679-9.268.136-9.268-4.108,3.655-.307,7.275.892,9.268,4.108Z"/><path d="M907.093,604.639c-14.828,4.021-26.673,2.089-41.298,1.871l-.501-42.233c14.08.393,26.646,1.755,40.658-1.525l1.104-40.198,41.131-.202-.509,43.047c-12.807-.438-29.534-4.115-38.725,3.831-5.298,6.777-2.813,21.642-1.859,35.409Z"/>';
  function cherryMark(size) {
    const h = Math.round(size * (884.7 / 843.4));
    return `<svg width="${size}" height="${h}" viewBox="547.7 -86.9 843.4 884.7" fill="currentColor" aria-hidden="true" focusable="false">${CHERRY_PATHS}</svg>`;
  }
  const WEIGHT_LABEL = { 1: 'noted', 2: 'important', 3: 'non-negotiable' };

  /** The weight control (D-023a). Clicking the lit level clears back to 0. */
  function cherryRow(el, o) {
    const size = o.size || 26, gap = o.gap == null ? 7 : o.gap, showLabel = !!o.showLabel;
    let value = o.value || 0;
    el.className = 'cherry-row';
    el.innerHTML = `<div class="cr" role="radiogroup" aria-label="Weight" style="gap:${gap}px"></div>${showLabel ? `<span class="cherry-lbl" style="font-size:${o.labelSize || 11}px;line-height:${(o.labelSize || 11) + 2}px;min-height:${(o.labelSize || 11) + 2}px"></span>` : ''}`;
    const row = el.firstChild, lbl = el.querySelector('.cherry-lbl');
    const btns = [1, 2, 3].map((n) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cherry-btn'; b.setAttribute('role', 'radio');
      b.innerHTML = cherryMark(size);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); set(value === n ? 0 : n); if (o.onChange) o.onChange(value); });
      row.appendChild(b);
      return b;
    });
    function set(v) {
      value = v;
      btns.forEach((b, i) => {
        const n = i + 1, on = n <= value;
        b.style.color = on ? T.brand.cherry : T.brand.cherryEmpty;
        b.setAttribute('aria-checked', value === n ? 'true' : 'false');
        b.setAttribute('aria-label', value === n ? `Clear weight (${WEIGHT_LABEL[n]})` : WEIGHT_LABEL[n]);
        b.title = value === n ? 'Click again to clear' : WEIGHT_LABEL[n];
      });
      if (lbl) lbl.textContent = value ? WEIGHT_LABEL[value] : ' ';
    }
    set(value);
    return { set, get: () => value };
  }

  /* ---------------------------------------------------------------- lasso (Lasso.tsx, D-031) */
  const LASSO_STEP = 0.006, LASSO_MAX = 500;
  function lassoPath(pts) {
    if (pts.length < 3) return '';
    let d = `M ${pts[0].x.toFixed(4)} ${pts[0].y.toFixed(4)}`;
    for (let i = 1; i <= pts.length; i++) {
      const cur = pts[i % pts.length], next = pts[(i + 1) % pts.length];
      d += ` Q ${cur.x.toFixed(4)} ${cur.y.toFixed(4)} ${((cur.x + next.x) / 2).toFixed(4)} ${((cur.y + next.y) / 2).toFixed(4)}`;
    }
    return d + ' Z';
  }
  function lassoSVG(pts, type, o = {}) {
    const d = lassoPath(pts); if (!d) return '';
    const t = pinType(type), hot = o.active || o.drawing;
    return `<svg class="lasso" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"${o.id ? ` data-pin="${o.id}"` : ''}><path d="${d}" fill="${t.color}" fill-opacity="${hot ? 0.16 : 0.09}" stroke="${t.color}" stroke-width="${hot ? 2.4 : 1.6}" stroke-linejoin="round" stroke-linecap="round" ${o.drawing ? 'stroke-dasharray="5 4"' : ''} vector-effect="non-scaling-stroke"/></svg>`;
  }

  /* ---------------------------------------------------------------- pin menu (PinMenu.tsx, D-031) */
  const SAT = 28, R = SAT / 2, BOX = { w: 140, h: 116 };
  const HEAD_R0 = T.pin.size * 1.5 * PIN_HEAD_R;
  const ORIGIN = { x: 70, y: 92 };
  const FAN = [{ fx: -36, fy: -22 }, { fx: 0, fy: -44 }, { fx: 36, fy: -22 }];
  const GAP = 5, GOO_BLUR = 4, BRIDGE_PAD = 9;
  const HOVER_IN = 50, HOVER_OUT = 220, CLOSE_DUR = 190;
  const ITEMS = [
    { id: 'note', label: 'Add note', icon: 'message-square-text' },
    { id: 'lasso', label: 'Draw around it', icon: 'pencil' },
    { id: 'delete', label: 'Delete pin', icon: 'trash-2' },
  ];
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = []; for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
    const upper = []; for (const q of p.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  const ring = (cx, cy, r, n = 12) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; });
  function bridgePath(discR, lift) {
    const pts = [
      { x: ORIGIN.x - discR - BRIDGE_PAD, y: ORIGIN.y - discR - 1 },
      { x: ORIGIN.x + discR + BRIDGE_PAD, y: ORIGIN.y - discR - 1 },
    ];
    FAN.forEach((f) => pts.push(...ring(ORIGIN.x + f.fx, ORIGIN.y + f.fy - lift, R + BRIDGE_PAD)));
    return hull(pts).map((q, i) => `${i ? 'L' : 'M'} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ') + ' Z';
  }

  /** One menu instance: mounts closed, flips open next frame, tracks its anchor each frame. */
  class PinMenu {
    constructor(anchorEl, type, o) {
      this.anchor = anchorEl; this.t = pinType(type); this.o = o; this.uid = uid();
      this.open = false; this.pos = null; this.raf = 0;
      const el = this.el = document.createElement('div');
      el.className = 'pin-goo'; el.dataset.open = 'false';
      el.style.setProperty('--hue', this.t.color); el.style.setProperty('--hue-delete', T.brand.cherry);
      el.addEventListener('pointerenter', () => o.onEnter && o.onEnter());
      el.addEventListener('pointerleave', () => o.onLeave && o.onLeave());
      const u = this.uid;
      el.innerHTML = `
<svg class="pin-goo-layer" viewBox="0 0 ${BOX.w} ${BOX.h}" aria-hidden="true" focusable="false">
<defs><filter id="goo-${u}" x="-70%" y="-70%" width="240%" height="240%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceGraphic" stdDeviation="${GOO_BLUR}" result="blur"/>
<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
<feComposite in="SourceGraphic" in2="goo" operator="atop" result="shape"/>
<feColorMatrix in="shape" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -29.5" result="ring-solid"/>
<feMorphology in="ring-solid" operator="dilate" radius="1" result="ring-a"/>
<feFlood flood-color="${T.shadow}" flood-opacity="${T.menu.ring}" result="ring-c"/>
<feComposite in="ring-c" in2="ring-a" operator="in" result="ring"/>
<feGaussianBlur in="shape" stdDeviation="2" result="s2-b"/><feOffset in="s2-b" dy="2" result="s2-o"/>
<feFlood flood-color="${T.shadow}" flood-opacity="${T.menu.near}" result="s2-c"/><feComposite in="s2-c" in2="s2-o" operator="in" result="s2"/>
<feGaussianBlur in="shape" stdDeviation="9" result="s3-b"/><feOffset in="s3-b" dy="4" result="s3-o"/>
<feFlood flood-color="${T.shadow}" flood-opacity="${T.menu.far}" result="s3-c"/><feComposite in="s3-c" in2="s3-o" operator="in" result="s3"/>
<feMerge><feMergeNode in="s3"/><feMergeNode in="s2"/><feMergeNode in="ring"/><feMergeNode in="shape"/></feMerge>
</filter></defs>
<g filter="url(#goo-${u})">${FAN.map((f, i) => `<circle class="pin-goo-blob" data-i="${i}" data-kind="${ITEMS[i].id}" cx="${ORIGIN.x}" cy="${ORIGIN.y}" r="${R}" style="--fx:${f.fx}px;--i:${i}"/>`).join('')}</g>
</svg>
<svg class="disc" viewBox="0 0 ${BOX.w} ${BOX.h}" aria-hidden="true" focusable="false">
<defs><radialGradient id="hd-${u}" cx="38%" cy="32%" r="72%"><stop offset="0%" stop-color="${this.t.color}"/><stop offset="72%" stop-color="${this.t.color}"/><stop offset="100%" stop-color="${this.t.shade}"/></radialGradient></defs>
<circle class="disc-c" cx="${ORIGIN.x}" cy="${ORIGIN.y}" r="10" fill="url(#hd-${u})"/><ellipse class="disc-s" fill="${T.pin.specular}" opacity="0.78"/>
</svg>
<svg class="bridge" viewBox="0 0 ${BOX.w} ${BOX.h}" aria-hidden="true" focusable="false"><path fill="transparent" style="pointer-events:none"/></svg>
${ITEMS.map((it, i) => `<button type="button" class="pin-goo-item" data-i="${i}" data-kind="${it.id}" aria-label="${it.label}" title="${it.label}" tabindex="-1" style="left:${ORIGIN.x - SAT / 2}px;top:${ORIGIN.y - SAT / 2}px;width:${SAT}px;height:${SAT}px;color:${it.id === 'delete' ? T.brand.cherry : T.ink.body};--fx:${FAN[i].fx}px;--i:${i}">${icon(it.icon, 15, 2)}</button>`).join('')}`;
      el.querySelectorAll('.pin-goo-item').forEach((b) => {
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => { e.stopPropagation(); o.onAction(b.dataset.kind); });
      });
      document.body.appendChild(el);
      this.blobs = el.querySelectorAll('.pin-goo-blob'); this.items = el.querySelectorAll('.pin-goo-item');
      this.discC = el.querySelector('.disc-c'); this.discS = el.querySelector('.disc-s'); this.bridge = el.querySelector('.bridge path');
      this.tick = this.tick.bind(this); this.tick();
      // mount closed, open on the next frame so the transition has something to run from
      requestAnimationFrame(() => requestAnimationFrame(() => { this.shown = true; this.apply(); }));
    }
    tick() {
      if (!this.anchor.isConnected) { this.destroy(); return; }
      const r = this.anchor.getBoundingClientRect();
      const headR = r.width * PIN_HEAD_R;
      const s = Math.min(1.9, Math.max(0.65, headR / HEAD_R0));
      const discR = headR / s;
      const x = r.left + r.width * PIN_HEAD.x, y = r.top + r.height * PIN_HEAD.y;
      const p = this.pos;
      if (!p || Math.abs(p.x - x) > .5 || Math.abs(p.y - y) > .5 || Math.abs(p.s - s) > .005 || Math.abs(p.discR - discR) > .05) {
        this.pos = { x, y, s, discR }; this.layout();
      }
      this.raf = requestAnimationFrame(this.tick);
    }
    layout() {
      const { x, y, s, discR } = this.pos, el = this.el;
      el.style.left = (x - ORIGIN.x) + 'px'; el.style.top = (y - ORIGIN.y) + 'px';
      el.style.transform = `scale(${s})`;
      const lift = discR + GAP, rest = Math.min(0.55, (0.85 * discR) / R);
      this.blobs.forEach((b, i) => { b.style.setProperty('--fy', (FAN[i].fy - lift) + 'px'); b.style.setProperty('--rest', rest); });
      this.items.forEach((b, i) => b.style.setProperty('--fy', (FAN[i].fy - lift) + 'px'));
      this.discC.setAttribute('r', discR);
      const sx = ORIGIN.x - discR * 0.34, sy = ORIGIN.y - discR * 0.40;
      this.discS.setAttribute('cx', sx); this.discS.setAttribute('cy', sy);
      this.discS.setAttribute('rx', discR * 0.20); this.discS.setAttribute('ry', discR * 0.15);
      this.discS.setAttribute('transform', `rotate(-28 ${sx} ${sy})`);
      this.bridge.setAttribute('d', bridgePath(discR, lift));
    }
    setOpen(v) { this.open = v; this.apply(); }
    apply() {
      const isOpen = !!(this.shown && this.open);
      this.el.dataset.open = isOpen ? 'true' : 'false';
      this.bridge.style.pointerEvents = isOpen ? 'fill' : 'none';
      this.items.forEach((b) => b.tabIndex = isOpen ? 0 : -1);
    }
    destroy() { cancelAnimationFrame(this.raf); this.el.remove(); this.dead = true; }
  }

  /** Hover intent around a menu: dwell before opening, grace before closing, two-phase close. */
  class MenuController {
    constructor() { this.hover = null; this.timer = 0; }
    openFor(id, el, type, onAction) {
      clearTimeout(this.timer);
      if (this.hover && this.hover.id === id) { this.hover.closing = false; this.hover.menu.setOpen(true); return; }
      this.timer = setTimeout(() => {
        if (this.hover && this.hover.id === id) { this.hover.closing = false; this.hover.menu.setOpen(true); return; }
        this.kill();
        const menu = new PinMenu(el, type, {
          onAction: (a) => { clearTimeout(this.timer); this.kill(); onAction(a); },
          onEnter: () => this.hold(), onLeave: () => this.close(),
        });
        menu.open = true;
        this.hover = { id, el, menu, closing: false };
      }, HOVER_IN);
    }
    close() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (this.hover) { this.hover.closing = true; this.hover.menu.setOpen(false); }
        this.timer = setTimeout(() => this.kill(), CLOSE_DUR);
      }, HOVER_OUT);
    }
    hold() { clearTimeout(this.timer); if (this.hover && this.hover.closing) { this.hover.closing = false; this.hover.menu.setOpen(true); } }
    kill() { clearTimeout(this.timer); if (this.hover) { this.hover.menu.destroy(); this.hover = null; } }
    isOpenFor(id) { return !!(this.hover && this.hover.id === id && !this.hover.closing); }
  }

  /* ---------------------------------------------------------------- tool rail (ToolRail.tsx, D-006/D-029) */
  function makeRail(el, o) {
    el.className = 'mz-rail'; el.innerHTML = '';
    const btns = PIN_TYPES.map((t, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'rail-btn'; b.dataset.on = '0'; b.dataset.type = t.id;
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', `${t.label} pin (${i + 1})`);
      b.style.setProperty('--c22', t.color + '22');
      b.innerHTML = `<span class="rail-dot" style="background:${t.color}">${icon(t.icon, 12, 2.6)}</span><span class="rail-tag">${t.label}<span>${i + 1}</span></span>`;
      b.addEventListener('click', () => o.onArm(b.dataset.on === '1' ? null : t.id));
      el.appendChild(b); return b;
    });
    return { setArmed(id) { btns.forEach((b) => { const on = b.dataset.type === id; b.dataset.on = on ? '1' : '0'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); } };
  }

  /* ---------------------------------------------------------------- board + polaroids (BoardCanvas.tsx / Polaroid.tsx) */
  const PIN_DRAG_THRESHOLD = 4;
  const PLACE_W = 380; // app default; the playground scales it via opts.imageWidth

  /**
   * A board: dot-grid surface holding polaroids (or, with `bare:true`, a single surface that is the board itself).
   * State lives in plain objects; the DOM is reconciled per image so hover anchors survive re-renders.
   */
  class Board {
    constructor(root, o = {}) {
      this.root = root; this.o = o; this.bare = !!o.bare; this.pinSize = o.pinSize || T.pin.size;
      root.classList.add('mz-board'); if (o.bare) root.classList.add('bare');
      this.images = []; this.armed = null; this.lassoFor = null; this.notePin = null; this.dragPin = null; this.z = 1;
      this.menus = new MenuController();
      this.els = new Map(); // imageId -> {wrap, area, lassoLayer, pinEls: Map, pop, cherry}
      this.listeners = [];
      if (this.bare) {
        const img = { id: 'sheet', pins: [], weight: 0, bare: true };
        this.images.push(img);
        const area = document.createElement('div'); area.className = 'area sheet'; area.style.cssText = 'position:absolute;inset:0;background:none;';
        root.appendChild(area);
        const lassoLayer = document.createElement('div'); lassoLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; area.appendChild(lassoLayer);
        this.els.set(img.id, { wrap: area, area, lassoLayer, pinEls: new Map(), pop: null });
        this.wireArea(img, area);
      } else {
        // clicking the empty board deselects, like the canvas does. All three go through on() so
        // destroy() takes them off again: a rebuilt board on the same element used to inherit the old
        // drop handler and place every dropped image twice.
        this.on(root, 'pointerdown', (e) => { if (e.target === root) this.select(null); });
        this.on(root, 'dragover', (e) => { if (o.onDropImage) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
        this.on(root, 'drop', (e) => {
          if (!o.onDropImage) return; e.preventDefault();
          const id = e.dataTransfer.getData('text/maraschino-image'); if (!id) return;
          const r = root.getBoundingClientRect();
          o.onDropImage(id, e.clientX - r.left, e.clientY - r.top);
        });
      }
      // keyboard: 1–7 arm a type, Escape backs out (D-025 / D-032). Only while the pointer or focus is on this board.
      const onKey = (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'TEXTAREA' || tag === 'INPUT') { if (e.key === 'Escape') { e.target.blur(); this.openNote(null); } return; }
        const scope = o.keyScope || root;
        const live = scope.matches(':hover') || scope.contains(document.activeElement);
        if (!live) return;
        if (e.key === 'Escape') { if (this.lassoFor) this.cancelLasso(); else if (this.notePin) this.openNote(null); else this.arm(null); }
        const n = parseInt(e.key, 10);
        if (!this.bare && n >= 1 && n <= 7 && !e.metaKey && !e.ctrlKey && !e.altKey) this.arm(PIN_TYPES[n - 1].id);
      };
      this.on(document, 'keydown', onKey);
    }
    on(target, type, fn) { target.addEventListener(type, fn); this.listeners.push(() => target.removeEventListener(type, fn)); }

    /* ---- state ops (lib/store.ts) */
    arm(id) { this.armed = id; this.root.classList.toggle('armed', !!id); if (this.o.onArm) this.o.onArm(id); }
    select(pinId) {
      if (pinId === null) { this.openNote(null); }
      else if (this.notePin !== pinId) this.openNote(null);
    }
    findPin(pinId) { for (const img of this.images) { const p = img.pins.find((q) => q.id === pinId); if (p) return { img, pin: p }; } return null; }
    addPin(img, x, y) {
      if (!this.armed) return;
      const pin = { id: uid(), type: this.armed, x, y, note: '' };
      img.pins.push(pin); this.arm(null); this.sync(img); return pin;
    }
    movePin(img, pin, x, y) { pin.x = x; pin.y = y; this.positionPin(img, pin); }
    removePin(img, pin) { img.pins = img.pins.filter((p) => p !== pin); if (this.notePin === pin.id) this.notePin = null; if (this.lassoFor === pin.id) this.cancelLasso(); this.menus.kill(); this.sync(img); if (this.o.onRemovePin) this.o.onRemovePin(img, pin); }
    updatePin(pin, patch) { Object.assign(pin, patch); }
    startLasso(pinId) { this.lassoFor = pinId; this.openNote(null); this.root.classList.add('lassoing'); this.menus.kill(); this.syncAll(); }
    cancelLasso() { this.lassoFor = null; this.root.classList.remove('lassoing'); this.syncAll(); }
    setPinLasso(img, pin, pts) {
      pin.lasso = pts; this.lassoFor = null; this.root.classList.remove('lassoing');
      if (pts && !this.o.quietLasso) this.notePin = pin.id; // circle the thing, then say why
      this.syncAll();
      if (pts && this.o.lassoTTL) {
        const e = this.els.get(img.id);
        setTimeout(() => {
          if (pin.lasso !== pts) return;
          const svg = e && e.lassoLayer.querySelector(`.lasso[data-pin="${pin.id}"]`); if (svg) svg.classList.add('dissolve');
          setTimeout(() => { if (pin.lasso === pts) { pin.lasso = undefined; this.sync(img); } }, 620);
        }, Math.max(0, this.o.lassoTTL - 620));
      }
    }
    openNote(pinId) { this.notePin = pinId; this.syncAll(); }
    setWeight(img, w) { img.weight = w; if (this.o.onWeight) this.o.onWeight(img, w); }
    bringToFront(img) { img.z = ++this.z; const e = this.els.get(img.id); if (e && !img.bare) e.wrap.style.zIndex = img.z; }
    moveImage(img, x, y) { img.x = x; img.y = y; const e = this.els.get(img.id); if (e) { e.wrap.style.left = x + 'px'; e.wrap.style.top = y + 'px'; } }

    /** Add a polaroid. `src`/`w`/`h` describe the picture; `width` is the rendered picture width. */
    addImage(spec, x, y) {
      if (spec.id) { const dup = this.images.find((i) => i.id === spec.id); if (dup) return dup; } // one polaroid per image
      const img = { id: spec.id || uid(), src: spec.src, w: spec.w, h: spec.h, width: spec.width || this.o.imageWidth || PLACE_W,
                    x, y, z: ++this.z, rotation: spec.rotation || 0, weight: spec.weight || 0, pins: spec.pins ? spec.pins.map((p) => Object.assign({ id: uid(), note: '' }, p)) : [], name: spec.name || '' };
      this.images.push(img); this.mountImage(img); return img;
    }
    removeImage(img) {
      this.menus.kill(); if (this.lassoFor && img.pins.some((p) => p.id === this.lassoFor)) this.cancelLasso();
      if (img.pins.some((p) => p.id === this.notePin)) this.notePin = null;
      this.images = this.images.filter((i) => i !== img); const e = this.els.get(img.id); if (e) e.wrap.remove(); this.els.delete(img.id);
    }

    /* ---- DOM */
    mountImage(img) {
      const B = T.polaroid.border, w = img.width, h = Math.round((w * img.h) / img.w);
      const chin = Math.max(T.polaroid.chinMin, Math.round(h * T.polaroid.chinRatio));
      const wrap = document.createElement('div'); wrap.className = 'mz-pol'; wrap.dataset.polaroid = '';
      wrap.style.cssText = `left:${img.x}px;top:${img.y}px;width:${w + B * 2}px;z-index:${img.z};transform:rotate(${img.rotation}deg)`;
      wrap.innerHTML = `<div class="area" style="width:${w}px;height:${h}px"><img src="${img.src}" alt="${img.name}" draggable="false"><div class="lasso-layer" style="position:absolute;inset:0;pointer-events:none"></div></div><div class="chin" style="height:${chin}px"><div class="chin-inner"></div></div>`;
      const area = wrap.querySelector('.area'), inner = wrap.querySelector('.chin-inner');
      const cr = document.createElement('div'); inner.appendChild(cr);
      const cherry = cherryRow(cr, { value: img.weight, size: 26, showLabel: true, onChange: (v) => this.setWeight(img, v) });
      if (this.o.onReturn) {
        const x = document.createElement('button'); x.type = 'button'; x.className = 'tray-return'; x.setAttribute('aria-label', 'Back to tray'); x.title = 'Back to tray';
        x.innerHTML = icon('x', 13, 2.5);
        x.addEventListener('pointerdown', (e) => e.stopPropagation());
        x.addEventListener('click', (e) => { e.stopPropagation(); this.o.onReturn(img); });
        inner.appendChild(x);
      }
      this.root.appendChild(wrap);
      this.els.set(img.id, { wrap, area, lassoLayer: wrap.querySelector('.lasso-layer'), pinEls: new Map(), pop: null, cherry });
      this.wireArea(img, area);
      this.sync(img);
    }

    /** Pointer logic on an image area: lasso owns the pointer, else armed places, else drag the polaroid. */
    wireArea(img, area) {
      area.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (!img.bare) this.bringToFront(img);
        const drawFor = img.pins.find((p) => p.id === this.lassoFor);
        if (drawFor) {
          const r0 = area.getBoundingClientRect();
          const at = (ev) => ({ x: Math.min(1, Math.max(0, (ev.clientX - r0.left) / r0.width)), y: Math.min(1, Math.max(0, (ev.clientY - r0.top) / r0.height)) });
          let pts = [at(e)];
          const e2 = this.els.get(img.id);
          const draw = () => { e2.lassoLayer.innerHTML = this.lassoMarkup(img) + (pts.length >= 3 ? lassoSVG(pts, drawFor.type, { drawing: true }) : ''); };
          const move = (ev) => {
            const q = at(ev), last = pts[pts.length - 1];
            if (Math.hypot(q.x - last.x, q.y - last.y) < LASSO_STEP) return;
            if (pts.length >= LASSO_MAX) return;
            pts.push(q); draw();
          };
          const up = () => {
            window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
            this.setPinLasso(img, drawFor, pts.length >= 3 ? pts : undefined);
          };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
          return;
        }
        if (this.armed) {
          const r = area.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          if (x >= 0 && x <= 1 && y >= 0 && y <= 1) { this.addPin(img, x, y); return; }
        }
        this.select(null);
        if (img.bare || this.o.lockImages) return;
        const start = { x: e.clientX, y: e.clientY, ix: img.x, iy: img.y };
        const move = (ev) => this.moveImage(img, start.ix + (ev.clientX - start.x), start.iy + (ev.clientY - start.y));
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      });
    }

    lassoMarkup(img) {
      return img.pins.filter((p) => p.lasso && p.lasso.length >= 3)
        .map((p) => lassoSVG(p.lasso, p.type, { id: p.id, active: this.notePin === p.id || this.lassoFor === p.id || this.menus.isOpenFor(p.id) })).join('');
    }

    positionPin(img, pin) {
      const e = this.els.get(img.id), el = e.pinEls.get(pin.id); if (!el) return;
      el.style.left = (pin.x * 100) + '%'; el.style.top = (pin.y * 100) + '%';
      // an open note rides with its pin
      if (e.pop && e.pop.dataset.pin === pin.id) { e.pop.style.left = el.style.left; e.pop.style.top = el.style.top; e.pop.classList.toggle('left', pin.x > 0.72); }
    }

    /** Reconcile one image's pins, lassos and popover with state. Pin buttons persist across syncs (menu anchors). */
    sync(img) {
      const e = this.els.get(img.id); if (!e) return;
      const live = new Set(img.pins.map((p) => p.id));
      for (const [id, el] of e.pinEls) if (!live.has(id)) { el.remove(); e.pinEls.delete(id); }
      img.pins.forEach((p) => {
        let el = e.pinEls.get(p.id);
        if (!el) { el = this.makePinEl(img, p); e.pinEls.set(p.id, el); e.area.appendChild(el); if (p.born) { el.classList.add('born'); delete p.born; } }
        const selected = this.notePin === p.id || this.lassoFor === p.id, dragging = this.dragPin === p.id;
        const key = `${selected}|${dragging}`;
        if (el.dataset.key !== key) { el.dataset.key = key; el.firstChild.innerHTML = pinSVG(p.type, { size: this.pinSize, selected, dragging, uid: 'p' + p.id }); }
        el.classList.toggle('work', selected); el.classList.toggle('dragging', dragging);
        el.setAttribute('aria-label', `${p.type} pin${p.note ? ': ' + p.note : ''}`);
        this.positionPin(img, p);
      });
      e.lassoLayer.innerHTML = this.lassoMarkup(img);
      // popover
      const open = img.pins.find((p) => p.id === this.notePin);
      if (e.pop && (!open || e.pop.dataset.pin !== open.id)) { e.pop.remove(); e.pop = null; }
      if (open && !e.pop) { e.pop = this.makePopover(img, open); e.area.appendChild(e.pop); const ta = e.pop.querySelector('textarea'); ta.focus({ preventScroll: true }); }
      if (!img.bare) { e.wrap.style.zIndex = (this.lassoFor && img.pins.some((p) => p.id === this.lassoFor)) ? 40 : img.z; e.wrap.style.cursor = this.lassoFor && img.pins.some((p) => p.id === this.lassoFor) ? 'crosshair' : ''; }
    }
    syncAll() { this.images.forEach((i) => this.sync(i)); }

    makePinEl(img, p) {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'pin-btn';
      el.style.transform = `translate(${-PIN_ANCHOR.x * 100}%, ${-PIN_ANCHOR.y * 100}%)`;
      el.innerHTML = '<span class="pin-g"></span>';
      const area = this.els.get(img.id).area;
      const act = (a) => {
        if (a === 'note') this.openNote(p.id);
        if (a === 'lasso') this.startLasso(p.id);
        if (a === 'delete') this.removePin(img, p);
      };
      const open = () => this.menus.openFor(p.id, el, p.type, act);
      // arm on ENTER and on MOVE (D-031e): the pointer is often already sitting on the pin when the menu should return
      el.addEventListener('pointerenter', () => { if (!this.lassoFor) open(); });
      el.addEventListener('pointermove', () => { if (this.lassoFor || this.dragPin) return; if (this.menus.isOpenFor(p.id)) return; open(); });
      el.addEventListener('pointerleave', () => this.menus.close());
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (this.lassoFor) return; // a pending lasso owns every press, the pin included
        e.stopPropagation();
        if (this.notePin && this.notePin !== p.id) this.openNote(null);
        const r0 = area.getBoundingClientRect();
        const grab = { x: p.x - (e.clientX - r0.left) / r0.width, y: p.y - (e.clientY - r0.top) / r0.height, sx: e.clientX, sy: e.clientY };
        let moving = false;
        const move = (ev) => {
          if (!moving) {
            if (Math.hypot(ev.clientX - grab.sx, ev.clientY - grab.sy) < PIN_DRAG_THRESHOLD) return;
            moving = true; this.dragPin = p.id; this.menus.kill(); this.sync(img);
          }
          const r = area.getBoundingClientRect();
          this.movePin(img, p, Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width + grab.x)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height + grab.y)));
        };
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (moving) { this.dragPin = null; this.sync(img); } };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      });
      return el;
    }

    makePopover(img, pin) {
      const t = pinType(pin.type);
      const pop = document.createElement('div'); pop.className = 'popover'; pop.dataset.pin = pin.id;
      pop.style.left = (pin.x * 100) + '%'; pop.style.top = (pin.y * 100) + '%';
      // near the right edge the note opens to the left, so the surface's clip never eats it
      if (pin.x > 0.72) pop.classList.add('left');
      pop.innerHTML = `<div class="hd"><span class="dot" style="background:${t.color}">${icon(t.icon, 10, 2.8)}</span><span class="lbl">${t.label}</span><button type="button" class="del" aria-label="Delete pin">${icon('trash-2', 14, 2)}</button></div>
<textarea class="field" rows="3" placeholder="${pin.type === 'avoid' ? 'what to never do, and why' : `why this ${t.hint}?`}"></textarea>`;
      pop.addEventListener('pointerdown', (e) => e.stopPropagation());
      pop.addEventListener('click', (e) => e.stopPropagation());
      pop.querySelector('.del').addEventListener('click', () => this.removePin(img, pin));
      const ta = pop.querySelector('textarea'); ta.value = pin.note || '';
      ta.addEventListener('input', () => this.updatePin(pin, { note: ta.value }));
      return pop;
    }

    destroy() {
      this.menus.kill(); this.listeners.forEach((f) => f()); this.listeners = [];
      this.lassoFor = null; this.notePin = null; this.armed = null;
      for (const e of this.els.values()) { if (e.pop) e.pop.remove(); e.wrap.remove(); }
      this.els.clear(); this.images = []; this.root.classList.remove('mz-board', 'armed', 'lassoing');
    }
  }

  /* ---------------------------------------------------------------- tray dock (TrayDock.tsx, D-026 / D-028) */
  const DOCK = { base: 74, peak: 118, reach: 150, gap: 10 };
  const STEP = DOCK.base + DOCK.gap;
  const PAGE_RATIO = 0.8, HOLD_DELAY = 360, HOLD_SPEED = 16;
  // motion's { duration: .28, bounce: .18 } solved to stiffness / damping (dampingRatio = 1 - bounce)
  const SPRING = (() => { const z = 0.82, d = 0.28; const w = -Math.log(0.001 * Math.sqrt(1 - z * z) / z) / (z * d); return { k: w * w, c: 2 * z * w }; })();
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = () => window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  class Tray {
    constructor(el, o = {}) {
      this.o = o; this.items = new Map();
      el.className = 'tray';
      el.innerHTML = `<button type="button" class="tray-arrow tray-arrow-l" aria-label="Scroll images left">${icon('chevron-left', 26, 2.5)}</button>
<div class="tray-pill"><button type="button" class="tray-lead" aria-label="Add images">${icon('plus', 16, 2.4)}</button><div class="tray-scroller"></div><div class="tray-track"><div class="tray-thumb"></div></div></div>
<button type="button" class="tray-arrow tray-arrow-r" aria-label="Scroll images right">${icon('chevron-right', 26, 2.5)}</button>`;
      this.el = el; this.pill = el.querySelector('.tray-pill'); this.scroller = el.querySelector('.tray-scroller'); this.thumb = el.querySelector('.tray-thumb');
      this.arrowL = el.querySelector('.tray-arrow-l'); this.arrowR = el.querySelector('.tray-arrow-r'); this.lead = el.querySelector('.tray-lead');
      this.pointerX = null; this.panning = false; this.lifting = false; this.raf = 0;
      if (o.onLift) el.classList.add('tray-lift');
      this.lead.addEventListener('click', () => { if (o.onAdd) o.onAdd(); else { this.lead.animate([{ transform: 'translateY(-50%) rotate(0)' }, { transform: 'translateY(-50%) rotate(90deg)' }], { duration: 260, easing: T.ease.spring }); } });

      // dock magnification: pointer x over the pill (mouse only)
      this.pill.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !this.panning && !this.lifting) { this.pointerX = e.clientX; this.animate(); } });
      this.pill.addEventListener('pointerleave', () => { this.pointerX = null; this.animate(); });

      // wheel: a plain vertical wheel scrolls sideways; trackpad deltaX passes through
      this.scroller.addEventListener('wheel', (e) => {
        if (e.ctrlKey) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        const max = this.scroller.scrollWidth - this.scroller.clientWidth; if (max <= 0) return;
        const unitPx = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.scroller.clientWidth : 1;
        e.preventDefault(); this.scroller.scrollLeft += e.deltaY * unitPx;
      }, { passive: false });
      const swallowMiddle = (e) => { if (e.button === 1) e.preventDefault(); };
      this.scroller.addEventListener('mousedown', swallowMiddle); this.scroller.addEventListener('auxclick', swallowMiddle);
      // middle-button drag pans the strip
      let pan = null;
      this.scroller.addEventListener('pointerdown', (e) => {
        if (e.button !== 1) return; const s = this.scroller; if (s.scrollWidth - s.clientWidth <= 0) return;
        e.preventDefault(); s.setPointerCapture(e.pointerId); pan = { id: e.pointerId, x: e.clientX, left: s.scrollLeft };
        this.panning = true; s.classList.add('tray-panning'); this.pointerX = null; this.animate();
      });
      this.scroller.addEventListener('pointermove', (e) => { if (!pan || e.pointerId !== pan.id) return; this.scroller.scrollLeft = pan.left - (e.clientX - pan.x); });
      const endPan = (e) => { if (!pan || e.pointerId !== pan.id) return; this.scroller.releasePointerCapture(e.pointerId); pan = null; this.panning = false; this.scroller.classList.remove('tray-panning'); };
      this.scroller.addEventListener('pointerup', endPan); this.scroller.addEventListener('pointercancel', endPan);
      this.scroller.addEventListener('scroll', () => this.measure());

      // arrows: click pages by whole thumbnails; hold keeps going
      [[this.arrowL, -1], [this.arrowR, 1]].forEach(([btn, dir]) => {
        let hold = null, scrolled = false;
        const stop = () => { if (!hold) return false; clearTimeout(hold.timer); cancelAnimationFrame(hold.raf); const m = hold.moved; hold = null; return m; };
        btn.addEventListener('pointerdown', () => {
          stop(); const h = { timer: 0, raf: 0, moved: false }; hold = h;
          h.timer = setTimeout(() => { const tick = () => { if (hold !== h) return; this.scroller.scrollLeft += dir * HOLD_SPEED; h.moved = true; h.raf = requestAnimationFrame(tick); }; h.raf = requestAnimationFrame(tick); }, HOLD_DELAY);
        });
        btn.addEventListener('pointerup', () => { scrolled = stop(); });
        btn.addEventListener('pointerleave', () => { stop(); });
        btn.addEventListener('click', () => { if (scrolled) { scrolled = false; return; } const n = Math.max(1, Math.floor((this.scroller.clientWidth * PAGE_RATIO) / STEP)); this.scroller.scrollBy({ left: dir * n * STEP, behavior: 'smooth' }); });
      });

      (o.items || []).forEach((it) => this.add(it));
      new ResizeObserver(() => this.measure()).observe(this.scroller);
      this.measure();
    }

    /** `flash`: true scrolls the item into view and flashes it; 'quiet' flashes in place.
     *  `index` puts it back at a given slot (what remove() returned), else at the end. */
    add(item, flash, index) {
      if (this.items.has(item.id)) return;
      const wrap = document.createElement('div'); wrap.className = 'dock-item'; wrap.dataset.id = item.id;
      const inner = document.createElement('div');
      inner.innerHTML = `<img src="${item.thumb}" alt="${item.name || ''}" draggable="false">`;
      inner.setAttribute('aria-label', item.name || 'image');
      if (this.o.draggable) {
        inner.draggable = true;
        inner.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/maraschino-image', item.id); e.dataTransfer.effectAllowed = 'move'; this.pointerX = null; this.animate(); });
      }
      if (this.o.onLift) this.wireLift(item, inner);
      if (this.o.onPick) { inner.addEventListener('click', () => this.o.onPick(item)); inner.style.cursor = 'pointer'; }
      wrap.appendChild(inner);
      const kids = this.scroller.children;
      if (index != null && index >= 0 && index < kids.length) this.scroller.insertBefore(wrap, kids[index]); else this.scroller.appendChild(wrap);
      // rebuild the map in DOM order so remove() keeps returning true slots
      const next = new Map(); next.set(item.id, { item, el: wrap, size: DOCK.base, v: 0, target: DOCK.base });
      for (const k of kids) { const id = k.dataset.id; next.set(id, id === item.id ? next.get(item.id) : this.items.get(id)); }
      this.items = next;
      if (flash) {
        if (flash !== 'quiet') wrap.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
        inner.classList.add('dock-flash'); setTimeout(() => inner.classList.remove('dock-flash'), 950);
      }
      this.measure();
    }
    /** Returns the slot the item held, so add() can put it back there. */
    remove(id) { const it = this.items.get(id); if (!it) return -1; const index = [...this.scroller.children].indexOf(it.el); it.el.remove(); this.items.delete(id); this.measure(); return index; }

    /** Pointer lift (the demo tray): press and move a few pixels and onLift(item, event) fires once,
     *  with the pointer captured on the tile so the page keeps getting move/up wherever it goes. */
    wireLift(item, inner) {
      inner.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.pointerType === 'touch') return;
        const sx = e.clientX, sy = e.clientY, id = e.pointerId; let lifted = false;
        const move = (ev) => {
          if (ev.pointerId !== id || lifted) return;
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
          lifted = true; this.lifting = true; this.pointerX = null; this.animate();
          try { inner.setPointerCapture(id); } catch (_) {}
          this.o.onLift(item, ev);
        };
        const up = (ev) => { if (ev.pointerId !== id) return; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this.lifting = false; };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      });
    }

    /** Arrows, fades and the hairline. */
    measure() {
      const s = this.scroller, max = s.scrollWidth - s.clientWidth, overflowing = max > 2;
      const atStart = s.scrollLeft <= 1, atEnd = s.scrollLeft >= max - 1;
      if (overflowing) { const w = Math.max(10, (s.clientWidth / s.scrollWidth) * 100); this.thumb.style.width = w + '%'; this.thumb.style.left = ((s.scrollLeft / max) * (100 - w)) + '%'; this.thumb.style.opacity = '1'; }
      else this.thumb.style.opacity = '0';
      this.arrowL.classList.toggle('hidden', !overflowing); this.arrowR.classList.toggle('hidden', !overflowing);
      this.arrowL.disabled = !overflowing || atStart; this.arrowR.disabled = !overflowing || atEnd;
      const fadeL = 34 + 16, FADE = 18;
      const mask = `linear-gradient(to right, transparent 0, ${T.mask} ${atStart ? 0 : fadeL}px, ${T.mask} calc(100% - ${atEnd ? 0 : FADE}px), transparent 100%)`;
      s.style.maskImage = mask; s.style.webkitMaskImage = mask;
    }

    /** Per-item spring toward a distance-falloff target: width carries it, so neighbours move aside. */
    animate() {
      if (this.raf) return;
      const off = reduceMotion() || !finePointer();
      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.032, (now - last) / 1000); last = now;
        let settled = true;
        for (const it of this.items.values()) {
          let target = DOCK.base;
          if (!off && this.pointerX != null) {
            const b = it.el.getBoundingClientRect(); const d = Math.abs(this.pointerX - (b.x + b.width / 2));
            target = DOCK.peak - (DOCK.peak - DOCK.base) * Math.min(1, d / DOCK.reach);
          }
          // semi-implicit Euler on x'' = -k(x - target) - c x'
          const a = -SPRING.k * (it.size - target) - SPRING.c * it.v;
          it.v += a * dt; it.size += it.v * dt;
          if (Math.abs(it.size - target) < 0.05 && Math.abs(it.v) < 0.5) { it.size = target; it.v = 0; } else settled = false;
          it.el.style.width = it.size + 'px'; it.el.style.height = it.size + 'px';
        }
        if (settled && this.pointerX == null) { this.raf = 0; return; }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
  }

  global.MZ = { T, PIN_TYPES, pinType, pinSVG, PIN_ANCHOR, PIN_HEAD, PIN_HEAD_R, icon, cherryMark, cherryRow, WEIGHT_LABEL, lassoPath, lassoSVG, PinMenu, MenuController, makeRail, Board, Tray, DOCK, uid };
})(window);

window.MZ_IMGS = [{"id": "j00", "name": "11 mb ad-01", "w": 2084, "h": 4167, "big": "assets/play/j00.webp", "thumb": "assets/play/j00-t.webp"}, {"id": "j01", "name": "17804_3x2", "w": 1200, "h": 800, "big": "assets/play/j01.webp", "thumb": "assets/play/j01-t.webp"}, {"id": "j02", "name": "178c34e61ef23f783cf48fb09a5463df", "w": 736, "h": 414, "big": "assets/play/j02.webp", "thumb": "assets/play/j02-t.webp"}, {"id": "j03", "name": "20-facts-might-know-point-break", "w": 1600, "h": 900, "big": "assets/play/j03.webp", "thumb": "assets/play/j03-t.webp"}, {"id": "j04", "name": "2EFHK12", "w": 3634, "h": 5475, "big": "assets/play/j04.webp", "thumb": "assets/play/j04-t.webp"}, {"id": "j05", "name": "51eeVXIqqIL._AC_UF1000,1000_QL80_", "w": 774, "h": 1000, "big": "assets/play/j05.webp", "thumb": "assets/play/j05-t.webp"}, {"id": "j06", "name": "7chsmyajms011", "w": 700, "h": 462, "big": "assets/play/j06.webp", "thumb": "assets/play/j06-t.webp"}, {"id": "j07", "name": "834843", "w": 400, "h": 587, "big": "assets/play/j07.webp", "thumb": "assets/play/j07-t.webp"}, {"id": "j08", "name": "Asa T - White - Back", "w": 1258, "h": 1098, "big": "assets/play/j08.webp", "thumb": "assets/play/j08-t.webp"}, {"id": "j09", "name": "Asa T - White - Front", "w": 1258, "h": 1084, "big": "assets/play/j09.webp", "thumb": "assets/play/j09-t.webp"}, {"id": "j11", "name": "Asa hat - Side - WhiteBack - Zoom", "w": 2100, "h": 1500, "big": "assets/play/j11.webp", "thumb": "assets/play/j11-t.webp"}, {"id": "j13", "name": "Asa hat - front - WhiteBack - Zoom", "w": 2100, "h": 1500, "big": "assets/play/j13.webp", "thumb": "assets/play/j13-t.webp"}, {"id": "j14", "name": "Collection_Page_stu", "w": 1360, "h": 700, "big": "assets/play/j14.webp", "thumb": "assets/play/j14-t.webp"}, {"id": "j15", "name": "DSC07421", "w": 2048, "h": 1365, "big": "assets/play/j15.webp", "thumb": "assets/play/j15-t.webp"}, {"id": "j16", "name": "IMG_9555", "w": 1164, "h": 1469, "big": "assets/play/j16.webp", "thumb": "assets/play/j16-t.webp"}, {"id": "j17", "name": "IMG_9556", "w": 1169, "h": 1470, "big": "assets/play/j17.webp", "thumb": "assets/play/j17-t.webp"}, {"id": "j18", "name": "IMG_9557", "w": 1170, "h": 852, "big": "assets/play/j18.webp", "thumb": "assets/play/j18-t.webp"}, {"id": "j19", "name": "IMG_9561", "w": 1162, "h": 1216, "big": "assets/play/j19.webp", "thumb": "assets/play/j19-t.webp"}, {"id": "j20", "name": "IMG_9562", "w": 1170, "h": 1177, "big": "assets/play/j20.webp", "thumb": "assets/play/j20-t.webp"}, {"id": "j21", "name": "IMG_9620", "w": 1167, "h": 1554, "big": "assets/play/j21.webp", "thumb": "assets/play/j21-t.webp"}, {"id": "j22", "name": "IMG_9639", "w": 1147, "h": 1614, "big": "assets/play/j22.webp", "thumb": "assets/play/j22-t.webp"}, {"id": "j23", "name": "IMG_9640", "w": 801, "h": 1204, "big": "assets/play/j23.webp", "thumb": "assets/play/j23-t.webp"}, {"id": "j24", "name": "IQM2NNAXIAI6JPDRDAK3MODSSQ", "w": 960, "h": 732, "big": "assets/play/j24.webp", "thumb": "assets/play/j24-t.webp"}, {"id": "j25", "name": "Lady Penelope (1966) - Man From Uncle - ", "w": 583, "h": 782, "big": "assets/play/j25.webp", "thumb": "assets/play/j25-t.webp"}, {"id": "j26", "name": "Moe-Coke-Bottle.bmp", "w": 1559, "h": 2379, "big": "assets/play/j26.webp", "thumb": "assets/play/j26-t.webp"}, {"id": "j27", "name": "PD_Frequency", "w": 1000, "h": 1499, "big": "assets/play/j27.webp", "thumb": "assets/play/j27-t.webp"}, {"id": "j29", "name": "PublicDrip_Rough_-26", "w": 960, "h": 1280, "big": "assets/play/j29.webp", "thumb": "assets/play/j29-t.webp"}, {"id": "j30", "name": "SSCxStudents2026_AustinKaseman-073", "w": 3200, "h": 1800, "big": "assets/play/j30.webp", "thumb": "assets/play/j30-t.webp"}, {"id": "j31", "name": "Sanders_Lock_Ray_1970", "w": 1080, "h": 1350, "big": "assets/play/j31.webp", "thumb": "assets/play/j31-t.webp"}, {"id": "j32", "name": "ScreenShot2013-08-01at11.44.41AM_crop_no", "w": 1918, "h": 1278, "big": "assets/play/j32.webp", "thumb": "assets/play/j32-t.webp"}, {"id": "j33", "name": "Screenshot 2023-12-21 at 3.00.46\u202fPM", "w": 2228, "h": 1540, "big": "assets/play/j33.webp", "thumb": "assets/play/j33-t.webp"}, {"id": "j34", "name": "Screenshot 2024-08-07 at 5.00.41\u202fPM", "w": 1536, "h": 1528, "big": "assets/play/j34.webp", "thumb": "assets/play/j34-t.webp"}, {"id": "j35", "name": "Screenshot 2025-03-24 at 8.54.52\u202fPM", "w": 1299, "h": 1691, "big": "assets/play/j35.webp", "thumb": "assets/play/j35-t.webp"}, {"id": "j36", "name": "Weekend_at_Newport-_Golfing._Ben_Bradlee", "w": 1245, "h": 881, "big": "assets/play/j36.webp", "thumb": "assets/play/j36-t.webp"}, {"id": "j37", "name": "a56b3a685de3a80e74c224726243228a", "w": 736, "h": 981, "big": "assets/play/j37.webp", "thumb": "assets/play/j37-t.webp"}, {"id": "j38", "name": "c6b786e08b46f32b52feb14a187cdbf6", "w": 440, "h": 640, "big": "assets/play/j38.webp", "thumb": "assets/play/j38-t.webp"}, {"id": "j39", "name": "catwalk_yourself.thethomascrownaffair", "w": 850, "h": 562, "big": "assets/play/j39.webp", "thumb": "assets/play/j39-t.webp"}, {"id": "j40", "name": "d80c289ddae5a723fcb28ef4f4ef6f11", "w": 679, "h": 903, "big": "assets/play/j40.webp", "thumb": "assets/play/j40-t.webp"}, {"id": "j41", "name": "fposter,small,wall_texture,product,750x1", "w": 750, "h": 1000, "big": "assets/play/j41.webp", "thumb": "assets/play/j41-t.webp"}, {"id": "j42", "name": "hats on pool table ", "w": 4656, "h": 3770, "big": "assets/play/j42.webp", "thumb": "assets/play/j42-t.webp"}, {"id": "j43", "name": "https___hypebeast.com_image_2024_08_29_s", "w": 800, "h": 1200, "big": "assets/play/j43.webp", "thumb": "assets/play/j43-t.webp"}, {"id": "j44", "name": "https___hypebeast.com_image_2024_08_29_s", "w": 800, "h": 1200, "big": "assets/play/j44.webp", "thumb": "assets/play/j44-t.webp"}, {"id": "j45", "name": "https___hypebeast.com_image_2024_08_29_s", "w": 800, "h": 1200, "big": "assets/play/j45.webp", "thumb": "assets/play/j45-t.webp"}, {"id": "j46", "name": "image_6483441 (1)", "w": 474, "h": 567, "big": "assets/play/j46.webp", "thumb": "assets/play/j46-t.webp"}, {"id": "j47", "name": "images (2)", "w": 678, "h": 452, "big": "assets/play/j47.webp", "thumb": "assets/play/j47-t.webp"}, {"id": "j48", "name": "images (3)", "w": 387, "h": 516, "big": "assets/play/j48.webp", "thumb": "assets/play/j48-t.webp"}, {"id": "j50", "name": "images (5)", "w": 623, "h": 321, "big": "assets/play/j50.webp", "thumb": "assets/play/j50-t.webp"}, {"id": "j51", "name": "images (6)", "w": 399, "h": 501, "big": "assets/play/j51.webp", "thumb": "assets/play/j51-t.webp"}, {"id": "j53", "name": "images (8)", "w": 388, "h": 515, "big": "assets/play/j53.webp", "thumb": "assets/play/j53-t.webp"}, {"id": "j54", "name": "inspo goggle ad-01", "w": 2550, "h": 3300, "big": "assets/play/j54.webp", "thumb": "assets/play/j54-t.webp"}, {"id": "j55", "name": "oceans_eleven_xlg1", "w": 492, "h": 745, "big": "assets/play/j55.webp", "thumb": "assets/play/j55-t.webp"}, {"id": "j56", "name": "red staged image ", "w": 4880, "h": 5197, "big": "assets/play/j56.webp", "thumb": "assets/play/j56-t.webp"}, {"id": "j57", "name": "s-l1200", "w": 880, "h": 1200, "big": "assets/play/j57.webp", "thumb": "assets/play/j57-t.webp"}, {"id": "j58", "name": "s-l1200", "w": 865, "h": 1200, "big": "assets/play/j58.webp", "thumb": "assets/play/j58-t.webp"}, {"id": "j60", "name": "thomas-crown-affair-00", "w": 584, "h": 439, "big": "assets/play/j60.webp", "thumb": "assets/play/j60-t.webp"}];
