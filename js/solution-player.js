// Renders a list of move chips, supports step labels, and animates playback
// by advancing through moves on a cube state copy (rendered via Cube3D).

(function (global) {
  'use strict';

  function build({
    container,
    movesEl,
    stepLabelEl,
    metaEl,
    btnFirst, btnPrev, btnPlay, btnNext, btnLast,
    speedEl,
    onMoveApply,         // fn(stateCopy, moveIndex) — caller renders 3D
    getInitialState,     // fn() → 54-char array (cube state to start playback from)
  }) {
    let moves = [];
    let stepBoundaries = [];
    let cursor = 0;       // moves[0..cursor-1] applied
    let playing = false;
    let timer = null;
    let metaText = '';

    function setSolution({ moves: m, stepBoundaries: sb = [], label = '' }) {
      moves = m.slice();
      stepBoundaries = sb.slice();
      cursor = 0;
      metaText = `${label} — ${m.length} moves`;
      render();
      apply();
    }

    function clear() {
      moves = [];
      stepBoundaries = [];
      cursor = 0;
      metaText = '';
      stopPlay();
      render();
    }

    function render() {
      metaEl.textContent = metaText;
      movesEl.innerHTML = '';

      // Step markers as separators inside the moves list.
      const boundaryAt = new Map();
      for (const b of stepBoundaries) boundaryAt.set(b.at, b.label);

      const insertBoundary = (label, key) => {
        const sep = document.createElement('div');
        sep.className = 'move-chip step-sep';
        sep.textContent = label;
        sep.dataset.boundaryKey = key;
        movesEl.appendChild(sep);
      };

      if (boundaryAt.has(0)) insertBoundary(boundaryAt.get(0), '0');

      moves.forEach((m, i) => {
        const chip = document.createElement('span');
        chip.className = 'move-chip';
        chip.dataset.idx = i;
        chip.textContent = m;
        if (i < cursor) chip.classList.add('done');
        if (i === cursor) chip.classList.add('current');
        movesEl.appendChild(chip);
        if (boundaryAt.has(i + 1)) insertBoundary(boundaryAt.get(i + 1), String(i + 1));
      });

      // Step label above
      let activeStep = '';
      let lastSeen = '';
      for (const b of stepBoundaries) {
        if (b.at <= cursor) lastSeen = b.label;
      }
      activeStep = lastSeen;
      stepLabelEl.textContent = activeStep;

      btnPlay.textContent = playing ? '⏸' : '▶';
    }

    function apply() {
      const state = getInitialState().slice();
      for (let i = 0; i < cursor; i++) {
        try { global.Moves.applyMove(state, moves[i]); } catch (_) { /* ignore bad move */ }
      }
      // Re-apply via Moves' batched method for accuracy
      // (the above is incremental which is fine)
      onMoveApply(state, cursor);
    }

    function gotoFirst() { stopPlay(); cursor = 0; render(); apply(); }
    function gotoPrev()  { stopPlay(); if (cursor > 0) cursor--; render(); apply(); }
    function gotoNext()  { if (cursor < moves.length) cursor++; render(); apply(); }
    function gotoLast()  { stopPlay(); cursor = moves.length; render(); apply(); }

    function startPlay() {
      if (playing) return;
      if (cursor >= moves.length) cursor = 0;
      playing = true;
      render();
      const tick = () => {
        if (!playing) return;
        if (cursor >= moves.length) { stopPlay(); render(); return; }
        gotoNext();
        timer = setTimeout(tick, parseInt(speedEl.value, 10));
      };
      timer = setTimeout(tick, parseInt(speedEl.value, 10));
    }
    function stopPlay() {
      playing = false;
      if (timer) { clearTimeout(timer); timer = null; }
      render();
    }

    btnFirst.addEventListener('click', gotoFirst);
    btnPrev.addEventListener('click', gotoPrev);
    btnNext.addEventListener('click', gotoNext);
    btnLast.addEventListener('click', gotoLast);
    btnPlay.addEventListener('click', () => playing ? stopPlay() : startPlay());

    // Tap on chip to jump there
    movesEl.addEventListener('click', (e) => {
      const t = e.target.closest('.move-chip');
      if (!t || t.classList.contains('step-sep')) return;
      const idx = parseInt(t.dataset.idx, 10);
      if (isNaN(idx)) return;
      stopPlay();
      cursor = idx + 1; // tapping a chip applies up to and including that move
      render(); apply();
    });

    return { setSolution, clear, getCursor: () => cursor, getMoves: () => moves };
  }

  global.SolutionPlayer = { build };

}(typeof window !== 'undefined' ? window : globalThis));
