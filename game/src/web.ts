// Browser layer: Three.js rendering, DOM HUD/menus, input and audio. All rules live in core.ts.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGame, step, idle, tuning, rules, nights, capacity, hasSafeZone, isWeak, litNeeded, FU, benchScenario, benchCamera, type Game, type NightId, type Event, type Input, type NightDef, type Lantern } from './core.ts';
import { keyboardMove, actionDown, conflicts, loadBindings, keyName, ACTIONS, ACTION_LABEL, DEFAULT_BINDINGS, type Action, type Bindings } from './keyboard.ts';
import { insertEntry, parseEntries, nameError, normalizeName, isoLocal, type Entry } from './leaderboard.ts';
import { Sound } from './audio.ts';
import './style.css';

// ---------- Palette (Ticket-02 Part 3) ----------
const C = {
  sky: 0x0E1430, fog: 0x1B2350, grass: 0x2F5D50, sand: 0xC9B48A, wood: 0x6B4A2F, cloud: 0x12384A,
  lit: 0xFFB347, core: 0xFFE9B0, unlit: 0x5B5F6E, moteCore: '#FFF6C2', moteHalo: '#FFE58A',
  shade: 0x120A1A, outline: 0x7A3CFF, stunned: 0x3A3450, shirt: 0xE8E2D0, scarf: 0xC8102E,
  gold: 0xF2C14E, drifter: 0x8FA3B8, rock: 0x3A4152, skin: 0xF1C9A0, hair: 0x1E1A24
};

// ---------- Settings (persisted) ----------
type Settings = { master: number; music: number; sfx: number; sens: number; fps: boolean; cb: boolean; reduce: boolean; big: boolean; subs: boolean; bindings: Bindings };
const SKEY = 'dao-den-long.settings.v1';
const settings: Settings = (() => {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d: Settings = { master: 0.8, music: 0.5, sfx: 0.8, sens: 1, fps: false, cb: false, reduce, big: false, subs: true, bindings: structuredClone(DEFAULT_BINDINGS) };
  try { const raw = JSON.parse(localStorage.getItem(SKEY) ?? '{}'); return { ...d, ...raw, bindings: loadBindings(raw.bindings) }; } catch { return d; }
})();
const saveSettings = () => { localStorage.setItem(SKEY, JSON.stringify(settings)); sound.setVolumes(settings.master, settings.music, settings.sfx); };
const sound = new Sound(); sound.setVolumes(settings.master, settings.music, settings.sfx);
// Ticket-03 colorblind mode: shade outline/eyes #7A3CFF -> #00B3FF, UI warning #FF5A5F -> #FFFFFF + ⚠ (CSS body.cb).
const shadeLine = () => settings.cb ? 0x00B3FF : C.outline;
const applyCb = () => document.body.classList.toggle('cb', settings.cb);
applyCb();
// Ticket-04 accessibility: large text (x1.25) and reduced motion (no camera shake, no screen flash) as body classes.
const applyA11y = () => { document.body.classList.toggle('big', settings.big); document.body.classList.toggle('reduce', settings.reduce); };
applyA11y();
const K = (a: Action) => keyName(settings.bindings[a][0]);
/** Compact key label for the round cooldown badges. */
const Kshort = (a: Action) => { const c = settings.bindings[a][0] ?? ''; return /^Shift/.test(c) ? '⇧' : /^Control/.test(c) ? 'Ctrl' : /^Alt/.test(c) ? 'Alt' : keyName(c).slice(0, 5); };

// ---------- Story ----------
const STORY: Record<NightId, { title: string; lines: string[] }> = {
  1: { title: 'Đảo Bến', lines: ['Mây à, sương đen đã nuốt mất bến thuyền. Năm chiếc đèn lồng đang chờ cháu.', 'Mỗi đèn cần mười đom đóm để thắp, nhưng dầu cạn dần. Mang thêm đom đóm tới đèn đã sáng để châm dầu. Giữ ít nhất ba đèn sáng tới bình minh.', 'Đèn yếu dưới 30 dầu sẽ mất vùng an toàn và Bóng Mực kéo tới hút dầu. Nhấn Q để Tỏa Sáng xua chúng đi.'] },
  2: { title: 'Đảo Cau', lines: ['Hai hòn đảo nối với nhau bằng cây cầu tre. Bục gió vàng sẽ bắn cháu bay qua biển mây.', 'Cẩn thận Gió Lạc — dải lụa xám ấy thích túi đầy đom đóm. Nhặt Bùa Gió đỏ để chạy nhanh và lướt liên tục.'] },
  3: { title: 'Đảo Chuông', lines: ['Đảo Chuông có ba tầng. Leo dốc lên tầng giữa, rồi nhảy bục gió để lên đỉnh chuông.', 'Khi lá bắt đầu bay rối, một cơn gió lớn sắp thổi. Giữ vững chân, đừng để gió hất cháu xuống biển mây.'] }
};

// ---------- DOM ----------
const flameSvg = '<svg viewBox="0 0 24 32"><path d="M12 1C14 8 21 11 21 20a9 9 0 0 1-18 0c0-5 3-7 4-11 1 3 2 4 3 4 0-4 0-8 2-12z"/><path class="in" d="M12 14c1 3 4 5 4 8a4 4 0 0 1-8 0c0-2 2-4 4-8z"/></svg>';
document.querySelector('#app')!.innerHTML = `
<div id="hud" class="hidden">
  <div class="hud-tl" id="flames"></div>
  <div class="hud-tc"><div id="timer">05:00</div><div id="nightlabel"></div></div>
  <div class="hud-tr"><div id="lamps"></div><div id="goal"></div><div id="score">0</div></div>
  <div id="status"></div>
  <div id="prompt" class="hidden"></div>
  <div id="toasts"></div>
  <div id="windwarn" class="hidden">🍃 Gió lớn sắp thổi!</div>
  <div id="countdown" class="hidden"></div>
  <div id="captions" aria-live="polite"></div>
  <div id="shadearrows"></div>
  <div class="hud-bc"><div id="motebar"></div><div id="carrytext"></div></div>
  <div class="hud-br">
    <div class="cd" id="cd-dash"><div class="ring"></div><b id="k-dash">⇧</b><span>Lướt</span></div>
    <div class="cd" id="cd-pulse"><div class="ring"></div><b id="k-pulse">Q</b><span>Tỏa Sáng</span></div>
  </div>
  <div class="hud-bl" id="help"></div>
  <div id="arrow" class="hidden"><div class="tip"></div><span></span></div>
  <div id="flash"></div>
</div>
<div id="fps" class="hidden"></div>
<div id="screen"></div>`;
const $ = (id: string) => document.getElementById(id)!;
for (let i = 0; i < tuning.capacity_max; i++) $('motebar').insertAdjacentHTML('beforeend', '<i></i>');
const moveKeys = () => [K('up'), K('left'), K('down'), K('right')].join('');
function renderHints() {
  $('help').innerHTML = `<kbd>${moveKeys()}</kbd> chạy · <kbd>${K('jump')}</kbd> nhảy · <kbd>${K('dash')}</kbd> lướt · <kbd>${K('interact')}</kbd> thắp / châm dầu · <kbd>${K('pulse')}</kbd> tỏa sáng · kéo chuột xoay · <kbd>${K('pause')}</kbd> tạm dừng`;
  $('k-dash').textContent = Kshort('dash'); $('k-pulse').textContent = Kshort('pulse');
}
renderHints();
/** Ticket-04 subtitles / visual cues: short captions for audio-only or easy-to-miss events (toggle "Phụ đề & chỉ báo"). */
function caption(text: string, cls = '', ms = 3200) {
  if (!settings.subs) return;
  const box = $('captions'); const d = document.createElement('div'); d.className = 'cap ' + cls; d.textContent = text; box.append(d);
  while (box.children.length > 3) box.firstElementChild!.remove();
  setTimeout(() => d.remove(), ms);
}

// ---------- Renderer & scene ----------
const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; renderer.outputColorSpace = T.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color(C.sky); scene.fog = new T.Fog(C.fog, 40, 150);
const camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
const hemi = new T.HemisphereLight(0xb8c4ff, C.fog, 0.15); scene.add(hemi);
const moon = new T.DirectionalLight(0x9fb2ff, 0.7); moon.position.set(-40, 60, 30); scene.add(moon);

const lambert = (color: number, extra: T.MeshLambertMaterialParameters = {}) => new T.MeshLambertMaterial({ color, ...extra });
function add<O extends T.Object3D>(o: O, parent: T.Object3D, x = 0, y = 0, z = 0) { o.position.set(x, y, z); parent.add(o); return o; }
const mesh = (g: T.BufferGeometry, m: T.Material | T.Material[], parent: T.Object3D, x = 0, y = 0, z = 0) => add(new T.Mesh(g, m), parent, x, y, z);
function glowTexture(inner: string, outer: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, inner); gr.addColorStop(0.25, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const moteTex = glowTexture(C.moteCore, C.moteHalo), warmTex = glowTexture('#FFE9B0', '#FFB347'), violetTex = glowTexture('#d9c2ff', '#7A3CFF');
const sprite = (tex: T.Texture, scale: number, opacity = 1) => { const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false })); s.scale.setScalar(scale); return s; };

// Sky dome, stars, moon, cloud sea (static, shared by all nights).
{
  const g = new T.SphereGeometry(300, 32, 16); const col: number[] = []; const top = new T.Color(C.sky), hor = new T.Color(C.fog);
  const pos = g.getAttribute('position'); for (let i = 0; i < pos.count; i++) { const k = Math.max(0, Math.min(1, pos.getY(i) / 120)); const c = hor.clone().lerp(top, Math.pow(k, 0.6)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  scene.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })));
  const sp: number[] = []; for (let i = 0; i < 500; i++) { const a = i * 2.39996, y = 0.15 + ((i * 0.618) % 1) * 0.85, r = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * r * 250, y * 250, Math.sin(a) * r * 250); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xf5f1e6, size: 1.1, fog: false, transparent: true, opacity: 0.85 })));
  const m = sprite(glowTexture('#fffbe8', '#cfd8ff'), 40); m.position.set(-110, 120, 160); (m.material as T.SpriteMaterial).fog = false; scene.add(m);
  const sea = mesh(new T.PlaneGeometry(900, 900), lambert(C.cloud), scene, 0, -9); sea.rotation.x = -Math.PI / 2;
  const puffs = new T.InstancedMesh(new T.SphereGeometry(1, 10, 6), lambert(0x1d4a5e, { transparent: true, opacity: 0.85 }), 90);
  const mm = new T.Matrix4(); for (let i = 0; i < 90; i++) { const a = i * 2.39996, r = 55 + (i * 37 % 120); mm.compose(new T.Vector3(35 + Math.cos(a) * r, -8.5 + (i % 3) * 0.4, Math.sin(a) * r), new T.Quaternion(), new T.Vector3(8 + i % 7, 1.6, 6 + i % 5)); puffs.setMatrixAt(i, mm); }
  scene.add(puffs);
}

