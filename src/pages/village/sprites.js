/**
 * sprites.js — ORIGINAL code-drawn pixel art for the Village.
 *
 * Every sprite here is generated once into an offscreen <canvas> using tiny
 * rectangle "pixels", then blitted to the main canvas each frame. Nothing is a
 * copyrighted asset — the chibi King Arthur, the cottages and the props are all
 * hand-authored pixel grids below.
 *
 * Convention: a sprite is authored on a small logical grid (e.g. 16x24) where
 * each cell is one chunky pixel. buildSprite() renders that grid to an offscreen
 * canvas at 1px == 1 cell (crisp, no smoothing); the scene scales it up.
 */

// ---- Theme palette (mirrors src/styles/theme.css — kept in sync by hand) ----
export const PAL = {
  voidBlack: '#0b0a12',
  dungeonStone: '#1a1725',
  raisedStone: '#262033',
  agedGold: '#c9a227',
  paleGold: '#e8d48b',
  goldDim: '#7d6518',
  goldDark: '#4f3f0f',
  bloodCrimson: '#7a1e2b',
  crimsonDark: '#4a121b',
  crimsonBright: '#a83545',
  royalPurple: '#3d2a5c',
  purpleDark: '#241833',
  purpleLight: '#57407e',
  ghostGrey: '#8b8699',
  parchment: '#d8cfc0',
  torchOrange: '#d97b29',
  stoneEdgeLight: '#3a3350',
  stoneEdgeDark: '#050409',
  // scene-only mixes (dusk grass / cobble / wood), tuned to the dark palette
  grass: '#171b1a',
  grass2: '#1e2422',
  grass3: '#141814',
  cobble: '#2a2636',
  cobble2: '#211d2c',
  path: '#332b3d',
  path2: '#3d3448',
  wood: '#2b2030',
  woodDark: '#1c1422',
  skin: '#c9a58a',
  skinDark: '#a07d63',
};

/**
 * Create an offscreen canvas of `w`x`h` logical pixels with smoothing disabled.
 * Returns { canvas, ctx }.
 */
export function makeOffscreen(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Paint a sprite from a compact string grid.
 * `rows` is an array of equal-length strings; each char maps via `map` to a
 * color (or null/undefined = transparent). Great for authoring readable art.
 */
export function paintGrid(ctx, rows, map, ox = 0, oy = 0) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = map[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/* ============================================================
   CHIBI KING ARTHUR — 16x24 logical px, 4 directions x 2 walk frames.
   Crowned, gold + crimson palette. Authored as grids so the pose reads.
   Legend:
     .  transparent      k  crown gold      K crown hi (pale gold)
     s  skin             S  skin shadow     h hair/brown
     c  crimson cloak    C  crimson dark    g gold trim
     b  boots (dark)     e  eyes            w  white (sword/hilt is gold)
   ============================================================ */

const A_MAP = {
  '.': null,
  k: PAL.agedGold,
  K: PAL.paleGold,
  s: PAL.skin,
  S: PAL.skinDark,
  h: '#5a4633',
  c: PAL.bloodCrimson,
  C: PAL.crimsonDark,
  g: PAL.agedGold,
  b: PAL.purpleDark,
  e: PAL.voidBlack,
  w: PAL.paleGold,
};

// FRONT (facing down / toward viewer) — two frames differ in leg position.
const ARTHUR_DOWN = [
  // frame 0 (legs together-ish)
  [
    '................',
    '.....kKkKk......',
    '.....kkkkk......',
    '.....sssss......',
    '....sSsssSs.....',
    '....seSsSes.....',
    '....sssssss.....',
    '.....sSSSs......',
    '....ggcccgg.....',
    '...gcCcccCcg....',
    '...ccCcccCcc....',
    '...ccccccccc....',
    '..sccccccccs....',
    '..sccccccccs....',
    '...cccccccc.....',
    '...cccccccc.....',
    '...ccc..ccc.....',
    '...cc....cc.....',
    '...bb....bb.....',
    '...bb....bb.....',
    '...bb....bb.....',
    '..bbb....bbb....',
    '................',
    '................',
  ],
  // frame 1 (legs shifted — walk)
  [
    '................',
    '.....kKkKk......',
    '.....kkkkk......',
    '.....sssss......',
    '....sSsssSs.....',
    '....seSsSes.....',
    '....sssssss.....',
    '.....sSSSs......',
    '....ggcccgg.....',
    '...gcCcccCcg....',
    '...ccCcccCcc....',
    '...ccccccccc....',
    '..sccccccccs....',
    '..sccccccccs....',
    '...cccccccc.....',
    '...cccccccc.....',
    '....cc..ccc.....',
    '...cc.....cc....',
    '..bb.......bb...',
    '..bb.......bb...',
    '..bbb.....bb....',
    '..bb.......bbb..',
    '................',
    '................',
  ],
];

// BACK (facing up) — no face, crown + cloak back.
const ARTHUR_UP = [
  [
    '................',
    '.....kKkKk......',
    '.....kkkkk......',
    '.....hhhhh......',
    '....hhhhhhh.....',
    '....hhhhhhh.....',
    '....hhhhhhh.....',
    '.....hhhhh......',
    '....ggcccgg.....',
    '...gcccccccg....',
    '...ccccccccc....',
    '...ccccccccc....',
    '..cccccccccc....',
    '..cccccccccc....',
    '...cccccccc.....',
    '...cccccccc.....',
    '...ccc..ccc.....',
    '...cc....cc.....',
    '...bb....bb.....',
    '...bb....bb.....',
    '...bb....bb.....',
    '..bbb....bbb....',
    '................',
    '................',
  ],
  [
    '................',
    '.....kKkKk......',
    '.....kkkkk......',
    '.....hhhhh......',
    '....hhhhhhh.....',
    '....hhhhhhh.....',
    '....hhhhhhh.....',
    '.....hhhhh......',
    '....ggcccgg.....',
    '...gcccccccg....',
    '...ccccccccc....',
    '...ccccccccc....',
    '..cccccccccc....',
    '..cccccccccc....',
    '...cccccccc.....',
    '...cccccccc.....',
    '....cc..ccc.....',
    '...cc.....cc....',
    '..bb.......bb...',
    '..bb.......bb...',
    '..bbb.....bb....',
    '..bb.......bbb..',
    '................',
    '................',
  ],
];

// LEFT (facing left) — profile; RIGHT is a mirror at draw time.
const ARTHUR_LEFT = [
  [
    '................',
    '....kKkKk.......',
    '....kkkkk.......',
    '....sssss.......',
    '...hsssss.......',
    '...hseSss.......',
    '...hsssss.......',
    '....sSSs........',
    '...ggcccg.......',
    '..gcCccccg......',
    '..ccCccccc......',
    '..cccccccc......',
    '..scccccccs.....',
    '..scccccccs.....',
    '...ccccccc......',
    '...ccccccc......',
    '...cccccc.......',
    '...cc.cc........',
    '...bb.bb........',
    '...bb.bb........',
    '...bb.bb........',
    '..bbb.bbb.......',
    '................',
    '................',
  ],
  [
    '................',
    '....kKkKk.......',
    '....kkkkk.......',
    '....sssss.......',
    '...hsssss.......',
    '...hseSss.......',
    '...hsssss.......',
    '....sSSs........',
    '...ggcccg.......',
    '..gcCccccg......',
    '..ccCccccc......',
    '..ccccccccg.....',
    '..scccccccc.....',
    '..scccccccc.....',
    '...ccccccc......',
    '...ccccccc......',
    '..ccccccc.......',
    '.cc....cc.......',
    '.bb.....bb......',
    '.bb.....bb......',
    '.bbb...bb.......',
    '.bb.....bbb.....',
    '................',
    '................',
  ],
];

/**
 * Build all Arthur sprite frames as offscreen canvases keyed by direction.
 * Returns { down:[c0,c1], up:[...], left:[...], right:[...] } where each is a
 * canvas 16x24. `right` is drawn mirrored from `left` so the profile matches.
 */
export function buildArthurSprites() {
  const W = 16;
  const H = 24;
  const dir = (grids) =>
    grids.map((rows) => {
      const { canvas, ctx } = makeOffscreen(W, H);
      for (let y = 0; y < rows.length; y++) paintGrid(ctx, [rows[y]], A_MAP, 0, y);
      return canvas;
    });

  const left = dir(ARTHUR_LEFT);
  // RIGHT = horizontally mirrored LEFT frames.
  const right = left.map((src) => {
    const { canvas, ctx } = makeOffscreen(W, H);
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
    return canvas;
  });

  return {
    down: dir(ARTHUR_DOWN),
    up: dir(ARTHUR_UP),
    left,
    right,
  };
}

/* ============================================================
   HOUSES — built as offscreen canvases sized in world pixels.
   Two builders: a vacant boarded cottage and Arthur's lit cottage.
   Sizes are in *world* units (the scene scales the whole world up).
   ============================================================ */

/**
 * Vacant cottage: desaturated purple/grey, boarded door + dark windows,
 * planks nailed across the door, a small "For a Knight" sign post.
 * Returns a canvas of the given world size.
 */
export function buildVacantHouse(w = 48, h = 46) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const roofH = Math.floor(h * 0.4);
  const bodyY = roofH;
  const bodyH = h - roofH;

  // ---- roof (steep gothic gable, desaturated purple) ----
  for (let y = 0; y < roofH; y++) {
    const inset = Math.floor(((roofH - y) / roofH) * (w / 2));
    ctx.fillStyle = y % 2 === 0 ? PAL.purpleDark : '#1e1529';
    ctx.fillRect(inset, y, w - inset * 2, 1);
  }
  // roof ridge highlight
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(Math.floor(w / 2) - 1, 0, 2, roofH);

  // ---- body (grey stone, cold tint) ----
  ctx.fillStyle = '#2a2634';
  ctx.fillRect(2, bodyY, w - 4, bodyH);
  // stone bevel edges
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(2, bodyY, w - 4, 1);
  ctx.fillRect(2, h - 2, w - 4, 2);
  ctx.fillStyle = '#211d2c';
  ctx.fillRect(2, bodyY, 2, bodyH);
  ctx.fillRect(w - 4, bodyY, 2, bodyH);
  // faint stone-block seams
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = bodyY + 4; y < h - 4; y += 6) ctx.fillRect(4, y, w - 8, 1);

  // ---- dark windows (unlit) ----
  const winY = bodyY + Math.floor(bodyH * 0.28);
  const drawDarkWin = (wx) => {
    ctx.fillStyle = PAL.voidBlack;
    ctx.fillRect(wx, winY, 6, 7);
    ctx.fillStyle = PAL.stoneEdgeLight;
    ctx.fillRect(wx - 1, winY - 1, 8, 1);
    ctx.fillRect(wx - 1, winY - 1, 1, 9);
    // muntins
    ctx.fillStyle = 'rgba(139,134,153,0.4)';
    ctx.fillRect(wx + 2, winY, 1, 7);
    ctx.fillRect(wx, winY + 3, 6, 1);
  };
  drawDarkWin(6);
  drawDarkWin(w - 12);

  // ---- boarded-up door ----
  const doorW = 10;
  const doorX = Math.floor(w / 2) - doorW / 2;
  const doorY = h - Math.floor(bodyH * 0.6);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(doorX, doorY, doorW, h - 2 - doorY);
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(doorX, doorY, doorW, 1);
  // planks nailed diagonally across the door
  ctx.fillStyle = PAL.wood;
  ctx.fillRect(doorX - 2, doorY + 3, doorW + 4, 2);
  ctx.fillRect(doorX - 2, doorY + 9, doorW + 4, 2);
  ctx.fillStyle = PAL.ghostGrey; // nail heads
  ctx.fillRect(doorX - 1, doorY + 3, 1, 2);
  ctx.fillRect(doorX + doorW, doorY + 3, 1, 2);
  ctx.fillRect(doorX - 1, doorY + 9, 1, 2);
  ctx.fillRect(doorX + doorW, doorY + 9, 1, 2);

  // ---- small "For a Knight" sign post beside the door ----
  const sx = w - 8;
  const sy = h - 12;
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(sx, sy, 1, 10); // post
  ctx.fillStyle = PAL.wood; // board
  ctx.fillRect(sx - 4, sy, 8, 5);
  ctx.fillStyle = PAL.ghostGrey; // scratched glyphs
  ctx.fillRect(sx - 3, sy + 2, 1, 1);
  ctx.fillRect(sx - 1, sy + 2, 1, 1);
  ctx.fillRect(sx + 1, sy + 2, 1, 1);
  ctx.fillRect(sx + 3, sy + 2, 1, 1);

  return { canvas, roofH, doorX, doorY };
}

