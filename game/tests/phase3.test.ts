// Ticket-03 "Đèn cạn dầu" (Contract v1.2): at least one real-CLI headless scenario per changed/new rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'lantern-p3-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
let n = 0;
type Rec = any;
function run(night: number, ticks: number, scenario?: object, frames?: object[], every = 1) {
  const id = n++, out = join(dir, `${id}.jsonl`), args = ['--import', 'tsx', 'game/src/headless.ts', '--seed', '11', '--night', String(night), '--ticks', String(ticks), '--out', out, '--snapshot-every', String(every)];
  if (scenario) { const f = join(dir, `${id}.s.json`); writeFileSync(f, JSON.stringify(scenario)); args.push('--scenario', f); }
  if (frames) { const f = join(dir, `${id}.i.json`); writeFileSync(f, JSON.stringify({ frames })); args.push('--inputs', f); }
  const p = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  const recs: Rec[] = readFileSync(out, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  return { recs, snap: (t: number) => recs.find(r => r.type === 'snapshot' && r.tick === t), events: (name: string) => recs.filter(r => r.type === 'event' && r.name === name), end: recs.at(-1) };
}
const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const lamp = (r: { snap: (t: number) => Rec }, t: number, id = 'L1') => r.snap(t).lanterns.find((l: Rec) => l.id === id);
const far: [number, number, number] = [0, 0, -30];
const dXZ = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);

test('v1.2 snapshot: lantern fuel/ever_lit/relit_count, player capacity, shade target_lantern_id; lit without fuel = 100', () => {
  const r = run(1, 1, { ...quiet, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true, fuel: 42.5, ever_lit: true }] });
  const s = r.snap(0);
  assert.deepEqual(s.lanterns[0], { id: 'L1', pos: [0, 0, 25], lit: true, deposited: 0, fuel: 100, ever_lit: true, relit_count: 0 });
  assert.equal(s.lanterns[1].fuel, 42.5); assert.equal(s.lanterns[2].fuel, 0); assert.equal(s.lanterns[2].ever_lit, false);
  assert.equal(s.player.capacity, 10); assert.equal(r.events('lantern_out').length, 0, 'no events from setup');
});

