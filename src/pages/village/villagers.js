/**
 * villagers.js — the little inhabitants of the Village and how they behave.
 *
 * Originally the scene hard-coded a single "Arthur" sprite + state machine
 * inline in the render loop. This module lifts that into a reusable *villager*
 * so the Village can have MANY wandering inhabitants (Arthur, Merlin, and any
 * future knight) that all share one code path:
 *
 *   - createVillager()      builds a villager's state object bound to its house.
 *   - stepVillager()        advances one villager one frame (walk / sleep / z's).
 *   - updateConversations() the seam for the future "agents talking in a
 *                           pipeline" feature — see the big comment there.
 *
 * A villager owns a LIVE world-space position (v.x, v.y) and a head anchor, so
 * anything that needs to point at a villager (a click tooltip, a speech bubble,
 * a future thought-cloud) can follow it as it moves. The scene is responsible
 * only for *drawing* villagers from this state; all behavior lives here.
 */

/** States: 'inside' | 'exiting' | 'wander' | 'converse' | 'working' | 'returning' | 'entering'. */
export function createVillager({ id, name, kind, sprites, home, doorPoint, zAnchor, active }) {
  return {
    id,
    name,
    kind,
    sprites, // { down:[c0,c1], up, left, right } offscreen canvases
    home, // the house rect this villager lives in
    doorPoint, // world point just below the door (exit/return target)
    zAnchor, // world point the sleep z's rise from (chimney / spire tip)

    state: active ? 'wander' : 'inside',
    x: doorPoint.x,
    y: doorPoint.y,
    dir: 'down',
    moving: false,
    target: null,
    exitTarget: null,
    enterTarget: null,
    pauseUntil: 0,
    walkPhase: 0,
    lastActive: active,
    alpha: active ? 1 : 0, // fade in/out at the doorway

    // ---- conversation seam (populated by updateConversations) ----
    convo: null, // { convoId, meet:{x,y}, focus:{x,y}, lines:[...] } or null
    speech: null, // { text, until } currently-shown speech bubble, or null
    _line: 0, // which line of the convo we're on (cycles)

    // ---- live-activity seam (populated by updateActivities) ----
    work: null, // { activity, target:{x,y}, label } while a live session sends
    //             this knight to a building (library/forge/arena), else null

    // ---- per-villager sleep particles ----
    zParticles: [],
    lastZ: 0,
  };
}

/** World-space point just above a villager's head (for bubbles / tooltips). */
export function villagerHead(v) {
  return { x: v.x, y: v.y - 20 };
}

/**
 * Advance one villager by dt seconds. `active` is that agent's live active flag.
 * `env` supplies the shared world helpers:
 *   { isClear(x,y), pickWaypoint(), speed }
 * All geometry that differs per villager (home, doorPoint, zAnchor) lives on `v`.
 */