// ---------- World building per night ----------
let world = new T.Group(); scene.add(world);
const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function islandMesh(parent: T.Object3D, cx: number, cz: number, r: number) {
  mesh(new T.CylinderGeometry(r, r * 0.45, 9, 64), lambert(C.rock), parent, cx, -4.6, cz);
  mesh(new T.CylinderGeometry(r, r, 0.3, 64), lambert(C.sand), parent, cx, -0.17, cz);
  mesh(new T.CylinderGeometry(r - 1.6, r - 1.6, 0.3, 64), lambert(C.grass), parent, cx, -0.14, cz);
}
function padMesh(parent: T.Object3D, p: number[]) {
  const g = new T.Group(); add(g, parent, p[0], p[1], p[2]);
  mesh(new T.CylinderGeometry(1, 1.1, 0.16, 32), lambert(C.wood), g, 0, 0.0);
  const top = mesh(new T.CircleGeometry(0.85, 32), new T.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.8 }), g, 0, 0.09); top.rotation.x = -Math.PI / 2;
  const ring = mesh(new T.RingGeometry(0.95, 1.2, 32), new T.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.5, side: T.DoubleSide }), g, 0, 0.6); ring.rotation.x = -Math.PI / 2;
  g.userData.ring = ring; pads.push(g);
}
let decorData: { spots: T.Vector3[]; scale: number[]; tree: boolean[]; hidden: boolean[]; trunks: T.InstancedMesh; crowns: T.InstancedMesh } | null = null;
function decor(def: NightDef) {
  const spots: T.Vector3[] = [];
  for (let i = 0; spots.length < 70 && i < 600; i++) {
    const a = rand(i) * Math.PI * 2, r = 8 + rand(i + 99) * 40, x = (def.night === 2 && i % 2 ? 70 : 0) + Math.cos(a) * r, z = Math.sin(a) * r;
    const h = def.ground(x, z), edge = def.ground(x + 2.5, z) === h && def.ground(x - 2.5, z) === h && def.ground(x, z + 2.5) === h && def.ground(x, z - 2.5) === h;
    if (h === null || !edge || h > 6) continue;
    const far = (q: number[], d: number) => Math.hypot(q[0] - x, q[2] - z) > d;
    if (!def.lanterns.every(q => far(q, 4)) || !def.motePoints.every(q => far(q, 2)) || !far(def.start, 12) || !def.charms.every(q => far(q, 3)) || !def.pads.every(q => far(q.pos, 3))) continue;
    if (def.night === 3) { const t = (deg: number) => Math.abs(-x * Math.sin(deg * Math.PI / 180) + z * Math.cos(deg * Math.PI / 180)); if (t(30) < 4 || t(150) < 4) continue; }
    spots.push(new T.Vector3(x, h, z));
  }
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.15, 0.25, 1.6, 6), lambert(C.wood), spots.length);
  const crowns = new T.InstancedMesh(new T.ConeGeometry(1.1, 2.6, 7), lambert(0x2a5446), spots.length);
  const rocks = new T.InstancedMesh(new T.DodecahedronGeometry(0.6), lambert(0x59627a), spots.length);
  const m = new T.Matrix4(), q = new T.Quaternion(), zero = new T.Matrix4().makeScale(0, 0, 0);
  spots.forEach((p, i) => {
    const tree = i % 3 !== 0, s = 0.8 + rand(i + 7) * 0.6;
    trunks.setMatrixAt(i, tree ? m.compose(p.clone().setY(p.y + 0.8 * s), q, new T.Vector3(s, s, s)) : zero);
    crowns.setMatrixAt(i, tree ? m.compose(p.clone().setY(p.y + 2.6 * s), q, new T.Vector3(s, s, s)) : zero);
    rocks.setMatrixAt(i, tree ? zero : m.compose(p.clone().setY(p.y + 0.2), q.setFromEuler(new T.Euler(i, i * 2, 0)), new T.Vector3(s, s * 0.7, s)));
    q.identity();
  });
  world.add(trunks, crowns, rocks);
  decorData = { spots, scale: spots.map((_, i) => 0.8 + rand(i + 7) * 0.6), tree: spots.map((_, i) => i % 3 !== 0), hidden: spots.map(() => false), trunks, crowns };
}
/** Trees standing between the camera and Mây shrink away so the player is never hidden. */
function updateOcclusion(cam: T.Vector3, f: T.Vector3) {
  const d = decorData; if (!d) return; let dirty = false; const m = new T.Matrix4(), q = new T.Quaternion(), zero = new T.Matrix4().makeScale(0, 0, 0);
  const dx = f.x - cam.x, dz = f.z - cam.z, len2 = dx * dx + dz * dz || 1;
  d.spots.forEach((p, i) => {
    if (!d.tree[i]) return;
    const u = Math.max(0, Math.min(1, ((p.x - cam.x) * dx + (p.z - cam.z) * dz) / len2)), ex = cam.x + dx * u - p.x, ez = cam.z + dz * u - p.z;
    const hide = u > 0.02 && u < 0.97 && ex * ex + ez * ez < 2.2 * 2.2;
    if (hide === d.hidden[i]) return; d.hidden[i] = hide; dirty = true; const s = d.scale[i];
    d.trunks.setMatrixAt(i, hide ? zero : m.compose(p.clone().setY(p.y + 0.8 * s), q, new T.Vector3(s, s, s)));
    d.crowns.setMatrixAt(i, hide ? zero : m.compose(p.clone().setY(p.y + 2.6 * s), q, new T.Vector3(s, s, s)));
  });
  if (dirty) { d.trunks.instanceMatrix.needsUpdate = true; d.crowns.instanceMatrix.needsUpdate = true; }
}
function buildTerrain(def: NightDef) {
  if (def.night === 1) islandMesh(world, 0, 0, 40);
  if (def.night === 2) {
    islandMesh(world, 0, 0, 28); islandMesh(world, 70, 0, 28);
    mesh(new T.BoxGeometry(20, 0.3, 4), lambert(C.wood), world, 35, -0.15, 0);
    for (let x = 26; x <= 44; x += 1.2) mesh(new T.BoxGeometry(0.12, 0.05, 4.05), lambert(0x4e3522), world, x, 0.01, 0);
    for (const z of [-2, 2]) mesh(new T.BoxGeometry(20, 0.18, 0.18), lambert(0x4e3522), world, 35, -0.3, z);
  }
  if (def.night === 3) {
    islandMesh(world, 0, 0, 45);
    const cliff = lambert(0x4a4f62);
    const sh = new T.Shape(); sh.absarc(0, 0, 24, 0, Math.PI, false); sh.absarc(0, 0, 12, Math.PI, 0, true);
    const tier1 = new T.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false, curveSegments: 48 }); tier1.rotateX(Math.PI / 2); tier1.translate(0, 3, 0);
    world.add(new T.Mesh(tier1, [lambert(C.grass), cliff]));
    mesh(new T.CylinderGeometry(8, 8, 6, 48), [cliff, lambert(C.grass), cliff], world, 0, 3, 0);
    for (const deg of [30, 150]) {
      const g = new T.Group(); g.rotation.y = -deg * Math.PI / 180; world.add(g);
      const len = Math.hypot(6, 3), ramp = mesh(new T.BoxGeometry(len, 0.4, 3), lambert(C.wood), g, 27, 1.3, 0); ramp.rotation.z = -Math.atan2(3, 6);
      mesh(new T.BoxGeometry(4.2, 3, 3), cliff, g, 22, 1.5, 0);
      for (let s = 24.6; s < 30; s += 0.9) { const y = 3 * (30 - s) / 6; mesh(new T.BoxGeometry(0.15, 0.06, 3.05), lambert(0x4e3522), g, s, y + 0.2, 0).rotation.z = -Math.atan2(3, 6); }
    }
    // Bell tower: 8 m on tier 2.
    const stone = lambert(0x6e6a78);
    mesh(new T.CylinderGeometry(2, 2.2, 8, 24), stone, world, 0, 10, 0);
    mesh(new T.ConeGeometry(3, 2.6, 24), lambert(0x7a2a2a), world, 0, 15.3, 0);
    const bell = mesh(new T.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.6), lambert(C.gold, { emissive: 0x6b4a10 }), world, 0, 13.4, 0); bell.rotation.x = Math.PI;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const w = mesh(new T.PlaneGeometry(0.8, 1.2), new T.MeshBasicMaterial({ color: C.core }), world, Math.cos(a) * 2.21, 11, Math.sin(a) * 2.21); w.rotation.y = Math.PI / 2 - a; }
  }
  for (const pad of def.pads) padMesh(world, pad.pos);
  decor(def);
}

