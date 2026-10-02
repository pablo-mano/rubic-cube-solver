// Loaded relative to the solver script, including under a GitHub Pages subpath.
importScripts('../vendor/cube.js', 'solver-kociemba.js');
self.onmessage = async ({ data }) => {
  const { id, action, state } = data;
  try {
    if (action === 'init') {
      await self.SolverKociemba.ensureSolver();
      self.postMessage({ id, result: null });
    } else if (action === 'solve') {
      const result = await self.SolverKociemba.solve(state);
      self.postMessage({ id, result });
    } else throw new Error('Unknown solver request.');
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