export function stepVillager(v, active, dt, now, env) {
  const SPEED = env.speed || 34;
  const doorPoint = v.doorPoint;
  const home = v.home;

  // Collision-aware step toward (tx,ty); returns true once basically arrived.
  function stepToward(tx, ty) {
    const dx = tx - v.x;
    const dy = ty - v.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) return true;
    const step = Math.min(dist, SPEED * dt);
    const nx = v.x + (dx / dist) * step;
    const ny = v.y + (dy / dist) * step;
    if (Math.abs(dx) > Math.abs(dy)) v.dir = dx < 0 ? 'left' : 'right';
    else v.dir = dy < 0 ? 'up' : 'down';
    if (env.isClear(nx, ny)) {
      v.x = nx;
      v.y = ny;
    } else if (env.isClear(nx, v.y)) {
      v.x = nx;
    } else if (env.isClear(v.x, ny)) {
      v.y = ny;
    } else {
      // Fully blocked head-on (e.g. the central well is between us and the
      // target). Slip one step PERPENDICULAR to the desired direction to round
      // the obstacle instead of wedging. Next frame we re-aim at the target.
      const perp =
        Math.abs(dx) > Math.abs(dy)
          ? [{ x: 0, y: step }, { x: 0, y: -step }] // moving horizontally → try vertical
          : [{ x: step, y: 0 }, { x: -step, y: 0 }]; // moving vertically → try horizontal
      for (const p of perp) {
        if (env.isClear(v.x + p.x, v.y + p.y)) {
          v.x += p.x;
          v.y += p.y;
          return false;
        }
      }
      return true; // truly stuck → treat as arrived so the caller retargets
    }
    return dist < 2;
  }

  // ---- react to active-flag transitions ----
  if (active !== v.lastActive) {
    if (active) {
      if (v.state === 'inside') {
        // Spawn at the door threshold, which sits just BELOW the house's
        // collision footprint. (Starting flush against the wall would land a
        // tall residence's villager — e.g. Merlin's tower — inside its own
        // solid box and wedge him there.) Then step a touch further out.
        v.x = doorPoint.x;
        v.y = doorPoint.y;
        v.dir = 'down';
        v.state = 'exiting';
        v.exitTarget = { x: doorPoint.x, y: doorPoint.y + 6 };
      }
    } else {
      // going to sleep cancels any conversation and heads home
      v.convo = null;
      v.speech = null;
      v.state = 'returning';
      v.target = doorPoint;
    }
    v.lastActive = active;
  }

  // ---- conversation ↔ wander handoff ----
  // updateConversations() sets/clears v.convo; reflect that into the state
  // machine here so it stays a pure function of (active, convo).
  if (v.convo && (v.state === 'wander' || v.state === 'converse')) {
    v.state = 'converse';
  } else if (!v.convo && v.state === 'converse') {
    v.state = 'wander';
    v.target = null;
    v.speech = null;
  }

  // ---- activity ↔ wander handoff ----
  // updateActivities() sets/clears v.work (a live Claude session sending this
  // knight to a building). Lower priority than a pipeline conversation: only
  // claim a plain wanderer, and yield straight back to wander the moment the
  // activity clears or a conversation starts.
  if (v.work && !v.convo && (v.state === 'wander' || v.state === 'working')) {
    v.state = 'working';
  } else if (v.state === 'working' && (!v.work || v.convo)) {
    v.state = 'wander';
    v.target = null;
    v.speech = null;
  }

  // ---- movement / state machine ----
  if (v.state === 'exiting') {
    v.alpha = Math.min(1, v.alpha + dt * 3);
    v.moving = true;
    if (stepToward(v.exitTarget.x, v.exitTarget.y)) {
      v.state = 'wander';
      v.pauseUntil = now + 300;
      v.target = null;
    }
  } else if (v.state === 'wander') {
    v.alpha = Math.min(1, v.alpha + dt * 3);
    if (now < v.pauseUntil) {
      v.moving = false; // idle pause
    } else if (!v.target) {
      v.target = env.pickWaypoint();
      v.moving = true;
    } else {
      const arrived = stepToward(v.target.x, v.target.y);
      v.moving = true;
      if (arrived) {
        v.target = null;
        v.moving = false;
        v.pauseUntil = now + 600 + Math.random() * 1600;
        if (Math.random() < 0.5) {
          v.dir = ['down', 'up', 'left', 'right'][(Math.random() * 4) | 0];
        }
      }
    }
  } else if (v.state === 'converse') {
    // walk to the assigned meeting slot, then stop and face the group focus.
    v.alpha = Math.min(1, v.alpha + dt * 3);
    const arrived = stepToward(v.convo.meet.x, v.convo.meet.y);
    if (arrived) {
      v.moving = false;
      const fx = v.convo.focus.x - v.x;
      const fy = v.convo.focus.y - v.y;
      if (Math.abs(fx) > Math.abs(fy)) v.dir = fx < 0 ? 'left' : 'right';
      else v.dir = fy < 0 ? 'up' : 'down';
    } else {
      v.moving = true;
    }
  } else if (v.state === 'working') {
    // walk to the building the live session mapped to, then stop, face it, and
    // pop a little activity label ("read" / "forge" / "drill").
    v.alpha = Math.min(1, v.alpha + dt * 3);
    const arrived = stepToward(v.work.target.x, v.work.target.y);
    if (arrived) {
      v.moving = false;
      v.dir = 'up'; // the door/gate anchor sits just above the villager
      if (!v.speech || now > v.speech.until) {
        v.speech = { text: v.work.label, until: now + 1600 };
      }
    } else {
      v.moving = true;
    }
  } else if (v.state === 'returning') {
    v.moving = true;
    if (stepToward(v.target.x, v.target.y)) {
      v.dir = 'up';
      v.state = 'entering';
      v.enterTarget = { x: doorPoint.x, y: home.y + home.h - 6 };
    }
  } else if (v.state === 'entering') {
    v.moving = true;
    v.dir = 'up';
    const done = stepToward(v.enterTarget.x, v.enterTarget.y);
    v.alpha = Math.max(0, v.alpha - dt * 2.4);
    if (done || v.alpha <= 0) {
      v.alpha = 0;
      v.moving = false;
      v.state = 'inside';
    }
  } else {
    v.moving = false; // inside
  }

  // walk-cycle phase advances only while moving
  if (v.moving) v.walkPhase += dt * 8;

  // ---- z z Z sleep particles (only while inside + asleep) ----
  if (!active && v.state === 'inside') {
    if (now - v.lastZ > 900) {
      v.lastZ = now;
      v.zParticles.push({
        x: v.zAnchor.x + (Math.random() * 4 - 2),
        y: v.zAnchor.y,
        life: 0,
        ttl: 2.6,
        size: 5 + Math.floor(Math.random() * 3),
      });
    }
  }
  for (let i = v.zParticles.length - 1; i >= 0; i--) {
    const z = v.zParticles[i];
    z.life += dt;
    z.y -= dt * 10;
    z.x += Math.sin(z.life * 3) * dt * 4;
    if (z.life > z.ttl) v.zParticles.splice(i, 1);
  }
}

