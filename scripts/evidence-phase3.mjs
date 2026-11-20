// Phase 3 (Ticket-03 "Đèn cạn dầu", contract v1.2) evidence capture. Phase 1/2 scripts are kept as history:
// their oracles encode the replaced rules (300/330/360 s nights, all_lit win, +10/mote, time bonus).
// New directory per run: never replace earlier evidence or convert failures to passes.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join('docs', 'proof', 'phase-3', stamp);
mkdirSync(dir, { recursive: true });
const save = (name, data) => writeFileSync(join(dir, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim() ?? 'unavailable';
save('environment.json', { created_at: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch, commit: git('rev-parse', 'HEAD'), working_tree: git('status', '--short', '--untracked-files=normal'), note: 'Working-tree run. If later tagged, verify the tagged source matches this run.' });

const results = [];
function run(label, cmd, args) {
  const t0 = Date.now(); const p = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); const ms = Date.now() - t0;
  save(label + '.stdout.txt', p.stdout ?? ''); save(label + '.stderr.txt', (p.stderr ?? '') + (p.error ? String(p.error) : ''));
  const r = { label, command: cmd === process.execPath ? 'node' : cmd, args: args.map(x => x === process.env.npm_execpath ? '<npm-cli>' : x), exit_code: p.status, ms, passed: p.status === 0 };
  results.push(r); console.log(`${r.passed ? 'PASS' : 'FAIL'} ${label} (${ms} ms)`); return r;
}
function check(label, fn) { try { fn(); results.push({ label, passed: true }); console.log('PASS ' + label); } catch (e) { results.push({ label, passed: false, error: String(e) }); console.error('FAIL ' + label + ': ' + e.message); } }
const assert = (c, m) => { if (!c) throw new Error(m); };

const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run via npm run evidence:phase3');
run('tests', process.execPath, [npm, 'test']);
run('build', process.execPath, [npm, 'run', 'build']);
run('headless-cli', process.execPath, [npm, 'run', '--silent', 'headless', '--', '--seed', '42', '--night', '1', '--ticks', '600', '--out', join(dir, 'headless-cli.jsonl')]);

const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const far = [0, 0, -30];
const lit = k => Array.from({ length: k }, (_, i) => ({ id: `L${i + 1}`, lit: true }));
const cases = [
  { name: 'fuel-decay-out', night: 1, ticks: 120, scenario: { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', lit: true, fuel: 1 }] } },
  { name: 'refuel', night: 1, ticks: 2, scenario: { ...quiet, player: { carried: 2, pos: [0, 0, 24] }, lanterns: [{ id: 'L1', lit: true, fuel: 50 }] }, frames: [{ tick: 0, interact: true }] },
  { name: 'relight', night: 1, ticks: 2, scenario: { ...quiet, player: { carried: 8, pos: [0, 0, 24] }, lanterns: [{ id: 'L1', ever_lit: true }] }, frames: [{ tick: 0, interact: true }] },
  { name: 'capacity-max', night: 1, ticks: 1, scenario: { ...quiet, player: { successful_lights: 9, carried: 19 }, motes: [[0, 0, 0], [0, 0, 0.5]] } },
  { name: 'drain-stack', night: 1, ticks: 70, scenario: { ...quiet, player: { pos: far }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 10 }], shades: [{ id: 'S1', pos: [1, 0, 0], state: 'drain' }, { id: 'S2', pos: [-1, 0, 0], state: 'drain' }] } },
  { name: 'drain-pulse', night: 1, ticks: 2, scenario: { ...quiet, player: { carried: 3, pos: [0, 0, 4] }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [0, 0, 1.5], state: 'drain' }] }, frames: [{ tick: 0, pulse: true }] },
  { name: 'dawn-win-3of5', night: 1, ticks: 2, scenario: { ...quiet, time_left_s: 1 / 60, lanterns: lit(3) } },
  { name: 'dawn-lose-2of5', night: 1, ticks: 2, scenario: { ...quiet, time_left_s: 1 / 60, lanterns: lit(2) } },
  { name: 'dawn-win-4of6', night: 2, ticks: 2, scenario: { ...quiet, time_left_s: 1 / 60, lanterns: lit(4) } },
  { name: 'dawn-win-5of7', night: 3, ticks: 2, scenario: { ...quiet, time_left_s: 1 / 60, lanterns: lit(5) } },
  { name: 'no-flames-beats-dawn', night: 1, ticks: 2, scenario: { ...quiet, time_left_s: 1 / 60, player: { flames: 1 }, lanterns: lit(5), shades: [{ id: 'S1', pos: [0, 0, 0] }] } },
  { name: 'all-lit-keeps-playing', night: 1, ticks: 600, scenario: { ...quiet, player: { pos: far }, lanterns: lit(5) }, every: 600 },
  ...[1, 2, 3].flatMap(n => ['a', 'b'].map(v => ({ name: `full-night${n}-${v}`, night: n, ticks: 21600, scenario: { player: { flames: 1000 } }, every: 600 })))
];
for (const c of cases) {
  const args = ['--import', 'tsx', 'game/src/headless.ts', '--seed', '42', '--night', String(c.night), '--ticks', String(c.ticks), '--out', join(dir, c.name + '.jsonl'), '--snapshot-every', String(c.every ?? 1)];
  if (c.scenario) { save(c.name + '.scenario.json', c.scenario); args.push('--scenario', join(dir, c.name + '.scenario.json')); }
  if (c.frames) { save(c.name + '.inputs.json', { frames: c.frames }); args.push('--inputs', join(dir, c.name + '.inputs.json')); }
  c.result = run(c.name, process.execPath, args);
}
const recs = name => readFileSync(join(dir, name + '.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
const snap = (r, t) => r.find(x => x.type === 'snapshot' && x.tick === t);
const ev = (r, n) => r.filter(x => x.type === 'event' && x.name === n);
const over = name => ev(recs(name), 'game_over')[0]?.data;

check('oracle-contract-v1.2', () => { const c = JSON.parse(readFileSync('game.contract.json', 'utf8')); assert(c.contract_version === '1.2', c.contract_version);
  for (const [k, v] of Object.entries({ fuel_max: 100, fuel_decay_per_s: 1, fuel_per_mote: 10, relight_cost: 5, win_ratio: 0.6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20, night1_duration_s: 240, night2_duration_s: 270, night3_duration_s: 300 })) assert(c.tuning[k] === v, `${k}=${c.tuning[k]}`); });
check('oracle-headless-cli-v1.2-shape', () => { const r = readFileSync(join(dir, 'headless-cli.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)); const s = r[0];
  assert(s.type === 'snapshot' && r[1].name === 'night_start', 'snapshot0 then night_start'); assert(s.player.capacity === 10, 'capacity'); assert(s.lanterns.every(l => 'fuel' in l && 'ever_lit' in l && 'relit_count' in l), 'lantern fields'); assert(s.time_left_s === 240, 'night 1 = 240 s'); });
// Fuel 1.0 = 60 units at 1 unit/tick -> out at tick 60.
check('oracle-fuel-decay-out', () => { const r = recs('fuel-decay-out'); const o = ev(r, 'lantern_out'); assert(o.length === 1 && o[0].tick === 60, JSON.stringify(o)); const l = snap(r, 60).lanterns[0]; assert(!l.lit && l.fuel === 0 && l.ever_lit && l.deposited === 0, JSON.stringify(l)); });
// Fuel 49.98 -> ceil(50.02/10)=6 needed, carried 2 -> used 2 -> 69.98 -> 1 decimal 70.
check('oracle-refuel', () => { const r = recs('refuel'); const e = ev(r, 'refuel')[0]; assert(e && e.data.amount === 2 && e.data.fuel === 70, JSON.stringify(e)); assert(snap(r, 1).score === 10, 'score 2*5'); });
check('oracle-relight', () => { const r = recs('relight'); assert(ev(r, 'deposit')[0].data.amount === 5, 'cost 5'); assert(ev(r, 'lantern_lit')[0].data.relight === true, 'relight'); const s = snap(r, 1); assert(s.score === 25 + 40 && s.player.capacity === 12 && s.lanterns[0].relit_count === 1, JSON.stringify([s.score, s.player.capacity])); });
check('oracle-capacity-max', () => { const r = recs('capacity-max'); assert(snap(r, 1).player.capacity === 20 && snap(r, 1).player.carried === 20, 'max 20'); });
// 600 units / (1 decay + 5 + 5) per tick -> 54.5 -> out at tick 55.
check('oracle-drain-stack', () => { const r = recs('drain-stack'); assert(ev(r, 'lantern_out')[0]?.tick === 55, 'out at 55'); assert(snap(r, 56).shades.every(s => s.state === 'wander'), 'back to wander'); });
check('oracle-drain-pulse+15', () => { const r = recs('drain-pulse'); assert(snap(r, 1).shades[0].state === 'stunned' && snap(r, 1).score === 15, `score ${snap(r, 1).score}`); });
// Dawn bonus: k lit * (50 + floor(99.98)) + 3 flames * 50.
for (const [name, k] of [['dawn-win-3of5', 3], ['dawn-win-4of6', 4], ['dawn-win-5of7', 5]]) check(`oracle-${name}`, () => { const d = over(name); assert(d?.result === 'won' && d.reason === 'dawn_survived', JSON.stringify(d)); assert(recs(name).at(-1).score === k * 149 + 150, 'score'); });
check('oracle-dawn-lose-2of5', () => { const d = over('dawn-lose-2of5'); assert(d?.result === 'lost' && d.reason === 'dawn', JSON.stringify(d)); assert(recs('dawn-lose-2of5').at(-1).score === 0, 'no bonus when losing'); });
check('oracle-no-flames-first', () => { const d = over('no-flames-beats-dawn'); assert(d?.reason === 'no_flames', JSON.stringify(d)); });
check('oracle-all-lit-keeps-playing', () => { const r = recs('all-lit-keeps-playing'); assert(r.at(-1).state === 'playing' && ev(r, 'game_over').length === 0, 'still playing'); });
for (const n of [1, 2, 3]) check(`full-night${n}-deterministic-under-30s`, () => {
  const a = readFileSync(join(dir, `full-night${n}-a.jsonl`)), b = readFileSync(join(dir, `full-night${n}-b.jsonl`));
  assert(a.equals(b), 'outputs differ'); const c = cases.find(x => x.name === `full-night${n}-a`); assert(c.result.ms <= 30000, `${c.result.ms} ms`);
  const r = recs(`full-night${n}-a`), end = r.at(-1); assert(end.ticks === [240, 270, 300][n - 1] * 60, `full night ends at dawn: ${JSON.stringify(end)}`);
  save(`full-night${n}-sha256.json`, { a: createHash('sha256').update(a).digest('hex'), b: createHash('sha256').update(b).digest('hex'), ms_a: c.result.ms, end, fuel_events: { lantern_out: ev(r, 'lantern_out').length, fuel_drain: ev(r, 'fuel_drain').length } });
});
const passed = results.every(r => r.passed);
save('results.json', { passed, results, limitations: ['Headless only: browser play, FPS and screenshots are recorded separately (see docs/verification/phase-3.md).', 'Full-night timing includes tsx startup and JSONL writing.'] });
console.log(`Evidence: ${dir}`); process.exitCode = passed ? 0 : 1;
