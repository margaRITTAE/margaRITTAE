/* Schematics 

                                                         GND
                                                          │
    Signal ─── Cin───┬──────── + ┌──────┐                 └─ + ┌──────┐                                 ┌─────┐
                     │           │OP Amp├─┐                    │OP Amp├─┬── Cc ── Rc ─┬─┬─── Rtone ─┬───│Level├─── Out
                    Rin        - └──────┘ ├── Ci ── Ri ───── - └──────┘ │             ▼ _           │   └─────┘
                     │         │          │                  │          │             ─ ▲          Ct
                    GND        ├─── Cf1───┤                  ├─── Cf2───┤             └┬┘           │
                     │         │          │                  │          │              │            │
                    Cg ── Rg ──┴─ Rdrive ─┘                  └─── Rf ───┘             GND          GND

  Part values are defined in config.js.

  How each stage will be built:
    input shaping  Cin, Rin                 Web Audio highpass
    pre-gain       after input → op-amp 1   AudioWorklet (per-sample)
    hard clip      Ci to diodes              AudioWorklet (per-sample)
    tone           Rtone, Ct                Web Audio lowpass
    level          Level knob               Web Audio gain
*/

let workletLoad = null;

function ensureWorklet(ctx) {
  if (!workletLoad) {
    workletLoad = ctx.audioWorklet.addModule(
      new URL('./distortion-worklet.js', import.meta.url),
    );
  }
  return workletLoad;
}

function potOhms(part, knob) {
  return part.siMin + knob * (part.siMax - part.siMin);
}


export async function createPedalStages(ctx) {
  await ensureWorklet(ctx);
  return {
    inputShaping: inputShaping(ctx),
    preGain:      preGain(ctx),
    hardClip:     hardClip(ctx),
    tone:         tone(ctx),
    level:        level(ctx),
  };
}


// ---------------------------------------------------------------------------
// STAGE 1 — Input shaping        parts: Cin, Rin
// Series Cin + shunt Rin is a highpass filter; fc = 1 / (2π Rin Cin)
// ---------------------------------------------------------------------------
function inputShaping(ctx) {
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.Q.value = Math.SQRT1_2;

  return {
    input: hp,
    output: hp,
    update(state) {
      const { Rin, Cin } = state.components;
      const fc = 1 / (2 * Math.PI * Rin.si * Cin.si);
      hp.frequency.value = Math.min(Math.max(fc, 1), state.sampleRate * 0.45);
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 2 — Pre-gain             parts: Cf1, Rdrive (Drive knob), Rg, Cg
// Op-amp 1 feedback loop and rail limit simulation
// ---------------------------------------------------------------------------
function preGain(ctx) {
  const node = new AudioWorkletNode(ctx, 'pre-gain', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: 'explicit',
  });

  return {
    input: node,
    output: node,
    update(state) {
      const c = state.components;
      node.port.postMessage({
        Cf1: c.Cf1.si,
        Rg: c.Rg.si,
        Cg: c.Cg.si,
        Rdrive: potOhms(c.Rdrive, state.knobs.drive),
      });
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 3 — Hard clipping        parts: Ci, Ri, Cf2, Rf, Cc, Rc, D2
// Starts at Ci: coupling + op-amp 2 + diode clip (solveGainStage2 + solveClipStage)
// ---------------------------------------------------------------------------
function hardClip(ctx) {
  const node = new AudioWorkletNode(ctx, 'hard-clip', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    channelCount: 1,
    channelCountMode: 'explicit',
  });

  return {
    input: node,
    output: node,
    update(state) {
      const c = state.components;
      node.port.postMessage({
        Ci: c.Ci.si,
        Ri: c.Ri.si,
        Cf2: c.Cf2.si,
        Rf: c.Rf.si,
        Cc: c.Cc.si,
        Rc: c.Rc.si,
      });
    },
  };
}

 
// ---------------------------------------------------------------------------
// STAGE 4 — Tone                 parts: Rtone (Tone knob), Ct
// Series Rtone + shunt Ct is a lowpass filter; fc = 1 / (2π Rtone Ct)
// ---------------------------------------------------------------------------
function tone(ctx) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.707;

  return {
    input: lp,
    output: lp,
    update(state) {
      const { Rtone, Ct } = state.components;
      const t = Math.sqrt(Math.min(Math.max(state.knobs.tone, 0), 1));
      const R = Rtone.siMax * Math.pow(Rtone.siMin / Rtone.siMax, t);
      const fc = 1 / (2 * Math.PI * R * Ct.si);
      lp.frequency.value = Math.min(Math.max(fc, 1), state.sampleRate * 0.45);
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 5 — Level                parts: Level (Level knob)
// ---------------------------------------------------------------------------
function level(ctx) {
  const gain = ctx.createGain();

  return {
    input: gain,
    output: gain,
    update(state) {
      gain.gain.value = state.knobs.level;
    },
  };
}


// ---------------------------------------------------------------------------
// Descriptions of each stage in the X-ray view.
// ---------------------------------------------------------------------------
export function describeStage(stageId, state) {
  const c = state.components;
  switch (stageId) {
    case 'inputShaping': {
      return `Simple highpass filter to tame harsh frequencies`;
    }
    case 'preGain': {
      return `Op-amp gain (drive) and rail saturation before the clipping stage`;
    }
    case 'hardClip':
      return `More gain, then diodes cut off the top and bottom of the signal`;
    case 'tone': {
      return 'Adjustable lowpass filter to tame high frequencies';
    }
    case 'level':
      return `Final level control`;
    default:         return '';
  }
}
