// Run with: node tests/test-scan-orientation.js
const assert = require('node:assert/strict');
globalThis.Cube = require('../vendor/cube.js');
require('../js/cube-state.js');
require('../js/scan-orientation.js');
const { rotateFace, isPhysical, resolve } = globalThis.ScanOrientation;
(async () => {
  const grid = [0,1,2,3,4,5,6,7,8];
  assert.deepEqual(rotateFace(grid), [6,3,0,7,4,1,8,5,2]);
  assert.deepEqual(rotateFace(rotateFace(rotateFace(rotateFace(grid)))), grid);
  console.log('OK: clockwise face rotation preserves sticker positions');
  for (let trial = 0; trial < 12; trial++) {
    const cube = new Cube();
    const moves = ['R', 'U', "F'", 'D2', 'L', 'B2'];
    cube.move(Array.from({length: 22}, (_, i) => moves[(i * 5 + trial + Math.floor(i / 3)) % 6]).join(' '));
    const original = cube.asString().split('');
    const scanned = Array.from({length:6}, (_, f) => {
      let face = original.slice(f * 9, f * 9 + 9);
      for (let turn = 0; turn < (trial + f * 3) % 4; turn++) face = rotateFace(face);
      return face;
    }).flat();
    const result = await resolve(scanned);
    assert(['unique', 'ambiguous'].includes(result.kind));
    if (result.kind === 'unique') assert.deepEqual(result.state, original);
  }
  console.log('OK: independently rotated scrambled faces recover the original cube or report ambiguity');
  const ambiguous = new Cube(); ambiguous.move('R');
  assert.equal((await resolve(ambiguous.asString().split(''))).kind, 'ambiguous');
  console.log('OK: distinct valid arrangements are reported rather than guessed');
  const solved = CubeState.solved();
  assert.equal((await resolve(solved)).kind, 'unique');
  const flip = solved.slice(); [flip[7], flip[19]] = [flip[19], flip[7]];
  assert.equal(isPhysical(flip), false);
  assert.equal((await resolve(flip)).kind, 'invalid');
  const twist = solved.slice(); [twist[8],twist[9],twist[20]] = [twist[9],twist[20],twist[8]];
  assert.equal(isPhysical(twist), false);
  const swap = solved.slice(); [swap[10],swap[19]] = [swap[19],swap[10]];
  assert.equal(isPhysical(swap), false);
  console.log('OK: edge flips, corner twists, and permutation parity are rejected');
  assert.equal((await resolve(solved, () => true)).kind, 'cancelled');
  const bad = solved.slice();bad[0]='R';assert.equal((await resolve(bad)).kind,'invalid');
  console.log('OK: cancellation and incorrect color counts are handled');
})().catch(error => { console.error(error);process.exitCode=1; });
