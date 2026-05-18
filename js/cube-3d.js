// Lightweight CSS-3D cube preview. Six faces, each a 3x3 sticker grid, positioned
// in 3D space. The whole cube rotates with touch drag. Re-renders from the
// 54-sticker state on every change. No three.js dependency.

(function (global) {
  'use strict';

  const FACES = global.CubeState.FACES;

  // Net→Face mapping: for each face, which sticker indices of THAT face appear
  // at each 3x3 slot of the rendered face (looking at the face from outside).
  // In our state model the index ordering already matches "looking at the face
  // from outside", so we just map slot i → state index (face*9 + i).

  function build(stage) {
    stage.innerHTML = '';
    const cube = document.createElement('div');
    cube.className = 'cube3d';
    stage.appendChild(cube);

    const size = stage.clientWidth || 220;
    const half = size / 2;

    // Build 6 face elements
    const faceEls = {};
    for (const face of FACES) {
      const fEl = document.createElement('div');
      fEl.className = 'face3d';
      fEl.dataset.face = face;
      // 9 sticker squares
      for (let i = 0; i < 9; i++) {
        const s = document.createElement('div');
        s.className = 'sticker3d';
        fEl.appendChild(s);
      }
      cube.appendChild(fEl);
      faceEls[face] = fEl;
    }

    // Position faces in 3D
    // The cube occupies a box of side `size`, centered at origin of stage's
    // transform space. Each face is translated by ±half along its normal,
    // then rotated to face outward.
    function setFaceTransform(face, transform) {
      faceEls[face].style.transform = transform;
    }
    setFaceTransform('U', `rotateX(90deg)  translateZ(${half}px)`);
    setFaceTransform('D', `rotateX(-90deg) translateZ(${half}px)`);
    setFaceTransform('F', `rotateY(0deg)   translateZ(${half}px)`);
    setFaceTransform('B', `rotateY(180deg) translateZ(${half}px)`);
    setFaceTransform('L', `rotateY(-90deg) translateZ(${half}px)`);
    setFaceTransform('R', `rotateY(90deg)  translateZ(${half}px)`);

    // For each face the inner 3x3 grid is naturally drawn "from the outside" thanks
    // to the rotateY/rotateX above. BUT the sticker order needs to match the
    // viewer's perspective.
    //
    // Our state convention (looking at the face from outside):
    //   U with back at top, F front at bottom — but CSS rotateX(90deg) puts U
    //     so that the original "front" of the div becomes the bottom edge of
    //     the rendered top, meaning what we see at the bottom of U is row 2
    //     of our index ordering. That matches: U[6..8] is the front row.
    //   For B, rotateY(180deg) mirrors horizontally — so we need to flip the
    //     column order for the rendered face.
    //   Same considerations for D depending on rotation direction.
    //
    // We render index → slot mapping per face. `slotOrder[face]` lists the
    // state-row-major indices in the order the CSS grid expects them.

    const slotOrder = {
      U: [0,1,2,3,4,5,6,7,8],
      D: [0,1,2,3,4,5,6,7,8],
      F: [0,1,2,3,4,5,6,7,8],
      L: [0,1,2,3,4,5,6,7,8],
      R: [0,1,2,3,4,5,6,7,8],
      // B is rotated 180° about Y; CSS mirrors horizontally so we flip columns:
      B: [2,1,0, 5,4,3, 8,7,6],
    };

    // Rotation state (mouse / touch drag)
    let rx = -25, ry = -30;
    cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;

    let dragging = false;
    let lastX = 0, lastY = 0;

    function onDown(e) {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      ry += dx * 0.5;
      rx -= dy * 0.5;
      rx = Math.max(-89, Math.min(89, rx));
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
    function onUp() { dragging = false; }
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);

    function colorVar(c) {
      return c ? `var(--c-${c})` : '#2a2f38';
    }

    function render(state) {
      for (const face of FACES) {
        const fEl = faceEls[face];
        const order = slotOrder[face];
        const stickers = fEl.children;
        const faceBase = FACES.indexOf(face) * 9;
        for (let slot = 0; slot < 9; slot++) {
          stickers[slot].style.background = colorVar(state[faceBase + order[slot]]);
        }
      }
    }

    function reset() {
      rx = -25; ry = -30;
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    }

    return { render, reset };
  }

  global.Cube3D = { build };

}(typeof window !== 'undefined' ? window : globalThis));