/**
 * Arthur's cottage: larger, warm palette, gold trim, a crown banner over the
 * door. Windows are drawn separately per-frame (lit vs dim) — this builds the
 * static shell only. Returns canvas + geometry used to place lit windows.
 */
export function buildArthurHouse(w = 60, h = 58) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const roofH = Math.floor(h * 0.4);
  const bodyY = roofH;
  const bodyH = h - roofH;

  // ---- roof (deep crimson slate, gold ridge) ----
  for (let y = 0; y < roofH; y++) {
    const inset = Math.floor(((roofH - y) / roofH) * (w / 2));
    ctx.fillStyle = y % 2 === 0 ? PAL.crimsonDark : '#3a0f16';
    ctx.fillRect(inset, y, w - inset * 2, 1);
  }
  ctx.fillStyle = PAL.agedGold;
  ctx.fillRect(Math.floor(w / 2) - 1, 0, 2, roofH); // gold ridge
  ctx.fillStyle = PAL.paleGold;
  ctx.fillRect(Math.floor(w / 2) - 1, 0, 1, 3); // finial glint

  // ---- chimney (top-right of roof) — z's spawn near its top in the scene ----
  const chimX = w - 14;
  ctx.fillStyle = PAL.dungeonStone;
  ctx.fillRect(chimX, 2, 5, roofH - 2);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(chimX, 2, 5, 1);
  ctx.fillStyle = PAL.voidBlack;
  ctx.fillRect(chimX + 1, 2, 3, 1);

  // ---- body (warm stone with gold trim) ----
  ctx.fillStyle = '#332a3a';
  ctx.fillRect(2, bodyY, w - 4, bodyH);
  ctx.fillStyle = PAL.goldDark; // gold trim frame
  ctx.fillRect(2, bodyY, w - 4, 1);
  ctx.fillRect(2, h - 2, w - 4, 2);
  ctx.fillStyle = PAL.goldDim;
  ctx.fillRect(2, bodyY, 2, bodyH);
  ctx.fillRect(w - 4, bodyY, 2, bodyH);
  // stone seams
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = bodyY + 5; y < h - 4; y += 7) ctx.fillRect(4, y, w - 8, 1);

  // ---- door (dark oak with gold studs) ----
  const doorW = 12;
  const doorX = Math.floor(w / 2) - doorW / 2;
  const doorY = h - Math.floor(bodyH * 0.62);
  ctx.fillStyle = PAL.wood;
  ctx.fillRect(doorX, doorY, doorW, h - 2 - doorY);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(doorX, doorY, doorW, 1);
  ctx.fillRect(doorX + doorW / 2, doorY, 1, h - 2 - doorY); // plank split
  ctx.fillStyle = PAL.agedGold; // studs
  ctx.fillRect(doorX + 2, doorY + 3, 1, 1);
  ctx.fillRect(doorX + doorW - 3, doorY + 3, 1, 1);
  ctx.fillRect(doorX + 2, doorY + 8, 1, 1);
  ctx.fillRect(doorX + doorW - 3, doorY + 8, 1, 1);

  // ---- crown banner over the door (crimson pennant + gold crown) ----
  const banW = 16;
  const banX = Math.floor(w / 2) - banW / 2;
  const banY = bodyY + 2;
  ctx.fillStyle = PAL.bloodCrimson;
  ctx.fillRect(banX, banY, banW, 9);
  // pennant notch (bottom V)
  ctx.fillStyle = '#332a3a';
  ctx.fillRect(banX + banW / 2 - 1, banY + 7, 2, 2);
  ctx.fillStyle = PAL.goldDim; // banner border
  ctx.fillRect(banX, banY, banW, 1);
  ctx.fillRect(banX, banY, 1, 9);
  ctx.fillRect(banX + banW - 1, banY, 1, 9);
  // tiny gold crown on the banner
  ctx.fillStyle = PAL.agedGold;
  ctx.fillRect(banX + 4, banY + 4, 8, 3);
  ctx.fillRect(banX + 4, banY + 2, 2, 2);
  ctx.fillRect(banX + 7, banY + 1, 2, 3);
  ctx.fillRect(banX + 10, banY + 2, 2, 2);
  ctx.fillStyle = PAL.paleGold;
  ctx.fillRect(banX + 7, banY + 1, 1, 1);

  // window geometry (drawn per-frame in the scene so glow can flicker)
  const winY = bodyY + Math.floor(bodyH * 0.3);
  const windows = [
    { x: 6, y: winY, w: 8, h: 8 },
    { x: w - 14, y: winY, w: 8, h: 8 },
  ];

  return { canvas, roofH, doorX, doorY, windows, chimney: { x: chimX + 2, y: 2 } };
}

