function updateShuntCapVoltage(x, Vc, R, C, dt) {
  const alpha = dt / (R * C + dt);
  return Vc + alpha * (x - Vc);
}

function railLimit(x) {
  const Vpos = 3.6;
  const Vneg = 3.2;
  return x >= 0.0 ? Vpos * Math.tanh(x / Vpos) : Vneg * Math.tanh(x / Vneg);
}

// Pre-gain — Distortion::solveGainStage1 (op-amp 1 + rail limit)
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

registerProcessor('pre-gain', PreGainProcessor);
