/* ── Maraschino design system explorer ──
   Reads ../assets/tokens/tokens.json (the app's own DTCG export) for names, layers and aliases, and
   tokens.css for the values it paints with. The live parts are the case study's port of the app's
   components (../assets/play.js), which reads the same tokens. Nothing on this page is a picture of
   the UI: the ratios are computed on load and the controls are the real ones. */
(function () {
  'use strict';

  const MZ = window.MZ;
  const doc = document, root = doc.documentElement;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const style = getComputedStyle(root);
  /** a custom property from tokens.css, exactly as the app ships it */
  const cv = (name) => style.getPropertyValue('--' + name).trim();
  const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/\./g, '-').toLowerCase();
  /** `color.ink.muted` → `--color-ink-muted`, the same rule the exporter uses */
  const varOf = (path) => '--' + kebab(path);
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IMG = (window.MZ_IMGS || []).map((i) => Object.assign({}, i, { big: '../' + i.big, thumb: '../' + i.thumb }));
  const imgById = (id) => IMG.find((i) => i.id === id) || IMG[0];

  /* ------------------------------------------------------------------ icons (lucide, same set as the app) */
  const EXTRA = {
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    braces: '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    'panel-right': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
    'rotate-cw': '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
    box: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  };
  const ic = (name, size = 14, sw = 2) => EXTRA[name]
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EXTRA[name]}</svg>`
    : MZ.icon(name, size, sw);

  /** the app's marks, lifted from components/Brand.tsx — never redrawn */
  const WORDMARK_PATHS = '<path d="M-91.02-74.02l-.03.13c-.33-.13-.72-.07-1.12-.06l-.04-2.29-1.12-.02-.04-1.15h-3.39s0,3.39,0,3.39l1.15.05.03,1.13c.41.02.74-.02,1.14.04,0,.36-.04.71.01,1.13.78.02,1.48-.04,2.27.06.02.36-.06.7.06,1.1l2.21-.02c.05-.42.05-.75,0-1.17-.42.02-.75.06-1.14-.01,0-.76.03-1.5-.02-2.18.36.16.77.11,1.17.15v2.05s1.16.06,1.16.06v1.11c-.42.04-.76.01-1.16,0v1.15s-2.29,0-2.29,0l-.02-1.14h-2.29c.03-.45.06-.78-.02-1.16h-1.09s-.02-1.13-.02-1.13l-1.12-.02-.05-1.13h-1.12s-.02-2.3-.02-2.3h-1.12s-.01,2.3-.01,2.3l-1.14.03v4.54s1.15.02,1.15.02v3.42s2.3.01,2.3.01l.03,1.13,1.13.03v6.9s-1.13,0-1.13,0l-.05,1.14h-6.86s-.03-1.15-.03-1.15h-1.13s-.01-2.29-.01-2.29h-4.61c.05-.44.07-.76-.01-1.12l-1.1-.04v-6.88s1.12-.01,1.12-.01c.07-.37.03-.71,0-1.12l3.47-.02v-2.3s1.15-.02,1.15-.02v-2.29s1.13-.02,1.13-.02c.06-.42.02-.77.02-1.13l1.14-.02v-1.13s1.16-.02,1.16-.02v-1.14c.37.02.74.07,1.15-.04l.02-1.08h1.13s.02-1.15.02-1.15h1.14s0,2.29,0,2.29h1.16c-.01-.39-.04-.72,0-1.15h3.4c.06.42.03.76,0,1.17.39-.02.73-.05,1.16,0,.05.42.02.75,0,1.16.39-.03.73-.06,1.16,0v2.21ZM-100.19-76.21c-.37-.1-.77-.07-1.16-.03l-.02,1.13-1.14.02-.02,1.14c-.4-.03-.7-.06-1.11.03l-.03,2.23-1.12.02v2.3s2.26,0,2.26,0l.02,1.14h1.15s0,2.29,0,2.29h1.15s0-3.44,0-3.44l-1.15-.02v-4.56s1.14-.05,1.14-.05l.03-2.22c.36.1.7-.02,1.13-.08v-1.1s-1.14,0-1.14,0v1.18ZM-109.39-62.53c0,.12.17.13.25.11.3-.07.61-.02.91-.02l.03,1.16h3.4c.11-.44.04-.8,0-1.14l-.03-.25c.08-.02.1-.09.09-.14,0-.07-.06-.15-.08-.2.03-.51,0-1.13.09-1.74.38,0,.76.07,1.07-.07.17-.32.07-.67.1-1.08.31-.02.72.1,1.01-.06.22-.15.21-.87-.01-1.03-.26-.18-.7-.05-1-.06,0-.42.06-.77-.1-1.13l-4.56-.04v1.16s-1.17,0-1.17,0v4.53ZM-103.48-59.05c.24.18.59.12.94.1l.04,1.06h4.55s.11-1.12.11-1.12l1.1-.06v-4.53c-.43-.01-.82.07-1.16-.11l-.02-1.06h-4.6s-.02,1.14-.02,1.14l-1.1.04-.03,4.28c0,.14.13.22.19.26Z"/><path d="M-89.87-73.74c-.4-.04-.81.01-1.17-.15l.03-.13,1.09.03c.05.02.05.19.05.24Z"/><path d="M-100.19-76.21v-1.18s1.12,0,1.12,0v1.1c-.43.07-.76.18-1.12.08Z"/><path d="M-104.84-62.67v-.34s.09.12.09.2c0,.05-.02.13-.09.14Z"/><path d="M-109.14-62.42c-.09.02-.25,0-.25-.11.1,0,.2.02.25.11Z"/><path d="M-101.34-61.38c-.41.11-.73.06-1.13.05v-1.16c.37.01.72.05,1.1-.04l.03-1.1h1.13s-.01,1.18-.01,1.18c-.35-.01-.81-.11-1.06.11-.15.19-.08.59-.05.97Z"/><polygon points="-107.09 -64.77 -108.22 -64.77 -108.22 -65.9 -107.14 -65.92 -107.11 -67.06 -105.95 -67.06 -105.96 -65.91 -107.09 -65.91 -107.09 -64.77"/><path d="M-77.28-58.19v-2h2.01v-16.03h2.01v6.01h2.01v4.01h2.01v4.01h2.01v-4.01h-2.01v-4.01h-2.01v-4.01h-2.01v14.03h2.01v2h-6.03ZM-77.28-76.23v2h2.01v-2h-2.01ZM-67.24-66.21v-4.01h2.01v4.01h-2.01ZM-65.23-58.19v-2h2.01v-10.02h-2.01v-4.01h2.01v-2h2.01v2h2.01v-2h-2.01v16.03h2.01v2h-6.03Z"/><path d="M-53.18-60.2h6.03v-4.01h-8.03v-2h8.03v-4.01h2.01v10.02h-2.01v2h-8.03v-2h-2.01v-4.01h2.01v4.01h2.01ZM-57.19-68.21v-2h2.01v2h-2.01ZM-47.15-70.22h-8.03v-2h8.03v2ZM-45.14-60.2h2.01v2h-2.01v-2Z"/><path d="M-41.13-58.19v-2h2.01v-12.03h2.01v4.01h2.01v-2h-2.01v10.02h2.01v2h-6.03ZM-41.13-72.22v2h2.01v-2h-2.01ZM-31.08-70.22h-4.02v-2h4.02v2ZM-31.08-70.22v2h2.01v-2h-2.01Z"/><path d="M-23.05-60.2h6.03v-4.01h-8.03v-2h8.03v-4.01h2.01v10.02h-2.01v2h-8.03v-2h-2.01v-4.01h2.01v4.01h2.01ZM-27.07-68.21v-2h2.01v2h-2.01ZM-17.02-70.22h-8.03v-2h8.03v2ZM-15.01-60.2h2.01v2h-2.01v-2Z"/><path d="M-11-66.21v-4.01h2.01v-2H-.96v2h-8.03v4.01h-2.01ZM-11-60.2v-2h2.01v2h-2.01ZM-.96-64.2v-2h-8.03v2H-.96ZM-.96-60.2h-8.03v2H-.96v-2ZM-.96-70.22v2H1.05v-2H-.96ZM-.96-64.2H1.05v4.01H-.96v-4.01Z"/><path d="M9.09-60.2h4.02v-2h2.01v2h-2.01v2h-6.03v-2h-2.01v-2h-2.01v-6.01h2.01v6.01h2.01v2h2.01ZM9.09-72.22h4.02v2h-6.03v2h-2.01v-2h2.01v-2h2.01ZM15.11-68.21v2h-2.01v-4.01h2.01v2Z"/><path d="M17.12-58.19v-2h2.01v-18.04h2.01v10.02h2.01v-2h-2.01v10.02h2.01v2h-6.03ZM17.12-78.23v2h2.01v-2h-2.01ZM29.17-70.22h-6.03v-2h6.03v2ZM29.17-70.22v2h2.01v-2h-2.01ZM29.17-60.2v2h6.03v-2h-4.02v-8.02h2.01v8.02h-4.02Z"/><path d="M37.21-58.19v-2h2.01v-10.02h-2.01v-2h4.02v12.03h2.01v2h-6.03ZM41.22-76.23v2h-2.01v-4.01h2.01v2Z"/><path d="M45.24-58.19v-2h2.01v-12.03h2.01v4.01h2.01v-2h-2.01v10.02h2.01v2h-6.03ZM45.24-72.22v2h2.01v-2h-2.01ZM57.29-70.22h-6.03v-2h6.03v2ZM57.29-70.22v2h2.01v-2h-2.01ZM57.29-60.2v2h6.03v-2h-4.02v-8.02h2.01v8.02h-4.02Z"/><path d="M67.33-62.2h-2.01v-6.01h2.01v6.01ZM67.33-68.21v-2h2.01v2h-2.01ZM67.33-62.2h2.01v2h-2.01v-2ZM71.35-72.22h4.02v2h-6.03v-2h2.01ZM71.35-60.2h4.02v2h-6.03v-2h2.01ZM77.38-68.21h-2.01v-2h2.01v2ZM77.38-62.2v2h-2.01v-2h2.01ZM77.38-62.2v-6.01h2.01v6.01h-2.01Z"/>';
  const wordmark = (h) => `<svg height="${h}" width="${Math.round(h * (189.9 / 23))}" viewBox="-110.50 -79.70 189.90 23.00" fill="currentColor" aria-hidden="true">${WORDMARK_PATHS}</svg>`;
  const trayIcon = (h) => `<svg height="${h}" width="${Math.round(h * (66.2 / 26.1))}" viewBox="135.40 -81.20 66.20 26.10" fill="currentColor" aria-hidden="true"><rect x="135.4" y="-76.67" width="17.07" height="17.07"/><rect x="155.42" y="-81.2" width="26.12" height="26.12"/><rect x="184.49" y="-76.67" width="17.07" height="17.07"/></svg>`;
  const cherry = (s) => MZ.cherryMark(s);

  /* ------------------------------------------------------------------ colour maths (WCAG 2) */
  const rgbOf = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const lum = (hex) => { const c = rgbOf(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** a translucent colour laid over an opaque one, flattened to hex */
  const over = (hex, alpha, base) => '#' + rgbOf(hex).map((v, i) => Math.round(v * alpha + rgbOf(base)[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('').toUpperCase();
  const inkOn = (hex) => (lum(hex) > 0.35 ? cv('color-ink-strong') : cv('color-ink-on-dark'));

  /* ------------------------------------------------------------------ tokens.json */
  const TK = { list: [], byPath: new Map(), primitive: null, semantic: null, sha: '' };
  const fmt = (t, v) => {
    if (v == null) return '';
    if (Array.isArray(v) && t === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`;
    if (Array.isArray(v) && t === 'fontFamily') return v.join(', ');
    if (t === 'shadow') { const L = Array.isArray(v) ? v : [v]; return L.map((s) => `${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${s.color}`).join(', '); }
    return String(v);
  };
  async function loadTokens() {
    const res = await fetch('../assets/tokens/tokens.json', { cache: 'no-cache' });
    const text = await res.text();
    try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); TK.sha = Array.from(new Uint8Array(buf)).slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join(''); } catch (e) { /* no subtle crypto on http */ }
    const json = JSON.parse(text);
    const walk = (node, path, layer) => {
      for (const [k, v] of Object.entries(node)) {
        if (k.startsWith('$')) continue;
        const p = path ? path + '.' + k : k;
        if (v && typeof v === 'object' && '$value' in v) TK.list.push({ path: p, layer, type: v.$type, raw: v.$value });
        else if (v && typeof v === 'object') walk(v, p, layer);
      }
    };
    walk(json.primitive, 'primitive', 'primitive');
    const sem = Object.assign({}, json); delete sem.primitive; delete sem.$schema; delete sem.$description;
    walk(sem, '', 'semantic');
    TK.list.forEach((t) => TK.byPath.set(t.path, t));
    const resolve = (t, depth = 0) => {
      if (typeof t.raw === 'string' && /^\{.+\}$/.test(t.raw) && depth < 8) {
        const ref = TK.byPath.get(t.raw.slice(1, -1)); t.alias = t.raw.slice(1, -1);
        return ref ? resolve(ref, depth + 1) : t.raw;
      }
      return t.raw;
    };
    TK.list.forEach((t) => {
      t.value = resolve(t);
      t.css = t.layer === 'semantic' ? varOf(t.path) : null;
      // what the app actually ships for a semantic token is the custom property's text
      t.shown = (t.css && cv(t.css.slice(2))) || fmt(t.type, t.value);
    });
    TK.primitive = TK.list.filter((t) => t.layer === 'primitive');
    TK.semantic = TK.list.filter((t) => t.layer === 'semantic');
  }
  const tok = (path) => TK.byPath.get(path);

  /* ------------------------------------------------------------------ copy + toast */
  let toastT = 0;
  function toast(html) {
    const el = $('#ds-toast'); el.innerHTML = html; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1600);
  }
  async function copy(text, label) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = doc.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; doc.body.appendChild(ta); ta.select();
      try { ok = doc.execCommand('copy'); } catch (e2) { ok = false; } ta.remove();
    }
    toast(ok ? `${ic('check', 13, 2.6)} Copied <code>${esc(label || text)}</code>` : `Couldn’t copy <code>${esc(text)}</code>`);
  }
  doc.addEventListener('click', (e) => {
    const el = e.target.closest('[data-copy]'); if (!el) return;
    e.preventDefault(); copy(el.dataset.copy, el.dataset.label);
  });

  /* ------------------------------------------------------------------ small html helpers */
  /** a copyable token name: shows `color.ink.muted`, copies `var(--color-ink-muted)` */
  const tn = (path, label) => { const t = tok(path); const v = t && t.css ? `var(${t.css})` : (t ? t.shown : path);
    return `<button type="button" class="tn" data-copy="${esc(v)}" data-label="${esc(v)}" title="Copy ${esc(v)}">${esc(label || path.replace(/^primitive\./, ''))}</button>`; };
  const val = (v, label) => `<button type="button" class="cp v" data-copy="${esc(v)}" data-label="${esc(label || v)}" title="Copy ${esc(v)}">${esc(v)}</button>`;
  const sw = (color) => `<span class="sw" style="background:${esc(color)}"></span>`;
  const viewHead = (o) => `<header class="vh"><div class="eyebrow">${esc(o.group)}</div><h1 tabindex="-1">${o.title}</h1>${o.lede ? `<p class="lede">${o.lede}</p>` : ''}${o.src ? `<div class="src">${o.src.map((s) => `<span class="chip">${s}</span>`).join('')}</div>` : ''}</header>`;
  const sec = (id, title, sub, body) => `<section class="sec" id="${id}"><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${body || ''}</section>`;
  const cap = (l, r) => `<div class="figcap"><span>${l || ''}</span><span>${r || ''}</span></div>`;
  /* pins paint past their viewBox (head, cast shadow), so the svg must not clip, as in the app's .pin-btn */
  const pin = (type, size, o) => MZ.pinSVG(type, Object.assign({ size }, o || {})).replace('<svg ', '<svg style="overflow:visible" ');
  const pinType = (id) => MZ.pinType(id);

  /** keep `el` visible inside the scroll box `box` without scrolling anything outside it (the page may be framed in Garrison OS) */
  const keepIn = (box, el, pad = 8) => { const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.top < b.top + pad) box.scrollTop -= b.top + pad - r.top; else if (r.bottom > b.bottom - pad) box.scrollTop += r.bottom - (b.bottom - pad); };

  /* ------------------------------------------------------------------ anatomy: numbered markers placed on live elements */
  /**
   * `stage` holds the real part; each marker is `{ n, at(stage) → {x, y} }` in stage pixels, so the
   * numbers follow the part through resizes. Hovering a number lights its legend line and back.
   */
  function markers(stage, list, legendEl) {
    const layer = doc.createElement('div'); layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:30';
    stage.appendChild(layer);
    /* a marker with `lead: {dx, dy}` sits off to the side with a hairline back to the point it names */
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'mk-leads'); layer.appendChild(svg);
    const els = list.map((m) => { const d = doc.createElement('div'); d.className = 'mk'; d.textContent = m.n; d.dataset.n = m.n; layer.appendChild(d); return d; });
    const place = () => {
      let leads = '';
      const W = stage.clientWidth, H = stage.clientHeight, cl = (v, hi) => Math.max(12, Math.min(hi - 12, v));
      list.forEach((m, i) => { const p = m.at(stage), q0 = m.lead ? { x: p.x + m.lead.dx, y: p.y + m.lead.dy } : p, q = { x: cl(q0.x, W), y: cl(q0.y, H) };
        els[i].style.left = q.x + 'px'; els[i].style.top = q.y + 'px';
        if (m.lead) leads += `<g data-n="${m.n}"><line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/><circle cx="${p.x}" cy="${p.y}" r="2.5"/></g>`; });
      svg.innerHTML = leads;
    };
    const hot = (n, on) => {
      els.forEach((d) => d.classList.toggle('hot', on && d.dataset.n == n));
      if (legendEl) $$('li', legendEl).forEach((li) => li.classList.toggle('hot', on && li.dataset.n == n));
    };
    els.forEach((d) => { d.addEventListener('pointerenter', () => hot(d.dataset.n, true)); d.addEventListener('pointerleave', () => hot(0, false)); });
    if (legendEl) $$('li', legendEl).forEach((li) => { li.addEventListener('pointerenter', () => hot(li.dataset.n, true)); li.addEventListener('pointerleave', () => hot(0, false)); });
    place(); requestAnimationFrame(place); setTimeout(place, 300);
    const ro = new ResizeObserver(place); ro.observe(stage);
    return () => ro.disconnect();
  }
  /** where an element sits inside the stage, as a point at fractions (fx, fy) of its box */
  const rel = (stage, el, fx, fy, dx = 0, dy = 0) => {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width * fx + dx, y: r.top - s.top + r.height * fy + dy };
  };
  const legend = (items) => `<ol class="legend">${items.map((it) => `<li data-n="${it.n}"><span class="num">${it.n}</span><div><b>${it.t}</b>${it.d}${it.tok ? `<div class="tok">${it.tok.map((p) => tn(p)).join('')}</div>` : ''}</div></li>`).join('')}</ol>`;

  /* ------------------------------------------------------------------ bezier (for drawing and replaying the curves) */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    const solve = (x) => { let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) return t; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      let lo = 0, hi = 1; t = x; while (lo < hi) { const v = sx(t); if (Math.abs(v - x) < 1e-6) return t; if (x > v) lo = t; else hi = t; t = (hi - lo) / 2 + lo; if (hi - lo < 1e-7) break; } return t; };
    return (x) => sy(solve(x));
  }
  const parseBez = (s) => (s.match(/-?[\d.]+/g) || []).map(Number);
  /** a spring as the app's motion library resolves it: visualDuration + bounce → stiffness + damping, mass 1 */
  function springFrom(o) {
    let k, c;
    if (o.visualDuration != null) { const r = (2 * Math.PI) / (o.visualDuration * 1.2); k = r * r; c = 2 * Math.min(1, Math.max(0.05, 1 - (o.bounce || 0))) * Math.sqrt(k); }
    else { const z = 1 - (o.bounce || 0), d = o.duration || 0.3; const w = -Math.log(0.001 * Math.sqrt(1 - z * z) / z) / (z * d); k = w * w; c = 2 * z * w; }
    const pts = []; let x = 0, v = 0; const dt = 1 / 240;
    for (let t = 0; t <= 1.2; t += dt) { if (Math.round(t * 240) % 4 === 0) pts.push([t, x]); const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; }
    let settle = 1.2; for (let i = pts.length - 1; i >= 0; i--) { if (Math.abs(pts[i][1] - 1) > 0.01) { settle = pts[Math.min(pts.length - 1, i + 1)][0]; break; } }
    return { pts, k, c, peak: Math.max(...pts.map((p) => p[1])), settle };
  }

  /* ================================================================== FOUNDATIONS */

  const RAMP_ROLE = {
    50: ['color.surface.polaroid'], 100: ['color.surface.panelSoft'], 150: ['color.surface.panel'], 200: ['color.board.bg'],
    300: ['color.surface.line'], 350: ['color.wash.shelf'], 400: ['color.cherry.empty'], 500: ['color.ink.faint'],
    600: ['color.board.dot'], 700: ['color.ink.icon'], 750: ['color.ink.muted'], 800: ['color.ink.body'], 900: ['color.ink.strong'],
  };
  const RAMP_WORD = { 50: 'Polaroid paper', 100: 'Fields, washes', 150: 'Chrome', 200: 'The board', 300: 'Hairlines', 350: 'Tray shelf',
    400: 'Unlit cherry', 500: 'Faint ink', 600: 'Dot grid', 700: 'Resting icons', 750: 'Muted ink', 800: 'Body ink', 900: 'Strong ink' };
  const BRACKETS = [[0, 4, 'Surfaces', 'paper, fields, chrome, the board'], [4, 7, 'Edges', 'hairlines, the shelf, an unlit cherry'],
    [7, 10, 'Quiet marks', 'disabled ink, the dot grid, resting icons'], [10, 13, 'Ink', 'labels, body, headings']];

  const ROLES = [
    ['color.board.bg', 'The canvas, the gate, the ground a board tile is drawn on.', 'A panel fill — the chrome has to sit on it.'],
    ['color.board.dot', 'The dot grid, at every zoom.', 'Anything else.'],
    ['color.ink.strong', 'Headings, values, field text, the selected tab, the rail tag.', 'Paragraphs — too heavy for running text.'],
    ['color.ink.body', 'Paragraphs, chips, secondary buttons, the extraction’s prose.', 'Labels that should recede.'],
    ['color.ink.muted', 'Labels, hints, counts, meta lines — secondary text at any size.', 'Icon-only buttons (those take ink.icon).'],
    ['color.ink.icon', 'Icon-only buttons at rest: close ×, add +, the tray’s + button, raw JSON.', 'Text of any kind — it fails AA for text (D-049).'],
    ['color.ink.faint', 'Disabled and empty states, the weight caption.', 'The only copy of a message — it fails AA.'],
    ['color.ink.onDark', 'Text and glyphs on strong ink or a pin hue.', 'On chrome — it is white.'],
    ['color.surface.panel', 'Every card, pill, rail and popover; text on cherry.', 'The board.'],
    ['color.surface.panelSoft', 'Fields, resting chips, empty image areas, hover washes.', 'A card — it has no edge against the panel.'],
    ['color.surface.line', 'Hairlines, dashed add-tiles, progress tracks, resting field borders.', 'Text.'],
    ['color.surface.polaroid', 'The polaroid frame. The one warm neutral.', 'Chrome.'],
    ['color.brand.cherry', 'The action: Compile, the pressed chip, the lit cherries, focus.', 'A pin head (D-027).'],
    ['color.brand.cherryDeep', 'The tray arrows under the pointer.', 'Text.'],
    ['color.cherry.empty', 'An unlit weight cherry.', 'Anything else — it is a placeholder.'],
    ['color.shadow', 'The navy every shadow is drawn in.', 'Opaque, anywhere.'],
    ['color.focus', 'The 2px ring on buttons and the halo on fields.', '—'],
  ];

  /* every pairing the app actually draws, measured on load */
  const pairs = () => {
    const c = (p) => cv(p.replace(/\./g, '-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());
    const P = (what, fg, bg, kind, note, fgBg) => ({ what, fg, bg, fgv: c(fg), bgv: fgBg || c(bg), kind, note });
    const X = (p, ex) => Object.assign(p, { ex });
    return [
      P('Headings, values, field text', 'color.ink.strong', 'color.surface.panel', 'text'),
      P('Body copy in cards and the rail', 'color.ink.body', 'color.surface.panel', 'text'),
      P('Labels, hints, meta lines', 'color.ink.muted', 'color.surface.panel', 'text', 'Carries 11–12px labels. Darkened to pass (D-049).'),
      P('Icon-only buttons at rest', 'color.ink.icon', 'color.surface.panel', 'ui', 'The old muted grey, kept for glyphs, where the bar is 3:1.'),
      X(P('A disabled Compile or tray arrow', 'color.ink.faint', 'color.surface.panel', 'text', 'Off on purpose, and Compile says why in readable ink beside it.'), 'Inactive controls: WCAG 2 sets no minimum.'),
      P('Empty values, empty states, the “Soon” tag', 'color.ink.faint', 'color.surface.panel', 'text', 'Reads as absent on purpose; never the only copy of a message.'),
      P('The weight caption under the cherries', 'color.ink.faint', 'color.surface.polaroid', 'text', 'The cherries are the data; the word captions them.'),
      P('Chips and the zoom percentage', 'color.ink.body', 'color.surface.panelSoft', 'text'),
      P('Text in a field', 'color.ink.strong', 'color.surface.panelSoft', 'text'),
      P('The gate’s question', 'color.ink.strong', 'color.board.bg', 'large'),
      P('The gate’s explanation', 'color.ink.muted', 'color.board.bg', 'text', 'The board is the hardest ground; the new muted grey clears it.'),
      P('Question numbers, “Compile stopped”, “Done”', 'color.brand.cherry', 'color.surface.panel', 'text'),
      P('Text on a cherry button or pill', 'color.surface.panel', 'color.brand.cherry', 'text'),
      P('The pin count on the armed Compile pill', 'color.surface.panel', 'color.wash.onCherry', 'text', 'White at 22% over cherry, flattened.', over('#FFFFFF', 0.22, cv('color-brand-cherry'))),
      P('The selected tab', 'color.surface.panel', 'color.ink.strong', 'text'),
      P('The rail’s flip-out tag', 'color.ink.onDark', 'color.ink.strong', 'text'),
      P('Focus ring on chrome', 'color.focus', 'color.surface.panel', 'ui'),
      P('Focus ring on the board', 'color.focus', 'color.board.bg', 'ui'),
      P('A cherry pill against the board', 'color.brand.cherry', 'color.board.bg', 'ui'),
      X(P('A chrome pill against the board', 'color.surface.panel', 'color.board.bg', 'ui', 'Carried by its shadow, not its fill — chrome sits on the board.'), 'Named by its label or icon, so its edge isn’t what identifies it (1.4.11).'),
      P('An unlit cherry on the polaroid', 'color.cherry.empty', 'color.surface.polaroid', 'ui', 'A placeholder: meant to recede.'),
    ];
  };
  const need = (k) => (k === 'text' ? 4.5 : 3);

  /* ------------------------------------------------------------------ overview */
  function vOverview() {
    const nSem = TK.semantic.length, nPrim = TK.primitive.length;
    const html = `
<div class="hero">
  <div class="eyebrow lbl" style="color:var(--color-brand-cherry)">Maraschino · design system · v1</div>
  <h1>The parts of Maraschino, running live.</h1>
  <p class="lede">Every colour, size, shadow and curve in the app comes out of one file of tokens. This window is built from that same file, and the controls in it are the real parts: hover a pin, open its menu, weight a photo, search for anything.</p>
  <div class="hero-strip">
    <div class="hero-pins" aria-label="The seven pins">${MZ.PIN_TYPES.map((t) => `<span title="${esc(t.label)}">${pin(t.id, 26)}</span>`).join('')}</div>
    <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
      <div id="ov-cherries"></div>
      <button type="button" class="pill cmp armed" data-copy="var(--color-brand-cherry)" data-label="color.brand.cherry">${cherry(15)} Compile <span class="ct">12</span></button>
    </div>
  </div>
</div>

${sec('doors', 'Three ways in', 'Foundations are the values. Components are the parts built from them, with their anatomy and every state. Rules are the handful of things the parts are never allowed to do.', `
<div class="doors">
  <a class="door" href="#colour"><div class="art"><div style="display:flex;gap:4px">${[50, 150, 300, 500, 700, 800, 900].map((k) => `<span style="width:22px;height:48px;border-radius:6px;background:${esc(tok('primitive.color.slate.' + k).value)};border:1px solid var(--color-wash-swatch-edge)"></span>`).join('')}<span style="width:22px;height:48px;border-radius:6px;background:var(--color-brand-cherry)"></span></div></div>
    <h3>Foundations</h3><p>Colour, contrast, type, space, radius, elevation and motion. ${nPrim} primitives, ${nSem} named roles.</p><span class="go">Start with colour →</span></a>
  <a class="door" href="#pin"><div class="art"><div style="display:flex;align-items:flex-end;gap:14px">${pin('type', 40)}${pin('subject', 30, { selected: true })}${pin('theme', 24)}</div></div>
    <h3>Components</h3><p>The pin, its menu, the rail, the polaroid and its cherries, the tray, and the controls around them.</p><span class="go">Start with the pin →</span></a>
  <a class="door" href="#rules"><div class="art"><div style="display:flex;gap:10px"><span class="dd-mini" style="display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--color-ink-strong);color:var(--color-ink-on-dark)">${ic('check', 20, 3)}</span><span style="display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--color-brand-cherry);color:var(--color-ink-on-dark)">${ic('x', 20, 3)}</span></div></div>
    <h3>Rules</h3><p>Eight do-and-don’t pairs, drawn with the real parts, each tied to the decision that made it.</p><span class="go">See the rules →</span></a>
</div>`)}

${sec('principles', 'Principles', '', `
<ul class="principles">
  <li><b>Quiet chrome, loud content.</b>The board is a very light cool slate and the chrome is near-white on it. The reference photos supply the colour; the pins are the only saturated colour the app adds. <span class="d">D-011 · D-020</span></li>
  <li><b>Brand red is chrome, never a pin.</b>The cherry marks actions and focus. The Color pin has its own warmer red, so a focus ring or the Compile button never reads as a pin. <span class="d">D-027</span></li>
  <li><b>One light.</b>Every shadow is the same navy at a different strength, and a pin’s shadow is its own silhouette under that light, so thirty pins read as one lit scene. <span class="d">D-030</span></li>
  <li><b>Physical in the objects, not the surface.</b>Polaroid frames, pushpins, a hole where the pin goes in. No cork, no paper grain. About five percent skeuomorphism. <span class="d">D-011 · D-022</span></li>
  <li><b>Springy, never floaty.</b>Hover and colour at 140ms, lifts at 160ms, one overshoot curve for anything that pops. <span class="d">D-026 · D-031</span></li>
  <li><b>Named for the job.</b>A part never says a hex or a pixel radius; it says <code>ink.muted</code> or <code>radius.card</code>. Change the value once and every part moves with it. <span class="d">D-048</span></li>
</ul>`)}

${sec('numbers', 'Before and after', 'The audit counted every value typed into the app’s components before this system existed. The refactor that followed changed what the numbers below say, and nothing on screen except five changes I approved.', `
<div class="nums">
  <div><div class="big"><s>83</s><i>→</i><em>0</em></div><p>Colours typed into components: 37 hex codes and 46 rgba() values. Now none, and the linter refuses a new one.</p></div>
  <div><div class="big"><s>35</s><i>→</i><em>1</em></div><p>One shadow navy, typed 35 times at 14 different strengths. Now one token, and every shadow is named for what casts it.</p></div>
  <div><div class="big">${nSem}</div><p>Named tokens components can use, built on ${nPrim} primitives. Counted from the token file on load.</p></div>
  <div><div class="big"><s>15</s><i>→</i><em>12</em></div><p>Corner radii. The odd 7, 9 and 11 became 8, 10 and 12; each radius is named for what wears it.</p></div>
  <div><div class="big"><s>4</s><i>→</i><em>2</em></div><p>Font weights. The 650 and 660 on the start screen folded into 600 and 700.</p></div>
  <div><div class="big">18<i>·</i><em>0</em></div><p>Screens shot before and after the refactor, compared pixel for pixel: zero changed that I hadn’t approved.</p></div>
</div>`)}

${sec('pipeline', 'One file, three readers', 'The app generates two files from its token source. The app, this window and the case study around it all read those two files, so none of them can show a value the others don’t have.', `
<div class="pipe">
  <div class="box"><div class="k">Source</div><b>src/lib/tokens.ts</b><p>Primitives and roles, typed. The only place a value is written.</p></div>
  <div class="arr">npm run<br>tokens</div>
  <div class="box"><div class="k">Generated</div><b>tokens.css</b><b style="margin-top:2px">tokens.json</b><p>Custom properties, and the same set in the W3C token format.</p></div>
  <div class="arr">read by</div>
  <div class="outs">
    <div class="box" style="padding:10px 14px"><b style="margin:0">The Maraschino app</b></div>
    <div class="box" style="padding:10px 14px"><b style="margin:0">This design system window</b></div>
    <div class="box" style="padding:10px 14px"><b style="margin:0">The case study’s live demos</b></div>
  </div>
</div>`)}

${sec('get', 'Get the tokens', 'The same two files this page reads.', `
<div class="getit">
  <a class="dl" href="../assets/tokens/tokens.css" download>${ic('download')} tokens.css</a>
  <a class="dl" href="../assets/tokens/tokens.json" download>${ic('download')} tokens.json</a>
  <span class="chip">v1 · <b>D-048</b></span>
  ${TK.sha ? `<span class="chip" title="SHA-256 of the tokens.json this page loaded">tokens.json · ${TK.sha}</span>` : ''}
</div>`)}`;
    return { html, mount(el) {
      const host = $('#ov-cherries', el); if (host) MZ.cherryRow(host, { value: 2, size: 22, gap: 5 });
    } };
  }

  /* ------------------------------------------------------------------ colour */
  function vColour() {
    const steps = Object.keys(RAMP_ROLE).map(Number);
    const hexes = steps.map((k) => tok('primitive.color.slate.' + k).value);
    const panel = cv('color-surface-panel');
    const ratios = hexes.map((h) => contrast(h, panel));
    const run = (min) => { let s = -1; for (let i = ratios.length - 1; i >= 0; i--) { if (ratios[i] >= min) s = i; else break; } return s; };
    const r3 = run(3), r45 = run(4.5);
    const ramp = `
<div class="fig">
  <div class="ramp" id="ramp-fig" style="--n:${steps.length}">
    ${r3 >= 0 ? `<div class="rule r3" style="grid-row:1;grid-column:${r3 + 1} / -1">≥ 3:1 · UI marks</div>` : ''}
    ${r45 >= 0 ? `<div class="rule r45" style="grid-row:2;grid-column:${r45 + 1} / -1">≥ 4.5:1 · text</div>` : ''}
    ${steps.map((k, i) => `<div class="st" style="grid-row:3" data-step="${k}">
      <button type="button" class="chipc" style="background:${hexes[i]}" data-copy="${hexes[i]}" data-label="slate.${k} · ${hexes[i]}" title="slate.${k} · ${hexes[i]} · ${ratios[i].toFixed(2)}:1 on chrome">
        <span class="ratio" style="color:${inkOn(hexes[i])}">${ratios[i].toFixed(2)}</span></button>
      <span class="k">${k}</span><span class="hx">${hexes[i]}</span>
      <span class="role">${RAMP_WORD[k]}</span></div>`).join('')}
    ${BRACKETS.map(([a, b, t, d]) => `<div class="br" style="grid-row:4;grid-column:${a + 1} / ${b + 1}">${t}<span>${d}</span></div>`).join('')}
  </div>
</div>
${cap('primitive.color.slate · the number in each chip is its contrast on chrome (surface.panel)', 'click a chip to copy')}`;

    const chainRow = (prim, semPath, useHtml, note) => {
      const p = tok(prim), s = tok(semPath);
      const pv = p ? p.shown : ''; const isCol = /^#/.test(pv);
      return `<div class="c"><div class="row">${isCol ? sw(pv) : ''}${tn(prim)}</div><small>${esc(pv)}</small></div><div class="ar"></div>
        <div class="c"><div class="row">${tn(semPath)}</div><small>${note}</small></div><div class="ar"></div>
        <div class="c use">${useHtml}</div>`;
    };
    const chain = `
<div class="chain">
  <div class="hd">Primitive · what it is</div><div></div><div class="hd">Role · what it’s for</div><div></div><div class="hd">Part · where you see it</div>
  ${chainRow('primitive.color.slate.750', 'color.ink.muted', `<span style="font:var(--type-weight-bold) var(--type-size-label)/1 var(--type-family);letter-spacing:var(--type-tracking-wide);text-transform:uppercase;color:var(--color-ink-muted)">Stage 1 · Extraction</span><span style="font:var(--type-size-label)/1 var(--type-family);color:var(--color-ink-muted)">drives the shot list</span>`, 'labels, hints, counts')}
  ${chainRow('primitive.color.cherry.500', 'color.brand.cherry', `<span class="pill cmp armed" style="height:34px">${cherry(14)} Compile <span class="ct">3</span></span>`, 'the action, and focus')}
  ${chainRow('primitive.color.pin.type.hue', 'color.pin.type.hue', `<span style="line-height:0">${pin('type', 30)}</span>`, 'the Type pin’s head')}
  ${chainRow('primitive.color.navy.shadow', 'shadow.polaroid', `<span style="display:block;width:58px;height:66px;background:var(--color-surface-polaroid);border-radius:var(--polaroid-radius);box-shadow:var(--shadow-polaroid);padding:6px 6px 16px"><span style="display:block;height:100%;background:var(--color-surface-panel-soft)"></span></span>`, 'what a polaroid throws')}
  ${chainRow('primitive.duration.140', 'motion.quick', `<button type="button" class="chp" aria-pressed="false" onclick="this.setAttribute('aria-pressed',this.getAttribute('aria-pressed')==='true'?'false':'true')">Press me</button>`, 'hover and colour changes')}
</div>
<p class="note">Components only ever reach the middle column. A part asks for <b>ink.muted</b>; which grey that is gets decided once, on the left.</p>`;

    const roles = `<table class="spec roles"><thead><tr><th>Role</th><th></th><th>Use it for</th><th class="hide-s">Don’t</th></tr></thead><tbody>
      ${ROLES.map(([p, u, d]) => { const t = tok(p); return `<tr><td>${tn(p)}<div style="margin-top:3px">${val(t ? t.shown : '')}</div></td><td>${sw(t ? t.shown : '')}</td><td>${u}</td><td class="dn hide-s">${d}</td></tr>`; }).join('')}
    </tbody></table>`;

    const vs = `
<div class="vs">
  <div class="side"><div class="top"><span class="pill cmp armed" style="height:36px">${cherry(14)} Compile <span class="ct">12</span></span><span class="tab" aria-pressed="false" style="outline:2px solid var(--color-focus);outline-offset:2px;background:var(--color-surface-panel)">Focus</span></div>
    <div class="bot"><b>Brand cherry</b> ${val(cv('color-brand-cherry'))}<br>From the logo file. Compile, the pressed chip, the lit cherries, every focus ring. Chrome, so it is never a pin.</div></div>
  <div class="side"><div class="top"><span style="line-height:0">${pin('color', 40)}</span><span style="line-height:0">${pin('color', 28, { selected: true })}</span></div>
    <div class="bot"><b>Color pin red</b> ${val(cv('color-pin-color-hue'))}<br>Warmer and a touch lighter, with its own shade. Close enough to belong, far enough that a ring never reads as a pin. <span class="lbl" style="margin-left:4px">D-027 · D-048c</span></div></div>
</div>`;

    const hues = `<div class="pinhues">${MZ.PIN_TYPES.map((t) => {
      const r = contrast(t.color, cv('color-surface-polaroid'));
      return `<div class="pinhue" id="hue-${t.id}"><div class="pg">${pin(t.id, 34)}</div><b>${esc(t.label)}</b>
        <div class="pair"><button type="button" class="cp" style="background:${t.color}" data-copy="${t.color}" data-label="color.pin.${t.id}.hue · ${t.color}" title="hue ${t.color}"></button><button type="button" class="cp" style="background:${t.shade}" data-copy="${t.shade}" data-label="color.pin.${t.id}.shade · ${t.shade}" title="shade ${t.shade}"></button></div>
        <span class="gl" style="background:${t.color}">${MZ.icon(t.icon, 12, 2.6)}</span>
        <div class="hxs">${t.color}<br>${t.shade}<br>${r.toFixed(2)}:1 on paper</div></div>`; }).join('')}</div>
      <p class="note">Each head is a radial gradient from the hue into its shade, with one tight white highlight. Format and Subject can’t reach 3:1 on white by fill alone; no yellow or mid-green can. A pin isn’t read by its fill: it’s read by the shadow, the hole and the highlight, which are the same on all seven. The fill’s only job is to differ from the other six. <span class="lbl">D-021a · D-029 · D-048e</span></p>`;

    const W = [
      ['color.wash.scrim', 'Behind the compile and boards cards.', 'background:var(--color-wash-scrim)'],
      ['color.wash.shelf', 'The tray shelf, 80% of slate.350.', 'background:var(--color-wash-shelf)'],
      ['color.wash.cherryLine', 'The shelf’s dashed border.', 'border:2px dashed var(--color-wash-cherry-line);background:transparent'],
      ['color.wash.cherryHover', 'A dashed add-tile under a dragged file.', 'background:var(--color-wash-cherry-hover);border:1.5px dashed var(--color-brand-cherry)'],
      ['color.wash.cherryTrack', 'The tray’s position hairline.', 'top:auto;height:4px;bottom:14px;border-radius:2px;background:var(--color-wash-cherry-track)'],
      ['color.wash.onCherry', 'The count pill on the armed Compile pill.', 'background:var(--color-wash-on-cherry)', true],
    ];
    const washes = `<div class="washes">${W.map(([p, d, st, onC]) => `<div class="wash"><div class="w${onC ? ' on-cherry' : ''}"><i style="${st}"></i></div><div class="m">${tn(p)}<small>${d}</small></div></div>`).join('')}</div>`;

    const html = viewHead({ group: 'Foundations', title: 'Colour', lede: 'A cool slate ramp for the chrome, one red for action, seven hues for the pins, and one navy that every shadow is drawn in.', src: ['primitive.color.* → <b>color.*</b>', 'D-020 · D-027 · D-029'] })
      + sec('ramp', 'The slate ramp', 'Thirteen steps, light to dark, and what each one is for. The rulers mark where the ramp becomes readable on chrome.', ramp)
      + sec('chain', 'Value, role, part', 'Three layers between a hex code and the thing you see. Each row is live.', chain)
      + sec('roles', 'Roles', 'What a component is allowed to ask for, and when not to.', roles)
      + sec('cherry', 'Brand cherry is not a pin', 'Two reds that sit near each other on purpose.', vs)
      + sec('pins', 'The seven pin hues', 'A budget, not a palette: an eighth hue would start to collide at 24px.', hues)
      + sec('washes', 'Washes', 'Colour at a strength, for the things that aren’t shadows.', washes);
    return { html, mount(el) {
      // hovering a ramp chip lifts the role it names in the table below
      $$('.st', el).forEach((st) => st.addEventListener('pointerenter', () => st.classList.add('hot')));
      $$('.st', el).forEach((st) => st.addEventListener('pointerleave', () => st.classList.remove('hot')));
    } };
  }

  /* ------------------------------------------------------------------ contrast */
  function vContrast() {
    const P = pairs();
    const st = (p) => (contrast(p.fgv, p.bgv) >= need(p.kind) ? 'pass' : p.ex ? 'exempt' : 'miss');
    const n = { pass: 0, exempt: 0, miss: 0 }; P.forEach((p) => { n[st(p)] += 1; });
    const row = (p) => {
      const r = contrast(p.fgv, p.bgv), s = st(p);
      const smp = p.kind === 'ui' ? `<span class="ring" style="box-shadow:0 0 0 2px ${p.fgv}"></span>` : 'Aa';
      return `<tr data-st="${s}"><td><b>${esc(p.what)}</b>${p.note ? `<span class="why">${esc(p.note)}</span>` : ''}${p.ex ? `<span class="why ex">${esc(p.ex)}</span>` : ''}</td>
        <td class="hide-s">${tn(p.fg)} <span class="lbl" style="letter-spacing:0">on</span> ${tn(p.bg)}</td>
        <td><span class="sample" style="background:${p.bgv};color:${p.fgv};font-size:${p.kind === 'large' ? 18 : 13}px">${smp}</span></td>
        <td><span class="ratio">${r.toFixed(2)}:1</span><div class="meter" style="margin-top:6px"><i class="${s === 'pass' ? '' : s === 'exempt' ? 'ex' : 'bad'}" style="width:${Math.min(100, (r / 21) * 100)}%"></i></div></td>
        <td class="hide-s"><span class="lbl" style="letter-spacing:.06em">${p.kind === 'text' ? '4.5 · text' : p.kind === 'large' ? '3 · large text' : '3 · UI'}</span></td>
        <td><span class="${s === 'pass' ? 'pass' : s === 'exempt' ? 'exempt' : 'fail'}">${s === 'pass' ? 'passes' : s === 'exempt' ? 'exempt' : 'misses'}</span></td></tr>`;
    };
    const heads = MZ.PIN_TYPES.map((t) => {
      const on = [cv('color-surface-polaroid'), cv('color-board-bg'), cv('color-shadow')].map((b) => contrast(t.color, b));
      return `<tr><td><span style="display:inline-flex;align-items:center;gap:8px">${sw(t.color)}<b>${esc(t.label)}</b></span></td>${on.map((r) => `<td class="ratio" style="color:${r >= 3 ? 'var(--color-ink-strong)' : 'var(--color-brand-cherry)'}">${r.toFixed(2)}:1</td>`).join('')}</tr>`;
    }).join('');
    const html = viewHead({ group: 'Foundations', title: 'Contrast', lede: 'Every pairing the app actually draws, measured against WCAG 2 when this page loads. Text needs 4.5:1, or 3:1 when it’s large; a focus ring or other UI mark needs 3:1.', src: ['computed live from tokens.css'] })
      + `<div class="summary"><div class="s"><b>${n.pass}</b><span>of ${P.length} pairings pass</span></div><div class="s"><b>${n.exempt}</b><span>exempt, and why</span></div><div class="s"><b>${n.miss}</b><span>miss, listed below</span></div><div class="s"><b>${contrast(cv('color-ink-strong'), cv('color-surface-panel')).toFixed(1)}:1</b><span>strong ink on chrome</span></div></div>`
      + sec('pairs', 'Pairings in use', '', `<div class="cfilter"><div class="seg" id="cf"><button type="button" data-f="all" aria-pressed="true">All</button><button type="button" data-f="pass" aria-pressed="false">Passing</button><button type="button" data-f="exempt" aria-pressed="false">Exempt</button><button type="button" data-f="miss" aria-pressed="false">Missing</button></div></div>
        <div class="fig" style="padding:14px 18px"><table class="spec ctable"><thead><tr><th>Where</th><th class="hide-s">Pair</th><th>Sample</th><th>Ratio</th><th class="hide-s">Needs</th><th></th></tr></thead><tbody id="ct">${P.map(row).join('')}</tbody></table></div>
        <p class="note">The misses are kept visible rather than tuned away in private, and an exemption is only claimed where WCAG names one. Muted ink used to be the miss that mattered, because it carries the small labels and hints. It was split in two: text moved to a darker grey that passes everywhere, and the old grey stayed on icon-only buttons, where the bar is 3:1. What still misses is faint ink, which only ever marks something absent or placeholder. <span class="lbl">D-049</span></p>`)
      + sec('heads', 'Pin heads', 'Non-text, so the bar is 3:1. Read with the note on the colour page: the fill isn’t how a pin is found.', `<div class="fig" style="padding:14px 18px"><table class="spec ctable"><thead><tr><th>Pin</th><th>On a polaroid</th><th>On the board</th><th>On the shadow navy</th></tr></thead><tbody>${heads}</tbody></table></div>`);
    return { html, mount(el) {
      const seg = $('#cf', el);
      seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return;
        $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        $$('#ct tr', el).forEach((tr) => { tr.style.display = b.dataset.f === 'all' || tr.dataset.st === b.dataset.f ? '' : 'none'; }); });
    } };
  }

  /* ------------------------------------------------------------------ type */
  const TYPE_ROLES = [
    ['display', 'What are you making?', 'medium', 'The start screen’s question', 'tight'],
    ['title', 'Before you compile', 'bold', 'Card headings'],
    ['lead', 'The board needs to know what it’s for.', 'medium', 'The start screen’s copy and field; the brief’s h1'],
    ['action', 'Compile', 'bold', 'The Compile pill, and nothing else'],
    ['ui', 'Six quick questions, all optional.', 'medium', 'Buttons, tabs, inputs, card copy'],
    ['reading', 'Reference imagery runs warm, so the surface is cool.', 'medium', 'The brief, chips, status lines'],
    ['body', '5 pins read in 2 calls · 1,204 tokens', 'medium', 'Running text in the rail'],
    ['meta', '2 images · 4 pins · brief', 'medium', 'Meta lines, code, the smallest buttons'],
    ['label', 'Stage 1 — extraction', 'bold', 'Uppercase labels, hints, counts', 'wide', true],
    ['caption', 'asa-cap-front.png', 'medium', 'A filename under a tile'],
    ['micro', 'On the table', 'bold', 'Uppercase badges', 'wide', true],
  ];
  function vType() {
    const rows = TYPE_ROLES.map(([r, s, w, u, tr, up]) => `
      <div>${tn('type.size.' + r)}</div>
      <div class="smp" style="font-size:var(--type-size-${r});font-weight:var(--type-weight-${w});${tr ? `letter-spacing:var(--type-tracking-${tr});` : ''}${up ? 'text-transform:uppercase;' : ''}">${esc(s)}</div>
      <div class="px">${esc(cv('type-size-' + r))} · ${esc(cv('type-weight-' + w))}</div>
      <div class="use">${esc(u)}</div>`).join('');
    const fam = cv('type-family');
    const html = viewHead({ group: 'Foundations', title: 'Type', lede: 'The system sans — SF Pro on a Mac — at eleven sizes and two weights. The chrome is dense, so the half-point sizes are real decisions: 12 and 12.5 do different jobs.', src: ['type.*', 'D-048d'] })
      + sec('family', 'Family', '', `<div class="fig"><div class="fam"><div class="ag">Aa</div><div><div class="lbl" style="margin-bottom:6px">${tn('type.family')}</div><div class="stack">${esc(fam)}</div>
          <p class="note" style="margin-top:10px">The Maraschino wordmark isn’t type. It’s pixel artwork lifted from the logo file and never redrawn.</p><div style="color:var(--color-brand-cherry);margin-top:8px">${wordmark(20)}</div></div></div></div>`)
      + sec('sizes', 'Sizes, by job', 'Named for what they carry, so “make the labels smaller” is one change.', `<div class="fig"><div class="tspec"><div class="h">Token</div><div class="h">Specimen</div><div class="h" style="text-align:right">px · weight</div><div class="h">Carries</div>${rows}</div></div>`)
      + sec('scales', 'Weight, tracking, leading', '', `<div class="tscales">
          <div class="fig"><div class="lbl" style="margin-bottom:8px">Weight</div>${['medium', 'bold'].map((w) => `<div class="row" style="font-weight:var(--type-weight-${w});font-size:17px"><span>${w}</span>${tn('type.weight.' + w, cv('type-weight-' + w))}</div>`).join('')}<p class="note">Two. The 650 and 660 on the start screen folded into these.</p></div>
          <div class="fig"><div class="lbl" style="margin-bottom:8px">Tracking</div>${['tight', 'hair', 'fine', 'wide', 'wider', 'widest'].map((k) => `<div class="row" style="letter-spacing:var(--type-tracking-${k});font-size:13px;${['wide', 'wider', 'widest'].includes(k) ? 'text-transform:uppercase;font-weight:700;font-size:11px' : ''}"><span>${k}</span>${tn('type.tracking.' + k, cv('type-tracking-' + k))}</div>`).join('')}<p class="note">Tight for the display size; wide and up for uppercase, which needs air.</p></div>
          <div class="fig"><div class="lbl" style="margin-bottom:8px">Leading</div>${['tight', 'snug', 'base', 'relaxed', 'loose'].map((k) => `<div class="row" style="font-size:13px"><span>${k}</span>${tn('type.leading.' + k, cv('type-leading-' + k))}</div>`).join('')}<p class="note">1.45 for fields and the rail, 1.5 for card copy, 1.55 for the brief.</p></div>
        </div>`);
    return { html };
  }

  /* ------------------------------------------------------------------ space & radius */
  const RADII = [['card', 'cards, the compile rail'], ['shelf', 'the tray shelf'], ['rail', 'the pin rail'], ['tile', 'board tiles, start cards'], ['popover', 'the pin note'],
    ['thumb', 'tray thumbnails'], ['field', 'fields, product tiles'], ['control', 'rail buttons, zoom badge'], ['chip', 'pick tiles, the note field'], ['tag', 'the rail tag, a board name'],
    ['crop', 'crops, code blocks'], ['badge', 'the 100% button'], ['code', 'inline code'], ['swatch', 'a hex swatch'], ['track', 'the position hairline'], ['pill', 'every button and chip']];
  function vSpace() {
    const sp = Object.keys(tokOr('space')).map(Number).sort((a, b) => a - b);
    const scale = `<div class="fig"><div class="scale">${sp.map((k) => `<button type="button" class="s cp" data-copy="var(--space-${k})" data-label="space.${k} · ${k}px"><i style="width:${k * 2}px;height:${k * 2}px"></i><span>${k}</span></button>`).join('')}</div></div>
      ${cap('tokens.space · drawn at 2×', 'click to copy')}
      <p class="note">One-pixel steps to 12, then two-pixel steps to 26. The scale is keyed by value, so a token reads as its size, and in the app <code>sp(9, 16)</code> writes <code>"9px 16px"</code> while <code>sp(13)</code> won’t compile.</p>`;
    /* the inset, drawn at true size in an 880 × 495 window and scaled to fit */
    const inset = `<div class="inset-ctl"><div class="seg" id="in-seg"><button type="button" data-o="0" aria-pressed="true">Compile rail closed</button><button type="button" data-o="1" aria-pressed="false">Open</button></div></div>
      <div class="fig board inset-fig"><div class="inset" id="inset-box"><div class="ist" id="ist" aria-hidden="true">
        ${[['j43', 150, 112, 104, -2.5, 'subject'], ['j15', 300, 96, 150, 1.5, ''], ['j42', 262, 262, 156, -1, 'format'], ['j56', 470, 214, 118, 2, 'color']].map(([id, x, y, w, r, pt]) => `<div class="i-pol" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${r}deg)"><img src="${imgById(id).thumb}" alt="" loading="lazy"><i></i>${pt ? `<span class="i-pin">${pin(pt, 22)}</span>` : ''}</div>`).join('')}
        <div class="i-top" id="i-top"><span class="pill wm">${wordmark(21)}</span><span class="pill tr">${trayIcon(17)}</span><span class="pill cmp armed" style="margin-left:6px">${cherry(15)} Compile <span class="ct">3</span></span></div>
        <div class="i-rail" id="i-rail">${MZ.PIN_TYPES.map((t) => `<span><i style="background:${t.color}"></i></span>`).join('')}</div>
        <div class="zb i-zb" id="i-zb"><span class="fit">Fit</span><span class="pct">100%</span></div>
        <div class="i-cr" id="i-cr"><div class="hd"><span style="color:var(--color-brand-cherry);display:inline-flex">${cherry(18)}</span><b>Compile</b></div>
          <div class="tabs"><span class="tab" aria-pressed="true">Brief</span><span class="tab">Extraction</span><span class="tab">Stills</span></div>
          <i style="width:88%"></i><i style="width:72%"></i><i style="width:80%"></i><i style="width:54%"></i><i class="gap" style="width:66%"></i><i style="width:84%"></i><i style="width:60%"></i></div>
        <svg class="i-dims" id="i-dims" viewBox="0 0 880 495" width="880" height="495"></svg>
      </div></div></div>
      ${cap('tokens.inset · 16px, drawn to scale in an 880 × 495 window', 'the compile rail’s top is inset + topbar.pillH + inset = 70')}`;
    const radii = `<div class="radii">${RADII.map(([k, u]) => `<button type="button" class="r cp" data-copy="var(--radius-${k})" data-label="radius.${k} · ${cv('radius-' + k)}"><i style="border-radius:var(--radius-${k})"></i><b>${k} · ${esc(cv('radius-' + k).replace('px', ''))}</b><small>${u}</small></button>`).join('')}</div>`;
    const nest = `<div class="fig board"><div class="nest"><div class="l1"><div class="tag">radius.card · 18</div>
        <div class="l2" style="margin-top:8px"><div class="l3"></div><div><div class="tag">radius.field · 10</div><div class="tag" style="color:var(--color-ink-muted)">radius.chip · 8 inside it</div></div><span class="l4">Compile</span></div>
        <div class="tag" style="margin-top:8px;text-align:right">radius.pill</div></div></div></div>
      <p class="note">Radii step down as they nest — card, field, chip — so an inner corner never looks rounder than the one holding it. An even scale from 4 up; the one odd step is the polaroid’s 3, measured off the frame. <span class="lbl">D-048d</span></p>`;
    const html = viewHead({ group: 'Foundations', title: 'Space & radius', lede: 'A dense spacing scale for dense chrome, one inset for everything that floats on the board, and radii named for what wears them.', src: ['space.* · inset · radius.*'] })
      + sec('space', 'Space', '', scale) + sec('inset', 'The inset', 'Everything that floats on the board keeps the same 16px off the edge, and the compile rail stacks under the top bar by the same step.', inset) + sec('radius', 'Radius', 'Click one to copy its custom property.', radii) + sec('nesting', 'Nesting', '', nest);
    return { html, mount(el) {
      const W = 880, H = 495, wrap = $("#inset-box", el), st = $('#ist', el), svg = $('#i-dims', el);
      const I = Number.parseFloat(cv('inset')) || 16, PH = Number.parseFloat(cv('topbar-pill-h')) || 38;
      let k = 1, open = false;
      const box = (n) => { let x = 0, y = 0, m = n; while (m && m !== st) { x += m.offsetLeft; y += m.offsetTop; m = m.offsetParent; } return { x, y, w: n.offsetWidth, h: n.offsetHeight }; };
      /* a dimension: a line with end ticks, a label, optional dashed extension lines */
      const dim = (x1, y1, x2, y2, label, lx, ly, anchor, cls) => {
        const f = Math.max(13, 10.5 / k), t = 5 / Math.min(1, k), sw = Math.max(1.25, 1.05 / k);
        const v = x1 === x2, tk = v ? `M${x1 - t} ${y1}H${x1 + t}M${x2 - t} ${y2}H${x2 + t}` : `M${x1} ${y1 - t}V${y1 + t}M${x2} ${y2 - t}V${y2 + t}`;
        return `<g class="${cls || ''}"><path d="M${x1} ${y1}L${x2} ${y2}${tk}" stroke-width="${sw}"/><text x="${lx}" y="${ly}" font-size="${f}" text-anchor="${anchor || 'middle'}" dominant-baseline="central" stroke-width="${f * 0.32}">${label}</text></g>`;
      };
      const ext = (x1, y1, x2, y2, cls) => `<path class="ext ${cls || ''}" d="M${x1} ${y1}L${x2} ${y2}" stroke-width="${Math.max(1, 0.9 / k)}" stroke-dasharray="${3 / Math.min(1, k)} ${3 / Math.min(1, k)}"/>`;
      const draw = () => {
        const bar = box($('#i-top', el).lastElementChild), wm = box($('#i-top', el).firstElementChild), rail = box($('#i-rail', el)), zb = box($('#i-zb', el)), cr = box($('#i-cr', el));
        const barR = bar.x + bar.w, g = 22;
        let o = '';
        /* top bar: 16 down from the top edge */
        o += ext(wm.x - g - 4, I, wm.x, I) + dim(wm.x - g, 0, wm.x - g, I, '16', wm.x - g - 7, I / 2, 'end');
        /* rail: 16 in from the left edge */
        o += ext(rail.x, rail.y - g - 4, rail.x, rail.y) + dim(0, rail.y - g, rail.x, rail.y - g, '16', rail.x + 7, rail.y - g, 'start');
        /* zoom badge, when the compile rail is closed */
        o += dim(zb.x + zb.w, zb.y + zb.h / 2, W, zb.y + zb.h / 2, '16', W - I / 2, zb.y - 10, 'middle', 'c-closed')
          + dim(zb.x + zb.w / 2, zb.y + zb.h, zb.x + zb.w / 2, H, '16', zb.x + zb.w / 2 - 7, H - I / 2, 'end', 'c-closed');
        /* compile rail, when open: a chain of inset + pill + inset down the right */
        const cx = cr.x + cr.w - 36;
        o += `<g class="c-open">${ext(barR + 4, I, cx + 4, I)}${ext(barR + 4, I + PH, cx + 4, I + PH)}`
          + dim(cx, 0, cx, I, '16', cx - 7, I / 2, 'end') + dim(cx, I, cx, I + PH, `${PH} · pill`, cx - 7, I + PH / 2, 'end') + dim(cx, I + PH, cx, cr.y, '16', cx - 7, I + PH + (cr.y - I - PH) / 2, 'end')
          + dim(cr.x + cr.w, cr.y + 90, W, cr.y + 90, '16', W - I / 2, cr.y + 78, 'middle')
          + dim(cr.x + cr.w / 2, cr.y + cr.h, cr.x + cr.w / 2, H, '16', cr.x + cr.w / 2 - 7, H - I / 2, 'end')
          + dim(cr.x, cr.y + cr.h - 40, cr.x + cr.w, cr.y + cr.h - 40, `${cr.w}`, cr.x + cr.w / 2, cr.y + cr.h - 52, 'middle', 'inner') + '</g>';
        svg.innerHTML = o;
      };
      /* below ~545px the window stops shrinking and the figure scrolls sideways instead */
      const fig = wrap.parentElement;
      const fit = () => { k = Math.max(0.62, fig.clientWidth / W); wrap.style.width = `${W * k}px`; st.style.transform = `scale(${k})`; draw(); };
      const set = (v) => { open = v; st.classList.toggle('open', open); $$('#in-seg button', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.o === (open ? '1' : '0'))));
        if (fig.scrollWidth > fig.clientWidth) fig.scrollTo({ left: open ? fig.scrollWidth : 0, behavior: reduce() ? 'auto' : 'smooth' }); };
      $('#in-seg', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) set(b.dataset.o === '1'); });
      const ro = new ResizeObserver(fit); ro.observe(fig); fit();
      return () => ro.disconnect();
    } };
  }
  const tokOr = (group) => { const o = {}; TK.semantic.filter((t) => t.path.startsWith(group + '.')).forEach((t) => { o[t.path.slice(group.length + 1)] = t; }); return o; };

  /* ------------------------------------------------------------------ elevation & layers */
  const SHADOWS = [['restFaint', 'a shelved board tile'], ['rest', 'a small × button'], ['restSoft', 'a start card'], ['thumb', 'a tray thumbnail'], ['snap', 'a polaroid in a board tile'],
    ['trayLead', 'the tray’s + button'], ['float', 'the zoom badge'], ['lift', 'a tile under the pointer'], ['polaroid', 'a polaroid on the board'], ['rail', 'the pin rail'],
    ['pill', 'a top-bar pill'], ['pillLift', 'the wordmark under the pointer'], ['pillCherry', 'Compile, armed'], ['cherryButton', 'a cherry button'], ['popover', 'the pin note'],
    ['panel', 'the compile rail'], ['card', 'a card over the scrim']];
  const ZL = [['canvas', 'The board', 'the dot grid and the polaroids'], ['trayLead', 'Tray + button', 'inside the shelf, over the strip'], ['pin', 'Pins', 'a working pin lifts to 20'],
    ['popover', 'The note', 'opens where you clicked'], ['rail', 'The rail', 'and an image being lassoed'], ['panel', 'The compile rail', 'and the zoom badge'], ['topbar', 'The top bar', 'wordmark, tray, Compile'],
    ['pinMenu', 'The pin menu', 'screen-scale, in a portal'], ['card', 'Cards', 'compile and boards, over a scrim'], ['gate', 'The start screen', 'over everything']];
  function vElevation() {
    const cards = `<div class="fig board"><div class="elev">${SHADOWS.map(([k, u]) => `<div class="e"><button type="button" class="card cp" style="width:100%;box-shadow:var(--shadow-${kebab(k)})" data-copy="var(--shadow-${kebab(k)})" data-label="shadow.${k}"></button><b>${k}</b><small>${u}</small></div>`).join('')}</div></div>
      <p class="note">Every one is <code>color.shadow</code> — one navy — at a different offset, blur and strength. They’re named for what casts them, because the same numbers on a different object would be a different decision. The two warm ones are the Compile pill and the cherry button, which glow in their own red.</p>`;
    const zs = ZL.map(([k]) => Number(cv('z-' + kebab(k))));
    const stack = `<div class="fig"><div class="stackwrap"><div class="stack3d"><div class="scene" id="scene">
        ${ZL.map(([k, t], i) => `<div class="pl${i === 0 ? ' base' : ''}" data-k="${k}" style="--z:${i}"><span><b>${zs[i]}</b> ${esc(t)}</span></div>`).join('')}
      </div></div>
      <ul class="zlist" id="zlist">${ZL.slice().reverse().map(([k, t, d]) => `<li data-k="${k}"><span class="z">${cv('z-' + kebab(k))}</span><div><b>${esc(t)}</b><small>${esc(d)} · ${tn('z.' + k)}</small></div></li>`).join('')}</ul></div></div>`;
    const html = viewHead({ group: 'Foundations', title: 'Elevation & layers', lede: 'Seventeen shadows drawn in one navy, and a fixed ladder of paint order so a new surface has to be placed on it on purpose.', src: ['shadow.* · z.*', 'D-030 · D-048b'] })
      + sec('shadows', 'Shadows', 'On the board, where they live. Click one to copy it.', cards)
      + sec('layers', 'Paint order', 'Low to high, spaced evenly so each layer is readable; the numbers are the real z-index. Hover a layer.', stack);
    return { html, mount(el) {
      const hot = (k) => { $$('.pl', el).forEach((p) => p.classList.toggle('hot', p.dataset.k === k)); $$('#zlist li', el).forEach((li) => li.classList.toggle('hot', li.dataset.k === k)); };
      $$('#zlist li, .pl', el).forEach((n) => { n.addEventListener('pointerenter', () => hot(n.dataset.k)); n.addEventListener('pointerleave', () => hot(null)); });
    } };
  }

  /* ------------------------------------------------------------------ motion */
  const DURS = [['press', 'the snap of a press'], ['quick', 'hover, colour, fill'], ['tray', 'the tray’s + and arrows'], ['base', 'lifts, layout, the note’s entrance'], ['fade', 'the position hairline'],
    ['slow', 'panels moving'], ['progress', 'a progress bar'], ['widen', 'the compile card widening'], ['flash', 'the returned-image pulse'], ['slide', 'one trip of the busy bar']];
  const EASES = [['out', 'the default: fast out, soft landing', 'lifts, fades, the top-bar pills'], ['inOut', 'even in and out', 'kept for things that travel both ways'],
    ['spring', 'the house overshoot', 'pins, the rail tag, ×s, the note'], ['springPop', 'a bubble swelling under the pointer', 'pin menu hover'], ['springOpen', 'a real bounce on landing', 'the pin menu fanning out'],
    ['gooClose', 'quick and plain', 'the pin menu retracting'], ['widen', 'for a width that must not wobble', 'the compile card'], ['slide', 'symmetric, for a loop', 'the busy bar']];
  function curveSVG(bz, id) {
    const [x1, y1, x2, y2] = bz; const W = 200, H = 150, P = 20, ymin = -0.2, ymax = 1.3;
    const X = (x) => P + x * (W - 2 * P), Y = (y) => H - P - ((y - ymin) / (ymax - ymin)) * (H - 2 * P);
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(0)}" stroke="var(--color-surface-line)"/><line x1="${X(0)}" y1="${Y(1)}" x2="${X(1)}" y2="${Y(1)}" stroke="var(--color-surface-line)" stroke-dasharray="3 3"/>
      <line x1="${X(0)}" y1="${Y(ymin)}" x2="${X(0)}" y2="${Y(ymax)}" stroke="var(--color-surface-line)"/>
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(x1)}" y2="${Y(y1)}" stroke="var(--color-ink-faint)" stroke-width="1"/><line x1="${X(1)}" y1="${Y(1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="var(--color-ink-faint)" stroke-width="1"/>
      <circle cx="${X(x1)}" cy="${Y(y1)}" r="3" fill="var(--color-surface-panel)" stroke="var(--color-ink-muted)"/><circle cx="${X(x2)}" cy="${Y(y2)}" r="3" fill="var(--color-surface-panel)" stroke="var(--color-ink-muted)"/>
      <path d="M${X(0)},${Y(0)} C${X(x1)},${Y(y1)} ${X(x2)},${Y(y2)} ${X(1)},${Y(1)}" fill="none" stroke="var(--color-brand-cherry)" stroke-width="2.4" stroke-linecap="round"/>
      <line class="ph" x1="${X(0)}" x2="${X(0)}" y1="${Y(ymin)}" y2="${Y(ymax)}" stroke="var(--color-ink-strong)" stroke-width="1" opacity="0"/>
      <circle class="pt" cx="${X(0)}" cy="${Y(0)}" r="4.5" fill="var(--color-ink-strong)" opacity="0"/>
      <text x="${X(1)}" y="${H - 4}" text-anchor="end" font-size="9" fill="var(--color-ink-muted)" font-family="var(--ds-mono)">time</text>
      <text x="${P - 6}" y="${Y(1) + 3}" text-anchor="end" font-size="9" fill="var(--color-ink-muted)" font-family="var(--ds-mono)">1</text></svg>`;
  }
  function springSVG(pts) {
    const W = 260, H = 130, P = 18, ymax = 1.3;
    const X = (t) => P + (t / 1.2) * (W - 2 * P), Y = (y) => H - P - (y / ymax) * (H - 2 * P);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="${X(0)}" y1="${Y(1)}" x2="${X(1.2)}" y2="${Y(1)}" stroke="var(--color-surface-line)" stroke-dasharray="3 3"/>
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(1.2)}" y2="${Y(0)}" stroke="var(--color-surface-line)"/>
      ${[0.2, 0.4, 0.6, 0.8, 1.0].map((t) => `<text x="${X(t)}" y="${H - 3}" text-anchor="middle" font-size="8.5" fill="var(--color-ink-muted)" font-family="var(--ds-mono)">${t}s</text>`).join('')}
      <path d="${d}" fill="none" stroke="var(--color-brand-cherry)" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
  }
  function vMotion() {
    const ms = (k) => parseFloat(cv('motion-' + kebab(k)));
    const maxMs = Math.max(...DURS.map(([k]) => ms(k)));
    const durs = `<div class="fig"><div class="durs">${DURS.map(([k, u]) => `<button type="button" class="dur" data-ms="${ms(k)}" title="Play ${ms(k)}ms"><span class="n">motion.${k}</span><span class="ms">${ms(k)}ms</span>
        <span class="bar"><span class="len" style="width:${(ms(k) / maxMs) * 100}%"></span><span class="use">${esc(u)}</span><span class="ball"></span></span></button>`).join('')}</div></div>
      ${cap('click a row to run it at its real length', 'motion.*')}`;
    const curves = `<div class="curves">${EASES.map(([k, what, use]) => { const bz = parseBez(cv('motion-ease-' + kebab(k)));
      return `<div class="curve" data-bz="${bz.join(',')}"><div class="top">${tn('motion.ease.' + k, 'ease.' + k)}<button type="button" class="play" aria-label="Play ease.${k}">${ic('play', 11)} Play</button></div>
        ${curveSVG(bz)}<div class="track"><i></i></div><small><b style="color:var(--color-ink-strong)">${esc(what)}.</b> ${esc(use)}.</small></div>`; }).join('')}</div>
      <p class="note">Shown over a full second so the shape is visible; in the app they run at the durations above. The built-in CSS easings are too weak for UI, so none of them is used.</p>`;
    const SP = [['card', 'The compile and boards cards', { visualDuration: +cv('motion-springs-card-visual-duration'), bounce: +cv('motion-springs-card-bounce') }],
      ['panel', 'The compile rail', { visualDuration: +cv('motion-springs-panel-visual-duration'), bounce: +cv('motion-springs-panel-bounce') }],
      ['dock', 'Tray magnification', { duration: +cv('motion-springs-dock-duration'), bounce: +cv('motion-springs-dock-bounce') }]];
    const springs = `<div class="springs">${SP.map(([k, u, o]) => { const s = springFrom(o);
      return `<div class="curve" data-spring="${k}"><div class="top"><span class="tn">springs.${k}</span><button type="button" class="play" aria-label="Play springs.${k}">${ic('play', 11)} Play</button></div>${springSVG(s.pts)}
        <div class="track"><i></i></div><small><b style="color:var(--color-ink-strong)">${esc(u)}.</b> ${o.visualDuration != null ? `visualDuration ${o.visualDuration}s` : `duration ${o.duration}s`}, bounce ${o.bounce}. ${s.peak > 1.01 ? `Overshoots by ${(s.peak * 100 - 100).toFixed(0)}%.` : 'Lands without a visible overshoot.'}</small></div>`; }).join('')}</div>`;
    const html = viewHead({ group: 'Foundations', title: 'Motion', lede: 'Springy and fast, never floaty. Ten durations, eight curves and three springs, each named for what moves on it.', src: ['motion.*', 'D-026 · D-031 · D-048a'] })
      + sec('durations', 'Durations', '', durs)
      + sec('easing', 'Curves', 'Press play to see a dot ride each one.', curves)
      + sec('springs', 'Springs', 'The three physical springs the React side hands to its motion library.', springs)
      + sec('menu-motion', 'The pin menu’s choreography', `The most involved piece of motion in the app has its own page, with a slow-motion switch. <a href="#pin-menu/timeline">Open the pin menu →</a>`, '')
      + sec('reduced', 'Reduced motion', 'Under <code>prefers-reduced-motion</code> every transition and keyframe in the app collapses to nothing, the tray stops magnifying, and the cards appear without their spring.', '');
    return { html, mount(el) {
      const runs = [];
      $$('.dur', el).forEach((b) => b.addEventListener('click', () => {
        const ball = $('.ball', b), bar = $('.bar', b), ms = +b.dataset.ms, W = bar.clientWidth - 18;
        ball.getAnimations().forEach((a) => a.cancel());
        ball.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 1, transform: `translateX(${W}px)` }], { duration: ms, easing: 'linear', fill: 'none' });
      }));
      const ride = (card, f, dur) => {
        const svg = $('svg', card), ph = $('.ph', svg), pt = $('.pt', svg), ball = $('.track i', card), tr = $('.track', card);
        const vb = svg.viewBox.baseVal, P = 20, ymin = -0.2, ymax = 1.3;
        const X = (x) => P + x * (vb.width - 2 * P), Y = (y) => vb.height - P - ((y - ymin) / (ymax - ymin)) * (vb.height - 2 * P);
        const t0 = performance.now(); let raf = 0;
        const step = (now) => { const x = Math.min(1, (now - t0) / dur), y = f(x);
          ph.setAttribute('x1', X(x)); ph.setAttribute('x2', X(x)); ph.setAttribute('opacity', 0.35);
          pt.setAttribute('cx', X(x)); pt.setAttribute('cy', Y(y)); pt.setAttribute('opacity', 1);
          ball.style.transform = `translateX(${y * (tr.clientWidth - 16)}px)`;
          if (x < 1) raf = requestAnimationFrame(step); else setTimeout(() => ph.setAttribute('opacity', 0), 300); };
        raf = requestAnimationFrame(step); runs.push(() => cancelAnimationFrame(raf));
      };
      $$('.curve[data-bz] .play', el).forEach((b) => b.addEventListener('click', () => { const card = b.closest('.curve'); const [a, c, d, e] = card.dataset.bz.split(',').map(Number); ride(card, bezier(a, c, d, e), 1000); }));
      $$('.curve[data-spring] .play', el).forEach((b) => b.addEventListener('click', () => {
        const card = b.closest('.curve'), k = card.dataset.spring; const o = SP.find((s) => s[0] === k)[2]; const s = springFrom(o);
        const tr = $('.track', card), ball = $('.track i', card), t0 = performance.now(); let raf = 0;
        const step = (now) => { const t = (now - t0) / 1000; const p = s.pts.find((q) => q[0] >= t) || s.pts[s.pts.length - 1];
          ball.style.transform = `translateX(${Math.max(0, p[1]) * (tr.clientWidth - 16)}px)`; if (t < 1.2) raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step); runs.push(() => cancelAnimationFrame(raf));
      }));
      return () => runs.forEach((f) => f());
    } };
  }

  /* ================================================================== COMPONENTS */

  /* pin geometry, from Pin.tsx (the same numbers play.js draws with) */
  const G = { VB: 150, HEAD: 42, CX: 58, CY: 40, TIP: { x: 24, y: 122 } };
  G.ENTRY = { x: MZ.PIN_ANCHOR.x * G.VB, y: MZ.PIN_ANCHOR.y * G.VB };
  const castPt = (p, k, sy) => ({ x: p.x + k * (p.y - G.TIP.y), y: G.TIP.y + sy * (p.y - G.TIP.y) });

  /* ------------------------------------------------------------------ pin */
  function vPin() {
    const L = { k: +cv('pin-light-k'), sy: +cv('pin-light-sy') };
    const leg = [
      { n: 1, t: 'Head', d: 'A radial gradient from the type’s hue into its shade. The only saturated thing the app puts on the board.', tok: ['color.pin.subject.hue', 'color.pin.subject.shade'] },
      { n: 2, t: 'Highlight', d: 'One small, tight specular. Full gloss washed the hue out below 32px; flat matte read as a sticker. <span class="lbl">D-021a</span>', tok: ['color.pinParts.specular'] },
      { n: 3, t: 'Shaft', d: 'Neutral steel, not the chrome’s slate. Its end is curved on the same proportion as the hole, so the two lips can’t disagree.', tok: ['color.pinParts.shaft.light', 'color.pinParts.shaft.dark'] },
      { n: 4, t: 'The hole', d: '1.34× the shaft’s width, 0.6 tall, near-black, drawn behind the shaft so the pin goes into the board instead of stopping on it. <span class="lbl">D-030b</span>', tok: ['color.pinParts.hole', 'pin.hole.rx'] },
      { n: 5, t: 'Cast shadow', d: 'The pin’s own silhouette under one light for the whole board, laid back so it recedes. Thirty pins, one lit scene. <span class="lbl">D-030</span>', tok: ['pin.light.k', 'pin.light.sy', 'color.pinParts.shadow'] },
      { n: 6, t: 'Anchor', d: 'A pin is placed by where its shaft meets the board, not by its head. A marker points at something. <span class="lbl">D-030a</span>' },
    ];
    const types = MZ.PIN_TYPES;
    const grid = `<div class="states" style="grid-template-columns:130px repeat(4,minmax(0,1fr))">
      <div class="h"></div><div class="h">Rest</div><div class="h">Working</div><div class="h">Lifted</div><div class="h">Below 0.4×</div>
      ${types.map((t) => `<div class="rh"><span class="sw" style="background:${t.color}"></span>${esc(t.label)}</div>
        <div class="board">${pin(t.id, 30)}</div><div class="board">${pin(t.id, 30, { selected: true })}</div><div class="board"><span style="display:inline-block;line-height:0;transform:scale(1.16)">${pin(t.id, 30, { dragging: true })}</span></div>
        <div class="board"><span class="plain-dot" style="background:${t.color}"></span></div>`).join('')}
    </div>
    <p class="note"><b>Working</b> is a soft white glow painted under the pin while its note is open or a loop is being drawn; a plain click shows nothing, because a click isn’t a claim (D-031e). <b>Lifted</b> is the pin mid-drag: 16% bigger, shadow thrown further under the same light. Below 0.4× zoom a full pin is noise, so it becomes a dot.</p>`;
    const html = viewHead({ group: 'Components', title: 'Pin', lede: 'A glass ball-head pushpin at 24px, leaning right, under one light shared by the whole board. Seven types, one shape.', src: ['Pin.tsx', 'pin.* · color.pin.* · color.pinParts.*', 'D-012a · D-021a · D-030'] })
      + sec('anatomy', 'Anatomy', '', `<div class="fig paper"><div class="anat"><div class="stage board-stage" id="pin-stage" style="min-height:360px;display:grid;place-items:center;align-self:stretch"><span id="pin-big" style="line-height:0;transform:translate(-22px,-8px)">${pin('subject', 180)}</span></div>${legend(leg)}</div></div>`)
      + sec('states', 'States', 'Every type in every state it has.', grid)
      + sec('try', 'Try it', 'The real pin. Hover one for its menu, drag it, or choose “draw around it” and circle something.', `<div class="live" id="pin-live" style="height:300px"></div>${cap('Pin.tsx · PinMenu.tsx · Lasso.tsx', 'a deleted pin comes back after a few seconds')}`)
      + sec('spec', 'Spec', '', `<table class="spec"><tbody>
          <tr><td><b>Size on the board</b></td><td>${tn('pin.size')} ${val(cv('pin-size'))} at zoom 1 — the smallest size where the shaft still reads</td></tr>
          <tr><td><b>Light</b></td><td>${tn('pin.light.k')} ${tn('pin.light.sy')} — one projection for every pin; lifted uses ${tn('pin.lightLifted.k')}</td></tr>
          <tr><td><b>Hole</b></td><td>${tn('pin.hole.rx')} ${tn('pin.hole.ry')} ${tn('pin.hole.opacity')} ${tn('pin.hole.blur')}</td></tr>
          <tr><td><b>Degrades below</b></td><td>${tn('pin.degradeBelowZoom')} ${val(cv('pin-degrade-below-zoom') + '×')}</td></tr>
          <tr><td><b>Drag threshold</b></td><td>4px of travel before a press becomes a drag, carrying the grab offset — opening a note can never nudge the pin</td></tr>
        </tbody></table>`);
    return { html, mount(el) {
      const stage = $('#pin-stage', el), big = $('#pin-big svg', el);
      const at = (vx, vy) => (s) => { const r = big.getBoundingClientRect(), b = s.getBoundingClientRect(), k = r.width / G.VB; return { x: r.left - b.left + vx * k, y: r.top - b.top + vy * k }; };
      const shadowHead = castPt({ x: G.CX, y: G.CY }, L.k, L.sy);
      const off = markers(stage, [
        { n: 1, at: at(G.CX + 22, G.CY + 16) }, { n: 2, at: at(G.CX - G.HEAD * 0.34, G.CY - G.HEAD * 0.40) },
        { n: 3, at: at(41, 88), lead: { dx: -38, dy: -10 } }, { n: 4, at: at(G.ENTRY.x - 3, G.ENTRY.y + 2), lead: { dx: -40, dy: 26 } },
        { n: 5, at: at(shadowHead.x + 8, shadowHead.y) }, { n: 6, at: at(G.ENTRY.x, G.ENTRY.y), lead: { dx: 34, dy: 34 } },
      ], $('.legend', el));
      const host = $('#pin-live', el);
      const b = new MZ.Board(host, { bare: true, pinSize: 40, lassoTTL: 3500, quietLasso: true,
        onRemovePin: (sheet, p) => setTimeout(() => { if (!host.isConnected || sheet.pins.some((q) => q.type === p.type)) return; sheet.pins.push({ id: MZ.uid(), type: p.type, x: p.x, y: p.y, note: '', born: true }); b.sync(sheet); }, 2500) });
      const sheet = b.images[0];
      ['color', 'subject', 'theme', 'avoid'].forEach((t, i) => sheet.pins.push({ id: MZ.uid(), type: t, x: 0.2 + i * 0.2, y: 0.62, note: '' }));
      b.sync(sheet);
      return () => { off(); b.destroy && b.destroy(); };
    } };
  }

  /* ------------------------------------------------------------------ pin menu */
  function vPinMenu() {
    // the menu's own geometry (PinMenu.tsx): box 140×116, head at (70,92), three 28px bubbles on an upward fan
    const O = { x: 70, y: 92 }, FAN = [{ x: -36, y: -22 }, { x: 0, y: -44 }, { x: 36, y: -22 }], R = 14, headR = 12, GAP = 5, lift = headR + GAP;
    const b = (f) => ({ x: O.x + f.x, y: O.y + f.y - lift });
    const B = FAN.map(b);
    const hullPts = (() => { const pts = [{ x: O.x - headR - 9, y: O.y - headR - 1 }, { x: O.x + headR + 9, y: O.y - headR - 1 }];
      B.forEach((c) => { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; pts.push({ x: c.x + Math.cos(a) * (R + 9), y: c.y + Math.sin(a) * (R + 9) }); } });
      pts.sort((p, q) => p.x - q.x || p.y - q.y); const cr = (o, a, c) => (a.x - o.x) * (c.y - o.y) - (a.y - o.y) * (c.x - o.x);
      const lo = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      const up = []; for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      return lo.slice(0, -1).concat(up.slice(0, -1)); })();
    const t = pinType('subject');
    const icons = ['message-square-text', 'pencil', 'trash-2'];
    const diag = `<svg viewBox="-10 -24 160 138" width="100%" style="max-width:440px;display:block;margin:0 auto" aria-hidden="true">
      <path d="${hullPts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')}Z" fill="rgba(var(--color-brand-cherry-rgb),.05)" stroke="var(--color-brand-cherry)" stroke-width=".8" stroke-dasharray="3 2.5"/>
      ${B.map((c) => `<line x1="${O.x}" y1="${O.y}" x2="${c.x}" y2="${c.y}" stroke="var(--color-ink-faint)" stroke-width=".7" stroke-dasharray="2 2"/>`).join('')}
      ${B.map((c, i) => `<circle cx="${c.x}" cy="${c.y}" r="${R}" fill="${i === 1 ? t.color : 'var(--color-surface-panel)'}" stroke="rgba(var(--color-shadow-rgb),.18)" stroke-width=".8"/>
        <g transform="translate(${c.x - 7.5} ${c.y - 7.5}) scale(.625)" fill="none" stroke="${i === 1 ? 'var(--color-ink-on-dark)' : i === 2 ? 'var(--color-brand-cherry)' : 'var(--color-ink-body)'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${MZ.icon(icons[i], 24, 2).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`).join('')}
      <circle cx="${O.x}" cy="${O.y}" r="${headR}" fill="${t.color}"/><ellipse cx="${O.x - headR * 0.34}" cy="${O.y - headR * 0.4}" rx="${headR * 0.2}" ry="${headR * 0.15}" fill="var(--color-pin-parts-specular)" opacity=".78" transform="rotate(-28 ${O.x - headR * 0.34} ${O.y - headR * 0.4})"/>
    </svg>`;
    const leg = [
      { n: 1, t: 'The head', d: 'The bubbles are born behind a disc drawn over the real head and swallowed back behind it. Without it they’d collapse into a puddle in front of the pin.' },
      { n: 2, t: 'Note', d: 'The note has one door, and it’s this bubble. Clicking the head only selects. <span class="lbl">D-031a</span>' },
      { n: 3, t: 'Draw around it', d: 'Hovered, a bubble swells 18% and takes the pin’s own hue with the icon turning white, so the one you’re about to press is never in doubt. <span class="lbl">D-031f</span>' },
      { n: 4, t: 'Delete', d: 'Takes cherry, not the pin’s hue, when hovered.' },
      { n: 5, t: 'Safe sector', d: 'The invisible hull of head and bubbles. Travelling from the head to a bubble never counts as leaving, however slowly. <span class="lbl">D-031d</span>' },
    ];
    const open = +cv('motion-goo-open').replace('ms', ''), st = +cv('motion-goo-stagger').replace('ms', ''), iin = +cv('motion-goo-icon-in').replace('ms', ''), iout = +cv('motion-goo-icon-out').replace('ms', ''), close = +cv('motion-goo-close').replace('ms', '');
    const total = 2 * st + Math.max(open, iin + iout) + 40;
    const pct = (ms) => (ms / total) * 100;
    const tl = `<div class="fig"><div class="tl" id="tl">
      ${[0, 1, 2].map((i) => `<div class="row"><span class="k">Bubble ${i + 1} · ${['note', 'draw', 'delete'][i]}</span><span class="lane"><i style="left:${pct(i * st)}%;width:${pct(open)}%" title="${open}ms from ${i * st}ms"></i></span></div>`).join('')}
      ${[0, 1, 2].map((i) => `<div class="row"><span class="k">Icon ${i + 1} cross-blurs in</span><span class="lane"><i class="icon" style="left:${pct(i * st + iin)}%;width:${pct(iout)}%"></i></span></div>`).join('')}
      <div class="row"><span class="k">All three close</span><span class="lane"><i class="close" style="left:0;width:${pct(close)}%"></i></span></div>
      <div class="axis"><span></span><div class="t">${[0, 100, 200, 300, 400].filter((m) => m < total).map((m) => `<span style="left:${pct(m)}%">${m}ms</span>`).join('')}</div></div>
      <div class="head" id="tl-head"></div>
    </div></div>
    <p class="note">Open is ${tn('motion.goo.open')} on ${tn('motion.ease.springOpen', 'ease.springOpen')}, each bubble ${tn('motion.goo.stagger')} after the last. Icons wait ${tn('motion.goo.iconIn')} while the liquid is still merged, then cross-blur in over ${tn('motion.goo.iconOut')}. Close is ${tn('motion.goo.close')} on ${tn('motion.ease.gooClose', 'ease.gooClose')}, all at once. Around it: a 50ms dwell before opening and a 220ms grace before closing, so a pointer crossing thirty pins doesn’t fire thirty menus.</p>`;
    const html = viewHead({ group: 'Components', title: 'Pin menu', lede: 'Hover a pin and three bubbles split out of it like liquid: note, draw around it, delete. It fans upward so it never covers what the pin points at.', src: ['PinMenu.tsx', 'motion.goo.* · shadow.menu.*', 'D-031'] })
      + sec('anatomy', 'Anatomy', '', `<div class="fig paper"><div class="anat"><div class="stage" id="menu-stage">${diag}</div>${legend(leg)}</div></div>`)
      + sec('live', 'Live, with a slow-motion switch', 'The real menu, held open. Toggle it, slow it down to a quarter speed, hover the bubbles.', `<div class="live menu-stage" id="menu-live"><button type="button" class="pinbtn" id="menu-anchor" aria-label="Subject pin">${pin('subject', 40)}</button></div>
          <div class="live-bar"><div style="display:flex;gap:8px;align-items:center"><button type="button" class="play" id="menu-toggle" aria-pressed="true">${ic('play', 11)} Close</button>
          <div class="seg" id="menu-speed"><button type="button" data-s="1" aria-pressed="true">1×</button><button type="button" data-s="4" aria-pressed="false">¼×</button></div></div><span class="lbl">the goo is a blur, an alpha threshold and the crisp shape composited back</span></div>`)
      + sec('timeline', 'Choreography', '', tl);
    return { html, mount(el) {
      const stage = $('#menu-stage', el), svg = $('svg', stage);
      const at = (x, y) => (s) => { const r = svg.getBoundingClientRect(), b = s.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = r.width / vb.width;
        return { x: r.left - b.left + (x - vb.x) * k, y: r.top - b.top + (y - vb.y) * k }; };
      const off = markers(stage, [{ n: 1, at: at(O.x + 15, O.y + 9) }, { n: 2, at: at(B[0].x - 17, B[0].y - 11) }, { n: 3, at: at(B[1].x + 17, B[1].y - 11) },
        { n: 4, at: at(B[2].x + 17, B[2].y - 11) }, { n: 5, at: (() => { const lx = hullPts.reduce((a, q) => (q.x < a.x ? q : a)); return at(lx.x + 1, lx.y + 10); })(), lead: { dx: -30, dy: 26 } }], $('.legend', el));
      const anchor = $('#menu-anchor', el);
      let menu = null;
      const make = () => { menu = new MZ.PinMenu(anchor, 'subject', { onAction: (a) => { toast(`The menu’s <code>${esc(a)}</code> action — on the board it ${a === 'note' ? 'opens the note' : a === 'lasso' ? 'starts a loop' : 'deletes the pin'}`); }, onEnter: () => {}, onLeave: () => {} }); menu.open = true; };
      make();
      const head = $('#tl-head', el), tlEl = $('#tl', el);
      const sweep = (ms, slow) => { if (reduce()) return; const lane = $('.row .lane', tlEl); const x0 = lane.offsetLeft, w = lane.clientWidth;
        head.getAnimations().forEach((a) => a.cancel());
        head.animate([{ left: x0 + 'px', opacity: 1 }, { left: (x0 + w * (ms / total)) + 'px', opacity: 1 }, { left: (x0 + w * (ms / total)) + 'px', opacity: 0 }], { duration: ms * slow + 400, easing: 'linear' }); };
      let slow = 1;
      const tog = $('#menu-toggle', el);
      tog.addEventListener('click', () => { const on = tog.getAttribute('aria-pressed') !== 'true'; tog.setAttribute('aria-pressed', on ? 'true' : 'false');
        tog.innerHTML = `${ic('play', 11)} ${on ? 'Close' : 'Open'}`; if (!menu || menu.dead) make(); menu.setOpen(on); if (on) sweep(total, slow); });
      const seg = $('#menu-speed', el);
      seg.addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn) return; slow = +btn.dataset.s;
        $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', x === btn ? 'true' : 'false')); root.classList.toggle('ds-slow', slow > 1); });
      setTimeout(() => sweep(total, 1), 200);
      return () => { off(); if (menu) menu.destroy(); root.classList.remove('ds-slow'); };
    } };
  }

  /* ------------------------------------------------------------------ rail */
  function vRail() {
    const btn = (t, i, on, cls) => `<div class="${cls || ''}" style="position:relative;display:inline-block"><button type="button" class="rail-btn" data-on="${on ? 1 : 0}" style="--c22:${t.color}22" tabindex="-1" aria-hidden="true"><span class="rail-dot" style="background:${t.color}">${MZ.icon(t.icon, 12, 2.6)}</span><span class="rail-tag">${esc(t.label)}<span>${i + 1}</span></span></button></div>`;
    const T2 = MZ.PIN_TYPES[1];
    const grid = `<div class="states" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="h">Rest</div><div class="h">Hover</div><div class="h">Armed</div><div class="h">Armed, hovered</div>
      <div style="justify-content:flex-start;padding-left:24px">${btn(T2, 1, false)}</div><div style="justify-content:flex-start;padding-left:24px">${btn(T2, 1, false, 'force-hover')}</div>
      <div style="justify-content:flex-start;padding-left:24px">${btn(T2, 1, true)}</div><div style="justify-content:flex-start;padding-left:24px">${btn(T2, 1, true, 'force-hover')}</div></div>`;
    const leg = [
      { n: 1, t: 'The panel', d: 'Chrome white, the rail radius, one soft shadow. It floats 16px off the left edge.', tok: ['radius.rail', 'shadow.rail', 'inset'] },
      { n: 2, t: 'The disc', d: 'A flat 20px disc in the type’s hue. In the rail the icon does the identifying, so the disc stays flat — the glass belongs to the pin on the board.', tok: ['color.pin.type.hue'] },
      { n: 3, t: 'The glyph', d: 'A Lucide icon at 12px with its stroke thickened to 2.6 so it holds at that size, in white.', tok: ['color.ink.onDark'] },
      { n: 4, t: 'Armed', d: 'A 3px ring in the pin’s own hue at 13%, on a soft fill. Placing is one-shot: pick, place, the rail disarms. <span class="lbl">D-032</span>', tok: ['color.surface.panelSoft'] },
      { n: 5, t: 'The tag', d: 'Flips out on hover with a little overshoot, naming the type and its key, so nothing has to be memorised. <span class="lbl">D-006</span>', tok: ['color.ink.strong', 'radius.tag', 'motion.quick', 'motion.ease.spring'] },
    ];
    const html = viewHead({ group: 'Components', title: 'Rail', lede: 'Seven pin types down the left edge, Illustrator-style. Keys 1 to 7 arm the next pin; hover a disc for its name.', src: ['ToolRail.tsx', 'D-006 · D-029 · D-032'] })
      + sec('anatomy', 'Anatomy', 'Hover the rail, or press 1–7 while the pointer is over it.', `<div class="fig board"><div class="anat"><div class="stage rail-live" id="rail-stage"><div id="rail-host"></div></div>${legend(leg)}</div></div>`)
      + sec('states', 'States', '', grid);
    return { html, mount(el) {
      const stage = $('#rail-stage', el), host = $('#rail-host', el);
      const rail = MZ.makeRail(host, { onArm: (id) => rail.setArmed(id) }); rail.setArmed('type');
      const btns = () => $$('.rail-btn', host);
      btns()[4].classList.add('shown');   // one tag held out so its marker has something to name
      const off = markers(stage, [{ n: 1, at: (s) => rel(s, host, 1, 0.94, 6, 0) }, { n: 2, at: (s) => rel(s, $('.rail-dot', btns()[0]), 1, 0.5, 14, -4) },
        { n: 3, at: (s) => rel(s, $('.rail-dot', btns()[2]), 1, 0.5, 14, 0) }, { n: 4, at: (s) => rel(s, btns()[1], 1, 0.5, 8, 0) }, { n: 5, at: (s) => rel(s, $('.rail-tag', btns()[4]), 1, 0.5, 16, 0) }], $('.legend', el));
      const onKey = (e) => { if (!stage.matches(':hover')) return; const n = parseInt(e.key, 10); if (n >= 1 && n <= 7) rail.setArmed(MZ.PIN_TYPES[n - 1].id); if (e.key === 'Escape') rail.setArmed(null); };
      doc.addEventListener('keydown', onKey);
      return () => { off(); doc.removeEventListener('keydown', onKey); };
    } };
  }

  /* ------------------------------------------------------------------ polaroid & cherries */
  function vPolaroid() {
    const leg = [
      { n: 1, t: 'The frame', d: 'Warm white, a thin even border. It gives the pin an edge to bite into. <span class="lbl">D-022</span>', tok: ['color.surface.polaroid', 'polaroid.border', 'polaroid.radius'] },
      { n: 2, t: 'The picture', d: 'The reference, cropped to its own ratio. Pins, loops and notes live in its normalised space, so they survive any resize.' },
      { n: 3, t: 'The chin', d: '19% of the picture’s height, never under 62px — sized for the cherries plus their caption so it never crops.', tok: ['polaroid.chinRatio', 'polaroid.chinMin'] },
      { n: 4, t: 'Cherries', d: 'Weight per image: none, noted, important, non-negotiable. Click the lit one to clear. <span class="lbl">D-023a</span>', tok: ['color.cherry.full', 'color.cherry.empty'] },
      { n: 5, t: 'The caption', d: 'The cherries are the quantity; the word is the judgement. Its row is reserved at every value so the chin never jumps.', tok: ['color.ink.faint', 'type.size.label'] },
      { n: 6, t: 'Back to tray', d: 'An action, so it appears on hover of the frame and turns cherry under the pointer. The cherries are data and never hide. <span class="lbl">D-035</span>' },
      { n: 7, t: 'Contact shadow', d: 'The polaroid shadow, in the one navy.', tok: ['shadow.polaroid'] },
    ];
    const rows = [0, 1, 2, 3].map((v) => `<div style="flex-direction:column;gap:6px"><div data-cr="${v}"></div><span class="lbl">${v} · ${v ? MZ.WEIGHT_LABEL[v] : 'unweighted'}</span></div>`).join('');
    const html = viewHead({ group: 'Components', title: 'Polaroid & cherries', lede: 'Every image on the board sits in a polaroid: a thin white border and a deep chin where its weight lives.', src: ['Polaroid.tsx · Cherry.tsx', 'polaroid.* · color.cherry.*', 'D-022 · D-023b · D-035'] })
      + sec('anatomy', 'Anatomy', 'Hover the frame for the back-to-tray ×.', `<div class="fig board"><div class="anat"><div class="stage" id="pol-stage" style="height:470px"></div>${legend(leg)}</div></div>`)
      + sec('weight', 'The weight control', 'Four states, and the real control underneath to click.', `<div class="states" style="grid-template-columns:repeat(4,minmax(0,1fr))">${rows}</div>
          <div class="live" style="height:220px;display:grid;place-items:center;margin-top:16px;background:var(--color-surface-polaroid);background-image:none"><div id="cr-big"></div></div>${cap('Cherry.tsx · the brand’s pixel cherry, never redrawn', 'click the lit cherry to clear')}`);
    return { html, mount(el) {
      const stage = $('#pol-stage', el);
      const b = new MZ.Board(stage, { imageWidth: 230, onReturn: () => toast('Back to the tray — on the board, the image leaves and its pins go with it') });
      stage.style.background = 'transparent'; stage.style.border = '0'; stage.style.overflow = 'visible';
      stage.classList.add('show-x');   // the × is hover-only on the board; held visible here so its marker has something to name
      const src = imgById('j43');
      const img = b.addImage({ id: 'anat', src: src.big, w: src.w, h: src.h, width: 230, name: src.name, weight: 2, rotation: 0,
        pins: [{ type: 'subject', x: 0.5, y: 0.34, note: '' }] }, 0, 0);
      const pol = $('.mz-pol', stage);
      const centre = () => b.moveImage(img, Math.max(0, Math.round((stage.clientWidth - pol.offsetWidth) / 2)), Math.max(0, Math.round((stage.clientHeight - pol.offsetHeight) / 2)));
      centre(); const ro = new ResizeObserver(centre); ro.observe(stage);
      const q = (s) => $(s, pol);
      const off = markers(stage, [{ n: 1, at: (s) => rel(s, pol, 0, 0, 6, 6) }, { n: 2, at: (s) => rel(s, q('.area'), 0.86, 0.62) }, { n: 3, at: (s) => rel(s, q('.chin'), 0, 0.3), lead: { dx: -38, dy: -12 } },
        { n: 4, at: (s) => rel(s, q('.cr'), 1, 0.2, 14, 0) }, { n: 5, at: (s) => rel(s, q('.cherry-lbl'), 1, 0.5, 16, 0) }, { n: 6, at: (s) => rel(s, q('.tray-return') || q('.chin'), 0.5, 0.5), lead: { dx: -52, dy: 30 } },
        { n: 7, at: (s) => rel(s, pol, 1, 1, 10, 6) }], $('.legend', el));
      $$('[data-cr]', el).forEach((h) => MZ.cherryRow(h, { value: +h.dataset.cr, size: 22, gap: 5 }));
      MZ.cherryRow($('#cr-big', el), { value: 2, size: 72, gap: 20, showLabel: true, labelSize: 16 });
      return () => { off(); ro.disconnect(); b.destroy && b.destroy(); };
    } };
  }

  /* ------------------------------------------------------------------ tray */
  function vTray() {
    const leg = [
      { n: 1, t: 'Arrows, outside', d: 'Bare cherry chevrons in their own lanes. Out here they don’t compete with a thumbnail, so they need no button chrome. Hold one to keep scrolling. <span class="lbl">D-028a</span>', tok: ['color.brand.cherry', 'color.brand.cherryDeep'] },
      { n: 2, t: 'Add, pinned inside', d: 'A control never covers the content it works on, and never scrolls away with it. The strip slides behind this one.', tok: ['shadow.trayLead', 'radius.pill'] },
      { n: 3, t: 'The shelf', d: 'Slate at 80% with a blur, behind a dashed cherry border. It never changes height.', tok: ['color.wash.shelf', 'color.wash.cherryLine', 'radius.shelf'] },
      { n: 4, t: 'Magnification', d: 'Thumbnails grow under the pointer with distance falloff, on a spring. Width, not scale, so neighbours move aside. <span class="lbl">D-026</span>', tok: ['motion.springs.dock', 'radius.thumb', 'shadow.thumb'] },
      { n: 5, t: 'Position', d: 'A solid cherry segment riding the dashed border: how much more there is, where the arrows say only that there is more.', tok: ['color.wash.cherryTrack'] },
    ];
    const html = viewHead({ group: 'Components', title: 'Tray', lede: 'Images arrive in a shelf across the top before they’re placed. Sweep the pointer across it and the thumbnails swell like a dock.', src: ['TrayDock.tsx', 'D-026 · D-028'] })
      + sec('anatomy', 'Anatomy', 'This one is live: sweep, scroll with the wheel, hold an arrow.', `<div class="fig board" style="padding:40px 22px 34px"><div class="stage" id="tray-stage" style="position:relative"><div id="tray-host"></div></div></div><div style="margin-top:22px">${legend(leg)}</div>`)
      + sec('behaviour', 'Every way to move it', 'Until the tray could be moved with a mouse, only a trackpad swipe worked. Now all of these do.', `<table class="spec"><tbody>
          <tr><td><b>Mouse wheel</b></td><td>A plain vertical wheel scrolls sideways. Trackpad sideways swipes pass straight through.</td></tr>
          <tr><td><b>Middle-drag</b></td><td>Grab and throw the strip, like space-drag on the board.</td></tr>
          <tr><td><b>Arrows</b></td><td>Page by whole thumbnails, about 80% of a screenful; hold to keep going.</td></tr>
          <tr><td><b>Edges</b></td><td>Fade only on the side that still has more behind it.</td></tr>
          <tr><td><b>Magnify</b></td><td>74px at rest, 118px under the pointer, 150px of reach either side. Off for touch and under reduced motion.</td></tr>
        </tbody></table>`);
    return { html, mount(el) {
      const stage = $('#tray-stage', el), host = $('#tray-host', el);
      const tray = new MZ.Tray(host, { items: IMG.slice(0, 40).map((i) => ({ id: i.id, thumb: i.thumb, name: i.name })) });
      const q = (s) => $(s, host);
      const off = markers(stage, [{ n: 1, at: (s) => rel(s, q('.tray-arrow-l'), 0.5, 0, 0, -16) }, { n: 2, at: (s) => rel(s, q('.tray-lead'), 0.5, 0, 0, -14) },
        { n: 3, at: (s) => rel(s, q('.tray-pill'), 0.62, 0, 0, -1) }, { n: 4, at: (s) => { const d = $$('.dock-item', host)[3]; return d ? rel(s, d, 0.5, 1, 0, 14) : { x: 0, y: 0 }; } },
        { n: 5, at: (s) => rel(s, q('.tray-pill'), 0.14, 1, 0, 14) }], $('.legend', el));
      return () => { off(); tray.destroy && tray.destroy(); };
    } };
  }

  /* ------------------------------------------------------------------ buttons & controls */
  function vControls() {
    const B = [
      ['Cherry', 'The one action a surface exists for.', (x) => `<button type="button" class="b b-cherry ${x}"${x === 'dis' ? ' disabled' : ''}>${cherry(13)} Compile</button>`, true],
      ['Secondary', 'Beside a cherry button: “Not now”, “Last compile”.', (x) => `<button type="button" class="b b-secondary ${x}">Not now</button>`],
      ['Text', 'Small outlined actions with an icon: Copy, Download, Remake.', (x) => `<button type="button" class="b b-text ${x}">${ic('copy', 12)} Copy</button>`],
      ['Small', 'A yes or no under a board tile.', (x) => `<span style="display:inline-flex;gap:6px"><button type="button" class="b b-small ${x}">Keep</button><button type="button" class="b b-small danger ${x}">Delete</button></span>`],
      ['Icon', 'A bare icon in a round hit area; filled when it’s on.', (x) => `<span style="display:inline-flex;gap:6px"><button type="button" class="b b-icon ${x}" aria-label="Close">${ic('x', 17)}</button><button type="button" class="b b-icon on ${x}" aria-label="Raw JSON">${ic('braces', 15)}</button></span>`],
    ];
    const matrix = `<div class="states" style="grid-template-columns:150px repeat(3,minmax(0,1fr))"><div class="h"></div><div class="h">Rest</div><div class="h">Keyboard focus</div><div class="h">Disabled</div>
      ${B.map(([n, u, f, dis]) => `<div class="rh" style="flex-direction:column;align-items:flex-start;gap:2px">${n}<span style="font-weight:400;font-size:11.5px;color:var(--color-ink-muted);line-height:1.35">${u}</span></div><div>${f('')}</div><div>${f('is-focus')}</div><div>${dis ? f('dis') : '<span class="lbl">—</span>'}</div>`).join('')}
    </div><p class="note">These are the states the app has. The buttons carry no hover fill; the pointer is the hover. Focus is the same 2px cherry ring everywhere, offset 2px, shown only for the keyboard. Only Compile is ever disabled, and it says why.</p>`;
    const top = `<div class="live" style="padding:26px 16px;display:flex;justify-content:center;gap:var(--topbar-gap);flex-wrap:wrap;align-items:center">
        <button type="button" class="pill wm" id="tb-wm" aria-pressed="false" title="Boards">${wordmark(21)}</button>
        <button type="button" class="pill tr" id="tb-tr" aria-pressed="false" aria-label="Tray">${trayIcon(17)}</button>
        <button type="button" class="pill cmp" id="tb-cmp" style="margin-left:6px">${cherry(15)} Compile <span class="ct">0</span></button>
      </div><div class="live-bar"><div class="seg" id="tb-pins"><button type="button" data-n="0" aria-pressed="true">No pins yet</button><button type="button" data-n="12" aria-pressed="false">12 pins placed</button></div><span class="lbl">click the wordmark and the tray · fill carries the state</span></div>`;
    const chips = `<div class="grid g2">
      <div class="fig"><div class="lbl" style="margin-bottom:10px">Chips · pick any</div><div class="chips-row" id="ch-multi">${['Campaign stills', 'Lookbook', 'Product shots', 'Brand direction', 'Other'].map((o, i) => `<button type="button" class="chp" aria-pressed="${i === 1 || i === 2}">${o}</button>`).join('')}</div>
        <div class="lbl" style="margin:16px 0 10px">Chips · pick one</div><div class="chips-row" id="ch-one">${['People', 'Product only', 'Both'].map((o, i) => `<button type="button" class="chp" aria-pressed="${i === 0}">${o}</button>`).join('')}</div></div>
      <div class="fig"><div class="lbl" style="margin-bottom:10px">Tabs · the rail’s three stages</div><div class="tabs" id="tabs">${['Brief', 'Extraction', 'Stills'].map((o, i) => `<button type="button" class="tab" aria-pressed="${i === 0}">${o}</button>`).join('')}</div>
        <div class="lbl" style="margin:18px 0 10px">Progress</div><div class="prog"><i style="width:40%"></i></div><div class="prog" style="margin-top:10px"><i class="ind"></i></div>
        <p class="note" style="margin-top:8px">A bar fills when there are batches to count and travels when there aren’t — the brief is one call.</p></div>
      <div class="fig"><div class="lbl" style="margin-bottom:10px">Field · click in for the halo</div><input class="dsf" placeholder="e.g. a retro golf apparel brand — caps, tees, headcovers">
        <div class="lbl" style="margin:14px 0 10px">Focused</div><input class="dsf is-focus" value="Late 60s, film grain, a little worn" tabindex="-1">
        <p class="note">The border goes cherry and thickens by shadow, so nothing reflows, with a soft halo outside. It shows on click too: focus is a state everyone sees. <span class="lbl">D-033c</span></p></div>
      <div class="fig"><div class="lbl" style="margin-bottom:10px">Zoom badge</div><div class="zb"><button type="button" class="fit">Fit</button><button type="button" class="pct">100%</button></div>
        <div class="lbl" style="margin:18px 0 10px">Hex swatch · in the brief and the extraction</div><div style="display:flex;gap:14px;flex-wrap:wrap">${['color.brand.cherry', 'color.pin.format.hue', 'color.ink.strong'].map((p) => { const v = tok(p).shown; return `<span class="sw-chip"><i style="background:${v}"></i>${v}</span>`; }).join('')}</div></div>
    </div>`;
    const card = `<div class="fig board" style="padding:30px 16px"><div class="mini-card">
        <div class="hd"><span style="color:var(--color-brand-cherry);display:inline-flex">${cherry(20)}</span><h4>Before you compile</h4><button type="button" class="b b-icon x" aria-label="Close">${ic('x', 17)}</button></div>
        <p class="i">Six quick questions, all optional. The compiler works from your <b>12 pins</b> and <b>3 product files</b>; these tell it what the board is for.</p>
        <div class="q"><div class="ql"><span class="n">1</span><span class="t">What are you making?</span><span class="h">pick any</span></div><div class="chips-row mc">${['Campaign stills', 'Lookbook', 'Product shots', 'Brand direction', 'Other'].map((o, i) => `<button type="button" class="chp" aria-pressed="${i === 0}">${o}</button>`).join('')}</div></div>
        <div class="q"><div class="ql"><span class="n">2</span><span class="t">What is the product or subject?</span></div><input class="dsf" placeholder="e.g. a retro golf apparel brand — caps, tees, headcovers"></div>
        <div class="ft"><span>Saved with the board as you type.</span><button type="button" class="b b-secondary">Not now</button><button type="button" class="b b-cherry">${cherry(13)} Compile</button></div>
      </div></div>${cap('CompileCard.tsx, abridged · every part on this page, together', 'radius.card · shadow.card')}`;
    const html = viewHead({ group: 'Components', title: 'Buttons & controls', lede: 'The pills in the top bar, five button recipes, and the small controls around them. Each recipe is defined once and every screen uses it.', src: ['components/recipes.ts · TopWidget.tsx · CompileCard.tsx', 'D-033 · D-043'] })
      + sec('topbar', 'The top bar', 'Three pills, lifted verbatim from the artwork. Compile is the one action the product is named for, so it’s the only solid one — and it stays off until there’s a pin.', top)
      + sec('buttons', 'Buttons', '', matrix)
      + sec('controls', 'Chips, tabs, fields, progress', '', chips)
      + sec('context', 'In context', 'The compile card, abridged, built from the parts above.', card);
    return { html, mount(el) {
      const wm = $('#tb-wm', el), tr = $('#tb-tr', el), cmp = $('#tb-cmp', el);
      [wm, tr].forEach((b) => b.addEventListener('click', () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }));
      $('#tb-pins', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#tb-pins button', el).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        const n = +b.dataset.n; cmp.classList.toggle('armed', n > 0); $('.ct', cmp).textContent = n; });
      const multi = (host) => host.addEventListener('click', (e) => { const b = e.target.closest('.chp'); if (!b) return; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
      const one = (host, sel) => host.addEventListener('click', (e) => { const b = e.target.closest(sel); if (!b) return; $$(sel, host).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); });
      multi($('#ch-multi', el)); $$('.mc', el).forEach(multi); one($('#ch-one', el), '.chp'); one($('#tabs', el), '.tab');
    } };
  }

  /* ================================================================== RULES */
  function vRules() {
    /* a small polaroid with a given shadow, for the shadow rule */
    const snap = (id, shadow, rot) => `<span class="sh-snap" style="box-shadow:${shadow};transform:rotate(${rot}deg)"><img src="${imgById(id).thumb}" alt=""></span>`;
    const R = [
      ['Brand cherry is chrome, never a pin', 'D-027',
        `<span class="pill cmp armed" style="height:34px">${cherry(14)} Compile <span class="ct">3</span></span><span style="line-height:0">${pin('color', 34)}</span>`, 'The Color pin keeps its own warmer red. The action and the pin never read as the same thing.',
        `<span class="pill cmp armed" style="height:34px">${cherry(14)} Compile <span class="ct">3</span></span><span style="line-height:0" data-brandpin>${pin('color', 34)}</span>`, 'Paint the pin in the brand red and a pin starts to read as a button, and a focus ring as a pin.'],
      ['One navy for every shadow', 'D-030 · D-048b',
        `<span class="sh-pair">${snap('j15', 'var(--shadow-polaroid)', -3)}${snap('j42', 'var(--shadow-polaroid)', 2)}</span>`, 'Every shadow is the one navy at a strength, thrown the same way. The board stays cool and reads as one lit table.',
        `<span class="sh-pair">${snap('j15', '10px 14px 22px -6px rgba(0,0,0,.55)', -3)}${snap('j42', '-12px 10px 20px -6px rgba(70,48,24,.42)', 2)}</span>`, 'Black and brown shadows on a blue-grey board go muddy, and each object looks lit by a different lamp.'],
      ['A pin is found by its shape, not its fill', 'D-021a · D-030',
        `<span style="line-height:0">${pin('format', 38)}</span><span style="line-height:0">${pin('subject', 38)}</span>`, 'Shadow, hole and highlight are the same on every pin. Yellow on white stays findable.',
        `<span class="plain-dot" style="width:22px;height:22px;background:var(--color-pin-format-hue);border:0"></span><span class="plain-dot" style="width:22px;height:22px;background:var(--color-pin-subject-hue);border:0"></span>`, 'A flat disc on white paper: the yellow one nearly disappears.', 'paper'],
      ['A control never covers what it operates on', 'D-028a',
        `<span style="display:flex;align-items:center;gap:4px"><span style="color:var(--color-brand-cherry)">${ic('chevron-left', 22, 2.5)}</span><span style="display:flex;gap:5px;padding:9px;border:2px dashed var(--color-wash-cherry-line);border-radius:12px;background:var(--color-wash-shelf)">${IMG.slice(4, 8).map((i) => `<img src="${i.thumb}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:6px;border:1px solid var(--color-surface-line)">`).join('')}</span><span style="color:var(--color-brand-cherry)">${ic('chevron-right', 22, 2.5)}</span></span>`, 'The arrows get their own lanes outside the shelf.',
        `<span style="position:relative;display:flex;gap:5px;padding:9px;border:2px dashed var(--color-wash-cherry-line);border-radius:12px;background:var(--color-wash-shelf)">${IMG.slice(4, 8).map((i) => `<img src="${i.thumb}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:6px;border:1px solid var(--color-surface-line)">`).join('')}<span style="position:absolute;left:4px;top:50%;transform:translateY(-50%);width:26px;height:26px;border-radius:50%;background:var(--color-surface-panel);box-shadow:var(--shadow-rest);display:grid;place-items:center;color:var(--color-brand-cherry)">${ic('chevron-left', 16, 2.5)}</span><span style="position:absolute;right:4px;top:50%;transform:translateY(-50%);width:26px;height:26px;border-radius:50%;background:var(--color-surface-panel);box-shadow:var(--shadow-rest);display:grid;place-items:center;color:var(--color-brand-cherry)">${ic('chevron-right', 16, 2.5)}</span></span>`, 'Arrows floated over the strip sit on top of the very thumbnails they scroll.'],
      ['Focus is shown, never removed', 'D-033c',
        `<input class="dsf is-focus" value="caps, tees, headcovers" tabindex="-1" style="width:230px">`, 'The halo: cherry border, soft ring outside, nothing reflows.',
        `<input class="dsf" value="caps, tees, headcovers" tabindex="-1" style="width:230px" data-caret>`, '<code>outline: none</code> and nothing in its place. The field is focused and nothing says so.'],
      ['One cherry action per surface', 'D-033',
        `<span style="display:flex;gap:10px"><button type="button" class="b b-secondary" tabindex="-1">Not now</button><button type="button" class="b b-cherry" tabindex="-1">${cherry(13)} Compile</button></span>`, 'The solid red is the thing the surface is for. Everything else is outlined.',
        `<span style="display:flex;gap:10px"><button type="button" class="b b-cherry" tabindex="-1">Not now</button><button type="button" class="b b-cherry" tabindex="-1">${cherry(13)} Compile</button></span>`, 'Two solid reds and neither one is the answer.'],
      ['Springy, never floaty', 'D-026 · D-031', null, null, null, null, 'motion'],
      ['Faint ink is never the only copy of a message', 'Contrast',
        `<span style="display:flex;flex-direction:column;align-items:center;gap:8px;font-family:var(--type-family)"><span style="font-size:12.5px;color:var(--color-ink-muted)">Nothing compiled yet.</span><button type="button" class="b b-text" tabindex="-1">${ic('rotate-cw', 12)} Write the brief</button></span>`, 'Muted for the status, with a real control to act on it.',
        `<span style="font-family:var(--type-family);font-size:12px;color:var(--color-ink-faint)">Compile stopped: the API key is missing.</span>`, 'An error in faint ink, at 1.7:1. Most people won’t see it.'],
    ];
    const motionPair = `<div class="dd"><div class="art"><span class="rt-demo"><span class="rail-dot" style="background:var(--color-pin-type-hue)">${MZ.icon('type', 12, 2.6)}</span><span class="rail-tag ds-tagdemo">Type<span>2</span></span></span><button type="button" class="play" data-run="spring">${ic('play', 11)} Play</button></div>
        <div class="txt"><b><i>✓</i> Do</b>The tag flips out in 140ms on the house overshoot. It arrives before you’ve finished looking for it.</div></div>
      <div class="dd no"><div class="art"><span class="rt-demo"><span class="rail-dot" style="background:var(--color-pin-type-hue)">${MZ.icon('type', 12, 2.6)}</span><span class="rail-tag ds-tagdemo slowlin">Type<span>2</span></span></span><button type="button" class="play" data-run="float">${ic('play', 11)} Play</button></div>
        <div class="txt"><b><i>✕</i> Don’t</b>A 700ms linear fade. It floats in after you’ve moved on, and it feels like lag.</div></div>`;
    const html = viewHead({ group: 'Rules', title: 'Do & don’t', lede: 'The handful of things the parts are never allowed to do, drawn with the real parts. Each is tied to the decision that made it.', src: ['docs/DECISIONS.md', 'docs/DESIGN.md · Hard rules'] })
      + `<div class="rules">${R.map(([h, d, a, at, b, bt, kind], i) => `<div class="rule-row" id="rule-${i + 1}"><div class="rule-h"><h3>${h}</h3><span class="d">${d}</span></div>
          ${kind === 'motion' ? motionPair : `<div class="dd"><div class="art${kind === 'paper' ? ' paper' : ''}">${a}</div><div class="txt"><b><i>✓</i> Do</b>${at}</div></div>
          <div class="dd no"><div class="art${kind === 'paper' ? ' paper' : ''}">${b}</div><div class="txt"><b><i>✕</i> Don’t</b>${bt}</div></div>`}</div>`).join('')}</div>`;
    return { html, mount(el) {
      // the “don’t” pin, repainted in the brand red: stops rewritten, geometry untouched
      $$('[data-brandpin] stop', el).forEach((s) => { const c = s.getAttribute('stop-color'); if (c === pinType('color').color) s.setAttribute('stop-color', cv('color-brand-cherry')); if (c === pinType('color').shade) s.setAttribute('stop-color', cv('color-brand-cherry-deep')); });
      $$('[data-run]', el).forEach((b) => b.addEventListener('click', () => {
        const tag = $('.ds-tagdemo', b.parentElement), slow = b.dataset.run === 'float';
        tag.getAnimations().forEach((a) => a.cancel());
        tag.animate([{ opacity: 0, transform: 'translateY(-50%) translateX(-6px) scale(.92)' }, { opacity: 1, transform: 'translateY(-50%) translateX(0) scale(1)' }],
          { duration: slow ? 700 : parseFloat(cv('motion-quick')), easing: slow ? 'linear' : cv('motion-ease-spring'), fill: 'forwards' });
      }));
      const auto = setTimeout(() => $$('[data-run]', el).forEach((b) => b.click()), 500);
      return () => clearTimeout(auto);
    } };
  }

  /* ================================================================== TOKENS */
  const GROUPS = [['color', 'Colour'], ['type', 'Type'], ['space', 'Space'], ['inset', 'Inset'], ['radius', 'Radius'], ['shadow', 'Shadow'], ['motion', 'Motion'], ['z', 'Paint order'],
    ['board', 'Board'], ['pin', 'Pin'], ['topbar', 'Top bar'], ['polaroid', 'Polaroid'], ['primitive', 'Primitives']];
  function preview(t) {
    const v = t.shown || '', p = t.path;
    if (/^#|^rgba?\(/.test(v) && (t.type === 'color' || p.includes('color'))) return `<span class="pvw" style="background:${esc(v)}"></span>`;
    if (p.startsWith('shadow.') && /px/.test(v)) return `<span class="pvw sh" style="box-shadow:${esc(v)}"></span>`;
    if (p.startsWith('radius.') || p.startsWith('primitive.radius')) return `<span class="pvw sh" style="border-radius:${esc(/%$/.test(v) ? v : Math.min(11, parseFloat(v)) + 'px')};border-color:var(--color-ink-muted)"></span>`;
    if (p.startsWith('type.size') || p.startsWith('primitive.font.size')) return `<span class="pvw txt" style="font-size:${esc(parseFloat(v))}px">Ag</span>`;
    if (p.startsWith('space.') || p.startsWith('primitive.space')) return `<span style="display:block;height:8px;width:${Math.min(30, parseFloat(v))}px;background:var(--color-brand-cherry);border-radius:2px"></span>`;
    return '';
  }
  function vTokens() {
    const by = (g) => (g === 'primitive' ? TK.primitive : TK.semantic.filter((t) => t.path.split('.')[0] === g));
    const html = viewHead({ group: 'Reference', title: 'Every token', lede: `All ${TK.semantic.length} named tokens and the ${TK.primitive.length} primitives under them, straight from tokens.json. Click a name to copy its custom property, or a value to copy the value.`, src: ['tokens.json · W3C design tokens format'] })
      + `<div class="tk-tools"><div class="seg" id="tk-g" style="flex-wrap:wrap"><button type="button" data-g="" aria-pressed="true">All</button>${GROUPS.map(([g, n]) => `<button type="button" data-g="${g}" aria-pressed="false">${n}</button>`).join('')}</div></div>`
      + GROUPS.map(([g, n]) => { const L = by(g); if (!L.length) return '';
        return `<div class="tk-grp" data-g="${g}"><h3>${n} <span>${L.length}</span></h3><table class="tk"><tbody>${L.map((t) => `<tr id="t-${esc(t.path)}"><td class="pv">${preview(t)}</td>
          <td class="nm">${tn(t.path)}${t.css ? `<span class="cssv">${t.css}</span>` : ''}</td><td class="vl">${val(t.shown)}</td><td class="al">${t.alias ? '→ ' + esc(t.alias.replace(/^primitive\./, '')) : ''}</td></tr>`).join('')}</tbody></table></div>`; }).join('');
    return { html, mount(el) {
      const seg = $('#tk-g', el);
      seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        $$('.tk-grp', el).forEach((g) => { g.style.display = !b.dataset.g || g.dataset.g === b.dataset.g ? '' : 'none'; }); });
    } };
  }

  /* ================================================================== SHELL: nav, router, search */

  const VIEWS = [
    { id: 'overview', g: 'Start', t: 'Overview', r: vOverview },
    { id: 'colour', g: 'Foundations', t: 'Colour', r: vColour, kw: 'color palette slate ramp hue cherry red brand navy wash' },
    { id: 'contrast', g: 'Foundations', t: 'Contrast', r: vContrast, kw: 'wcag aa accessibility ratio legibility' },
    { id: 'type', g: 'Foundations', t: 'Type', r: vType, kw: 'typography font size weight tracking leading sf pro' },
    { id: 'space', g: 'Foundations', t: 'Space & radius', r: vSpace, kw: 'spacing padding inset radius corners rounded sp()' },
    { id: 'elevation', g: 'Foundations', t: 'Elevation & layers', r: vElevation, kw: 'shadow depth z-index paint order layers' },
    { id: 'motion', g: 'Foundations', t: 'Motion', r: vMotion, kw: 'animation duration easing curve spring bezier timing' },
    { id: 'pin', g: 'Components', t: 'Pin', r: vPin, kw: 'pushpin ball head glass shadow hole anchor states lifted working' },
    { id: 'pin-menu', g: 'Components', t: 'Pin menu', r: vPinMenu, kw: 'goo bubbles note lasso delete hover safe sector choreography slow motion' },
    { id: 'rail', g: 'Components', t: 'Rail', r: vRail, kw: 'tool rail toolbar tag flip keys armed' },
    { id: 'polaroid', g: 'Components', t: 'Polaroid & cherries', r: vPolaroid, kw: 'frame chin weight cherries noted important non-negotiable back to tray' },
    { id: 'tray', g: 'Components', t: 'Tray', r: vTray, kw: 'dock magnification shelf thumbnails arrows scroll' },
    { id: 'controls', g: 'Components', t: 'Buttons & controls', r: vControls, kw: 'button cherry secondary text chips tabs field input focus halo progress top bar pill compile wordmark zoom' },
    { id: 'rules', g: 'Rules', t: 'Do & don’t', r: vRules, kw: 'guidelines rules do dont principles' },
    { id: 'tokens', g: 'Reference', t: 'Every token', r: vTokens, kw: 'all tokens table css variables json dtcg' },
  ];
  const viewById = (id) => VIEWS.find((v) => v.id === id);

  /* sections and parts worth finding by name, beyond the tokens themselves */
  const EXTRA_HITS = [
    ['colour/ramp', 'The slate ramp', 'twelve greys, annotated', 'grey gray neutral'], ['colour/chain', 'Value, role, part', 'primitive → semantic → component', 'alias layers'],
    ['colour/cherry', 'Brand cherry vs the Color pin', 'D-027', 'red'], ['colour/pins', 'The seven pin hues', 'hue and shade per type', 'colors'],
    ['contrast/pairs', 'Contrast pairings', 'every pairing, measured', 'wcag'], ['space/inset', 'The inset', '16px off every edge', 'margin'],
    ['elevation/layers', 'Paint order', 'the z-index ladder', 'z-index stacking'], ['motion/easing', 'Easing curves', 'eight curves, playable', 'bezier'],
    ['motion/springs', 'Springs', 'card, panel, dock', 'framer bounce'], ['pin/anatomy', 'Pin anatomy', 'head, highlight, shaft, hole, shadow, anchor', 'parts'],
    ['pin/states', 'Pin states', 'rest, working, lifted, zoomed out', 'selected dragging'], ['pin-menu/live', 'Pin menu, slow motion', 'the real menu at ¼ speed', 'goo'],
    ['pin-menu/timeline', 'Pin menu choreography', 'stagger, icons, close', 'timeline'], ['polaroid/weight', 'The weight control', 'noted · important · non-negotiable', 'cherries'],
    ['controls/topbar', 'Top bar pills', 'wordmark, tray, Compile', 'header'], ['controls/buttons', 'Button states', 'rest, focus, disabled', 'focus ring'],
    ['controls/context', 'The compile card', 'every control together', 'card modal'], ['rules/rule-1', 'Brand cherry is chrome, never a pin', 'rule', ''],
    ['rules/rule-2', 'One navy for every shadow', 'rule', ''], ['rules/rule-5', 'Focus is shown, never removed', 'rule', 'outline'],
    ['rules/rule-7', 'Springy, never floaty', 'rule', 'animation'], ['overview/numbers', 'Before and after', 'what the refactor changed', 'audit metrics'],
    ['overview/get', 'Download the tokens', 'tokens.css · tokens.json', 'export'],
  ];

  let current = null, cleanups = [];
  function renderNav() {
    const nav = $('#ds-nav'); let g = '';
    nav.innerHTML = VIEWS.map((v) => { const head = v.g !== g ? `<div class="g">${esc(v.g)}</div>` : ''; g = v.g; return `${head}<a href="#${v.id}" data-v="${v.id}"><span class="dot"></span>${esc(v.t)}</a>`; }).join('');
    $('#ds-side-foot').innerHTML = `<div>v1 · D-048 · ${TK.semantic.length} tokens</div><div><a href="../assets/tokens/tokens.css" download>tokens.css</a> · <a href="../assets/tokens/tokens.json" download>tokens.json</a></div>`;
  }
  function parseHash() { const h = decodeURIComponent((location.hash || '').slice(1)); const [v, a] = h.split('/'); return { v: viewById(v) ? v : 'overview', a: a || null }; }
  function go(v, a, push) {
    if (push) { const h = '#' + v + (a ? '/' + a : ''); if (location.hash !== h) history.pushState(null, '', h); }
    const main = $('#ds-main'), view = $('#ds-view');
    if (current !== v) {
      cleanups.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); cleanups = [];
      $$('.pin-goo').forEach((n) => n.remove()); root.classList.remove('ds-slow');
      const V = viewById(v).r();
      view.classList.remove('enter'); view.innerHTML = fixSvgVars(V.html); void view.offsetWidth; if (!reduce()) view.classList.add('enter');
      current = v; main.scrollTo({ top: 0, behavior: 'instant' });
      $$('#ds-nav a').forEach((n) => n.setAttribute('aria-current', n.dataset.v === v ? 'page' : 'false'));
      { const cur = $(`#ds-nav a[data-v="${v}"]`); if (cur) keepIn($('#ds-nav'), cur, 12); }
      if (V.mount) { try { const c = V.mount(view); if (typeof c === 'function') cleanups.push(c); } catch (e) { console.error(e); } }
      doc.title = `${viewById(v).t} — Maraschino design system`;
      $('#ds').classList.remove('nav-open'); $('#ds-menu-btn').setAttribute('aria-expanded', 'false');
      if (!a) { const h1 = $('h1', view); if (h1 && push) h1.focus({ preventScroll: true }); }
    }
    if (a) {
      const t = doc.getElementById(a) || doc.getElementById('t-' + a);
      /* scroll the main column only: scrollIntoView would also scroll the Garrison OS page around this frame */
      if (t) { setTimeout(() => { const mr = main.getBoundingClientRect(), tr = t.getBoundingClientRect();
        const top = main.scrollTop + tr.top - mr.top - (t.tagName === 'TR' ? (mr.height - tr.height) / 2 : 18);
        main.scrollTo({ top: Math.max(0, top), behavior: reduce() ? 'instant' : 'smooth' });
        const f = t.tagName === 'TR' ? t : (t.querySelector('.fig, .states, .live, .dd, .nums, .doors') || t); f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash'); }, 60); }
    }
  }
  /** CSS variables inside SVG presentation attributes aren't honoured everywhere; move them into style */
  function fixSvgVars(html) {
    return html.replace(/<(circle|ellipse|path|line|rect|text|g|stop)\b([^>]*?)(\/?)>/g, (m, tag, attrs, sl) => {
      const moved = [];
      attrs = attrs.replace(/\s(fill|stroke|font-family|stop-color)="([^"]*var\(--[^"]*)"/g, (mm, k, v) => { moved.push(`${k}:${v}`); return ''; });
      if (!moved.length) return m;
      if (/\sstyle="/.test(attrs)) attrs = attrs.replace(/\sstyle="/, ` style="${moved.join(';')};`); else attrs += ` style="${moved.join(';')}"`;
      return `<${tag}${attrs}${sl}>`;
    });
  }

  /* ------------------------------------------------------------------ search */
  let INDEX = [];
  function buildIndex() {
    INDEX = [];
    VIEWS.forEach((v) => INDEX.push({ k: 'Pages', t: v.t, s: v.g, kw: v.kw || '', go: v.id, ic: ic(v.g === 'Components' ? 'box' : v.g === 'Foundations' ? 'ruler' : 'arrow-right', 12) }));
    EXTRA_HITS.forEach(([go, t, s, kw]) => INDEX.push({ k: 'Sections', t, s, kw, go, ic: ic('hash', 12) }));
    MZ.PIN_TYPES.forEach((p) => INDEX.push({ k: 'Parts', t: `${p.label} pin`, s: `${p.color} · ${p.hint}`, kw: 'pin hue ' + p.id, go: 'colour/hue-' + p.id, ic: `<span style="width:12px;height:12px;border-radius:50%;background:${p.color}"></span>` }));
    TK.list.forEach((t) => { const v = t.shown || ''; const isC = /^#|^rgba?\(/.test(v);
      INDEX.push({ k: t.layer === 'semantic' ? 'Tokens' : 'Primitives', t: t.path.replace(/^primitive\./, ''), s: v, kw: (t.css || '') + ' ' + (t.alias || ''), go: 'tokens/' + t.path,
        ic: isC ? `<span style="width:100%;height:100%;background:${esc(v)}"></span>` : ic('braces', 11), copy: t.css ? `var(${t.css})` : v }); });
  }
  const ORDER = ['Pages', 'Sections', 'Parts', 'Tokens', 'Primitives'];
  function search(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean); if (!terms.length) return [];
    const out = [];
    INDEX.forEach((e) => {
      const title = e.t.toLowerCase(), hay = (title + ' ' + (e.s || '') + ' ' + (e.kw || '')).toLowerCase().replace(/[-_.]/g, ' ') + ' ' + title;
      if (!terms.every((w) => hay.includes(w.replace(/[-_.]/g, ' ')) || title.includes(w))) return;
      let sc = 0; terms.forEach((w) => { if (title.startsWith(w)) sc += 4; else if (title.includes(w)) sc += 2; else sc += 1; });
      sc -= ORDER.indexOf(e.k) * 0.6 + title.length / 200; out.push([sc, e]);
    });
    out.sort((a, b) => b[0] - a[0]);
    const lim = { Pages: 4, Sections: 5, Parts: 4, Tokens: 8, Primitives: 5 }, n = {};
    return out.map((x) => x[1]).filter((e) => { n[e.k] = (n[e.k] || 0) + 1; return n[e.k] <= lim[e.k]; });
  }
  function wireSearch() {
    const q = $('#ds-q'), box = $('#ds-results'); let hits = [], sel = 0;
    const mark = (s, terms) => { let h = esc(s); terms.forEach((w) => { if (w.length > 1) h = h.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }); return h; };
    const draw = () => {
      const v = q.value.trim(); if (!v) { box.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
      hits = search(v); sel = 0; const terms = v.toLowerCase().split(/\s+/);
      if (!hits.length) { box.innerHTML = `<div class="empty">Nothing named “${esc(v)}”. Try a role like <b>muted</b>, a part like <b>tray</b>, or a value like <b>#C11717</b>.</div>`; }
      else { let g = ''; box.innerHTML = ORDER.map((k) => { const L = hits.filter((h) => h.k === k); if (!L.length) return '';
        return `<div class="grp">${k}</div>` + L.map((h) => `<button type="button" class="r" role="option" data-i="${hits.indexOf(h)}" aria-selected="false"><span class="ic">${h.ic || ''}</span><span style="min-width:0"><span class="t" style="display:block">${mark(h.t, terms)}</span>${h.s ? `<span class="s" style="display:block">${mark(h.s, terms)}</span>` : ''}</span><span class="v">${h.copy ? 'copy ⏎⇧' : ''}</span></button>`).join(''); }).join(''); void g; }
      box.hidden = false; q.setAttribute('aria-expanded', 'true'); hilite();
    };
    const opts = () => $$('.r', box);
    const hilite = () => { const o = opts(); o.forEach((b) => b.setAttribute('aria-selected', 'false')); const b = o.find((x) => +x.dataset.i === sel) || o[0]; if (b) { b.setAttribute('aria-selected', 'true'); keepIn(box, b); } };
    const choose = (i, withCopy) => { const h = hits[i]; if (!h) return; if (withCopy && h.copy) { copy(h.copy); return; }
      box.hidden = true; q.blur(); const [v, a] = h.go.split('/'); go(v, a ? h.go.slice(v.length + 1) : null, true); };
    q.addEventListener('input', draw); q.addEventListener('focus', () => { if (q.value.trim()) draw(); });
    q.addEventListener('keydown', (e) => {
      const order = opts().map((b) => +b.dataset.i);
      if (e.key === 'ArrowDown') { e.preventDefault(); const k = order.indexOf(sel); sel = order[Math.min(order.length - 1, k + 1)]; hilite(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); const k = order.indexOf(sel); sel = order[Math.max(0, k - 1)]; hilite(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(sel, e.shiftKey); }
      else if (e.key === 'Escape') { if (q.value) { q.value = ''; draw(); } else q.blur(); }
    });
    box.addEventListener('pointerdown', (e) => e.preventDefault());
    box.addEventListener('click', (e) => { const b = e.target.closest('.r'); if (b) choose(+b.dataset.i, e.shiftKey); });
    q.addEventListener('blur', () => setTimeout(() => { box.hidden = true; q.setAttribute('aria-expanded', 'false'); }, 120));
    doc.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName || '')) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); q.focus(); q.select(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); q.select(); }
    });
  }

  /* ------------------------------------------------------------------ boot */
  async function boot() {
    if (!MZ) { $('#ds-view').innerHTML = '<p class="note">The live parts didn’t load.</p>'; return; }
    $('#ds-mark').innerHTML = cherry(22); $('#ds-search-ico').innerHTML = ic('search', 15); $('#ds-menu-btn').innerHTML = ic('menu', 16);
    try { await loadTokens(); } catch (e) { console.error(e); $('#ds-view').innerHTML = `<p class="note">Couldn’t read tokens.json (${esc(e.message)}).</p>`; return; }
    renderNav(); buildIndex(); wireSearch();
    $('#ds-menu-btn').addEventListener('click', () => { const on = !$('#ds').classList.contains('nav-open'); $('#ds').classList.toggle('nav-open', on); $('#ds-menu-btn').setAttribute('aria-expanded', on ? 'true' : 'false'); });
    doc.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (!a || a.hasAttribute('download')) return; e.preventDefault();
      const [v, ...rest] = a.getAttribute('href').slice(1).split('/'); go(viewById(v) ? v : 'overview', rest.join('/') || null, true); });
    window.addEventListener('popstate', () => { const { v, a } = parseHash(); go(v, a, false); });
    window.addEventListener('hashchange', () => { const { v, a } = parseHash(); go(v, a, false); });
    /* in a short window the nav scrolls; a soft edge says there is more below */
    const nav = $('#ds-nav'), more = () => nav.classList.toggle('more', nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2);
    nav.addEventListener('scroll', more, { passive: true }); new ResizeObserver(more).observe(nav);
    const { v, a } = parseHash(); go(v, a, false); more();
    window.MZ_DS = { go, search, TK };
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