/* ============================================================
   PROPS — dead trees, well, lampposts. Each returns an offscreen canvas.
   ============================================================ */

export function buildDeadTree(w = 26, h = 40) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const cx = Math.floor(w / 2);
  // trunk
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(cx - 2, 14, 4, h - 14);
  ctx.fillStyle = PAL.wood;
  ctx.fillRect(cx - 2, 14, 1, h - 14);
  // gnarled branches (a few asymmetric limbs)
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(cx - 6, 10, 4, 2);
  ctx.fillRect(cx - 8, 6, 2, 5);
  ctx.fillRect(cx + 2, 12, 5, 2);
  ctx.fillRect(cx + 6, 7, 2, 6);
  ctx.fillRect(cx - 1, 4, 2, 12);
  ctx.fillRect(cx - 3, 2, 2, 4);
  ctx.fillRect(cx + 2, 2, 2, 5);
  // a couple of clinging dead leaves (crimson)
  ctx.fillStyle = PAL.crimsonDark;
  ctx.fillRect(cx - 8, 5, 1, 1);
  ctx.fillRect(cx + 7, 8, 1, 1);
  ctx.fillRect(cx - 3, 2, 1, 1);
  // root shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx - 5, h - 2, 10, 2);
  return canvas;
}

export function buildWell(w = 30, h = 30) {
  const { canvas, ctx } = makeOffscreen(w, h);
  // stone base ring
  ctx.fillStyle = PAL.dungeonStone;
  ctx.fillRect(4, 14, w - 8, h - 16);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(4, 14, w - 8, 2);
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(4, h - 3, w - 8, 2);
  // block seams
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(Math.floor(w / 2), 16, 1, h - 18);
  ctx.fillRect(8, 20, w - 16, 1);
  // dark water hole
  ctx.fillStyle = PAL.voidBlack;
  ctx.fillRect(8, 16, w - 16, 6);
  ctx.fillStyle = PAL.royalPurple;
  ctx.fillRect(9, 17, 2, 1); // faint reflection glint
  // posts + peaked roof
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(5, 4, 2, 12);
  ctx.fillRect(w - 7, 4, 2, 12);
  ctx.fillStyle = PAL.wood;
  for (let y = 0; y < 5; y++) {
    ctx.fillRect(2 + y, y, w - 4 - y * 2, 1);
  }
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(0, 5, w, 1);
  return canvas;
}

/**
 * Lamppost — the flame is drawn separately/animated in the scene, so this is
 * the cold post + housing only. `flameAnchor` tells the scene where to draw it.
 */
export function buildLamppost(w = 12, h = 40) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const cx = Math.floor(w / 2);
  // post
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(cx - 1, 8, 3, h - 10);
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(cx - 1, 8, 1, h - 10);
  // base
  ctx.fillStyle = PAL.dungeonStone;
  ctx.fillRect(cx - 3, h - 3, 7, 3);
  // lantern housing
  ctx.fillStyle = PAL.goldDark;
  ctx.fillRect(cx - 3, 2, 7, 7);
  ctx.fillStyle = PAL.agedGold;
  ctx.fillRect(cx - 3, 2, 7, 1);
  ctx.fillRect(cx - 3, 8, 7, 1);
  // glass (filled by flame in scene) — leave a dark cavity
  ctx.fillStyle = PAL.voidBlack;
  ctx.fillRect(cx - 2, 3, 5, 5);
  // top cap
  ctx.fillStyle = PAL.goldDim;
  ctx.fillRect(cx - 2, 0, 5, 2);
  return { canvas, flameAnchor: { x: cx, y: 5 } };
}

/* ============================================================
   CHIBI MERLIN — 16x24 logical px, 4 directions x 2 walk frames.
   A wizard, not a knight: tall pointed hat with a gold star, long white
   beard, deep-purple robe with gold trim + a star sigil. He wears a robe to
   the ground (no boots) — the walk frames sway the hem instead of stepping
   legs, which reads as gliding. Same authoring convention as Arthur so the two
   villagers share the exact same sprite/state pipeline.
   Legend:
     .  transparent      p robe/hat purple   P robe/hat shadow   L robe highlight
     g  gold trim/star   G gold highlight    s skin   S skin shadow   e eyes
     b  beard/hair white B beard shadow
   ============================================================ */

const M_MAP = {
  '.': null,
  p: PAL.royalPurple,
  P: PAL.purpleDark,
  L: PAL.purpleLight,
  g: PAL.agedGold,
  G: PAL.paleGold,
  s: PAL.skin,
  S: PAL.skinDark,
  e: PAL.voidBlack,
  b: PAL.parchment,
  B: PAL.ghostGrey,
};

// FRONT (facing down / toward viewer). Two frames sway the robe hem.
const MERLIN_DOWN = [
  [
    '........p.......',
    '.......ppp......',
    '.......ppp......',
    '......ppppp.....',
    '......pgggp.....',
    '.....ppppppp....',
    '....LPPPPPPPL...',
    '.......sss......',
    '......sssss.....',
    '......seses.....',
    '......sssss.....',
    '.....bbbbbbb....',
    '.....bBbBbBb....',
    '.....bbbbbbb....',
    '......bbbbb.....',
    '.......bbb......',
    '....pppppppp....',
    '....pgppppgp....',
    '....pppGGppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pp....pp....',
    '....PP....PP....',
  ],
  [
    '........p.......',
    '.......ppp......',
    '.......ppp......',
    '......ppppp.....',
    '......pgggp.....',
    '.....ppppppp....',
    '....LPPPPPPPL...',
    '.......sss......',
    '......sssss.....',
    '......seses.....',
    '......sssss.....',
    '.....bbbbbbb....',
    '.....bBbBbBb....',
    '.....bbbbbbb....',
    '......bbbbb.....',
    '.......bbb......',
    '....pppppppp....',
    '....pgppppgp....',
    '....pppGGppp....',
    '....pppppppp....',
    '....pppppppp....',
    '.....pppppp.....',
    '...pp......pp...',
    '...PP......PP...',
  ],
];

