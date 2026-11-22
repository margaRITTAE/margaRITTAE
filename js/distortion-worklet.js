function clamp(x, lo, hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

function updateShuntCapVoltage(x, Vc, R, C, dt) {
  const alpha = dt / (R * C + dt);
  return Vc + alpha * (x - Vc);
}

function railLimit(x) {
  const Vpos = 3.6;
  const Vneg = 3.2;
  return x >= 0.0 ? Vpos * Math.tanh(x / Vpos) : Vneg * Math.tanh(x / Vneg);
}

// Antiparallel diode pair: Id = 2·Is·sinh(v/(n·Vt))
const thermalVoltage = 0.025;
const saturationCurrent = 1.7e-9;
const idealityFactor = 1.2;

function diodePair(v) {
  const invNv = 1.0 / (idealityFactor * thermalVoltage);
  const x = clamp(v * invNv, -12.0, 12.0);
  const scale = 2.0 * saturationCurrent;
  return {
    id: scale * Math.sinh(x),
    did: scale * invNv * Math.cosh(x),
  };
}


// Pre-gain (op-amp 1 + rail limit)
class PreGainProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.Cf1 = 100e-12;
    this.Rg = 1000.0;
    this.Cg = 220e-9;
    this.Rdrive = 1000.0;
    this.VCg = 0.0;
    this.VCf1 = 0.0;
    this.port.onmessage = (e) => {
      const p = e.data;
      if (p.Cf1 > 0) this.Cf1 = p.Cf1;
      if (p.Rg > 0) this.Rg = p.Rg;
      if (p.Cg > 0) this.Cg = p.Cg;
      if (p.Rdrive > 0) this.Rdrive = p.Rdrive;
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!output) return true;
    if (!input) {
      output.fill(0);
      return true;
    }

    const dt = 1 / sampleRate;
    let { VCg, VCf1, Cf1, Rg, Cg, Rdrive } = this;

    for (let i = 0; i < output.length; i++) {
      const Vinv = input[i];
      VCg = updateShuntCapVoltage(Vinv, VCg, Rg, Cg, dt);
      const x = ((Cf1 / dt) * VCf1 + (Vinv - VCg) / Rg)
                / ((1.0 / Rdrive) + (Cf1 / dt));
      VCf1 = x;
      output[i] = railLimit(Vinv + x);
    }

    this.VCg = VCg;
    this.VCf1 = VCf1;
    return true;
  }
}


// Hard clip: Ci coupling + op amp 2 +  diode clipper
class HardClipProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.Ci = 100e-9;
    this.Ri = 10000.0;
    this.Cf2 = 100e-12;
    this.Rf = 1e6;
    this.Cc = 470e-9;
    this.Rc = 47.0;
    this.VCi = 0.0;
    this.VCf2 = 0.0;
    this.VCc = 0.0;
    this.VclipPrev = 0.0;
    this.port.onmessage = (e) => {
      const p = e.data;
      if (p.Ci > 0) this.Ci = p.Ci;
      if (p.Ri > 0) this.Ri = p.Ri;
      if (p.Cf2 > 0) this.Cf2 = p.Cf2;
      if (p.Rf > 0) this.Rf = p.Rf;
      if (p.Cc > 0) this.Cc = p.Cc;
      if (p.Rc > 0) this.Rc = p.Rc;
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!output) return true;
    if (!input) {
      output.fill(0);
      return true;
    }

    const dt = 1 / sampleRate;
    let { VCi, VCf2, VCc, VclipPrev, Ci, Ri, Cf2, Rf, Cc, Rc } = this;

    for (let i = 0; i < output.length; i++) {
      const Vo1 = input[i];

      // Ci coupling into op-amp 2
      VCi = updateShuntCapVoltage(Vo1, VCi, Ri, Ci, dt);
      const Vin = Vo1 - VCi;

      // Op-amp 2 gain
      const Vo2 = ((Cf2 / dt) * VCf2 - (Vin / Ri))
                  / ((1.0 / Rf) + (Cf2 / dt));
      VCf2 = Vo2;
      const Vo2Lim = railLimit(Vo2);

      // Vo2 - Cc - Rc - diode pair - GND
      const alpha = Cc / dt;
      const invRc = 1.0 / Rc;
      const D = invRc + alpha;

      // Diode clipper Newton Raphson solver
      let Vc = VclipPrev;
      for (let n = 0; n < 3; n++) {
        const a = invRc / D;
        const Va = a * Vc + (alpha * (Vo2Lim - VCc)) / D;
        const { id, did } = diodePair(Vc);
        const f = (Va - Vc) * invRc - id;
        const df = (a - 1.0) * invRc - did;
        Vc -= f / (df + 1e-12);
      }

      VCc = Vo2Lim - ((invRc / D) * Vc + (alpha * (Vo2Lim - VCc)) / D);
      VclipPrev = Vc;
      output[i] = Vc;
    }

    this.VCi = VCi;
    this.VCf2 = VCf2;
    this.VCc = VCc;
    this.VclipPrev = VclipPrev;
    return true;
  }
}

registerProcessor('pre-gain', PreGainProcessor);
registerProcessor('hard-clip', HardClipProcessor);
