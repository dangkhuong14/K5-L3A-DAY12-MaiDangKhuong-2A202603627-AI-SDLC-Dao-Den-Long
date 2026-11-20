// Shade rules per Ticket-02. Phase 1's "2 s pulse zone that follows the player" was replaced by
// the standard: stun 120 ticks + 4 m push over 15 ticks; lit lanterns block at the 6 m edge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, idle, step, snapshot, tuning, rules } from '../src/core.ts';
const base = { random_motes: false, random_shades: false };
const dXZ = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);

test('pulse: stun 120 ticks, 4 m push in first 15 ticks, re-pulse refreshes, never removes', () => {
  const g = createGame(1, { ...base, player: { carried: 9, flames: 99 }, shades: [{ id: 'S', pos: [2, 0, 0] }] });
  step(g, { ...idle(), pulse: true }); assert.equal(g.shades[0].state, 'stunned');
  for (let i = 0; i < 14; i++) step(g, idle());
  assert.ok(Math.abs(g.shades[0].pos[0] - 6) < 1e-9, `pushed to ${g.shades[0].pos[0]}`);
  for (let i = 0; i < 20; i++) step(g, idle()); assert.ok(Math.abs(g.shades[0].pos[0] - 6) < 1e-9, 'no more push after 15 ticks');
  for (let i = 0; i < 84; i++) step(g, idle()); assert.equal(g.tick, 119); step(g, idle()); assert.equal(g.tick, 120); assert.equal(g.shades[0].state, 'stunned', 'stunned ticks 1..120 inclusive');
  step(g, idle()); assert.equal(g.tick, 121); assert.notEqual(g.shades[0].state, 'stunned');
  assert.equal(g.shades.length, 1);
});
test('pulse uses 3D distance from foot + 0.8 m, requires 3 motes and cooldown', () => {
  const g = createGame(1, { ...base, player: { carried: 6 }, shades: [{ id: 'near', pos: [4.9, 0, 0] }, { id: 'high', pos: [0, 5.7, 0] }, { id: 'out', pos: [0, 5.9, 0] }] });
  const e = step(g, { ...idle(), pulse: true });
  assert.deepEqual(e.find(x => x.name === 'pulse')?.data, { stunned_ids: ['high', 'near'] });
  step(g, idle()); const e2 = step(g, { ...idle(), pulse: true }); assert.equal(e2.length, 0, 'cooldown 3 s');
  const h = createGame(1, { ...base, player: { carried: 2 } }); assert.equal(step(h, { ...idle(), pulse: true }).length, 0);
});
test('newly lit lantern evacuates inside shades to the edge within 30 ticks without damage', () => {
  const g = createGame(1, { ...base, player: { carried: 10, pos: [0, 0, 1] }, lanterns: [{ id: 'L1', pos: [0, 0, 0] }], shades: [{ id: 'S', pos: [1, 0, 1] }] });
  for (let i = 0; i < 30; i++) { step(g, { ...idle(), interact: i === 0 }); assert.equal(g.player.flames, 3); }
  assert.ok(Math.abs(dXZ([0, 0, 0], g.shades[0].pos) - tuning.safe_radius) < 1e-6);
  for (let i = 0; i < 200; i++) { step(g, idle()); assert.ok(dXZ([0, 0, 0], g.shades[0].pos) >= tuning.safe_radius - 1e-9); }
});
test('outside shades are blocked at the 6 m edge of a lit lantern', () => {
  const g = createGame(1, { ...base, player: { pos: [0, 0, 1] }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ pos: [8, 0, 0] }] });
  for (let i = 0; i < 400; i++) { step(g, idle()); assert.ok(dXZ([0, 0, 0], g.shades[0].pos) >= tuning.safe_radius - 1e-9); }
  assert.equal(g.player.flames, 3);
});
test('shade chases at 4 m/s within 12 m, ignores farther player, hit causes recoil + drop', () => {
  const g = createGame(1, { ...base, player: { carried: 7 }, shades: [{ id: 'S1', pos: [10, 0, 0], state: 'wander' }] });
  step(g, idle()); assert.equal(g.shades[0].state, 'chase'); assert.ok(Math.abs(g.shades[0].pos[0] - (10 - 4 / 60)) < 1e-9);
  let hit; for (let i = 0; i < 200 && !hit; i++) hit = step(g, idle()).find(e => e.name === 'player_hit');
  assert.deepEqual(hit?.data, { by: 'shade', flames: 2, dropped: 3 }); assert.equal(g.player.carried, 4);
  assert.equal(g.shades[0].state, 'recoil'); assert.equal(g.motes.filter(m => m.kind === 'dropped').length, 3);
  for (const m of g.motes) { const d = dXZ(m.pos, g.player.pos); assert.ok(d >= 1.5 - 1e-9 && d <= 2.5 + 1e-9); assert.equal(m.ttl, 480); }
  const far = createGame(1, { ...base, shades: [{ pos: [20, 0, 0], state: 'wander' }] }); step(far, idle()); assert.equal(far.shades[0].state, 'wander');
});
test('coincident pursuers separate, keep all IDs and deterministic replay', () => {
  const scenario = { ...base, player: { flames: 100 }, shades: Array.from({ length: 4 }, (_, i) => ({ id: `S${i}`, pos: [3, 0, 0] })) };
  const a = createGame(5, scenario), b = createGame(5, scenario);
  for (let i = 0; i < 90; i++) { step(a, idle()); step(b, idle()); }
  assert.deepEqual(snapshot(a), snapshot(b)); assert.equal(a.shades.length, 4);
});
test('spawn schedule night 1: 2 at tick 300, 1 per 480 ticks, max 6, >= 15 m from player, ids S1..', () => {
  const g = createGame(3, { random_motes: false });
  const spawned: { tick: number; id: string }[] = [];
  for (let i = 0; i < 300 + 480 * 6; i++) for (const e of step(g, { ...idle(), pause: false })) if (e.name === 'shade_spawned') spawned.push({ tick: e.tick, id: e.data.id as string });
  // player gets hit and may lose; only check what happened before game over
  assert.deepEqual(spawned.slice(0, 2), [{ tick: 300, id: 'S1' }, { tick: 300, id: 'S2' }]);
  if (spawned[2]) assert.deepEqual(spawned[2], { tick: 780, id: 'S3' });
  assert.ok(spawned.length <= 6);
  const s = createGame(3, { random_motes: false, player: { flames: 99 } }); for (let i = 0; i < 300; i++) step(s, idle());
  assert.equal(s.shades[0].state, 'spawning'); for (const sh of s.shades) assert.ok(dXZ(sh.pos, s.player.pos) >= rules.shade_spawn_min_dist);
});
