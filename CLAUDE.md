# Đảo Đèn Lồng

Source requirement: phase1.txt; do not infer unreleased phases.
Game entry is game/index.html. Do not use/overwrite root index.html or downloaded HTML/assets.
Core game/src/core.ts must stay independent of Three.js, DOM, renderer and wall clock.
Web and headless share core. Fixed 60 ticks/s, snapshot0 before input; partial input fields persist, action buttons rising edge.
Distances use XZ and inclusive radius. No score/events from scenario setup. Deterministic JSONL including generated IDs.
Commands from root: npm install; npm run dev; npm test; npm run build.
Headless: npm run --silent headless -- --seed 42 --night 1 --ticks 600 --out output.jsonl.
Update game.contract.json when tuning changes; test verifies equality.
Verification gate: execute tests/build and actual play before claiming done; if tools blocked, report NOT RUN, never fabricate evidence.
Record assumptions in game/README.md, especially same-tick ordering and scoring.
Do not commit/push/tag/publish unless requested. Do not delete used harness or expose secrets.
