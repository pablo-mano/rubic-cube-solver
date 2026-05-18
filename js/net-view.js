// Renders the 6-face unfolded net and handles color input (paint + cycle modes).

(function (global) {
  'use strict';

  const FACES = global.CubeState.FACES;
  const COLOR_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']; // tap-cycle order

  function build({ rootNet, palette, getState, setSticker, getMode, getActiveColor, setActiveColor }) {
    rootNet.innerHTML = '';
    palette.innerHTML = '';

    // Palette
    for (const c of COLOR_ORDER) {
      const sw = document.createElement('button');
      sw.className = 'swatch';
      sw.dataset.color = c;
      sw.setAttribute('aria-label', `Color ${c}`);
      sw.addEventListener('click', () => {
        setActiveColor(c);
        refreshPalette();
      });
      palette.appendChild(sw);
    }
    function refreshPalette() {
      const active = getActiveColor();
      palette.querySelectorAll('.swatch').forEach((el) => {
        el.classList.toggle('active', el.dataset.color === active);
      });
    }
    refreshPalette();

    // Net
    for (let f = 0; f < 6; f++) {
      const face = FACES[f];
      const faceEl = document.createElement('div');
      faceEl.className = 'face';
      faceEl.dataset.face = face;
      for (let i = 0; i < 9; i++) {
        const idx = f * 9 + i;
        const st = document.createElement('button');
        st.className = 'sticker';
        st.dataset.index = idx;
        st.dataset.face = face;
        if (i === 4) {
          st.classList.add('center');
          st.dataset.color = face;
          st.disabled = false; // keep clickable so we can ignore gracefully
        }
        faceEl.appendChild(st);
      }
      rootNet.appendChild(faceEl);
    }

    // Pointer handling — single-pointer paint with drag.
    let painting = false;
    let lastPainted = -1;

    function paintAt(target) {
      if (!target || !target.classList || !target.classList.contains('sticker')) return;
      if (target.classList.contains('center')) return;
      const idx = parseInt(target.dataset.index, 10);
      if (idx === lastPainted) return;
      const mode = getMode();
      const cur = getState()[idx] || '';
      let next;
      if (mode === 'cycle') {
        const cur_i = COLOR_ORDER.indexOf(cur);
        next = COLOR_ORDER[(cur_i + 1) % COLOR_ORDER.length];
      } else {
        next = getActiveColor();
      }
      setSticker(idx, next);
      target.dataset.color = next;
      target.classList.remove('flash');
      // re-trigger animation
      void target.offsetWidth;
      target.classList.add('flash');
      lastPainted = idx;
    }

    function pointerDown(e) {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || !t.classList.contains('sticker')) return;
      e.preventDefault();
      painting = true;
      lastPainted = -1;
      paintAt(t);
      try { rootNet.setPointerCapture(e.pointerId); } catch (_) { /* not all browsers */ }
    }
    function pointerMove(e) {
      if (!painting) return;
      // In cycle mode, only act on initial tap (don't cycle on drag).
      if (getMode() === 'cycle') return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      paintAt(t);
    }
    function pointerUp() {
      painting = false;
      lastPainted = -1;
    }

    rootNet.addEventListener('pointerdown', pointerDown);
    rootNet.addEventListener('pointermove', pointerMove);
    rootNet.addEventListener('pointerup', pointerUp);
    rootNet.addEventListener('pointercancel', pointerUp);

    function render(state) {
      rootNet.querySelectorAll('.sticker').forEach((el) => {
        const idx = parseInt(el.dataset.index, 10);
        el.dataset.color = state[idx] || '';
      });
      refreshPalette();
    }

    return { render, refreshPalette };
  }

  global.NetView = { build };

}(typeof window !== 'undefined' ? window : globalThis));
