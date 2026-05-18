const path = require('path');
const fs = require('fs');

globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.document = { getElementById: () => null };

function load(p) {
  const code = fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const wrapped = `(function(module){\n${code}\n}).call(globalThis, undefined);`;
  eval(wrapped);
}

load('vendor/cube.js');
load('js/cube-state.js');
load('js/moves.js');
load('js/solver-kociemba.js');
load('js/solver-beginner.js');

function check(cond, msg) {
  console.log((cond ? 'OK ' : 'FAIL ') + msg);
  if (!cond) process.exitCode = 1;
}

const { CubeState, Cube, Moves, SolverKociemba } = globalThis;

// Validation: missing stickers
const partial = CubeState.cleared();
const v1 = CubeState.validate(partial);
check(!v1.ok, 'cleared cube fails validation: ' + v1.reason);

// Validation: extra color
const bad = CubeState.solved().slice();
bad[0] = 'R'; // wrong color
const v2 = CubeState.validate(bad);
check(!v2.ok, 'wrong color count fails validation: ' + v2.reason);

// Solved cube returns empty solution
Cube.initSolver();
SolverKociemba.solve(CubeState.solved()).then((res) => {
  check(res.moves.length === 0, `solved cube returns ${res.moves.length}-move solution`);
});

// Impossible cube (single edge flip) should error gracefully
const flipped = CubeState.solved();
// Flip the UF edge: swap colors at U[7]=7 and F[1]=19
flipped[7] = 'F'; flipped[19] = 'U';
SolverKociemba.solve(flipped).then((res) => {
  check(false, 'impossible cube should throw, but got: ' + res.moves.join(' '));
}).catch((e) => {
  check(true, 'impossible cube throws: ' + e.message);
});