/**
 * The default banter used when a conversation doesn't carry its own `lines`.
 * Kept short — a pixel speech bubble has room for only a few characters.
 */
const DEFAULT_LINES = ['...', 'Hm.', 'Aye.', 'Indeed.'];

/**
 * ============================================================================
 * HOOK: pipeline conversations — the seam the brief asked to leave open.
 * ============================================================================
 * `convos` is an array of { id, participants:[agentId...], lines?:[string] }.
 * Feed it from the pipeline runner (see CamelotContext.startConversation): the
 * moment two or more agents are talking in a pipeline, their pixel villagers
 * walk toward a shared meeting spot, face each other, and pop speech bubbles.
 *
 * This function only assigns each participating villager a `convo` (a meeting
 * slot + focus point + lines) and advances its `speech` bubble once it arrives.
 * stepVillager() does the actual walking, and the scene draws the bubble at the
 * villager's live head position — so nothing here needs to know about pixels.
 *
 * Dormant by default: with an empty `convos` list this is a no-op, so wiring up
 * the real feature later is literally "start passing conversations in".
 *
 * `env.meetPoint` is the open-ground rally point (near the well); participants
 * are spread left↔right around it so they end up facing one another.
 */
export function updateConversations(villagers, convos, now, env) {
  const byId = new Map(villagers.map((v) => [v.id, v]));
  const assigned = new Set();

  for (const convo of convos || []) {
    // Only villagers that are actually out of their house can converse.
    const parts = (convo.participants || [])
      .map((id) => byId.get(id))
      .filter((v) => v && v.alpha > 0.5 && v.state !== 'inside' && v.state !== 'entering');
    if (parts.length < 2) continue;

    const focus = env.meetPoint;
    const lines = convo.lines && convo.lines.length ? convo.lines : DEFAULT_LINES;
    const n = parts.length;
    const spacing = 26;

    parts.forEach((v, i) => {
      const off = (i - (n - 1) / 2) * spacing; // centered spread
      v.convo = {
        convoId: convo.id,
        meet: { x: focus.x + off, y: focus.y },
        focus,
        lines,
      };
      assigned.add(v.id);

      // Once they've basically reached their slot, cycle a speech bubble.
      const near = Math.abs(v.x - v.convo.meet.x) < 8 && Math.abs(v.y - v.convo.meet.y) < 10;
      if (near) {
        if (!v.speech || now > v.speech.until) {
          const text = lines[v._line % lines.length];
          v._line += 1;
          // stagger partners slightly so they don't all "talk" on the same beat
          v.speech = { text, until: now + 1800 + (i % 2) * 700 };
        }
      } else {
        v.speech = null;
      }
    });
  }

  // Anyone previously conversing but no longer in a convo → release to wander.
  for (const v of villagers) {
    if (!assigned.has(v.id) && v.convo) {
      v.convo = null;
      v.speech = null;
    }
  }
}

/** Short bubble word shown over a knight working at each building. */
const ACTIVITY_LABEL = { library: 'read', forge: 'forge', arena: 'drill' };

/**
 * ============================================================================
 * Live-activity pathing — the Village half of the Agent-Quest-style dashboard.
 * ============================================================================
 * `activities` is the ephemeral map from CamelotContext, keyed by seat/agent id:
 *   { [agentId]: { activity: 'library'|'forge'|'arena'|'idle', ... } }
 * `anchors` maps an activity to the world point a villager should stand at to
 * "work" there (each building's door/gate threshold), supplied by the scene:
 *   { library:{x,y}, forge:{x,y}, arena:{x,y} }
 *
 * We only send a knight to a building if it is actually out of its house and not
 * mid-conversation (a pipeline chat wins). 'idle' — or any activity with no
 * matching building anchor — clears `work`, so the knight simply wanders. Like
 * updateConversations(), this only assigns intent; stepVillager() walks them and
 * the scene draws the bubble, so nothing here touches pixels.
 *
 * Dormant by default: an empty `activities` map is a no-op.
 */
export function updateActivities(villagers, activities, anchors) {
  const acts = activities || {};
  const at = anchors || {};
  for (const v of villagers) {
    const entry = acts[v.id];
    const activity = entry && entry.activity;
    const anchor = activity ? at[activity] : null;
    const canWork =
      anchor && v.alpha > 0.5 && v.state !== 'inside' && v.state !== 'entering' && !v.convo;
    v.work = canWork
      ? { activity, target: anchor, label: ACTIVITY_LABEL[activity] || activity }
      : null;
  }
}
