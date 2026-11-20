// Ticket-02 headless scenarios: at least one CLI scenario per new feature (Contract v1.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'lantern-p2-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
let n = 0;
type Rec = any;
function run(night: number, ticks: number, scenario?: object, frames?: object[], extra: string[] = []) {
  const id = n++, out = join(dir, `${id}.jsonl`), args = ['--import', 'tsx', 'game/src/headless.ts', '--seed', '7', '--night', String(night), '--ticks', String(ticks), '--out', out, ...extra];
  if (scenario) { const f = join(dir, `${id}.s.json`); writeFileSync(f, JSON.stringify(scenario)); args.push('--scenario', f); }
  if (frames) { const f = join(dir, `${id}.i.json`); writeFileSync(f, JSON.stringify({ frames })); args.push('--inputs', f); }
  const p = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  const recs: Rec[] = readFileSync(out, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  return { recs, snap: (t: number) => recs.find(r => r.type === 'snapshot' && r.tick === t), events: (name: string) => recs.filter(r => r.type === 'event' && r.name === name), end: recs.at(-1) };
}
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const close = (a: number, b: number, eps = 0.0011) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('v1.1 snapshot shape, night_start event, --night 2/3 accepted, bad night exits 2', () => {
  for (const night of [1, 2, 3]) {
    const r = run(night, 1, undefined, undefined, ['--snapshot-every', '1']);
    const s = r.recs[0];
    assert.equal(s.night, night); assert.deepEqual(Object.keys(s.wind).slice(0, 2), ['active', 'dir_deg']);
    for (const k of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(k in s.player, k);
    for (const k of ['motes', 'drifters', 'charms']) assert.ok(Array.isArray(s[k]), k);
    assert.deepEqual(r.events('night_start')[0].data, { night });
    assert.equal(s.lanterns.length, [5, 6, 7][night - 1]); assert.equal(s.motes.length, 20);
  }
  const p = spawnSync(process.execPath, ['--import', 'tsx', 'game/src/headless.ts', '--seed', '1', '--night', '4', '--ticks', '1', '--out', join(dir, 'x.jsonl')]);
  assert.equal(p.status, 2);
});

test('dash: 14 m/s for 12 ticks (2.8 m), facing when idle, cooldown 90 ticks from start, keeps altitude in air', () => {
  const r = run(1, 100, quiet, [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 90, dash: true }], ['--snapshot-every', '1']);
  assert.equal(r.events('dash').length, 2); close(r.snap(12).player.pos[2], 2.8); close(r.snap(20).player.pos[2], 2.8);
  assert.deepEqual(r.events('dash').map((e: Rec) => e.tick), [1, 91]);
  const air = run(1, 30, quiet, [{ tick: 0, jump: true }, { tick: 10, dash: true }], ['--snapshot-every', '1']);
  close(air.snap(11).player.pos[1], air.snap(10).player.pos[1]); close(air.snap(22).player.pos[1], air.snap(10).player.pos[1]);
});

test('jump: 7 m/s, gravity 20, only from ground, lands after 42 ticks', () => {
  const r = run(1, 60, quiet, [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 5, jump: true }], ['--snapshot-every', '1']);
  close(r.snap(21).player.pos[1], 7 * 0.35 - 10 * 0.35 * 0.35); assert.equal(r.snap(42).player.grounded, true); close(r.snap(42).player.pos[1], 0);
  assert.equal(r.snap(50).player.pos[1], 0, 'second press while airborne ignored');
});

test('fall off island: -1 flame, lose all motes, wait 60 ticks, respawn at start with invuln 90', () => {
  const r = run(1, 200, { ...quiet, player: { pos: [39.5, 0, 0], carried: 6 } }, [{ tick: 0, move: [1, 0] }, { tick: 10, move: [0, 0] }], ['--snapshot-every', '1']);
  const hit = r.events('player_hit')[0];
  assert.deepEqual(hit.data, { by: 'fall', flames: 2, dropped: 0, lost: 6 });
  const s = r.snap(hit.tick + 60); assert.deepEqual(s.player.pos, [0, 0, 0]); close(s.player.invuln, 1.5);
  assert.equal(r.snap(hit.tick + 59).player.carried, 0); assert.equal(r.events('player_hit').length, 1);
  const dead = run(1, 200, { ...quiet, player: { pos: [39.5, 0, 0], flames: 1 } }, [{ tick: 0, move: [1, 0] }]);
  assert.equal(dead.end.state, 'lost'); assert.deepEqual(dead.events('game_over')[0].data, { result: 'lost', reason: 'no_flames' });
});

