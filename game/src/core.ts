// Pure game rules shared by web and headless. No Three.js, DOM, renderer or wall clock.
// Rules follow Ticket-03 (Contract v1.2) on top of Ticket-02. Same-tick order is documented in game/README.md.
export type Vec = [number, number, number];
export type NightId = 1 | 2 | 3;

export const tuning = {
  player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5,
  pickup_radius: 1, interact_radius: 2, pulse_cost: 3, pulse_radius: 5,
  night1_duration_s: 240, night2_duration_s: 270, night3_duration_s: 300,
  flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5,
  pulse_stun_s: 2, pulse_push_m: 4, pulse_cooldown_s: 3, safe_radius: 6,
  shade_speed: 4, shade_hit_radius: 1, fall_enabled: true,
  dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5,
  fuel_max: 100, fuel_decay_per_s: 1.0, fuel_per_mote: 10, relight_cost: 5, win_ratio: 0.6, drain_per_s: 5,
  low_fuel_threshold: 30, capacity_max: 20,
  score: { per_mote: 5, per_lantern: 100, per_relight: 40, per_stun: 5, per_stun_drain: 15, per_lit_lantern_dawn: 50, per_flame_left: 50 }
};
/** Fuel is stored as integer 1/60 units (1 fuel = 60 units) to avoid float drift; rounded only for output. */
export const FU = 60;

/** Fixed rule constants from Ticket-02 that are not contract tuning keys. */
export const rules = {
  tps: 60, jump_speed: 7, gravity: 20, height_tolerance: 1.5, step_height: 0.35,
  dash_ticks: 12, dash_cd_ticks: 90, invuln_ticks: 90, pulse_cd_ticks: 180,
  stun_ticks: 120, push_ticks: 15, pulse_center_y: 0.8,
  shade_detect: 12, shade_lose: 18, shade_spawn_min_dist: 15, shade_wander_speed: 1.5,
  shade_separation: 1.2, recoil_ticks: 60, recoil_m: 2, evac_ticks: 30,
  mote_start: 20, mote_cap: 30, mote_interval: 240, drop_ttl: 480, drop_ring: [1.5, 2.5],
  fall_y: -10, respawn_wait: 60,
  drifter_speed: 7, drifter_idle_speed: 2, drifter_max: 2, drifter_interval: 1200, drifter_detect: 15,
  drifter_min_carry: 5, drifter_touch: 1.2, drifter_steal: 3, drifter_flee_ticks: 240, drifter_drop_flee_ticks: 120,
  drifter_hover: 1,
  charm_ticks: 600, charm_respawn: 2700, charm_speed: 7.2,
  wind_period: 1800, wind_ticks: 300, wind_warn: 120, wind_speed: 2,
  shade_first_spawn: 300,
  capacity_per_light: 2, drain_radius: 2, drain_chase: 6, fuel_drain_event_every: 60
};

export type Input = { move: [number, number]; cam_yaw_deg: number; jump: boolean; interact: boolean; pulse: boolean; dash: boolean; pause: boolean };
export const idle = (): Input => ({ move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false });
export type Event = { type: 'event'; tick: number; name: string; data: Record<string, unknown> };

// ---------- Maps ----------
type Pad = { pos: Vec; vy: number; vx: number; vz: number };
export type NightDef = {
  night: NightId; name: string; duration: number; start: Vec;
  lanterns: Vec[]; motePoints: Vec[]; shadePoints: Vec[];
  shadeInterval: number; shadeMax: number; shadeSpeed: number;
  pads: Pad[]; charms: Vec[]; drifters: boolean; wind: boolean;
  ground: (x: number, z: number) => number | null;
};
const rad = (d: number) => d * Math.PI / 180;
const ring = (cx: number, cz: number, r: number, n: number, startDeg: number, stepDeg: number, y = 0): Vec[] =>
  Array.from({ length: n }, (_, i) => { const a = rad(startDeg + i * stepDeg); return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)] as Vec; });
const padToward = (pos: Vec, tx: number, tz: number, vy: number, speed: number): Pad => {
  const dx = tx - pos[0], dz = tz - pos[2], l = Math.hypot(dx, dz); return { pos, vy, vx: dx / l * speed, vz: dz / l * speed };
};

export const nights: Record<NightId, NightDef> = {
  1: {
    night: 1, name: 'Đảo Bến', duration: 240, start: [0, 0, 0],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motePoints: [...ring(0, 0, 12, 8, 0, 45), ...ring(0, 0, 33, 16, 0, 22.5)],
    shadePoints: ring(0, 0, 37, 12, 15, 30),
    shadeInterval: 480, shadeMax: 6, shadeSpeed: 4, pads: [], charms: [], drifters: false, wind: false,
    ground: (x, z) => Math.hypot(x, z) <= 40 ? 0 : null
  },
  2: {
    night: 2, name: 'Đảo Cau', duration: 270, start: [0, 0, 0],
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motePoints: [...ring(0, 0, 10, 4, 0, 90), ...ring(0, 0, 22, 8, 0, 45), ...ring(70, 0, 10, 4, 0, 90), ...ring(70, 0, 22, 8, 0, 45)],
    shadePoints: [...ring(0, 0, 26, 8, 22.5, 45), ...ring(70, 0, 26, 8, 22.5, 45)],
    shadeInterval: 420, shadeMax: 8, shadeSpeed: 4,
    pads: [padToward([20, 0, 18], 70, 0, 14, 24), padToward([50, 0, -18], 0, 0, 14, 24)],
    charms: [[35, 0, 0]], drifters: true, wind: false,
    ground: (x, z) => (Math.hypot(x, z) <= 28 || Math.hypot(x - 70, z) <= 28 || (x >= 26 && x <= 44 && z >= -2 && z <= 2)) ? 0 : null
  },
  3: {
    night: 3, name: 'Đảo Chuông', duration: 300, start: [0, 0, -20],
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motePoints: [...ring(0, 0, 34, 18, 0, 20, 0), ...ring(0, 0, 18, 8, 20, 20, 3), ...ring(0, 0, 5, 4, 45, 90, 6)],
    shadePoints: ring(0, 0, 43, 16, 0, 22.5),
    shadeInterval: 360, shadeMax: 10, shadeSpeed: 4.5,
    pads: [{ pos: [0, 3, 13], vy: 12, vx: 0, vz: -8 }],
    charms: [[30, 0, 25], [-30, 0, 25]], drifters: true, wind: true,
    ground: groundNight3
  }
};
/** Night 3 terrain: tier 0 disc, tier 1 half ring (z>0), tier 2 center disc, 2 ramps, bell tower (wall). */
export function groundNight3(x: number, z: number): number | null {
  const r = Math.hypot(x, z);
  if (r > 45) return null;
  if (r < 2) return 14; // bell tower, 8 m above tier 2: acts as wall
  if (r <= 8) return 6;
  if (z > 0 && r >= 12 && r <= 24) return 3;
  for (const deg of [30, 150]) {
    const a = rad(deg), s = x * Math.cos(a) + z * Math.sin(a), t = -x * Math.sin(a) + z * Math.cos(a);
    if (Math.abs(t) <= 1.5 && s >= 20 && s <= 30) return Math.min(3, 3 * (30 - s) / 6);
  }
  return 0;
}
export const nightDuration = (n: NightId) => n === 1 ? tuning.night1_duration_s : n === 2 ? tuning.night2_duration_s : tuning.night3_duration_s;

