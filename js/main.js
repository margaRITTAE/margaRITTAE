// main.js — wires the UI together. The pedal's DSP lives in mechanism.js.
import { CLIPS, KNOBS, STAGES, COMPONENTS, DIODES, UNIT_SCALE } from './config.js';
import { describeStage } from './mechanism.js';
import * as audio from './audio.js';
import { mountXray } from './xray.js';
import { mountGuitar } from './guitar.js';
import { drawScope } from './scope.js';

const $ = id => document.getElementById(id);

// ---------- app state ----------
const state = {
  knobs: Object.fromEntries(KNOBS.map(k => [k.id, k.value])),
  parts: Object.fromEntries(Object.entries(COMPONENTS).map(([id, c]) => [id, c.value])),
  stageOn: STAGES.map(() => true),
  pedalOn: true,
  clip: 0,
  playing: false,
};

// The object handed to mechanism.js (see the comment block there).
function mechanismState() {
  const components = {};
  for (const [id, c] of Object.entries(COMPONENTS)) {
    const v = state.parts[id];
    components[id] = c.type === 'diode'
      ? { value: v, vf: DIODES[v].vf }
      : { value: v, unit: c.unit, si: v * UNIT_SCALE[c.unit] };
  }
  return {
    knobs: { ...state.knobs }, components, stageOn: [...state.stageOn], pedalOn: state.pedalOn,
    sampleRate: audio.sampleRate(),
  };
}

function colors() {
  const s = getComputedStyle(document.documentElement), g = n => s.getPropertyValue(n).trim();
  return { ink: g('--ink'), muted: g('--muted'), accent: g('--accent'), red: g('--red'), grid: g('--grid'), font: g('--f-hand') };
}

// ---------- input: clips ----------
$('clips').innerHTML = CLIPS.map((c, i) =>
  `<button class="sketch clip" data-i="${i}" aria-pressed="${i === state.clip}">${c.name}</button>`).join('');
$('clips').querySelectorAll('.clip').forEach(b => b.addEventListener('click', async () => {
  state.clip = +b.dataset.i;
  $('clips').querySelectorAll('.clip').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  if (state.playing) await startClip();
}));

async function startClip() {
  await audio.ensureAudio(mechanismState());
  const { buf, placeholder } = await audio.loadClip(CLIPS[state.clip]);
  $('clipNote').textContent = placeholder ? `${CLIPS[state.clip].name} not found in /audio, playing a stand-in strum.` : '';
  audio.playLoop(buf);
}
$('play').addEventListener('click', async () => {
  state.playing = !state.playing;
  if (state.playing) await startClip(); else audio.stopLoop();
  $('play').classList.toggle('on', state.playing);
  $('playTxt').textContent = state.playing ? 'Stop' : 'Play';
});

// ---------- input: V-Inst ----------
mountGuitar($('neck'), colors, async freq => {
  await audio.ensureAudio(mechanismState());
  audio.pluck(freq);
});

// ---------- mechanism: outside view ----------
const rows = [KNOBS.filter(k => k.size === 'big'), KNOBS.filter(k => k.size !== 'big')];
$('knobs').innerHTML = rows.map((row, r) => `<div class="krow">${row.map(k => `
  <div class="kwrap">
    <div class="knob ${k.size}" data-k="${k.id}" tabindex="0" role="slider" aria-label="${k.label}" aria-valuemin="0" aria-valuemax="10"><i></i></div>
    <span>${k.label}</span>
  </div>`).join(r === 0 ? '<span class="led" id="led"></span>' : '')}</div>`).join('');

document.querySelectorAll('.knob').forEach(el => {
  const id = el.dataset.k; let y0 = 0, v0 = 0, drag = false;
  el.addEventListener('pointerdown', e => { drag = true; y0 = e.clientY; v0 = state.knobs[id]; el.setPointerCapture(e.pointerId); el.focus(); });
  el.addEventListener('pointermove', e => { if (!drag) return; state.knobs[id] = Math.min(1, Math.max(0, v0 + (y0 - e.clientY) / 150)); changed(); });
  el.addEventListener('pointerup', () => drag = false);
  el.addEventListener('pointercancel', () => drag = false);
  el.addEventListener('keydown', e => {
    const d = { ArrowUp: .05, ArrowRight: .05, ArrowDown: -.05, ArrowLeft: -.05 }[e.key];
    if (d) { e.preventDefault(); state.knobs[id] = Math.min(1, Math.max(0, state.knobs[id] + d)); changed(); }
  });
});
$('foot').addEventListener('click', () => { state.pedalOn = !state.pedalOn; changed(); });

// ---------- mechanism: x-ray view ----------
const refreshXray = mountXray({
  svgHost: $('schematic'), togglesHost: $('toggles'), readoutHost: null, popover: $('popover'),
  state, onChange: changed, describe: describeStage,
});

// ---------- one place that reacts to every change ----------
function changed() {
  document.querySelectorAll('.knob').forEach(el => {
    const v = state.knobs[el.dataset.k];
    el.querySelector('i').style.transform = `rotate(${-135 + 270 * v}deg)`;
    el.setAttribute('aria-valuenow', (v * 10).toFixed(1));
  });
  $('led').classList.toggle('on', state.pedalOn);
  $('foot').setAttribute('aria-pressed', String(state.pedalOn));
  const ms = mechanismState();
  refreshXray(ms);
  audio.applyState(ms);
}
changed();

// ---------- output: scopes ----------
function frame() {
  const a = audio.isReady() ? audio.analysers() : {};
  const K = colors();
  drawScope($('scBefore'), a.before, { ...K, ink: K.ink, axis: K.muted }, 'press Play or pluck a fret');
  drawScope($('scAfter'), a.after, { ...K, ink: K.red, axis: K.muted }, '…waiting for sound');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