test('fuel decays 1/s in integer 1/60 units; at 0 the lantern goes out (lantern_out, deposited 0, ever_lit kept)', () => {
  const r = run(1, 700, { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', lit: true, deposited: 10 }, { id: 'L2', lit: true, fuel: 0.5 }] }, undefined, 1);
  assert.equal(lamp(r, 600).fuel, 90); assert.equal(lamp(r, 1).fuel, 100, '99.983 rounds to 1 decimal');
  const out = r.events('lantern_out'); assert.deepEqual(out.map((e: Rec) => [e.tick, e.data.lantern_id]), [[30, 'L2']]);
  const l2 = lamp(r, 30, 'L2'); assert.deepEqual([l2.lit, l2.fuel, l2.deposited, l2.ever_lit], [false, 0, 0, true]);
  assert.equal(lamp(r, 29, 'L2').lit, true);
});

test('refuel: used = min(carried, ceil((100-fuel)/10)), fuel capped at 100, +5 per mote; full lanterns are skipped', () => {
  const r = run(1, 3, { ...quiet, player: { carried: 10, pos: [0, 0, 24] }, lanterns: [{ id: 'L1', lit: true, fuel: 35 }] }, [{ tick: 0, interact: true }]);
  // Fuel after tick-1 decay is 34.983 -> ceil(65.017/10) = 7 motes, 34.983 + 70 -> capped 100.
  assert.deepEqual(r.events('refuel')[0].data, { lantern_id: 'L1', amount: 7, fuel: 100 });
  assert.equal(r.snap(1).player.carried, 3); assert.equal(r.snap(1).score, 35);
  const partial = run(1, 2, { ...quiet, player: { carried: 2, pos: [0, 0, 24] }, lanterns: [{ id: 'L1', lit: true, fuel: 50 }] }, [{ tick: 0, interact: true }]);
  assert.deepEqual(partial.events('refuel')[0].data, { lantern_id: 'L1', amount: 2, fuel: 70 });
  // Nearer full lantern is not selectable: the farther, not-full one gets it. (Fuel 100 minus 1 tick decay is not full,
  // so refill the near one on the same tick it is created is impossible; use a just-lit lantern instead.)
  const choose = run(1, 3, { ...quiet, player: { carried: 20, successful_lights: 5, pos: [0, 0, 0] },
    lanterns: [{ id: 'L1', pos: [1, 0, 0], deposited: 9 }, { id: 'L2', pos: [-1.5, 0, 0], lit: true, fuel: 60 }] },
    [{ tick: 0, interact: true }, { tick: 1, interact: false }, { tick: 1, interact: false }].slice(0, 2).concat([{ tick: 2, interact: true }] as any));
  assert.deepEqual(choose.events('lantern_lit')[0].data, { lantern_id: 'L1', relight: false });
  // Tick 3: L1 was lit at tick 1 and decayed 2 units, so it is not full and is nearer -> it is refuelled with 1 mote.
  assert.deepEqual(choose.events('refuel')[0].data, { lantern_id: 'L1', amount: 1, fuel: 100 });
});

// Assumption (game/README.md): fuel decays in step 2, before interact in step 5, so a lit lantern is never exactly
// full at interact time; a scenario "fuel: 100" lantern is 99.983 and takes 1 mote. The full-lantern skip stays in core.
test('full-lantern rule: a fuel-100 scenario lantern has decayed before interact (1 mote); 0 carried does nothing', () => {
  const r = run(1, 1, { ...quiet, player: { carried: 3, pos: [0, 0, 0] }, lanterns: [{ id: 'L1', pos: [2, 0, 0], lit: true, fuel: 100 }, { id: 'L2', pos: [-2, 0, 0] }] }, [{ tick: 0, interact: true }]);
  // After decay L1 has 99.983 < 100, so it IS a candidate (nearest tie -> L1): it takes ceil(0.0167/10) = 1 mote.
  assert.deepEqual(r.events('refuel')[0].data, { lantern_id: 'L1', amount: 1, fuel: 100 });
  // With 0 carried, interact does nothing at all: no event, no score.
  const none = run(1, 1, { ...quiet, player: { carried: 0, pos: [0, 0, 24] }, lanterns: [{ id: 'L1', lit: true, fuel: 50 }] }, [{ tick: 0, interact: true }]);
  assert.equal(none.events('refuel').length, 0); assert.equal(none.end.score, 0);
});

test('relight: ever_lit lantern costs 5 motes, +40, relight true, relit_count++; capacity = 10 + 2 x lights, max 20', () => {
  const r = run(1, 2, { ...quiet, player: { carried: 8, pos: [0, 0, 24] }, lanterns: [{ id: 'L1', lit: false, ever_lit: true }] }, [{ tick: 0, interact: true }]);
  assert.deepEqual(r.events('deposit')[0].data, { lantern_id: 'L1', amount: 5, deposited: 5 });
  assert.deepEqual(r.events('lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
  const s = r.snap(1); assert.equal(s.score, 5 * 5 + 40); assert.equal(s.player.carried, 3); assert.equal(s.player.capacity, 12);
  assert.deepEqual([lamp(r, 1).fuel, lamp(r, 1).relit_count], [100, 1]);
  const first = run(1, 1, { ...quiet, player: { carried: 10, pos: [0, 0, 24] } }, [{ tick: 0, interact: true }]);
  assert.deepEqual(first.events('lantern_lit')[0].data, { lantern_id: 'L1', relight: false }); assert.equal(first.end.score, 50 + 100);
  const cap = run(1, 1, { ...quiet, player: { successful_lights: 7, carried: 19 }, motes: [[0, 0, 0], [0, 0, 0.5]] });
  assert.equal(cap.snap(0).player.capacity, 20); assert.equal(cap.snap(1).player.carried, 20, 'capped at 20');
  const pre = run(1, 1, { ...quiet, lanterns: [{ id: 'L1', lit: true }] });
  assert.equal(pre.snap(1).player.capacity, 10, 'scenario-lit lanterns do not count as successful lights');
});

test('fuel < 30 loses the safe zone (exactly 30 keeps it); wander shade goes to the nearest weak lantern and drains', () => {
  // Shade 8 m from a lantern at fuel 30.0 + 1 tick decay -> 29.98 (< 30) -> no zone.
  const safe = run(1, 200, { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 60 }], shades: [{ id: 'S1', pos: [8, 0, 0], state: 'wander' }] });
  for (let t = 1; t <= 200; t++) assert.ok(dXZ(safe.snap(t).shades[0].pos, [0, 0, 0]) >= 6 - 1e-9);
  const weak = run(1, 400, { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 29.9 }, { id: 'L2', pos: [20, 0, 0], lit: true, fuel: 10 }], shades: [{ id: 'S1', pos: [5, 0, 0], state: 'wander' }] });
  assert.equal(weak.snap(1).shades[0].target_lantern_id, 'L1', 'nearest weak lantern');
  const t = weak.recs.find(r => r.type === 'snapshot' && r.shades[0].state === 'drain').tick;
  assert.ok(dXZ(weak.snap(t).shades[0].pos, [0, 0, 0]) <= 2 + 1e-9); assert.ok(t >= 115 && t <= 125, `reached at ${t} (3 m at wander 1.5 m/s)`);
  // Drain: 5/s + 1/s decay; event every 60 drain ticks.
  const ev = weak.events('fuel_drain')[0]; assert.equal(ev.tick, t + 60); assert.deepEqual([ev.data.lantern_id, ev.data.shade_id], ['L1', 'S1']);
  assert.equal(ev.data.fuel, Math.round((29.9 * 60 - ev.tick - 5 * 60) / 60 * 10) / 10);
  // Exactly 30.0 still has a zone: an outside shade is still blocked on the first tick (fuel checked after decay).
  const exact = run(1, 1, { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 30 + 1 / 60 }], shades: [{ id: 'S1', pos: [6.01, 0, 0], state: 'wander' }] });
  assert.equal(exact.snap(1).lanterns[0].fuel, 30); assert.ok(dXZ(exact.snap(1).shades[0].pos, [0, 0, 0]) >= 6 - 1e-9);
});

