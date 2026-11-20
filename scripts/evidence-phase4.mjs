// Phase 4 (Ticket-04 "Bình minh", contract v1.3) evidence capture. New directory per run; never edits earlier evidence.
//   npm run evidence:phase4            → tests, build, headless v1.2 ≡ v1.3, soak, bench (opens a 1280×720 window ~35 s)
//   EVIDENCE_NO_BENCH=1 npm run evidence:phase4   → skip the bench (reported as NOT RUN, not as pass)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join('docs', 'proof', 'phase-4', stamp);
mkdirSync(dir, { recursive: true });
const save = (name, data) => writeFileSync(join(dir, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim() ?? 'unavailable';
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
save('environment.json', { created_at: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch, commit: git('rev-parse', 'HEAD'), working_tree: git('status', '--short', '--untracked-files=normal'), note: 'Working-tree run. If later tagged, verify the tagged source matches this run.' });

const results = [];
function run(label, cmd, args, opts = {}) {
  const t0 = Date.now(); const p = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts }); const ms = Date.now() - t0;
  save(label + '.stdout.txt', p.stdout ?? ''); save(label + '.stderr.txt', (p.stderr ?? '') + (p.error ? String(p.error) : ''));
  const r = { label, command: cmd === process.execPath ? 'node' : cmd, args: args.map(x => x === process.env.npm_execpath ? '<npm-cli>' : x), exit_code: p.status, ms, passed: p.status === 0 };
  results.push(r); console.log(`${r.passed ? 'PASS' : 'FAIL'} ${label} (${ms} ms)`); return r;
}
function check(label, fn) { try { const info = fn(); results.push({ label, passed: true, ...(info ?? {}) }); console.log('PASS ' + label); } catch (e) { results.push({ label, passed: false, error: String(e) }); console.error('FAIL ' + label + ': ' + e.message); } }
const assert = (c, m) => { if (!c) throw new Error(m); };

const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run via npm run evidence:phase4');
run('tests', process.execPath, [npm, 'test']);
run('build', process.execPath, [npm, 'run', 'build']);

// --- Headless unchanged: Phase 3 commit (contract v1.2) core vs working tree, same args → identical JSONL bytes.
const base = '3ed8670', old = join(dir, 'v1.2-src');
mkdirSync(old, { recursive: true });
for (const f of ['core.ts', 'headless.ts']) writeFileSync(join(old, f), git('show', `${base}:game/src/${f}`) + '\n');
let s = 4242; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const frames = [];
for (let t = 0; t < 6000; t++) {
  const f = { tick: t };
  if (t % 30 === 0) { const a = r() * Math.PI * 2; f.move = [Math.round(Math.cos(a) * 1000) / 1000, Math.round(Math.sin(a) * 1000) / 1000]; }
  for (const [k, p] of [['jump', 0.05], ['dash', 0.03], ['pulse', 0.02], ['interact', 0.1]]) f[k] = r() < p;
  frames.push(f);
}
save('random.inputs.json', { frames });
const cases = [
  { name: 'n1-600', night: 1, ticks: 600 },
  ...[1, 2, 3].map(n => ({ name: `n${n}-random`, night: n, ticks: 6000, inputs: true })),
  ...[1, 2, 3].map(n => ({ name: `n${n}-full`, night: n, ticks: 21600, scenario: { player: { flames: 1000 } }, every: 600 }))
];
for (const c of cases) {
  const extra = ['--seed', '42', '--night', String(c.night), '--ticks', String(c.ticks), '--snapshot-every', String(c.every ?? 1)];
  if (c.scenario) { save(c.name + '.scenario.json', c.scenario); extra.push('--scenario', join(dir, c.name + '.scenario.json')); }
  if (c.inputs) extra.push('--inputs', join(dir, 'random.inputs.json'));
  run(`${c.name}-v1.3`, process.execPath, ['--import', 'tsx', 'game/src/headless.ts', ...extra, '--out', join(dir, `${c.name}-v1.3.jsonl`)]);
  run(`${c.name}-v1.2`, process.execPath, ['--import', 'tsx', join(old, 'headless.ts'), ...extra, '--out', join(dir, `${c.name}-v1.2.jsonl`)]);
  check(`headless unchanged ${c.name}`, () => {
    const a = sha(join(dir, `${c.name}-v1.3.jsonl`)), b = sha(join(dir, `${c.name}-v1.2.jsonl`));
    assert(a === b, `sha256 differs: v1.3 ${a} vs v1.2 ${b}`);
    // Keep the repo small: identical outputs over 1 MB are dropped after hashing (re-run the script to regenerate them).
    const bytes = statSync(join(dir, `${c.name}-v1.3.jsonl`)).size, kept = bytes <= 1024 * 1024;
    if (!kept) for (const v of ['v1.3', 'v1.2']) rmSync(join(dir, `${c.name}-${v}.jsonl`));
    return { sha256: a, bytes, files_kept: kept };
  });
}
check('full Night 3 ≤ 30 s', () => { const t = results.find(x => x.label === 'n3-full-v1.3'); assert(t.ms <= 30000, `${t.ms} ms`); return { ms: t.ms }; });

