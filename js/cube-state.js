// 54-sticker cube state, in the order expected by cubejs:
//   U(0..8) R(9..17) F(18..26) D(27..35) L(36..44) B(45..53)
// Each entry is a color id: one of U,R,F,D,L,B (matching the face whose center is that color).
// Index 4 of each face block is the center sticker; never editable.
//
// On a physical cube held white-up / green-front, the conventional color → face mapping is:
//   U = white, D = yellow, F = green, B = blue, L = orange, R = red.

(function (global) {
  'use strict';

  const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
  const FACE_INDEX = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

  function solved() {
    const s = new Array(54);
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 9; i++) s[f * 9 + i] = FACES[f];
    }
    return s;
  }

  function cleared() {
    const s = new Array(54).fill('');
    // Centers always set.
    for (let f = 0; f < 6; f++) s[f * 9 + 4] = FACES[f];
    return s;
  }

  function isCenter(idx) {
    return idx % 9 === 4;
  }

  function faceOf(idx) {
    return FACES[Math.floor(idx / 9)];
  }

  function toString(state) {
    // cubejs uses 54-char string with letters U/R/F/D/L/B (one per sticker).
    return state.join('');
  }

  function fromString(str) {
    if (typeof str !== 'string' || str.length !== 54) throw new Error('expected 54-char state');
    const out = new Array(54);
    for (let i = 0; i < 54; i++) out[i] = str[i];
    return out;
  }

  // Validity: every color appears exactly 9 times, centers correct, all stickers filled.
  // Deeper parity / piece validity is left to the Kociemba solver, which returns "Error"
  // for an unsolvable cube — we catch that and surface a clear message.
  function validate(state) {
    const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
    for (let i = 0; i < 54; i++) {
      const c = state[i];
      if (!c) return { ok: false, reason: 'Some stickers are not yet filled in.' };
      if (!(c in counts)) return { ok: false, reason: 'Unknown color at sticker ' + i + '.' };
      counts[c]++;
      if (isCenter(i) && c !== faceOf(i)) {
        return { ok: false, reason: 'Center stickers must keep their face color.' };
      }
    }
    for (const f of FACES) {
      if (counts[f] !== 9) {
        return { ok: false, reason: `Color ${f} appears ${counts[f]} times — expected 9.` };
      }
    }
    return { ok: true };
  }

  global.CubeState = {
    FACES, FACE_INDEX,
    solved, cleared, isCenter, faceOf, toString, fromString, validate,
  };

}(typeof window !== 'undefined' ? window : globalThis));