// ---------- State ----------
export type ShadeState = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned' | 'drain';
type Motion = { dx: number; dz: number; ticks: number };
export type Shade = { id: string; pos: Vec; hover: number; state: ShadeState; ticks: number; push: Motion | null; recoil: Motion | null; evac: Motion | null; target: Vec | null; lantern: string | null; drainTicks: number };
export type Mote = { id: string; pos: Vec; kind: 'random' | 'dropped'; ttl: number | null; point: number };
export type Drifter = { id: string; pos: Vec; state: 'idle' | 'chase' | 'flee' | 'removed'; stolen: number; ticks: number; used: boolean; target: Vec | null };
export type Charm = { id: string; pos: Vec; available: boolean; respawn: number };
export type Lantern = { id: string; pos: Vec; lit: boolean; deposited: number; fuel: number; ever_lit: boolean; relit_count: number };
export type Player = {
  pos: Vec; vel: Vec; grounded: boolean; flames: number; carried: number; facing: [number, number];
  invuln: number; dashCd: number; dashTicks: number; dashDir: [number, number]; pulseCd: number; charm: number;
  launch: [number, number] | null; respawn: number; successful_lights: number;
};
export const capacity = (p: Player) => Math.min(tuning.capacity_max, tuning.carry_capacity + rules.capacity_per_light * p.successful_lights);
const FUEL_MAX = tuning.fuel_max * FU, LOW = tuning.low_fuel_threshold * FU;
/** Lantern keeps its safe zone only while lit with fuel >= 30 (exactly 30 still safe). */
export const hasSafeZone = (l: Lantern) => l.lit && l.fuel >= LOW;
export const isWeak = (l: Lantern) => l.lit && l.fuel < LOW;
export const fuelOut = (u: number) => Math.round(u / FU * 10) / 10;
export const litNeeded = (n: number) => Math.ceil(tuning.win_ratio * n - 1e-9);
type Rng = () => number;
export type Game = {
  night: NightId; def: NightDef; tick: number; simTick: number; state: 'playing' | 'paused' | 'won' | 'lost';
  time_left_s: number; initialTime: number; score: number; result: string | null;
  player: Player; lanterns: Lantern[]; motes: Mote[]; shades: Shade[]; drifters: Drifter[]; charms: Charm[];
  wind: { enabled: boolean; active: boolean; warning: boolean; dir_deg: number | null };
  random: { motes: boolean; shades: boolean; drifters: boolean };
  previous: Input; rng: { motes: Rng; shades: Rng; drops: Rng; drifters: Rng; wind: Rng };
  nextId: { M: number; S: number; D: number }; lastPulseTick: number;
  /** Ticket-04 bench scene: no spawns, damage, pickups, fuel decay/drain or end of night; shades only wander. Off by default. */
  bench: boolean;
};

const mulberry = (seed: number): Rng => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const distXZ = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, 'en', { numeric: true });
const copy = (v: number[]): Vec => [v[0], v[1], v[2]];
const unit = (dx: number, dz: number): [number, number] => { const l = Math.hypot(dx, dz); return l > 1e-9 ? [dx / l, dz / l] : [1, 0]; };

function freshId(prefix: 'M' | 'S' | 'D', g: Game, used: Set<string>) { let id: string; do { id = prefix + g.nextId[prefix]++; } while (used.has(id)); return id; }

