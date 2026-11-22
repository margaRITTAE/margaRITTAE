// scope.js — the Before / After oscilloscopes in the Output column.
//
// The scale is fixed (no zooming in), so Before and After can be compared
// for loudness too. Two things keep the picture readable:
//   1. Steady trigger: the wave always starts at the same rising edge
//      (with hysteresis, so noise near zero can't make it hop around).
//   2. Smoothing: each frame is blended with the last one, which calms
//      the jitter without hiding real changes in shape.
// If a wave is too loud for the box, it is shrunk to fit instead of cut off.
// When the sound stops, the last wave stays on screen (faded) to study.

const SPAN = 768;               // samples shown: ~17 ms at 44.1 kHz
const BLEND = 0.35;             // how much of each new frame to mix in (lower = calmer)
const SCALE = 1.25;             // fixed scale for −14 LUFS input: typical loud notes (~0.57) fill ~70% of the box
const FIT = 0.95;               // if a wave would go past 95% of the box, shrink it to fit

const states = new WeakMap();   // per-canvas memory: { disp, zoom }
let raw = null;

function fit(cv) {
  const b = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  const w = Math.max(1, Math.round(b.width * d)), h = Math.max(1, Math.round(b.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
  return { c, w: b.width, h: b.height };
}

// Rising zero crossing, but only after the wave has gone clearly negative.
function trigger(d, peak) {
  const lo = -0.15 * peak, last = d.length - SPAN;
  let armed = false;
  for (let i = 1; i < last; i++) {
    if (d[i] < lo) armed = true;
    else if (armed && d[i - 1] < 0 && d[i] >= 0) return i;
  }
  return 0;
}

function grid(c, w, h, colors) {
  const mid = h / 2;
  c.strokeStyle = colors.grid; c.lineWidth = 1;
  for (let x = 0; x <= w; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = mid % 20; y <= h; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.strokeStyle = colors.axis; c.beginPath(); c.moveTo(0, mid); c.lineTo(w, mid); c.stroke();
}

function trace(c, w, h, disp, zoom, color, alpha) {
  const mid = h / 2, amp = h * 0.44;
  c.globalAlpha = alpha;
  c.strokeStyle = color; c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < SPAN; i++) {
    const x = (i / (SPAN - 1)) * w;
    const y = mid - Math.max(-1.08, Math.min(1.08, disp[i] * zoom)) * amp;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke();
  c.globalAlpha = 1;
}

export function drawScope(canvas, analyser, colors, label) {
  const { c, w, h } = fit(canvas);
  c.clearRect(0, 0, w, h);
  grid(c, w, h, colors);

  let st = states.get(canvas);
  if (!st) { st = { disp: null, zoom: 1 }; states.set(canvas, st); }

  let peak = 0;
  if (analyser) {
    if (!raw || raw.length !== analyser.fftSize) raw = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(raw);
    for (const v of raw) peak = Math.max(peak, Math.abs(v));
  }

  if (peak > 0.002) {
    const start = trigger(raw, peak);
    if (!st.disp) st.disp = raw.slice(start, start + SPAN);
    else for (let i = 0; i < SPAN; i++) st.disp[i] += (raw[start + i] - st.disp[i]) * BLEND;

    // Fixed scale, but never let a loud wave run off the box.
    let shown = 0;
    for (let i = 0; i < SPAN; i++) shown = Math.max(shown, Math.abs(st.disp[i]), Math.abs(raw[start + i]));
    st.zoom = Math.min(SCALE, FIT / Math.max(shown, 1e-4));

    trace(c, w, h, st.disp, st.zoom, colors.ink, 1);
    return;
  }

  c.fillStyle = colors.muted; c.font = `18px ${colors.font}`; c.textAlign = 'center';
  if (st.disp) {
    trace(c, w, h, st.disp, st.zoom, colors.ink, 0.35);   // last wave, faded
    c.fillText('last wave (paused)', w / 2, 22);
  } else {
    c.fillText(label, w / 2, h / 2 - 10);
  }
}
