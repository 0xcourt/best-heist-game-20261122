// Guards and cameras: patrol, suspicion, chase, investigate, alarm.
// A caught moment is fair: suspicion builds visibly (rings + HUD) before a
// guard ever commits, and a spotted guard shouts before it runs.
import {
  GUARD_SPEED, GUARD_CHASE, GUARD_VIEW_RANGE, GUARD_VIEW_HALF,
  CAMERA_RANGE, CAMERA_HALF, ALARM_MAX, SPOT_ALARM,
} from './config.js';
import { coneExposure, hasLineOfSight } from './vision.js';
import { clamp, angleDiff, dist } from './random.js';
import { inSmoke, isLit, collideCircle } from './world.js';

export function updateGuards(world, thief, dt, events) {
  for (const g of world.guards) {
    const wasSpotted = g.suspicion >= 100;
    // --- Vision: exposure from the thief's position.
    let exposure = 0;
    if (!inSmoke(world, thief.x, thief.y) && !thief.hidden) {
      exposure = coneExposure(g.x, g.y, g.angle, GUARD_VIEW_HALF, GUARD_VIEW_RANGE,
        thief.x, thief.y, world.blockers);
    }
    // Sneaking halves the spot rate; dark floor halves it again.
    let rate = exposure * 95;
    if (thief.sneaking) rate *= 0.45;
    if (!isLit(world, thief.x, thief.y)) rate *= 0.5;
    if (world.lockdownT > 0) rate *= 1.25;
    g.suspicion = clamp(g.suspicion + rate * dt - 14 * dt, 0, 100);
    if (g.suspicion >= 100 && !wasSpotted) {
      g.state = 'chase';
      g.chaseT = 4;
      events.push({ type: 'spotted', x: g.x, y: g.y, name: g.name });
    }

    // --- Movement by state.
    if (g.state === 'chase') {
      g.chaseT -= dt;
      moveToward(world, g, thief.x, thief.y, GUARD_CHASE, dt);
      g.angle = Math.atan2(thief.y - g.y, thief.x - g.x);
      if (g.chaseT <= 0) {
        g.state = 'investigate';
        g.investigate = { x: thief.x, y: thief.y };
      }
      if (dist(g.x, g.y, thief.x, thief.y) < 30) {
        events.push({ type: 'caught', x: thief.x, y: thief.y, name: g.name });
      }
    } else if (g.state === 'investigate') {
      const t = g.investigate;
      if (t && dist(g.x, g.y, t.x, t.y) > 12) {
        moveToward(world, g, t.x, t.y, GUARD_SPEED * 1.25, dt);
        g.angle = Math.atan2(t.y - g.y, t.x - g.x);
      } else {
        g.wait += dt;
        if (g.wait > 2.2) { g.state = 'patrol'; g.wait = 0; }
      }
    } else {
      // Patrol: walk the loop, pause at each waypoint, look along the path.
      const target = g.waypoints[g.wp];
      if (g.wait > 0) {
        g.wait -= dt;
        if (g.wait <= 0) {
          g.wp = (g.wp + 1) % g.waypoints.length;
        }
      } else if (dist(g.x, g.y, target[0], target[1]) < 8) {
        g.wait = g.pause;
      } else {
        const speed = world.lockdownT > 0 ? GUARD_SPEED * 1.3 : GUARD_SPEED;
        moveToward(world, g, target[0], target[1], speed, dt);
        g.angle = Math.atan2(target[1] - g.y, target[0] - g.x);
      }
      // A pebble lure pulls the nearest patrolling guard off its route.
      if (world.lure && g.state === 'patrol') {
        const ld = dist(g.x, g.y, world.lure.x, world.lure.y);
        if (ld < 320) {
          g.state = 'investigate';
          g.investigate = { x: world.lure.x, y: world.lure.y };
        }
      }
    }
    // Suspicion decays while the thief is out of sight.
    if (exposure === 0 && g.suspicion > 0 && g.state === 'patrol') {
      g.suspicion = Math.max(0, g.suspicion - 22 * dt);
    }
  }
  world.lure = null;
}

function moveToward(world, g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const step = Math.min(d, speed * dt);
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  collideCircle(world, g, 13);
}

export function updateCameras(world, thief, dt, time, events) {
  for (const c of world.cameras) {
    // Sweep: sine ease, so the cone lingers at each end (readable timing).
    c.angle = c.base + Math.sin(time * c.speed) * c.sweep;
    let exposure = 0;
    if (!inSmoke(world, thief.x, thief.y) && !thief.hidden) {
      exposure = coneExposure(c.x, c.y, c.angle, CAMERA_HALF, CAMERA_RANGE,
        thief.x, thief.y, world.blockers);
    }
    let rate = exposure * 70;
    if (thief.sneaking) rate *= 0.5;
    if (!isLit(world, thief.x, thief.y)) rate *= 0.6;
    const before = c.suspicion;
    c.suspicion = clamp(c.suspicion + rate * dt - 10 * dt, 0, 100);
    if (c.suspicion >= 100 && before < 100) {
      events.push({ type: 'camera-spot', x: c.x, y: c.y, name: c.name });
    }
  }
}

// Alarm: rises on spots, decays slowly; at max, lockdown.
export function updateAlarm(state, dt, events) {
  let alarm = state.alarm;
  for (const e of events) {
    if (e.type === 'spotted' || e.type === 'camera-spot') alarm += SPOT_ALARM;
    if (e.type === 'sapphire') alarm += 18;
  }
  alarm = clamp(alarm - 1.6 * dt, 0, ALARM_MAX);
  if (alarm >= ALARM_MAX && state.world.lockdownT <= 0) {
    state.world.lockdownT = 12;
    events.push({ type: 'lockdown', x: 640, y: 380 });
  }
  if (state.world.lockdownT > 0) state.world.lockdownT -= dt;
  state.alarm = alarm;
  // Ghost rating: 100 while nobody ever spotted the thief.
  if (state.everSpotted) state.ghost = Math.max(0, state.ghost - 0);
  else state.ghost = 100;
}