// ---------- Entities ----------
function makeMay() {
  const g = new T.Group();
  const shirt = lambert(C.shirt), dark = lambert(0x2b3350), scarf = lambert(C.scarf);
  const body = mesh(new T.CylinderGeometry(0.26, 0.42, 0.85, 12), shirt, g, 0, 0.78);
  mesh(new T.SphereGeometry(0.3, 16, 12), lambert(C.skin), g, 0, 1.45);
  const hair = mesh(new T.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), lambert(C.hair), g, 0, 1.49, -0.02); hair.rotation.x = -0.25;
  mesh(new T.TorusGeometry(0.25, 0.08, 8, 20), scarf, g, 0, 1.17).rotation.x = Math.PI / 2;
  const tail = mesh(new T.BoxGeometry(0.16, 0.5, 0.05), scarf, g, 0.12, 1.0, -0.3); tail.rotation.x = 0.5;
  for (const x of [-0.11, 0.11]) mesh(new T.SphereGeometry(0.045, 8, 6), dark, g, x, 1.47, 0.27);
  const legs = [-0.14, 0.14].map(x => mesh(new T.CapsuleGeometry(0.09, 0.3, 4, 8), dark, g, x, 0.26));
  const arm = new T.Group(); add(arm, g, 0.42, 1.0, 0.1);
  mesh(new T.CylinderGeometry(0.02, 0.02, 0.35), lambert(C.wood), arm, 0, -0.1);
  const lamp = mesh(new T.SphereGeometry(0.13, 10, 8), new T.MeshBasicMaterial({ color: C.lit }), arm, 0, -0.33);
  const glow = sprite(warmTex, 1.3, 0.8); add(glow, arm, 0, -0.33);
  const light = new T.PointLight(0xffc47a, 14, 14, 1.6); add(light, g, 0.4, 1.4, 0.2);
  const charmAura = sprite(glowTexture('#ffd0d6', '#C8102E'), 2.6, 0.0); add(charmAura, g, 0, 0.9);
  scene.add(g); return { g, body, legs, tail, lamp, glow, light, charmAura };
}
const may = makeMay();
type LampView = { g: T.Group; shade: T.Mesh; core: T.Sprite; light: T.PointLight; ring: T.Mesh; progress: T.Mesh; dep: number; bar: T.Group; fill: T.Mesh; torn: T.Group };
const barBgMat = new T.MeshBasicMaterial({ color: 0x0b0f22, transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, fog: false });
const barRimMat = new T.MeshBasicMaterial({ color: 0xF2C14E, transparent: true, opacity: 0.55, depthWrite: false, depthTest: false, fog: false });
const lamps = new Map<string, LampView>();
function makeLamp(pos: number[]): LampView {
  const g = new T.Group(); add(g, world, pos[0], pos[1], pos[2]);
  mesh(new T.CylinderGeometry(0.12, 0.16, 2.4, 8), lambert(C.wood), g, 0, 1.2);
  mesh(new T.BoxGeometry(0.9, 0.1, 0.1), lambert(C.wood), g, 0.35, 2.35);
  mesh(new T.CylinderGeometry(0.55, 0.65, 0.18, 12), lambert(C.wood), g, 0, 0.09);
  const shade = mesh(new T.SphereGeometry(0.42, 16, 12), lambert(C.unlit), g, 0.7, 1.9); shade.scale.y = 1.25;
  mesh(new T.CylinderGeometry(0.22, 0.22, 0.08, 12), lambert(C.gold), g, 0.7, 2.45); mesh(new T.CylinderGeometry(0.22, 0.22, 0.08, 12), lambert(C.gold), g, 0.7, 1.36);
  const core = sprite(warmTex, 3.2, 0); add(core, g, 0.7, 1.9);
  const light = new T.PointLight(C.lit, 0, 22, 1.4); add(light, g, 0.7, 2.2);
  const ring = mesh(new T.RingGeometry(tuning.safe_radius - 0.12, tuning.safe_radius, 64), new T.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false }), g, 0, 0.06); ring.rotation.x = -Math.PI / 2; ring.visible = false;
  const progress = mesh(new T.RingGeometry(0.75, 0.95, 32, 1, 0, 0.0001), new T.MeshBasicMaterial({ color: C.gold, side: T.DoubleSide }), g, 0, 0.2); progress.rotation.x = -Math.PI / 2;
  // Fuel bar (billboarded above the lantern): fill scales with fuel/100.
  const bar = new T.Group(); add(bar, g, 0.7, 3.25);
  const rim = mesh(new T.PlaneGeometry(2.06, 0.38), barRimMat, bar); rim.renderOrder = 10;
  const bg = mesh(new T.PlaneGeometry(2.0, 0.32), barBgMat, bar, 0, 0, 0.005); bg.renderOrder = 11;
  const fillGeo = new T.PlaneGeometry(1.88, 0.22); fillGeo.translate(0.94, 0, 0);
  const fill = mesh(fillGeo, new T.MeshBasicMaterial({ color: C.gold, transparent: true, depthWrite: false, depthTest: false, fog: false }), bar, -0.94, 0, 0.01); fill.renderOrder = 12;
  // Torn paper (colorblind-safe unlit cue): dark rips + a hanging flap on the paper shade.
  const torn = new T.Group(); add(torn, g, 0.7, 1.9);
  const rip = new T.MeshBasicMaterial({ color: 0x14121c, side: T.DoubleSide });
  [[0.0, 0.08, 0.42, 0.3], [0.28, -0.1, 0.3, -0.5], [-0.3, 0.15, 0.27, 0.9]].forEach(([x, y, z, r]) => { const m = mesh(new T.CircleGeometry(0.12, 3), rip, torn, x, y, z); m.lookAt(x * 3, y, z * 3); m.rotation.z = r; });
  const flap = mesh(new T.PlaneGeometry(0.18, 0.3), lambert(0x8a8478, { side: T.DoubleSide }), torn, 0.12, -0.32, 0.4); flap.rotation.set(0.5, 0, 0.4);
  return { g, shade, core, light, ring, progress, dep: 0, bar, fill, torn };
}
type ShadeView = { g: T.Group; stars: T.Group; born: number; tether: T.Mesh };
const tetherGeo = new T.CylinderGeometry(0.05, 0.12, 1, 6, 1, true); tetherGeo.translate(0, 0.5, 0); tetherGeo.rotateX(Math.PI / 2);
const shadeViews = new Map<string, ShadeView>();
// Ticket-04 perf (200-shade benchmark): shades and motes are drawn with GPU instancing — one draw call per part for ALL
// shades (hull = body+tail, outline, eyes, aura billboard) and one for all motes — instead of ~10 meshes per shade.
// Shapes, colours and animation are unchanged; per-shade colour (normal / stunned / colour-blind) is an instance colour.
const shadeBodyGeo = new T.SphereGeometry(0.6, 16, 12), shadeTailGeo = new T.ConeGeometry(0.55, 1.0, 12);
const part = (geo: T.BufferGeometry, sx: number, sy: number, sz: number, y: number, flip: boolean) => {
  const g = geo.clone(); if (flip) g.rotateX(Math.PI); g.scale(sx, sy, sz); g.translate(0, y, 0); return g;
};
const INST_MAX = 256;
const instanced = (geo: T.BufferGeometry, mat: T.Material) => {
  const m = new T.InstancedMesh(geo, mat, INST_MAX); m.frustumCulled = false; m.count = 0;
  m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.setColorAt(0, new T.Color(1, 1, 1)); m.instanceColor!.setUsage(T.DynamicDrawUsage);
  scene.add(m); return m;
};
const glowMat = (map: T.Texture) => new T.MeshBasicMaterial({ map, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
const billboardGeo = new T.PlaneGeometry(1, 1);
const shadeInst = {
  hull: instanced(mergeGeometries([part(shadeBodyGeo, 1, 1.15, 1, 1.1, false), part(shadeTailGeo, 1, 1, 1, 0.45, true)])!, new T.MeshBasicMaterial()),
  outline: instanced(mergeGeometries([part(shadeBodyGeo, 1.1, 1.27, 1.1, 1.1, false), part(shadeTailGeo, 1.1, 1.1, 1.1, 0.45, true)])!, new T.MeshBasicMaterial({ side: T.BackSide })),
  eyes: instanced(mergeGeometries([-0.2, 0.2].map(x => new T.SphereGeometry(0.09, 8, 6).translate(x, 0, 0)))!, new T.MeshBasicMaterial()),
  aura: instanced(billboardGeo, glowMat(violetTex))
};
const moteInst = instanced(billboardGeo, glowMat(moteTex));
const starGeo = new T.OctahedronGeometry(0.1), starMat = new T.MeshBasicMaterial({ color: C.gold });
const _m = new T.Matrix4(), _m2 = new T.Matrix4(), _c = new T.Color(), _v = new T.Vector3(), _s = new T.Vector3();
/** Billboard (camera-facing, like a Sprite) instance at world position with uniform size; colour = rgb × opacity (additive). */
function setBillboard(im: T.InstancedMesh, i: number, pos: T.Vector3, size: number, hex: number, opacity: number) {
  im.setMatrixAt(i, _m.compose(pos, camera.quaternion, _s.set(size, size, size)));
  im.setColorAt(i, _c.setHex(hex).multiplyScalar(opacity));
}
function finishInstances(im: T.InstancedMesh, n: number) { im.count = n; im.instanceMatrix.needsUpdate = true; im.instanceColor!.needsUpdate = true; }
function makeShade(): ShadeView {
  const g = new T.Group(); world.add(g); // transform holder (+ stun stars); the body itself is instanced
  const stars = new T.Group(); add(stars, g, 0, 2.0); stars.visible = false;
  for (let i = 0; i < 3; i++) { const s = mesh(starGeo, starMat, stars, Math.cos(i * 2.09) * 0.45, 0, Math.sin(i * 2.09) * 0.45); s.userData.i = i; }
  // Drain tether: a glowing thread from the shade to the lantern it is drinking from.
  const tether = mesh(tetherGeo, new T.MeshBasicMaterial({ color: C.outline, transparent: true, opacity: 0.7, depthWrite: false }), world); tether.visible = false;
  return { g, stars, born: -1, tether };
}
type DrifterView = { g: T.Group; ribbons: T.Mesh[]; loot: T.Sprite[] };
const drifterViews = new Map<string, DrifterView>();
function makeDrifter(): DrifterView {
  const g = new T.Group(); world.add(g);
  const mat = new T.MeshLambertMaterial({ color: C.drifter, side: T.DoubleSide, transparent: true, opacity: 0.9, emissive: 0x2a3440 });
  const ribbons = [0, 1, 2].map(i => { const m = mesh(new T.PlaneGeometry(0.35, 1.8, 1, 6), mat, g, (i - 1) * 0.25, 0, 0); m.rotation.x = Math.PI / 2; return m; });
  for (const x of [-0.12, 0.12]) mesh(new T.SphereGeometry(0.06, 6, 4), new T.MeshBasicMaterial({ color: 0x1b2350 }), g, x, 0.15, 0.85);
  const loot = [0, 1, 2].map(() => { const s = sprite(moteTex, 0.6); g.add(s); return s; });
  return { g, ribbons, loot };
}
const charmViews = new Map<string, T.Group>();
function makeCharm(pos: number[]) {
  const g = new T.Group(); add(g, world, pos[0], pos[1], pos[2]);
  const card = new T.Group(); add(card, g, 0, 1.2); g.userData.card = card;
  mesh(new T.PlaneGeometry(0.75, 1.05), new T.MeshBasicMaterial({ color: C.gold, side: T.DoubleSide }), card);
  mesh(new T.PlaneGeometry(0.6, 0.9), new T.MeshBasicMaterial({ color: C.scarf, side: T.DoubleSide }), card, 0, 0, 0.01);
  mesh(new T.PlaneGeometry(0.6, 0.9), new T.MeshBasicMaterial({ color: C.scarf, side: T.DoubleSide }), card, 0, 0, -0.01);
  mesh(new T.TorusGeometry(0.16, 0.035, 6, 16), new T.MeshBasicMaterial({ color: C.gold }), card, 0, 0.1, 0.02);
  add(sprite(glowTexture('#ffd6dc', '#C8102E'), 2.4, 0.6), g, 0, 1.2);
  const base = mesh(new T.RingGeometry(0.6, 0.75, 24), new T.MeshBasicMaterial({ color: C.scarf, transparent: true, opacity: 0.6, side: T.DoubleSide }), g, 0, 0.05); base.rotation.x = -Math.PI / 2;
  return g;
}
const pads: T.Group[] = [];

// Effects: pulse wave, sparkle bursts, wind leaves.
const wave = mesh(new T.SphereGeometry(1, 24, 16), new T.MeshBasicMaterial({ color: C.core, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }), scene);
const waveRing = mesh(new T.RingGeometry(0.9, 1, 48), new T.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }), scene); waveRing.rotation.x = -Math.PI / 2;
let waveT = -1;
type Spark = { s: T.Sprite; v: T.Vector3; life: number; max: number };
const sparks: Spark[] = Array.from({ length: 80 }, () => { const s = sprite(moteTex, 0.5); s.visible = false; scene.add(s); return { s, v: new T.Vector3(), life: 0, max: 1 }; });
function burst(at: number[], n: number, speed: number, color = 0xffffff, size = 0.5) {
  let k = 0; for (const p of sparks) if (p.life <= 0 && k < n) {
    k++; p.s.visible = true; p.s.position.set(at[0], at[1], at[2]); (p.s.material as T.SpriteMaterial).color.setHex(color); p.s.scale.setScalar(size);
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u); p.v.set(Math.cos(a) * r, Math.abs(u) + 0.3, Math.sin(a) * r).multiplyScalar(speed * (0.5 + Math.random() * 0.5));
    p.life = p.max = 0.6 + Math.random() * 0.5;
  }
}
const LEAVES = 60;
const leaves = new T.InstancedMesh(new T.PlaneGeometry(0.22, 0.12), new T.MeshBasicMaterial({ color: 0xa8c47a, side: T.DoubleSide, transparent: true, opacity: 0.9 }), LEAVES);
leaves.instanceMatrix.setUsage(T.DynamicDrawUsage); leaves.visible = false; leaves.frustumCulled = false; scene.add(leaves);
const leafSeeds = Array.from({ length: LEAVES }, (_, i) => [rand(i * 3), rand(i * 3 + 1), rand(i * 3 + 2)]);
const leafColors = [0xa8c47a, 0xd9a441, 0x7fb069, 0xc96f3b];
leafSeeds.forEach((_, i) => leaves.setColorAt(i, new T.Color(leafColors[i % 4])));