test('drain: two shades stack (5+5+1 per s), lantern goes out, shades return to wander; drain -> chase within 6 m', () => {
  const r = run(1, 200, { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 10 }],
    shades: [{ id: 'S1', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [-1, 0, 0], state: 'drain' }] });
  // 600 units / 11 per tick -> out at tick 55.
  assert.deepEqual(r.events('lantern_out').map((e: Rec) => e.tick), [55]);
  assert.deepEqual(r.snap(56).shades.map((s: Rec) => s.state), ['wander', 'wander']);
  assert.deepEqual(r.snap(54).shades.map((s: Rec) => s.state), ['drain', 'drain']);
  const chase = run(1, 3, { ...quiet, player: { pos: [5.5, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [0, 0, 1.5], state: 'drain' }] });
  assert.equal(chase.snap(1).shades[0].state, 'chase');
  const stay = run(1, 3, { ...quiet, player: { pos: [7, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [0, 0, 1.5], state: 'drain' }] });
  assert.equal(stay.snap(1).shades[0].state, 'drain'); assert.deepEqual(stay.snap(3).shades[0].pos, [0, 0, 1.5], 'stands still');
});

test('refuel to >= 30 with shades inside 6 m: they are evacuated to the edge in 30 ticks, harmless, back to wander', () => {
  const r = run(1, 40, { ...quiet, player: { carried: 5, pos: [0, 0, 2], flames: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 0, 1.5], state: 'drain' }] }, [{ tick: 0, interact: true }]);
  // Ticket order: interact (step 5) precedes shade update (step 8), so the shade is evacuated before it can chase.
  assert.equal(r.events('refuel')[0].data.amount, 5); assert.equal(r.events('player_hit').length, 0);
  assert.equal(r.snap(1).shades[0].state, 'wander');
  assert.ok(Math.abs(dXZ(r.snap(30).shades[0].pos, [0, 0, 0]) - 6) < 1e-6, 'at the edge after 30 ticks');
});

