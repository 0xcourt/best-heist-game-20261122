// Audio: WebAudio buses, adaptive music, varied SFX. No audio files —
// everything is synthesized, so the game loads nothing over the network.
// Master <- Music, SFX, Ambience, UI. Slider value -> gain squared.
import { clamp } from './random.js';

export function createAudio() {
  return {
    ctx: null, master: null, music: null, sfx: null, ambience: null, ui: null,
    enabled: true, musicLevel: 0, // 0 calm, 1 tense, 2 lockdown
    lastStep: 0, lastPickup: 0, stepAlt: 0, pickupAlt: 0,
    musicNodes: null, alarmOsc: null, started: false,
  };
}

function bus(ctx, parent, vol) {
  const g = ctx.createGain();
  g.gain.value = vol * vol;
  g.connect(parent);
  return g;
}

export function ensureAudio(audio) {
  if (audio.ctx || typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.9;
    audio.master.connect(ctx.destination);
    audio.music = bus(ctx, audio.master, 0.5);
    audio.sfx = bus(ctx, audio.master, 0.7);
    audio.ambience = bus(ctx, audio.master, 0.35);
    audio.ui = bus(ctx, audio.master, 0.6);
    startAmbience(audio);
    startMusic(audio);
    audio.started = true;
  } catch (e) {
    audio.ctx = null; // headless / no audio: the game plays silent, never crashes
  }
}

function startAmbience(audio) {
  const ctx = audio.ctx;
  // Low room tone: two detuned sines + slow filtered noise via LFO on gain.
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 55.7;
  const g = ctx.createGain(); g.gain.value = 0.05;
  o1.connect(g); o2.connect(g); g.connect(audio.ambience);
  o1.start(); o2.start();
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lg = ctx.createGain(); lg.gain.value = 0.02;
  lfo.connect(lg); lg.connect(g.gain); lfo.start();
}

// Adaptive music: one pad + one pulse. Layers fade in by alarm level:
// calm (0) = pad only; tense (1) = pad + slow pulse; lockdown (2) = + fast pulse.
function startMusic(audio) {
  const ctx = audio.ctx;
  const pad = ctx.createGain(); pad.gain.value = 0.06; pad.connect(audio.music);
  const notes = [110, 130.81, 164.81, 220];
  for (const f of notes) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    o.connect(pad); o.start();
  }
  const pulse = ctx.createGain(); pulse.gain.value = 0; pulse.connect(audio.music);
  const po = ctx.createOscillator(); po.type = 'sine'; po.frequency.value = 82.4;
  po.connect(pulse); po.start();
  const fast = ctx.createGain(); fast.gain.value = 0; fast.connect(audio.music);
  const fo = ctx.createOscillator(); fo.type = 'square'; fo.frequency.value = 164.8;
  const ff = ctx.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 500;
  fo.connect(ff); ff.connect(fast); fo.start();
  audio.musicNodes = { pad, pulse, fast };
}

export function setMusicLevel(audio, level) {
  if (!audio.ctx || !audio.musicNodes || audio.musicLevel === level) return;
  audio.musicLevel = level;
  const t = audio.ctx.currentTime;
  const { pulse, fast } = audio.musicNodes;
  // Duck the music under the alarm siren at lockdown.
  pulse.gain.cancelScheduledValues(t);
  fast.gain.cancelScheduledValues(t);
  pulse.gain.linearRampToValueAtTime(level >= 1 ? 0.09 : 0, t + 0.8);
  fast.gain.linearRampToValueAtTime(level >= 2 ? 0.05 : 0, t + 0.8);
}

function tone(audio, busName, freq, dur, type, vol, slideTo) {
  if (!audio.ctx) return;
  const ctx = audio.ctx;
  const o = ctx.createOscillator();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(audio[busName]);
  o.start(); o.stop(ctx.currentTime + dur + 0.02);
}

// SFX variation: pitch +/-1 semitone, volume +/-2 dB, no immediate repeats
// for footsteps and pickups (alternating two variants).
export function sfxStep(audio, sneaking) {
  if (!audio.ctx) return;
  const now = performance.now();
  if (now - audio.lastStep < 240) return;
  audio.lastStep = now;
  audio.stepAlt = 1 - audio.stepAlt;
  const semi = audio.stepAlt === 0 ? 1 : -1;
  const f = 140 * Math.pow(2, semi / 12);
  tone(audio, 'sfx', f, 0.07, 'sine', sneaking ? 0.05 : 0.11, f * 0.7);
}

export function sfxPickup(audio, tier) {
  if (!audio.ctx) return;
  audio.pickupAlt = 1 - audio.pickupAlt;
  const semi = audio.pickupAlt === 0 ? 1 : -1;
  const base = tier === 'sapphire' ? 880 : tier === 'gem' ? 740 : tier === 'relic' ? 620 : 520;
  const f = base * Math.pow(2, semi / 12);
  tone(audio, 'sfx', f, 0.12, 'triangle', 0.16);
  tone(audio, 'sfx', f * 1.5, 0.18, 'triangle', 0.1);
}

export function sfxAlarmTick(audio) {
  if (!audio.ctx) return;
  tone(audio, 'sfx', 980, 0.09, 'square', 0.05, 920);
}

export function sfxSpotted(audio) {
  if (!audio.ctx) return;
  tone(audio, 'sfx', 220, 0.35, 'sawtooth', 0.16, 440);
  tone(audio, 'sfx', 110, 0.4, 'square', 0.1, 220);
}

export function sfxVault(audio) {
  if (!audio.ctx) return;
  tone(audio, 'sfx', 180, 0.5, 'triangle', 0.2, 90);
  tone(audio, 'sfx', 1200, 0.3, 'sine', 0.12, 2400);
}

export function sfxClick(audio) {
  if (!audio.ctx) return;
  tone(audio, 'ui', 660, 0.05, 'sine', 0.12);
}

export function sfxWin(audio) {
  if (!audio.ctx) return;
  [523, 659, 784, 1046].forEach((f, i) => {
    setTimeout(() => tone(audio, 'ui', f, 0.3, 'triangle', 0.14), i * 110);
  });
}

// Headroom: master stays under 0.9; every tone decays to silence, no clipping.
export function setMasterVolume(audio, v) {
  if (!audio.ctx) return;
  audio.master.gain.value = clamp(v, 0, 1) * clamp(v, 0, 1) * 0.9;
}