// BACK (facing up) — hat + white hair, robe back with a lower star.
const MERLIN_UP = [
  [
    '........p.......',
    '.......ppp......',
    '.......ppp......',
    '......ppppp.....',
    '......pgggp.....',
    '.....ppppppp....',
    '....LPPPPPPPL...',
    '......bbbbb.....',
    '......bbbbb.....',
    '....pppppppp....',
    '....pppppppp....',
    '....pgppppgp....',
    '....pppppppp....',
    '....pppGGppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pp....pp....',
    '....PP....PP....',
  ],
  [
    '........p.......',
    '.......ppp......',
    '.......ppp......',
    '......ppppp.....',
    '......pgggp.....',
    '.....ppppppp....',
    '....LPPPPPPPL...',
    '......bbbbb.....',
    '......bbbbb.....',
    '....pppppppp....',
    '....pppppppp....',
    '....pgppppgp....',
    '....pppppppp....',
    '....pppGGppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '....pppppppp....',
    '.....pppppp.....',
    '...pp......pp...',
    '...PP......PP...',
  ],
];

// LEFT (facing left) — profile; beard points forward, RIGHT is mirrored.
const MERLIN_LEFT = [
  [
    '.....p..........',
    '....ppp.........',
    '....ppp.........',
    '...ppppp........',
    '...pgggp........',
    '..ppppppp.......',
    '..PPPPPPP.......',
    '....sssss.......',
    '...bsssss.......',
    '...bseSss.......',
    '...bsssss.......',
    '...bbbbbb.......',
    '...bbbbb........',
    '...bbbb.........',
    '....ppppp.......',
    '...pppppp.......',
    '...ppgppp.......',
    '...pppppp.......',
    '...ppGppp.......',
    '...pppppp.......',
    '...pppppp.......',
    '...pppppp.......',
    '...pp.pp........',
    '...PP.PP........',
  ],
  [
    '.....p..........',
    '....ppp.........',
    '....ppp.........',
    '...ppppp........',
    '...pgggp........',
    '..ppppppp.......',
    '..PPPPPPP.......',
    '....sssss.......',
    '...bsssss.......',
    '...bseSss.......',
    '...bsssss.......',
    '...bbbbbb.......',
    '...bbbbb........',
    '...bbbb.........',
    '....ppppp.......',
    '...pppppp.......',
    '...ppgppp.......',
    '...pppppp.......',
    '...ppGppp.......',
    '...pppppp.......',
    '...pppppp.......',
    '...pppppp.......',
    '..pp...pp.......',
    '..PP...PP.......',
  ],
];

/**
 * Build all Merlin sprite frames as offscreen canvases keyed by direction.
 * Mirrors buildArthurSprites(): 16x24 frames, `right` mirrored from `left`.
 */
export function buildMerlinSprites() {
  const W = 16;
  const H = 24;
  const dir = (grids) =>
    grids.map((rows) => {
      const { canvas, ctx } = makeOffscreen(W, H);
      for (let y = 0; y < rows.length; y++) paintGrid(ctx, [rows[y]], M_MAP, 0, y);
      return canvas;
    });

  const left = dir(MERLIN_LEFT);
  const right = left.map((src) => {
    const { canvas, ctx } = makeOffscreen(W, H);
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
    return canvas;
  });

  return {
    down: dir(MERLIN_DOWN),
    up: dir(MERLIN_UP),
    left,
    right,
  };
}

/**
 * Merlin's WIZARD TOWER — replaces the plain cottage on his seat. Tall stone
 * shaft, conical purple roof with a gold ring + finial, two arched arcane
 * windows (lit per-frame in the scene like Arthur's), and a runed oak door.
 *
 * Returns canvas + geometry the scene needs:
 *   doorX/doorW/doorY  — doorway placement (villager exits/returns here)
 *   windows            — [{x,y,w,h}] cavities the scene fills with glow
 *   zAnchor            — where the sleep z's rise from (the spire tip)
 * The interface intentionally matches buildArthurHouse() so both houses drive
 * the same villager plumbing.
 */
export function buildWizardTower(w = 42, h = 74) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const cx = Math.floor(w / 2);
  const roofH = 28; // conical roof height
  const bodyY = roofH;
  const bodyH = h - roofH;

  // ---- conical roof (purple shingle bands, widening downward) ----
  for (let y = 0; y < roofH; y++) {
    const half = Math.round((y / roofH) * (w / 2 - 3)) + 1;
    ctx.fillStyle = y % 2 === 0 ? PAL.purpleDark : PAL.royalPurple;
    ctx.fillRect(cx - half, y, half * 2 + 1, 1);
  }
  // gold ring around the cone base
  ctx.fillStyle = PAL.agedGold;
  ctx.fillRect(4, roofH - 3, w - 8, 2);
  ctx.fillStyle = PAL.goldDim;
  ctx.fillRect(4, roofH - 1, w - 8, 1);
  // finial (gold orb at the very tip; z's + sparkle anchor here)
  ctx.fillStyle = PAL.agedGold;
  ctx.fillRect(cx - 1, 2, 3, 3);
  ctx.fillStyle = PAL.paleGold;
  ctx.fillRect(cx, 0, 1, 3);

  // ---- tower shaft (stone with a faint arcane sheen) ----
  ctx.fillStyle = PAL.dungeonStone;
  ctx.fillRect(2, bodyY, w - 4, bodyH);
  ctx.fillStyle = PAL.raisedStone; // light left bevel
  ctx.fillRect(2, bodyY, 2, bodyH);
  ctx.fillStyle = PAL.stoneEdgeDark; // dark right bevel
  ctx.fillRect(w - 4, bodyY, 2, bodyH);
  // corbel band under the roof
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(1, bodyY, w - 2, 3);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(1, bodyY, w - 2, 1);
  // base plinth
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(1, h - 3, w - 2, 3);
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(1, h - 4, w - 2, 1);
  // stone-block seams
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let y = bodyY + 6; y < h - 5; y += 7) ctx.fillRect(4, y, w - 8, 1);
  // faint purple arcane sheen down the left face
  ctx.fillStyle = 'rgba(87,64,126,0.16)';
  ctx.fillRect(4, bodyY + 4, 6, bodyH - 10);

  // ---- arched windows (dark cavities; scene fills the glow) ----
  const winW = 8;
  const winH = 9;
  const mkWin = (wy) => {
    const wx = cx - Math.floor(winW / 2);
    ctx.fillStyle = PAL.voidBlack;
    ctx.fillRect(wx, wy + 2, winW, winH - 2);
    ctx.fillRect(wx + 1, wy + 1, winW - 2, 1);
    ctx.fillRect(wx + 2, wy, winW - 4, 1); // rounded arch crown
    ctx.fillStyle = PAL.stoneEdgeLight;
    ctx.fillRect(wx - 1, wy, 1, winH + 1);
    ctx.fillStyle = PAL.stoneEdgeDark;
    ctx.fillRect(wx + winW, wy, 1, winH + 1);
    return { x: wx, y: wy, w: winW, h: winH };
  };
  const windows = [mkWin(bodyY + 8), mkWin(bodyY + Math.floor(bodyH * 0.52))];

  // ---- runed oak door at the base ----
  const doorW = 12;
  const doorX = cx - doorW / 2;
  const doorY = h - 16;
  ctx.fillStyle = PAL.wood;
  ctx.fillRect(doorX, doorY + 2, doorW, h - 3 - (doorY + 2));
  ctx.fillRect(doorX + 1, doorY, doorW - 2, 2); // arch top
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(doorX + doorW / 2, doorY, 1, h - 3 - doorY); // plank split
  // gold sigil on the door
  ctx.fillStyle = PAL.agedGold;
  ctx.fillRect(doorX + 4, doorY + 5, 4, 1);
  ctx.fillRect(doorX + 4, doorY + 5, 1, 4);
  ctx.fillRect(doorX + 7, doorY + 5, 1, 4);
  ctx.fillRect(doorX + 5, doorY + 8, 3, 1);

  return {
    canvas,
    roofH,
    doorX: Math.round(doorX),
    doorW,
    doorY,
    windows,
    zAnchor: { x: cx, y: 0 },
  };
}

