---
name: verify-game
description: Verify Đảo Đèn Lồng (v1.0.0, Phase 4, contract v1.3) end to end — tests, build, headless determinism/perf, evidence capture and a real browser play-test via window.__ddl. Use before claiming any gameplay, tuning, map or UI change is done.
---

# Verify Đảo Đèn Lồng

Run every step; if one cannot run, write **NOT RUN** with the reason. Never invent output.

## 1. Automated gate (repo root)

```sh
npm test                 # Phase 1–2 regression + Phase 3 scenarios; all must pass
npm run build            # Vite production build into dist/
npm run --silent headless -- --seed 42 --night 1 --ticks 600 --out output.jsonl
npm run evidence:phase3  # Phase 3 rule oracles must pass; only `oracle-contract-v1.2` FAILs under v1.3 (evidence:phase2 is v1.1, expected FAIL)
npm run evidence:phase4  # tests, build, headless v1.2 ≡ v1.3 (sha256 vs 3ed8670), soak, bench → docs/proof/phase-4/<timestamp>/
npm run --silent bench -- --seed 42 --duration 30 --out bench.json   # opens Electron 1280×720 ~35 s; PASS = avg ≥ 60, 1% low ≥ 30, load ≤ 10000 ms
npm run --silent soak -- --seed 7 --nights 10 --out soak.json        # PASS = crashes 0, mem_end ≤ 1.2 × mem_start
```

- If tuning changed: update `game.contract.json` (keep `contract_version: "1.3"`); the manifest test enforces equality.
- Adding a feature → add at least one CLI scenario in `game/tests/phase4.test.ts` (Phase 3 helpers in `phase3.test.ts`) (helper `run(night, ticks, scenario?, frames?)` spawns the real CLI; start from `quiet` to disable random spawns/wind).
- A rule replaced by a new ticket → update or remove the old test with a reason comment and list it in CHANGELOG.md. Never skip silently.
- Full-night perf: a full night (Night 3 = 18000 ticks) must finish ≤ 30 s and two runs must be byte-identical (covered by the `night durations …` test and the evidence sha256 files).

## 2. Browser play-test

1. Start the dev server with the preview tool, config `game-dev` (`.claude/launch.json`, port 5173). Set the viewport to 1280×720.
2. The preview pane may be hidden, which pauses `requestAnimationFrame`. Drive the game with the debug hooks instead of waiting on real time:
   - `document.querySelector('[data-act="practice-N"]').click()` then `[data-act="play"]` → starts Night N.
   - `__ddl.key('KeyA', true); __ddl.advance(120); __ddl.key('KeyA', false)` → ticks through the real web input path.
   - Pause/menus listen to real keydown: `dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyP'}))`.
   - `__ddl.game` exposes core state (tests may mutate it to stage situations — never do that in shipped code).
   - `__ddl.colorblind(true)` → colorblind palette (shade outline #00B3FF, warnings #FFFFFF + ⚠).
   - `__ddl.bench(300)` → GPU-synced FPS; must be ≥ 30 at 1280×720 on Night 3.
3. Screenshot at least: HUD in play, lantern lit (safe ring + toast), pulse, pause menu, a result screen, Night 2 and Night 3 terrain, wind on Night 3 (tick ≈ 1900), Dawn screen. Phase 3: fuel bar + 1 Hz blink below 30, a shade draining a weak lantern, relight, colorblind HUD and shade, dawn win k/n and a loss screen.
4. Phase 4 UI (screenshot each at 1280×720 and check nothing overlaps): Settings → "Đổi phím" (bind a key, bind a duplicate → "⚠ Trùng phím", "Khôi phục mặc định"), big text on, a shade spawn (caption + edge arrow), last 10 s countdown (set `__ddl.game.simTick` — `time_left_s` is recomputed from it), loss → name form (invalid name error, save), "Bảng xếp hạng" from the menu. Window blur auto-pauses the game: refocus before capturing.
   Electron screenshots without a browser pane: `DDL_SHOT=<dir> DDL_STEPS='[[js, wait_ms, "file.png"|null], …]' npx electron .` (add `--bench` for the bench scene). `DDL_PROF=1` + bench prints per-frame sim/render timings.
5. Read console errors (must be none). Reset viewport to desktop when done.

## 3. Report

List each command with its real exit status / counts, FPS measured, screenshots taken, and anything NOT RUN. Do not commit unless the user asks.
