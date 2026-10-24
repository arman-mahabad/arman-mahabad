// Draws the pictures in this README: the name card at the top and one band per
// piece of work, each in that work's own colours and fonts (the same ones its
// page on byarman.site wears).
//
// The letters are turned into shapes here, so GitHub needs no font and every
// reader sees the same thing. The words also sit in the README as real text.
//
// Run: npm install, then npm run pictures. It writes ../assets/*.svg.

import { create } from 'fontkit';
import { decompress } from 'wawoff2';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// fontkit trips over some .woff2 glyphs, so each file is unpacked to a plain
// TrueType font first. Each width and weight gets its own copy, with the axes
// set before first use.
const raw = {};
for (const file of ['archivo', 'plex-mono-500', 'bricolage-grotesque-800', 'parkinsans', 'hanken-grotesk', 'onest', 'fraunces']) {
  raw[file] = Buffer.from(await decompress(readFileSync(fileURLToPath(new URL(`fonts/${file}.woff2`, import.meta.url)))));
}

const fonts = {};
function font(file, axes = {}) {
  const key = `${file} ${JSON.stringify(axes)}`;
  if (fonts[key]) return fonts[key];
  const face = create(raw[file]);
  if (face.fvar) {
    face.variationCoords = face.fvar.axis.map(({ axisTag, minValue, maxValue, defaultValue }) =>
      axisTag.trim() in axes ? Math.max(minValue, Math.min(maxValue, axes[axisTag.trim()])) : defaultValue);
  }
  return (fonts[key] = face);
}

// One line of text as a single path. x is the left edge, or the right edge when
// align is 'end'. track is in em, like CSS letter-spacing.
function text(str, { face, size, x, y, track = 0, align = 'start', fill, skew = 0 }) {
  const run = face.layout(str);
  const s = size / face.unitsPerEm;
  const gap = track * face.unitsPerEm;
  const width = (run.positions.reduce((w, p) => w + p.xAdvance + gap, 0) - gap) * s;
  const left = align === 'end' ? x - width : x;
  const slant = Math.tan((skew * Math.PI) / 180);

  let pen = 0;
  let d = '';
  run.glyphs.forEach((glyph, i) => {
    const p = run.positions[i];
    const at = (gx, gy) => {
      const px = left + (pen + p.xOffset + gx) * s + gy * s * slant;
      const py = y - (p.yOffset + gy) * s;
      return `${px.toFixed(1)} ${py.toFixed(1)}`;
    };
    for (const { command, args } of glyph.path.commands) {
      const pts = [];
      for (let k = 0; k < args.length; k += 2) pts.push(at(args[k], args[k + 1]));
      d += { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' }[command] + pts.join(' ');
    }
    pen += p.xAdvance + gap;
  });
  return { svg: `<path fill="${fill}" d="${d}"/>`, width, left };
}

// The plain line arrow from the site, pointing out to another site.
function outArrow(x, y, size, colour) {
  const k = size / 12;
  return `<path d="M-5 0H5M1 -4L5 0L1 4" transform="translate(${x} ${y}) rotate(-45) scale(${k})" fill="none" stroke="${colour}" stroke-width="${1.3}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// The Meds.krd wordmark's gold sun: a disc and 21 sharp rays, one straight up.
function sun(cx, cy, r, colour) {
  const at = (rad, t) => `${(cx + Math.cos(t) * rad * r / 100).toFixed(1)} ${(cy + Math.sin(t) * rad * r / 100).toFixed(1)}`;
  const half = (Math.PI / 21) * 0.62;
  let d = `M${at(46, -Math.PI / 2)}A${0.46 * r} ${0.46 * r} 0 1 1 ${at(46, Math.PI / 2)}A${0.46 * r} ${0.46 * r} 0 1 1 ${at(46, -Math.PI / 2)}Z`;
  for (let k = 0; k < 21; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 21;
    d += `M${at(46, a - half)}L${at(100, a)}L${at(46, a + half)}Z`;
  }
  return `<path fill="${colour}" d="${d}"/>`;
}

const mono = font('plex-mono-500');
const W = 1600;

function card(h, ground, label, body, edge) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${label}">
<title>${label}</title>
<rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="22" fill="${ground}"${edge ? ` stroke="${edge}" stroke-width="2"` : ''}/>
${body}
</svg>
`;
}

function write(name, svg) {
  writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), svg);
  console.log(`assets/${name}.svg  ${(svg.length / 1024).toFixed(1)} KB`);
}

