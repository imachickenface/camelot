/**
 * Generates the ORIGINAL pixel-art placeholder portraits used by Camelot.
 * Run with:  npm run gen:portraits
 *
 * Everything here is drawn from scratch as an ASCII grid -> chunky SVG <rect> pixels.
 * No copyrighted art is used. Users can override any portrait via the Agent Editor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'src', 'assets', 'portraits');
const UI = path.resolve(__dirname, '..', 'src', 'assets', 'ui');

/** Mirror an array of left-half row strings into full symmetric rows (col N-1
 * and col N, the two center columns, come out identical — a small flat seam
 * that's normal in pixel-art symmetric faces). Used by the chibi portraits so
 * a face/dress only has to be authored once per side. */
function mirrorH(rows) {
  return rows.map((r) => r + [...r].reverse().join(''));
}

/** Turn an ASCII grid + palette into a pixel-perfect SVG string. */
function gridToSvg(grid, palette, bg, scale = 16) {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  let rects = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const ch = grid[y][x];
      const fill = palette[ch];
      if (!fill) continue; // space / unknown = transparent
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`;
    }
  }
  const bgRect = bg ? `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ` +
    `shape-rendering="crispEdges" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}">` +
    bgRect +
    rects +
    `</svg>\n`
  );
}

// ---- Palette keys ---------------------------------------------------------
// v void/outline  g gold  l pale-gold  c crimson  s skin  h beard-dark
// w beard-light   p purple  d purple-dark  m muted-grey  o torch-orange
// f forest-green (Percival)  y blond hair  k hair shadow
// t teal (Miku)  q teal shadow  r coral-rose (Teto)  n rose shadow
// x chibi cheek blush (shared by Miku/Teto)
const PAL = {
  v: '#0b0a12',
  g: '#c9a227',
  l: '#e8d48b',
  c: '#7a1e2b',
  s: '#e6b98a',
  h: '#5f5870',
  w: '#b8b2c4',
  p: '#3d2a5c',
  d: '#241833',
  m: '#8b8699',
  o: '#d97b29',
  f: '#2e6b40',
  y: '#b8933f',
  k: '#8a6a2e',
  t: '#189a8f',
  q: '#0c4d47',
  r: '#b8425f',
  n: '#6e2438',
  x: '#c9758a',
};

// ---- King Arthur: crowned bust, gold + crimson ---------------------------
const ARTHUR = [
  '                ',
  '   l   ll   l   ',
  '   g   gg   g   ',
  '  ggg gggg ggg  ',
  '  gggggggggggg  ',
  '  gcgggggggcgg  ',
  '  gggggggggggg  ',
  '  llllllllllll  ',
  '   vssssssssv   ',
  '   svvssssvvs   ',
  '   sssssssss    ',
  '   vssowwossv   ',
  '   vsswwwwssv   ',
  '   vwhhhhhhwv   ',
  '    whhhhhhw    ',
  '    vwhhhhwv    ',
  '  cc  vwwwv  cc  ',
  '  ccccgggggcccc ',
  ' cccccglglgccccc',
  ' cccccggggggcccc',
  ' vcccccccccccccv',
  '  vvcccccccccvv ',
];

// ---- Merlin the Wizard: pointed hat + gold star, white beard, purple robe --
const MERLIN = [
  '       pp       ',
  '      pppp      ',
  '      pppp      ',
  '     pppppp     ',
  '     ppllpp     ',
  '    pppggppp    ',
  '    pppppppp    ',
  '   gggggggggg   ',
  '  dddddddddddd  ',
  '   ssssssssss   ',
  '   wwssssssww   ',
  '   svvssssvvs   ',
  '   sswwwwwwss   ',
  '   wwwwwwwwww   ',
  '   whwwwwwwhw   ',
  '   wwwwwwwwww   ',
  '  pp  vwwwv  pp  ',
  '  ppppgggggpppp ',
  ' pppppglglgppppp',
  ' pppppggggggpppp',
  ' vpppppppppppppv',
  '  vvpppppppppvv ',
];

// ---- Sir Percival: bare-headed blond knight, forest-green cloak -----------
// Rows 0-7:   shaggy side-parted blond hair (no crown/hat — his key "tell")
// Rows 8:     shared eyes band (two v pupils on skin)
// Rows 9-15:  clean-shaven face + neck taper
// Rows 16-21: shared collar/chainmail/gold-cross rig, recolored green (f)
const PERCIVAL = [
  '                ',
  '    yyyyy       ',
  '   yyyyyyyy     ',
  '   yykyyyyyy    ',
  '  yyykyyyyyy y  ',
  '  yykyyyyyyyyy  ',
  '  ykyysssykyyyy ',
  '  ykysssssykyyy ',
  '   svvssssvvky  ',
  '   sssssssssss  ',
  '   vsssssssv    ',
  '   vsswwwwssv   ',
  '    whhhhhhw    ',
  '    vwhhhhwv    ',
  '   whhhhhhhw    ',
  '    vhhhhhv     ',
  '  ff  vwwwv  ff  ',
  '  ffffgggggffff ',
  ' fffffglglgfffff',
  ' fffffggggggffff',
  ' vfffffffffffffv',
  '  vvfffffffffvv ',
];

