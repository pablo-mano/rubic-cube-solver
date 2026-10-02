// Run with: node tests/test-camera.js
const assert = require('node:assert/strict');
require('../js/camera-scan.js');
const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
const rgb = { U: [240, 240, 240], R: [210, 35, 30], F: [20, 170, 65], D: [240, 210, 15], L: [245, 120, 20], B: [25, 70, 205] };
// Each face contains every color, with fixed centers and varying brightness.
const expected = faces.flatMap((face, f) => Array.from({ length: 9 }, (_, i) => i === 4 ? face : faces[(f + i) % 6]));
const samples = faces.map((_, f) => Array.from({ length: 9 }, (_, i) => {
  const brightness = i === 4 ? 1 : 0.55 + i * 0.04;
  return rgb[expected[f * 9 + i]].map(v => v * brightness);
}));
assert.deepEqual(globalThis.CameraScan.classify(samples), expected);
console.log('OK: center-calibrated classification distinguishes six colors despite brightness changes');
assert.deepEqual(globalThis.CameraScan.classify(samples).filter((_, i) => i % 9 === 4), faces);
console.log('OK: center stickers preserve the face mapping');
