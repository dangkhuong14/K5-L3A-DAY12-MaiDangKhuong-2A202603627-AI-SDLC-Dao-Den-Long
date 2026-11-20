// Phase 1 regression tests, re-based on Ticket-02 standard numbers (speed 6, capacity 10,
// pickup 1.0 m, interact 2.0 m, 3 flames, +10 per deposited mote, +5 per pulse hit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { spawnSync } from 'node:child_process';
import { createGame, idle, step, snapshot, tuning } from '../src/core.ts';
const empty = { random_motes: false, random_shades: false };
const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('manifest tuning matches actual core and contract is v1.1', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.1'); assert.deepEqual(c.tuning, tuning);
});
test('60 ticks move six meters, snapshot0 before inputs', () => {
  const g = createGame(1, empty); assert.equal(snapshot(g).tick, 0);
  for (let i = 0; i < 60; i++) step(g, { ...idle(), move: [0, 1] });
  close(g.player.pos[2], 6); assert.equal(g.time_left_s, 299);
});
test('yaw90 and diagonal normalization', () => {
  const g = createGame(1, empty);
  for (let i = 0; i < 60; i++) step(g, { ...idle(), move: [1, 1], cam_yaw_deg: 90 });
  close(Math.hypot(g.player.pos[0], g.player.pos[2]), 6); assert.ok(g.player.pos[0] > 0 && g.player.pos[2] < 0);
});
test('pickup radius inclusive in XZ, height tolerance, capacity 10', () => {
  const g = createGame(1, { ...empty, player: { carried: 9 }, motes: [[1, 1.5, 0], [0, 0, 0], [0, 0, 1]] });
  const e = step(g, idle()); assert.equal(g.player.carried, 10); assert.equal(g.motes.length, 2); assert.equal(e[0].tick, 1);
  const h = createGame(1, { ...empty, motes: [[0, 1.6, 0]] }); step(h, idle()); assert.equal(h.player.carried, 0, 'too high above ground');
});
test('deposit uses needed amount, scores per deposited mote, lights only once', () => {
  const g = createGame(1, { ...empty, player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 2], deposited: 7 }] });
  const input = { ...idle(), interact: true }; step(g, input);
  assert.equal(g.player.carried, 7); assert.equal(g.lanterns[0].lit, true); assert.equal(g.score, 3 * 10 + 100);
  step(g, { ...idle() }); step(g, input); assert.equal(g.score, 130);
});
test('interact radius 2.0 inclusive, nearest then smaller id', () => {
  const g = createGame(1, { ...empty, player: { carried: 4 }, lanterns: [{ id: 'L2', pos: [2, 0, 0] }, { id: 'L1', pos: [-2, 0, 0] }] });
  const e = step(g, { ...idle(), interact: true });
  assert.deepEqual(e.find(x => x.name === 'deposit')?.data, { lantern_id: 'L1', amount: 4, deposited: 4 });
});
test('pulse costs once on held edge and stuns', () => {
  const g = createGame(1, { ...empty, player: { carried: 10 }, shades: [{ id: 'A', pos: [3, 0, 0] }] });
  const input = { ...idle(), pulse: true }; step(g, input); step(g, input);
  assert.equal(g.player.carried, 7); assert.equal(g.shades[0].state, 'stunned'); assert.equal(g.score, 5);
});
test('scenario initialization: no score/events, partial lamp override', () => {
  const g = createGame(1, { ...empty, lanterns: [{ id: 'L1', lit: true }] });
  assert.equal(g.score, 0); assert.equal(g.lanterns.length, 5); assert.equal(g.lanterns[0].lit, true);
});
test('multiple simultaneous contacts lose one flame, invulnerable afterwards', () => {
  const g = createGame(1, { ...empty, shades: [{ pos: [0, 0, 0] }, { pos: [0, 0, 0] }] });
  step(g, idle()); assert.equal(g.player.flames, 2); step(g, idle()); assert.equal(g.player.flames, 2);
});
test('win stops subsequent steps, adds bonus once', () => {
  const g = createGame(1, { ...empty, lanterns: Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, lit: true })) });
  const events = step(g, idle()); assert.equal(g.state, 'won'); assert.equal(events.at(-1)?.name, 'game_over');
  assert.equal(g.score, 299 * 2 + 3 * 50);
  const score = g.score; assert.deepEqual(step(g, idle()), []); assert.equal(g.tick, 1); assert.equal(g.score, score);
});
test('dawn loss', () => { const g = createGame(1, { ...empty, time_left_s: 1 / 60 }); step(g, idle()); assert.equal(g.state, 'lost'); assert.equal(g.result, 'dawn'); });
test('deterministic generated world', () => assert.deepEqual(snapshot(createGame(42)), snapshot(createGame(42))));
test('CLI persistent frames, deterministic output, error code 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-test-'));
  try {
    const scenario = join(dir, 'scenario.json'), inputs = join(dir, 'inputs.json'), a = join(dir, 'a.jsonl'), b = join(dir, 'b.jsonl');
    writeFileSync(scenario, JSON.stringify(empty));
    writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 1, interact: true }] }));
    const run = (out: string) => spawnSync(process.execPath, ['--import', 'tsx', 'game/src/headless.ts', '--seed', '1', '--night', '1', '--ticks', '60', '--scenario', scenario, '--inputs', inputs, '--out', out], { encoding: 'utf8' });
    assert.equal(run(a).status, 0); assert.equal(run(b).status, 0);
    assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
    const lines = readFileSync(a, 'utf8').trim().split('\n').map(x => JSON.parse(x));
    assert.equal(lines[0].tick, 0); assert.equal(lines.at(-1).type, 'end');
    assert.equal(lines.find(x => x.type === 'snapshot' && x.tick === 60).player.pos[2], 6);
    writeFileSync(inputs, '{"frames":[{"tick":0},{"tick":0}]}'); assert.equal(run(a).status, 2);
    writeFileSync(inputs, '{not json'); assert.equal(run(a).status, 2);
  } finally { rmSync(dir, { recursive: true }); }
});
