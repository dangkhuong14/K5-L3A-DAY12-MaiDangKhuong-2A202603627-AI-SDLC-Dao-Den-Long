import { readFileSync, writeFileSync } from 'node:fs';
import { createGame, idle, step, snapshot, startEvents, type NightId } from './core.ts';

const fail = (message: string, code = 2): never => { console.error(message); process.exit(code); };
const args = process.argv.slice(2), opts: Record<string, string> = {};
for (let i = 0; i < args.length; i += 2) {
  if (!args[i].startsWith('--') || args[i + 1] === undefined) fail('Expected --flag value pairs');
  opts[args[i].slice(2)] = args[i + 1];
}
for (const k of Object.keys(opts)) if (!['seed', 'night', 'scenario', 'inputs', 'ticks', 'out', 'snapshot-every'].includes(k)) fail(`Unknown option --${k}`);
const integer = (k: string, def?: number) => { const v = opts[k] === undefined ? def : Number(opts[k]); if (v === undefined || !Number.isSafeInteger(v)) fail(`Invalid or missing --${k}`); return v as number; };
const seed = integer('seed'), night = integer('night'), ticks = integer('ticks'), every = integer('snapshot-every', 10);
if (![1, 2, 3].includes(night)) fail('--night must be 1, 2 or 3');
if (ticks < 0 || every < 1 || !opts.out) fail('Require --ticks >= 0, --snapshot-every >= 1 and --out');

const object = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v: any) => typeof v === 'number' && Number.isFinite(v);
const count = (v: any) => num(v) && Number.isInteger(v) && v >= 0;
const vec = (v: any) => Array.isArray(v) && v.length === 3 && v.every(num);
const bool = (v: any) => typeof v === 'boolean';
const opt = (o: any, k: string, check: (v: any) => boolean) => o[k] === undefined || check(o[k]);
function load(path: string) { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fail(`Cannot read valid JSON: ${path}`); } }
function uniqueIds(list: any[], what: string) { const ids = new Set(); for (const x of list) if (x.id !== undefined) { if (typeof x.id !== 'string' || ids.has(x.id)) fail(`Invalid/duplicate ${what} id`); ids.add(x.id); } }

const scenario = opts.scenario ? load(opts.scenario) : {};
if (!object(scenario)) fail('Scenario must be an object');
if (scenario.player !== undefined) {
  const p = scenario.player;
  if (!object(p) || !opt(p, 'pos', vec) || !['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks'].every(k => opt(p, k, count))) fail('Invalid player');
}
for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (!opt(scenario, k, bool)) fail(`Invalid ${k}`);
if (!opt(scenario, 'time_left_s', v => num(v) && v >= 0)) fail('Invalid time_left_s');
if (scenario.motes !== undefined) {
  if (!Array.isArray(scenario.motes) || !scenario.motes.every((m: any) => vec(m) || (object(m) && vec(m.pos) && opt(m, 'kind', k => k === 'random' || k === 'dropped') && opt(m, 'ttl_s', v => num(v) && v > 0)))) fail('Invalid motes');
  uniqueIds(scenario.motes.filter(object), 'mote');
}
const list = (k: string, entry: (x: any) => boolean) => {
  if (scenario[k] === undefined) return;
  if (!Array.isArray(scenario[k]) || !scenario[k].every((x: any) => object(x) && entry(x))) fail(`Invalid ${k}`);
  uniqueIds(scenario[k], k);
};
list('shades', s => vec(s.pos) && opt(s, 'state', v => ['spawning', 'wander', 'chase', 'recoil', 'stunned'].includes(v)) && opt(s, 'state_ticks_left', count));
list('lanterns', l => typeof l.id === 'string' && opt(l, 'pos', vec) && opt(l, 'lit', bool) && opt(l, 'deposited', v => count(v) && v <= 10));
list('drifters', d => vec(d.pos) && opt(d, 'state', v => ['idle', 'chase', 'flee'].includes(v)) && opt(d, 'stolen', count) && opt(d, 'state_ticks_left', count));
list('charms', c => opt(c, 'pos', vec) && opt(c, 'available', bool) && opt(c, 'respawn_ticks', count));

const source = opts.inputs ? load(opts.inputs) : { frames: [] };
if (!object(source) || !Array.isArray(source.frames)) fail('Inputs must be {"frames": [...]}');
let last = -1;
for (const f of source.frames) {
  if (!object(f) || !count(f.tick) || f.tick <= last) fail('Frame ticks must be integers and strictly increase');
  last = f.tick;
  if (f.move !== undefined && (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every((v: any) => num(v) && v >= -1 && v <= 1))) fail('Invalid move');
  if (!opt(f, 'cam_yaw_deg', num)) fail('Invalid cam_yaw_deg');
  for (const k of ['jump', 'interact', 'pulse', 'dash', 'pause']) if (!opt(f, k, bool)) fail(`Invalid ${k}`);
}

try {
  const g = createGame(seed, scenario, night as NightId), input = idle();
  const lines = [JSON.stringify(snapshot(g)), ...startEvents(g).map(e => JSON.stringify(e))];
  let frame = 0;
  while (g.tick < ticks && (g.state === 'playing' || g.state === 'paused')) {
    while (source.frames[frame] && source.frames[frame].tick <= g.tick) {
      const { tick, ...changes } = source.frames[frame++];
      if (tick === g.tick) Object.assign(input, changes, changes.move ? { move: [...changes.move] } : {});
    }
    for (const e of step(g, input)) lines.push(JSON.stringify(e));
    if (g.tick % every === 0) lines.push(JSON.stringify(snapshot(g)));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: g.tick, sim_tick: g.simTick, state: g.state, score: g.score }));
  writeFileSync(opts.out, lines.join('\n') + '\n');
} catch (e) { fail(String((e as Error)?.stack ?? e), 1); }
