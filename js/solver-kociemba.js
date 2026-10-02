// Wraps the bundled cubejs Kociemba two-phase solver.

(function (global) {
  'use strict';

  let initialized = false;
  let initPromise = null;

  // Browser computations run off the UI thread; Node and the worker use Cube directly.
  const useWorker = typeof global.Worker === 'function' && typeof document !== 'undefined';
  const workerURL = useWorker
    ? new URL('solver-worker.js', document.currentScript.src).href : null;
  let worker = null;
  let nextId = 0;
  const pending = new Map();

  function resetWorker(error) {
    if (worker) worker.terminate();
    worker = null;
    initialized = false;
    initPromise = null;
    for (const task of pending.values()) {
      clearTimeout(task.timer);
      task.reject(error);
    }
    pending.clear();
  }

  function request(action, state) {
    return new Promise((resolve, reject) => {
      if (!worker) {
        try { worker = new global.Worker(workerURL); }
        catch (error) { reject(new Error('Could not start the solver worker. Reload the page and try again.')); return; }
        worker.onmessage = ({ data }) => {
          const task = pending.get(data.id);
          if (!task) return;
          clearTimeout(task.timer);
          pending.delete(data.id);
          if (data.error) {
            task.reject(new Error(data.error));
            if (task.action === 'init') resetWorker(new Error(data.error));
          } else task.resolve(data.result);
        };
        worker.onerror = event => {
          event.preventDefault();
          resetWorker(new Error('Solver worker failed. Reload the page to refresh offline files, then try again.'));
        };
        worker.onmessageerror = () => resetWorker(new Error('Could not read the solver result. Please try again.'));
      }
      const id = ++nextId;
      const timer = setTimeout(() => resetWorker(new Error(
        action === 'init' ? 'Solver initialization took too long. Keep Safari open and try again.'
          : 'Solving took too long. Check the cube colors and try again.'
      )), action === 'init' ? 120000 : 60000);
      pending.set(id, { resolve, reject, timer, action });
      try { worker.postMessage({ id, action, state }); }
      catch (error) { resetWorker(new Error('Could not send the cube to the solver. Please try again.')); }
    });
  }

  function ensureSolver() {
    if (initialized) return Promise.resolve();
    if (initPromise) return initPromise;
    initPromise = (useWorker ? request('init') : new Promise((resolve, reject) => {
      setTimeout(() => {
        try { global.Cube.initSolver(); resolve(); }
        catch (error) { reject(error); }
      }, 30);
    })).then(() => { initialized = true; }).catch(error => {
      initialized = false;
      initPromise = null;
      throw error;
    });
    return initPromise;
  }

  const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

  async function solve(state) {
    const str = state.join('');
    if (str === SOLVED) {
      return { moves: [], label: 'Already solved', stepBoundaries: [] };
    }
    await ensureSolver();
    if (useWorker) return request('solve', state);
    let cube;
    try {
      cube = global.Cube.fromString(str);
    } catch (e) {
      throw new Error('Invalid cube — check that opposite stickers and piece colors are correct.');
    }
    let solution;
    try {
      solution = cube.solve();
    } catch (e) {
      throw new Error('This cube cannot be solved — likely a wrong sticker or a physically impossible coloring.');
    }
    if (!solution || typeof solution !== 'string') {
      throw new Error('Solver returned no solution.');
    }
    const moves = solution.trim().split(/\s+/).filter(Boolean);

    // Verify the solution actually solves the cube. cubejs doesn't reject some
    // physically impossible permutations (single edge flip, corner twist, edge swap),
    // so we catch them here.
    const check = global.Cube.fromString(str);
    check.move(moves.join(' '));
    if (check.asString() !== SOLVED) {
      throw new Error('This cube cannot be solved — please double-check your colors. Common mistakes: a single edge flipped, two corners swapped, or two edges swapped.');
    }
    return {
      moves,
      label: 'Compact solution',
      stepBoundaries: [],
    };
  }

  global.SolverKociemba = { solve, ensureSolver, isInitialized: () => initialized };

}(typeof window !== 'undefined' ? window : globalThis));
