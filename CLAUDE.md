# Đảo Đèn Lồng

Source requirements: phase1.txt (PRD-0) + phase2.txt (Ticket-02 "Ba hòn đảo", v1.1) + phase3.txt (Ticket-03 "Đèn cạn dầu", Contract v1.2). Later tickets override earlier ones ([THAY THẾ] rules). Do not infer unreleased phases (Ticket-04+).
Specs with acceptance criteria: docs/08-PHASE-3-SPEC.md (current), docs/07-PHASE-2-SPEC.md. Design decision: docs/adr/ADR-003-den-can-dau.md. Breaking changes: CHANGELOG.md. Assumptions: game/README.md.
Game entry is game/index.html. Do not use/overwrite root index.html or downloaded HTML/assets.
Core game/src/core.ts must stay independent of Three.js, DOM, renderer, audio and wall clock. Audio (game/src/audio.ts) and visuals are web-only and must not change headless output.
Web and headless share core. Fixed 60 ticks/s, snapshot0 then night_start before input; partial input fields persist; jump/dash/interact/pulse/pause fire on false→true edge.
Tick order is mandatory (pause → counters → fuel decay/drain then lantern_out → player+fall → pickups → interact → safe zones → pulse → shades/drifters → contacts (drifter steal, then shade hits by id) → spawns → win/loss: no_flames first, then dawn_survived if lit ≥ ceil(0.6·n) else dawn; all lit never ends early).
Fuel is integer 1/60 units (FU = 60). Safe zone only when fuel ≥ 30. Capacity = min(20, 10 + 2·successful_lights). Sort ids with numeric compare (L2 < L10).
Distances use XZ and inclusive radius, except pulse (3D from foot + 0.8 m). No score/events from scenario setup. Deterministic JSONL including generated IDs (M*, S*, D*).
Three nights: --night 1|2|3, 240/270/300 s. Shade states must be spawning|wander|chase|recoil|stunned|drain.
Commands from root: npm install; npm run dev; npm test; npm run build; npm run evidence:phase3 (evidence:phase2 is historical and expected to FAIL under v1.2).
Headless: npm run --silent headless -- --seed 42 --night 1 --ticks 600 --out output.jsonl. Full night (18000 ticks on Night 3) must finish ≤ 30 s.
Update game.contract.json (contract_version "1.2") when tuning changes; test verifies equality.
Every new feature needs ≥ 1 headless scenario test (game/tests/phase3.test.ts). Phase 1–2 tests not replaced by Ticket-03 must keep passing; replaced tests are updated with a reason comment, never skipped.
Web play-testing: preview config .claude/launch.json "game-dev"; drive with window.__ddl (advance, key, bench, game). Target ≥ 30 FPS at 1280×720. Colorblind mode: __ddl.colorblind(on). See .claude/skills/verify-game/SKILL.md.
Verification gate: execute tests/build and actual play before claiming done; if tools blocked, report NOT RUN, never fabricate evidence.
Record assumptions in game/README.md, especially same-tick ordering and scoring.
Do not commit/push/tag/publish unless requested. Do not delete used harness or expose secrets.
