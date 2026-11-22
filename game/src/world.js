// World: builds the room from config, moves the thief, and proves the level
// is beatable (reachability check) before the first frame is drawn.
import {
  WALLS, CASES, LAMPS, LOOT, GUARDS, CAMERAS, LOCKPICK_SPOT,
  VAULT_DOOR, ENTRY_DOOR, ENTRY_SPOT, SEED,
} from './config.js';
import { mulberry32 } from './random.js';

// All sight/movement blockers: walls + display cases.
export function buildBlockers() {
  return WALLS.concat(CASES.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })));
}

export function buildWorld() {
  const rng = mulberry32(SEED);
  return {
    rng,
    blockers: buildBlockers(),
    walls: WALLS,
    cases: CASES.map((c) => ({ ...c })),
    lamps: LAMPS.map((l) => ({ ...l })),
    loot: LOOT.map((l, i) => ({ ...l, id: i, taken: false, bob: rng() * Math.PI * 2 })),
    guards: GUARDS.map((g, i) => ({
      name: g.name, waypoints: g.waypoints, pause: g.pause,
      x: g.waypoints[0][0], y: g.waypoints[0][1],
      wp: 1, wait: 0, angle: Math.PI / 2, suspicion: 0,
      state: 'patrol', chaseT: 0, investigate: null, id: i,
    })),
    cameras: CAMERAS.map((c) => ({ ...c, angle: c.base, suspicion: 0 })),
    lockpick: { ...LOCKPICK_SPOT, taken: false },
    vaultOpen: false,
    vaultProgress: 0,
    sapphireTaken: false,
    lockdownT: 0,
    smoke: [], // {x, y, r, t}
    pebbles: [], // {x, y, tx, ty, t, landed}
  };
}

// Circle vs rect collision resolve: push the circle out of every blocker.
export function collideCircle(world, p, radius) {
  for (const r of world.blockers) {
    const cx = Math.max(r.x, Math.min(p.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(p.y, r.y + r.h));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 1e-6) { p.y = r.y - radius; continue; }
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * radius;
      p.y = cy + (dy / d) * radius;
    }
  }
  // Keep inside the room shell.
  p.x = Math.max(16 + radius, Math.min(1264 - radius, p.x));
  p.y = Math.max(80 + radius, Math.min(704 - radius, p.y));
}

// Is a point inside a smoke cloud (vision blocked)?
export function inSmoke(world, x, y) {
  for (const s of world.smoke) {
    if (Math.hypot(x - s.x, y - s.y) < s.r) return true;
  }
  return false;
}

// Is a point lit by any lit lamp? Dark floor slows guard spotting.
export function isLit(world, x, y) {
  for (const l of world.lamps) {
    if (!l.lit) continue;
    if (Math.hypot(x - l.x, y - l.y) < l.r) return true;
  }
  return false;
}

// Reachability check (grid BFS from the entry): every loot, the lockpick,
// the vault door and the exit must be reachable, and the exit must stay
// reachable from everywhere after lockdown (no door ever seals the room).
// Runs once at build; returns { ok, unreachable }.
export function checkReachability(world) {
  const CELL = 16;
  const cols = Math.ceil(1280 / CELL);
  const rows = Math.ceil(720 / CELL);
  const blocked = new Uint8Array(cols * rows);
  for (const r of world.blockers) {
    const x0 = Math.max(0, Math.floor(r.x / CELL));
    const x1 = Math.min(cols - 1, Math.floor((r.x + r.w) / CELL));
    const y0 = Math.max(0, Math.floor(r.y / CELL));
    const y1 = Math.min(rows - 1, Math.floor((r.y + r.h) / CELL));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) blocked[y * cols + x] = 1;
    }
  }
  // The vault door gap and the entry gap are walkable in the BFS grid.
  const carve = (r) => {
    const x0 = Math.max(0, Math.floor(r.x / CELL));
    const x1 = Math.min(cols - 1, Math.floor((r.x + r.w) / CELL));
    const y0 = Math.max(0, Math.floor(r.y / CELL));
    const y1 = Math.min(rows - 1, Math.floor((r.y + r.h) / CELL));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) blocked[y * cols + x] = 0;
    }
  };
  carve(VAULT_DOOR);
  carve(ENTRY_DOOR);
  const start = { x: Math.floor(ENTRY_SPOT.x / CELL), y: Math.floor(ENTRY_SPOT.y / CELL) };
  const seen = new Uint8Array(cols * rows);
  const queue = [start];
  seen[start.y * cols + start.x] = 1;
  while (queue.length) {
    const c = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const k = ny * cols + nx;
      if (seen[k] || blocked[k]) continue;
      seen[k] = 1;
      queue.push({ x: nx, y: ny });
    }
  }
  const near = (x, y) => {
    // Reachable if any cell within 48px of the point is seen — the thief
    // grabs loot from 44px away, so a treasure sitting on a display case
    // counts as reachable when its case can be approached.
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const cx = Math.floor(x / CELL) + dx;
        const cy = Math.floor(y / CELL) + dy;
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
        if (seen[cy * cols + cx]) return true;
      }
    }
    return false;
  };
  const targets = world.loot.map((l) => ({ label: `loot ${l.tier} #${l.id}`, x: l.x, y: l.y }));
  targets.push({ label: 'lockpick', x: world.lockpick.x, y: world.lockpick.y });
  targets.push({ label: 'vault door', x: VAULT_DOOR.x + VAULT_DOOR.w / 2, y: VAULT_DOOR.y + 30 });
  targets.push({ label: 'exit', x: ENTRY_SPOT.x, y: ENTRY_SPOT.y });
  const unreachable = targets.filter((t) => !near(t.x, t.y)).map((t) => t.label);
  return { ok: unreachable.length === 0, unreachable };
}