test('pulse: drain shade is stunned for +15 (normal +5); stun always ends in wander', () => {
  const r = run(1, 125, { ...quiet, player: { carried: 6, pos: [0, 0, 4], flames: 99 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 0, 1.5], state: 'drain' }, { id: 'S2', pos: [3, 0, 4], state: 'chase' }] }, [{ tick: 0, pulse: true }]);
  // Player is 2.5 m from S1 (< 6) -> it would chase at step 8, but the pulse (step 7) runs first and stuns both.
  assert.deepEqual(r.events('pulse')[0].data, { stunned_ids: ['S1', 'S2'] }); assert.equal(r.snap(1).score, 15 + 5);
  assert.deepEqual(r.snap(121).shades.map((s: Rec) => s.state === 'stunned'), [false, false]);
  assert.ok(r.snap(121).shades.every((s: Rec) => s.state === 'wander' || s.state === 'chase'));
  // Stun end goes to wander (it may then chase on the same tick's movement step if Mây is within 12 m).
  const lone = run(1, 122, { ...quiet, player: { carried: 3, pos: far }, shades: [{ id: 'S1', pos: [0, 0, -27], state: 'chase' }] }, [{ tick: 0, pulse: true }]);
  assert.equal(lone.snap(121).shades[0].state, 'chase', 'wander -> chase because Mây is within 12 m');
  // Mây far away (30 m > 18 m lose radius): the stun ends in wander, never back to chase/drain/recoil.
  const away = run(1, 2, { ...quiet, player: { pos: far }, shades: [{ id: 'S1', pos: [0, 0, 1.5], state: 'stunned', state_ticks_left: 1 }] });
  assert.equal(away.snap(1).shades[0].state, 'wander');
  // Next to a weak lantern the same shade resumes wander and then re-enters drain in the same tick's step 8.
  const back = run(1, 2, { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [0, 0, 1.5], state: 'stunned', state_ticks_left: 1 }] });
  assert.equal(back.snap(1).shades[0].state, 'drain');
});

test('win at dawn needs ceil(0.6 x total) lit: 3/5, 4/6, 5/7; below -> lost dawn; all lit does not end early', () => {
  const lit = (k: number) => Array.from({ length: k }, (_, i) => ({ id: `L${i + 1}`, lit: true }));
  for (const [night, need] of [[1, 3], [2, 4], [3, 5]] as const) {
    const ok = run(night, 2, { ...quiet, time_left_s: 1 / 60, lanterns: lit(need) });
    assert.deepEqual(ok.events('game_over')[0].data, { result: 'won', reason: 'dawn_survived' }, `night ${night}`);
    assert.equal(ok.end.score, need * (50 + 99) + 3 * 50);
    const no = run(night, 2, { ...quiet, time_left_s: 1 / 60, lanterns: lit(need - 1) });
    assert.deepEqual(no.events('game_over')[0].data, { result: 'lost', reason: 'dawn' }); assert.equal(no.end.score, 0);
  }
  const all = run(1, 600, { ...quiet, player: { pos: far }, lanterns: lit(5) }, undefined, 600);
  assert.equal(all.end.state, 'playing'); assert.equal(all.events('game_over').length, 0);
  // A lantern that runs out on the dawn tick (step 2) is not lit at the win check.
  const out = run(1, 2, { ...quiet, time_left_s: 1 / 60, lanterns: [...lit(2), { id: 'L3', lit: true, fuel: 1 / 60 }] });
  assert.deepEqual(out.events('game_over')[0].data, { result: 'lost', reason: 'dawn' });
});

test('night durations 240 / 270 / 300 s end at dawn; deterministic full night incl. fuel events', () => {
  for (const [night, s] of [[1, 240], [2, 270], [3, 300]] as const) {
    const t0 = Date.now(); const a = run(night, 21600, { player: { flames: 1000 } }, undefined, 600); const ms = Date.now() - t0;
    assert.equal(a.end.ticks, s * 60); assert.ok(ms < 30000, `${ms} ms`);
    const b = run(night, 21600, { player: { flames: 1000 } }, undefined, 600); assert.deepEqual(a.recs, b.recs);
  }
});
