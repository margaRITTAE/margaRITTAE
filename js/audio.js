// audio.js — audio graph, routing around stages, clip loading, plucks.
// You shouldn't need to edit this; the pedal itself lives in mechanism.js.
import { createPedalStages } from './mechanism.js';
import { STAGES } from './config.js';

let ctx = null;
let inputBus, analyserBefore, analyserAfter, pedalWet, pedalDry;
const routes = [];            // one { stage, wet, dry } per stage
const decoded = new Map();    // clip file → AudioBuffer
let clipSource = null;

export const isReady = () => !!ctx;
export const analysers = () => ({ before: analyserBefore, after: analyserAfter });

export async function ensureAudio(state) {
  if (!ctx) build(state);
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}

function passThrough() {
  const g = ctx.createGain();
  return { input: g, output: g, update() {} };
}

function build(state) {
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  inputBus = ctx.createGain();
  analyserBefore = ctx.createAnalyser();
  analyserBefore.fftSize = 4096;
  inputBus.connect(analyserBefore);

  let made = {};
  try { made = createPedalStages(ctx) || {}; }
  catch (e) { console.error('createPedalStages() threw. Using pass-through stages.', e); }

  // Each stage: prev → stage → wet ─┐
  //             prev ─────→ dry  ───┴→ join → next stage
  let prev = inputBus;
  STAGES.forEach(({ id }) => {
    const stage = made[id] || passThrough();
    const wet = ctx.createGain(), dry = ctx.createGain(), join = ctx.createGain();
    dry.gain.value = 0;
    prev.connect(stage.input);
    stage.output.connect(wet); wet.connect(join);
    prev.connect(dry); dry.connect(join);
    routes.push({ id, stage, wet, dry });
    prev = join;
  });

  // Footswitch: whole pedal on (wet) or true bypass (dry).
  const out = ctx.createGain();
  pedalWet = ctx.createGain(); pedalDry = ctx.createGain(); pedalDry.gain.value = 0;
  prev.connect(pedalWet); pedalWet.connect(out);
  inputBus.connect(pedalDry); pedalDry.connect(out);

  analyserAfter = ctx.createAnalyser();
  analyserAfter.fftSize = 4096;
  out.connect(analyserAfter);

  // Safety limiter so a wild setting can't blast anyone's ears.
  const master = ctx.createGain(); master.gain.value = 0.6;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6; limiter.ratio.value = 20; limiter.attack.value = 0.002;
  out.connect(master); master.connect(limiter); limiter.connect(ctx.destination);

  applyState(state);
}

const ramp = (param, v) => param.setTargetAtTime(v, ctx.currentTime, 0.015);

export const sampleRate = () => (ctx ? ctx.sampleRate : 48000);

export function applyState(state) {
  if (!ctx) return;
  state = { ...state, sampleRate: ctx.sampleRate };
  routes.forEach((r, i) => {
    const on = state.stageOn[i];
    ramp(r.wet.gain, on ? 1 : 0);
    ramp(r.dry.gain, on ? 0 : 1);
    try { r.stage.update?.(state); }
    catch (e) { console.error(`update() in stage "${r.id}" threw:`, e); }
  });
  ramp(pedalWet.gain, state.pedalOn ? 1 : 0);
  ramp(pedalDry.gain, state.pedalOn ? 0 : 1);
}

// ---------- clips ----------
export async function loadClip(clip) {
  if (decoded.has(clip.file)) return decoded.get(clip.file);
  let buf, placeholder = false;
  try {
    const res = await fetch(clip.file);
    if (!res.ok) throw new Error(res.status);
    buf = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    buf = placeholderStrum(clip.name);
    placeholder = true;
  }
  const entry = { buf, placeholder };
  decoded.set(clip.file, entry);
  return entry;
}

export function playLoop(buf) {
  stopLoop();
  clipSource = ctx.createBufferSource();
  clipSource.buffer = buf; clipSource.loop = true;
  clipSource.connect(inputBus); clipSource.start();
}
export function stopLoop() {
  if (clipSource) { try { clipSource.stop(); } catch {} clipSource.disconnect(); clipSource = null; }
}

// ---------- plucked string (Karplus–Strong) for the V-Inst and placeholders ----------
// The string starts in the shape a finger leaves it: a triangle peaking where
// it was plucked (~1/5 along), plus a little noise for realism. A pure noise
// burst sounds brighter but draws as a jagged mess on the oscilloscope.
const PLUCK_POS = 0.2, PLUCK_NOISE = 0.08;
function ks(out, start, freq, seconds, amp) {
  const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / freq)), b = new Float32Array(N);
  const peak = Math.max(1, Math.round(N * PLUCK_POS));
  let p = 0, mean = 0;
  for (let i = 0; i < N; i++) {
    const tri = i < peak ? i / peak : (N - i) / (N - peak);
    p = 0.7 * p + 0.3 * (Math.random() * 2 - 1);          // softened noise
    b[i] = tri + PLUCK_NOISE * p; mean += b[i];
  }
  mean /= N;
  for (let i = 0; i < N; i++) b[i] -= mean;               // no DC offset
  const len = Math.min(out.length - start, Math.round(seconds * sr));
  for (let i = 0, k = 0; i < len; i++) {
    const v = b[k]; b[k] = 0.996 * 0.5 * (v + b[(k + 1) % N]);
    out[start + i] += v * amp; k = (k + 1) % N;
  }
}
function normalize(d, peak) { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); if (m) for (let i = 0; i < d.length; i++) d[i] *= peak / m; }

export function pluck(freq) {
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 2), ctx.sampleRate);
  const d = buf.getChannelData(0);
  ks(d, 0, freq, 2, 1); normalize(d, 0.45);
  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(inputBus); s.start();
}

function placeholderStrum(name) {
  const sr = ctx.sampleRate, buf = ctx.createBuffer(1, sr * 4, sr), d = buf.getChannelData(0);
  const E = [82.41, 123.47, 164.81, 207.65, 246.94, 329.63];      // E major
  const G = [98.0, 123.47, 146.83, 196.0, 246.94, 392.0];
  const strum = (t, fs) => fs.forEach((f, i) => ks(d, Math.round((t + i * 0.015) * sr), f, 2, 0.3));
  if (/solo/i.test(name)) [329.63, 392, 440, 493.88, 587.33, 493.88, 440, 392].forEach((f, i) => ks(d, Math.round(i * 0.5 * sr), f, 0.6, 0.5));
  else if (/wonder/i.test(name)) { strum(0, E); strum(1, G); strum(2, E); strum(3, G); }
  else { strum(0, E); strum(2, E); }
  normalize(d, 0.45);
  return buf;
}
