# Distortion Pedal, Opened Up

An interactive website that shows what a guitar distortion pedal does to a clean signal.

| Input | Mechanism | Output |
|---|---|---|
| Clean guitar recordings (`/audio`) or the V-Inst guitar neck (click a fret) | A 5-stage pedal: input shaping → pre-gain → hard clipping → tone → level. **Outside view:** knobs (drive, tone, level) and a footswitch. **X-ray view:** a schematic where every part (resistors, capacitors, diodes) can be edited. Each stage can be switched on or off. | The sound, plus before/after oscilloscopes |

No build step and no dependencies: plain HTML, CSS and JavaScript modules.

## Run it locally

JavaScript modules don't load from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Use headphones.

## Where your code goes

**`js/mechanism.js`** is the only file you need for the pedal's sound. It has five
TODO stages that are pass-throughs for now. The comment block at the top explains:

- what each stage must return (`input`, `output`, `update(state)`)
- what's inside `state` (knob positions, every part value in SI units, diode forward voltages)
- the Web Audio nodes you'll probably use

Stage on/off switches and the footswitch are already handled for you.

## Other files

| File | What it does |
|---|---|
| `js/config.js` | Clip names, knobs, stage names, part list with default values. Edit here to rename or retune. |
| `js/audio.js` | Audio graph, routing around switched-off stages, file loading, plucked strings |
| `js/xray.js` | Draws the schematic and the click-to-edit popover |
| `js/guitar.js` | The V-Inst neck (real fret spacing, standard tuning) |
| `js/scope.js` | Before/after oscilloscopes |
| `js/main.js` | Connects the UI pieces |
| `css/style.css` | The hand-drawn look |

## Adding recordings

Put clean (no effects) guitar `.wav` files in `/audio` with the names listed in
`js/config.js`. Until a file exists, the app plays a synthesized stand-in strum.

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Set **Source** to *Deploy from a branch*, pick `main` and `/ (root)`, and save.
4. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.
