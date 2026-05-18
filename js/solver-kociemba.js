// Wraps the bundled cubejs Kociemba two-phase solver.

(function (global) {
  'use strict';

  let initialized = false;
  let initPromise = null;

  // initSolver() builds the pruning + move tables. It's CPU-heavy (~1-2s) so we
  // run it once, lazily.
  function ensureSolver() {
    if (initialized) return Promise.resolve();
    if (initPromise) return initPromise;
    initPromise = new Promise((resolve) => {
      // Defer to a macrotask so the UI can show a status message first.
      setTimeout(() => {
        try {
          global.Cube.initSolver();
          initialized = true;
          resolve();
        } catch (e) {
          // Even on failure mark as initialized so we don't retry forever
          initialized = true;
          resolve();
        }
      }, 30);
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