/* ============================================================
   THE MIGHTY CRAB — 20x25 logical px (bumped up from 16x24 for the extra
   claw/leg detail below), 4 directions x 2 walk frames.
   Seat 05's gruff QA/bug-catcher, redrawn to read as a crab first and a
   jester second: a wide flat crimson shell (not a rounded body) with a pair
   of big gold pincer-claws bursting out from the shoulders — outlined with
   a dark notch so the open pincer reads clearly — and jointed legs along
   the underside. The clown identity is now a light touch (a small red
   button nose + two cheek-blush dots on the shell, not a face-paint patch
   covering it) plus the three-pointed gold/purple jester hat with a pair of
   eyestalks poking up alongside it. Authored as a mirrored left half (see
   `mirrorCrabRow`) for DOWN/UP; LEFT is hand-drawn full-width (profile,
   front claw reaching forward) and RIGHT mirrors it at draw time, same
   convention as Arthur/Merlin.
   Legend:
     .  transparent        g  hat/claw gold (agedGold)    G  hat/claw hi (paleGold)
     p  hat tip purple     P  hat tip purple dark          (royalPurple / purpleDark)
     E  eyestalk stem      o  eyestalk eye-white           e  eye pupil (voidBlack)
     H  shell hi-light     C  shell main (bright crimson)  D  shell shadow
     K  claw main (bright) k  claw dark edge/outline
     N  clown nose (bright red)    r  cheek blush          d  back-shell ridge seam
     l  legs (crimsonDark)
   ============================================================ */

const CRAB_MAP = {
  '.': null,
  g: PAL.agedGold, // hat tips + claws — gilded pincers read as jester gauntlets
  G: PAL.paleGold, // hat/claw highlight
  p: PAL.royalPurple,
  P: PAL.purpleDark,
  E: '#5a4633', // eyestalk stem (profile view only — front view shows just the eye)
  o: PAL.paleGold, // eyestalk eye-white
  e: PAL.voidBlack, // eye pupil / claw pincer notch
  H: '#c2495a', // shell highlight — brighter than crimsonBright
  C: PAL.crimsonBright,
  D: '#5c1620', // shell shadow — darker than crimsonDark
  r: '#d94a5a', // cheek blush
  N: '#e0303f', // clown nose
  d: PAL.bloodCrimson, // back-shell ridge seam (UP view)
  l: PAL.crimsonDark,
};

/** Mirror a left-half row (10 cols) into a full 20-col symmetric row — same
 * technique as the portrait chibis (`mirrorH` in gen-portraits.mjs). Used to
 * author DOWN/UP, which are front/back-symmetric; LEFT is a profile and is
 * hand-drawn full-width instead (see below). */
function mirrorCrabRow(r) {
  return r + [...r].reverse().join('');
}

// FRONT (facing down / toward viewer), authored as its left half (10 cols)
// and mirrored. Rows 0-5: the three-tip gold/purple jester hat with an
// eyestalk peeking out beside each gold tip. Rows 6-10: the shell's top
// highlight, then the gold pincer claws burst out past the shell's own edge
// (cols 0-2) with a dark notch marking the open pincer — that's what makes
// them read as claws rather than shell-colored shoulder bumps. Rows 11-18:
// the wide shell body (a small red nose + cheek blush, not a face patch).
// Rows 19-22: jointed legs. Frame B only reshapes the legs for the stride.
const CRAB_DOWN_LEFT_A = [
  '.........p', '...o.....p', '...e.g...P', '...g.gGg.P', '...g.ggggP',
  '..ggggggPP', '...HHHHHHH', '.gHHCCCCCC', 'gGgCCCCCCC', 'GegCCCCCCC',
  '.gGCCCCCCC', '..CCCCCCCC', '..CCCCCCCN', '..CCrCCCCC', '..CCCCCCCC',
  '.DCCCCCCCC', '..DDDDDDDD', '...DDDDDDD', '....DDDDDD', '...l..l...',
  '...l..l...', '..l..l....', '.l..l.....', '..........', '..........',
];
const CRAB_DOWN_LEFT_B = CRAB_DOWN_LEFT_A.slice(0, 19).concat([
  '...l..l...', '....ll....', '....ll....', '...l..l...',
  CRAB_DOWN_LEFT_A[23], CRAB_DOWN_LEFT_A[24],
]);
const CRAB_DOWN = [CRAB_DOWN_LEFT_A, CRAB_DOWN_LEFT_B].map((rows) => rows.map(mirrorCrabRow));

// BACK (facing up) — same hat/eyestalks/claws as DOWN (crabs hold their
// claws up even walking away), but the shell shows a plain back-ridge seam
// instead of the nose/blush, and the eyes are blank white (no pupil — the
// face points away from the viewer).
const CRAB_UP_LEFT_A = CRAB_DOWN_LEFT_A.slice();
CRAB_UP_LEFT_A[2] = '...o.g...P';
CRAB_UP_LEFT_A[12] = '..CCCCCCCd';
CRAB_UP_LEFT_A[13] = '..CCCCCCCd';
const CRAB_UP_LEFT_B = CRAB_UP_LEFT_A.slice(0, 19).concat([
  '...l..l...', '....ll....', '....ll....', '...l..l...',
  CRAB_UP_LEFT_A[23], CRAB_UP_LEFT_A[24],
]);
const CRAB_UP = [CRAB_UP_LEFT_A, CRAB_UP_LEFT_B].map((rows) => rows.map(mirrorCrabRow));

// LEFT (facing left) — profile, hand-drawn full-width (not mirrored); RIGHT
// is a mirror of this at draw time. The eyestalk leans forward at the front
// (low x), the three hat tips trail back along the top, and ONE big gold
// pincer claw reaches forward past the shell's front edge — the same
// "sticks out past its own shell" trick as DOWN/UP, just on one side — while
// a small claw-tip nub peeks near the back. Legs trail along the underside.
const CRAB_LEFT_A = [
  '....gG..............',
  '....gg..gG..........',
  '..E.ggg.ggP.........',
  '..o.ggggggPP........',
  '..e..gggggPPP.......',
  '......gggggPP.......',
  '...HHHHHHHHHH.......',
  '.gHCCCCCCCCCCD......',
  'gGgCCCCCCCCCCDD.....',
  'GegCCCCCCCCCCCD.....',
  '.gGCCCCCCCCCCCD.....',
  '..CCCCCCCCCCCCD.....',
  '..CCNCCCCCCCCCD.....',
  '..CCCCCCCCCCCCD.....',
  '...CCCCCCCCCCCgG....',
  '....CCCCCCCCCCCg....',
  '.....DDDDDDDDDD.....',
  '......DDDDDDDD......',
  '.......DDDDDD.......',
  '....l..l..l.........',
  '....l..l..l.........',
  '...l..l..l..........',
  '..l..l..l...........',
  '....................',
  '....................',
];
const CRAB_LEFT_B = CRAB_LEFT_A.slice();
CRAB_LEFT_B[19] = CRAB_LEFT_A[21];
CRAB_LEFT_B[20] = CRAB_LEFT_A[22];
CRAB_LEFT_B[21] = CRAB_LEFT_A[19];
CRAB_LEFT_B[22] = CRAB_LEFT_A[20];
const CRAB_LEFT = [CRAB_LEFT_A, CRAB_LEFT_B];

/**
 * Build all Crab sprite frames as offscreen canvases keyed by direction.
 * Mirrors buildArthurSprites()/buildMerlinSprites(): 20x25 frames (bumped up
 * from 16x24 — the bigger claws need the extra room), `right` mirrored from
 * `left` at draw time. The village draw loop reads `spr.width`/`spr.height`
 * off the canvas itself (see index.jsx), so this doesn't need updating
 * anywhere else — the villager centers/anchors to whatever size it gets.
 */