test('night 2 launch pad flies ~1.4 s to the other island; bridge is walkable', () => {
  const r = run(2, 140, quiet, [{ tick: 0, move: [0, 0] }], ['--snapshot-every', '1']);
  assert.equal(r.snap(10).player.pos[0], 0);
  const pad = run(2, 140, { ...quiet, player: { pos: [20, 0, 18] } }, undefined, ['--snapshot-every', '1']);
  assert.ok(pad.snap(2).player.vel[1] > 13); assert.equal(pad.snap(2).player.grounded, false);
  const landed = pad.recs.find((x: Rec) => x.type === 'snapshot' && x.tick > 2 && x.player.grounded);
  assert.ok(landed.tick >= 80 && landed.tick <= 90, `landed at ${landed.tick}`);
  assert.ok(Math.hypot(landed.player.pos[0] - 70, landed.player.pos[2]) <= 28, 'lands on island B');
  const bridge = run(2, 200, { ...quiet, player: { pos: [25, 0, 0] } }, [{ tick: 0, move: [-1, 0] }]);
  assert.equal(bridge.events('player_hit').length, 0); assert.ok(bridge.end.ticks === 200);
});

test('night 3: cliffs block, ramp climbs to tier 1, pad lands on tier 2, tower blocks', () => {
  const wall = run(3, 120, quiet, [{ tick: 0, move: [0, 1] }], ['--snapshot-every', '1']); // from (0,0,-20) north to tier 2 cliff at r=8
  assert.ok(wall.snap(120).player.pos[2] <= -8 + 1e-6 && wall.snap(120).player.pos[1] === 0);
  // ramp at 30 deg: foot at r=30 → top at r=24. Walk inward along -radial direction.
  const a = Math.PI / 6, foot = [31 * Math.cos(a), 0, 31 * Math.sin(a)];
  const ramp = run(3, 120, { ...quiet, player: { pos: foot } }, [{ tick: 0, move: [-1, 0], cam_yaw_deg: -30 }], ['--snapshot-every', '1']);
  const top = ramp.recs.filter((x: Rec) => x.type === 'snapshot').map((x: Rec) => x.player.pos[1]);
  assert.equal(Math.max(...top), 3, 'reached tier 1');
  const pad = run(3, 90, { ...quiet, player: { pos: [0, 3, 13] } }, undefined, ['--snapshot-every', '1']);
  const land = pad.recs.find((x: Rec) => x.type === 'snapshot' && x.tick > 2 && x.player.grounded);
  assert.equal(land.player.pos[1], 6); assert.ok(land.player.pos[2] < 8 && land.player.pos[2] > 2);
});

test('drifter: chases at >=5 motes, steals min(3,carried) once, flees 240 ticks then removed; invuln does not protect', () => {
  const r = run(2, 400, { ...quiet, player: { carried: 6, invuln_ticks: 300 }, drifters: [{ id: 'D1', pos: [5, 1, 0] }] }, undefined, ['--snapshot-every', '1']);
  const steal = r.events('drifter_steal')[0]; assert.deepEqual(steal.data, { drifter_id: 'D1', amount: 3, carried: 3 });
  assert.equal(r.snap(steal.tick).drifters[0].state, 'flee'); assert.equal(r.snap(steal.tick + 240).drifters[0].state, 'removed');
  assert.equal(r.events('player_hit').length, 0);
  const idle = run(2, 30, { ...quiet, player: { carried: 4 }, drifters: [{ id: 'D1', pos: [5, 1, 0] }] }, undefined, ['--snapshot-every', '1']);
  assert.equal(idle.snap(30).drifters[0].state, 'idle');
});

test('drifter + pulse: chase -> flee without stealing; flee with loot drops it as dropped motes, removed after 120', () => {
  const r = run(2, 10, { ...quiet, player: { carried: 6 }, drifters: [{ id: 'D1', pos: [3, 1, 0], state: 'chase' }] }, [{ tick: 0, pulse: true }], ['--snapshot-every', '1']);
  assert.equal(r.events('drifter_steal').length, 0);
  assert.equal(r.snap(1).drifters[0].state, 'flee');
  const loot = run(2, 200, { ...quiet, player: { carried: 3 }, drifters: [{ id: 'D1', pos: [3, 1, 0], state: 'flee', stolen: 3 }] }, [{ tick: 0, pulse: true }], ['--snapshot-every', '1']);
  assert.deepEqual(loot.events('drifter_drop')[0].data, { drifter_id: 'D1', amount: 3 });
  assert.equal(loot.snap(1).motes.filter((m: Rec) => m.kind === 'dropped').length, 3);
  assert.equal(loot.snap(120).drifters[0].state, 'flee'); assert.equal(loot.snap(121).drifters[0].state, 'removed');
});

test('drifter schedule: D1 at tick 1200 on night 2, none on night 1', () => {
  const r = run(2, 1201, { random_motes: false, random_shades: false, player: { flames: 3 } }, undefined, ['--snapshot-every', '1']);
  assert.equal(r.snap(1199).drifters.length, 0); assert.equal(r.snap(1200).drifters[0].id, 'D1');
  const one = run(1, 1201, { random_motes: false, random_shades: false }, undefined, ['--snapshot-every', '1201']);
  assert.equal(one.end.ticks, 1201);
});

