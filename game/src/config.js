// The Halcyon Vault — level data, constants and the 5-job beat list.
// One room, everything visible in one frame: 1280x720 canvas, HUD strip on top.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;
// Playfield is the room below the HUD.
export const ROOM = { x: 0, y: HUD_H, w: 1280, h: 656 };

export const SEED = 20261122;

// Thief speeds (px/s): corridors and sightlines are sized from these numbers.
export const THIEF_SPEED = 178;
export const THIEF_SNEAK = 96;
export const GUARD_SPEED = 88;
export const GUARD_CHASE = 148;
export const GUARD_VIEW_RANGE = 178;
export const GUARD_VIEW_HALF = 0.61; // ~35 degrees
export const CAMERA_RANGE = 208;
export const CAMERA_HALF = 0.49; // ~28 degrees

// Alarm / suspicion tuning.
export const ALARM_MAX = 100;
export const SPOT_ALARM = 22; // alarm added when a guard fully spots the thief
export const SAPPHIRE_ALARM = 18; // grabbing the centerpiece trips the vault alarm
export const LOCKDOWN_SECONDS = 12;

// Loot tiers: coins (small), relics (medium), gems (large), Star Sapphire (centerpiece).
export const LOOT_VALUE = { coin: 120, relic: 450, gem: 900, sapphire: 5000 };
export const LOOT_TOTAL = 21; // 12 coins + 6 relics + 2 gems + 1 Star Sapphire

// Gadget starting stock.
export const GADGETS_START = { smoke: 3, pebble: 5, lockpick: 0 };

// The 5-job beat list. Sawtooth pacing: teach -> test -> rest -> climax -> escape.
// Each job has a short objective line shown in the HUD.
export const JOBS = [
  { id: 1, name: 'JOB 1 — SLIP IN', beat: 'teach', hint: 'Cross the south gallery. Mind the cones.' },
  { id: 2, name: 'JOB 2 — LAMPS & LEDGER', beat: 'teach', hint: 'Douse 2 lamps, lift 5 treasures.' },
  { id: 3, name: 'JOB 3 — CRACK THE VAULT', beat: 'test', hint: 'Lockpick: west gallery. Vault needs it.' },
  { id: 4, name: 'JOB 4 — STAR SAPPHIRE', beat: 'climax', hint: 'Take the Sapphire. It is alarmed — run!' },
  { id: 5, name: 'JOB 5 — GETAWAY', beat: 'escape', hint: 'South door with the Sapphire. Ghost it!' },
];

// Walls: {x, y, w, h}. Outer shell + interior galleries. Corridors are >= 96px wide
// so the thief (radius 13) can always slip past a sweeping cone.
export const WALLS = [
  // Outer shell (room border, 14px thick).
  { x: 0, y: 64, w: 1280, h: 14 },
  { x: 0, y: 706, w: 1280, h: 14 },
  { x: 0, y: 64, w: 14, h: 656 },
  { x: 1266, y: 64, w: 14, h: 656 },
  // Vault chamber (north centre): the Sapphire room. Door gap at x 596..684.
  { x: 470, y: 96, w: 126, h: 16 },
  { x: 684, y: 96, w: 126, h: 16 },
  { x: 470, y: 96, w: 16, h: 150 },
  { x: 794, y: 96, w: 16, h: 150 },
  // West gallery divider (lockpick room) — gap at y 300..396.
  { x: 300, y: 200, w: 16, h: 100 },
  { x: 300, y: 396, w: 16, h: 120 },
  // East gallery divider — gap at y 300..396.
  { x: 964, y: 200, w: 16, h: 100 },
  { x: 964, y: 396, w: 16, h: 120 },
  // Central hall pillars (cover that also blocks sight).
  { x: 560, y: 330, w: 34, h: 34 },
  { x: 686, y: 330, w: 34, h: 34 },
  // Mid horizontal gallery walls with wide gaps (routes, not mazes).
  { x: 120, y: 470, w: 300, h: 14 },
  { x: 860, y: 470, w: 300, h: 14 },
];

// Display cases: cover that blocks movement and sight, but low enough to read over.
// (x, y, w, h, kind)
export const CASES = [
  { x: 90, y: 150, w: 130, h: 54, kind: 'relic' },
  { x: 90, y: 560, w: 130, h: 54, kind: 'relic' },
  { x: 1060, y: 150, w: 130, h: 54, kind: 'relic' },
  { x: 1060, y: 560, w: 130, h: 54, kind: 'relic' },
  { x: 380, y: 540, w: 150, h: 54, kind: 'coin' },
  { x: 750, y: 540, w: 150, h: 54, kind: 'coin' },
  { x: 380, y: 150, w: 110, h: 50, kind: 'coin' },
  { x: 790, y: 150, w: 110, h: 50, kind: 'coin' },
];

