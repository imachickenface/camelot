import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamelot } from '../../state/CamelotContext';
import { PixelButton } from '../../components/ui';
import { Crown } from '../../components/emblems';
import {
  PAL,
  buildArthurSprites,
  buildMerlinSprites,
  buildCrabSprites,
  buildVacantHouse,
  buildArthurHouse,
  buildWizardTower,
  buildCrabCave,
  drawCaveGlow,
  buildDeadTree,
  buildWell,
  buildLamppost,
} from './sprites';
import { createVillager, stepVillager, updateConversations } from './villagers';
import './village.css';

/* ============================================================
   WORLD LAYOUT
   The village lives in a fixed logical "world" (WORLD_W x WORLD_H world px).
   The scene is scaled uniformly to fill the page area (letterboxed), and the
   whole thing is rendered at devicePixelRatio for crisp chunky pixels.

   Houses are laid out in a ring around a central square (the well sits in the
   middle). House index k (0..11) maps directly to agents[k]. Three seats have
   special residences with a wandering inhabitant ("villager"):
     - seat 0  → King Arthur's crimson-and-gold cottage
     - seat 4  → The Mighty Crab's dark stone cave (seat-05 in the data)
     - seat 11 → Merlin's wizard tower (seat-12 in the data)
   The other nine are vacant knight cottages. Adding another villager is a matter
   of giving its seat a HOUSE_KIND below + a VILLAGER_SPECS entry.
   ============================================================ */

const WORLD_W = 480;
const WORLD_H = 320;
const TILE = 16; // ground tile size in world px

// Ring geometry for the 12 houses around the central square.
const CENTER = { x: WORLD_W / 2, y: WORLD_H / 2 };
const RING_RX = 170;
const RING_RY = 110;

// Which seat index gets which kind of residence. Everything not listed is a
// vacant cottage. (Seat 4 == agents[4] == "seat-05" == The Mighty Crab. Seat
// 11 == agents[11] == "seat-12" == Merlin.)
const HOUSE_KIND = { 0: 'arthur', 4: 'crab', 11: 'merlin' };

// Per-kind house footprint (world px). Vacant is the default.
const HOUSE_SIZE = {
  arthur: { w: 60, h: 58 },
  merlin: { w: 42, h: 74 }, // a tower: narrow + tall
  crab: { w: 54, h: 44 }, // a cave: low + wide
  vacant: { w: 48, h: 46 },
};

// The wandering inhabitants. Each references a seat id (agents[].id), a house
// kind (→ which residence + collision box), and how to build its walk sprite.
const VILLAGER_SPECS = [
  { id: 'seat-01', name: 'King Arthur', kind: 'arthur', buildSprites: buildArthurSprites },
  { id: 'seat-05', name: 'The Mighty Crab', kind: 'crab', buildSprites: buildCrabSprites },
  { id: 'seat-12', name: 'Merlin The Wizard', kind: 'merlin', buildSprites: buildMerlinSprites },
];

// Window-glow schemes, kept palette-true (see docs/DESIGN.md). Arthur's values
// match the original warm hearth exactly; Merlin's is an arcane gold-on-violet.
const ARTHUR_GLOW = {
  core: '217,123,41',
  bloom: '232,212,139',
  aBase: 0.72,
  aAmp1: 0.14,
  aAmp2: 0.06,
  iBase: 0.26,
  iAmp: 0.05,
};
const MERLIN_GLOW = {
  core: '232,212,139',
  bloom: '87,64,126',
  aBase: 0.66,
  aAmp1: 0.16,
  aAmp2: 0.07,
  iBase: 0.22,
  iAmp: 0.05,
};

// Static prop placements (world coords = top-left of each sprite canvas).
const PROPS = [
  { type: 'tree', x: 40, y: 40, w: 26, h: 40 },
  { type: 'tree', x: WORLD_W - 66, y: 44, w: 26, h: 40 },
  { type: 'tree', x: 52, y: WORLD_H - 78, w: 26, h: 40 },
  { type: 'tree', x: WORLD_W - 70, y: WORLD_H - 82, w: 26, h: 40 },
  { type: 'lamp', x: CENTER.x - 70, y: CENTER.y + 30, w: 12, h: 40 },
  { type: 'lamp', x: CENTER.x + 58, y: CENTER.y + 30, w: 12, h: 40 },
  { type: 'lamp', x: CENTER.x - 6, y: CENTER.y - 74, w: 12, h: 40 },
];

/**
 * Compute the 12 house rectangles in world space, one per seat, around the ring.
 * Each carries a `kind` ('arthur' | 'merlin' | 'vacant') used for sizing,
 * rendering and collision. Returns array indexed by seat.
 */
