// "Step-by-step" solver. Runs the same Kociemba algorithm as the optimal mode
// and splits the resulting move sequence at natural phase boundaries with
// human-readable labels, so the user can follow along in chunks.
//
// Kociemba's two-phase algorithm has two stages:
//   Phase 1 — reach the subgroup G1 (edge orientation correct, E-slice edges
//             placed in E-slice, corner orientation correct).
//             Uses any of the 18 moves.
//   Phase 2 — solve the cube using only U, U', U2, D, D', D2, L2, R2, F2, B2
//             (10 moves total).
//
// We detect the boundary by scanning the solution for the index from which all
// remaining moves are phase-2 moves. We further sub-chunk each phase into
// shorter groups (~5 moves) so the user can pause and apply them one chunk at
// a time on a physical cube.

(function (global) {
  'use strict';

  const PHASE2 = new Set(['U', "U'", 'U2', 'D', "D'", 'D2', 'L2', 'R2', 'F2', 'B2']);

  function findPhaseBoundary(moves) {
    // Largest k such that moves[k..] are all PHASE2 moves.
    for (let k = 0; k <= moves.length; k++) {
      let ok = true;
      for (let i = k; i < moves.length; i++) {
        if (!PHASE2.has(moves[i])) { ok = false; break; }
      }
      if (ok) return k;
    }
    return moves.length;
  }

  function chunkRange(start, end, chunkSize, baseLabel, boundaries) {
    const len = end - start;
    if (len <= 0) return;
    const chunks = Math.max(1, Math.ceil(len / chunkSize));
    // distribute roughly evenly
    const sz = Math.ceil(len / chunks);
    let n = 1;
    for (let i = start; i < end; i += sz) {
      boundaries.push({ at: i, label: `${baseLabel} (part ${n}/${chunks})` });
      n++;
    }
  }

  async function solve(state) {
    // Delegate to the Kociemba solver (which already handles validation and
    // unsolvable-cube detection), then split the result into phases.
    const result = await global.SolverKociemba.solve(state);
    const moves = result.moves;
    if (moves.length === 0) return { moves: [], stepBoundaries: [], label: 'Already solved' };

    const boundary = findPhaseBoundary(moves);
    const stepBoundaries = [];
    if (boundary > 0) {
      chunkRange(0, boundary, 5, 'Phase 1: orient pieces', stepBoundaries);
    }
    if (boundary < moves.length) {
      chunkRange(boundary, moves.length, 5, 'Phase 2: permute layers', stepBoundaries);
    }

    return {
      moves,
      stepBoundaries,
      label: 'Step-by-step (two-phase)',
    };
  }

  global.SolverBeginner = { solve };

}(typeof window !== 'undefined' ? window : globalThis));