export function createGame(seed = 1, scenario: any = {}, nightNo: NightId = 1): Game {
  const def = nights[nightNo];
  const base = (seed >>> 0);
  const rng = { motes: mulberry(base ^ 0x1001), shades: mulberry(base ^ 0x2002), drops: mulberry(base ^ 0x3003), drifters: mulberry(base ^ 0x4004), wind: mulberry(base ^ 0x5005) };
  const sp = scenario.player ?? {};
  const duration = nightDuration(nightNo);
  const time = scenario.time_left_s ?? duration;
  const pos = copy(sp.pos ?? def.start);
  const h = def.ground(pos[0], pos[2]);
  const grounded = h !== null && pos[1] <= h + 1e-6 && pos[1] >= h - rules.step_height;
  if (grounded) pos[1] = h!;
  const g: Game = {
    night: nightNo, def, tick: 0, simTick: 0, state: 'playing', time_left_s: time, initialTime: time, score: 0, result: null,
    player: {
      pos, vel: [0, 0, 0], grounded, flames: sp.flames ?? tuning.flames, carried: sp.carried ?? 0, facing: [0, 1],
      invuln: sp.invuln_ticks ?? 0, dashCd: sp.dash_cd_ticks ?? 0, dashTicks: 0, dashDir: [0, 1],
      pulseCd: sp.pulse_cd_ticks ?? 0, charm: sp.charm_ticks ?? 0, launch: null, respawn: 0, successful_lights: sp.successful_lights ?? 0
    },
    lanterns: def.lanterns.map((p, i) => ({ id: `L${i + 1}`, pos: copy(p), lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 })),
    motes: [], shades: [], drifters: [], charms: [],
    wind: { enabled: def.wind && scenario.wind_enabled !== false, active: false, warning: false, dir_deg: null },
    random: { motes: scenario.random_motes !== false, shades: scenario.random_shades !== false, drifters: def.drifters && scenario.random_drifters !== false },
    previous: idle(), rng, nextId: { M: 1, S: 1, D: 1 }, lastPulseTick: -9999, bench: scenario.bench === true
  };
  if (g.bench) { g.random = { motes: false, shades: false, drifters: false }; g.wind.enabled = false; }
  for (const patch of scenario.lanterns ?? []) {
    const l = g.lanterns.find(x => x.id === patch.id); if (!l) continue;
    if (patch.pos) l.pos = copy(patch.pos);
    if (patch.deposited !== undefined) l.deposited = patch.deposited;
    if (patch.lit !== undefined) l.lit = patch.lit;
    l.fuel = l.lit ? Math.round((patch.fuel ?? tuning.fuel_max) * FU) : 0;
    l.ever_lit = patch.ever_lit ?? l.lit;
  }
  // Motes: scenario list replaces defaults. Accept [x,y,z] or {id?, pos, kind?, ttl_s?}.
  if (scenario.motes !== undefined) {
    const used = new Set<string>(scenario.motes.map((m: any) => m?.id).filter(Boolean));
    for (const m of scenario.motes) {
      const p = Array.isArray(m) ? m : m.pos; const kind = !Array.isArray(m) && m.kind === 'dropped' ? 'dropped' : 'random';
      const point = def.motePoints.findIndex(q => distXZ(q, p) < 0.01 && Math.abs(q[1] - p[1]) < 0.01);
      g.motes.push({ id: (!Array.isArray(m) && m.id) || freshId('M', g, used), pos: copy(p), kind,
        ttl: kind === 'dropped' ? Math.round((m.ttl_s ?? rules.drop_ttl / 60) * 60) : null, point: kind === 'random' ? point : -1 });
    }
  } else if (g.random.motes) {
    const order = def.motePoints.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng.motes() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const i of order.slice(0, rules.mote_start).sort((a, b) => a - b)) g.motes.push({ id: `M${g.nextId.M++}`, pos: copy(def.motePoints[i]), kind: 'random', ttl: null, point: i });
  }
  // Shades: scenario list replaces defaults (default list is empty; the schedule spawns them).
  const shadeIds = new Set<string>((scenario.shades ?? []).map((s: any) => s.id).filter(Boolean));
  for (const s of scenario.shades ?? []) {
    const p = copy(s.pos); const gh = def.ground(p[0], p[2]);
    const state: ShadeState = s.state ?? 'chase';
    const sh: Shade = { id: s.id ?? freshId('S', g, shadeIds), pos: p, hover: gh === null ? 0 : p[1] - gh, state, ticks: 0, push: null, recoil: null, evac: null, target: null, lantern: s.target_lantern_id ?? null, drainTicks: 0 };
    if (state === 'drain' && !sh.lantern) sh.lantern = nearestBy(g.lanterns.filter(isWeak), p)?.id ?? null;
    if (state === 'stunned') sh.ticks = s.state_ticks_left ?? rules.stun_ticks;
    if (state === 'spawning') sh.ticks = s.state_ticks_left ?? 1;
    if (state === 'recoil') { sh.ticks = s.state_ticks_left ?? rules.recoil_ticks; const [ux, uz] = unit(p[0] - pos[0], p[2] - pos[2]); const per = rules.recoil_m / rules.recoil_ticks; sh.recoil = { dx: ux * per, dz: uz * per, ticks: sh.ticks }; }
    g.shades.push(sh);
  }
  const drifterIds = new Set<string>((scenario.drifters ?? []).map((d: any) => d.id).filter(Boolean));
  for (const d of scenario.drifters ?? []) {
    const state = d.state ?? 'idle';
    g.drifters.push({ id: d.id ?? freshId('D', g, drifterIds), pos: copy(d.pos), state, stolen: d.stolen ?? 0,
      ticks: d.state_ticks_left ?? (state === 'flee' ? rules.drifter_flee_ticks : 0), used: state === 'flee' || (d.stolen ?? 0) > 0, target: null });
  }
  const charmList = scenario.charms ?? def.charms.map((p, i) => ({ id: `C${i + 1}`, pos: p }));
  g.charms = charmList.map((c: any, i: number) => ({ id: c.id ?? `C${i + 1}`, pos: copy(c.pos ?? def.charms[i] ?? [0, 0, 0]),
    available: c.available ?? !(c.respawn_ticks > 0), respawn: c.available === false ? (c.respawn_ticks ?? rules.charm_respawn) : (c.respawn_ticks ?? 0) }));
  for (const c of g.charms) if (c.respawn > 0) c.available = false;
  updateWind(g, false);
  return g;
}

/** Events emitted at tick 0 (after snapshot 0) when a night begins. */
export const startEvents = (g: Game): Event[] => [{ type: 'event', tick: 0, name: 'night_start', data: { night: g.night } }];

function updateWind(g: Game, roll: boolean) {
  const w = g.wind; if (!w.enabled) { w.active = false; w.warning = false; return; }
  const t = g.simTick, phase = t % rules.wind_period;
  const warnStart = rules.wind_period - rules.wind_warn;
  if (roll && phase === warnStart) w.dir_deg = Math.floor(g.rng.wind() * 360);
  w.active = t >= rules.wind_period && phase < rules.wind_ticks;
  w.warning = phase >= warnStart;
  if (!w.active && !w.warning) w.dir_deg = null;
}

