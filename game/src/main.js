// Main: game loop, input, jobs, interactions, win/caught states.
// Fixed timestep (1/60) + seeded RNG = deterministic: two runs render
// byte-identical frames. Real time is used only for shake decay and UI pulse.
import {
  VIEW_W, VIEW_H, THIEF_SPEED, THIEF_SNEAK, LOOT_VALUE, LOOT_TOTAL,
  JOBS, ENTRY_SPOT, VAULT_DOOR, SAPPHIRE_PEDESTAL, SEED, ALARM_MAX,
} from './config.js';
import { buildWorld, collideCircle, inSmoke, checkReachability } from './world.js';
import { updateGuards, updateCameras, updateAlarm } from './guards.js';
import { createFeel, feedback, updateFeel } from './feel.js';
import {
  createAudio, ensureAudio, setMusicLevel, sfxStep, sfxPickup,
  sfxAlarmTick, sfxSpotted, sfxVault, sfxClick, sfxWin, setMasterVolume,
} from './audio.js';
import { drawGame } from './render.js';
import { applyShot } from './shots.js';
import { clamp, dist } from './random.js';

const STEP = 1 / 60;

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const world = buildWorld();
  const reach = checkReachability(world);
  const state = {
    canvas, ctx, world,
    screen: 'title', // title | playing | paused | caught | win
    time: 0, tick: 0,
    alarm: 0, ghost: 100, everSpotted: false, spots: 0,
    lootValue: 0, lootTaken: 0,
    lampsDoused: 0, usedSmoke: 0, usedPebble: 0,
    jobIndex: 0, job: JOBS[0],
    route: ['ENTRY'],
    caughtBy: '',
    toast: '', toastT: 0,
    feel: createFeel(),
    audio: createAudio(),
    settings: { shakePct: 100, reduceFlash: false, muted: false },
    thief: {
      x: ENTRY_SPOT.x, y: ENTRY_SPOT.y, angle: -Math.PI / 2,
      sneaking: false, hidden: false,
      gadgets: { smoke: 3, pebble: 5, lockpick: 0 },
      stepT: 0, vaultChannel: 0,
    },
    keys: {},
    mouse: { x: 640, y: 360, down: false },
    reachability: reach,
    lastAlarmTick: 0,
  };
  return state;
}