export function buildCrabSprites() {
  const W = 20;
  const H = 25;
  const dir = (grids) =>
    grids.map((rows) => {
      const { canvas, ctx } = makeOffscreen(W, H);
      for (let y = 0; y < rows.length; y++) paintGrid(ctx, [rows[y]], CRAB_MAP, 0, y);
      return canvas;
    });

  const left = dir(CRAB_LEFT);
  const right = left.map((src) => {
    const { canvas, ctx } = makeOffscreen(W, H);
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
    return canvas;
  });

  return {
    down: dir(CRAB_DOWN),
    up: dir(CRAB_UP),
    left,
    right,
  };
}

/* ============================================================
   THE CRAB'S CAVE — replaces the plain cottage on seat-05's ring position.
   A low, wide, rough-hewn stone mound: no roof, no gable — just a jagged
   rock silhouette with a rocky outcrop spire at the top (the zzz/z-anchor
   perches there, like a little sentinel rock, so sleep particles read as
   rising from the cave rather than the void behind it) and a dark cave-mouth
   opening low in the middle where a door would be. Unlike the cottages there
   are no windows to light up — instead a bed of crimson embers glows faintly
   at all times and flares brighter (like coals stirred by a claw) while the
   crab is active. `windows` is intentionally empty; the scene calls
   drawCaveGlow() at the mouth instead of paintLitWindows().
   Returns geometry matching buildArthurHouse()/buildWizardTower() so the
   generic villager plumbing (doorPoint/zAnchor) needs no special-casing:
     doorX/doorW/doorY — cave-mouth placement (villager exits/returns here)
     windows           — [] (no glowing windows on a cave)
     zAnchor           — the rock spire tip (sleep z's rise from here)
     mouth             — {x,y,w,h} world-relative cave-mouth rect, used by
                          drawCaveGlow() to paint the ember glow each frame
   ============================================================ */
export function buildCrabCave(w = 54, h = 44) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const cx = Math.floor(w / 2);

  // ---- jagged rock silhouette (irregular mound, no roof) ----
  // Build the mound as a set of stacked bands whose half-width follows a
  // jagged (not smooth) profile, so the top reads as broken rock rather than
  // a clean gable.
  const topY = 6;
  const profile = [2, 5, 4, 8, 7, 12, 10, 15, 13, 18, 16, 20, 18, 22, 20, 24, 22, 26];
  for (let i = 0; i < h - topY; i++) {
    const y = topY + i;
    const half = Math.min(cx - 2, profile[Math.min(i, profile.length - 1)]);
    ctx.fillStyle = i % 3 === 0 ? PAL.dungeonStone : PAL.raisedStone;
    ctx.fillRect(cx - half, y, half * 2, 1);
  }
  // dark cracks / shading down the rock face
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let y = topY + 4; y < h - 4; y += 5) {
    ctx.fillRect(cx - 10 + ((y * 7) % 9), y, 6, 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = topY + 6; y < h - 6; y += 7) {
    ctx.fillRect(cx + 4 + ((y * 5) % 7), y, 5, 1);
  }

  // ---- jagged rock outcropping / spire near the top (visual interest +
  // the zAnchor perch for zzz particles) ----
  const spireX = cx + 6;
  const spireTopY = 0;
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(spireX, spireTopY + 2, 2, 6);
  ctx.fillRect(spireX - 2, spireTopY + 5, 6, 3);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(spireX, spireTopY + 2, 1, 5);
  // a second, smaller jagged tooth to the left for silhouette variety
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(cx - 9, topY - 2, 2, 5);
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(cx - 9, topY - 2, 1, 4);

  // ---- rim highlight / bevel along the rock edges ----
  ctx.fillStyle = PAL.stoneEdgeLight;
  for (let i = 0; i < h - topY; i += 4) {
    const y = topY + i;
    const half = Math.min(cx - 2, profile[Math.min(i, profile.length - 1)]);
    ctx.fillRect(cx - half, y, 1, 1);
  }
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(0, h - 2, w, 2); // ground-contact shadow line

  // ---- cave-mouth opening (dark ovoid cavity, roughly door-sized/placed) ----
  const doorW = 16;
  const doorH = 16;
  const doorX = cx - doorW / 2;
  const doorY = h - doorH - 2;
  // carve the void
  ctx.fillStyle = PAL.voidBlack;
  ctx.fillRect(doorX + 2, doorY, doorW - 4, doorH - 2);
  ctx.fillRect(doorX, doorY + 4, doorW, doorH - 6);
  ctx.fillRect(doorX + 3, doorY - 2, doorW - 6, 3);
  // rough dark rim around the mouth (jagged, not a clean door frame)
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(doorX + 1, doorY - 3, doorW - 2, 2);
  ctx.fillRect(doorX - 1, doorY + 3, 2, doorH - 5);
  ctx.fillRect(doorX + doorW - 1, doorY + 3, 2, doorH - 5);
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(doorX - 2, doorY + 5, 1, doorH - 8);
  ctx.fillRect(doorX + doorW + 1, doorY + 5, 1, doorH - 8);

  // static dim embers baked in at the mouth floor (the LIVE flicker is drawn
  // per-frame on top by drawCaveGlow(), same pattern as Arthur's windows).
  ctx.fillStyle = PAL.crimsonDark;
  ctx.fillRect(cx - 3, doorY + doorH - 4, 6, 2);

  const mouth = { x: doorX, y: doorY, w: doorW, h: doorH };

  return {
    canvas,
    roofH: topY,
    doorX: Math.round(doorX),
    doorW,
    doorY,
    windows: [],
    zAnchor: { x: spireX + 1, y: spireTopY },
    mouth,
  };
}

/**
 * Ember glow at the crab cave's mouth — dim crimson coals normally, flaring
 * brighter and flickering (like coals stirred by a claw) while the crab is
 * active. Mirrors drawArcaneSparkle()'s role for the wizard tower's finial,
 * but placed at the cave mouth instead of a window since a cave has none.
 * `mouth` is the {x,y,w,h} rect returned by buildCrabCave(), and hs.x/hs.y is
 * the house's world origin (same convention as paintLitWindows()).
 */
export function drawCaveGlow(ctx, hx, hy, mouth, now, active) {
  const flick = active
    ? 0.55 + Math.sin(now / 150) * 0.2 + Math.sin(now / 61) * 0.1
    : 0.16 + Math.sin(now / 700) * 0.05;
  const cx = hx + mouth.x + mouth.w / 2;
  const cy = hy + mouth.y + mouth.h - 4;
  // ember bed
  ctx.fillStyle = `rgba(168,53,69,${flick})`;
  ctx.fillRect(cx - 3, cy, 6, 2);
  ctx.fillStyle = `rgba(217,123,41,${flick * 0.8})`;
  ctx.fillRect(cx - 1, cy - 1, 2, 1);
  // soft bloom rising into the cave mouth
  ctx.fillStyle = `rgba(122,30,43,${flick * 0.35})`;
  ctx.fillRect(hx + mouth.x, hy + mouth.y, mouth.w, mouth.h - 2);
}

/* ============================================================
   THE SCRIPTORIUM LIBRARY — a tall gothic hall of study. Steeper roof than
   Arthur's cottage (a spire, not a cottage gable), twin tall arched windows
   that glow parchment-gold when a knight is reading inside, a stone lintel
   over the door carved with a book/scroll motif, and a small stone cross
   finial at the ridge (the zAnchor perches there, echoing the wizard tower's
   finial-anchor pattern). Reads "place of study" at a glance: narrow, tall,
   window-heavy, quiet gold light instead of a hearth's orange.
   Returns canvas + geometry matching buildArthurHouse()/buildWizardTower():
     doorX/doorW/doorY — doorway placement (villager exits/returns here)
     windows           — [{x,y,w,h}] cavities the scene fills with glow
     zAnchor           — where the sleep z's / floating icons rise from
   ============================================================ */