// The name card. The hub's own look: warm near-black, bone ink, the quiet teal
// for small labels, and red for the name only.
{
  const archivo = (wght, wdth = 100) => font('archivo', { wght, wdth });
  const parts = [
    text('Slemani, Kurdistan', { face: mono, size: 34, x: 80, y: 96, fill: '#9AB6B6' }).svg,
    text('byarman.site', { face: mono, size: 34, x: W - 80, y: 96, align: 'end', fill: '#9AB6B6' }).svg,
    text('Arman Mahabad', { face: archivo(700, 92), size: 200, x: 70, y: 282, track: -0.04, fill: '#E8291F' }).svg,
    text('I design and build things, and I prove they work.', { face: archivo(400), size: 54, x: 80, y: 370, track: -0.005, fill: '#E6E0D5' }).svg,
  ];
  write('name', card(440, '#11100E', 'Arman Mahabad. I design and build things, and I prove they work.', parts.join('\n'), '#E6E0D522'));
}

// One band per piece of work, in the order the README shows them. Colours and
// faces come from each work's file on byarman.site.
const work = [
  {
    file: 'meds-krd', kind: 'Study app', site: 'meds.krd',
    look: { paper: '#F4F4F1', toner: '#1C1C1A', toner2: '#55554F', pen: '#A3232F', gold: '#B8862B' },
    head: () => font('bricolage-grotesque-800', { wdth: 100 }), track: -0.02,
    mark: { text: 'meds', accent: 'krd', sun: true },
  },
  {
    file: 'tend', kind: 'Private habit app', site: 'tendlamp.space',
    look: { paper: '#E8EEF5', toner: '#18233A', toner2: '#4C5871', pen: '#7A2335' },
    head: () => font('parkinsans', { wght: 700 }), track: -0.025,
    mark: { text: 'Tend' },
  },
  {
    file: 'zms', kind: 'Online shop', site: 'zandms.store',
    look: { paper: '#FFFFFF', toner: '#1B1A18', toner2: '#67625B', pen: '#2C4230' },
    head: () => font('hanken-grotesk', { wght: 800 }), track: -0.035,
    mark: { text: 'ZMS' },
  },
  {
    file: 'swaplane', kind: 'Shift swaps', site: 'swaplane.site',
    look: { paper: '#171313', toner: '#EFE8DE', toner2: '#B0A69F', pen: '#D0637A' },
    head: () => font('onest', { wght: 700 }), track: -0.03,
    mark: { text: 'Swaplane' },
  },
  {
    file: 'armanleads', kind: 'Dental marketing', site: 'armanleads.com',
    look: { paper: '#F4EFE6', toner: '#1A1815', toner2: '#5F5850', pen: '#7A1F2B' },
    head: () => font('fraunces', { wght: 400 }), track: -0.012,
    mark: { text: 'Arman', accent: 'Leads' },
  },
];

for (const w of work) {
  const { paper, toner, toner2, pen, gold } = w.look;
  const face = w.head();
  const size = 112;
  const y = 196;
  const parts = [text(w.kind, { face: mono, size: 34, x: 80, y: 88, fill: toner2 }).svg];

  // The wordmark, built the way the site builds it: the name, then the sun or
  // the accent in the work's pen colour.
  const name = text(w.mark.text, { face, size, x: 76, y, track: w.track, fill: toner });
  parts.push(name.svg);
  let x = name.left + name.width;
  if (w.mark.sun) {
    const r = size * 0.21;
    x += size * 0.06;
    parts.push(sun(x + r, y - size * 0.3, r, gold));
    x += 2 * r + size * 0.06;
    parts.push(text(w.mark.accent, { face, size, x, y, track: w.track, fill: toner }).svg);
  } else if (w.mark.accent) {
    x += size * w.track;
    parts.push(text(w.mark.accent, { face, size, x, y, track: w.track, fill: pen, skew: 12 }).svg);
  }

  const domain = text(w.site, { face: mono, size: 38, x: W - 126, y: y - 8, align: 'end', fill: toner2 });
  parts.push(domain.svg, outArrow(W - 96, y - 20, 38, toner2));

  const edge = `${toner}22`;
  write(w.file, card(240, paper, `${w.mark.text}${w.mark.accent ?? ''}: ${w.kind.toLowerCase()}, ${w.site}`, parts.join('\n'), edge));
}
