// Phase 2 (Ticket-02, contract v1.1) evidence capture. Phase 1 script (evidence.mjs) is kept untouched.
// New directory per run: never replace earlier evidence or convert failures to passes.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join('docs', 'proof', 'phase-2', stamp);
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
const near = (a, b, eps = 0.0011) => assert(Math.abs(a - b) <= eps, `${a} != ${b}`);

const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run via npm run evidence:phase2');
run('tests', process.execPath, [npm, 'test']);
run('build', process.execPath, [npm, 'run', 'build']);

const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };
const cases = [
  { name: 'dash', night: 1, ticks: 30, scenario: quiet, frames: [{ tick: 0, dash: true }] },
  { name: 'drifter-steal', night: 2, ticks: 400, scenario: { ...quiet, player: { carried: 6 }, drifters: [{ id: 'D1', pos: [5, 1, 0] }] } },
  { name: 'drifter-pulse-drop', night: 2, ticks: 5, scenario: { ...quiet, player: { carried: 3 }, drifters: [{ id: 'D1', pos: [3, 1, 0], state: 'flee', stolen: 3 }] }, frames: [{ tick: 0, pulse: true }] },
  { name: 'wind-charm', night: 2, ticks: 70, scenario: { ...quiet, player: { pos: [35, 0, 0] } }, frames: [{ tick: 0, move: [0, 0] }, { tick: 1, move: [-1, 0] }, { tick: 61, move: [0, 0] }] },
  { name: 'strong-wind-night3', night: 3, ticks: 1860, scenario: { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [0, 0, -30] } } },
  { name: 'pause', night: 1, ticks: 40, scenario: quiet, frames: [{ tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 30, pause: true }] },
  { name: 'night2-launch-pad', night: 2, ticks: 120, scenario: { ...quiet, player: { pos: [20, 0, 18] } } },
  { name: 'night3-pad-to-tier2', night: 3, ticks: 90, scenario: { ...quiet, player: { pos: [0, 3, 13] } } },
  { name: 'win-scoring', night: 1, ticks: 5, scenario: { ...quiet, time_left_s: 100.5, player: { carried: 10, pos: [0, 0, 24] }, lanterns: [2, 3, 4, 5].map(i => ({ id: `L${i}`, lit: true })) }, frames: [{ tick: 0, interact: true }] },
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

check('oracle-dash', () => { const r = recs('dash'); near(snap(r, 12).player.pos[2], 14 * 12 / 60); assert(ev(r, 'dash').length === 1, 'one dash'); });
check('oracle-drifter-steal', () => { const r = recs('drifter-steal'); const s = ev(r, 'drifter_steal')[0]; assert(s && s.data.amount === 3 && s.data.carried === 3, 'steal 3'); assert(snap(r, s.tick + 240).drifters[0].state === 'removed', 'removed after 240'); assert(ev(r, 'player_hit').length === 0, 'no flame lost'); });
check('oracle-drifter-pulse-drop', () => { const r = recs('drifter-pulse-drop'); assert(ev(r, 'drifter_drop')[0]?.data.amount === 3, 'drop 3'); assert(snap(r, 1).motes.filter(m => m.kind === 'dropped').length === 3, '3 dropped motes'); });
check('oracle-wind-charm', () => { const r = recs('wind-charm'); assert(ev(r, 'charm_picked')[0]?.data.charm_ticks === 600, 'charm 600'); near(snap(r, 1).player.pos[0] - snap(r, 61).player.pos[0], 7.2); });
check('oracle-strong-wind', () => { const r = recs('strong-wind-night3'); assert(snap(r, 1680).wind.warning === true && snap(r, 1800).wind.active === true, 'warning then active'); const a = snap(r, 1800).player.pos, b = snap(r, 1860).player.pos; near(Math.hypot(b[0] - a[0], b[2] - a[2]), 2, 0.01); });
check('oracle-pause', () => { const r = recs('pause'); assert(snap(r, 20).state === 'paused' && snap(r, 20).sim_tick === 10, 'frozen'); assert(ev(r, 'resumed')[0]?.tick === 31, 'resumed'); });
check('oracle-night2-pad', () => { const r = recs('night2-launch-pad'); const l = r.find(x => x.type === 'snapshot' && x.tick > 2 && x.player.grounded); assert(l && l.tick >= 80 && l.tick <= 90, 'flight ~1.4 s'); assert(Math.hypot(l.player.pos[0] - 70, l.player.pos[2]) <= 28, 'lands on island B'); });
check('oracle-night3-pad', () => { const r = recs('night3-pad-to-tier2'); const l = r.find(x => x.type === 'snapshot' && x.tick > 2 && x.player.grounded); assert(l && l.player.pos[1] === 6, 'tier 2'); });
// Independent arithmetic: 10 motes*10 + 1 lantern*100 + floor(100.5 - 1/60)*2 + 3 flames*50
check('oracle-win-scoring', () => { const e = recs('win-scoring').at(-1); assert(e.state === 'won' && e.score === 100 + 100 + 100 * 2 + 150, `score ${e.score}`); });
for (const n of [1, 2, 3]) check(`full-night${n}-deterministic-under-30s`, () => {
  const a = readFileSync(join(dir, `full-night${n}-a.jsonl`)), b = readFileSync(join(dir, `full-night${n}-b.jsonl`));
  assert(a.equals(b), 'outputs differ'); const c = cases.find(x => x.name === `full-night${n}-a`); assert(c.result.ms <= 30000, `${c.result.ms} ms`);
  const end = recs(`full-night${n}-a`).at(-1); assert(end.ticks === [300, 330, 360][n - 1] * 60 && end.state === 'lost', `full night ends at dawn: ${JSON.stringify(end)}`);
  save(`full-night${n}-sha256.json`, { a: createHash('sha256').update(a).digest('hex'), b: createHash('sha256').update(b).digest('hex'), ms_a: c.result.ms });
});
const passed = results.every(r => r.passed);
save('results.json', { passed, results, limitations: ['Headless only: browser play, FPS and screenshots are recorded separately (see docs/verification/phase-2.md).', 'Full-night timing includes tsx startup and JSONL writing.'] });
console.log(`Evidence: ${dir}`); process.exitCode = passed ? 0 : 1;
