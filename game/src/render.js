// Render: night lamplight museum/vault, top-down Canvas 2D.
// Safe cover, danger and loot are obvious at a glance: gold = loot,
// red = danger cones, green = cover, warm lamp pools = light.
import { VIEW_W, VIEW_H, HUD_H, LEGEND, LOOT_VALUE } from './config.js';
import { conePolygon } from './vision.js';
import { clamp, easeOutCubic } from './random.js';

const FLOOR_A = '#1b2138';
const FLOOR_B = '#161b2e';
const WALL_FILL = '#2c3352';
const WALL_TRIM = '#8a6d3b';
const GOLD = '#ffd76a';
const RED = '#ff5a4e';
const GREEN = '#3ddc97';
const CYAN = '#7fd4ff';

export function drawGame(ctx, state) {
  const { world, thief, feel, time } = state;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.translate(feel.shakeX, feel.shakeY);

  drawFloor(ctx, time, world.walls);
  drawLoot(ctx, world, time);
  drawLockpick(ctx, world, time);
  drawLamps(ctx, world, time);
  drawCases(ctx, world);
  drawVault(ctx, world, time);
  drawSmoke(ctx, world);
  drawCones(ctx, world, state);
  drawGuards(ctx, world, time);
  drawThief(ctx, thief, state, time);
  drawParticles(ctx, feel);
  drawPops(ctx, feel);
  drawFlash(ctx, feel, state.settings);
  ctx.restore();

  drawHud(ctx, state);
  drawLegend(ctx);
  if (state.screen === 'title') drawTitle(ctx, state, time);
  if (state.screen === 'caught') drawCaught(ctx, state);
  if (state.screen === 'win') drawDebrief(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  if (state.toast) drawToast(ctx, state);
}

function drawFloor(ctx, time, walls) {
  ctx.fillStyle = FLOOR_A;
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  // Checker tiles, subtle.
  const s = 64;
  ctx.fillStyle = FLOOR_B;
  for (let y = HUD_H; y < VIEW_H; y += s) {
    for (let x = 0; x < VIEW_W; x += s) {
      if (((x / s) + (y / s)) % 2 === 0) ctx.fillRect(x, y, s, s);
    }
  }
  // Gold carpet runner: entry -> centre -> vault. Guides the eye, not walls.
  ctx.fillStyle = 'rgba(138,109,59,0.20)';
  ctx.fillRect(596, 380, 88, 326);
  ctx.fillRect(596, 112, 88, 268);
  ctx.strokeStyle = 'rgba(255,215,106,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(596, 380, 88, 326);
  ctx.strokeRect(596, 112, 88, 268);
  // Walls with gold trim.
  for (const w of walls) {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = WALL_TRIM;
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
}

function drawLoot(ctx, world, time) {
  for (const l of world.loot) {
    if (l.taken) continue;
    const bob = Math.sin(time * 2 + l.bob) * 2;
    const pulse = 0.6 + 0.4 * Math.sin(time * 3 + l.bob);
    if (l.tier === 'coin') {
      ctx.fillStyle = `rgba(255,215,106,${0.25 + 0.2 * pulse})`;
      ctx.beginPath(); ctx.arc(l.x, l.y + bob, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(l.x, l.y + bob, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6d3b';
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', l.x, l.y + bob);
    } else if (l.tier === 'relic') {
      ctx.fillStyle = `rgba(255,179,71,${0.25 + 0.2 * pulse})`;
      ctx.beginPath(); ctx.arc(l.x, l.y + bob, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(l.x - 7, l.y + bob - 9, 14, 18);
      ctx.fillStyle = '#7a4d12';
      ctx.fillRect(l.x - 3, l.y + bob - 4, 6, 8);
    } else if (l.tier === 'gem') {
      ctx.save();
      ctx.translate(l.x, l.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ff7ad9';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-4, -4, 5, 5);
      ctx.restore();
    } else if (l.tier === 'sapphire') {
      // The centerpiece: bright cyan star, rotating glint.
      ctx.save();
      ctx.translate(l.x, l.y + bob);
      ctx.fillStyle = `rgba(127,212,255,${0.3 + 0.25 * pulse})`;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(time * 0.8);
      ctx.fillStyle = CYAN;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? 16 : 7;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

function drawLockpick(ctx, world, time) {
  if (world.lockpick.taken) return;
  const p = world.lockpick;
  const bob = Math.sin(time * 2.5) * 2;
  ctx.fillStyle = 'rgba(127,212,255,0.3)';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = CYAN; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x + 5, p.y + bob + 5); ctx.lineTo(p.x + 12, p.y + bob + 12); ctx.stroke();
  ctx.fillStyle = CYAN;
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('LOCKPICK', p.x, p.y + bob + 28);
}

function drawLamps(ctx, world, time) {
  // Warm light pools (additive), then lamp fixtures.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of world.lamps) {
    if (!l.lit) continue;
    const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(255,190,90,0.20)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  for (const l of world.lamps) {
    ctx.fillStyle = l.lit ? '#ffb347' : '#4a4a55';
    ctx.beginPath(); ctx.arc(l.x, l.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2c2c34'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(l.x, l.y, 10, 0, Math.PI * 2); ctx.stroke();
    if (!l.lit) {
      ctx.fillStyle = '#9a9ab0';
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('douse', l.x, l.y + 22);
    }
  }
}

function drawCases(ctx, world) {
  for (const c of world.cases) {
    ctx.fillStyle = '#232a45';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(127,212,255,0.18)';
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = GREEN;
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('COVER', c.x + c.w / 2, c.y + c.h / 2 + 3);
  }
}

function drawVault(ctx, world, time) {
  // Vault chamber walls (drawn from world.walls subset is done in drawFloor
  // via setWallsForDraw; here the door + pedestal).
  const d = { x: 596, y: 96, w: 88, h: 16 };
  if (world.vaultOpen) {
    ctx.fillStyle = '#3ddc97';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#0d2b1d';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('OPEN', d.x + d.w / 2, d.y + 12);
  } else {
    ctx.fillStyle = '#4a3a1c';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(d.x + d.w / 2, d.y + d.h / 2, 5, 0, Math.PI * 2); ctx.fill();
    if (world.vaultProgress > 0) {
      ctx.fillStyle = '#1b2138';
      ctx.fillRect(d.x - 10, d.y - 16, d.w + 20, 8);
      ctx.fillStyle = CYAN;
      ctx.fillRect(d.x - 10, d.y - 16, (d.w + 20) * clamp(world.vaultProgress, 0, 1), 8);
    }
  }
  // Pedestal.
  ctx.fillStyle = '#2c3352';
  ctx.fillRect(624, 186, 32, 12);
  ctx.strokeStyle = WALL_TRIM; ctx.lineWidth = 1.5;
  ctx.strokeRect(624, 186, 32, 12);
  // Entry door.
  ctx.fillStyle = '#3ddc97';
  ctx.fillRect(596, 692, 88, 14);
  ctx.fillStyle = '#0d2b1d';
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(world.sapphireTaken ? 'EXIT — GO!' : 'ENTRY', 640, 703);
}

function drawSmoke(ctx, world) {
  for (const s of world.smoke) {
    ctx.fillStyle = `rgba(200,200,210,${0.35 * (s.t / 6)})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(s.x - 12, s.y - 8, s.r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCones(ctx, world, state) {
  // Cameras first (amber), then guards (red) — danger reads instantly.
  for (const c of world.cameras) {
    const poly = conePolygon(c.x, c.y, c.angle, 0.49, 208, world.blockers);
    ctx.fillStyle = c.suspicion > 60 ? 'rgba(255,90,78,0.30)' : 'rgba(255,179,71,0.22)';
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c3352';
    ctx.fillRect(c.x - 8, c.y - 8, 16, 16);
    ctx.fillStyle = c.suspicion > 60 ? RED : '#ffb347';
    ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const g of world.guards) {
    const poly = conePolygon(g.x, g.y, g.angle, 0.61, 178, world.blockers);
    const hot = g.suspicion > 60 || g.state === 'chase';
    ctx.fillStyle = hot ? 'rgba(255,90,78,0.34)' : 'rgba(255,90,78,0.20)';
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath(); ctx.fill();
    // Suspicion ring: the fair warning before a guard commits.
    if (g.suspicion > 2) {
      ctx.strokeStyle = g.suspicion >= 100 ? RED : '#ffb347';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 24, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.suspicion) / 100);
      ctx.stroke();
    }
  }
}

function drawGuards(ctx, world, time) {
  for (const g of world.guards) {
    // Body: dark navy uniform, red visor; chase state flashes.
    ctx.fillStyle = g.state === 'chase' ? '#7a1f1a' : '#232a45';
    ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.state === 'chase' ? RED : '#8a93b8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, Math.PI * 2); ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = RED; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.angle) * 8, g.y + Math.sin(g.angle) * 8);
    ctx.lineTo(g.x + Math.cos(g.angle) * 16, g.y + Math.sin(g.angle) * 16);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y - 20);
    if (g.state === 'chase') {
      ctx.fillStyle = RED;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('!', g.x, g.y - 30);
    }
  }
}

function drawThief(ctx, thief, state, time) {
  const blink = state.screen === 'caught' && Math.floor(time * 6) % 2 === 0;
  if (blink) return;
  ctx.save();
  ctx.translate(thief.x, thief.y);
  ctx.rotate(thief.angle);
  // Cloak: dark teal, gold trim, hood point.
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-13, 0); ctx.lineTo(-10, 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f5f0e1';
  ctx.beginPath(); ctx.arc(2, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Sneak indicator.
  if (thief.sneaking) {
    ctx.fillStyle = '#3ddc97';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SNEAK', thief.x, thief.y - 22);
  }
}

function drawParticles(ctx, feel) {
  for (const p of feel.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPops(ctx, feel) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px sans-serif';
  for (const p of feel.pops) {
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - (1.1 - p.life) * 30);
  }
  ctx.globalAlpha = 1;
}

function drawFlash(ctx, feel, settings) {
  if (feel.flash <= 0.01) return;
  const strength = settings.reduceFlash ? 0.5 : 1;
  ctx.fillStyle = feel.flashColor;
  ctx.globalAlpha = feel.flash * 0.55 * strength;
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  ctx.globalAlpha = 1;
}

// ---- HUD ----
function drawHud(ctx, state) {
  const { world, thief } = state;
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = WALL_TRIM;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, HUD_H); ctx.lineTo(VIEW_W, HUD_H); ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('THE HALCYON VAULT', 14, 22);
  ctx.fillStyle = '#c9cfe8';
  ctx.font = '12px sans-serif';
  ctx.fillText('5 jobs · 6 guards · 4 cameras · 21 treasures · 3 gadgets', 14, 44);

  // Alarm meter.
  const ax = 380;
  ctx.fillStyle = '#c9cfe8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ALARM', ax, 20);
  ctx.fillStyle = '#232a45';
  ctx.fillRect(ax + 58, 10, 130, 18);
  const aFrac = clamp(state.alarm / 100, 0, 1);
  ctx.fillStyle = aFrac > 0.66 ? RED : aFrac > 0.33 ? '#ffb347' : GREEN;
  ctx.fillRect(ax + 58, 10, 130 * aFrac, 18);
  ctx.strokeStyle = '#8a93b8'; ctx.lineWidth = 1;
  ctx.strokeRect(ax + 58, 10, 130, 18);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${Math.round(state.alarm)}`, ax + 194, 20);
  if (world.lockdownT > 0) {
    ctx.fillStyle = RED;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`LOCKDOWN ${Math.ceil(world.lockdownT)}s`, ax, 44);
  } else {
    ctx.fillStyle = '#c9cfe8';
    ctx.font = '12px sans-serif';
    const maxS = Math.max(...world.guards.map((g) => g.suspicion), ...world.cameras.map((c) => c.suspicion));
    ctx.fillText(`SUSPICION ${Math.round(maxS)}%`, ax, 44);
  }

  // Loot counter + value.
  const taken = world.loot.filter((l) => l.taken).length;
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`LOOT ${taken}/21`, 620, 20);
  ctx.fillStyle = '#c9cfe8';
  ctx.font = '12px sans-serif';
  ctx.fillText(`$${state.lootValue.toLocaleString('en-US')}`, 620, 44);

  // Gadgets.
  ctx.fillStyle = '#c9cfe8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`SMOKE ${thief.gadgets.smoke} [Q]`, 770, 20);
  ctx.fillText(`PEBBLE ${thief.gadgets.pebble} [F]`, 770, 44);
  ctx.fillText(thief.gadgets.lockpick ? 'LOCKPICK ✓' : 'LOCKPICK —', 910, 20);
  ctx.fillText(`GHOST ${Math.round(state.ghost)}%`, 910, 44);

  // Job line (right-aligned; hints are short so they never reach the gadgets).
  const job = state.job;
  ctx.fillStyle = CYAN;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(job.name, VIEW_W - 14, 20);
  ctx.fillStyle = '#c9cfe8';
  ctx.font = '11px sans-serif';
  ctx.fillText(job.hint, VIEW_W - 14, 44);
  ctx.textAlign = 'left';
}

function drawLegend(ctx) {
  let x = 14;
  const y = 690;
  ctx.font = 'bold 10px sans-serif';
  ctx.textBaseline = 'middle';
  for (const item of LEGEND) {
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y - 5, 10, 10);
    ctx.fillStyle = '#c9cfe8';
    ctx.fillText(item.label, x + 14, y);
    x += 14 + ctx.measureText(item.label).width + 18;
  }
}

function drawToast(ctx, state) {
  ctx.save();
  ctx.globalAlpha = clamp(state.toastT, 0, 1);
  ctx.fillStyle = 'rgba(13,16,32,0.9)';
  const w = ctx.measureText(state.toast).width + 36;
  ctx.fillRect((VIEW_W - w) / 2, 84, w, 34);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
  ctx.strokeRect((VIEW_W - w) / 2, 84, w, 34);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(state.toast, VIEW_W / 2, 101);
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,13,26,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawTitle(ctx, state, time) {
  ctx.fillStyle = 'rgba(10,13,26,0.72)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  panel(ctx, 340, 150, 600, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('THE HALCYON VAULT', 640, 210);
  ctx.fillStyle = CYAN;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('5 jobs · 6 guards · 4 cameras · 21 treasures · 3 gadgets', 640, 246);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '15px sans-serif';
  ctx.fillText('One night. One vault. The Star Sapphire.', 640, 282);
  ctx.fillText('Read the cones. Douse the lamps. Ghost it if you can.', 640, 308);
  ctx.fillStyle = '#c9cfe8';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD / arrows — move      SHIFT — sneak      E — grab / douse / crack', 640, 350);
  ctx.fillText('Q — smoke vial      F + click — pebble lure      P — pause      M — mute', 640, 374);
  const pulse = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.fillStyle = `rgba(255,215,106,${pulse})`;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN THE HEIST', 640, 440);
  ctx.fillStyle = '#8a93b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Original game · no network · deterministic seed 20261122', 640, 500);
  ctx.textAlign = 'left';
}

function drawCaught(ctx, state) {
  ctx.fillStyle = 'rgba(60,8,8,0.55)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  panel(ctx, 390, 230, 500, 200);
  ctx.textAlign = 'center';
  ctx.fillStyle = RED;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('CAUGHT!', 640, 290);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '15px sans-serif';
  ctx.fillText(state.caughtBy || 'A guard closed the distance.', 640, 326);
  ctx.fillText(`Loot kept: $${state.lootValue.toLocaleString('en-US')} — the crew still pays for it.`, 640, 352);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press R to run it back', 640, 396);
  ctx.textAlign = 'left';
}

function drawDebrief(ctx, state) {
  // Route debrief / replay: the getaway pays off the planning.
  ctx.fillStyle = 'rgba(10,13,26,0.78)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  panel(ctx, 330, 130, 620, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('CLEAN GETAWAY', 640, 180);
  ctx.fillStyle = CYAN;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('The Star Sapphire is yours.', 640, 212);
  const rows = [
    ['Time', `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`],
    ['Loot', `${state.lootTaken}/21  ·  $${state.lootValue.toLocaleString('en-US')}`],
    ['Ghost rating', `${Math.round(state.ghost)}%  ${state.ghost >= 90 ? '— TRUE GHOST' : state.ghost >= 60 ? '— SHADOW' : '— LOUD'}`],
    ['Times spotted', `${state.spots}`],
    ['Lamps doused', `${state.lampsDoused}`],
    ['Gadgets used', `smoke ${state.usedSmoke} · pebble ${state.usedPebble}`],
  ];
  ctx.font = '15px sans-serif';
  let y = 252;
  for (const [k, v] of rows) {
    ctx.fillStyle = '#8a93b8';
    ctx.textAlign = 'right';
    ctx.fillText(k, 560, y);
    ctx.fillStyle = '#e8ecff';
    ctx.textAlign = 'left';
    ctx.fillText(v, 580, y);
    y += 30;
  }
  // Route on its own centred line so it never clips the panel edge.
  ctx.fillStyle = '#8a93b8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ROUTE   ${state.route.join('  →  ')}`, 640, 462);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press R to plan the next job', 640, 530);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10,13,26,0.6)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  panel(ctx, 490, 300, 300, 110);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PAUSED', 640, 340);
  ctx.fillStyle = '#c9cfe8';
  ctx.font = '14px sans-serif';
  ctx.fillText('P to resume', 640, 372);
  ctx.textAlign = 'left';
}
