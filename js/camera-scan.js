// Camera frames stay on-device. Six center samples calibrate sticker colors.
(function (global) {
  'use strict';
  const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
  const NAMES = { U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' };
  const TOP = { U: 'blue', R: 'white', F: 'white', D: 'green', L: 'white', B: 'white' };
  function normalized(rgb) {
    const sum = rgb.reduce((a, b) => a + b, 0) || 1;
    return rgb.map(v => v / sum);
  }
  function classify(samples) {
    const refs = FACES.map((_, f) => normalized(samples[f][4]));
    return samples.flatMap((face, f) => face.map((rgb, i) => {
      if (i === 4) return FACES[f];
      const color = normalized(rgb);
      const distances = refs.map(ref => ref.reduce((sum, v, k) => sum + (v - color[k]) ** 2, 0));
      return FACES[distances.indexOf(Math.min(...distances))];
    }));
  }
  function sampleFrame(video) {
    if (!video.videoWidth || !video.videoHeight) throw new Error('Wait for the camera image before capturing.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 300;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const side = Math.min(video.videoWidth, video.videoHeight);
    ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, 300, 300);
    const samples = [];
    // Overlay occupies the central 80%; sample only each sticker's middle.
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const pixels = ctx.getImageData(30 + col * 80 + 30, 30 + row * 80 + 30, 20, 20).data;
      const channels = [[], [], []];
      for (let j = 0; j < pixels.length; j += 4) for (let k = 0; k < 3; k++) channels[k].push(pixels[j + k]);
      samples.push(channels.map(values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]));
    }
    return samples;
  }
  function build({ onApply }) {
    const $ = id => document.getElementById(id);
    const dialog = $('scan-dialog'), video = $('scan-video');
    let stream = null, generation = 0, samples = Array(6).fill(null), colors = null;
    function message(text) { $('scan-status').textContent = text; }
    function stop() {
      generation++;
      if (stream) stream.getTracks().forEach(track => track.stop());
      stream = null; video.srcObject = null; $('scan-capture').disabled = true;
    }
    function guide() {
      const face = $('scan-face').value;
      $('scan-guide').textContent = `Face ${FACES.indexOf(face) + 1}/6: ${NAMES[face]} center facing the camera, ${TOP[face]} center on the top adjacent face. Rotate the whole cube; do not turn individual layers.`;
      $('scan-capture').textContent = samples[FACES.indexOf(face)] ? 'Retake face' : 'Capture face';
    }
    function review() {
      const root = $('scan-review'); root.replaceChildren();
      if (!colors) return;
      FACES.forEach((face, f) => {
        const group = document.createElement('div');
        const title = document.createElement('h3'); title.textContent = NAMES[face]; group.appendChild(title);
        const grid = document.createElement('div'); grid.className = 'scan-colors';
        for (let i = 0; i < 9; i++) {
          const index = f * 9 + i, button = document.createElement('button');
          button.className = 'sticker'; button.dataset.color = colors[index];
          button.textContent = colors[index]; button.disabled = i === 4;
          button.setAttribute('aria-label', `${NAMES[face]} face sticker ${i + 1}: ${NAMES[colors[index]]}`);
          button.addEventListener('click', () => {
            colors[index] = FACES[(FACES.indexOf(colors[index]) + 1) % 6]; review();
          });
          grid.appendChild(button);
        }
        group.appendChild(grid); root.appendChild(group);
      });
      const validity = global.CubeState.validate(colors);
      $('scan-apply').disabled = !validity.ok;
      message(validity.ok ? 'All faces captured. Check the colors, then use this scan. You can retake any face or tap a sticker to correct it.' : `${validity.reason} Tap review stickers to correct colors, or retake a face.`);
    }
    async function open() {
      stop(); const request = generation;
      samples = Array(6).fill(null); colors = null;
      $('scan-review').replaceChildren(); $('scan-apply').disabled = true;
      $('scan-face').value = 'U'; guide(); dialog.showModal();
      if (!global.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        message('Camera access needs HTTPS or localhost and a supported browser. You can still enter colors manually.'); return;
      }
      message('Allow camera access. Use even lighting and avoid glare. Nothing is uploaded.');
      try {
        const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (request !== generation || !dialog.open) { camera.getTracks().forEach(track => track.stop()); return; }
        stream = camera; video.srcObject = stream; await video.play();
        if (request !== generation || !dialog.open) return;
        $('scan-capture').disabled = false;
        message('Align one face inside the grid, with each sticker centered in a cell. Capture all six faces in the indicated orientation.');
      } catch (error) {
        if (request !== generation) return;
        stop();
        message(error.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings, then reopen the scanner.' : 'Could not start the camera. Check that a camera is available and not in use, then reopen the scanner.');
      }
    }
    $('btn-scan').addEventListener('click', open);
    $('scan-face').addEventListener('change', guide);
    $('scan-close').addEventListener('click', () => { stop(); dialog.close(); });
    dialog.addEventListener('close', stop);
    dialog.addEventListener('cancel', stop);
    global.addEventListener('pagehide', stop);
    $('scan-capture').addEventListener('click', () => {
      try {
        const index = FACES.indexOf($('scan-face').value);
        samples[index] = sampleFrame(video);
        if (samples.every(Boolean)) { colors = classify(samples); review(); }
        else {
          const next = samples.findIndex(sample => !sample);
          $('scan-face').value = FACES[next];
          message(`${samples.filter(Boolean).length}/6 faces captured. Keep the same lighting for every face.`);
        }
        guide();
      } catch (error) { message(error.message); }
    });
    $('scan-apply').addEventListener('click', () => {
      if (!colors || !global.CubeState.validate(colors).ok) return;
      onApply(colors.slice()); stop(); dialog.close();
    });
  }
  global.CameraScan = { classify, sampleFrame, build };
})(typeof window !== 'undefined' ? window : globalThis);
