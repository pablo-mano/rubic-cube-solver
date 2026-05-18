// Move application + parsing. We delegate sticker permutation to cubejs so we
// don't have to maintain our own (error-prone) permutation tables.

(function (global) {
  'use strict';

  function applySequence(state, sequence) {
    if (!sequence || !sequence.trim()) return state.slice();
    const cube = global.Cube.fromString(state.join(''));
    cube.move(sequence);
    return cube.asString().split('');
  }

  function applyMove(state, move) {
    return applySequence(state, move);
  }

  function parse(seq) {
    return seq.trim().split(/\s+/).filter(Boolean);
  }

  function format(moves) {
    return Array.isArray(moves) ? moves.join(' ') : moves;
  }

  function inverse(seq) {
    const moves = parse(seq);
    const out = [];
    for (let i = moves.length - 1; i >= 0; i--) {
      const m = moves[i];
      if (m.endsWith("'")) out.push(m[0]);
      else if (m.endsWith('2')) out.push(m);
      else out.push(m + "'");
    }
    return out.join(' ');
  }

  function randomScramble(length) {
    length = length || 20;
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
    const suffixes = ['', "'", '2'];
    const out = [];
    let last = '';
    for (let i = 0; i < length; i++) {
      let f;
      do { f = faces[(Math.random() * 6) | 0]; } while (f === last);
      last = f;
      out.push(f + suffixes[(Math.random() * 3) | 0]);
    }
    return out.join(' ');
  }

  global.Moves = { applyMove, applySequence, parse, format, inverse, randomScramble };

}(typeof window !== 'undefined' ? window : globalThis));
