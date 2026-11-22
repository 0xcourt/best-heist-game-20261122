// Game feel: one feedback() call per event, trauma-based shake, hit-stop,
// particles and number pops. Small / medium / large tiers only.
import { clamp } from './random.js';

export function createFeel() {
  return {
    trauma: 0,          // 0..1, shake = trauma^2
    hitStop: 0,         // seconds of frozen simulation left
    flash: 0,           // 0..1 screen flash (clamped for photosensitivity)
    flashColor: '#ffffff',
    particles: [],      // {x, y, vx, vy, life, maxLife, size, color}
    pops: [],           // {x, y, text, life, color}
    shakeX: 0,
    shakeY: 0,
  };
}

// Tier table — the whole game calls this one function.
// small: footstep, coin tick — trauma 0.10-0.20, 0-4 particles.
// medium: loot grab, alarm tick — trauma 0.30-0.50, 0.04-0.06s hit-stop, 6-12 particles, flash.
// large: vault crack, caught, lockdown — trauma 0.70-1.00, 0.10-0.15s hit-stop, 20-40 particles, flash + pop.
const TIERS = {
  small: { trauma: 0.14, hitStop: 0, particles: 3, flash: 0, pop: null },
  medium: { trauma: 0.42, hitStop: 0.05, particles: 9, flash: 0.22, pop: null },
  large: { trauma: 0.9, hitStop: 0.12, particles: 30, flash: 0.5, pop: true },
};

export function feedback(feel, tier, pos, opts = {}) {
  const t = TIERS[tier] || TIERS.small;
  feel.trauma = clamp(feel.trauma + t.trauma, 0, 1);
  feel.hitStop = Math.max(feel.hitStop, t.hitStop);
  if (t.flash > 0) {
    feel.flash = Math.max(feel.flash, t.flash);
    feel.flashColor = opts.flashColor || '#ffd76a';
  }
  const n = opts.particles !== undefined ? opts.particles : t.particles;
  const colors = opts.colors || ['#ffd76a', '#fff3c4', '#ffb347'];
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + (opts.seed || 0);
    const speed = 40 + ((i * 37) % 90);
    feel.particles.push({
      x: pos.x, y: pos.y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 30,
      life: 0.55 + ((i * 13) % 10) / 40, maxLife: 0.8,
      size: 2 + ((i * 7) % 4), color: colors[i % colors.length],
    });
  }
  const text = opts.pop || (t.pop ? opts.defaultPop : null);
  if (text) {
    feel.pops.push({ x: pos.x, y: pos.y - 18, text, life: 1.1, color: opts.popColor || '#ffd76a' });
  }
}

// Per-frame update. dt is real time; shake decays in real time so a
// hit-stop freeze never freezes the shake itself.
export function updateFeel(feel, dt, settings) {
  const shakeScale = (settings.shakePct ?? 100) / 100;
  feel.trauma = Math.max(0, feel.trauma - dt * 1.6);
  const s = feel.trauma * feel.trauma * 14 * shakeScale;
  // Summed sines: organic shake, never a single repeating wobble.
  const t = performance.now() / 1000;
  feel.shakeX = (Math.sin(t * 47.3) * 0.6 + Math.sin(t * 23.7) * 0.4) * s;
  feel.shakeY = (Math.cos(t * 39.1) * 0.6 + Math.sin(t * 29.3) * 0.4) * s;
  // Snap to rest: below a hair of trauma, shake is exactly zero.
  if (feel.trauma < 0.02) { feel.shakeX = 0; feel.shakeY = 0; }
  // Flash decays fast and is capped at 3 flashes/second by the caller
  // (accessibility: reduce flashing toggle halves flash strength).
  const flashScale = settings.reduceFlash ? 0.5 : 1;
  feel.flash = Math.max(0, feel.flash - dt * 2.4) * (settings.reduceFlash ? 0.98 : 1);
  feel.flash *= flashScale === 1 ? 1 : 1; // strength applied at draw time
  if (feel.hitStop > 0) feel.hitStop -= dt;
  for (const p of feel.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  feel.particles = feel.particles.filter((p) => p.life > 0);
  for (const p of feel.pops) p.life -= dt;
  feel.pops = feel.pops.filter((p) => p.life > 0);
}