function resumeShade(g: Game, s: Shade) {
  const p = g.player, wasStunned = s.state === 'stunned'; s.ticks = 0; s.push = null; s.recoil = null; s.lantern = null; s.drainTicks = 0;
  // Ticket-03: stun always ends in wander; recoil/spawning keep the Ticket-02 rule.
  s.state = !wasStunned && p.respawn === 0 && distXZ(s.pos, p.pos) <= rules.shade_lose ? 'chase' : 'wander';
}
function nearestBy<T extends { id: string; pos: Vec }>(list: T[], from: Vec): T | undefined {
  return [...list].sort((a, b) => distXZ(from, a.pos) - distXZ(from, b.pos) || byId(a, b))[0];
}

function dropMotes(g: Game, at: Vec, n: number, scatter: boolean) {
  for (let i = 0; i < n; i++) {
    let x = at[0], z = at[2];
    if (scatter) { const a = g.rng.drops() * Math.PI * 2, r = rules.drop_ring[0] + g.rng.drops() * (rules.drop_ring[1] - rules.drop_ring[0]); x += Math.cos(a) * r; z += Math.sin(a) * r; }
    const h = g.def.ground(x, z);
    g.motes.push({ id: `M${g.nextId.M++}`, pos: [x, h ?? at[1], z], kind: 'dropped', ttl: rules.drop_ttl, point: -1 });
  }
}

/** Move an XZ walker with terrain walls; tries full move, then axis slides. Returns true if it moved. */
function walk(g: Game, pos: Vec, dx: number, dz: number, baseY: number, allowVoid: boolean): boolean {
  const ok = (x: number, z: number) => { const h = g.def.ground(x, z); return h === null ? allowVoid : h <= baseY + rules.step_height; };
  if (dx === 0 && dz === 0) return false;
  if (ok(pos[0] + dx, pos[2] + dz)) { pos[0] += dx; pos[2] += dz; return true; }
  if (dx !== 0 && ok(pos[0] + dx, pos[2])) { pos[0] += dx; return true; }
  if (dz !== 0 && ok(pos[0], pos[2] + dz)) { pos[2] += dz; return true; }
  return false;
}

function moveShade(g: Game, s: Shade, dx: number, dz: number) {
  const gh = g.def.ground(s.pos[0], s.pos[2]);
  const baseY = gh ?? s.pos[1] - s.hover;
  const moved = walk(g, s.pos, dx, dz, baseY, false);
  // Lanterns with a safe zone (lit, fuel >= 30) block outside shades at the safe-radius edge.
  for (const l of g.lanterns) if (hasSafeZone(l)) {
    const d = distXZ(s.pos, l.pos);
    if (d < tuning.safe_radius) { const [ux, uz] = unit(s.pos[0] - l.pos[0], s.pos[2] - l.pos[2]); s.pos[0] = l.pos[0] + ux * tuning.safe_radius; s.pos[2] = l.pos[2] + uz * tuning.safe_radius; }
  }
  const nh = g.def.ground(s.pos[0], s.pos[2]); if (nh !== null) s.pos[1] = nh + s.hover;
  return moved;
}

const pickTarget = (g: Game, r: Rng): Vec => copy(g.def.motePoints[Math.floor(r() * g.def.motePoints.length)]);

