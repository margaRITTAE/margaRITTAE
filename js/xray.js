// xray.js — draws the hand-drawn schematic and lets visitors click a part to edit it.
import { STAGES, COMPONENTS, DIODES } from './config.js';

// ---------- tiny schematic drawing helpers (all return SVG strings) ----------
const P = d => `<path d="${d}"/>`;
const wire = (...pts) => P('M' + pts.map(p => p.join(' ')).join(' L'));
const dot = (x, y) => `<circle class="node" cx="${x}" cy="${y}" r="3.2"/>`;
function resH(x1, x2, y) {           // horizontal resistor zigzag
  const n = 6, s = (x2 - x1) / n; let d = `M${x1} ${y}`;
  for (let i = 0; i < n; i++) d += ` L${x1 + s * (i + 0.5)} ${y + (i % 2 ? 6 : -6)}`;
  return P(d + ` L${x2} ${y}`);
}
function resV(x, y1, y2) {
  const n = 6, s = (y2 - y1) / n; let d = `M${x} ${y1}`;
  for (let i = 0; i < n; i++) d += ` L${x + (i % 2 ? 6 : -6)} ${y1 + s * (i + 0.5)}`;
  return P(d + ` L${x} ${y2}`);
}
const capH = (x, y) => P(`M${x - 4} ${y - 11} V${y + 11} M${x + 4} ${y - 11} V${y + 11}`);
const capV = (x, y) => P(`M${x - 11} ${y - 4} H${x + 11} M${x - 11} ${y + 4} H${x + 11}`);
const gnd = (x, y) => P(`M${x - 11} ${y} H${x + 11} M${x - 7} ${y + 5} H${x + 7} M${x - 3} ${y + 10} H${x + 3}`);
const gndUp = (x, y) => P(`M${x - 11} ${y} H${x + 11} M${x - 7} ${y - 5} H${x + 7} M${x - 3} ${y - 10} H${x + 3}`);
const diodeH = (x, y, right) => right
  ? P(`M${x - 7} ${y - 7} L${x + 6} ${y} L${x - 7} ${y + 7} Z M${x + 6} ${y - 7} V${y + 7}`)
  : P(`M${x + 7} ${y - 7} L${x - 6} ${y} L${x + 7} ${y + 7} Z M${x - 6} ${y - 7} V${y + 7}`);
const diodeV = (x, y, down) => down
  ? P(`M${x - 7} ${y - 7} L${x + 7} ${y - 7} L${x} ${y + 6} Z M${x - 7} ${y + 6} H${x + 7}`)
  : P(`M${x - 7} ${y + 7} L${x + 7} ${y + 7} L${x} ${y - 6} Z M${x - 7} ${y - 6} H${x + 7}`);
const opamp = (x, y, name) => P(`M${x} ${y - 40} L${x} ${y + 40} L${x + 70} ${y} Z`)
  + `<text class="sym" x="${x + 6}" y="${y - 16}">+</text><text class="sym" x="${x + 6}" y="${y + 26}">−</text><text class="tiny" x="${x + 20}" y="${y + 5}">${name}</text>`;
const txt = (x, y, s, cls = 'tiny', anchor = 'start') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
// clickable part label: name + value on two lines
const part = (id, x, y, anchor = 'middle') =>
  `<g class="part" data-c="${id}" tabindex="0" role="button" aria-label="Edit ${id}">`
  + `<text class="pname" x="${x}" y="${y}" text-anchor="${anchor}">${id}</text>`
  + `<text class="pval" data-v="${id}" x="${x}" y="${y + 14}" text-anchor="${anchor}"></text></g>`;

// ---------- the schematic, split into the five stages ----------
// Coordinates follow the hand-drawn sketch: IN → Cin/Rin → op-amp 1 → Ci/Ri →
// op-amp 2 → Cc/Rc/diodes → Rtone/Ct → Level → OUT
const REGIONS = { inputShaping: [8, 186], softClip: [186, 374], hardClip: [374, 852], tone: [852, 962], level: [962, 1102] };