export function buildLibrary(w = 56, h = 72) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const cx = Math.floor(w / 2);
  const roofH = 26; // steeper than Arthur's cottage (0.40h) — a scriptorium spire
  const bodyY = roofH;
  const bodyH = h - roofH;

  // ---- roof (steep slate gable, cool grey-purple — not crimson, not gold) ----
  for (let y = 0; y < roofH; y++) {
    const inset = Math.floor(((roofH - y) / roofH) * (w / 2));
    ctx.fillStyle = y % 2 === 0 ? PAL.purpleDark : '#1e1a29';
    ctx.fillRect(inset, y, w - inset * 2, 1);
  }
  // ridge highlight
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(cx - 1, 2, 2, roofH - 2);

  // small stone cross finial at the ridge tip (zAnchor perches here)
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(cx, 0, 1, 4); // vertical bar
  ctx.fillRect(cx - 1, 1, 3, 1); // crossbar
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(cx, 0, 1, 1);

  // ---- body (cold grey stone, gold-dim trim — scholarly, not warm) ----
  ctx.fillStyle = '#2a2634';
  ctx.fillRect(2, bodyY, w - 4, bodyH);
  ctx.fillStyle = PAL.goldDark; // trim frame
  ctx.fillRect(2, bodyY, w - 4, 1);
  ctx.fillRect(2, h - 2, w - 4, 2);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(2, bodyY, 2, bodyH);
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(w - 4, bodyY, 2, bodyH);
  // stone seams
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  for (let y = bodyY + 5; y < h - 4; y += 6) ctx.fillRect(4, y, w - 8, 1);

  // ---- door (dark oak, arched top, book/scroll lintel carving) ----
  const doorW = 12;
  const doorX = cx - doorW / 2;
  const doorY = h - Math.floor(bodyH * 0.5);
  ctx.fillStyle = PAL.wood;
  ctx.fillRect(doorX, doorY + 2, doorW, h - 2 - (doorY + 2));
  ctx.fillRect(doorX + 1, doorY, doorW - 2, 2); // arched top lip
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(doorX + doorW / 2, doorY, 1, h - 2 - doorY); // plank split
  // carved stone lintel above the door, with a small open-book motif
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(doorX - 2, doorY - 4, doorW + 4, 3);
  ctx.fillStyle = PAL.agedGold; // the book: two pages + a spine
  ctx.fillRect(doorX + 1, doorY - 3, 4, 2);
  ctx.fillRect(doorX + doorW - 5, doorY - 3, 4, 2);
  ctx.fillStyle = PAL.goldDim;
  ctx.fillRect(doorX + doorW / 2 - 1, doorY - 3, 1, 2); // spine crease

  // ---- twin tall arched windows (parchment-gold glow when occupied) ----
  const winW = 7;
  const winH = 13;
  const winY = bodyY + 5;
  const mkWin = (wx) => {
    ctx.fillStyle = PAL.voidBlack;
    ctx.fillRect(wx, winY + 2, winW, winH - 2);
    ctx.fillRect(wx + 1, winY + 1, winW - 2, 1);
    ctx.fillRect(wx + 2, winY, winW - 4, 1); // rounded arch crown
    ctx.fillStyle = PAL.stoneEdgeLight;
    ctx.fillRect(wx - 1, winY, 1, winH + 1);
    ctx.fillStyle = PAL.stoneEdgeDark;
    ctx.fillRect(wx + winW, winY, 1, winH + 1);
    return { x: wx, y: winY, w: winW, h: winH };
  };
  const windows = [mkWin(6), mkWin(w - 6 - winW)];

  return {
    canvas,
    roofH,
    doorX: Math.round(doorX),
    doorW,
    doorY,
    windows,
    zAnchor: { x: cx, y: 0 },
  };
}

/* ============================================================
   THE FORGE — a squat, sturdy smithy. Low roof (deliberately flatter than
   the cottages: this is a working shed, not a spire), a big stone chimney on
   one shoulder that owns an ember/spark anchor as its zAnchor (embers puff
   from the chimney mouth the way sleep z's rise elsewhere), and a wide dark
   hearth-mouth opening in place of a normal door — an anvil sits just
   outside it. Reads "place of making": low, wide, heavy, warm window glow
   from the coals inside.
   Returns canvas + geometry matching buildArthurHouse()/buildWizardTower():
     doorX/doorW/doorY — hearth-mouth placement (villager exits/returns here)
     windows           — [{x,y,w,h}] cavities the scene fills with glow
     zAnchor           — chimney mouth (embers/sparks rise from here)
   ============================================================ */
export function buildForge(w = 64, h = 50) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const roofH = 13; // squat — flatter than any cottage roof in the village
  const bodyY = roofH;
  const bodyH = h - roofH;

  // ---- roof (low dark slate hip, barely peaked — a workshed, not a spire) ----
  for (let y = 0; y < roofH; y++) {
    const inset = Math.floor(((roofH - y) / roofH) * (w / 2 - 4));
    ctx.fillStyle = y % 2 === 0 ? PAL.dungeonStone : '#161320';
    ctx.fillRect(inset, y, w - inset * 2, 1);
  }
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(Math.floor(w / 2) - 1, roofH - 2, 2, 2); // short ridge cap

  // ---- chimney (stout, right shoulder — embers puff from its mouth) ----
  const chimW = 9;
  const chimX = w - chimW - 5;
  ctx.fillStyle = PAL.dungeonStone;
  ctx.fillRect(chimX, 1, chimW, roofH + 6);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(chimX, 1, chimW, 1);
  ctx.fillRect(chimX, 1, 1, roofH + 6);
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(chimX + chimW - 1, 1, 1, roofH + 6);
  ctx.fillStyle = PAL.voidBlack; // sooty mouth
  ctx.fillRect(chimX + 2, 1, chimW - 4, 2);

  // ---- body (heavy dark stone, squat + wide, iron-dark trim) ----
  ctx.fillStyle = '#28232f';
  ctx.fillRect(2, bodyY, w - 4, bodyH);
  ctx.fillStyle = PAL.stoneEdgeDark; // heavy base trim
  ctx.fillRect(2, bodyY, w - 4, 1);
  ctx.fillRect(2, h - 2, w - 4, 2);
  ctx.fillStyle = PAL.raisedStone;
  ctx.fillRect(2, bodyY, 2, bodyH);
  ctx.fillRect(w - 4, bodyY, 2, bodyH);
  // stone seams, denser than a cottage (rough workshop masonry)
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  for (let y = bodyY + 4; y < h - 4; y += 5) ctx.fillRect(4, y, w - 8, 1);

  // ---- window (small, high, warm coal-glow — left of the hearth mouth) ----
  const winY = bodyY + Math.floor(bodyH * 0.16);
  const windows = [{ x: 8, y: winY, w: 8, h: 7 }];
  ctx.fillStyle = PAL.voidBlack;
  ctx.fillRect(windows[0].x, windows[0].y, windows[0].w, windows[0].h);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(windows[0].x - 1, windows[0].y - 1, windows[0].w + 2, 1);
  ctx.fillRect(windows[0].x - 1, windows[0].y - 1, 1, windows[0].h + 2);

  // ---- hearth mouth (wide dark opening in place of a door; anvil beside it) ----
  const doorW = 15;
  const doorX = 10;
  const doorY = h - Math.floor(bodyH * 0.7);
  ctx.fillStyle = PAL.stoneEdgeDark; // heavy stone surround
  ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, h - (doorY - 2) - 1);
  ctx.fillStyle = PAL.voidBlack; // the mouth itself
  ctx.fillRect(doorX, doorY, doorW, h - 2 - doorY);
  ctx.fillStyle = PAL.crimsonDark; // banked coals glowing at the floor of the mouth
  ctx.fillRect(doorX + 2, h - 5, doorW - 4, 2);
  ctx.fillStyle = PAL.torchOrange;
  ctx.fillRect(doorX + 4, h - 5, 2, 1);
  ctx.fillRect(doorX + 9, h - 5, 2, 1);

  // small anvil just outside the mouth, on the ground line (reads "making")
  const anvX = doorX + doorW + 5;
  ctx.fillStyle = PAL.voidBlack;
  ctx.fillRect(anvX, h - 9, 8, 3); // anvil face
  ctx.fillRect(anvX + 2, h - 6, 4, 4); // anvil body/leg
  ctx.fillStyle = PAL.ghostGrey; // cold steel highlight
  ctx.fillRect(anvX, h - 9, 8, 1);
  ctx.fillRect(anvX + 6, h - 8, 2, 1); // horn stub

  return {
    canvas,
    roofH,
    doorX: Math.round(doorX),
    doorW,
    doorY,
    windows,
    zAnchor: { x: chimX + Math.floor(chimW / 2), y: 0 }, // ember/spark anchor
  };
}