export function startGame(state) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    // Screenshot mode: deterministic staged scene, drawn once and frozen.
    // No simulation steps run after staging, so the frame is identical
    // on every run and no guard can spot the staged thief mid-shot.
    state.screen = 'playing';
    applyShot(state, shot);
    drawGame(state.ctx, state);
    return; // no loop: the frame is frozen and byte-identical across runs
  }
  let acc = 0;
  let last = performance.now();
  function frame(now) {
    const dtReal = Math.min(0.1, (now - last) / 1000);
    last = now;
    updateFeel(state.feel, dtReal, state.settings);
    if (state.feel.hitStop > 0) { requestAnimationFrame(frame); return; }
    acc += dtReal;
    let n = 0;
    while (acc >= STEP && n < 5) { step(state, STEP); acc -= STEP; n++; }
    drawGame(state.ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function step(state, dt) {
  state.tick++;
  if (state.screen !== 'playing') {
    // Guards still patrol behind the title screen (attract mode).
    if (state.screen === 'title') {
      state.time += dt;
      const events = [];
      updateGuards(state.world, { x: -9999, y: -9999, sneaking: false, hidden: true }, dt, events);
      updateCameras(state.world, { x: -9999, y: -9999, sneaking: false, hidden: true }, dt, state.time, events);
    }
    return;
  }
  state.time += dt;
  const { world, thief } = state;

  // --- Thief movement.
  let mx = 0; let my = 0;
  const k = state.keys;
  if (k['arrowup'] || k['w']) my -= 1;
  if (k['arrowdown'] || k['s']) my += 1;
  if (k['arrowleft'] || k['a']) mx -= 1;
  if (k['arrowright'] || k['d']) mx += 1;
  thief.sneaking = !!k['shift'];
  const speed = thief.sneaking ? THIEF_SNEAK : THIEF_SPEED;
  if (mx || my) {
    const len = Math.hypot(mx, my);
    thief.x += (mx / len) * speed * dt;
    thief.y += (my / len) * speed * dt;
    thief.angle = Math.atan2(my, mx);
    thief.stepT -= dt;
    if (thief.stepT <= 0) {
      thief.stepT = thief.sneaking ? 0.45 : 0.32;
      feedback(state.feel, 'small', { x: thief.x, y: thief.y }, { particles: 0 });
      sfxStep(state.audio, thief.sneaking);
    }
  }
  collideCircle(world, thief, 13);

  // --- Smoke / pebble lifetimes.
  for (const s of world.smoke) s.t -= dt;
  world.smoke = world.smoke.filter((s) => s.t > 0);
  for (const p of world.pebbles) {
    if (!p.landed) {
      p.t -= dt;
      const dx = p.tx - p.x; const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = 520 * dt;
      if (d <= stepLen || p.t <= 0) {
        p.x = p.tx; p.y = p.ty; p.landed = true;
        world.lure = { x: p.x, y: p.y };
        feedback(state.feel, 'small', { x: p.x, y: p.y }, { particles: 4, colors: ['#c9cfe8', '#8a93b8'] });
      } else {
        p.x += (dx / d) * stepLen;
        p.y += (dy / d) * stepLen;
      }
    }
  }
  world.pebbles = world.pebbles.filter((p) => p.t > -0.01 || !p.landed);

  // --- Guards, cameras, alarm.
  const events = [];
  updateGuards(world, thief, dt, events);
  updateCameras(world, thief, dt, state.time, events);
  updateAlarm(state, dt, events);
  // Landed pebbles are consumed once guards have read the lure.
  world.pebbles = world.pebbles.filter((p) => !p.landed);
  for (const e of events) handleEvent(state, e);

  // --- Alarm tick sound + music level.
  const level = state.alarm >= 80 || world.lockdownT > 0 ? 2 : state.alarm >= 35 ? 1 : 0;
  setMusicLevel(state.audio, level);
  if (state.alarm > 50 && state.time - state.lastAlarmTick > 1) {
    state.lastAlarmTick = state.time;
    sfxAlarmTick(state.audio);
  }

  // --- Vault channel (hold E at the door with the lockpick).
  const nearVault = dist(thief.x, thief.y, VAULT_DOOR.x + VAULT_DOOR.w / 2, VAULT_DOOR.y + 8) < 46;
  if (nearVault && !world.vaultOpen && thief.gadgets.lockpick > 0 && k['e']) {
    world.vaultProgress += dt / 2.5;
    if (world.vaultProgress >= 1) {
      world.vaultOpen = true;
      feedback(state.feel, 'large', { x: 640, y: 110 }, { pop: 'VAULT OPEN', popColor: '#3ddc97' });
      sfxVault(state.audio);
      setToast(state, 'Vault open — the Sapphire is inside');
      advanceJob(state, 4);
    }
  } else if (!k['e']) {
    world.vaultProgress = Math.max(0, world.vaultProgress - dt * 0.5);
  }

  // --- Job progression.
  if (state.jobIndex === 0 && thief.y < 560) advanceJob(state, 2);
  if (state.jobIndex === 1 && state.lampsDoused >= 2 && state.lootTaken >= 5) advanceJob(state, 3);

  // --- Escape: reach the exit with the Sapphire.
  if (world.sapphireTaken && dist(thief.x, thief.y, ENTRY_SPOT.x, ENTRY_SPOT.y) < 34) {
    winGame(state);
  }

  // --- Toast decay.
  if (state.toastT > 0) state.toastT -= dt * 0.7;
}

function handleEvent(state, e) {
  if (e.type === 'spotted' || e.type === 'camera-spot') {
    state.everSpotted = true;
    state.spots++;
    state.ghost = Math.max(0, 100 - state.spots * 18);
    feedback(state.feel, 'medium', { x: e.x, y: e.y }, { pop: 'SPOTTED!', popColor: '#ff5a4e', flashColor: '#ff5a4e' });
    sfxSpotted(state.audio);
    setToast(state, `${e.name} spotted you — break line of sight!`);
  } else if (e.type === 'caught') {
    state.caughtBy = `${e.name} caught you in the open.`;
    feedback(state.feel, 'large', { x: state.thief.x, y: state.thief.y }, { pop: 'CAUGHT', popColor: '#ff5a4e', flashColor: '#ff5a4e' });
    state.screen = 'caught';
  } else if (e.type === 'lockdown') {
    feedback(state.feel, 'large', { x: 640, y: 380 }, { pop: 'LOCKDOWN', popColor: '#ff5a4e', flashColor: '#ff5a4e' });
    setToast(state, 'LOCKDOWN — guards are sweeping faster');
  }
}

function advanceJob(state, nextIndex) {
  if (nextIndex <= state.jobIndex) return;
  state.jobIndex = nextIndex - 1;
  state.job = JOBS[state.jobIndex];
  state.route.push(`JOB ${nextIndex}`);
  setToast(state, `${state.job.name} — ${state.job.hint}`);
  sfxClick(state.audio);
}

function winGame(state) {
  state.screen = 'win';
  state.route.push('EXIT');
  feedback(state.feel, 'large', { x: state.thief.x, y: state.thief.y }, { pop: 'CLEAN GETAWAY', popColor: '#3ddc97' });
  sfxWin(state.audio);
}

function setToast(state, text) {
  state.toast = text;
  state.toastT = 1;
}

// --- Interactions (E / Q / F / click) ---
export function interact(state) {
  const { world, thief } = state;
  if (state.screen !== 'playing') return;
  // Grab nearest loot.
  let best = null; let bestD = 44;
  for (const l of world.loot) {
    if (l.taken) continue;
    const d = dist(thief.x, thief.y, l.x, l.y);
    if (d < bestD) { best = l; bestD = d; }
  }
  if (best) {
    best.taken = true;
    state.lootTaken++;
    state.lootValue += LOOT_VALUE[best.tier];
    const tier = best.tier === 'sapphire' ? 'large' : best.tier === 'coin' ? 'small' : 'medium';
    feedback(state.feel, tier, { x: best.x, y: best.y }, {
      pop: best.tier === 'sapphire' ? '+$5,000 SAPPHIRE' : `+$${LOOT_VALUE[best.tier]}`,
      popColor: best.tier === 'sapphire' ? '#7fd4ff' : '#ffd76a',
    });
    sfxPickup(state.audio, best.tier);
    if (best.tier === 'sapphire') {
      world.sapphireTaken = true;
      state.alarm = clamp(state.alarm + 18, 0, ALARM_MAX);
      setToast(state, 'The Sapphire is alarmed — RUN for the south door!');
      advanceJob(state, 5);
    }
    return;
  }
  // Lockpick pickup (west gallery).
  if (!world.lockpick.taken && dist(thief.x, thief.y, world.lockpick.x, world.lockpick.y) < 44) {
    world.lockpick.taken = true;
    thief.gadgets.lockpick = 1;
    feedback(state.feel, 'medium', { x: world.lockpick.x, y: world.lockpick.y }, { pop: 'LOCKPICK', popColor: '#7fd4ff' });
    sfxPickup(state.audio, 'relic');
    setToast(state, 'Lockpick in hand — the vault door can be cracked');
    return;
  }
  // Douse nearest lit lamp.
  let lamp = null; let lampD = 52;
  for (const l of world.lamps) {
    if (!l.lit) continue;
    const d = dist(thief.x, thief.y, l.x, l.y);
    if (d < lampD) { lamp = l; lampD = d; }
  }
  if (lamp) {
    lamp.lit = false;
    state.lampsDoused++;
    feedback(state.feel, 'small', { x: lamp.x, y: lamp.y }, { particles: 6, colors: ['#ffb347', '#8a93b8'] });
    setToast(state, `Lamp doused (${state.lampsDoused}) — dark floor hides you`);
  }
}

export function useSmoke(state) {
  const { thief, world } = state;
  if (state.screen !== 'playing' || thief.gadgets.smoke <= 0) return;
  thief.gadgets.smoke--;
  state.usedSmoke++;
  world.smoke.push({ x: thief.x, y: thief.y, r: 90, t: 6 });
  feedback(state.feel, 'medium', { x: thief.x, y: thief.y }, { particles: 14, colors: ['#c9cfe8', '#ffffff', '#8a93b8'] });
  setToast(state, 'Smoke vial — cones cannot see through it');
}

export function throwPebble(state, tx, ty) {
  const { thief, world } = state;
  if (state.screen !== 'playing' || thief.gadgets.pebble <= 0) return;
  thief.gadgets.pebble--;
  state.usedPebble++;
  world.pebbles.push({ x: thief.x, y: thief.y, tx, ty, t: 1.2, landed: false });
  setToast(state, 'Pebble thrown — a guard will check the noise');
}

export function bindInput(state) {
  const canvas = state.canvas;
  const key = (e) => e.key.toLowerCase();
  window.addEventListener('keydown', (e) => {
    const k = key(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    state.keys[k] = true;
    if (k === 'enter' || k === ' ') {
      if (state.screen === 'title') { ensureAudio(state.audio); state.screen = 'playing'; sfxClick(state.audio); }
    }
    if (k === 'e') interact(state);
    if (k === 'q') useSmoke(state);
    if (k === 'f') throwPebble(state, state.mouse.x, state.mouse.y);
    if (k === 'p') {
      if (state.screen === 'playing') state.screen = 'paused';
      else if (state.screen === 'paused') state.screen = 'playing';
    }
    if (k === 'm') {
      state.settings.muted = !state.settings.muted;
      setMasterVolume(state.audio, state.settings.muted ? 0 : 1);
    }
    if (k === 'r' && (state.screen === 'caught' || state.screen === 'win')) {
      resetGame(state);
    }
  });
  window.addEventListener('keyup', (e) => { state.keys[key(e)] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = (e.clientX - r.left) * (VIEW_W / r.width);
    state.mouse.y = (e.clientY - r.top) * (VIEW_H / r.height);
  });
  canvas.addEventListener('click', (e) => {
    ensureAudio(state.audio);
    if (state.screen === 'title') { state.screen = 'playing'; sfxClick(state.audio); return; }
    if (state.screen === 'playing' && state.keys['f']) return; // F already threw
    if (state.screen === 'playing') throwPebble(state, state.mouse.x, state.mouse.y);
  });
  // Accessibility toggles (also clickable in the footer).
  const shakeBtn = document.getElementById('toggle-shake');
  if (shakeBtn) shakeBtn.addEventListener('click', () => {
    state.settings.shakePct = state.settings.shakePct === 100 ? 0 : 100;
    shakeBtn.textContent = `Shake: ${state.settings.shakePct}%`;
  });
  const flashBtn = document.getElementById('toggle-flash');
  if (flashBtn) flashBtn.addEventListener('click', () => {
    state.settings.reduceFlash = !state.settings.reduceFlash;
    flashBtn.textContent = `Reduce flashing: ${state.settings.reduceFlash ? 'ON' : 'OFF'}`;
  });
}

export function resetGame(state) {
  const fresh = createGame(state.canvas);
  // Keep the same canvas/ctx and input bindings; swap the simulation.
  state.world = fresh.world;
  state.screen = 'playing';
  state.time = 0; state.tick = 0;
  state.alarm = 0; state.ghost = 100; state.everSpotted = false; state.spots = 0;
  state.lootValue = 0; state.lootTaken = 0;
  state.lampsDoused = 0; state.usedSmoke = 0; state.usedPebble = 0;
  state.jobIndex = 0; state.job = JOBS[0];
  state.route = ['ENTRY'];
  state.thief = fresh.thief;
  state.feel = createFeel();
  setToast(state, 'JOB 1 — SLIP IN');
}