// --- Contract v1.3
check('contract v1.3 with bench_cmd and soak_cmd', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert(c.contract_version === '1.3' && c.bench_cmd && c.soak_cmd && c.run_cmd, JSON.stringify(c).slice(0, 200));
  return { bench_cmd: c.bench_cmd, soak_cmd: c.soak_cmd, run_cmd: c.run_cmd };
});

// --- Soak (same command as soak_cmd)
const soakOut = resolve(dir, 'soak.json');
run('soak', process.execPath, [npm, 'run', '--silent', 'soak', '--', '--seed', '7', '--nights', '10', '--out', soakOut]);
check('soak thresholds', () => {
  const j = JSON.parse(readFileSync(soakOut, 'utf8'));
  assert(j.nights === 10 && j.results.length === 10, 'nights'); assert(j.crashes === 0, `crashes ${j.crashes}`);
  assert(j.mem_end_mb <= 1.2 * j.mem_start_mb, `mem ${j.mem_start_mb} → ${j.mem_end_mb}`);
  return { crashes: j.crashes, results: j.results, mem_start_mb: j.mem_start_mb, mem_end_mb: j.mem_end_mb, duration_s: j.duration_s };
});

// --- Bench (Electron window; needs a display + GPU)
if (process.env.EVIDENCE_NO_BENCH) results.push({ label: 'bench', passed: null, status: 'NOT RUN', reason: 'EVIDENCE_NO_BENCH set' });
else {
  const benchOut = resolve(dir, 'bench.json');
  run('bench', process.execPath, [npm, 'run', '--silent', 'bench', '--', '--seed', '42', '--duration', '30', '--out', benchOut], { timeout: 240000 });
  check('bench thresholds (this machine, reference only)', () => {
    assert(existsSync(benchOut), 'bench.json missing');
    const j = JSON.parse(readFileSync(benchOut, 'utf8'));
    assert(j.contract_version === '1.3' && j.vsync_off === true, 'shape');
    assert(j.avg_fps >= 60 && j.p1_low_fps >= 30 && j.load_ms <= 10000, `avg ${j.avg_fps} p1 ${j.p1_low_fps} load ${j.load_ms}`);
    return { avg_fps: j.avg_fps, p1_low_fps: j.p1_low_fps, frame_ms_p95: j.frame_ms_p95, frames: j.frames, load_ms: j.load_ms, peak_mem_mb: j.peak_mem_mb, gpu: j.renderer?.gpu };
  });
}

const failed = results.filter(x => x.passed === false);
save('results.json', { contract_version: '1.3', baseline_commit: base, passed: failed.length === 0, failed: failed.map(x => x.label), results });
console.log(`${failed.length ? 'FAILED' : 'ALL PASSED'} → ${dir}/results.json`);
process.exit(failed.length ? 1 : 0);
