# Distortion Pedal, Opened Up

**Live site:** https://margarittae.github.io/margaRITTAE/ (USE HEADPHONES)

Almost every rock record uses a distortion pedal, but few players know what happens inside the box. This site lets you play a clean guitar through a simulated pedal, open it up, and watch the signal change at each step.

## Why we made this

Distortion pedals are everyday gear for guitarists. You step on one and the guitar gets RrrrAgH. What's actually happening is less known: a small circuit of op-amps, capacitors and diodes cuts the top and bottom off the guitar's waveform, and that clipping is what we hear as **DiSTorTiON**!!!

Our goal was to make that hidden mechanism visible and hands-on:

- **Input:** a clean guitar signal you choose.
- **Mechanism:** the pedal's circuit, which you can change from the outside (knobs) or the inside (parts).
- **Output:** the sound, plus oscilloscopes showing the wave before and after.

## How to use it

1. **Pick a sound:** a recording (`solo.wav`), a single sustained note, or click a fret on the guitar neck (V-Inst).
2. **Press Play** and compare the **Before** and **After** scopes in the Output column.
3. **Turn the knobs** on the pedal: Drive, Tone and Level. The footswitch turns the whole pedal on and off.
4. **Open the X-ray view:**
   - Hover over the schematic to magnify it and see what each section does.
   - Click any resistor or capacitor to change its value.
   - Use the checkboxes to switch stages off one at a time and see what each one contributes.

## The mechanism

The pedal has five stages, modeled on a real two-op-amp distortion circuit:

```
                                                         GND
                                                          │
Signal ── Cin ──┬─────── + ┌──────┐                    └─ + ┌──────┐
                │          │OP Amp├─┐                       │OP Amp├─┬── Cc ── Rc ─┬─┬── Rtone ─┬── Level ── Out
               Rin       - └──────┘ ├── Ci ── Ri ─────── - └──────┘ │             ▼ ▲          │
                │        │          │                     │          │             └┬┘          Ct
               GND       ├── Cf1 ───┤                     ├── Cf2 ───┤              │           │
                         │          │                     │          │             GND         GND
               Cg ── Rg ─┴─ Rdrive ─┘                     └─── Rf ───┘
```

Numbers below use the default part values from `js/config.js`.

| # | Stage | What the circuit does | How we simulate it |
|---|---|---|---|
| 1 | **Input shaping** (Cin, Rin) | A series capacitor and a resistor to ground form a highpass filter. It blocks DC and rumble below about **34 Hz**. | Web Audio highpass filter at f = 1 / (2π·Rin·Cin) |
| 2 | **Pre-gain** (Rdrive, Rg, Cg, Cf1) | Op-amp 1 boosts the signal by 1 + Rdrive / Rg: **2× to 151×**, set by the Drive knob. Cg keeps the bass from being boosted as much (corner around 720 Hz), and Cf1 rolls off the extreme highs. When the boosted signal hits the op-amp's supply limits, it saturates. | Solved sample by sample (AudioWorklet). Kirchhoff's current law at the op-amp's input is discretized with backward Euler, and the output goes through a tanh rail limit at +3.6 V / −3.2 V. The asymmetry adds even harmonics. |
| 3 | **Hard clipping** (Ci, Ri, Rf, Cf2, Cc, Rc, diodes) | Op-amp 2 adds about **100× more gain** (Rf / Ri), then a pair of diodes to ground clamps the signal. They conduct hard above roughly half a volt, flattening the wave into something close to a square wave. **This is the distortion.** | Per-sample AudioWorklet. The diodes follow the Shockley equation, I = 2·Is·sinh(V / n·Vt), and the clipper's nonlinear circuit equation is solved with **Newton–Raphson** iteration on every sample. |
| 4 | **Tone** (Rtone, Ct) | A resistor and a capacitor to ground make a lowpass filter. It tames the harsh high harmonics that clipping creates: from about **3.2 kHz** (bright) to **340 Hz** (dark). | Web Audio lowpass filter at f = 1 / (2π·Rtone·Ct), with a logarithmic knob taper |
| 5 | **Level** | Sets the output volume. | Web Audio gain |

**Why clipping sounds like distortion:** a clean note is a smooth, mostly rounded wave. Flattening its peaks adds new frequencies, called harmonics, at multiples of the note's pitch. The harder the clip (more Drive), the more harmonics, and the RrrrAgH-er it sounds. Switch off the hard-clipping stage in the X-ray view to hear and see the difference.

## Project structure

```
index.html              page layout (Input | Mechanism | Output)
css/style.css           hand-drawn look
audio/solo.wav          clean guitar recording (44.1 kHz, 16-bit)
js/
  mechanism.js          the five pedal stages and how parts map to them
  distortion-worklet.js per-sample circuit solvers (pre-gain, hard clipping)
  config.js             part values, knobs, stages, clips
  audio.js              audio routing, stage on/off, footswitch, clip loading
  xray.js               schematic, magnifier, click-to-edit parts
  scope.js              before/after oscilloscopes
  guitar.js             V-Inst guitar neck (plucked-string synthesis)
  loudness.js           LUFS loudness meter for leveling the synthesized sounds
  main.js               connects the UI to the audio
```

Plain HTML, CSS and JavaScript, with no build step and no libraries. Audio runs on the Web Audio API at 44.1 kHz.

## Where AI was used

- **Circuit model (ours):** the circuit analysis and the per-stage math in `mechanism.js` and `distortion-worklet.js` were written by us, starting from our own C++ model of the pedal.
- **Built with AI:** we used Claude (Anthropic) as a coding assistant to build the website around that model:
  - the page layout and hand-drawn styling
  - the X-ray schematic and magnifier
  - the oscilloscopes and the V-Inst guitar
  - clip loading, loudness matching, and the audio routing that lets each stage be switched on and off
- **Early planning:** we also used it for early pitch sketches while choosing the topic.

We reviewed and tested everything it produced.

## Run it locally

JavaScript modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Adding recordings

Put clean guitar `.wav` files (no effects, ideally 44.1 kHz) in `audio/` and list them in `CLIPS` in `js/config.js`. If a listed file is missing, the site plays a synthesized stand-in strum instead.
