// Node-based sanity tests. Run with: node tests/test-node.js
// We polyfill `window` so the browser-style libs work in node.

const path = require('path');
const fs = require('fs');

// Browser-style globals
const globalThis_ = globalThis;
globalThis_.window = globalThis_;
globalThis_.self = globalThis_;
globalThis_.document = { getElementById: () => null };

function load(p) {
  const code = fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  // strip CommonJS export at end of vendor/cube.js (uses `module.exports = Cube`)
  // Our cube.js IIFE already exposes window.Cube as fallback, so it should be OK
  // when `module` is undefined. Make module undefined just in case:
  const wrapped = `(function(module){\n${code}\n}).call(globalThis, undefined);`;
  // eslint-disable-next-line no-eval
  eval(wrapped);
}

load('vendor/cube.js');
load('js/cube-state.js');
load('js/moves.js');
load('js/solver-kociemba.js');
load('js/solver-beginner.js');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('OK:', msg);
}

const Cube = globalThis.Cube;
const CubeState = globalThis.CubeState;
const Moves = globalThis.Moves;

// Test 1: solved cube → string check
const solved = CubeState.solved();
const solvedStr = solved.join('');
assert(solvedStr === 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
       'solved state string correct');

// Test 2: applying scramble then inverse returns to solved
const scramble = "R U R' U' R U2 R' U F R U R' U' F'";
const inv = Moves.inverse(scramble);
const s1 = Moves.applySequence(solved, scramble);
const s2 = Moves.applySequence(s1, inv);
assert(s2.join('') === solvedStr, 'scramble + inverse = solved');

// Test 3: random scramble, validate, then solve with Kociemba
console.log('Initializing Kociemba solver tables...');
Cube.initSolver();
console.log('done.');

for (let trial = 0; trial < 3; trial++) {
  const scr = Moves.randomScramble(20);
  const state = Moves.applySequence(solved, scr);
  const v = CubeState.validate(state);
  assert(v.ok, `trial ${trial}: scrambled cube validates`);
  // solve
  const cube = Cube.fromString(state.join(''));
  const sol = cube.solve();
  const after = Moves.applySequence(state, sol);
  assert(after.join('') === solvedStr,
         `trial ${trial}: Kociemba solution (${sol.split(' ').length} moves) returns to solved`);
}

// Test 4: beginner solver
for (let trial = 0; trial < 3; trial++) {
  const scr = Moves.randomScramble(20);
  const state = Moves.applySequence(solved, scr);
  try {
    const Beginner = globalThis.SolverBeginner;
    Beginner.solve(state).then((res) => {
      const moves = res.moves.join(' ');
      const after = Moves.applySequence(state, moves);
      assert(after.join('') === solvedStr,
             `trial ${trial}: Beginner solution (${res.moves.length} moves) returns to solved`);
    }).catch((e) => assert(false, `trial ${trial}: beginner error: ${e.message}`));
  } catch (e) {
    assert(false, `trial ${trial}: beginner threw: ${e.message}`);
  }
}
