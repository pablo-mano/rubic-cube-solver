// Run with: node tests/test-solver-init.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/solver-kociemba.js'), 'utf8');
(async () => {
  let attempts = 0;
  const context = vm.createContext({ setTimeout, clearTimeout, Cube: { initSolver() {
    if (++attempts === 1) throw new Error('Table initialization failed');
  } } });
  vm.runInContext(source, context);
  await assert.rejects(context.SolverKociemba.ensureSolver(), /Table initialization failed/);
  assert.equal(context.SolverKociemba.isInitialized(), false);
  await context.SolverKociemba.ensureSolver();
  assert.equal(context.SolverKociemba.isInitialized(), true);
  assert.equal(attempts, 2);
  console.log('OK: failed initialization is reported and can be retried');

  let workers = 0;
  class Worker {
    constructor(url) { assert.equal(url, 'https://example.com/cube/js/solver-worker.js'); this.number = ++workers; }
    postMessage({ id }) {
      setTimeout(() => this.onmessage({ data: this.number === 1
        ? { id, error: 'Worker initialization failed' } : { id, result: null } }), 0);
    }
    terminate() { this.terminated = true; }
  }
  const browser = vm.createContext({ Worker, URL, setTimeout, clearTimeout,
    document: { currentScript: { src: 'https://example.com/cube/js/solver-kociemba.js' } } });
  vm.runInContext(source, browser);
  await assert.rejects(browser.SolverKociemba.ensureSolver(), /Worker initialization failed/);
  assert.equal(browser.SolverKociemba.isInitialized(), false);
  await Promise.all([browser.SolverKociemba.ensureSolver(), browser.SolverKociemba.ensureSolver()]);
  assert.equal(workers, 2);
  assert.equal(browser.SolverKociemba.isInitialized(), true);
  console.log('OK: worker errors reset initialization; retry shares a fresh worker');
})();
