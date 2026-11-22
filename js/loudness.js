// loudness.js — measure and set loudness in LUFS (ITU-R BS.1770 / EBU R128).
//
// LUFS is how loud something *feels*, averaged over time. It's what Spotify and
// YouTube use (they play everything at about −14 LUFS). Peak dB only measures
// the single loudest sample, which says little about how loud a sound feels.

// K-weighting: two filters that roughly match how the ear hears loudness
// (a gentle treble boost, then a cut below ~40 Hz). Works at any sample rate.
function kWeightCoeffs(sr) {
  const G = 3.99984385397, Q = 0.7071752369554193, fc = 1681.9744509555319;
  const A = Math.pow(10, G / 40);
  let w0 = 2 * Math.PI * fc / sr, al = Math.sin(w0) / (2 * Q), c = Math.cos(w0), s = 2 * Math.sqrt(A) * al;
  const shelf = {
    b: [A * ((A + 1) + (A - 1) * c + s), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - s)],
    a: [(A + 1) - (A - 1) * c + s, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - s],
  };
  const Q2 = 0.5003270373253953, fc2 = 38.13547087613982;
  w0 = 2 * Math.PI * fc2 / sr; al = Math.sin(w0) / (2 * Q2); c = Math.cos(w0);
  const highpass = { b: [(1 + c) / 2, -(1 + c), (1 + c) / 2], a: [1 + al, -2 * c, 1 - al] };
  return [shelf, highpass];
}

function biquad(x, { b, a }) {
  const b0 = b[0] / a[0], b1 = b[1] / a[0], b2 = b[2] / a[0], a1 = a[1] / a[0], a2 = a[2] / a[0];
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const o = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = o; y[i] = o;
  }
  return y;
}

// Integrated loudness of a mono signal, in LUFS (gated, 400 ms blocks).
export function measureLUFS(x, sr) {
  const [f1, f2] = kWeightCoeffs(sr);
  const y = biquad(biquad(x, f1), f2);
  const blk = Math.round(0.4 * sr), hop = Math.round(blk / 4);
  const powers = [];
  for (let i = 0; i + blk <= y.length; i += hop) {
    let s = 0; for (let j = i; j < i + blk; j++) s += y[j] * y[j];
    powers.push(s / blk);
  }
  if (!powers.length) return -Infinity;
  const L = p => -0.691 + 10 * Math.log10(p + 1e-20);
  const mean = arr => arr.reduce((t, v) => t + v, 0) / arr.length;
  let gated = powers.filter(p => L(p) > -70);                 // absolute gate
  if (!gated.length) return -Infinity;
  const rel = L(mean(gated)) - 10;                             // relative gate
  gated = gated.filter(p => L(p) > rel);
  return L(mean(gated));
}

// Scale a signal (in place) to the target loudness, but never let its
// peak go above `ceiling` (so it can't clip). Returns the LUFS it ended at.
export function normalizeLoudness(x, sr, targetLUFS, ceiling) {
  const now = measureLUFS(x, sr);
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
  if (!isFinite(now) || peak === 0) return now;
  const g = Math.min(Math.pow(10, (targetLUFS - now) / 20), ceiling / peak);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return now + 20 * Math.log10(g);
}