export function step(g: Game, input: Input): Event[] {
  if (g.state === 'won' || g.state === 'lost') return [];
  const events: Event[] = []; g.tick++;
  const emit = (name: string, data: Record<string, unknown>) => events.push({ type: 'event', tick: g.tick, name, data });
  const prev = g.previous;
  const edge = (k: 'jump' | 'interact' | 'pulse' | 'dash' | 'pause') => !!input[k] && !prev[k];
  g.previous = { ...input, move: [input.move[0], input.move[1]] };
  const p = g.player, dt = 1 / rules.tps;

  // 1. Pause first. A pause press stops this step; a resume press continues it.
  if (edge('pause')) {
    if (g.state === 'paused') { g.state = 'playing'; emit('resumed', {}); }
    else { g.state = 'paused'; emit('paused', {}); return events; }
  } else if (g.state === 'paused') return events;
  g.simTick++;

  // 2. Counters: time, cooldowns, invuln, stun/recoil/spawning, charm, dropped-mote TTL, charm respawn, drifter flee, respawn wait.
  g.time_left_s = Math.max(0, g.initialTime - g.simTick / rules.tps);
  for (const k of ['dashCd', 'pulseCd', 'invuln', 'charm'] as const) if (p[k] > 0) p[k]--;
  for (const s of g.shades) if (s.state === 'stunned' || s.state === 'recoil' || s.state === 'spawning') { if (--s.ticks <= 0) resumeShade(g, s); }
  g.motes = g.motes.filter(m => m.ttl === null || --m.ttl > 0);
  for (const c of g.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
  for (const d of g.drifters) if (d.state === 'flee' && --d.ticks <= 0) { d.state = 'removed'; d.ticks = 0; }
  if (p.respawn > 0 && p.flames > 0 && --p.respawn === 0) {
    p.pos = copy(g.def.start); p.vel = [0, 0, 0]; p.grounded = true; p.launch = null; p.dashTicks = 0; p.facing = [0, 1]; p.invuln = rules.invuln_ticks;
    const h = g.def.ground(p.pos[0], p.pos[2]); if (h !== null) p.pos[1] = h;
  }
  updateWind(g, true);
  // 2b. Fuel: lit lanterns decay 1/s; each draining shade (ascending id) sucks 5/s. Then empty lanterns go out.
  if (!g.bench) for (const l of g.lanterns) if (l.lit) l.fuel -= Math.round(tuning.fuel_decay_per_s * FU / rules.tps);
  if (!g.bench) for (const s of [...g.shades].sort(byId)) if (s.state === 'drain') {
    const l = g.lanterns.find(x => x.id === s.lantern);
    if (!l || !l.lit) continue;
    l.fuel -= Math.round(tuning.drain_per_s * FU / rules.tps);
    if (++s.drainTicks % rules.fuel_drain_event_every === 0) emit('fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: fuelOut(Math.max(0, l.fuel)) });
  }
  for (const l of g.lanterns) if (l.lit && l.fuel <= 0) { l.lit = false; l.fuel = 0; l.deposited = 0; emit('lantern_out', { lantern_id: l.id }); }

  // 3. Player movement (run, jump, dash, launch pads, wind), then fall check.
  const waiting = p.respawn > 0;
  if (!waiting) {
    const yaw = rad(input.cam_yaw_deg); let [mx, mz] = input.move; const n = Math.hypot(mx, mz); if (n > 1) { mx /= n; mz /= n; }
    const wx = mx * Math.cos(yaw) + mz * Math.sin(yaw), wz = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
    const moving = Math.hypot(wx, wz) > 1e-9;
    if (moving) p.facing = unit(wx, wz);
    if (edge('dash') && p.dashTicks === 0 && (p.dashCd === 0 || p.charm > 0)) {
      p.dashDir = moving ? unit(wx, wz) : [p.facing[0], p.facing[1]]; p.dashTicks = rules.dash_ticks;
      p.dashCd = p.charm > 0 ? 0 : rules.dash_cd_ticks; emit('dash', {});
    }
    const dashing = p.dashTicks > 0;
    let hx: number, hz: number;
    if (dashing) { hx = p.dashDir[0] * tuning.dash_speed; hz = p.dashDir[1] * tuning.dash_speed; p.dashTicks--; }
    else if (p.launch) { [hx, hz] = p.launch; }
    else { const sp = p.charm > 0 ? rules.charm_speed : tuning.player_speed; hx = wx * sp; hz = wz * sp; }
    if (g.wind.active && g.wind.dir_deg !== null) { hx += Math.cos(rad(g.wind.dir_deg)) * rules.wind_speed; hz += Math.sin(rad(g.wind.dir_deg)) * rules.wind_speed; }
    let vy = p.vel[1];
    if (edge('jump') && p.grounded) { p.grounded = false; vy = rules.jump_speed; }
    const x0 = p.pos[0], z0 = p.pos[2], y0 = p.pos[1];
    walk(g, p.pos, hx * dt, hz * dt, y0, true);
    const h = g.def.ground(p.pos[0], p.pos[2]);
    if (p.grounded) {
      if (h === null || h < y0 - rules.step_height) { p.grounded = false; vy = 0; }
      else p.pos[1] = h;
    } else if (!dashing) {
      p.pos[1] = y0 + vy * dt - 0.5 * rules.gravity * dt * dt; vy -= rules.gravity * dt;
    }
    if (!p.grounded && h !== null && p.pos[1] <= h + 1e-9 && y0 >= h - rules.step_height && (vy <= 0 || dashing)) {
      p.pos[1] = h; vy = 0; p.grounded = true; p.launch = null;
    }
    if (p.grounded) for (const pad of g.def.pads) {
      if (distXZ(p.pos, pad.pos) <= 1 && Math.abs(p.pos[1] - pad.pos[1]) <= rules.step_height) { p.grounded = false; vy = pad.vy; p.launch = [pad.vx, pad.vz]; break; }
    }
    p.vel = [(p.pos[0] - x0) / dt, vy, (p.pos[2] - z0) / dt];
    if (p.pos[1] < rules.fall_y) {
      p.flames = Math.max(0, p.flames - 1); const lost = p.carried; p.carried = 0;
      p.respawn = rules.respawn_wait; p.vel = [0, 0, 0]; p.launch = null; p.dashTicks = 0;
      emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }
  const active = p.respawn === 0;

  // 4. Pick up motes and charms.
  if (active && !g.bench) {
    g.motes = g.motes.filter(m => {
      if (p.carried < capacity(p) && distXZ(p.pos, m.pos) <= tuning.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= rules.height_tolerance) {
        p.carried++; emit('mote_picked', { carried: p.carried }); return false;
      }
      return true;
    });
    for (const c of g.charms) if (c.available && distXZ(p.pos, c.pos) <= tuning.pickup_radius && Math.abs(p.pos[1] - c.pos[1]) <= rules.height_tolerance) {
      c.available = false; c.respawn = rules.charm_respawn; p.charm = rules.charm_ticks;
      emit('charm_picked', { charm_id: c.id, charm_ticks: p.charm });
    }
  }

  // 5. Interact with lanterns.
  // Candidates: unlit lanterns, or lit lanterns that are not full. Nearest, tie -> smaller id.
  const litNow: Lantern[] = [];
  if (active && edge('interact') && p.carried > 0) {
    const l = nearestBy(g.lanterns.filter(l => (!l.lit || l.fuel < FUEL_MAX) && distXZ(p.pos, l.pos) <= tuning.interact_radius), p.pos);
    if (l && !l.lit) {
      const cost = l.ever_lit ? tuning.relight_cost : tuning.lantern_cost;
      const amount = Math.min(p.carried, Math.max(0, cost - l.deposited));
      if (amount > 0) {
        p.carried -= amount; l.deposited += amount; g.score += amount * tuning.score.per_mote;
        emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
        if (l.deposited >= cost) {
          const relight = l.ever_lit;
          l.lit = true; l.fuel = FUEL_MAX; l.ever_lit = true; if (relight) l.relit_count++;
          p.successful_lights++; g.score += relight ? tuning.score.per_relight : tuning.score.per_lantern;
          litNow.push(l); emit('lantern_lit', { lantern_id: l.id, relight });
        }
      }
    } else if (l) {
      const step10 = tuning.fuel_per_mote * FU;
      const used = Math.min(p.carried, Math.ceil((FUEL_MAX - l.fuel) / step10));
      const before = l.fuel;
      p.carried -= used; l.fuel = Math.min(FUEL_MAX, l.fuel + step10 * used); g.score += used * tuning.score.per_mote;
      emit('refuel', { lantern_id: l.id, amount: used, fuel: fuelOut(l.fuel) });
      if (before < LOW && l.fuel >= LOW) litNow.push(l);
    }
  }

  // 6. Safe zones: shades inside a just-lit (or refuelled back to >= 30) lantern are pushed to the edge over 30 ticks, harmless meanwhile.
  for (const l of litNow) for (const s of g.shades) {
    const d = distXZ(s.pos, l.pos);
    if (d < tuning.safe_radius) {
      if (s.state === 'drain') { s.state = 'wander'; s.lantern = null; s.drainTicks = 0; s.target = null; }
      const [ux, uz] = unit(s.pos[0] - l.pos[0], s.pos[2] - l.pos[2]);
      const tx = l.pos[0] + ux * tuning.safe_radius, tz = l.pos[2] + uz * tuning.safe_radius;
      s.evac = { dx: (tx - s.pos[0]) / rules.evac_ticks, dz: (tz - s.pos[2]) / rules.evac_ticks, ticks: rules.evac_ticks };
    }
  }

  // 7. Pulse.
  if (active && edge('pulse') && p.pulseCd === 0 && p.carried >= tuning.pulse_cost) {
    p.carried -= tuning.pulse_cost; p.pulseCd = rules.pulse_cd_ticks; g.lastPulseTick = g.tick;
    const c: Vec = [p.pos[0], p.pos[1] + rules.pulse_center_y, p.pos[2]];
    const d3 = (q: Vec) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]);
    const ids: string[] = [];
    for (const s of [...g.shades].sort(byId)) if (d3(s.pos) <= tuning.pulse_radius) {
      const [ux, uz] = unit(s.pos[0] - c[0], s.pos[2] - c[2]); const per = tuning.pulse_push_m / rules.push_ticks;
      g.score += s.state === 'drain' ? tuning.score.per_stun_drain : tuning.score.per_stun;
      s.state = 'stunned'; s.ticks = rules.stun_ticks; s.recoil = null; s.lantern = null; s.drainTicks = 0; s.push = { dx: ux * per, dz: uz * per, ticks: rules.push_ticks };
      ids.push(s.id);
    }
    for (const d of [...g.drifters].sort(byId)) if (d.state !== 'removed' && d3(d.pos) <= tuning.pulse_radius) {
      if (d.state === 'chase') { d.state = 'flee'; d.ticks = rules.drifter_flee_ticks; d.used = true; }
      else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen; d.stolen = 0; dropMotes(g, d.pos, amount, false); d.ticks = rules.drifter_drop_flee_ticks;
        emit('drifter_drop', { drifter_id: d.id, amount });
      }
    }
    emit('pulse', { stunned_ids: ids });
  }

  // 8. Move shades and drifters. Steering reads pre-move positions.
  const starts = g.shades.map(s => copy(s.pos));
  const speed = g.def.shadeSpeed * dt;
  g.shades.forEach((s, i) => {
    if (s.evac) { s.pos[0] += s.evac.dx; s.pos[2] += s.evac.dz; const nh = g.def.ground(s.pos[0], s.pos[2]); if (nh !== null) s.pos[1] = nh + s.hover; if (--s.evac.ticks <= 0) s.evac = null; return; }
    if (s.state === 'spawning') return;
    if (s.state === 'stunned') { if (s.push && s.push.ticks > 0) { moveShade(g, s, s.push.dx, s.push.dz); s.push.ticks--; } return; }
    if (s.state === 'recoil') { if (s.recoil) moveShade(g, s, s.recoil.dx, s.recoil.dz); return; }
    const d = distXZ(starts[i], p.pos);
    if (s.state === 'drain') {
      const l = g.lanterns.find(x => x.id === s.lantern);
      if (active && d <= rules.drain_chase) { s.state = 'chase'; s.lantern = null; s.drainTicks = 0; }
      else if (!l || !l.lit || l.fuel >= LOW || distXZ(s.pos, l.pos) > rules.drain_radius) { s.state = 'wander'; s.lantern = null; s.drainTicks = 0; s.target = null; }
      else return; // stands still while draining
    }
    if (s.state === 'wander' && active && !g.bench && d <= rules.shade_detect) { s.state = 'chase'; s.lantern = null; }
    else if (s.state === 'chase' && (!active || d > rules.shade_lose)) s.state = 'wander';
    let dx = 0, dz = 0, sp = speed;
    if (s.state === 'chase') { [dx, dz] = unit(p.pos[0] - starts[i][0], p.pos[2] - starts[i][2]); sp = Math.min(speed, d); }
    else {
      // Ticket-03 wander: nearest weak lantern (lit, fuel < 30) first; else nearest unlit lantern; loiter at random points once there.
      const weak = nearestBy(g.lanterns.filter(isWeak), starts[i]);
      if (weak) {
        if (s.lantern !== weak.id) { s.lantern = weak.id; s.target = null; }
        if (distXZ(starts[i], weak.pos) <= rules.drain_radius) { s.state = 'drain'; s.drainTicks = 0; return; }
        [dx, dz] = unit(weak.pos[0] - s.pos[0], weak.pos[2] - s.pos[2]);
      } else {
        if (s.lantern) { s.lantern = null; s.target = null; }
        const dark = nearestBy(g.lanterns.filter(l => !l.lit), starts[i]);
        if (s.target && distXZ(s.pos, s.target) < 1) s.target = null;
        if (!s.target && dark && distXZ(starts[i], dark.pos) > rules.drain_radius) [dx, dz] = unit(dark.pos[0] - s.pos[0], dark.pos[2] - s.pos[2]);
        else { if (!s.target) s.target = pickTarget(g, g.rng.shades); [dx, dz] = unit(s.target[0] - s.pos[0], s.target[2] - s.pos[2]); }
      }
      sp = rules.shade_wander_speed * dt;
    }
    // Soft separation so pursuers do not merge into one blob; result never exceeds the state's speed.
    let vx = dx * sp, vz = dz * sp;
    const sep2 = rules.shade_separation * rules.shade_separation, si = starts[i];
    for (let j = 0; j < starts.length; j++) if (j !== i) {
      const ex = si[0] - starts[j][0], ez = si[2] - starts[j][2]; if (ex * ex + ez * ez >= sep2 + 1e-9) continue; // cheap reject; exact test below
      const dd = distXZ(starts[i], starts[j]);
      if (dd < rules.shade_separation) {
        const [ux, uz] = dd > 1e-9 ? unit(starts[i][0] - starts[j][0], starts[i][2] - starts[j][2]) : (() => { const a = (Math.min(i, j) * 31 + Math.max(i, j) * 17) * 2.399963 ; const sg = i < j ? 1 : -1; return [Math.cos(a) * sg, Math.sin(a) * sg] as [number, number]; })();
        const f = speed * (1 - dd / rules.shade_separation); vx += ux * f; vz += uz * f;
      }
    }
    const len = Math.hypot(vx, vz), cap = Math.max(sp, 1e-9); if (len > cap) { vx *= cap / len; vz *= cap / len; }
    const moved = moveShade(g, s, vx, vz);
    if (!moved && s.state === 'wander') s.target = null;
  });
  for (const d of g.drifters) {
    if (d.state === 'removed') continue;
    const dist = distXZ(d.pos, p.pos);
    const wants = active && p.carried >= rules.drifter_min_carry && dist <= rules.drifter_detect;
    if (d.state === 'idle' && wants && !d.used) d.state = 'chase';
    else if (d.state === 'chase' && !wants) d.state = 'idle';
    let dx = 0, dz = 0, sp = 0;
    if (d.state === 'chase') { [dx, dz] = unit(p.pos[0] - d.pos[0], p.pos[2] - d.pos[2]); sp = Math.min(rules.drifter_speed * dt, dist); }
    else if (d.state === 'flee') { [dx, dz] = unit(d.pos[0] - p.pos[0], d.pos[2] - p.pos[2]); sp = rules.drifter_speed * dt; }
    else { if (!d.target || distXZ(d.pos, d.target) < 1) d.target = pickTarget(g, g.rng.drifters); [dx, dz] = unit(d.target[0] - d.pos[0], d.target[2] - d.pos[2]); sp = rules.drifter_idle_speed * dt; }
    d.pos[0] += dx * sp; d.pos[2] += dz * sp;
    const h = g.def.ground(d.pos[0], d.pos[2]); if (h !== null && h < 10) d.pos[1] = h + rules.drifter_hover;
  }

  // 9. Contacts: drifters steal first, then shades hit in ascending id order.
  if (active && !g.bench) {
    for (const d of [...g.drifters].sort(byId)) if (d.state === 'chase' && !d.used && distXZ(d.pos, p.pos) <= rules.drifter_touch) {
      const amount = Math.min(rules.drifter_steal, p.carried);
      if (amount > 0) { p.carried -= amount; d.stolen = amount; d.used = true; d.state = 'flee'; d.ticks = rules.drifter_flee_ticks; emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried }); }
    }
    for (const s of [...g.shades].sort(byId)) {
      if (p.invuln > 0) break;
      if ((s.state !== 'chase' && s.state !== 'wander') || s.evac) continue;
      if (distXZ(s.pos, p.pos) <= tuning.shade_hit_radius && Math.abs(s.pos[1] - p.pos[1]) <= rules.height_tolerance) {
        p.flames = Math.max(0, p.flames - 1);
        const dropped = Math.floor(p.carried * tuning.hit_drop_ratio); p.carried -= dropped; dropMotes(g, p.pos, dropped, true);
        p.invuln = rules.invuln_ticks;
        const [ux, uz] = unit(s.pos[0] - p.pos[0], s.pos[2] - p.pos[2]); const per = rules.recoil_m / rules.recoil_ticks;
        s.state = 'recoil'; s.ticks = rules.recoil_ticks; s.recoil = { dx: ux * per, dz: uz * per, ticks: rules.recoil_ticks };
        emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      }
    }
  }

  // 10. Scheduled spawns (new entities interact from next tick).
  const t = g.simTick;
  if (g.random.motes && t % rules.mote_interval === 0 && g.motes.length < rules.mote_cap) {
    const taken = new Set(g.motes.map(m => m.point));
    const free = g.def.motePoints.map((_, i) => i).filter(i => !taken.has(i));
    if (free.length) { const i = free[Math.floor(g.rng.motes() * free.length)]; g.motes.push({ id: `M${g.nextId.M++}`, pos: copy(g.def.motePoints[i]), kind: 'random', ttl: null, point: i }); }
  }
  if (g.random.shades) {
    const count = t === rules.shade_first_spawn ? 2 : t > rules.shade_first_spawn && (t - rules.shade_first_spawn) % g.def.shadeInterval === 0 ? 1 : 0;
    const usedPts = new Set<number>(); const ids = new Set(g.shades.map(s => s.id));
    for (let k = 0; k < count && g.shades.length < g.def.shadeMax; k++) {
      const valid = g.def.shadePoints.map((_, i) => i).filter(i => !usedPts.has(i) && distXZ(g.def.shadePoints[i], p.pos) >= rules.shade_spawn_min_dist
        && !g.lanterns.some(l => hasSafeZone(l) && distXZ(l.pos, g.def.shadePoints[i]) <= tuning.safe_radius));
      if (!valid.length) break;
      const i = valid[Math.floor(g.rng.shades() * valid.length)]; usedPts.add(i);
      const id = freshId('S', g, ids); ids.add(id);
      g.shades.push({ id, pos: copy(g.def.shadePoints[i]), hover: 0, state: 'spawning', ticks: 1, push: null, recoil: null, evac: null, target: null, lantern: null, drainTicks: 0 });
      emit('shade_spawned', { id });
    }
  }
  if (g.random.drifters && t % rules.drifter_interval === 0 && g.drifters.filter(d => d.state !== 'removed').length < rules.drifter_max) {
    const pt = g.def.shadePoints[Math.floor(g.rng.drifters() * g.def.shadePoints.length)];
    const ids = new Set(g.drifters.map(d => d.id));
    g.drifters.push({ id: freshId('D', g, ids), pos: [pt[0], pt[1] + rules.drifter_hover, pt[2]], state: 'idle', stolen: 0, ticks: 0, used: false, target: null });
  }

  // 11. Win / loss (Ticket-03): no_flames always first; at dawn win only with >= ceil(0.6 x total) lanterns lit.
  const lit = g.lanterns.filter(l => l.lit);
  const reason = g.bench ? null : p.flames <= 0 ? 'no_flames' : g.time_left_s <= 0 ? (lit.length >= litNeeded(g.lanterns.length) ? 'dawn_survived' : 'dawn') : null;
  if (reason) {
    g.state = reason === 'dawn_survived' ? 'won' : 'lost'; g.result = reason;
    if (g.state === 'won') for (const l of lit) g.score += tuning.score.per_lit_lantern_dawn + Math.floor(l.fuel / FU);
    if (g.state === 'won') g.score += p.flames * tuning.score.per_flame_left;
    emit('game_over', { result: g.state, reason });
  }
  return events;
}

