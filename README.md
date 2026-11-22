# The Halcyon Vault — 5 jobs, 6 guards, 4 cameras, 21 treasures, 3 gadgets

[![make.fun](https://make.fun/badge.svg)](https://make.fun/)
[![Best Heist Game](https://make.fun/c/best-heist-game-20261122-0559/badge.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![The Halcyon Vault](https://make.fun/c/best-heist-game-20261122-0559/entry/badge.svg)](https://make.fun/c/best-heist-game-20261122-0559)

One night. One vault. The Star Sapphire. A complete top-down heist game that
plays offline in a desktop browser from its own files — no network, no
libraries at runtime, vanilla JS + Canvas 2D, deterministic seed 20261122.

## Play

```sh
node serve.ts   # http://localhost:8080
```

WASD / arrows — move · SHIFT — sneak · E — grab / douse lamp / crack vault ·
Q — smoke vial · F + click — pebble lure · P — pause · M — mute.

## The heist

Five jobs in one room, everything visible in one frame:

1. **Slip In** — cross the south gallery without crossing a cone.
2. **Lamps & Ledger** — douse 2 lamps, lift 5 treasures. Dark floor hides you.
3. **Crack the Vault** — the lockpick waits in the west gallery, before the
   vault, never behind its own door. Hold E at the vault door to crack it.
4. **Star Sapphire** — the centerpiece is alarmed. Take it and be ready to run.
5. **Getaway** — reach the south door with the Sapphire. Ghost it if you can.

## Systems

- **Guards (6) and cameras (4)** with raycast vision cones and patrol routes;
  cones sweep, linger at each end, and are clipped by walls and cases.
- **Suspicion rings** build visibly before any guard commits; a spotted guard
  shouts, then chases. Cameras raise the alarm on their own.
- **Alarm meter (0–100)** — at max, a 12-second lockdown: guards sweep faster.
- **Loot in tiers** — 12 coins, 6 relics, 2 gems, and the Star Sapphire ($5,000).
- **Gadgets** — smoke vials (block vision), pebble lures (pull a guard off
  patrol), and the lockpick.
- **Ghost rating** — 100% while nobody ever spots you; the debrief grades the run.
- **Route debrief** — time, loot, ghost rating, lamps doused, gadgets used,
  and the route you took, job by job.
- **Game feel** — one `feedback(tier, pos)` call per event: trauma-based
  screen shake, hit-stop, particles, number pops; shake and flashing toggles.
- **Audio** — synthesized WebAudio only: Master ← Music / SFX / Ambience / UI,
  adaptive music by alarm level, music ducked under the siren, varied SFX.
- **Deterministic** — seeded RNG, fixed timestep; screenshot scenes render
  byte-identical every run. Reachability is checked at build: every loot, the
  lockpick, the vault and the exit are reachable from the entry.

## Layout

- `game/index.html` — page shell, footer with accessibility toggles.
- `game/src/config.js` — level data, the 5-job beat list, tuning.
- `game/src/random.js` — seeded RNG, easing, angles.
- `game/src/vision.js` — raycast cones and line of sight.
- `game/src/world.js` — room build, collision, reachability check.
- `game/src/guards.js` — guard/camera AI, suspicion, alarm, lockdown.
- `game/src/feel.js` — trauma shake, hit-stop, particles, `feedback()`.
- `game/src/audio.js` — WebAudio buses, adaptive music, SFX.
- `game/src/render.js` — night lamplight renderer, HUD, legend, debrief.
- `game/src/shots.js` — deterministic screenshot staging.
- `game/src/main.js` — game loop, input, jobs, interactions.
- `main.ts` — entrypoint: copies `game/` + `screenshots/` to `/output` and
  writes `dossier.json` via `buildDossier` (Node 22 stdlib only).
- `screenshots/` — 4 real renders of the game's own code (cover first).

Built for [make.fun](https://make.fun/) — best-heist-game-20261122-0559.
Referral: `e57xstcn`
