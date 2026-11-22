// ============================================================================
//  mechanism.js  —  YOUR CODE GOES HERE
// ============================================================================
//
//  This file is the pedal's brain. The rest of the app (UI, knobs, X-ray view,
//  oscilloscopes, guitar, file loading, stage on/off switches, footswitch)
//  is already wired up and calls into the two functions below.
//
//  Right now every stage is a plain pass-through, so "After" looks exactly
//  like "Before". Fill in the five TODO blocks to make it distort.
//
//  ---------------------------------------------------------------------------
//  HOW THE APP USES THIS FILE
//  ---------------------------------------------------------------------------
//  1. When audio starts, the app calls  createPedalStages(ctx)  once.
//     You return one object per stage:
//
//        { input: AudioNode, output: AudioNode, update(state) }
//
//     The app connects them in order:
//        guitar → inputShaping → softClip → hardClip → tone → level → speakers
//
//     Stage on/off toggles and the footswitch are handled by the app
//     (it routes around your stage). You never need to bypass anything.
//
//  2. Whenever a knob turns or a part value changes in the X-ray view,
//     the app calls  stage.update(state)  on every stage.
//
//  3. describeStage(stageId, state) is optional. Return a short string and
//     it shows under that stage in the X-ray view (e.g. "gain ×54").
//
//  ---------------------------------------------------------------------------
//  WHAT'S IN `state`
//  ---------------------------------------------------------------------------
//  state.knobs        { drive, level, bass, mid, treble }   each 0..1
//  state.components   { Cin: { value: 100, unit: 'nF', si: 1e-7 }, ...,
//                       D1:  { value: '1N4148', vf: 0.6 }, ... }
//                     → use .si for math (farads, ohms). Pots (Rdrive, Level)
//                       give the FULL pot value; multiply by the knob yourself.
//  state.sampleRate   e.g. 48000
//
//  Part names match the schematic: Cin Rin | Rg Cg Rdrive Cf1 D1 |
//  C1 R1 Rf Cf2 Cc Rc D2 | Rtone Ct | Level   (defaults live in config.js)
//
//  ---------------------------------------------------------------------------
//  WEB AUDIO BUILDING BLOCKS YOU'LL PROBABLY WANT
//  ---------------------------------------------------------------------------
//  ctx.createGain()            → .gain.value
//  ctx.createBiquadFilter()    → .type = 'highpass' | 'lowpass' | 'lowshelf'
//                                 | 'peaking' | 'highshelf', .frequency, .Q, .gain
//  ctx.createWaveShaper()      → .curve = Float32Array (maps input -1..1 to output)
//                                 .oversample = '4x'  (less aliasing)
//  new AudioWorkletNode(...)   → if you want to write sample-by-sample DSP
//
//  Chain nodes with  a.connect(b);  then return the first as `input`
//  and the last as `output`.
// ============================================================================


export function createPedalStages(ctx) {
  return {
    inputShaping: inputShaping(ctx),
    softClip:     softClip(ctx),
    hardClip:     hardClip(ctx),
    tone:         tone(ctx),
    level:        level(ctx),
  };
}


// ---------------------------------------------------------------------------
// STAGE 1 — Input shaping        parts: Cin, Rin
// ---------------------------------------------------------------------------
function inputShaping(ctx) {
  const node = ctx.createGain();          // TODO: replace with your circuit

  return {
    input: node,
    output: node,
    update(state) {
      // TODO: use state.components.Cin.si / Rin.si to set your filter
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 2 — Soft clipping        parts: Rg, Cg, Rdrive (Drive knob), Cf1, D1
// ---------------------------------------------------------------------------
function softClip(ctx) {
  const node = ctx.createGain();          // TODO: replace with your circuit

  return {
    input: node,
    output: node,
    update(state) {
      // TODO: gain from Rdrive * state.knobs.drive and Rg,
      //       clipping shape from D1.vf, high cut from Cf1 ...
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 3 — Hard clipping        parts: C1, R1, Rf, Cf2, Cc, Rc, D2
// ---------------------------------------------------------------------------
function hardClip(ctx) {
  const node = ctx.createGain();          // TODO: replace with your circuit

  return {
    input: node,
    output: node,
    update(state) {
      // TODO
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 4 — Tone                 parts: Rtone, Ct   knobs: bass, mid, treble
// ---------------------------------------------------------------------------
function tone(ctx) {
  const node = ctx.createGain();          // TODO: replace with your circuit

  return {
    input: node,
    output: node,
    update(state) {
      // TODO
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 5 — Level                parts: Level (Level knob)
// ---------------------------------------------------------------------------
function level(ctx) {
  const node = ctx.createGain();          // TODO: replace with your circuit

  return {
    input: node,
    output: node,
    update(state) {
      // TODO: e.g. node.gain.value = something from state.knobs.level
    },
  };
}


// ---------------------------------------------------------------------------
// OPTIONAL — one-line readout under each stage in the X-ray view.
// Return '' to show nothing.
// ---------------------------------------------------------------------------
export function describeStage(stageId, state) {
  switch (stageId) {
    case 'inputShaping': return '';   // TODO e.g. `cuts below ${fc} Hz`
    case 'softClip':     return '';
    case 'hardClip':     return '';
    case 'tone':         return '';
    case 'level':        return '';
    default:             return '';
  }
}
