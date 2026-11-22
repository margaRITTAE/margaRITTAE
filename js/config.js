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
  { id: 'drive',  label: 'Drive',  size: 'big',   value: 0.5 },
  { id: 'level',  label: 'Level',  size: 'big',   value: 0.5 },
  { id: 'bass',   label: 'Bass',   size: 'small', value: 0.5 },
  { id: 'mid',    label: 'Mid',    size: 'small', value: 0.5 },
  { id: 'treble', label: 'Treble', size: 'small', value: 0.5 },
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
// knob: if set, this part is a pot that the named outside knob turns.
export const COMPONENTS = {
  // Stage 1: input shaping
  Cin:    { value: 100,  unit: 'nF', stage: 'inputShaping', desc: 'Input coupling capacitor' },
  Rin:    { value: 1,    unit: 'MΩ', stage: 'inputShaping', desc: 'Input resistor to ground' },
  // Stage 2: soft clipping (op-amp with diodes in the feedback loop)
  Rg:     { value: 4.7,  unit: 'kΩ', stage: 'softClip', desc: 'Gain-setting resistor to ground' },
  Cg:     { value: 47,   unit: 'nF', stage: 'softClip', desc: 'Capacitor in series with Rg' },
  Rdrive: { value: 500,  unit: 'kΩ', stage: 'softClip', desc: 'Drive pot in the feedback loop', knob: 'drive' },
  Cf1:    { value: 51,   unit: 'pF', stage: 'softClip', desc: 'Feedback capacitor' },
  D1:     { value: '1N4148', type: 'diode', stage: 'softClip', desc: 'Diode pair in the feedback loop' },
  // Stage 3: hard clipping (gain stage + diodes to ground)
  C1:     { value: 100,  unit: 'nF', stage: 'hardClip', desc: 'Coupling capacitor into the second op-amp' },
  R1:     { value: 10,   unit: 'kΩ', stage: 'hardClip', desc: 'Input resistor of the second op-amp' },
  Rf:     { value: 100,  unit: 'kΩ', stage: 'hardClip', desc: 'Feedback resistor' },
  Cf2:    { value: 100,  unit: 'pF', stage: 'hardClip', desc: 'Feedback capacitor' },
  Cc:     { value: 1,    unit: 'µF', stage: 'hardClip', desc: 'Output coupling capacitor' },
  Rc:     { value: 1,    unit: 'kΩ', stage: 'hardClip', desc: 'Series resistor before the diodes' },
  D2:     { value: '1N34A', type: 'diode', stage: 'hardClip', desc: 'Diode pair to ground' },
  // Stage 4: tone
  Rtone:  { value: 20,   unit: 'kΩ', stage: 'tone', desc: 'Tone resistor' },
  Ct:     { value: 22,   unit: 'nF', stage: 'tone', desc: 'Tone capacitor to ground' },
  // Stage 5: level
  Level:  { value: 100,  unit: 'kΩ', stage: 'level', desc: 'Output volume pot', knob: 'level' },
};

export const UNIT_SCALE = { pF: 1e-12, nF: 1e-9, 'µF': 1e-6, 'Ω': 1, 'kΩ': 1e3, 'MΩ': 1e6 };
