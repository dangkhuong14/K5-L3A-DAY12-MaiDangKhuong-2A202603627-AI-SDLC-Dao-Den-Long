---
name: verify-game
description: Verify Đảo Đèn Lồng (Phase 2, contract v1.1) end to end — tests, build, headless determinism/perf, evidence capture and a real browser play-test via window.__ddl. Use before claiming any gameplay, tuning, map or UI change is done.
---

# Verify Đảo Đèn Lồng

Run every step; if one cannot run, write **NOT RUN** with the reason. Never invent output.

## 1. Automated gate (repo root)

```sh
npm test                 # Phase 1 regression + Phase 2 scenarios; all must pass
npm run build            # Vite production build into dist/
npm run --silent headless -- --seed 42 --night 1 --ticks 600 --out output.jsonl
npm run evidence:phase2  # writes docs/proof/phase-2/<timestamp>/ with results.json
```

- If tuning changed: update `game.contract.json` (keep `contract_version: "1.1"`); the manifest test enforces equality.
- Adding a feature → add at least one CLI scenario in `game/tests/phase2.test.ts` (helper `run(night, ticks, scenario?, frames?)` spawns the real CLI; start from `quiet` to disable random spawns/wind).
- Full-night perf: 21600 ticks must finish ≤ 30 s and two runs must be byte-identical (covered by the `deterministic full-night replay` test).

## 2. Browser play-test

1. Start the dev server with the preview tool, config `game-dev` (`.claude/launch.json`, port 5173). Set the viewport to 1280×720.
2. The preview pane may be hidden, which pauses `requestAnimationFrame`. Drive the game with the debug hooks instead of waiting on real time:
   - `document.querySelector('[data-act="practice-N"]').click()` then `[data-act="play"]` → starts Night N.
   - `__ddl.key('KeyA', true); __ddl.advance(120); __ddl.key('KeyA', false)` → ticks through the real web input path.
   - Pause/menus listen to real keydown: `dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyP'}))`.
   - `__ddl.game` exposes core state (tests may mutate it to stage situations — never do that in shipped code).
   - `__ddl.bench(300)` → GPU-synced FPS; must be ≥ 30 at 1280×720 on Night 3.
3. Screenshot at least: HUD in play, lantern lit (safe ring + toast), pulse, pause menu, a result screen, Night 2 and Night 3 terrain, wind on Night 3 (tick ≈ 1900), Dawn screen.
4. Read console errors (must be none). Reset viewport to desktop when done.

## 3. Report

List each command with its real exit status / counts, FPS measured, screenshots taken, and anything NOT RUN. Do not commit unless the user asks.