test('wind charm: 600 ticks of 7.2 m/s and dash without cooldown; respawn after 2700', () => {
  const r = run(2, 140, { ...quiet, player: { pos: [35, 0, 0] } }, [{ tick: 0, move: [0, 0] }, { tick: 1, move: [-1, 0] }, { tick: 61, move: [0, 0] }, { tick: 70, dash: true }, { tick: 71, dash: false }, { tick: 72, dash: true }, { tick: 73, dash: false }, { tick: 90, dash: true }], ['--snapshot-every', '1']);
  assert.deepEqual(r.events('charm_picked')[0].data, { charm_id: 'C1', charm_ticks: 600 });
  close(r.snap(1).player.pos[0] - r.snap(61).player.pos[0], 7.2);
  assert.deepEqual(r.events('dash').map((e: Rec) => e.tick), [71, 91], 'press during dash ignored, no cooldown after');
  const c = r.snap(1).charms[0]; assert.equal(c.available, false); close(c.respawn_s, 45);
});

test('wind on night 3: warning at 1680, active 1800..2099, pushes 2 m/s; wind_enabled false disables', () => {
  const r = run(3, 2110, { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [0, 0, -30] } }, undefined, ['--snapshot-every', '1']);
  assert.equal(r.snap(1679).wind.active, false); assert.equal(r.snap(1680).wind.warning, true);
  assert.equal(r.snap(1800).wind.active, true); assert.equal(r.snap(2099).wind.active, true); assert.equal(r.snap(2100).wind.active, false);
  const p0 = r.snap(1800).player.pos, p1 = r.snap(1860).player.pos; close(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]), 2, 0.01);
  const off = run(3, 1810, { ...quiet }, undefined, ['--snapshot-every', '1810']); assert.equal(off.end.ticks, 1810);
  assert.equal(off.recs.filter((x: Rec) => x.type === 'snapshot').at(-1).wind.active, false);
});

test('pause: tick advances, sim_tick/time/cooldowns freeze, state paused, events paused/resumed', () => {
  const r = run(1, 40, { ...quiet, player: { carried: 5 } }, [{ tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 30, pause: true }], ['--snapshot-every', '1']);
  assert.equal(r.events('paused')[0].tick, 11); assert.equal(r.snap(20).state, 'paused'); assert.equal(r.snap(20).sim_tick, 10);
  assert.deepEqual(r.snap(20).player.pos, r.snap(11).player.pos); assert.equal(r.snap(20).time_left_s, r.snap(10).time_left_s);
  assert.equal(r.events('resumed')[0].tick, 31); assert.equal(r.snap(31).sim_tick, 11); assert.equal(r.snap(31).state, 'playing');
});

test('motes: 20 distinct start points, +1 every 240 ticks up to the point count, dropped TTL 480', () => {
  const r = run(1, 241, { random_shades: false }, undefined, ['--snapshot-every', '1']);
  const ms = r.snap(0).motes; assert.equal(ms.length, 20); assert.equal(new Set(ms.map((m: Rec) => m.pos.join())).size, 20);
  assert.equal(r.snap(239).motes_active, 20); assert.equal(r.snap(240).motes_active, 21);
  const drop = run(1, 482, { ...quiet, motes: [{ pos: [30, 0, 0], kind: 'dropped', ttl_s: 8 }] }, undefined, ['--snapshot-every', '1']);
  assert.equal(drop.snap(479).motes.length, 1); assert.equal(drop.snap(480).motes.length, 0);
});

// Ticket-03 replaced this Ticket-02 test ("same-tick win beats dawn; no_flames beats all_lit; bonus = floor(time)*2"):
// all_lit and the time bonus no longer exist. The same-tick ordering it guarded is kept: lighting on the dawn tick counts,
// and no_flames still wins over a dawn win.
test('same-tick: lantern lit on the dawn tick counts for the 3/5 threshold; no_flames beats dawn_survived', () => {
  const two = [{ id: 'L2', lit: true, fuel: 50 }, { id: 'L3', lit: true, fuel: 50 }];
  const win = run(1, 5, { ...quiet, time_left_s: 1 / 60, player: { carried: 10, pos: [0, 0, 24] }, lanterns: two }, [{ tick: 0, interact: true }]);
  assert.deepEqual(win.events('game_over')[0].data, { result: 'won', reason: 'dawn_survived' });
  // 10 motes*5 + first light 100 + L1 (50+100) + L2,L3 (50+49 each, after 1 tick decay) + 3 flames*50
  assert.equal(win.end.score, 50 + 100 + 150 + 2 * 99 + 150);
  const all = Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: true }));
  const both = run(1, 5, { ...quiet, time_left_s: 1 / 60, player: { flames: 1 }, lanterns: all, shades: [{ id: 'S1', pos: [0, 0, 0] }] });
  assert.deepEqual(both.events('game_over')[0].data, { result: 'lost', reason: 'no_flames' });
});

test('deterministic full-night replay incl. generated ids, and full night within 30 s', () => {
  for (const night of [1, 2, 3]) {
    const t0 = Date.now(); const a = run(night, 21600, { player: { flames: 1000 } }); const ms = Date.now() - t0;
    const b = run(night, 21600, { player: { flames: 1000 } });
    assert.deepEqual(a.recs, b.recs); assert.ok(ms < 30000, `night ${night} took ${ms} ms`);
    assert.ok(a.events('shade_spawned').length > 0);
  }
});
