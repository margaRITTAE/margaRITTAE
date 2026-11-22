// scope.js — the Before / After oscilloscopes in the Output column.
// Draws in a slightly wobbly "pen" style to match the hand-drawn UI.

const buf = new Float32Array(2048);

function fit(cv) {
  const b = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  const w = Math.max(1, Math.round(b.width * d)), h = Math.max(1, Math.round(b.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
  return { c, w: b.width, h: b.height };
}

// Find a rising zero crossing so the wave stands still instead of scrolling.
function trigger(d) {
  for (let i = 1; i < d.length / 2; i++) if (d[i - 1] < 0 && d[i] >= 0) return i;
  return 0;
}

export function drawScope(canvas, analyser, colors, label) {
  const { c, w, h } = fit(canvas);
  c.clearRect(0, 0, w, h);
  const mid = h / 2, amp = h * 0.42;

  // faint graph-paper grid
  c.strokeStyle = colors.grid; c.lineWidth = 1;
  for (let x = 0; x <= w; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = mid % 20; y <= h; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.strokeStyle = colors.axis; c.beginPath(); c.moveTo(0, mid); c.lineTo(w, mid); c.stroke();

  let live = false;
  if (analyser) {
    analyser.getFloatTimeDomainData(buf);
    let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v));
    live = pk > 0.002;
  }

  if (!live) {
    c.fillStyle = colors.muted; c.font = `18px ${colors.font}`; c.textAlign = 'center';
    c.fillText(label, w / 2, mid - 10);
    return;
  }

  const start = trigger(buf), span = 1024;     // ~21 ms at 48 kHz
  c.strokeStyle = colors.ink; c.lineWidth = 2.6; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < span; i++) {
    const x = (i / (span - 1)) * w;
    const y = mid - Math.max(-1.1, Math.min(1.1, buf[start + i])) * amp;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke();
}
