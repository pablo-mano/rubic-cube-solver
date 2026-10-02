// Match six independently rotated camera faces using physical cube constraints.
(function (global) {
  'use strict';
  function rotateFace(face) {
    return [face[6], face[3], face[0], face[7], face[4], face[1], face[8], face[5], face[2]];
  }
  function parity(permutation) {
    let inversions = 0;
    for (let i = 0; i < permutation.length; i++) for (let j = i + 1; j < permutation.length; j++) {
      if (permutation[i] > permutation[j]) inversions++;
    }
    return inversions % 2;
  }
  function isPhysical(state) {
    if (!global.CubeState.validate(state).ok) return false;
    try {
      const cube = global.Cube.fromString(state.join(''));
      // Round-trip rejects unknown or mirrored pieces that the parser can overlook.
      return cube.asString() === state.join('') &&
        new Set(cube.cp).size === 8 && new Set(cube.ep).size === 12 &&
        cube.co.reduce((sum, value) => sum + value, 0) % 3 === 0 &&
        cube.eo.reduce((sum, value) => sum + value, 0) % 2 === 0 &&
        parity(cube.cp) === parity(cube.ep);
    } catch (_) { return false; }
  }
  async function resolve(state, cancelled = () => false) {
    if (!global.CubeState.validate(state).ok) return { kind: 'invalid' };
    const variants = Array.from({ length: 6 }, (_, f) => {
      const rotations = [state.slice(f * 9, f * 9 + 9)];
      for (let i = 1; i < 4; i++) rotations.push(rotateFace(rotations[i - 1]));
      return rotations;
    });
    const matches = new Map();
    for (let combination = 0; combination < 4096; combination++) {
      if (combination % 128 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (cancelled()) return { kind: 'cancelled' };
      }
      let value = combination;
      const rotations = [], candidate = [];
      for (let face = 0; face < 6; face++) {
        const rotation = value % 4; value = Math.floor(value / 4);
        rotations.push(rotation); candidate.push(...variants[face][rotation]);
      }
      if (isPhysical(candidate)) {
        matches.set(candidate.join(''), { state: candidate, rotations });
        // Multiple distinct valid cubes require the user's orientation information.
        if (matches.size > 1) return { kind: 'ambiguous' };
      }
    }
    if (!matches.size) return { kind: 'invalid' };
    return { kind: 'unique', ...matches.values().next().value };
  }
  global.ScanOrientation = { rotateFace, isPhysical, resolve };
})(typeof window !== 'undefined' ? window : globalThis);