const DRAW = {
  inputShaping:
    txt(14, 95, 'IN', 'lbl') + wire([40, 90], [76, 90]) + capH(80, 90) + wire([84, 90], [186, 90])
    + dot(130, 90) + wire([130, 90], [130, 118]) + resV(130, 118, 168) + wire([130, 168], [130, 186]) + gnd(130, 186)
    + part('Cin', 80, 64) + part('Rin', 146, 140, 'start'),

  softClip:
    wire([186, 90], [260, 90]) + opamp(260, 110, 'U1') + wire([330, 110], [374, 110]) + dot(350, 110)
    // feedback loop: Cf1 ‖ Rdrive
    + wire([240, 130], [260, 130]) + wire([240, 130], [240, 215]) + wire([350, 110], [350, 215])
    + wire([240, 185], [291, 185]) + capH(295, 185) + wire([299, 185], [350, 185])
    + wire([240, 215], [270, 215]) + resH(270, 320, 215) + wire([320, 215], [350, 215])
    + dot(240, 130) + dot(240, 160) + dot(240, 185) + dot(350, 185)
    // gain leg to ground: Rg + Cg
    + wire([240, 160], [205, 160], [205, 172]) + resV(205, 172, 212) + wire([205, 212], [205, 226]) + capV(205, 230) + wire([205, 234], [205, 248]) + gnd(205, 248)
    + part('Cf1', 356, 180, 'start') + part('Rdrive', 356, 216, 'start')
    + part('Rg', 198, 188, 'end') + part('Cg', 198, 226, 'end'),

  hardClip:
    wire([374, 110], [380, 110], [380, 140], [391, 140]) + capH(395, 140) + wire([399, 140], [430, 140]) + resH(430, 480, 140) + wire([480, 140], [560, 140])
    + opamp(560, 120, 'U2') + wire([560, 100], [540, 100], [540, 62]) + gndUp(540, 62) + txt(540, 40, 'GND', 'tiny', 'middle')
    + dot(520, 140) + wire([520, 140], [520, 235]) + wire([630, 120], [686, 120]) + dot(650, 120) + wire([650, 120], [650, 235])
    + wire([520, 200], [560, 200]) + resH(560, 610, 200) + wire([610, 200], [650, 200])
    + wire([520, 235], [581, 235]) + capH(585, 235) + wire([589, 235], [650, 235]) + dot(520, 200) + dot(650, 200)
    + capH(690, 120) + wire([694, 120], [715, 120]) + resH(715, 765, 120) + wire([765, 120], [852, 120])
    + dot(795, 120) + wire([795, 120], [795, 151]) + diodeV(795, 158, true) + wire([795, 165], [795, 196]) + gnd(795, 196)
    + dot(825, 120) + wire([825, 120], [825, 151]) + diodeV(825, 158, false) + wire([825, 165], [825, 196]) + gnd(825, 196)
    + part('Ci', 395, 114) + part('Ri', 455, 120) + part('Rf', 585, 186) + part('Cf2', 585, 262)
    + part('Cc', 690, 94) + part('Rc', 740, 100) + part('D2', 810, 228),

  tone:
    wire([852, 120], [865, 120]) + resH(865, 915, 120) + wire([915, 120], [962, 120])
    + dot(940, 120) + wire([940, 120], [940, 150]) + capV(940, 154) + wire([940, 158], [940, 182]) + gnd(940, 182)
    + part('Rtone', 890, 100) + part('Ct', 912, 150, 'end'),

  level:
    wire([962, 120], [975, 120]) + `<rect x="975" y="104" width="64" height="32" rx="6"/>` + txt(1007, 125, 'LEVEL', 'lbl', 'middle')
    + wire([1039, 120], [1066, 120]) + txt(1070, 125, 'OUT', 'lbl')
    + part('Level', 1007, 160),
};

// ---------- formatting ----------
export function formatValue(id, state) {
  const c = COMPONENTS[id], v = state.parts[id];
  if (c.type === 'diode') return v;
  if (c.knob) return `${v.min}–${v.max} ${c.unit} pot · ${Math.round(state.knobs[c.knob] * 100)}%`;
  return `${v} ${c.unit}`;
}

