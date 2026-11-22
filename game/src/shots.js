// Screenshot staging: deterministic scenes for ?shot=1..4.
// Each shot is a real render of the game's own code at a fixed tick —
// the cover (shot 1) is an action frame, never a title screen.
import { JOBS, LOOT_VALUE } from './config.js';
import { clamp } from './random.js';

export function applyShot(state, shot) {
  const { world, thief } = state;
  state.time = 6.4; // fixed clock so lamp glints and cones are identical every run
  if (shot === '1') {
    // COVER — the grab: thief at the Sapphire pedestal, vault open, a guard
    // cone sweeping in, a camera cone crossing, alarm rising, loot half full.
    world.vaultOpen = true;
    world.sapphireTaken = false;
    thief.x = 640; thief.y = 196; thief.angle = -Math.PI / 2;
    thief.gadgets = { smoke: 2, pebble: 3, lockpick: 1 };
    takeLoot(world, state, ['coin', 'coin', 'coin', 'coin', 'coin', 'coin',
      'relic', 'relic', 'relic', 'relic', 'gem', 'gem']);
    state.lootTaken = 12;
    state.lootValue = 6 * 120 + 4 * 450 + 2 * 900;
    state.alarm = 34;
    state.ghost = 82;
    state.jobIndex = 3; state.job = JOBS[3];
    state.route = ['ENTRY', 'JOB 2', 'JOB 3', 'JOB 4'];
    // A guard closing on the vault, mid-sweep; a camera aimed at the door.
    const g = world.guards[4]; // ORIN
    g.x = 560; g.y = 300; g.angle = -Math.PI / 2; g.suspicion = 61; g.state = 'patrol';
    const g2 = world.guards[0]; // MARLOW
    g2.x = 760; g2.y = 320; g2.angle = Math.PI; g2.suspicion = 24;
    world.cameras[0].angle = Math.PI / 2 + 0.4;
    world.cameras[0].suspicion = 42;
    // One lamp doused near the vault for the dark-floor story.
    world.lamps[4].lit = false;
    state.lampsDoused = 1;
    state.toast = 'JOB 4 — STAR SAPPHIRE — take it and run!';
    state.toastT = 1;
  } else if (shot === '2') {
    // STEALTH CORRIDOR — thief crouched behind a case, two cones crossing,
    // a suspicion ring building on the nearest guard.
    thief.x = 330; thief.y = 600; thief.angle = Math.PI; thief.sneaking = true;
    thief.gadgets = { smoke: 3, pebble: 5, lockpick: 0 };
    takeLoot(world, state, ['coin', 'coin', 'coin', 'relic', 'relic']);
    state.lootTaken = 5;
    state.lootValue = 3 * 120 + 2 * 450;
    state.alarm = 12;
    state.ghost = 100;
    state.jobIndex = 1; state.job = JOBS[1];
    state.route = ['ENTRY', 'JOB 2'];
    const g = world.guards[3]; // SABLE
    g.x = 560; g.y = 520; g.angle = Math.PI; g.suspicion = 47;
    const g2 = world.guards[5]; // WREN
    g2.x = 700; g2.y = 620; g2.angle = 0; g2.suspicion = 8;
    world.cameras[3].angle = -Math.PI / 2 + 0.3;
    world.lamps[5].lit = false;
    state.lampsDoused = 1;
    state.toast = 'Sneak — dark floor and cover break the cones';
    state.toastT = 1;
  } else if (shot === '3') {
    // VAULT CRACK — lockpick channel at the vault door, smoke cloud cover,
    // a pebble lure pulling a guard away.
    thief.x = 640; thief.y = 122; thief.angle = -Math.PI / 2;
    thief.gadgets = { smoke: 2, pebble: 4, lockpick: 1 };
    world.lockpick.taken = true;
    world.vaultProgress = 0.62;
    takeLoot(world, state, ['coin', 'coin', 'coin', 'coin', 'relic', 'relic', 'relic', 'gem']);
    state.lootTaken = 8;
    state.lootValue = 4 * 120 + 3 * 450 + 900;
    state.alarm = 21;
    state.ghost = 91;
    state.jobIndex = 2; state.job = JOBS[2];
    state.route = ['ENTRY', 'JOB 2', 'JOB 3'];
    world.smoke.push({ x: 700, y: 200, r: 90, t: 4 });
    world.lure = { x: 900, y: 200 };
    const g = world.guards[1]; // IVY, pulled toward the lure
    g.x = 820; g.y = 220; g.angle = 0; g.suspicion = 12; g.state = 'investigate';
    g.investigate = { x: 900, y: 200 };
    world.cameras[1].angle = 0.5;
    state.toast = 'Cracking the vault — hold E, stay in the smoke';
    state.toastT = 1;
  } else if (shot === '4') {
    // DEBRIEF — the getaway pays off: route replay + stats panel.
    world.vaultOpen = true;
    world.sapphireTaken = true;
    for (const l of world.loot) l.taken = true;
    state.lootTaken = 21;
    state.lootValue = 12 * 120 + 6 * 450 + 2 * 900 + 5000;
    state.alarm = 58;
    state.ghost = 82;
    state.spots = 1;
    state.everSpotted = true;
    state.lampsDoused = 3;
    state.usedSmoke = 1;
    state.usedPebble = 2;
    state.time = 214;
    state.jobIndex = 4; state.job = JOBS[4];
    state.route = ['ENTRY', 'JOB 2', 'JOB 3', 'JOB 4', 'JOB 5', 'EXIT'];
    thief.x = 640; thief.y = 668; thief.angle = Math.PI / 2;
    state.screen = 'win';
  }
}

// Take the first N loot items of the given tiers (deterministic order).
function takeLoot(world, state, tiers) {
  for (const tier of tiers) {
    const l = world.loot.find((x) => !x.taken && x.tier === tier);
    if (l) l.taken = true;
  }
}
