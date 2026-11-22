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
                                                                  
*/

class Distortion {
  static inputPeakVolts = 0.5 * 1.33;

  static thermalVoltage = 0.025;
  static saturationCurrent = 1.7e-9;
  static idealityFactor = 1.2;

  static RdriveMin = 1000.0;
  static RdriveMax = 150000.0;
  static RtoneMin = 5000.0;
  static RtoneMax = 47000.0;
  static levelMin = 0.0;
  static levelMax = 1.0;

  static clamp(x, lo, hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
  }

  constructor(sampleRate = 44100.0) {
    this.Rin = 1.0e6;
    this.Cin = 4.7e-9;
    this.Cf1 = 100e-12;
    this.Rg = 1000.0;
    this.Cg = 220e-9;
    this.Rdrive = Distortion.RdriveMin;
    this.Ci = 100e-9;
    this.Ri = 10000.0;
    this.Cf2 = 100e-12;
    this.Rf = 1e6;
    this.Cc = 470e-9;
    this.Rc = 47.0;
    this.Rtone = Distortion.RtoneMax;
    this.Ct = 10e-9;
    this.level = 1.0;

    this.dt = 1.0 / 44100.0;
    this.enabled = false;

    this.VclipPrev = 0.0;
    this.VCin = 0.0;
    this.VCi = 0.0;
    this.VCf1 = 0.0;
    this.VCf2 = 0.0;
    this.VCg = 0.0;
    this.VCc = 0.0;
    this.VCt = 0.0;

    this.setSampleRate(sampleRate);
  }

  setSampleRate(sampleRate) {
    if (sampleRate > 0.0) {
      this.dt = 1.0 / sampleRate;
    }
  }

  setRin(ohms) { this.Rin = ohms > 0.0 ? ohms : 1.0e-12; }
  setCin(farads) { this.Cin = farads > 0.0 ? farads : 1.0e-12; }
  setCf1(farads) { this.Cf1 = farads > 0.0 ? farads : 1.0e-12; }
  setRg(ohms) { this.Rg = ohms > 0.0 ? ohms : 1.0e-12; }
  setCg(farads) { this.Cg = farads > 0.0 ? farads : 1.0e-12; }
  setDrive(ohms) {
    this.Rdrive = Distortion.clamp(ohms, Distortion.RdriveMin, Distortion.RdriveMax);
  }
  setCi(farads) { this.Ci = farads > 0.0 ? farads : 1.0e-12; }
  setRi(ohms) { this.Ri = ohms > 0.0 ? ohms : 1.0e-12; }
  setCf2(farads) { this.Cf2 = farads > 0.0 ? farads : 1.0e-12; }
  setRf(ohms) { this.Rf = ohms > 0.0 ? ohms : 1.0e-12; }
  setCc(farads) { this.Cc = farads > 0.0 ? farads : 1.0e-12; }
  setRc(ohms) { this.Rc = ohms > 0.0 ? ohms : 1.0e-12; }
  setTone(ohms) {
    this.Rtone = Distortion.clamp(ohms, Distortion.RtoneMin, Distortion.RtoneMax);
  }
  setCt(farads) { this.Ct = farads > 0.0 ? farads : 1.0e-12; }
  setLevel(gain) {
    this.level = Distortion.clamp(gain, Distortion.levelMin, Distortion.levelMax);
  }

  enable() { this.enabled = true; }
  disable() { this.enabled = false; }
  isEnabled() { return this.enabled; }
}


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
// STAGE 2 — Soft clipping        parts: Cf1, Rdrive (Drive knob), Rg, Cg
// ---------------------------------------------------------------------------
function softClip(ctx) {
  const node = ctx.createGain();          // TODO: replace with your circuit

  return {
    input: node,
    output: node,
    update(state) {
      // TODO: gain from Rdrive (state.knobs.drive) and Rg, high cut from Cf1 ...
    },
  };
}


// ---------------------------------------------------------------------------
// STAGE 3 — Hard clipping        parts: Ci, Ri, Cf2, Rf, Cc, Rc, D2
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
// STAGE 4 — Tone                 parts: Rtone (Tone knob), Ct
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