// ---------- mount ----------
export function mountXray({ svgHost, togglesHost, readoutHost, popover, state, onChange, describe }) {
  // stage toggles (above the schematic)
  togglesHost.innerHTML = STAGES.map((s, i) =>
    `<button class="toggle" data-i="${i}" aria-pressed="true"><span class="box"></span>${i + 1}. ${s.name}</button>`).join('');
  togglesHost.querySelectorAll('.toggle').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i; state.stageOn[i] = !state.stageOn[i]; onChange();
  }));

  // schematic
  const regions = STAGES.map(s => {
    const [x1, x2] = REGIONS[s.id];
    return `<g class="stage" data-stage="${s.id}">`
      + `<rect class="region" x="${x1}" y="4" width="${x2 - x1}" height="300" rx="10"/>`
      + `<text class="stage-name" x="${(x1 + x2) / 2}" y="22" text-anchor="middle">${s.name}</text>`
      + `<text class="readout" data-r="${s.id}" x="${(x1 + x2) / 2}" y="300" text-anchor="middle"></text>`
      + `<g class="ink" filter="url(#wobble)">${DRAW[s.id]}</g></g>`;
  }).join('');
  svgHost.innerHTML =
    `<svg viewBox="0 0 1110 310" role="img" aria-label="Schematic of the pedal. Click a part to change its value.">
      <defs><filter id="wobble"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4"/>
      <feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></defs>${regions}</svg>`;

  // click a part → popover editor
  let current = null;
  function open(id, anchorEl) {
    current = id;
    const c = COMPONENTS[id];
    const v = state.parts[id];
    const field = c.type === 'diode'
      ? `<select id="pv">${Object.entries(DIODES).map(([k, d]) => `<option value="${k}"${k === v ? ' selected' : ''}>${d.label}</option>`).join('')}</select>`
      : c.knob
        ? `<span class="pv-row"><label for="pvMin">min</label><input id="pvMin" type="number" step="any" min="0" value="${v.min}"><label for="pvMax">max</label><input id="pvMax" type="number" step="any" min="0" value="${v.max}"><span>${c.unit}</span></span>`
        : `<span class="pv-row"><input id="pv" type="number" step="any" min="0" value="${v}"><span>${c.unit}</span></span>`;
    popover.innerHTML = `<b>${id}</b><p>${c.desc}${c.knob ? `. Turned by the <u>${c.knob}</u> knob.` : '.'}</p>${field}<button class="close" aria-label="Close">×</button>`;
    popover.hidden = false;
    const host = popover.offsetParent.getBoundingClientRect(), a = anchorEl.getBoundingClientRect();
    const left = Math.min(Math.max(8, a.left - host.left - 20), host.width - popover.offsetWidth - 8);
    popover.style.left = left + 'px';
    popover.style.top = (a.bottom - host.top + 8) + 'px';
    if (c.knob) {
      const lo = popover.querySelector('#pvMin'), hi = popover.querySelector('#pvMax');
      lo.focus();
      const commit = () => {
        const a = parseFloat(lo.value), b = parseFloat(hi.value);
        if (!(a >= 0) || !(b > a)) return;        // need 0 ≤ min < max
        state.parts[id] = { min: a, max: b }; onChange();
      };
      lo.addEventListener('input', commit); hi.addEventListener('input', commit);
    } else {
      const input = popover.querySelector('#pv');
      input.focus();
      input.addEventListener(c.type === 'diode' ? 'change' : 'input', () => {
        if (c.type === 'diode') state.parts[id] = input.value;
        else { const n = parseFloat(input.value); if (!(n > 0)) return; state.parts[id] = n; }
        onChange();
      });
    }
    popover.querySelector('.close').addEventListener('click', close);
  }
  function close() { popover.hidden = true; if (current) svgHost.querySelector(`[data-c="${current}"]`)?.focus(); current = null; }
  svgHost.querySelectorAll('.part').forEach(g => {
    g.addEventListener('click', e => { e.stopPropagation(); open(g.dataset.c, g); });
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(g.dataset.c, g); } });
  });
  popover.addEventListener('click', e => e.stopPropagation());
  popover.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter') close(); });
  document.addEventListener('click', () => { if (!popover.hidden) close(); });

  // refresh labels, toggles, readouts
  return function refresh(fullState) {
    togglesHost.querySelectorAll('.toggle').forEach((b, i) => b.setAttribute('aria-pressed', String(state.stageOn[i])));
    STAGES.forEach((s, i) => {
      svgHost.querySelector(`[data-stage="${s.id}"]`).classList.toggle('off', !state.stageOn[i] || !state.pedalOn);
      let r = '';
      try { r = describe(s.id, fullState) || ''; } catch (e) { console.error(e); }
      svgHost.querySelector(`[data-r="${s.id}"]`).textContent = r;
    });
    svgHost.querySelectorAll('[data-v]').forEach(t => { t.textContent = formatValue(t.dataset.v, state); });
  };
}
