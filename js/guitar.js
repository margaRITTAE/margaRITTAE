// guitar.js — the V-Inst: a vertical guitar neck. Click a fret to pluck.

const OPEN = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];   // E A D G B E (low → high)
const NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
const FRETS = 12;
const MARKERS = [3, 5, 7, 9];

export function mountGuitar(canvas, colorsFn, onPluck) {
  let flash = null;   // { s, f, t }

  // Real fret spacing: distance from nut to fret n = L * (1 - 2^(-n/12))
  const fretPos = n => 1 - Math.pow(2, -n / 12);
  const geom = () => {
    const b = canvas.getBoundingClientRect();
    const head = 46, top = head + 6, bottom = b.height - 6;
    const L = (bottom - top) / fretPos(FRETS);
    const left = b.width * 0.16, right = b.width * 0.84;
    return { w: b.width, h: b.height, head, top, bottom, L, left, right,
      sx: s => left + (s / 5) * (right - left),
      fy: n => top + L * fretPos(n) };
  };

  function draw() {
    const b = canvas.getBoundingClientRect(), d = devicePixelRatio || 1;
    canvas.width = Math.round(b.width * d); canvas.height = Math.round(b.height * d);
    const c = canvas.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    const g = geom(), K = colorsFn();
    c.clearRect(0, 0, g.w, g.h);
    c.lineCap = 'round'; c.lineJoin = 'round';

    // headstock
    c.strokeStyle = K.ink; c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(g.left - 10, g.top); c.lineTo(g.left - 18, 8); c.quadraticCurveTo(g.w / 2, -4, g.right + 18, 8); c.lineTo(g.right + 10, g.top);
    c.stroke();
    // tuning pegs
    for (let s = 0; s < 6; s++) {
      const x = g.sx(s);
      c.beginPath(); c.arc(x, 26, 4, 0, Math.PI * 2); c.stroke();
      c.fillStyle = K.muted; c.font = `13px ${K.font}`; c.textAlign = 'center'; c.fillText(NAMES[s], x, 46);
    }
    // neck outline
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(g.left - 10, g.top); c.lineTo(g.left - 10, g.bottom); c.moveTo(g.right + 10, g.top); c.lineTo(g.right + 10, g.bottom); c.stroke();
    // nut
    c.lineWidth = 5; c.beginPath(); c.moveTo(g.left - 10, g.top); c.lineTo(g.right + 10, g.top); c.stroke();
    // frets + markers
    c.lineWidth = 2;
    for (let n = 1; n <= FRETS; n++) {
      const y = g.fy(n);
      c.beginPath(); c.moveTo(g.left - 10, y); c.lineTo(g.right + 10, y); c.stroke();
      const ym = (g.fy(n - 1) + y) / 2;
      c.fillStyle = K.muted;
      if (MARKERS.includes(n)) { c.beginPath(); c.arc(g.w / 2, ym, 4, 0, Math.PI * 2); c.fill(); }
      if (n === 12) { [-1, 1].forEach(k => { c.beginPath(); c.arc(g.w / 2 + k * 14, ym, 4, 0, Math.PI * 2); c.fill(); }); }
    }
    // strings (thicker for low strings)
    for (let s = 0; s < 6; s++) {
      c.lineWidth = 2.6 - s * 0.3; c.strokeStyle = K.ink;
      c.beginPath(); c.moveTo(g.sx(s), 26); c.lineTo(g.sx(s), g.bottom); c.stroke();
    }
    // pressed note
    if (flash && performance.now() - flash.t < 500) {
      const y = flash.f === 0 ? g.top - 10 : (g.fy(flash.f - 1) + g.fy(flash.f)) / 2;
      c.fillStyle = K.accent; c.beginPath(); c.arc(g.sx(flash.s), y, 8, 0, Math.PI * 2); c.fill();
      requestAnimationFrame(draw);
    }
  }

  function hit(e) {
    const r = canvas.getBoundingClientRect(), g = geom();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const s = Math.round(((x - g.left) / (g.right - g.left)) * 5);
    if (s < 0 || s > 5) return null;
    if (y < g.top) return { s, f: 0 };          // above the nut = open string
    for (let n = 1; n <= FRETS; n++) if (y <= g.fy(n)) return { s, f: n };
    return null;
  }

  canvas.addEventListener('pointerdown', e => {
    const h = hit(e); if (!h) return;
    flash = { ...h, t: performance.now() };
    onPluck(OPEN[h.s] * Math.pow(2, h.f / 12));
    draw();
  });

  new ResizeObserver(draw).observe(canvas);
  return { redraw: draw };
}
