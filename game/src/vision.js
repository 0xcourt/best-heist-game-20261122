// Raycast vision: cones, line-of-sight and lamp-light tests.
// Walls and display cases both block sight. All geometry is axis-aligned
// rectangles, so a ray test is a cheap slab intersection.
import { angleDiff } from './random.js';

// Ray vs one rect (slab method). Returns distance t along the ray, or Infinity.
export function rayRect(ox, oy, dx, dy, r) {
  let tmin = 0;
  let tmax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (ox < r.x || ox > r.x + r.w) return Infinity;
  } else {
    let t1 = (r.x - ox) / dx;
    let t2 = (r.x + r.w - ox) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < r.y || oy > r.y + r.h) return Infinity;
  } else {
    let t1 = (r.y - oy) / dy;
    let t2 = (r.y + r.h - oy) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

// Distance from (ox,oy) along direction (dx,dy) to the nearest blocker.
export function raycastDistance(ox, oy, dx, dy, blockers, maxDist) {
  let best = maxDist;
  for (const r of blockers) {
    const t = rayRect(ox, oy, dx, dy, r);
    if (t > 0 && t < best) best = t;
  }
  return best;
}

// True line of sight between two points (no blocker in between).
export function hasLineOfSight(ax, ay, bx, by, blockers) {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return true;
  const hit = raycastDistance(ax, ay, dx / d, dy / d, blockers, d);
  return hit >= d - 0.5;
}

// Vision-cone polygon for drawing: cast N rays across the cone, clip at walls.
export function conePolygon(ox, oy, angle, halfAngle, range, blockers, rays = 26) {
  const pts = [[ox, oy]];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const d = raycastDistance(ox, oy, dx, dy, blockers, range);
    pts.push([ox + dx * d, oy + dy * d]);
  }
  return pts;
}

// Is the target inside the cone AND visible? Returns 0..1 exposure (1 = dead centre).
export function coneExposure(ox, oy, angle, halfAngle, range, tx, ty, blockers) {
  const dx = tx - ox;
  const dy = ty - oy;
  const d = Math.hypot(dx, dy);
  if (d > range) return 0;
  const diff = Math.abs(angleDiff(angle, Math.atan2(dy, dx)));
  if (diff > halfAngle) return 0;
  if (!hasLineOfSight(ox, oy, tx, ty, blockers)) return 0;
  return 1 - (diff / halfAngle) * 0.55 - (d / range) * 0.25;
}