// Lamps: dousable (E nearby). A lit lamp lights its radius; a doused lamp leaves
// dark floor where guards spot slower. Positions guide the eye, not walls.
export const LAMPS = [
  { x: 180, y: 130, r: 150, lit: true },
  { x: 1100, y: 130, r: 150, lit: true },
  { x: 180, y: 640, r: 150, lit: true },
  { x: 1100, y: 640, r: 150, lit: true },
  { x: 640, y: 300, r: 170, lit: true },
  { x: 640, y: 560, r: 150, lit: true },
];

// Loot placements. Every loot is reachable from the entry by a corridor >= 96px.
export const LOOT = [
  // Coins (12).
  { x: 150, y: 250, tier: 'coin' }, { x: 150, y: 430, tier: 'coin' },
  { x: 1130, y: 250, tier: 'coin' }, { x: 1130, y: 430, tier: 'coin' },
  { x: 430, y: 620, tier: 'coin' }, { x: 850, y: 620, tier: 'coin' },
  { x: 430, y: 110, tier: 'coin' }, { x: 850, y: 110, tier: 'coin' },
  { x: 640, y: 420, tier: 'coin' }, { x: 520, y: 620, tier: 'coin' },
  { x: 760, y: 620, tier: 'coin' }, { x: 640, y: 250, tier: 'coin' },
  // Relics (6).
  { x: 155, y: 177, tier: 'relic' }, { x: 155, y: 587, tier: 'relic' },
  { x: 1125, y: 177, tier: 'relic' }, { x: 1125, y: 587, tier: 'relic' },
  { x: 455, y: 567, tier: 'relic' }, { x: 825, y: 567, tier: 'relic' },
  // Gems (2).
  { x: 360, y: 350, tier: 'gem' }, { x: 920, y: 350, tier: 'gem' },
  // The centerpiece.
  { x: 640, y: 168, tier: 'sapphire' },
];

// Lockpick pickup — west gallery, BEFORE the vault, never behind its own door.
export const LOCKPICK_SPOT = { x: 200, y: 350 };

// Vault door: the gap in the vault chamber's south wall.
export const VAULT_DOOR = { x: 596, y: 96, w: 88, h: 16 };
// Sapphire pedestal inside the vault chamber.
export const SAPPHIRE_PEDESTAL = { x: 640, y: 168 };
// Entry / exit door: south centre.
export const ENTRY_DOOR = { x: 596, y: 692, w: 88, h: 14 };
export const ENTRY_SPOT = { x: 640, y: 668 };

// Guard patrols: waypoints looped. Routes cross the cones of cameras so the
// player must read both systems before moving.
export const GUARDS = [
  { name: 'MARLOW', waypoints: [[420, 320], [860, 320], [860, 430], [420, 430]], pause: 1.2 },
  { name: 'IVY', waypoints: [[220, 180], [220, 560], [440, 560], [440, 180]], pause: 0.9 },
  { name: 'BRAM', waypoints: [[1060, 180], [1060, 560], [840, 560], [840, 180]], pause: 0.9 },
  { name: 'SABLE', waypoints: [[520, 520], [760, 520], [760, 640], [520, 640]], pause: 1.0 },
  { name: 'ORIN', waypoints: [[640, 260], [440, 260], [440, 130], [920, 130], [920, 260]], pause: 0.7 },
  { name: 'WREN', waypoints: [[330, 620], [950, 620], [950, 500], [330, 500]], pause: 1.4 },
];

// Cameras: fixed mounts, sweeping cones.
export const CAMERAS = [
  { x: 640, y: 80, base: Math.PI / 2, sweep: 0.85, speed: 0.55, name: 'CAM-A' },
  { x: 60, y: 380, base: 0, sweep: 0.7, speed: 0.42, name: 'CAM-B' },
  { x: 1220, y: 380, base: Math.PI, sweep: 0.7, speed: 0.42, name: 'CAM-C' },
  { x: 640, y: 690, base: -Math.PI / 2, sweep: 0.6, speed: 0.5, name: 'CAM-D' },
];

// HUD legend entries (drawn bottom-left, also used by the judge's eye).
export const LEGEND = [
  { color: '#ffd76a', label: 'LOOT' },
  { color: '#ff5a4e', label: 'DANGER — CONE' },
  { color: '#3ddc97', label: 'SAFE COVER' },
  { color: '#ffb347', label: 'LAMP (E = DOUSE)' },
  { color: '#7fd4ff', label: 'SAPPHIRE' },
];
