// Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3): bench scene, soak, leaderboard, key bindings.
// Bench and soak run through the real CLIs (headless.ts / soak.ts) as in phase3.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { spawnSync } from 'node:child_process';
import { benchScenario, benchCamera, BENCH, nights, tuning, createGame, step, idle } from '../src/core.ts';
import { runNight, randomInput } from '../src/soak.ts';
import { validName, nameError, insertEntry, sortEntries, qualifies, isoLocal, parseEntries, exportJson, type Entry } from '../src/leaderboard.ts';
import { DEFAULT_BINDINGS, keyboardMove, conflicts, actionDown } from '../src/keyboard.ts';

const dir = mkdtempSync(join(tmpdir(), 'lantern-p4-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
let n = 0;
function headless(ticks: number, scenario: object, every = 60) {
  const id = n++, out = join(dir, `${id}.jsonl`), f = join(dir, `${id}.s.json`); writeFileSync(f, JSON.stringify(scenario));
  const p = spawnSync(process.execPath, ['--import', 'tsx', 'game/src/headless.ts', '--seed', '42', '--night', '1', '--ticks', String(ticks), '--out', out, '--snapshot-every', String(every), '--scenario', f], { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  return readFileSync(out, 'utf8').trim().split('\n').map(l => JSON.parse(l));
}
const dXZ = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);

test('contract v1.3 adds bench_cmd and soak_cmd; v1.0–v1.2 commands kept', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.3'); assert.deepEqual(c.tuning, tuning);
  for (const k of ['build_cmd', 'run_cmd', 'headless_cmd', 'bench_cmd', 'soak_cmd']) assert.equal(typeof c[k], 'string', k);
  assert.match(c.bench_cmd, /bench/); assert.match(c.soak_cmd, /soak/);
});

test('bench scene: exactly 200 wander shades spread on the island (outside lit safe zones), 100 motes, L1–L3 lit at 100, Mây at origin; seed-stable', () => {
  const s = benchScenario(42);
  assert.equal(s.shades.length, 200); assert.equal(s.motes.length, 100);
  assert.deepEqual(s.player.pos, [0, 0, 0]);
  assert.deepEqual(s.lanterns, [{ id: 'L1', lit: true, fuel: 100 }, { id: 'L2', lit: true, fuel: 100 }, { id: 'L3', lit: true, fuel: 100 }]);
  for (const sh of s.shades) {
    assert.equal(sh.state, 'wander'); assert.ok(nights[1].ground(sh.pos[0], sh.pos[2]) !== null, 'on island');
    for (const l of nights[1].lanterns.slice(0, 3)) assert.ok(dXZ(sh.pos, l) > tuning.safe_radius, 'outside safe zone');
  }
  // "rải đều": every quadrant of the island holds a fair share (uniform area sampling).
  const q = [0, 0, 0, 0]; for (const sh of s.shades) q[(sh.pos[0] >= 0 ? 0 : 1) + (sh.pos[2] >= 0 ? 0 : 2)]++;
  for (const c of q) assert.ok(c >= 40 && c <= 62, `quadrants ${q}`);
  assert.deepEqual(benchScenario(42), s, 'same seed → same scene');
  assert.notDeepEqual(benchScenario(43).shades[0].pos, s.shades[0].pos);
});

test('bench via headless CLI: no spawns, damage, pickups, fuel decay or end of night; shades keep wandering and move', () => {
  // Mây stands on two motes and a shade starts 0.5 m away; time_left 1 s would normally end the night.
  const sc = benchScenario(42); sc.shades[0].pos = [0.5, 0, 0]; sc.motes[0].pos = [0, 0, 0];
  const recs = headless(900, { ...sc, time_left_s: 1 });
  const snaps = recs.filter(r => r.type === 'snapshot'), ev = recs.filter(r => r.type === 'event');
  assert.deepEqual(ev.map(e => e.name), ['night_start'], 'only night_start: no spawn, hit, pickup, lantern_out or game_over');
  const last = snaps.at(-1);
  assert.equal(last.tick, 900); assert.equal(last.state, 'playing'); assert.equal(last.time_left_s, 0);
  assert.equal(last.shades.length, 200); assert.ok(last.shades.every((x: any) => x.state === 'wander'));
  assert.equal(last.motes_active, 100); assert.equal(last.player.carried, 0); assert.equal(last.player.flames, 3);
  assert.deepEqual(last.lanterns.slice(0, 3).map((l: any) => [l.lit, l.fuel]), [[true, 100], [true, 100], [true, 100]]);
  assert.deepEqual(last.player.pos, [0, 0, 0]);
  const first = snaps[0], moved = last.shades.filter((x: any, i: number) => dXZ(x.pos, first.shades[i].pos) > 1).length;
  assert.ok(moved >= 150, `shades wander (${moved}/200 moved > 1 m in 15 s)`);
  for (const x of last.shades) for (const l of last.lanterns.slice(0, 3)) assert.ok(dXZ(x.pos, l.pos) >= tuning.safe_radius - 1e-3, "safe zones still respected (snapshot rounds to mm)");
});

test('bench flag is off by default: same scene without bench=true behaves like gameplay (hit + pickup happen)', () => {
  const sc: any = benchScenario(42); delete sc.bench; sc.shades[0].pos = [0.5, 0, 0]; sc.motes[0].pos = [0, 0, 0];
  const names = headless(5, sc, 1).filter(r => r.type === 'event').map(r => r.name);
  assert.ok(names.includes('mote_picked') && names.includes('player_hit'), names.join(','));
});

test('bench camera orbit: r 30, Y 15, starts (30,15,0), counter-clockwise from above, 15 s per lap', () => {
  const c = (t: number) => benchCamera(t).map(v => Math.round(v * 1e6) / 1e6 + 0);
  assert.deepEqual(c(0), [30, 15, 0]); assert.deepEqual(c(3.75), [0, 15, -30]); assert.deepEqual(c(7.5), [-30, 15, 0]); assert.deepEqual(c(15), [30, 15, 0]);
  // Seen from +Y (x right, -z up on screen) going (30,0) → (0,-30) is counter-clockwise: cross product of r and v > 0 in (x, -z).
  const a = benchCamera(0), b = benchCamera(0.1); assert.ok(a[0] * (-b[2]) - (-a[2]) * b[0] > 0);
  assert.equal(BENCH.shades, 200);
});

test('soak: seeded random input (5% jump, 3% dash, 2% pulse, 10% interact, new direction every 30 ticks) and a full night without crash', () => {
  const next = randomInput(8), N = 60000; let j = 0, d = 0, p = 0, it = 0; const dirs = new Set<string>();
  for (let i = 0; i < N; i++) { const x = next(); j += +x.jump; d += +x.dash; p += +x.pulse; it += +x.interact; if (i < 90) dirs.add(x.move.join()); }
  const near = (v: number, r: number) => assert.ok(Math.abs(v / N - r) < 0.006, `${v / N} vs ${r}`);
  near(j, 0.05); near(d, 0.03); near(p, 0.02); near(it, 0.10); assert.equal(dirs.size, 3, 'ticks 0, 30, 60 pick new directions');
  const a = runNight(3, 10), b = runNight(3, 10);
  assert.deepEqual(a, b, 'deterministic'); assert.notEqual(a.result, 'crash'); assert.ok(a.ticks <= 300 * 60 + 1);
});

test('soak CLI writes soak.json with nights/crashes/results/mem_start_mb/mem_end_mb/duration_s and passes the RSS threshold', () => {
  const out = join(dir, 'soak.json');
  const p = spawnSync(process.execPath, ['--expose-gc', '--max-semi-space-size=1', '--import', 'tsx', 'game/src/soak.ts', '--seed', '7', '--nights', '10', '--out', out], { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  const r = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(r.nights, 10); assert.equal(r.crashes, 0); assert.equal(r.results.length, 10);
  assert.ok(r.results.every((x: string) => x === 'won' || x === 'lost'));
  assert.deepEqual(r.details.slice(0, 4).map((x: any) => [x.night, x.seed]), [[1, 8], [2, 9], [3, 10], [1, 11]], 'rotating nights, seed 7 + i');
  for (const k of ['mem_start_mb', 'mem_end_mb', 'duration_s']) assert.ok(r[k] > 0, k);
  assert.ok(r.mem_end_mb <= 1.2 * r.mem_start_mb);
});

const E = (name: string, score: number, at: string, nights_won = 1, seed = 1): Entry => ({ name, score, nights_won, achieved_at: at, seed });
test('leaderboard: name 3–12 of [A-Za-z0-9_] (+ Vietnamese diacritics), score desc, tie → earlier first, top 10, export shape', () => {
  for (const ok of ['May', 'abc_123', 'ABCDEFGHIJKL', 'Mây', 'Đăng_Khương', 'Nguyễn']) assert.ok(validName(ok), ok);
  for (const bad of ['ab', 'ABCDEFGHIJKLM', 'a b c', 'x-y-z', '', 'tên!', '😀😀😀']) assert.ok(!validName(bad), bad);
  assert.ok(validName('Ma\u0302y'), 'decomposed input is NFC-normalised'); assert.match(nameError('ab')!, /3/);
  let list: Entry[] = [];
  list = insertEntry(list, E('Late', 500, '2026-11-20T10:00:00+07:00'));
  list = insertEntry(list, E('Early', 500, '2026-11-20T09:00:00+07:00'));
  list = insertEntry(list, E('Top', 900, '2026-11-21T00:00:00Z', 3));
  list = insertEntry(list, E('UtcTie', 500, '2026-11-20T01:30:00Z')); // = 08:30+07:00, earliest of the 500s
  assert.deepEqual(list.map(e => e.name), ['Top', 'UtcTie', 'Early', 'Late']);
  for (let i = 0; i < 12; i++) list = insertEntry(list, E(`P${i}`, 100 + i, `2026-11-22T00:00:${String(i).padStart(2, '0')}+07:00`));
  assert.equal(list.length, 10); assert.equal(list.at(-1)!.score, 106); // Top, 3×500, then P11..P6 = 111..106
  assert.ok(!qualifies(list, 106) && qualifies(list, 107));
  const ex = JSON.parse(exportJson(list)); assert.deepEqual(Object.keys(ex), ['entries']); assert.deepEqual(ex.entries, sortEntries(list));
  assert.deepEqual(Object.keys(ex.entries[0]), ['name', 'score', 'nights_won', 'achieved_at', 'seed']);
  assert.match(isoLocal(new Date(2026, 10, 20, 9, 5, 7)), /^2026-11-20T09:05:07[+-]\d\d:\d\d$/);
  assert.deepEqual(parseEntries({ entries: [...list, { name: 1 }, E('Bad', 1, 'not a date'), E('X', 5, '2026-11-20T00:00:00Z', 4)] }), list, 'malformed rows dropped');
});

test('key bindings: rebinding drives movement/actions, duplicates detected, defaults restorable', () => {
  const b = structuredClone(DEFAULT_BINDINGS);
  assert.deepEqual(keyboardMove(new Set(['KeyW', 'KeyA']), b), [1, 1]);
  b.up = ['KeyI']; b.jump = ['KeyJ'];
  assert.deepEqual(keyboardMove(new Set(['KeyW']), b), [0, 0], 'old key no longer moves');
  assert.deepEqual(keyboardMove(new Set(['KeyI']), b), [0, 1]);
  assert.ok(actionDown(new Set(['KeyJ']), b, 'jump') && !actionDown(new Set(['Space']), b, 'jump'));
  b.pulse = ['KeyJ'];
  assert.deepEqual(conflicts(b), [{ code: 'KeyJ', actions: ['jump', 'pulse'] }]);
  assert.deepEqual(conflicts(DEFAULT_BINDINGS), []);
  // Same scripted input through core with rebound keys gives identical simulation (bindings are web-only).
  const g1 = createGame(5, { random_shades: false }), g2 = createGame(5, { random_shades: false });
  for (let i = 0; i < 60; i++) { step(g1, { ...idle(), move: keyboardMove(new Set(['KeyW']), DEFAULT_BINDINGS) }); step(g2, { ...idle(), move: keyboardMove(new Set(['KeyI']), b) }); }
  assert.deepEqual(g1.player.pos, g2.player.pos);
});