function computeHouses() {
  const houses = [];
  for (let k = 0; k < 12; k++) {
    // start at top (−90°) and go clockwise so seat 1 is "north" of the square
    const ang = -Math.PI / 2 + (k / 12) * Math.PI * 2;
    const cx = CENTER.x + Math.cos(ang) * RING_RX;
    const cy = CENTER.y + Math.sin(ang) * RING_RY;
    const kind = HOUSE_KIND[k] || 'vacant';
    const { w, h } = HOUSE_SIZE[kind];
    houses.push({
      seatIndex: k,
      kind,
      x: Math.round(cx - w / 2),
      y: Math.round(cy - h / 2),
      w,
      h,
    });
  }
  return houses;
}

export default function Village() {
  const { agents, getAgent, conversations, startConversation, clearConversations, setAgentActive } =
    useCamelot();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // LIVE active flags, per seat. The Hub/Editor flip agent.active in shared
  // context with no refresh; we mirror them into a ref so the rAF loop (whose
  // closure captured the villagers once) always reads the current flags.
  const activeMapRef = useRef({});
  useEffect(() => {
    const m = {};
    for (const a of agents) m[a.id] = Boolean(a.active);
    activeMapRef.current = m;
  }, [agents]);

  // LIVE pipeline conversations, mirrored into a ref for the same reason.
  const convosRef = useRef([]);
  useEffect(() => {
    convosRef.current = conversations || [];
  }, [conversations]);

  // Keep the latest agents list available to click handlers without re-binding
  // the whole canvas effect each render.
  const agentsRef = useRef(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // Selection state drives the HTML overlay (click tooltip). It stores the
  // world-space anchor + kind; the overlay is positioned via world→screen.
  const [selection, setSelection] = useState(null);
  // Screen-space transform kept in a ref so the overlay can be positioned each
  // render and the rAF loop can hit-test without React churn.
  const viewRef = useRef({ scale: 1, offX: 0, offY: 0, dpr: 1 });
  // Force overlay re-position when the view transform changes (resize).
  const [, setViewTick] = useState(0);

  const houses = useRef(computeHouses()).current;

  // Bundle of geometry the click handler needs (set inside the canvas effect).
  const hitBundleRef = useRef(null);

  /** Map a world point to CSS-pixel screen coords using the current transform. */
  const worldToScreen = useCallback((wx, wy) => {
    const v = viewRef.current;
    return { x: wx * v.scale + v.offX, y: wy * v.scale + v.offY };
  }, []);

  // ---- Main canvas effect: sprites built once, single rAF loop. ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    // Build every sprite ONCE (expensive to redo per frame).
    const vacantHouse = buildVacantHouse(HOUSE_SIZE.vacant.w, HOUSE_SIZE.vacant.h);
    const arthurHouse = buildArthurHouse(HOUSE_SIZE.arthur.w, HOUSE_SIZE.arthur.h);
    const wizardTower = buildWizardTower(HOUSE_SIZE.merlin.w, HOUSE_SIZE.merlin.h);
    const crabCave = buildCrabCave(HOUSE_SIZE.crab.w, HOUSE_SIZE.crab.h);
    const treeSprite = buildDeadTree(26, 40);
    const wellSprite = buildWell(30, 30);
    const lampSprite = buildLamppost(12, 40);

    // Residence geometry per kind (windows / door / z-anchor), keyed for reuse.
    const GEOM = { arthur: arthurHouse, merlin: wizardTower, crab: crabCave };
    const HOUSE_CANVAS = { arthur: arthurHouse.canvas, merlin: wizardTower.canvas, crab: crabCave.canvas };
    // Crab's cave has no glowing windows (windows: []), so it has no entry here —
    // paintLitWindows() is a no-op on an empty windows array; drawCaveGlow() is
    // called separately for the cave-mouth embers instead (see the houses loop).
    const GLOW = { arthur: ARTHUR_GLOW, merlin: MERLIN_GLOW };

    // Pre-render the static ground (grass + cobble square + stone paths) into an
    // offscreen world-sized canvas so we only blit it each frame.
    const ground = document.createElement('canvas');
    ground.width = WORLD_W;
    ground.height = WORLD_H;
    const gctx = ground.getContext('2d');
    gctx.imageSmoothingEnabled = false;
    drawGround(gctx);

    // ---- Collision map: solid boxes villagers must not walk into. ----
    // We use the lower ~55% of each house (the "footprint") plus prop trunks.
    const solids = [];
    for (const hs of houses) {
      const footY = hs.y + Math.round(hs.h * 0.45);
      solids.push({ x: hs.x + 3, y: footY, w: hs.w - 6, h: hs.h - (footY - hs.y) - 2 });
    }
    for (const p of PROPS) {
      if (p.type === 'tree') solids.push({ x: p.x + 8, y: p.y + 24, w: 10, h: 14 });
      else if (p.type === 'lamp') solids.push({ x: p.x + 3, y: p.y + 30, w: 6, h: 8 });
    }
    // the central well
    const wellPos = { x: CENTER.x - 15, y: CENTER.y - 15 };
    solids.push({ x: wellPos.x + 4, y: wellPos.y + 14, w: 22, h: 14 });

    const bob = { r: 8 }; // sprite half-extent for collision (feet box)

    /** Is a feet-box centered at (x,y) clear of all solids and in-bounds? */
    function isClear(x, y) {
      const bx = x - bob.r;
      const by = y - 4; // feet are near the bottom of the sprite
      const bw = bob.r * 2;
      const bh = 6;
      if (bx < 6 || by < 6 || bx + bw > WORLD_W - 6 || by + bh > WORLD_H - 6) return false;
      for (const s of solids) {
        if (bx < s.x + s.w && bx + bw > s.x && by < s.y + s.h && by + bh > s.y) return false;
      }
      return true;
    }

    /** Pick a random reachable waypoint on open ground. */
    function pickWaypoint() {
      for (let i = 0; i < 30; i++) {
        const tx = 30 + Math.random() * (WORLD_W - 60);
        const ty = 40 + Math.random() * (WORLD_H - 80);
        if (isClear(tx, ty)) return { x: tx, y: ty };
      }
      return { x: CENTER.x, y: CENTER.y + 40 };
    }

    // Shared world helpers + the conversation rally point (open ground below
    // the well, where villagers gather to talk).
    const env = {
      isClear,
      pickWaypoint,
      speed: 34,
      meetPoint: { x: CENTER.x, y: CENTER.y + 48 },
    };

    // ---- Build the villagers (Arthur + Merlin) bound to their houses. ----
    const villagers = [];
    for (const spec of VILLAGER_SPECS) {
      const home = houses.find((h) => h.kind === spec.kind);
      const geom = GEOM[spec.kind];
      if (!home || !geom) continue;
      const doorCenterX = geom.doorX + (geom.doorW ? geom.doorW / 2 : 6);
      const doorPoint = { x: home.x + doorCenterX, y: home.y + home.h + 6 };
      const zSrc = geom.zAnchor || geom.chimney || { x: Math.floor(home.w / 2), y: 0 };
      const zAnchor = { x: home.x + zSrc.x, y: home.y + zSrc.y };
      villagers.push(
        createVillager({
          id: spec.id,
          name: spec.name,
          kind: spec.kind,
          sprites: spec.buildSprites(),
          home,
          doorPoint,
          zAnchor,
          active: Boolean(activeMapRef.current[spec.id]),
        }),
      );
    }

    // Expose villagers + house geometry to the click handler.
    hitBundleRef.current = { houses, villagers };

    let raf = 0;
    let last = performance.now();

    function frame(now) {
      try {
        // Clamp dt to [0, 48ms]: the upper bound absorbs tab switches; the lower
        // bound guards against a rAF timestamp that lands at or before `last`
        // (rAF timestamps aren't guaranteed to be strictly monotonic relative to
        // a performance.now() read outside the callback). Without it, a single
        // negative tick drives walkPhase negative, and frames[negative-index] is
        // undefined — which is what threw "paintable draw failed" here.
        const dt = Math.max(0, Math.min(48, now - last)) / 1000;
        last = now;

        // advance every villager against its live active flag
        for (const v of villagers) {
          stepVillager(v, Boolean(activeMapRef.current[v.id]), dt, now, env);
        }
        // then resolve pipeline conversations (dormant when the list is empty)
        updateConversations(villagers, convosRef.current, now, env);

        render(now);
      } catch (err) {
        // Never let one bad frame kill the loop or blank the scene.
        if (!window.__villageFrameErr) {
          window.__villageFrameErr = true;
          // eslint-disable-next-line no-console
          console.error('[village] frame error:', err);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    /** Paint the lit/dim windows of a residence (flickers warm when active). */
    function paintLitWindows(hs, windows, active, glow, now) {
      const flick = active
        ? glow.aBase + Math.sin(now / 140) * glow.aAmp1 + Math.sin(now / 57) * glow.aAmp2
        : glow.iBase + Math.sin(now / 600) * glow.iAmp;
      for (const win of windows) {
        const wx = hs.x + win.x;
        const wy = hs.y + win.y;
        ctx.fillStyle = `rgba(${glow.core},${flick})`;
        ctx.fillRect(wx, wy, win.w, win.h);
        // muntins over the glow
        ctx.fillStyle = 'rgba(11,10,18,0.8)';
        ctx.fillRect(wx + win.w / 2 - 0.5, wy, 1, win.h);
        ctx.fillRect(wx, wy + win.h / 2 - 0.5, win.w, 1);
        // soft outer bloom
        ctx.fillStyle = `rgba(${glow.bloom},${flick * 0.18})`;
        ctx.fillRect(wx - 2, wy - 2, win.w + 4, win.h + 4);
      }
    }

    // ---- RENDER ----
    function render(now) {
      const v = viewRef.current;
      // clear (device pixels)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = PAL.voidBlack;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // world → screen transform (dpr * scale, with letterbox offset)
      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.translate(v.offX, v.offY);
      ctx.scale(v.scale, v.scale);

      // ground
      ctx.drawImage(ground, 0, 0);

      // subtle dusk vignette (drawn in world space)
      const vg = ctx.createRadialGradient(
        CENTER.x,
        CENTER.y,
        40,
        CENTER.x,
        CENTER.y,
        WORLD_W * 0.62,
      );
      vg.addColorStop(0, 'rgba(61,42,92,0.05)');
      vg.addColorStop(1, 'rgba(5,4,9,0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      // build a paint list of y-sortable things (props, houses, villagers) so
      // nearer objects overlap farther ones correctly (simple top-down depth).
      const paintables = [];

      // well (center)
      paintables.push({
        y: CENTER.y - 15 + 30,
        draw: () => ctx.drawImage(wellSprite, CENTER.x - 15, CENTER.y - 15),
      });

      // props
      for (const p of PROPS) {
        if (p.type === 'tree') {
          paintables.push({ y: p.y + p.h, draw: () => ctx.drawImage(treeSprite, p.x, p.y) });
        } else if (p.type === 'lamp') {
          paintables.push({
            y: p.y + p.h,
            draw: () => {
              ctx.drawImage(lampSprite.canvas, p.x, p.y);
              // flickering flame in the housing
              const fa = lampSprite.flameAnchor;
              drawFlame(ctx, p.x + fa.x, p.y + fa.y, now + p.x * 7);
            },
          });
        }
      }

      // houses: Arthur's cottage, Merlin's tower, or a vacant cottage.
      for (const hs of houses) {
        if (hs.kind === 'vacant') {
          paintables.push({
            y: hs.y + hs.h,
            draw: () => ctx.drawImage(vacantHouse.canvas, hs.x, hs.y),
          });
          continue;
        }
        // occupied residence (arthur | crab | merlin) — shared draw path.
        // Seat ids are "seat-01".."seat-12", zero-padded from (index+1); house
        // index k always equals agents[k]'s array index, so this generalizes
        // to any number of special residences without hardcoding per kind.
        const seatId = `seat-${String(hs.seatIndex + 1).padStart(2, '0')}`;
        const geom = GEOM[hs.kind];
        paintables.push({
          y: hs.y + hs.h,
          draw: () => {
            ctx.drawImage(HOUSE_CANVAS[hs.kind], hs.x, hs.y);
            const active = Boolean(activeMapRef.current[seatId]);
            if (hs.kind === 'crab') {
              // no glowing windows on a cave — embers at the mouth instead
              drawCaveGlow(ctx, hs.x, hs.y, geom.mouth, now, active);
            } else {
              paintLitWindows(hs, geom.windows, active, GLOW[hs.kind], now);
            }
            // arcane twinkle at the tower's finial
            if (hs.kind === 'merlin') {
              drawArcaneSparkle(ctx, hs.x + geom.zAnchor.x, hs.y + 1, now, active);
            }
          },
        });
      }

      // villager chibi sprites (if visible / out of the house)
      for (const vil of villagers) {
        if (vil.alpha <= 0.01 || vil.state === 'inside') continue;
        paintables.push({
          y: vil.y + 12,
          draw: () => {
            const frames = vil.sprites[vil.dir];
            const idx = vil.moving ? Math.floor(vil.walkPhase) % frames.length : 0;
            const spr = frames[idx];
            const sw = spr.width;
            const sh = spr.height;
            // shadow
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(vil.x - 6, vil.y + 1, 12, 3);
            ctx.globalAlpha = vil.alpha;
            // sprite origin: centered on x, feet near vil.y
            ctx.drawImage(spr, Math.round(vil.x - sw / 2), Math.round(vil.y - sh + 4));
            ctx.globalAlpha = 1;
          },
        });
      }

      // paint back-to-front by y. Each draw is isolated so one bad sprite can
      // never blank the whole scene — it just skips that one item and logs once.
      paintables.sort((a, b) => a.y - b.y);
      for (const p of paintables) {
        try {
          p.draw();
        } catch (err) {
          if (!window.__villageDrawErr) {
            window.__villageDrawErr = true;
            // eslint-disable-next-line no-console
            console.error('[village] paintable draw failed:', err);
          }
        }
      }

      // z z Z particles + conversation speech bubbles (above everything).
      for (const vil of villagers) {
        for (const z of vil.zParticles) {
          const fade = z.life < 0.3 ? z.life / 0.3 : 1 - (z.life - 0.3) / (z.ttl - 0.3);
          drawZ(ctx, z.x, z.y, z.size, Math.max(0, fade));
        }
        if (vil.speech && vil.state === 'converse') {
          drawSpeechBubble(ctx, vil.x, vil.y - 20, vil.speech.text);
        }
      }
    }

    // ---- resize / dpr handling ----
    function resize() {
      const parent = canvas.parentElement;
      const cw = parent.clientWidth;
      const ch = parent.clientHeight;
      // If the stage hasn't been laid out yet (0 size), bail rather than compute a
      // scale of 0 (which paints a blank canvas). The ResizeObserver will call us
      // again the moment the element gets a real size.
      if (cw < 2 || ch < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      // uniform integer-ish scale to fit the world, letterboxed & centered
      const scale = Math.min(cw / WORLD_W, ch / WORLD_H);
      const offX = (cw - WORLD_W * scale) / 2;
      const offY = (ch - WORLD_H * scale) / 2;
      viewRef.current = { scale, offX, offY, dpr };
      setViewTick((t) => t + 1); // reposition HTML overlay
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    window.addEventListener('resize', resize);

    // Paint one frame SYNCHRONOUSLY on mount. requestAnimationFrame is throttled/
    // paused while the document isn't actively painting (a backgrounded tab, or an
    // embedded preview panel), which on a client-side remount would leave the canvas
    // blank until something forced a paint. Drawing once here guarantees the scene is
    // visible immediately; the rAF loop below then drives the animation when visible.
    try {
      render(performance.now());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[village] initial render failed:', err);
    }

    // Re-paint when the tab/panel becomes visible again (rAF may have been paused).
    const onVisible = () => {
      if (!document.hidden) {
        try {
          render(performance.now());
        } catch {
          /* handled by the frame loop's logger */
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    raf = requestAnimationFrame(frame);

    // ---- cleanup: cancel rAF + remove listeners (no leaks) ----
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // houses is a stable ref; sprites rebuilt once — intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- DEV-only helper to exercise the conversation seam from the console ----
  // In a dev build: `__camelot.talk()` wakes Arthur + Merlin and starts them
  // chatting; `__camelot.hush()` ends it. The real pipeline runner will call the
  // same startConversation()/clearConversations() from context.
  useEffect(() => {
    if (!import.meta.env || !import.meta.env.DEV) return undefined;
    window.__camelot = {
      talk: (lines) => {
        setAgentActive('seat-01', true);
        setAgentActive('seat-12', true);
        return startConversation(
          ['seat-01', 'seat-12'],
          lines || ['Merlin!', 'My liege.', 'The script?', 'Rendering…'],
        );
      },
      hush: () => clearConversations(),
      // send everyone back to bed (ends the chat + puts Merlin to sleep)
      sleep: () => {
        clearConversations();
        setAgentActive('seat-12', false);
      },
      // toggle the crab in/out of its cave from the console, e.g.
      // `__camelot.crab(false)` sends it home with zzz's, `__camelot.crab(true)`
      // wakes it back out to wander.
      crab: (active = true) => setAgentActive('seat-05', active),
    };
    return () => {
      try {
        delete window.__camelot;
      } catch {
        /* noop */
      }
    };
  }, [setAgentActive, startConversation, clearConversations]);

  /** Convert a screen (client) point to world coords using the view transform. */
  const screenToWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const v = viewRef.current;
    return { x: (sx - v.offX) / v.scale, y: (sy - v.offY) / v.scale };
  }, []);

  // ---- click hit-testing (wandering villagers first, then houses) ----
  const onCanvasClick = useCallback(
    (e) => {
      const bundle = hitBundleRef.current;
      if (!bundle) return;
      const { x, y } = screenToWorld(e.clientX, e.clientY);

      // 1) a wandering villager (generous box around the body)
      for (const vil of bundle.villagers) {
        if (vil.alpha > 0.4 && vil.state !== 'inside') {
          if (x > vil.x - 10 && x < vil.x + 10 && y > vil.y - 24 && y < vil.y + 4) {
            setSelection({ kind: vil.kind, wx: vil.x, wy: vil.y - 22 });
            return;
          }
        }
      }

      // 2) houses (top-to-bottom so overlapping upper roofs win)
      for (const hs of bundle.houses) {
        if (x >= hs.x && x <= hs.x + hs.w && y >= hs.y && y <= hs.y + hs.h) {
          if (hs.kind === 'vacant') {
            const agent = agentsRef.current[hs.seatIndex];
            setSelection({
              kind: 'vacant',
              wx: hs.x + hs.w / 2,
              wy: hs.y,
              agentId: agent ? agent.id : 'seat-01',
            });
          } else {
            setSelection({ kind: hs.kind, wx: hs.x + hs.w / 2, wy: hs.y });
          }
          return;
        }
      }
      // clicked empty ground → dismiss any panel
      setSelection(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screenToWorld],
  );

  // Position the overlay via world→screen each render (also re-runs on resize
  // tick and selection change).
  let overlayStyle = null;
  if (selection) {
    const p = worldToScreen(selection.wx, selection.wy);
    overlayStyle = { left: `${p.x}px`, top: `${p.y}px` };
  }

  const arthurActive = Boolean(getAgent('seat-01') && getAgent('seat-01').active);
  const crabActive = Boolean(getAgent('seat-05') && getAgent('seat-05').active);
  const merlinActive = Boolean(getAgent('seat-12') && getAgent('seat-12').active);

  return (
    <div className="page village-page">
      <div className="village-stage">
        <canvas
          ref={canvasRef}
          className="village-canvas"
          onClick={onCanvasClick}
          aria-label="Camelot village at dusk"
        />

        {/* Title plate — pixel-panel styling, sits over the scene */}
        <div className="village-titleplate font-title">The Village of Camelot</div>

        {/* ---- Click tooltip overlay ---- */}
        {selection && selection.kind === 'arthur' && (
          <div className="village-bubble village-bubble--arthur" style={overlayStyle} role="dialog">
            <div className="village-bubble__inner">
              <div className="village-bubble__head">
                <span className="village-bubble__crest" style={{ color: PAL.agedGold }}>
                  <Crown size={18} />
                </span>
                <span className="font-label village-bubble__name">King Arthur</span>
              </div>
              <div className="village-bubble__status font-body">
                <span
                  className={`village-dot ${arthurActive ? 'is-active' : 'is-idle'}`}
                  aria-hidden="true"
                />
                {arthurActive ? 'Active — patrolling the village' : 'Resting — the hearth is dim'}
              </div>
              <PixelButton variant="gold" size="sm" block onClick={() => navigate('/')}>
                View at the Round Table
              </PixelButton>
            </div>
            <span className="village-bubble__tail" aria-hidden="true" />
          </div>
        )}

        {selection && selection.kind === 'merlin' && (
          <div className="village-bubble village-bubble--merlin" style={overlayStyle} role="dialog">
            <div className="village-bubble__inner">
              <div className="village-bubble__head">
                <span className="village-bubble__crest" aria-hidden="true">
                  <WizardHat size={18} />
                </span>
                <span className="font-label village-bubble__name">Merlin The Wizard</span>
              </div>
              <div className="village-bubble__status font-body">
                <span
                  className={`village-dot ${merlinActive ? 'is-active' : 'is-idle'}`}
                  aria-hidden="true"
                />
                {merlinActive
                  ? 'Active — conjuring in the village'
                  : 'Resting — the tower is dark'}
              </div>
              <PixelButton variant="ghost" size="sm" block onClick={() => navigate('/')}>
                View at the Round Table
              </PixelButton>
            </div>
            <span className="village-bubble__tail" aria-hidden="true" />
          </div>
        )}

        {selection && selection.kind === 'crab' && (
          <div className="village-bubble village-bubble--crab" style={overlayStyle} role="dialog">
            <div className="village-bubble__inner">
              <div className="village-bubble__head">
                <span className="village-bubble__crest" aria-hidden="true">
                  <JesterCrest size={18} />
                </span>
                <span className="font-label village-bubble__name">The Mighty Crab</span>
              </div>
              <div className="village-bubble__status font-body">
                <span
                  className={`village-dot ${crabActive ? 'is-active' : 'is-idle'}`}
                  aria-hidden="true"
                />
                {crabActive ? 'Active — patrolling for bugs' : 'Resting — the cave is dark'}
              </div>
              <PixelButton variant="ghost" size="sm" block onClick={() => navigate('/')}>
                View at the Round Table
              </PixelButton>
            </div>
            <span className="village-bubble__tail" aria-hidden="true" />
          </div>
        )}

        {selection && selection.kind === 'vacant' && (
          <div className="village-bubble village-bubble--vacant" style={overlayStyle} role="dialog">
            <div className="village-bubble__inner">
              <p className="font-body village-bubble__line">This cottage awaits its knight.</p>
              <PixelButton
                variant="ghost"
                size="sm"
                block
                onClick={() => navigate('/editor?seat=' + selection.agentId)}
              >
                Summon a Knight
              </PixelButton>
            </div>
            <span className="village-bubble__tail" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Small SVG emblem used in Merlin's tooltip (original pixel art).
   ============================================================ */
function WizardHat({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="presentation"
      aria-hidden="true"
    >
      {/* pointed hat */}
      <rect x="7" y="1" width="2" height="1" fill="#3d2a5c" />
      <rect x="6" y="2" width="4" height="2" fill="#3d2a5c" />
      <rect x="5" y="4" width="6" height="2" fill="#3d2a5c" />
      <rect x="4" y="6" width="8" height="2" fill="#3d2a5c" />
      <rect x="3" y="8" width="10" height="2" fill="#241833" />
      {/* gold star */}
      <rect x="7" y="4" width="2" height="2" fill="#e8d48b" />
      <rect x="7" y="3" width="1" height="1" fill="#c9a227" />
      {/* brim */}
      <rect x="2" y="9" width="12" height="1" fill="#57407e" />
    </svg>
  );
}

/* ============================================================
   Small SVG emblem used in the Mighty Crab's tooltip (original pixel art).
   A jester hat over a claw — three alternating gold/purple tips above a
   crimson pincer, echoing the crab's jester-hat + gold-pincer sprite.
   ============================================================ */
function JesterCrest({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="presentation"
      aria-hidden="true"
    >
      {/* jester hat tips */}
      <rect x="2" y="3" width="2" height="2" fill={PAL.agedGold} />
      <rect x="2" y="1" width="1" height="2" fill={PAL.paleGold} />
      <rect x="7" y="1" width="2" height="4" fill={PAL.royalPurple} />
      <rect x="7" y="0" width="2" height="1" fill={PAL.purpleLight} />
      <rect x="12" y="3" width="2" height="2" fill={PAL.agedGold} />
      <rect x="13" y="1" width="1" height="2" fill={PAL.paleGold} />
      <rect x="3" y="5" width="10" height="2" fill={PAL.royalPurple} />
      {/* claw / pincer */}
      <rect x="4" y="8" width="8" height="4" fill={PAL.crimsonBright} />
      <rect x="3" y="9" width="2" height="2" fill={PAL.bloodCrimson} />
      <rect x="11" y="9" width="2" height="2" fill={PAL.bloodCrimson} />
      <rect x="5" y="12" width="6" height="1" fill={PAL.crimsonDark} />
    </svg>
  );
}

/* ============================================================
   Small canvas painters used by the render loop (kept out of the closure
   scope so they don't allocate). All operate in WORLD space.
   ============================================================ */

/** Pre-render the ground: grass tiles, central cobble square, stone paths. */
function drawGround(gctx) {
  // base dark grass with a little per-tile variation
  for (let ty = 0; ty < WORLD_H; ty += TILE) {
    for (let tx = 0; tx < WORLD_W; tx += TILE) {
      const r = (Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
      const shade = r > 0.66 ? PAL.grass2 : r < 0.33 ? PAL.grass3 : PAL.grass;
      gctx.fillStyle = shade;
      gctx.fillRect(tx, ty, TILE, TILE);
      // sparse grass blades / speckles
      if (r > 0.8) {
        gctx.fillStyle = PAL.grass2;
        gctx.fillRect(tx + 4, ty + 6, 1, 2);
        gctx.fillRect(tx + 9, ty + 10, 1, 2);
      }
    }
  }

  // central cobblestone square
  const sqR = 74;
  for (let y = CENTER.y - sqR; y < CENTER.y + sqR; y += 8) {
    for (let x = CENTER.x - sqR; x < CENTER.x + sqR; x += 8) {
      // round the corners of the square a touch
      const dx = (x - CENTER.x) / sqR;
      const dy = (y - CENTER.y) / sqR;
      if (dx * dx + dy * dy > 1.05) continue;
      const r = (Math.sin(x * 3.1 + y * 7.7) * 1000) % 1;
      gctx.fillStyle = r > 0.5 ? PAL.cobble : PAL.cobble2;
      gctx.fillRect(x, y, 8, 8);
      gctx.fillStyle = 'rgba(0,0,0,0.25)';
      gctx.fillRect(x, y, 8, 1);
      gctx.fillRect(x, y, 1, 8);
    }
  }

  // stone paths from the square out to each of the 12 houses
  for (let k = 0; k < 12; k++) {
    const ang = -Math.PI / 2 + (k / 12) * Math.PI * 2;
    const hx = CENTER.x + Math.cos(ang) * RING_RX;
    const hy = CENTER.y + Math.sin(ang) * RING_RY + 18; // aim at the doorstep
    drawPath(gctx, CENTER.x, CENTER.y, hx, hy);
  }
}

/** Chunky stone footpath between two world points. */
function drawPath(gctx, x0, y0, x1, y1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    const jx = (Math.sin(i * 2.3) * 2) | 0;
    gctx.fillStyle = i % 2 === 0 ? PAL.path : PAL.path2;
    gctx.fillRect(Math.round(px - 4 + jx), Math.round(py - 3), 8, 6);
    gctx.fillStyle = 'rgba(0,0,0,0.2)';
    gctx.fillRect(Math.round(px - 4 + jx), Math.round(py + 2), 8, 1);
  }
}

/** Flickering torch/lamp flame at (x,y) in world space. */
function drawFlame(ctx, x, y, seed) {
  const flick = Math.sin(seed / 90) * 0.5 + Math.sin(seed / 37) * 0.5;
  const h = 4 + flick;
  // outer glow
  ctx.fillStyle = 'rgba(217,123,41,0.28)';
  ctx.fillRect(x - 4, y - 4, 8, 8);
  // flame body
  ctx.fillStyle = PAL.torchOrange;
  ctx.fillRect(x - 1, y - h, 2, h);
  ctx.fillStyle = PAL.paleGold;
  ctx.fillRect(x - 0.5, y - h + 1, 1, Math.max(1, h - 2));
}

/** A tiny twinkling star at the wizard tower's finial (brighter when active). */
function drawArcaneSparkle(ctx, x, y, now, active) {
  const tw = active ? 0.5 + 0.5 * Math.sin(now / 180) : 0.15;
  ctx.fillStyle = `rgba(232,212,139,${0.5 * tw})`;
  ctx.fillRect(x - 2, y - 2, 1, 1);
  ctx.fillRect(x + 1, y - 2, 1, 1);
  ctx.fillStyle = `rgba(232,212,139,${tw})`;
  ctx.fillRect(x - 1, y - 3, 1, 3);
  ctx.fillRect(x - 2, y - 2, 3, 1);
}

/** Pixel "z" glyph (drawn from rects) used for the sleep particles. */
function drawZ(ctx, x, y, s, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const u = Math.max(1, Math.round(s / 4)); // pixel unit
  ctx.fillStyle = PAL.paleGold;
  // top bar, diagonal, bottom bar — a chunky letter Z
  ctx.fillRect(x, y, s, u); // top
  ctx.fillRect(x, y + s - u, s, u); // bottom
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + s - u - i * u, y + u + i * u, u, u); // diagonal
  }
  ctx.restore();
}

/**
 * A pixel speech bubble anchored above a villager's head (world space). Used by
 * the conversation feature; the panel auto-sizes to the (short) text. Text uses
 * the pixel label font once it's loaded, falling back to monospace before then.
 */
function drawSpeechBubble(ctx, x, y, text) {
  const t = (text || '').slice(0, 16);
  ctx.save();
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  const pad = 3;
  const tw = Math.ceil(ctx.measureText(t).width);
  const bw = Math.max(14, tw + pad * 2);
  const bh = 12;
  const bx = Math.round(x - bw / 2);
  const by = Math.round(y - bh - 6);
  // parchment panel
  ctx.fillStyle = PAL.parchment;
  ctx.fillRect(bx, by, bw, bh);
  // pixel bevel (dark edge)
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(bx, by, bw, 1);
  ctx.fillRect(bx, by, 1, bh);
  ctx.fillRect(bx, by + bh - 1, bw, 1);
  ctx.fillRect(bx + bw - 1, by, 1, bh);
  // little tail pointing down at the speaker
  ctx.fillStyle = PAL.parchment;
  ctx.fillRect(x - 1, by + bh, 2, 3);
  ctx.fillStyle = PAL.stoneEdgeDark;
  ctx.fillRect(x - 2, by + bh + 2, 4, 1);
  // text
  ctx.fillStyle = PAL.voidBlack;
  ctx.fillText(t, bx + pad, by + 3);
  ctx.restore();
}