/* ============================================================
   THE TILTING YARD — a low walled training ground, deliberately unlike the
   other buildings: no roof, no gable, mostly open ground behind a squat
   stone-and-palisade wall. A striped joust tilt barrier splits the yard and
   a small pennant banner pole stands at the corner (the zAnchor perches at
   its tip). The gate is a simple timber double-gate set in the front wall.
   Reads "place of action/drill": low, wide, open, banner snapping overhead.

   Engine note: index.jsx applies ONE fixed collision rule to every building
   kind — the bottom band of the sprite becomes a solid footprint, with no
   per-kind branching. This sprite is drawn so the blocked lower band is
   where a real yard's solid stuff already lives — the front wall, gate
   posts and the tilt barrier/quintain — while the unblocked upper band
   reads as open sky over a low back wall. The villager spawn point is
   always home.y + home.h + 6 (set by index.jsx, independent of doorY
   here), which lands exactly at the gate line, so "villagers work standing
   at the gate" falls out of the existing plumbing for free.

   Returns canvas + geometry matching buildArthurHouse()/buildWizardTower():
     doorX/doorW/doorY — gate placement (villager exits/returns here)
     windows           — [] (a yard has no glowing windows — see crab cave)
     zAnchor           — banner-pole tip (a floating icon/effect anchor)
   ============================================================ */
export function buildTiltingYard(w = 68, h = 48) {
  const { canvas, ctx } = makeOffscreen(w, h);
  const wallH = 16; // low front-wall band; open "sky" sits above it
  const bodyY = wallH;
  const bodyH = h - wallH;

  // ---- open ground inside the yard (visible above the front wall line) ----
  ctx.fillStyle = PAL.cobble2;
  ctx.fillRect(3, bodyY - 4, w - 6, h - (bodyY - 4) - 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = bodyY; y < h - 3; y += 6) ctx.fillRect(4, y, w - 8, 1);

  // ---- low back wall + corner posts (reads as an enclosed yard, not a field) ----
  ctx.fillStyle = PAL.dungeonStone;
  ctx.fillRect(3, bodyY - 4, w - 6, 4);
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(3, bodyY - 4, w - 6, 1);
  // corner posts (palisade stakes)
  const post = (px) => {
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(px, bodyY - 8, 3, 12);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(px, bodyY - 8, 1, 12);
    ctx.fillStyle = PAL.stoneEdgeDark;
    ctx.fillRect(px, bodyY - 9, 3, 1); // pointed cap
  };
  post(4);
  post(w - 8);

  // ---- pennant banner pole at the back-right corner (zAnchor at its tip) ----
  const poleX = w - 12;
  const poleTopY = 0;
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(poleX, poleTopY + 4, 2, bodyY - 2);
  ctx.fillStyle = PAL.bloodCrimson; // small pennant
  ctx.fillRect(poleX + 2, poleTopY + 4, 7, 5);
  // pennant swallow-tail notch — carved out of the flag so the sky shows
  // through (a solid "notch" pixel would float visibly over transparency)
  ctx.clearRect(poleX + 9, poleTopY + 5, 2, 3);
  ctx.fillStyle = PAL.agedGold;
  ctx.fillRect(poleX + 2, poleTopY + 4, 7, 1); // gold top edge
  ctx.fillStyle = PAL.paleGold;
  ctx.fillRect(poleX, poleTopY, 2, 4); // pole finial glint

  // ---- striped joust tilt barrier, splitting the yard lengthwise ----
  const tiltY = bodyY + Math.floor(bodyH * 0.32);
  const tiltX0 = 14;
  const tiltX1 = w - 22;
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(tiltX0, tiltY, tiltX1 - tiltX0, 2); // top rail
  for (let x = tiltX0; x < tiltX1; x += 6) {
    ctx.fillStyle = (x / 6) % 2 === 0 ? PAL.parchment : PAL.bloodCrimson;
    ctx.fillRect(x, tiltY + 2, 6, 3); // striped barrier boards
  }
  ctx.fillStyle = PAL.woodDark; // support posts
  ctx.fillRect(tiltX0 - 1, tiltY, 2, bodyH - (tiltY - bodyY) - 2);
  ctx.fillRect(tiltX1 - 1, tiltY, 2, bodyH - (tiltY - bodyY) - 2);

  // ---- quintain (training dummy) past the far end of the tilt barrier ----
  const qx = tiltX1 + 6;
  const qy = bodyY + Math.floor(bodyH * 0.42);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(qx, qy, 2, h - 3 - qy); // post
  ctx.fillRect(qx - 5, qy, 12, 2); // crossbar arm
  ctx.fillStyle = PAL.ghostGrey; // shield-end of the arm
  ctx.fillRect(qx - 6, qy - 1, 3, 4);
  ctx.fillStyle = PAL.bloodCrimson; // sack-end of the arm
  ctx.fillRect(qx + 5, qy - 1, 3, 4);

  // ---- front wall with a timber double-gate (villager exit point) ----
  // Kept low (40% of the body) so the tilt barrier and quintain stay visible
  // over it — a taller wall was tried and buried the whole yard interior.
  const gateW = 14;
  const gateX = Math.floor(w * 0.28);
  const gateY = h - Math.floor(bodyH * 0.4);
  ctx.fillStyle = PAL.dungeonStone; // front wall either side of the gate
  ctx.fillRect(3, gateY - 2, w - 6, h - 2 - (gateY - 2));
  ctx.fillStyle = PAL.stoneEdgeLight;
  ctx.fillRect(3, gateY - 2, w - 6, 1);
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(3, h - 2, w - 6, 2);
  // carve the gate opening, then fill with timber double-doors
  ctx.fillStyle = PAL.wood;
  ctx.fillRect(gateX, gateY, gateW, h - 2 - gateY);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(gateX + gateW / 2, gateY, 1, h - 2 - gateY); // seam between the two leaves
  ctx.fillRect(gateX, gateY, gateW, 1);
  ctx.fillStyle = PAL.agedGold; // iron-gold studs, one per leaf
  ctx.fillRect(gateX + 2, gateY + 3, 1, 1);
  ctx.fillRect(gateX + gateW - 3, gateY + 3, 1, 1);
  ctx.fillRect(gateX + 2, gateY + 8, 1, 1);
  ctx.fillRect(gateX + gateW - 3, gateY + 8, 1, 1);
  // gate posts flanking the opening
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(gateX - 2, gateY - 3, 2, h - 1 - (gateY - 3));
  ctx.fillRect(gateX + gateW, gateY - 3, 2, h - 1 - (gateY - 3));

  return {
    canvas,
    roofH: wallH, // named to match the existing roofH convention (bevel-band height)
    doorX: Math.round(gateX),
    doorW: gateW,
    doorY: gateY,
    windows: [],
    zAnchor: { x: poleX + 1, y: poleTopY },
  };
}
