// App bootstrap: wires UI to cube state, net view, 3D preview, solvers, player.

(function () {
  'use strict';

  // ---- state ----
  let state = window.CubeState.solved();
  let activeColor = 'F';      // for paint mode
  let inputMode = 'paint';    // 'paint' | 'cycle'
  let solverMode = 'kociemba';

  // ---- DOM refs ----
  const $ = (id) => document.getElementById(id);
  const netEl = $('net');
  const paletteEl = $('palette');
  const cube3dStage = $('cube3d-stage');
  const statusEl = $('status');
  const solutionEl = $('solution');
  const movesEl = $('moves');
  const stepLabelEl = $('step-label');
  const metaEl = $('solution-meta');
  const helpDialog = $('help-dialog');

  // ---- subviews ----
  const cube3d = window.Cube3D.build(cube3dStage);
  const netView = window.NetView.build({
    rootNet: netEl,
    palette: paletteEl,
    getState: () => state,
    setSticker: (idx, color) => {
      if (window.CubeState.isCenter(idx)) return;
      state = state.slice();
      state[idx] = color;
      cube3d.render(state);
      // any sticker edit invalidates a previous solution
      player.clear();
      hideSolution();
      setStatus('');
    },
    getMode: () => inputMode,
    getActiveColor: () => activeColor,
    setActiveColor: (c) => { activeColor = c; },
  });

  const player = window.SolutionPlayer.build({
    container: solutionEl,
    movesEl,
    stepLabelEl,
    metaEl,
    btnFirst: $('btn-first'),
    btnPrev: $('btn-prev'),
    btnPlay: $('btn-play'),
    btnNext: $('btn-next'),
    btnLast: $('btn-last'),
    speedEl: $('speed'),
    onMoveApply: (renderState) => {
      cube3d.render(renderState);
    },
    getInitialState: () => initialStateForPlayback,
  });
  let initialStateForPlayback = state.slice();

  // ---- input mode segmented control ----
  document.querySelectorAll('.seg-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn[data-mode]').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      inputMode = btn.dataset.mode;
      // Show/hide palette based on mode for clarity
      paletteEl.style.opacity = (inputMode === 'paint') ? '1' : '0.35';
    });
  });

  document.querySelectorAll('.seg-btn[data-solver]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn[data-solver]').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      solverMode = btn.dataset.solver;
      hideSolution();
      setStatus('');
    });
  });

  // ---- action buttons ----
  $('btn-reset').addEventListener('click', () => {
    state = window.CubeState.solved();
    cube3d.render(state);
    netView.render(state);
    player.clear();
    hideSolution();
    setStatus('');
  });

  $('btn-clear').addEventListener('click', () => {
    state = window.CubeState.cleared();
    cube3d.render(state);
    netView.render(state);
    player.clear();
    hideSolution();
    setStatus('');
  });

  $('btn-scramble').addEventListener('click', () => {
    state = window.CubeState.solved();
    const scramble = window.Moves.randomScramble(22);
    state = window.Moves.applySequence(state, scramble);
    cube3d.render(state);
    netView.render(state);
    player.clear();
    hideSolution();
    setStatus('Scrambled — tap Solve.');
  });

  $('btn-solve').addEventListener('click', solve);

  $('help-btn').addEventListener('click', () => helpDialog.showModal());

  // ---- solving ----
  async function solve() {
    hideSolution();
    setStatus('');
    const v = window.CubeState.validate(state);
    if (!v.ok) { setStatus(v.reason, true); return; }

    initialStateForPlayback = state.slice();
    setStatus(solverMode === 'kociemba' && !window.SolverKociemba.isInitialized()
      ? 'Initializing solver (one-time, ~1–2s)…'
      : 'Solving…');
    $('btn-solve').disabled = true;
    try {
      const result = solverMode === 'kociemba'
        ? await window.SolverKociemba.solve(state)
        : await window.SolverBeginner.solve(state);
      if (!result.moves || result.moves.length === 0) {
        setStatus('Cube is already solved.');
        return;
      }
      player.setSolution(result);
      showSolution();
      setStatus(`Solution found — ${result.moves.length} moves.`);
    } catch (e) {
      setStatus(e.message || String(e), true);
    } finally {
      $('btn-solve').disabled = false;
    }
  }

  function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('error', !!isError);
  }
  function showSolution() { solutionEl.hidden = false; }
  function hideSolution() { solutionEl.hidden = true; player.clear(); }

  // initial render
  cube3d.render(state);
  netView.render(state);
})();