// ---------- Game state (web) ----------
type Mode = 'menu' | 'intro' | 'play' | 'paused' | 'ending' | 'result' | 'dawn' | 'bench';
let mode: Mode = 'menu', game: Game = createGame(1, {}, 1), night: NightId = 1;
let campaign = { total: 0, scores: [] as number[], attempts: 0, saved: false };
let currentSeed = 7;
const newCampaign = () => ({ total: 0, scores: [] as number[], attempts: 0, saved: false });
const shadeCues = new Map<string, number>(); // shade id -> performance.now() until which its spawn arrow shows
let weakSeen = new Set<string>();
const keys = new Set<string>(); let pauseQueue = 0, pauseLatch = false;
let yaw = 0, pitch = 0.42, dist = 12, acc = 0, last = performance.now(), endAt = 0, shake = 0;
let lastCount = -1, windWarned = false, ambient = 0.15, scoreBefore = 0, lastCap = tuning.carry_capacity;
const drainToast = new Map<string, number>();
const fpsStats = { frames: 0, since: performance.now(), fps: 0, samples: [] as number[] };
(window as any).__ddl = { get game() { return game; }, get mode() { return mode; }, fps: fpsStats, get ambient() { return hemi.intensity; },
  /** Render n frames synchronously (GPU-synced via readPixels) and return frames per second the machine sustains. */
  bench(n = 120) { const gl = renderer.getContext(), px = new Uint8Array(4), t0 = performance.now(); for (let i = 0; i < n; i++) { render(1 / 60, t0 + i * 16.7); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return Math.round(n * 1000 / (performance.now() - t0)); },
  /** Debug/evidence: run n fixed ticks through the normal web input path, then draw one frame. */
  advance(n: number) { for (let i = 0; i < n && (mode === 'play' || mode === 'paused'); i++) tickOnce(); const now = performance.now(); if (mode === 'ending') finishNight(); render(1 / 60, now); },
  key(code: string, down: boolean) { if (down) keys.add(code); else keys.delete(code); },
  /** Evidence: toggle colorblind mode like the settings checkbox does (persisted). */
  colorblind(on: boolean) { settings.cb = on; applyCb(); saveSettings(); } };

function clearWorld() {
  scene.remove(world);
  world.traverse(o => { const m = o as T.Mesh; if (m.geometry && m.geometry !== tetherGeo && m.geometry !== starGeo) m.geometry.dispose(); });
  world = new T.Group(); scene.add(world);
  lamps.clear(); shadeViews.clear(); drifterViews.clear(); charmViews.clear(); pads.length = 0;
  moteInst.count = 0; for (const im of Object.values(shadeInst)) im.count = 0;
}
function loadNight(n: NightId, seed: number, scenario: object = {}) {
  lastCap = tuning.carry_capacity; drainToast.clear(); shadeCues.clear(); weakSeen = new Set(); currentSeed = seed;
  night = n; game = createGame(seed, scenario, n); clearWorld(); buildTerrain(game.def);
  for (const l of game.lanterns) lamps.set(l.id, makeLamp(l.pos));
  for (const c of game.charms) charmViews.set(c.id, makeCharm(c.pos));
  yaw = 0; lastCount = -1; windWarned = false; acc = 0; keys.clear(); pauseQueue = 0; pauseLatch = false;
  ambient = 0.15; hemi.intensity = ambient;
  camera.position.set(game.player.pos[0], game.player.pos[1] + 8, game.player.pos[2] - 12);
  $('nightlabel').textContent = `Đêm ${n} · ${STORY[n].title}`;
  document.title = `Đảo Đèn Lồng — Đêm ${n}`;
}

// ---------- Screens ----------
const scr = $('screen');
function show(html: string, cls = '') { scr.className = 'show ' + cls; scr.innerHTML = `<div class="card${/\bwide\b/.test(cls) ? ' wide' : ''}">${html}</div>`; }
function hideScreen() { scr.className = ''; scr.innerHTML = ''; }
const btn = (act: string, label: string, primary = false) => `<button data-act="${act}" class="${primary ? 'primary' : ''}">${label}</button>`;
function menu() {
  mode = 'menu'; $('hud').classList.add('hidden'); sound.stopMusic();
  loadNight(1, 7);
  show(`<div class="eyebrow">Một đốm sáng nhỏ · Ba hòn đảo thức giấc</div><h1>Đảo Đèn Lồng</h1>
    <p>Sương đen phủ kín quần đảo. Cùng Mây gom đom đóm, thắp lại đèn lồng qua ba đêm dài và đón bình minh trở về.</p>
    <div class="row">${btn('start', 'Bắt đầu hành trình', true)}${btn('leaderboard', 'Bảng xếp hạng')}${btn('settings', 'Cài đặt')}</div>
    <div class="practice">Luyện tập: ${btn('practice-1', 'Đêm 1')}${btn('practice-2', 'Đêm 2')}${btn('practice-3', 'Đêm 3')}</div>
    <div class="note">Bàn phím + chuột · ${moveKeys()} chạy · ${K('jump')} nhảy · ${K('dash')} lướt · ${K('interact')} nạp đèn · ${K('pulse')} tỏa sáng · ${K('pause')} tạm dừng</div>`, 'menu');
}
function intro(n: NightId) {
  mode = 'intro'; loadNight(n, 1000 * n + campaign.attempts * 17 + 3); $('hud').classList.add('hidden');
  const s = STORY[n], d = game.def;
  show(`<div class="eyebrow">Đêm ${n} / 3 · ${d.duration / 60 | 0}:${String(d.duration % 60).padStart(2, '0')} tới bình minh · cần ${litNeeded(d.lanterns.length)}/${d.lanterns.length} đèn sáng</div><h1>${s.title}</h1>
    <div class="elder"><div class="avatar"><span>Ông</span><span>Đăng</span></div><div class="lines">${s.lines.map((l, i) => `<p style="animation-delay:${0.2 + i * 0.9}s">“${l}”</p>`).join('')}</div></div>
    <div class="facts"><span>🏮 ${d.lanterns.length} đèn</span><span>✦ 10 đom đóm thắp · 5 thắp lại</span><span>🛢 dầu cạn 1/giây</span><span>🎯 giữ ${litNeeded(d.lanterns.length)} đèn tới sáng</span>${d.drifters ? '<span>〰 Gió Lạc</span>' : ''}${d.charms.length ? '<span>❖ Bùa Gió</span>' : ''}${d.pads.length ? '<span>⤒ Bục gió</span>' : ''}${d.wind ? '<span>🍃 Gió mạnh</span>' : ''}</div>
    <div class="row">${btn('play', 'Vào đêm', true)}${btn('menu', 'Về menu')}</div>`, 'intro');
}
function play() {
  mode = 'play'; hideScreen(); $('hud').classList.remove('hidden'); acc = 0; last = performance.now();
  sound.ensure(); sound.startMusic(night); toast(`Đêm ${night} · ${STORY[night].title}`, 'big');
}
function pauseMenu() {
  show(`<h2>Tạm dừng</h2><p>Mọi thứ đứng yên chờ Mây.</p><div class="col">${btn('resume', 'Tiếp tục', true)}${btn('restart', 'Chơi lại Đêm')}${btn('settings', 'Cài đặt')}${btn('menu', 'Về menu')}</div>`, 'pause');
}
let settingsBack: () => void = menu;
function settingsScreen(back: () => void) {
  settingsBack = back;
  const slider = (k: keyof Settings, label: string, min: number, max: number, stepv: number) =>
    `<label><span>${label}</span><input type="range" data-set="${k}" min="${min}" max="${max}" step="${stepv}" value="${settings[k]}"><output>${Math.round(Number(settings[k]) * 100)}%</output></label>`;
  show(`<h2>Cài đặt</h2><div class="settings">${slider('master', 'Âm lượng tổng', 0, 1, 0.05)}${slider('music', 'Nhạc nền', 0, 1, 0.05)}${slider('sfx', 'Hiệu ứng', 0, 1, 0.05)}${slider('sens', 'Độ nhạy chuột', 0.2, 3, 0.1)}
    <label class="check"><input type="checkbox" data-set="fps" ${settings.fps ? 'checked' : ''}><span>Hiện FPS</span></label>
    <label class="check"><input type="checkbox" data-set="cb" ${settings.cb ? 'checked' : ''}><span>Chế độ mù màu <small>(Bóng Mực xanh lam, cảnh báo trắng + ⚠)</small></span></label>
    <label class="check"><input type="checkbox" data-set="subs" ${settings.subs ? 'checked' : ''}><span>Phụ đề &amp; chỉ báo hình ảnh <small>(Bóng xuất hiện + mũi tên, gió, 10 s cuối, đèn yếu)</small></span></label>
    <label class="check"><input type="checkbox" data-set="reduce" ${settings.reduce ? 'checked' : ''}><span>Giảm chuyển động <small>(tắt rung camera và chớp màn hình)</small></span></label>
    <label class="check"><input type="checkbox" data-set="big" ${settings.big ? 'checked' : ''}><span>Chữ lớn <small>(×1.25)</small></span></label></div>
    <div class="note">Tự động lưu trên máy này.</div><div class="row">${btn('controls', 'Đổi phím')}${btn('settings-back', 'Xong', true)}</div>`, 'settings wide');
}
// ---------- Ticket-04: key rebinding ----------
let capture: { action: Action; slot: number } | null = null, bindMsg = '';
function controlsScreen() {
  const dup = conflicts(settings.bindings), dupCodes = new Set(dup.map(d => d.code));
  const rows = ACTIONS.map(a => `<span>${ACTION_LABEL[a]}</span>${[0, 1].map(i => {
    const code = settings.bindings[a][i], wait = capture?.action === a && capture.slot === i;
    return `<button data-act="bind-${a}-${i}" class="${wait ? 'wait' : code && dupCodes.has(code) ? 'dup' : ''}">${wait ? 'Nhấn phím…' : keyName(code)}</button>`;
  }).join('')}`).join('');
  const warn = dup.length ? `⚠ Trùng phím: ${dup.map(d => `${keyName(d.code)} → ${d.actions.map(a => ACTION_LABEL[a]).join(' và ')}`).join('; ')}. Hãy đổi một trong hai.` : '';
  show(`<h2>Đổi phím</h2><p>Bấm vào ô rồi nhấn phím mới. Mỗi hành động có 2 phím. Delete/Backspace để xóa phím phụ.</p>
    <div class="binds">${rows}</div><div class="bindmsg ${warn ? '' : 'ok'}" id="bindmsg">${warn || bindMsg}</div>
    <div class="row">${btn('bind-reset', 'Khôi phục mặc định')}${btn('controls-back', 'Xong', true)}</div>`, 'settings wide');
}
function setBinding(code: string) {
  if (!capture) return; const { action, slot } = capture; capture = null;
  const list = [...settings.bindings[action]];
  if ((code === 'Delete' || code === 'Backspace') && slot === 1) list.splice(1, 1);
  else { list[slot] = code; if (slot === 1 && list[0] === code) list.splice(1, 1); }
  settings.bindings[action] = list.filter(Boolean); saveSettings(); renderHints();
  bindMsg = `Đã gán ${keyName(code)} cho "${ACTION_LABEL[action]}".`;
  controlsScreen();
}

// ---------- Ticket-04: local leaderboard (Electron: userData/leaderboard.json via preload; web: localStorage) ----------
const native = (window as any).ddlNative as undefined | { lbGet(): Promise<unknown>; lbSave(e: Entry[]): Promise<void>; benchFirstFrame(epochMs: number, info: object): void; benchDone(dts: number[]): void; electron?: string };
const LBKEY = 'dao-den-long.leaderboard.v1';
async function lbLoad(): Promise<Entry[]> {
  try { return parseEntries(native ? await native.lbGet() : JSON.parse(localStorage.getItem(LBKEY) ?? '[]')); } catch { return []; }
}
async function lbStore(list: Entry[]) { if (native) await native.lbSave(list); else localStorage.setItem(LBKEY, JSON.stringify({ entries: list })); }
const nightsWon = () => campaign.scores.filter(v => v !== undefined).length;
function nameForm() {
  if (campaign.saved) return '<p class="note">Đã lưu điểm vào Bảng xếp hạng.</p>';
  return `<div class="eyebrow">Lưu điểm · ${campaign.total} điểm · thắng ${nightsWon()}/3 Đêm</div>
    <form class="nameform" id="nameform"><input id="pname" maxlength="16" placeholder="Tên (3–12 ký tự)" autocomplete="off" spellcheck="false" aria-label="Tên người chơi"><button type="submit" class="primary">Lưu điểm</button></form><div class="nameerr" id="nameerr"></div>`;
}
let lastSaved: Entry | null = null;
async function saveScore(name: string) {
  const err = nameError(name); if (err) { $('nameerr').textContent = err; return; }
  const e: Entry = { name: normalizeName(name), score: campaign.total, nights_won: nightsWon(), achieved_at: isoLocal(), seed: currentSeed };
  await lbStore(insertEntry(await lbLoad(), e)); campaign.saved = true; lastSaved = e; leaderboardScreen();
}
async function leaderboardScreen() {
  const list = await lbLoad(); mode = mode === 'play' ? mode : 'menu';
  const rows = list.map((e, i) => `<tr class="${lastSaved && e.achieved_at === lastSaved.achieved_at && e.name === lastSaved.name ? 'me' : ''}"><td class="num">${i + 1}</td><td>${e.name.replace(/[<&]/g, '')}</td><td class="num">${e.score.toLocaleString('vi-VN')}</td><td class="num">${e.nights_won}/3</td><td>${e.achieved_at.replace('T', ' ').slice(0, 16)}</td><td class="num">${e.seed}</td></tr>`).join('');
  show(`<h2>Bảng xếp hạng</h2><p>Top 10 trên máy này. Điểm = tổng điểm các Đêm đã thắng; bằng điểm thì ai đạt trước đứng trên.</p>
    ${list.length ? `<table class="lb"><thead><tr><th class="num">#</th><th>Tên</th><th class="num">Điểm</th><th class="num">Đêm thắng</th><th>Thời điểm</th><th class="num">Seed</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="note">Chưa có ai. Hãy là người đầu tiên!</p>'}
    <div class="row">${btn('menu', 'Về menu', true)}</div>`, 'wide');
}

function result() {
  mode = 'result'; const won = game.state === 'won', p = game.player, lit = game.lanterns.filter(l => l.lit).length;
  if (won) { campaign.total += game.score; campaign.scores[night - 1] = game.score; }
  const need = litNeeded(game.lanterns.length);
  const reason = game.result === 'no_flames' ? 'Mây đã hết Ngọn Lửa.' : `Bình minh đến khi chỉ còn ${lit}/${game.lanterns.length} đèn sáng (cần ${need}).`;
  const stats = `<div class="stats"><div><small>Đèn sáng</small><b>${lit}/${game.lanterns.length}</b></div><div><small>Ngọn Lửa</small><b>${p.flames}</b></div><div><small>Cần lúc bình minh</small><b>${need}/${game.lanterns.length}</b></div><div><small>Điểm đêm</small><b class="gold">${game.score}</b></div></div>`;
  if (won) show(`<div class="eyebrow">Đêm ${night} hoàn thành</div><h1>${STORY[night].title} đã thức giấc</h1>${stats}
      <p>Tổng điểm hành trình: <b class="gold">${campaign.total}</b></p><div class="row">${night < 3 ? btn('next', `Sang Đêm ${night + 1}`, true) : btn('dawn', 'Đón bình minh', true)}${btn('menu', 'Về menu')}</div>`, 'result win');
  else show(`<div class="eyebrow">Đêm ${night} chưa xong</div><h1>Đêm còn dài…</h1><p>${reason} Đừng nản, Mây: châm dầu trước khi đèn yếu, và xua Bóng Mực đang hút dầu.</p>${stats}
      ${nameForm()}<div class="row">${btn('retry', `Chơi lại Đêm ${night}`, true)}${btn('menu', 'Về menu')}</div>`, 'result lose');
  if (!won) focusName();
}
function dawn() {
  mode = 'dawn'; $('hud').classList.add('hidden'); sound.stopMusic(); sound.play('win');
  show(`<div class="eyebrow">Bình Minh</div><h1>Quần đảo đã sáng đèn</h1><p>“Cháu làm được rồi, Mây. Từ Đảo Bến tới Đảo Chuông, ánh sáng đã trở về.” — Ông Đăng</p>
    <div class="stats">${[1, 2, 3].map(n => `<div><small>Đêm ${n}</small><b>${campaign.scores[n - 1] ?? '—'}</b></div>`).join('')}<div><small>Tổng điểm</small><b class="gold">${campaign.total}</b></div></div>
    ${nameForm()}<div class="row">${btn('again', 'Chơi lại từ đầu', true)}${btn('menu', 'Về menu')}</div>`, 'dawn');
  focusName();
}
function focusName() {
  const f = document.getElementById('nameform') as HTMLFormElement | null; if (!f) return;
  f.addEventListener('submit', ev => { ev.preventDefault(); void saveScore((document.getElementById('pname') as HTMLInputElement).value); });
  setTimeout(() => (document.getElementById('pname') as HTMLInputElement | null)?.focus(), 50);
}
scr.addEventListener('click', e => {
  const act = (e.target as HTMLElement).closest('button')?.dataset.act; if (!act) return;
  sound.ensure(); sound.play('click');
  if (act === 'start' || act === 'again') { campaign = newCampaign(); intro(1); }
  else if (act.startsWith('practice-')) { campaign = newCampaign(); intro(Number(act.slice(9)) as NightId); }
  else if (act === 'leaderboard') void leaderboardScreen();
  else if (act === 'controls') { capture = null; bindMsg = ''; controlsScreen(); }
  else if (act === 'controls-back') { capture = null; settingsScreen(settingsBack); }
  else if (act === 'bind-reset') { capture = null; settings.bindings = structuredClone(DEFAULT_BINDINGS); saveSettings(); renderHints(); bindMsg = 'Đã khôi phục phím mặc định.'; controlsScreen(); }
  else if (act.startsWith('bind-')) { const [, a, i] = act.split('-'); capture = { action: a as Action, slot: Number(i) }; controlsScreen(); }
  else if (act === 'settings') settingsScreen(mode === 'paused' ? pauseMenu : menu);
  else if (act === 'settings-back') settingsBack();
  else if (act === 'play') play();
  else if (act === 'menu') menu();
  else if (act === 'resume') requestPause();
  else if (act === 'restart' || act === 'retry') { campaign.attempts++; campaign.saved = false; intro(night); }
  else if (act === 'next') intro((night + 1) as NightId);
  else if (act === 'dawn') dawn();
});
scr.addEventListener('input', e => {
  const t = e.target as HTMLInputElement, k = t.dataset.set as keyof Settings | undefined; if (!k) return;
  if (k === 'fps') settings.fps = t.checked; else if (k === 'cb') { settings.cb = t.checked; applyCb(); }
  else if (k === 'reduce' || k === 'big' || k === 'subs') { settings[k] = t.checked; applyA11y(); } else { (settings as any)[k] = Number(t.value); const o = t.parentElement?.querySelector('output'); if (o) o.textContent = `${Math.round(Number(t.value) * 100)}%`; }
  $('fps').classList.toggle('hidden', !settings.fps); saveSettings();
});
$('fps').classList.toggle('hidden', !settings.fps);

// ---------- Input ----------
function requestPause() { if (mode === 'play' || mode === 'paused') pauseQueue++; }
addEventListener('keydown', e => {
  if (capture) { e.preventDefault(); if (!e.repeat) setBinding(e.code); return; }
  if ((e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'text') return; // typing a name
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (settings.bindings.pause.includes(e.code) && !e.repeat) {
    if (mode === 'play' || mode === 'paused') { if (mode === 'paused' && scr.classList.contains('settings')) { pauseMenu(); return; } requestPause(); return; }
  }
  if (e.code === 'F3') { settings.fps = !settings.fps; $('fps').classList.toggle('hidden', !settings.fps); saveSettings(); e.preventDefault(); }
  if (e.code === 'Enter' && !e.repeat) (scr.querySelector('button.primary') as HTMLButtonElement | null)?.click();
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if (mode === 'play' && game.state === 'playing') requestPause(); });
let dragging = false;
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
renderer.domElement.addEventListener('pointermove', e => {
  if (!dragging || mode !== 'play') return;
  yaw -= e.movementX * 0.3 * settings.sens; pitch = Math.max(0.12, Math.min(1.2, pitch + e.movementY * 0.004 * settings.sens));
});
renderer.domElement.addEventListener('wheel', e => { dist = Math.max(6, Math.min(22, dist + e.deltaY * 0.01)); }, { passive: true });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- Simulation tick (fixed 60 Hz) ----------
function tickOnce() {
  let pause = false;
  if (pauseLatch) pauseLatch = false; else if (pauseQueue > 0) { pauseQueue--; pause = pauseLatch = true; }
  const p = game.player, wasGrounded = p.grounded, hadLaunch = !!p.launch;
  const input: Input = mode === 'play'
    ? { move: keyboardMove(keys, settings.bindings), cam_yaw_deg: yaw, jump: actionDown(keys, settings.bindings, 'jump'), interact: actionDown(keys, settings.bindings, 'interact'), pulse: actionDown(keys, settings.bindings, 'pulse'), dash: actionDown(keys, settings.bindings, 'dash'), pause }
    : { ...idle(), cam_yaw_deg: yaw, pause };
  scoreBefore = game.score; const events = step(game, input);
  if (wasGrounded && !p.grounded && p.respawn === 0) { if (p.launch && !hadLaunch) { sound.play('pad'); burst([p.pos[0], p.pos[1] + 0.3, p.pos[2]], 14, 5, C.gold); } else if (p.vel[1] > 0) sound.play('jump'); }
  for (const e of events) onEvent(e);
}
function onEvent(e: Event) {
  const p = game.player, at = [p.pos[0], p.pos[1] + 1, p.pos[2]];
  switch (e.name) {
    case 'mote_picked': sound.play('pickup'); burst(at, 4, 2.5); break;
    case 'deposit': sound.play('deposit'); break;
    case 'lantern_lit': { sound.play('light'); const l = game.lanterns.find(x => x.id === e.data.lantern_id)!; burst([l.pos[0] + 0.7, l.pos[1] + 1.9, l.pos[2]], 30, 6, C.lit, 0.7);
      toast(e.data.relight ? `Thắp lại đèn ${l.id}! +${tuning.score.per_relight}` : `Đèn ${l.id} đã sáng! +${tuning.score.per_lantern}`);
      if (capacity(p) > lastCap) toast(`Túi rộng hơn: ${capacity(p)} đom đóm`); lastCap = capacity(p); break; }
    case 'refuel': { sound.play('refuel'); const l = game.lanterns.find(x => x.id === e.data.lantern_id)!; burst([l.pos[0] + 0.7, l.pos[1] + 1.9, l.pos[2]], 12, 3, C.gold, 0.5); toast(`Châm dầu ${l.id}: ${e.data.fuel} · +${(e.data.amount as number) * tuning.score.per_mote}`); break; }
    case 'lantern_out': { sound.play('out'); caption(`[Phụt] Đèn ${e.data.lantern_id} đã tắt`, 'danger'); const l = game.lanterns.find(x => x.id === e.data.lantern_id)!; burst([l.pos[0] + 0.7, l.pos[1] + 1.9, l.pos[2]], 16, 1.5, 0x555566, 0.6); toast(`Đèn ${l.id} đã tắt! Thắp lại cần ${tuning.relight_cost} đom đóm`, 'danger'); break; }
    case 'fuel_drain': { const id = e.data.lantern_id as string, now = performance.now(); if ((drainToast.get(id) ?? 0) < now) { drainToast.set(id, now + 4000); sound.play('drain'); toast(`Bóng Mực đang hút dầu đèn ${id} (${e.data.fuel})!`, 'danger'); } break; }
    case 'pulse': sound.play('pulse'); waveT = 0; wave.position.set(p.pos[0], p.pos[1] + rules.pulse_center_y, p.pos[2]); waveRing.position.set(p.pos[0], p.pos[1] + 0.08, p.pos[2]); { const n = (e.data.stunned_ids as string[]).length; if (n) toast(`Xua ${n} Bóng Mực · +${game.score - scoreBefore}`); } break;
    case 'player_hit': sound.play(e.data.by === 'fall' ? 'fall' : 'hit'); if (!settings.reduce) { flash(); shake = 0.5; } toast(e.data.by === 'fall' ? `Rơi xuống biển mây! Mất ${e.data.lost} đom đóm` : `Bị Bóng Mực chạm! Rơi ${e.data.dropped} đom đóm`, 'danger'); break;
    case 'dash': sound.play('dash'); burst(at, 6, 1.5, 0xdfe8ff, 0.4); break;
    case 'charm_picked': sound.play('charm'); burst(at, 18, 4, C.scarf, 0.6); toast('Bùa Gió! Chạy nhanh và lướt liên tục trong 10 giây'); break;
    case 'drifter_steal': sound.play('steal'); caption('[Vù] Gió Lạc cướp đom đóm', 'danger'); toast(`Gió Lạc cướp ${e.data.amount} đom đóm!`, 'danger'); break;
    case 'drifter_drop': sound.play('drop'); toast(`Gió Lạc đánh rơi ${e.data.amount} đom đóm`); break;
    case 'shade_spawned': { sound.play('spawn'); const id = e.data.id as string; shadeCues.set(id, performance.now() + 4000); const s = game.shades.find(x => x.id === id);
      caption(`[Tiếng rít] Bóng Mực ${id} xuất hiện${s ? ` · cách ${Math.round(Math.hypot(s.pos[0] - p.pos[0], s.pos[2] - p.pos[2]))} m` : ''}`, 'danger'); break; }
    case 'paused': mode = 'paused'; keys.clear(); pauseMenu(); break;
    case 'resumed': mode = 'play'; hideScreen(); break;
    case 'game_over': mode = 'ending'; endAt = performance.now() + 1400; sound.stopMusic(); sound.play(e.data.result === 'won' ? 'win' : 'lose');
      toast(e.data.result === 'won' ? 'Bình minh! Đảo vẫn giữ được ánh sáng' : e.data.reason === 'dawn' ? 'Bình minh tới mà đèn chưa đủ…' : 'Ngọn Lửa đã tắt…', e.data.result === 'won' ? 'big' : 'danger big'); break;
  }
}
function toast(text: string, cls = '') {
  const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = text; $('toasts').prepend(d);
  setTimeout(() => d.classList.add('out'), 2200); setTimeout(() => d.remove(), 2700);
  while ($('toasts').children.length > 4) $('toasts').lastElementChild!.remove();
}
function flash() { const f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
const fmt = (s: number) => { const t = Math.ceil(s - 1e-9); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

// ---------- Render ----------
const tmp = new T.Vector3();
function sync<Tm extends { id: string }, V>(views: Map<string, V>, list: Tm[], make: (x: Tm) => V, remove: (v: V) => void) {
  const live = new Set(list.map(x => x.id));
  for (const [id, v] of views) if (!live.has(id)) { remove(v); views.delete(id); }
  for (const x of list) if (!views.has(x.id)) views.set(x.id, make(x));
}
function render(dt: number, now: number) {
  const t = now / 1000, g = game, p = g.player;
  // Player
  may.g.position.set(p.pos[0], p.pos[1], p.pos[2]);
  may.g.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  const speed = Math.hypot(p.vel[0], p.vel[2]), run = speed > 0.5 && p.grounded;
  may.legs.forEach((l, i) => l.rotation.x = run ? Math.sin(t * 14 + i * Math.PI) * 0.6 : 0);
  may.body.rotation.x = p.dashTicks > 0 ? 0.35 : run ? 0.08 : 0;
  may.tail.rotation.x = 0.5 + (run ? Math.sin(t * 18) * 0.25 : Math.sin(t * 2) * 0.08) + (p.dashTicks > 0 ? 0.6 : 0);
  may.g.visible = (p.respawn === 0 || p.pos[1] > rules.fall_y + 2) && (p.invuln === 0 || Math.floor(t * 12) % 2 === 0);
  const glowK = 0.6 + Math.min(p.carried, 10) * 0.06; may.glow.scale.setScalar(1 + p.carried * 0.08); may.light.intensity = 8 + p.carried * 1.2; (may.glow.material as T.SpriteMaterial).opacity = glowK;
  (may.charmAura.material as T.SpriteMaterial).opacity = p.charm > 0 ? 0.35 + Math.sin(t * 8) * 0.12 : 0;

  // Lanterns
  let lit = 0; const blinkOff = Math.floor(t * 2) % 2 === 1; // 1 Hz: 0.5 s on, 0.5 s off
  for (const l of g.lanterns) {
    const v = lamps.get(l.id)!; if (l.lit) lit++;
    const weak = isWeak(l), dim = weak && blinkOff, k = l.fuel / (tuning.fuel_max * FU);
    (v.shade.material as T.MeshLambertMaterial).color.setHex(l.lit ? C.lit : C.unlit);
    (v.shade.material as T.MeshLambertMaterial).emissive.setHex(l.lit && !dim ? C.lit : l.lit ? 0x4a2a08 : 0x000000);
    (v.core.material as T.SpriteMaterial).opacity = l.lit ? (dim ? 0.15 : (0.55 + 0.4 * k) + Math.sin(t * 3 + l.pos[0]) * 0.08) : l.deposited / 25;
    v.light.intensity = l.lit ? (dim ? 6 : 20 + 25 * k) : 0; v.ring.visible = hasSafeZone(l);
    if (v.ring.visible) (v.ring.material as T.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 2) * 0.1;
    const cost = l.ever_lit ? tuning.relight_cost : tuning.lantern_cost;
    if (v.dep !== l.deposited * 100 + cost) { v.dep = l.deposited * 100 + cost; v.progress.geometry.dispose(); v.progress.geometry = new T.RingGeometry(0.75, 0.95, 32, 1, Math.PI / 2, Math.max(0.0001, Math.min(1, l.deposited / cost) * Math.PI * 2)); }
    v.progress.visible = !l.lit && l.deposited > 0;
    // Unlit: squashed 20% + torn paper (shape cue, not colour only).
    v.shade.scale.set(l.lit ? 1 : 1.06, l.lit ? 1.25 : 1.0, l.lit ? 1 : 1.06); v.torn.visible = !l.lit; v.torn.scale.y = l.lit ? 1 : 0.8;
    v.bar.visible = l.lit; if (l.lit) {
      v.bar.quaternion.copy(camera.quaternion); v.fill.scale.x = Math.max(0.001, k);
      (v.fill.material as T.MeshBasicMaterial).color.setHex(weak ? (settings.cb ? 0xFFFFFF : 0xFF5A5F) : k < 0.6 ? 0xFFB347 : C.gold);
      (v.fill.material as T.MeshBasicMaterial).opacity = dim ? 0.2 : 1;
    }
  }
  const target = 0.15 + 0.55 * (lit / g.lanterns.length);
  ambient += (target - ambient) * Math.min(1, dt * 2); if (Math.abs(target - ambient) < 0.002) ambient = target; hemi.intensity = ambient;
  moon.intensity = 0.6 + ambient * 0.6;

  // Motes (instanced billboards)
  g.motes.forEach((m, i) => {
    const ph = i * 1.7, blink = m.ttl !== null && m.ttl < 120 ? (Math.floor(t * 8) % 2 ? 0.25 : 1) : 1;
    _v.set(m.pos[0] + Math.sin(t * 1.3 + ph) * 0.12, m.pos[1] + 0.75 + Math.sin(t * 2.2 + ph) * 0.18, m.pos[2] + Math.cos(t * 1.1 + ph) * 0.12);
    if (i < INST_MAX) setBillboard(moteInst, i, _v, 0.8 + Math.sin(t * 4 + ph) * 0.12, 0xffffff, blink);
  });
  finishInstances(moteInst, Math.min(INST_MAX, g.motes.length));

  // Shades (instanced hull / outline / eyes / aura; stars + tether stay per shade)
  sync(shadeViews, g.shades, () => makeShade(), v => { world.remove(v.g); world.remove(v.tether); });
  let ns = 0; const line = shadeLine(), auraHex = settings.cb ? 0x80d8ff : 0xffffff;
  for (const s of g.shades) {
    const v = shadeViews.get(s.id)!; if (v.born < 0) { v.born = t; if (g.tick > 0) burst([s.pos[0], s.pos[1] + 1, s.pos[2]], 12, 3, C.outline, 0.8); }
    const grow = Math.min(1, (t - v.born) / 0.5);
    v.g.position.set(s.pos[0], s.pos[1] + Math.sin(t * 3 + s.pos[0]) * 0.12, s.pos[2]);
    const lookL = s.state === 'drain' ? g.lanterns.find(l => l.id === s.lantern) : undefined, lk = lookL ? [lookL.pos[0] + 0.7, lookL.pos[2]] : [p.pos[0], p.pos[2]];
    v.g.rotation.y = Math.atan2(lk[0] - s.pos[0], lk[1] - s.pos[2]);
    const stunned = s.state === 'stunned', drain = s.state === 'drain';
    const tl = drain ? g.lanterns.find(l => l.id === s.lantern) : undefined; v.tether.visible = !!tl;
    if (tl) { const from = tmp.set(s.pos[0], s.pos[1] + 1.1, s.pos[2]), to = new T.Vector3(tl.pos[0] + 0.7, tl.pos[1] + 1.9, tl.pos[2]); v.tether.position.copy(from); v.tether.lookAt(to); v.tether.scale.set(1 + Math.sin(t * 12) * 0.3, 1 + Math.sin(t * 12) * 0.3, from.distanceTo(to)); (v.tether.material as T.MeshBasicMaterial).color.setHex(line); }
    v.stars.visible = stunned; v.stars.rotation.y = t * 4;
    const sc = (s.state === 'recoil' ? 0.85 : 1) * grow * (1 + Math.sin(t * 5) * 0.03);
    v.g.scale.setScalar(sc);
    v.g.visible = s.state !== 'recoil' || Math.floor(t * 10) % 2 === 0;
    if (!v.g.visible || ns >= INST_MAX) continue;
    v.g.updateMatrix(); const gm = v.g.matrix;
    shadeInst.hull.setMatrixAt(ns, gm); shadeInst.hull.setColorAt(ns, _c.setHex(stunned ? C.stunned : C.shade));
    shadeInst.outline.setMatrixAt(ns, gm); shadeInst.outline.setColorAt(ns, _c.setHex(stunned ? 0x5a4f7a : line));
    const k = stunned ? 0.4 : s.state === 'chase' ? 1.25 : 1; // eye size by state (spacing kept)
    shadeInst.eyes.setMatrixAt(ns, _m2.multiplyMatrices(gm, _m.makeTranslation(0, 1.25, 0.5).scale(_s.set(1, k, k)))); shadeInst.eyes.setColorAt(ns, _c.setHex(stunned ? 0x8a80a8 : line));
    setBillboard(shadeInst.aura, ns, _v.set(0, 1, 0).applyMatrix4(gm), 3 * sc, auraHex, drain ? 0.6 + Math.sin(t * 10) * 0.15 : 0.35);
    ns++;
  }
  for (const im of Object.values(shadeInst)) finishInstances(im, ns);

  // Drifters
  sync(drifterViews, g.drifters, () => makeDrifter(), v => world.remove(v.g));
  for (const d of g.drifters) {
    const v = drifterViews.get(d.id)!; v.g.visible = d.state !== 'removed'; if (!v.g.visible) continue;
    v.g.position.set(d.pos[0], d.pos[1] + 0.3 + Math.sin(t * 2.5) * 0.2, d.pos[2]);
    const dir = d.state === 'flee' ? Math.atan2(d.pos[0] - p.pos[0], d.pos[2] - p.pos[2]) : d.state === 'chase' ? Math.atan2(p.pos[0] - d.pos[0], p.pos[2] - d.pos[2]) : t * 0.5;
    v.g.rotation.y = dir;
    v.ribbons.forEach((r, i) => { const pos = r.geometry.getAttribute('position') as T.BufferAttribute; for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); pos.setZ(k, Math.sin(t * 9 + y * 2.5 + i) * 0.18 * (0.9 - y / 1.8)); } pos.needsUpdate = true; });
    v.loot.forEach((s, i) => { s.visible = i < d.stolen; const a = t * 4 + i * 2.1; s.position.set(Math.cos(a) * 0.5, 0.2, Math.sin(a) * 0.5); });
  }

  // Charms
  for (const c of g.charms) { const v = charmViews.get(c.id)!; v.visible = c.available; (v.userData.card as T.Group).rotation.y = t * 2; (v.userData.card as T.Group).position.y = 1.2 + Math.sin(t * 2) * 0.15; }
  for (const pad of pads) { const r = pad.userData.ring as T.Mesh; const k = (t * 0.8) % 1; r.position.y = 0.1 + k * 1.6; r.scale.setScalar(1 - k * 0.3); (r.material as T.MeshBasicMaterial).opacity = 0.6 * (1 - k); }

  // Effects
  if (waveT >= 0) {
    waveT += dt; const k = Math.min(1, waveT / 0.45), r = 0.5 + k * tuning.pulse_radius;
    wave.scale.setScalar(r); (wave.material as T.MeshBasicMaterial).opacity = 0.35 * (1 - k);
    waveRing.scale.setScalar(r); (waveRing.material as T.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    if (waveT > 0.6) { waveT = -1; (wave.material as T.MeshBasicMaterial).opacity = 0; (waveRing.material as T.MeshBasicMaterial).opacity = 0; }
  }
  for (const s of sparks) if (s.life > 0) {
    s.life -= dt; s.v.y -= 3 * dt; s.s.position.addScaledVector(s.v, dt); (s.s.material as T.SpriteMaterial).opacity = Math.max(0, s.life / s.max);
    if (s.life <= 0) s.s.visible = false;
  }
  const w = g.wind; leaves.visible = (w.active || w.warning) && w.dir_deg !== null;
  if (leaves.visible) {
    const a = (w.dir_deg ?? 0) * Math.PI / 180, dx = Math.cos(a), dz = Math.sin(a), k = w.active ? 1 : 0.55, m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    leafSeeds.forEach(([a1, b1, c1], i) => {
      const along = ((t * (6 + a1 * 6) * k + a1 * 40) % 40) - 20, side = (b1 - 0.5) * 30;
      const x = p.pos[0] + dx * along - dz * side, z = p.pos[2] + dz * along + dx * side, y = p.pos[1] + 0.5 + c1 * 4 + Math.sin(t * 3 + i) * 0.5;
      m.compose(tmp.set(x, y, z), q.setFromEuler(e.set(t * 5 + i, t * 3 + i * 2, t * 4)), new T.Vector3(1, 1, 1)); leaves.setMatrixAt(i, m);
    });
    leaves.instanceMatrix.needsUpdate = true;
  }

  // Camera (smoothed third person; stays above terrain)
  const a = yaw * Math.PI / 180, focus = tmp.set(p.pos[0], Math.max(p.pos[1], rules.fall_y + 4) + 1.2, p.pos[2]);
  if (mode === 'bench') { const c = benchCamera(Math.max(0, (now - bench.start) / 1000)); camera.position.set(c[0], c[1], c[2]); camera.lookAt(0, 0, 0); }
  else if (mode === 'menu' || mode === 'intro') {
    const o = t * 0.06, r = mode === 'menu' ? 58 : 40;
    camera.position.lerp(new T.Vector3(Math.cos(o) * r + (night === 2 ? 35 : 0), 26, Math.sin(o) * r), 1 - Math.exp(-dt * 1.5)); camera.lookAt(night === 2 ? 35 : 0, 0, 0);
  } else {
    const want = new T.Vector3(focus.x - Math.sin(a) * dist * Math.cos(pitch), focus.y + dist * Math.sin(pitch), focus.z - Math.cos(a) * dist * Math.cos(pitch));
    const gh = g.def.ground(want.x, want.z); if (gh !== null && want.y < gh + 1.5) want.y = gh + 1.5;
    camera.position.lerp(want, 1 - Math.exp(-dt * 8));
    if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
    camera.lookAt(focus); updateOcclusion(camera.position, focus);
  }
  const q0 = performance.now(); renderer.render(scene, camera); const q1 = performance.now();
  if (mode !== 'menu' && mode !== 'intro') hud(t);
  if (benchProf) (window as any).__prof = [q0, q1, performance.now()];
}

function hud(t: number) {
  const g = game, p = g.player;
  $('flames').innerHTML = Array.from({ length: tuning.flames }, (_, i) => `<span class="flame ${i < p.flames ? 'on' : ''}">${flameSvg}</span>`).join('');
  const timer = $('timer'); timer.textContent = fmt(g.time_left_s); timer.classList.toggle('danger', g.time_left_s <= 30);
  const lit = g.lanterns.filter(l => l.lit).length;
  const need = litNeeded(g.lanterns.length), weakN = g.lanterns.filter(isWeak).length;
  $('lamps').innerHTML = `<span class="lamp-ico"></span> Đèn <b>${lit}/${g.lanterns.length}</b>`;
  const goal = $('goal'); goal.innerHTML = `${lit >= need ? '✓' : '🎯'} Cần <b>${need}</b> đèn sáng lúc bình minh${weakN ? ` · <span class="warn">${weakN} đèn yếu</span>` : ''}`; goal.classList.toggle('ok', lit >= need);
  $('score').textContent = `${g.score.toLocaleString('vi-VN')}`;
  const cap = capacity(p), slots = $('motebar').children; for (let i = 0; i < tuning.capacity_max; i++) slots[i].className = i < p.carried ? 'on' : i < cap ? '' : 'lock';
  $('carrytext').textContent = p.carried >= cap ? `Túi đầy ${p.carried}/${cap}, mang tới đèn!` : `Đom đóm ${p.carried}/${cap}`;
  const dashK = p.charm > 0 ? 0 : p.dashCd / rules.dash_cd_ticks, pulseK = p.pulseCd / rules.pulse_cd_ticks;
  const cd = (id: string, k: number, blocked: boolean, label: string) => { const el = $(id); el.style.setProperty('--p', String(k)); el.classList.toggle('ready', k === 0 && !blocked); el.classList.toggle('blocked', blocked); el.querySelector('span')!.textContent = label; };
  cd('cd-dash', dashK, false, p.charm > 0 ? `Bùa ${Math.ceil(p.charm / 60)}s` : p.dashCd > 0 ? `${(p.dashCd / 60).toFixed(1)}s` : 'Lướt');
  cd('cd-pulse', pulseK, p.carried < tuning.pulse_cost, p.pulseCd > 0 ? `${(p.pulseCd / 60).toFixed(1)}s` : p.carried < tuning.pulse_cost ? 'Cần 3 ✦' : 'Tỏa Sáng');
  // Lantern prompt (interact radius, nearest then id like the core).
  const dxz = (q: number[]) => Math.hypot(q[0] - p.pos[0], q[2] - p.pos[2]);
  const byNum = (a: Lantern, b: Lantern) => dxz(a.pos) - dxz(b.pos) || a.id.localeCompare(b.id, undefined, { numeric: true });
  const near = g.lanterns.filter(l => (!l.lit || l.fuel < tuning.fuel_max * FU) && dxz(l.pos) <= tuning.interact_radius).sort(byNum)[0];
  const pr = $('prompt'); pr.classList.toggle('hidden', !near || p.respawn > 0);
  if (near) {
    const f = Math.floor(near.fuel / FU), need10 = Math.ceil((tuning.fuel_max * FU - near.fuel) / (tuning.fuel_per_mote * FU));
    pr.innerHTML = near.lit ? `<kbd>E</kbd> Châm dầu ${near.id} (${f}/${tuning.fuel_max}) · dùng ${Math.min(p.carried, need10)} ✦`
      : near.ever_lit ? `<kbd>E</kbd> Thắp lại ${near.id} (${near.deposited}/${tuning.relight_cost})` : `<kbd>E</kbd> Nạp ánh sáng ${near.id} (${near.deposited}/${tuning.lantern_cost})`;
    if (p.carried === 0) pr.innerHTML += '<small>Cần đom đóm</small>';
  }
  const safe = g.lanterns.some(l => hasSafeZone(l) && dxz(l.pos) <= tuning.safe_radius);
  const weakHere = g.lanterns.some(l => isWeak(l) && dxz(l.pos) <= tuning.safe_radius);
  $('status').innerHTML = [safe ? '<span class="safe">✦ Vùng an toàn</span>' : weakHere ? '<span class="weak warn">Đèn yếu, hết vùng an toàn</span>' : '', p.charm > 0 ? `<span class="charm">❖ Bùa Gió ${(p.charm / 60).toFixed(1)}s</span>` : '', g.wind.active ? '<span class="wind">🍃 Gió đang thổi</span>' : ''].join('');
  $('windwarn').classList.toggle('hidden', !(g.wind.warning && !g.wind.active));
  if (g.wind.warning && !windWarned) { windWarned = true; sound.play('wind'); caption('[Gió rít] Lá bay rối: gió lớn sắp thổi! Giữ vững chân.', 'danger', 4000); }
  // 10 s cue: big countdown in the centre (visual twin of the tick sound).
  const left = Math.ceil(g.time_left_s - 1e-9), cdEl = $('countdown');
  cdEl.classList.toggle('hidden', !(settings.subs && g.state === 'playing' && left <= 10 && left > 0));
  if (left <= 10 && left > 0) cdEl.innerHTML = `${left}<small>giây tới bình minh</small>`;
  // Weak lantern cue: caption when a lantern drops below 30 fuel.
  for (const l of g.lanterns) { const w = isWeak(l); if (w && !weakSeen.has(l.id)) caption(`⚠ Đèn ${l.id} yếu (dầu ${Math.floor(l.fuel / FU)}): mất vùng an toàn, hãy châm dầu!`, 'danger', 4000); if (w) weakSeen.add(l.id); else weakSeen.delete(l.id); }
  shadeArrows();
  if (!g.wind.warning) windWarned = false;
  // Countdown last 10 s
  const sec = Math.ceil(g.time_left_s - 1e-9);
  if (g.state === 'playing' && sec !== lastCount) { if (sec <= 10 && sec > 0 && lastCount !== -1) sound.play(sec <= 3 ? 'count_last' : 'count'); lastCount = sec; }
  // Off-screen arrow: nearest weak lantern first (it needs fuel), else nearest unlit one.
  const weakL = g.lanterns.filter(isWeak).sort(byNum)[0], target = weakL ?? g.lanterns.filter(l => !l.lit).sort(byNum)[0];
  $('arrow').classList.toggle('weak', !!weakL);
  const arrow = $('arrow');
  if (target) {
    const v = tmp.set(target.pos[0], target.pos[1] + 2, target.pos[2]).project(camera);
    const behind = v.z > 1; let x = v.x, y = v.y; if (behind) { x = -x; y = -y; if (Math.hypot(x, y) < 1e-3) y = -1; }
    const on = !behind && Math.abs(x) <= 0.92 && Math.abs(y) <= 0.9;
    arrow.classList.toggle('hidden', on);
    if (!on) {
      const ang = Math.atan2(y, x), s = Math.min(0.86 / Math.abs(Math.cos(ang) || 1e-6), (Math.sin(ang) < 0 ? 0.46 : 0.72) / Math.abs(Math.sin(ang) || 1e-6)); // keep clear of bottom HUD / help (18 px text, Ticket-04)
      arrow.style.left = `${(Math.cos(ang) * s + 1) / 2 * innerWidth}px`; arrow.style.top = `${(1 - Math.sin(ang) * s) / 2 * innerHeight}px`;
      (arrow.firstElementChild as HTMLElement).style.transform = `rotate(${-ang}rad)`;
      arrow.querySelector('span')!.textContent = `${weakL ? '⚠ ' : ''}${target.id} · ${Math.round(dxz(target.pos))}m${weakL ? ` · dầu ${Math.floor(target.fuel / FU)}` : ''}`;
    }
  } else arrow.classList.add('hidden');
  void t;
}

/** Spawn cue: edge-of-screen arrow toward each newly spawned shade (4 s); on screen, a marker above it instead. */
function shadeArrows() {
  const box = $('shadearrows'), now = performance.now(), live: string[] = [];
  for (const [id, until] of shadeCues) { const s = game.shades.find(x => x.id === id); if (!s || until < now || !settings.subs) shadeCues.delete(id); else live.push(id); }
  while (box.children.length < live.length) box.insertAdjacentHTML('beforeend', '<div class="shadearrow"><div class="tip"></div><span></span></div>');
  [...box.children].forEach((el, i) => {
    const div = el as HTMLElement, id = live[i]; div.style.display = id ? '' : 'none'; if (!id) return;
    const s = game.shades.find(x => x.id === id)!, v = tmp.set(s.pos[0], s.pos[1] + 2.2, s.pos[2]).project(camera);
    const behind = v.z > 1; let x = v.x, y = v.y; if (behind) { x = -x; y = -y; if (Math.hypot(x, y) < 1e-3) y = -1; }
    const on = !behind && Math.abs(x) <= 0.92 && Math.abs(y) <= 0.88, ang = on ? -Math.PI / 2 : Math.atan2(y, x);
    const k = on ? 1 : Math.min(0.86 / Math.abs(Math.cos(ang) || 1e-6), (Math.sin(ang) < 0 ? 0.46 : 0.72) / Math.abs(Math.sin(ang) || 1e-6));
    const px = on ? x : Math.cos(ang) * k, py = on ? y + 0.08 : Math.sin(ang) * k;
    div.style.left = `${(px + 1) / 2 * innerWidth}px`; div.style.top = `${(1 - py) / 2 * innerHeight}px`;
    (div.firstElementChild as HTMLElement).style.transform = `rotate(${-ang}rad)`;
    div.querySelector('span')!.textContent = `Bóng Mực ${id}`;
  });
}
function finishNight() { if (game.state === 'won' && night === 3) { campaign.total += game.score; campaign.scores[2] = game.score; dawn(); } else result(); }
// ---------- Main loop ----------
// ---------- Ticket-04 benchmark (?bench=1&seed=42&duration=30): standard scene, orbit camera, frame times ----------
const qs = new URLSearchParams(location.search);
const benchCfg = qs.get('bench') === '1' ? { seed: Number(qs.get('seed') ?? 42), duration: Number(qs.get('duration') ?? 30), warmup: 3 } : null;
const bench = { start: -1, prev: -1, dts: [] as number[], done: false, frames: 0, prevLog: -1 };
const benchProf = qs.get('prof') === '1';
function startBench() {
  mode = 'bench'; hideScreen(); $('hud').classList.remove('hidden');
  loadNight(1, benchCfg!.seed, benchScenario(benchCfg!.seed));
  settings.reduce = true; shake = 0; // camera follows the standard orbit only
}
function benchFrame(now: number) {
  if (bench.start < 0) {
    bench.start = now;
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    native?.benchFirstFrame(performance.timeOrigin + now, { gpu, three: T.REVISION, webgl: renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1', pixelRatio: renderer.getPixelRatio(), size: [innerWidth, innerHeight] });
  }
  const t = (now - bench.start) / 1000;
  if (bench.prev >= 0 && t > benchCfg!.warmup && !bench.done) bench.dts.push(now - bench.prev);
  bench.prev = now;
  if (t >= benchCfg!.warmup + benchCfg!.duration && !bench.done) {
    bench.done = true; (window as any).__ddl.benchResult = bench.dts;
    if (native) native.benchDone(bench.dts); else console.log('bench done', bench.dts.length, 'frames');
  }
  return t;
}
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.25); last = now;
  if (mode === 'bench') {
    benchFrame(now);
    const p0 = performance.now();
    acc += dt; while (acc >= 1 / rules.tps) { acc -= 1 / rules.tps; step(game, idle()); }
    const p1 = performance.now();
    render(dt, now); // render() places the orbit camera for mode 'bench' and draws once
    if (benchProf && now - bench.prevLog > 0) { const p2 = performance.now(), fr = bench.dts.at(-1) ?? 0; if (fr > 30) { const q = (window as any).__prof; console.log(`spike ${fr.toFixed(1)}ms sim ${(p1 - p0).toFixed(1)} render ${(p2 - p1).toFixed(1)} [update ${(q[0] - p1).toFixed(1)} gl ${(q[1] - q[0]).toFixed(1)} hud ${(q[2] - q[1]).toFixed(1)}] heap ${((performance as any).memory?.usedJSHeapSize / 1e6).toFixed(1)}`); } }
    return;
  }
  if (mode === 'play' || mode === 'paused') {
    acc += dt;
    while (acc >= 1 / rules.tps) { acc -= 1 / rules.tps; tickOnce(); if ((mode as Mode) === 'ending') break; }
  }
  if (mode === 'ending' && now >= endAt) finishNight();
  render(dt, now);
  fpsStats.frames++;
  if (now - fpsStats.since >= 1000) {
    fpsStats.fps = Math.round(fpsStats.frames * 1000 / (now - fpsStats.since)); fpsStats.frames = 0; fpsStats.since = now;
    fpsStats.samples.push(fpsStats.fps); if (fpsStats.samples.length > 120) fpsStats.samples.shift();
    $('fps').textContent = `${fpsStats.fps} FPS · ${innerWidth}×${innerHeight}`;
  }
}
if (benchCfg) startBench(); else menu();
requestAnimationFrame(frame);