const r3 = (v: number) => { const x = Math.round(v * 1000) / 1000; return x === 0 ? 0 : x; };
const rv = (p: number[]) => p.map(r3);
export function snapshot(g: Game) {
  const p = g.player;
  return {
    type: 'snapshot', tick: g.tick, sim_tick: g.simTick, night: g.night, state: g.state, time_left_s: r3(g.time_left_s), score: g.score,
    wind: { active: g.wind.active, dir_deg: g.wind.dir_deg, warning: g.wind.warning },
    player: { pos: rv(p.pos), vel: rv(p.vel), grounded: p.grounded, flames: p.flames, carried: p.carried, capacity: capacity(p),
      invuln: r3(p.invuln / 60), dash_cd_s: r3(p.dashCd / 60), pulse_cd_s: r3(p.pulseCd / 60), charm_s: r3(p.charm / 60) },
    lanterns: g.lanterns.map(l => ({ id: l.id, pos: rv(l.pos), lit: l.lit, deposited: l.deposited, fuel: l.lit ? fuelOut(l.fuel) : 0, ever_lit: l.ever_lit, relit_count: l.relit_count })),
    shades: g.shades.map(s => ({ id: s.id, pos: rv(s.pos), state: s.state, target_lantern_id: s.lantern })),
    motes_active: g.motes.length,
    motes: g.motes.map(m => ({ id: m.id, pos: rv(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : r3(m.ttl / 60) })),
    drifters: g.drifters.map(d => ({ id: d.id, pos: rv(d.pos), state: d.state, stolen: d.stolen })),
    charms: g.charms.map(c => ({ id: c.id, pos: rv(c.pos), available: c.available, respawn_s: r3(c.respawn / 60) }))
  };
}

// ---------- Ticket-04 benchmark scene (pure, deterministic) ----------
export const BENCH = { shades: 200, motes: 100, island_r: 38, mote_y: 0 } as const;
/** Night 1 bench scenario: 200 wander shades spread uniformly over the island (outside the lit safe zones), 100 motes, L1–L3 lit at fuel 100, Mây at (0,0,0). */
export function benchScenario(seed = 42) {
  const r = mulberry((seed >>> 0) ^ 0xBE4C), def = nights[1];
  const lit = def.lanterns.slice(0, 3);
  const inSafe = (x: number, z: number) => lit.some(l => Math.hypot(l[0] - x, l[2] - z) <= tuning.safe_radius + 0.5);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  // Shades: sunflower (Vogel) spiral = even area coverage; seeded rotation + small jitter; points in lit safe zones skipped.
  const rot = r() * Math.PI * 2, spiral = (m: number) => {
    const pts: number[][] = [];
    for (let k = 0; k < m; k++) {
      const d = BENCH.island_r * Math.sqrt((k + 0.5) / m), a = k * 2.399963229728653 + rot;
      const x = Math.cos(a) * d + (r() - 0.5) * 0.6, z = Math.sin(a) * d + (r() - 0.5) * 0.6;
      if (!inSafe(x, z) && Math.hypot(x, z) <= BENCH.island_r) pts.push([round(x), 0, round(z)]);
    }
    return pts;
  };
  let m = BENCH.shades, shadePts = spiral(m);
  while (shadePts.length < BENCH.shades) shadePts = spiral(++m);
  while (shadePts.length > BENCH.shades) shadePts.splice(Math.floor(r() * shadePts.length), 1);
  // Motes: uniform random in the disc, at least 0.8 m apart.
  const point = (gap: number, taken: number[][]) => {
    for (let tries = 0; tries < 10000; tries++) {
      const a = r() * Math.PI * 2, d = BENCH.island_r * Math.sqrt(r()), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!taken.some(q => Math.hypot(q[0] - x, q[2] - z) < gap)) return [round(x), 0, round(z)];
    }
    throw new Error('bench: no free point');
  };
  const motePts: number[][] = [];
  for (let i = 0; i < BENCH.motes; i++) motePts.push(point(0.8, motePts));
  return {
    bench: true, random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    player: { pos: [0, 0, 0] },
    lanterns: ['L1', 'L2', 'L3'].map(id => ({ id, lit: true, fuel: tuning.fuel_max })),
    shades: shadePts.map((pos, i) => ({ id: `S${i + 1}`, pos, state: 'wander' })),
    motes: motePts.map((p, i) => ({ id: `M${i + 1}`, pos: [p[0], BENCH.mote_y, p[2]] }))
  };
}
/** Camera orbit for the bench: centre (0,0,0), r = 30 m, Y = 15 m, starts at (30,15,0), counter-clockwise seen from above, 15 s per lap. */
export function benchCamera(t_s: number): [number, number, number] {
  const a = 2 * Math.PI * t_s / 15; return [30 * Math.cos(a), 15, -30 * Math.sin(a)];
}
