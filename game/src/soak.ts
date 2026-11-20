// Ticket-04 soak test: N headless nights in ONE process (Night 1 → 2 → 3 rotating), seeded random input, RSS before/after.
// Usage: npm run --silent soak -- --seed 7 --nights 10 --out soak.json
// Runs under `node --expose-gc --max-semi-space-size=1`: RSS is read after a full GC and the young generation stays small, so RSS reflects retained memory rather than V8 warm-up (see game/README.md).
import { writeFileSync } from 'node:fs';
import { createGame, step, nightDuration, type Game, type Input, type NightId } from './core.ts';

export type SoakNight = { night: NightId; seed: number; result: string; reason: string | null; ticks: number; score: number; error?: string };

/** Seeded input stream (mulberry32): new move direction every 30 ticks; per tick 5% jump, 3% dash, 2% pulse, 10% interact. */
export function randomInput(seed: number) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let move: [number, number] = [0, 0], tick = 0;
  return (): Input => {
    if (tick++ % 30 === 0) { const a = r() * Math.PI * 2; move = [Math.round(Math.cos(a) * 1000) / 1000, Math.round(Math.sin(a) * 1000) / 1000]; }
    return { move: [move[0], move[1]], cam_yaw_deg: 0, jump: r() < 0.05, dash: r() < 0.03, pulse: r() < 0.02, interact: r() < 0.10, pause: false };
  };
}

/** One night until game over or its standard duration (+1 tick margin). Never throws: errors are reported as crashes. */
export function runNight(night: NightId, seed: number, onLoaded?: () => void): SoakNight {
  let g: Game | null = null, ticks = 0;
  try {
    g = createGame(seed, {}, night); onLoaded?.();
    const next = randomInput(seed), max = nightDuration(night) * 60 + 1;
    while (g.state === 'playing' && ticks < max) { step(g, next()); ticks++; }
    return { night, seed, result: g.state === 'won' ? 'won' : 'lost', reason: g.result, ticks, score: g.score };
  } catch (e) {
    return { night, seed, result: 'crash', reason: null, ticks, score: g?.score ?? 0, error: String((e as Error)?.stack ?? e) };
  }
}

const rssMb = () => { (globalThis as any).gc?.(); return Math.round(process.memoryUsage().rss / 1048576 * 10) / 10; };

export function soak(seed: number, nights: number) {
  const t0 = performance.now(), details: SoakNight[] = [];
  let memStart = 0;
  for (let i = 1; i <= nights; i++) {
    const night = (((i - 1) % 3) + 1) as NightId;
    // "Đêm thứ i dùng seed 7 + i": i is 1-based, so with --seed 7 the first night uses seed 8 (assumption in game/README.md).
    details.push(runNight(night, seed + i, i === 1 ? () => { memStart = rssMb(); } : undefined));
  }
  const memEnd = rssMb(); // every Game is unreachable here: the last night has been reset
  return {
    nights, crashes: details.filter(d => d.result === 'crash').length, results: details.map(d => d.result),
    mem_start_mb: memStart, mem_end_mb: memEnd, duration_s: Math.round((performance.now() - t0) / 100) / 10,
    seed, gc_exposed: typeof (globalThis as any).gc === 'function', details
  };
}

const isMain = process.argv[1] && /soak\.ts$/.test(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  const args = process.argv.slice(2), get = (k: string, d: string) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
  const seed = Number(get('seed', '7')), nights = Number(get('nights', '10')), out = get('out', 'soak.json');
  if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) { console.error('usage: soak --seed <int> --nights <int ≥ 1> --out <file>'); process.exit(2); }
  const r = soak(seed, nights);
  writeFileSync(out, JSON.stringify(r, null, 2) + '\n');
  const pass = r.crashes === 0 && r.mem_end_mb <= 1.2 * r.mem_start_mb;
  console.error(`soak: ${r.nights} nights, crashes ${r.crashes}, results ${r.results.join(',')}, RSS ${r.mem_start_mb} → ${r.mem_end_mb} MB, ${r.duration_s} s → ${pass ? 'PASS' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}