// ---- Miku: full-body chibi bard-knight — big teal-haired head over a small
// gowned body, in the "oversized head, stubby limbs" chibi proportions (see
// the brief's reference sketch) but kept dark-gothic: desaturated teal
// instead of idol-bright, a gold gorget/belt instead of jewelry, a laced
// knight-maiden gown instead of a school outfit. Authored as its left half
// (8 cols) and mirrored — see `mirrorH` — so the face/dress only exist once.
// Rows 0-9: twin-tails + head (hairline, bead eyes, cheek blush, jaw taper)
// Rows 10-13: neck, gold collar, dress shoulders/torso, gold belt
// Rows 14-17: flared skirt hem, boots lost in its shadow
const MIKU_L = [
  ' tt     ',
  ' ttqtttt',
  ' tqttttt',
  ' qtttttt',
  ' ttqssss',
  ' tqvssvs',
  ' qsssxss',
  '  ssssss',
  '   vssss',
  '    vsss',
  '   vgggg',
  ' vsttttt',
  ' vttqttt',
  ' vgggggg',
  '  vttttt',
  ' vtttttt',
  'vttqtttt',
  '   vvqqq',
];
const MIKU = mirrorH(MIKU_L);

// ---- Teto: full-body chibi minstrel-knight — same chibi rig as Miku, mirror-
// authored from `TETO_L`, but with coral drill-cone twin-tails (flaring wide
// at the crown instead of hanging straight) and the coral-rose (r/n) palette.
const TETO_L = [
  '  r     ',
  ' rnrrrrr',
  ' nrrrrrr',
  ' rnrrrrr',
  ' rnrssss',
  ' rnvssvs',
  ' nsssxss',
  '  ssssss',
  '   vssss',
  '    vsss',
  '   vgggg',
  ' vsrrrrr',
  ' vrrnrrr',
  ' vgggggg',
  '  vrrrrr',
  ' vrrrrrr',
  'vrrnrrrr',
  '   vvnnn',
];
const TETO = mirrorH(TETO_L);

// ---- The Mighty Crab: forward-facing crab face, orange shell --------------
// Rows 1-5:   two claws flaring up-and-out from the top corners
// Rows 6-9:   eye-stalks with round eyes peeking up between the claws
// Rows 10-14: wide rounded shell dome (crimson-mottled carapace)
// Rows 15-16: mandible/mouth notch
// Rows 17-20: short bent legs under the shell
const CRAB = [
  '                 ',
  'c               c',
  'cg             gc',
  'coo           ooc',
  'cooo         oooc',
  'coooc       coooc',
  'coooc  vov  coooc',
  'coooc vovov coooc',
  ' cooc vovov cooc ',
  '  vooo vov ooov  ',
  '  vooooooooooov  ',
  ' vooooooooooooov ',
  ' coooocooocooooc ',
  ' coooooooooooooc ',
  ' cocooococooococ ',
  '  vocoo v oocov  ',
  '   vco  v  ocv   ',
  '   c  c   c  c   ',
  '  c   c   c   c  ',
  ' c  c       c  c ',
  ' c c         c c ',
  '                 ',
];

// ---- Vacant seat: featureless silhouette, ghost-grey on purple ------------
const VACANT = [
  '                ',
  '                ',
  '      mmmm      ',
  '     mmmmmm     ',
  '     mmmmmm     ',
  '     mmmmmm     ',
  '      mmmm      ',
  '       mm       ',
  '      mmmm      ',
  '     mmmmmm     ',
  '    mmmmmmmm    ',
  '   mmmmmmmmmm   ',
  '  mmmmmmmmmmmm  ',
  '  mmmmmmmmmmmm  ',
  ' mmmmmmmmmmmmmm ',
  ' mmmmmmmmmmmmmm ',
  ' mmmmmmmmmmmmmm ',
  ' mmmmmmmmmmmmmm ',
  'mmmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmmmm',
];

// ---- Custom cursor: a small pixel sword, tip at the top-left (hotspot 1,1) --
const CURSOR = [
  'e               ',
  'be              ',
  'nbe             ',
  ' nbe            ',
  '  nbe           ',
  '   nbe          ',
  '    nbe         ',
  '   gnbeg        ',
  '  ggnbegg       ',
  ' g  gngg g      ',
  '     gng        ',
  '     gcg        ',
  '     gcg        ',
  '    gggggg      ',
  '     gllg       ',
  '                ',
];
const CURSOR_PAL = {
  e: '#f4f6ff', // blade highlight
  b: '#c3c7da', // blade steel
  n: '#3a3f52', // blade shadow / outline
  g: '#c9a227', // gold guard/hilt
  l: '#e8d48b', // pommel highlight
  c: '#7a1e2b', // grip
};

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(UI, { recursive: true });
fs.writeFileSync(path.join(OUT, 'arthur.svg'), gridToSvg(ARTHUR, PAL, '#14111d'));
fs.writeFileSync(path.join(OUT, 'merlin.svg'), gridToSvg(MERLIN, PAL, '#171226'));
fs.writeFileSync(path.join(OUT, 'percival.svg'), gridToSvg(PERCIVAL, PAL, '#12191a'));
fs.writeFileSync(path.join(OUT, 'miku.svg'), gridToSvg(MIKU, PAL, '#0f1a1c'));
fs.writeFileSync(path.join(OUT, 'teto.svg'), gridToSvg(TETO, PAL, '#1c1220'));
fs.writeFileSync(path.join(OUT, 'crab.svg'), gridToSvg(CRAB, PAL, '#1c1210'));
fs.writeFileSync(path.join(OUT, 'vacant-silhouette.svg'), gridToSvg(VACANT, PAL, '#241833'));
fs.writeFileSync(path.join(UI, 'cursor-sword.svg'), gridToSvg(CURSOR, CURSOR_PAL, null, 1.375));
console.log(
  'Wrote arthur.svg, merlin.svg, percival.svg, miku.svg, teto.svg, crab.svg, vacant-silhouette.svg, and ui/cursor-sword.svg',
);
