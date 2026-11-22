// config.js
// Everything you might want to rename or retune without touching the UI code.

// Clean guitar recordings for the Input column.
// Drop the .wav files into /audio. If a file is missing, the app plays a
// synthesized placeholder strum so the page still works.
export const CLIPS = [
  { name: 'Emaj.wav',       file: 'audio/Emaj.wav' },
  { name: 'solo.wav',       file: 'audio/solo.wav' },
  { name: 'wonderwall.wav', file: 'audio/wonderwall.wav' },
];

// Knobs on the outside of the pedal. Values are 0..1.
// "size" only changes how big the knob is drawn.
export const KNOBS = [
  { id: 'drive', label: 'Drive', size: 'big',   value: 0.5 },
  { id: 'level', label: 'Level', size: 'big',   value: 0.5 },
  { id: 'tone',  label: 'Tone',  size: 'small', value: 0.5 },
];

// The five stages, in signal order. The ids must match the keys
// returned by createPedalStages() in mechanism.js.
export const STAGES = [
  { id: 'inputShaping', name: 'Input shaping' },
  { id: 'softClip',     name: 'Soft clipping' },
  { id: 'hardClip',     name: 'Hard clipping' },
  { id: 'tone',         name: 'Tone' },
  { id: 'level',        name: 'Level' },
];

// Diode types the X-ray view lets you pick from. vf = forward voltage (V).
export const DIODES = {
  '1N4148': { vf: 0.6, label: '1N4148 (silicon, 0.6 V)' },
  '1N34A':  { vf: 0.3, label: '1N34A (germanium, 0.3 V)' },
  'LED':    { vf: 1.7, label: 'Red LED (1.7 V)' },
};

// Every part shown in the X-ray schematic. These are starting values;
// visitors can edit them by clicking the part.
// unit: one of pF nF µF Ω kΩ MΩ (converted to SI for you in state.components[id].si)
// Pots have min/max instead of value, plus the outside knob that turns them.
export const COMPONENTS = {
  // Stage 1: input shaping
  Cin:    { value: 4.7,  unit: 'nF', stage: 'inputShaping', desc: 'Input coupling capacitor' },
  Rin:    { value: 1,    unit: 'MΩ', stage: 'inputShaping', desc: 'Input resistor to ground' },
  // Stage 2: soft clipping (op-amp 1 with Rdrive ‖ Cf1 feedback, Rg + Cg to ground)
  Cf1:    { value: 100,  unit: 'pF', stage: 'softClip', desc: 'Feedback capacitor' },
  Rdrive: { min: 1, max: 150, unit: 'kΩ', stage: 'softClip', desc: 'Drive pot in the feedback loop', knob: 'drive' },
  Rg:     { value: 1,    unit: 'kΩ', stage: 'softClip', desc: 'Gain-setting resistor to ground' },
  Cg:     { value: 220,  unit: 'nF', stage: 'softClip', desc: 'Capacitor in series with Rg' },
  // Stage 3: hard clipping (op-amp 2 inverting stage, then diodes to ground)
  Ci:     { value: 100,  unit: 'nF', stage: 'hardClip', desc: 'Coupling capacitor into op-amp 2' },
  Ri:     { value: 10,   unit: 'kΩ', stage: 'hardClip', desc: 'Input resistor of op-amp 2' },
  Cf2:    { value: 100,  unit: 'pF', stage: 'hardClip', desc: 'Feedback capacitor' },
  Rf:     { value: 1,    unit: 'MΩ', stage: 'hardClip', desc: 'Feedback resistor' },
  Cc:     { value: 470,  unit: 'nF', stage: 'hardClip', desc: 'Output coupling capacitor' },
  Rc:     { value: 47,   unit: 'Ω',  stage: 'hardClip', desc: 'Series resistor before the diodes' },
  D2:     { value: '1N4148', type: 'diode', stage: 'hardClip', desc: 'Diode pair to ground' },
  // Stage 4: tone
  Rtone:  { min: 5, max: 47, unit: 'kΩ', stage: 'tone', desc: 'Tone pot', knob: 'tone' },
  Ct:     { value: 10,   unit: 'nF', stage: 'tone', desc: 'Tone capacitor to ground' },
  // Stage 5: level
  Level:  { min: 0, max: 100, unit: 'kΩ', stage: 'level', desc: 'Output volume pot', knob: 'level' },
};

export const UNIT_SCALE = { pF: 1e-12, nF: 1e-9, 'µF': 1e-6, 'Ω': 1, 'kΩ': 1e3, 'MΩ': 1e6 };

// The whole audio engine runs at this rate. Match your recordings to it
// (44.1 kHz, 16-bit WAV = CD quality) so nothing is resampled on the way in.
export const SAMPLE_RATE = 44100;

// Loudness of every synthesized sound (V-Inst plucks, stand-in strums), set to
// match the recordings in /audio (solo.wav is −13.8 LUFS). Each note is measured
// and scaled on its own, so high and low strings feel equally loud.
// SYNTH_CEILING keeps peaks at or below −1 dB (0.89), the same as the recordings.
export const SYNTH_LUFS = -14;
export const SYNTH_CEILING = 0.89;
