/* ── Pixel wipe page transition ─────────────────────────────────────────
   Red chunky blocks scatter-wipe left→right with jagged edges on both
   sides of the wave front — like the reference image.
──────────────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const BLOCK   = 120;   // px per square
  const DEFAULT_COLOR = '#cc0000';
  const STAGGER = 35;    // ms per column (controls wave speed)
  const JITTER  = 120;   // ms random spread — creates ragged edges both sides

  function makeGrid(color) {
    const cols = Math.ceil(window.innerWidth  / BLOCK) + 1;
    const rows = Math.ceil(window.innerHeight / BLOCK) + 1;

    const overlay = document.createElement('div');
    overlay.id = 'px-overlay';
    Object.assign(overlay.style, {
      position:      'fixed',
      inset:         '0',
      zIndex:        '999999',
      pointerEvents: 'none',
      overflow:      'hidden',
    });

    const cells = [];
    for (let c = 0; c < cols; c++) {
      cells[c] = [];
      for (let r = 0; r < rows; r++) {
        const cell = document.createElement('div');
        Object.assign(cell.style, {
          position:   'absolute',
          left:       (c * BLOCK) + 'px',
          top:        (r * BLOCK) + 'px',
          width:      BLOCK + 'px',
          height:     BLOCK + 'px',
          background: color,
          opacity:    '0',
          // no CSS transition — we use setTimeout for instant snap
        });
        overlay.appendChild(cell);
        cells[c][r] = cell;
      }
    }

    return { overlay, cells, cols, rows };
  }

  function buildDelays(cols, rows, stagger, jitter) {
    const delays = [];
    for (let c = 0; c < cols; c++) {
      delays[c] = [];
      for (let r = 0; r < rows; r++) {
        const base  = c * stagger;
        const j = (Math.random() - 0.5) * jitter;
        delays[c][r] = Math.max(0, base + j);
      }
    }
    return delays;
  }

  function animateCells(cells, cols, rows, targetOpacity, onDone, stagger, jitter) {
    const delays = buildDelays(cols, rows, stagger ?? STAGGER, jitter ?? JITTER);
    let maxDelay = 0;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const d = delays[c][r];
        if (d > maxDelay) maxDelay = d;
        const cell = cells[c][r];
        setTimeout(() => { cell.style.opacity = targetOpacity; }, d);
      }
    }

    setTimeout(onDone, maxDelay + 60);
  }

  /* ── Exit: scatter-wipe fill, then navigate ─────────────────────────── */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href
      || href.startsWith('#')
      || href.startsWith('http')
      || href.startsWith('mailto')
      || href.startsWith('tel')
      || href.endsWith('.pdf')
      || a.target === '_blank') return;

    e.preventDefault();

    const raw   = a.dataset.transitionColor || DEFAULT_COLOR;
    // resolve theme-aware tokens at click time
    const color = raw === '--c-text'
      ? getComputedStyle(document.documentElement).getPropertyValue('--c-text').trim()
      : raw;
    const { overlay, cells, cols, rows } = makeGrid(color);
    overlay.style.pointerEvents = 'all';
    document.body.appendChild(overlay);
    overlay.getBoundingClientRect();

    animateCells(cells, cols, rows, '1', () => {
      sessionStorage.setItem('px-transition', '1');
      sessionStorage.setItem('px-color', color);
      window.location.href = href;
    });
  }, true);

  /* ── Enter: scatter-wipe clear on page load ─────────────────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('px-transition')) return;
    sessionStorage.removeItem('px-transition');
    const color = sessionStorage.getItem('px-color') || DEFAULT_COLOR;
    sessionStorage.removeItem('px-color');

    const { overlay, cells, cols, rows } = makeGrid(color);
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++)
        cells[c][r].style.opacity = '1';

    overlay.style.pointerEvents = 'all';
    document.body.appendChild(overlay);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.style.pointerEvents = 'none';
      animateCells(cells, cols, rows, '0', () => overlay.remove());
    }));
  });

  /* ── Back/forward: bfcache restore ──────────────────────────────────── */
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    const existing = document.getElementById('px-overlay');
    if (existing) existing.remove();
    const { overlay, cells, cols, rows } = makeGrid('#ffffff');
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++)
        cells[c][r].style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.style.pointerEvents = 'none';
      animateCells(cells, cols, rows, '0', () => overlay.remove(), 45, 140);
    }));
  });

})();
