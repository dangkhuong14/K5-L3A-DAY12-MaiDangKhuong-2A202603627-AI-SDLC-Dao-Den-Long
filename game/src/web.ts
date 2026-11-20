// Browser layer: Three.js rendering, DOM HUD/menus, input and audio. All rules live in core.ts.
import * as T from 'three';
import { createGame, step, idle, tuning, rules, nights, type Game, type NightId, type Event, type Input, type NightDef } from './core.ts';
import { keyboardMove } from './keyboard.ts';
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
type Settings = { master: number; music: number; sfx: number; sens: number; fps: boolean };
const SKEY = 'dao-den-long.settings.v1';
const settings: Settings = (() => {
  const d: Settings = { master: 0.8, music: 0.5, sfx: 0.8, sens: 1, fps: false };
  try { return { ...d, ...JSON.parse(localStorage.getItem(SKEY) ?? '{}') }; } catch { return d; }
})();
const saveSettings = () => { localStorage.setItem(SKEY, JSON.stringify(settings)); sound.setVolumes(settings.master, settings.music, settings.sfx); };
const sound = new Sound(); sound.setVolumes(settings.master, settings.music, settings.sfx);

// ---------- Story ----------
const STORY: Record<NightId, { title: string; lines: string[] }> = {
  1: { title: 'Đảo Bến', lines: ['Mây à, sương đen đã nuốt mất bến thuyền. Năm chiếc đèn lồng đang chờ cháu.', 'Mỗi đèn cần mười đom đóm. Bóng Mực sợ ánh sáng — khi chúng áp sát, nhấn Q để Tỏa Sáng.'] },
  2: { title: 'Đảo Cau', lines: ['Hai hòn đảo nối với nhau bằng cây cầu tre. Bục gió vàng sẽ bắn cháu bay qua biển mây.', 'Cẩn thận Gió Lạc — dải lụa xám ấy thích túi đầy đom đóm. Nhặt Bùa Gió đỏ để chạy nhanh và lướt liên tục.'] },
  3: { title: 'Đảo Chuông', lines: ['Đảo Chuông có ba tầng. Leo dốc lên tầng giữa, rồi nhảy bục gió để lên đỉnh chuông.', 'Khi lá bắt đầu bay rối, một cơn gió lớn sắp thổi. Giữ vững chân, đừng để gió hất cháu xuống biển mây.'] }
};

// ---------- DOM ----------
const flameSvg = '<svg viewBox="0 0 24 32"><path d="M12 1C14 8 21 11 21 20a9 9 0 0 1-18 0c0-5 3-7 4-11 1 3 2 4 3 4 0-4 0-8 2-12z"/><path class="in" d="M12 14c1 3 4 5 4 8a4 4 0 0 1-8 0c0-2 2-4 4-8z"/></svg>';
document.querySelector('#app')!.innerHTML = `
<div id="hud" class="hidden">
  <div class="hud-tl" id="flames"></div>
  <div class="hud-tc"><div id="timer">05:00</div><div id="nightlabel"></div></div>
  <div class="hud-tr"><div id="lamps"></div><div id="score">0</div></div>
  <div id="status"></div>
  <div id="prompt" class="hidden"></div>
  <div id="toasts"></div>
  <div id="windwarn" class="hidden">🍃 Gió lớn sắp thổi!</div>
  <div class="hud-bc"><div id="motebar"></div><div id="carrytext"></div></div>
  <div class="hud-br">
    <div class="cd" id="cd-dash"><div class="ring"></div><b>⇧</b><span>Lướt</span></div>
    <div class="cd" id="cd-pulse"><div class="ring"></div><b>Q</b><span>Tỏa Sáng</span></div>
  </div>
  <div class="hud-bl"><kbd>WASD</kbd> chạy · <kbd>Space</kbd> nhảy · <kbd>Shift</kbd> lướt · <kbd>E</kbd> nạp đèn · <kbd>Q</kbd> tỏa sáng · kéo chuột xoay · <kbd>Esc</kbd>/<kbd>P</kbd> tạm dừng</div>
  <div id="arrow" class="hidden"><div class="tip"></div><span></span></div>
  <div id="flash"></div>
</div>
<div id="fps" class="hidden"></div>
<div id="screen"></div>`;
const $ = (id: string) => document.getElementById(id)!;
for (let i = 0; i < 10; i++) $('motebar').insertAdjacentHTML('beforeend', '<i></i>');

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
type LampView = { g: T.Group; shade: T.Mesh; core: T.Sprite; light: T.PointLight; ring: T.Mesh; progress: T.Mesh; dep: number };
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
  return { g, shade, core, light, ring, progress, dep: 0 };
}
type ShadeView = { g: T.Group; body: T.Mesh; outline: T.Mesh; eyes: T.Mesh[]; stars: T.Group; born: number };
const shadeViews = new Map<string, ShadeView>();
const shadeBodyGeo = new T.SphereGeometry(0.6, 16, 12), shadeTailGeo = new T.ConeGeometry(0.55, 1.0, 12);
function makeShade(): ShadeView {
  const g = new T.Group(); world.add(g);
  const bodyMat = new T.MeshBasicMaterial({ color: C.shade }), outMat = new T.MeshBasicMaterial({ color: C.outline, side: T.BackSide });
  const body = mesh(shadeBodyGeo, bodyMat, g, 0, 1.1); body.scale.set(1, 1.15, 1);
  const tail = mesh(shadeTailGeo, bodyMat, g, 0, 0.45); tail.rotation.x = Math.PI;
  const outline = mesh(shadeBodyGeo, outMat, g, 0, 1.1); outline.scale.set(1.1, 1.27, 1.1);
  const o2 = mesh(shadeTailGeo, outMat, g, 0, 0.45); o2.rotation.x = Math.PI; o2.scale.setScalar(1.1);
  const eyeMat = new T.MeshBasicMaterial({ color: 0xe6d8ff });
  const eyes = [-0.2, 0.2].map(x => mesh(new T.SphereGeometry(0.09, 8, 6), eyeMat, g, x, 1.25, 0.5));
  const stars = new T.Group(); add(stars, g, 0, 2.0);
  for (let i = 0; i < 3; i++) { const s = mesh(new T.OctahedronGeometry(0.1), new T.MeshBasicMaterial({ color: C.gold }), stars, Math.cos(i * 2.09) * 0.45, 0, Math.sin(i * 2.09) * 0.45); s.userData.i = i; }
  const aura = sprite(violetTex, 3, 0.35); add(aura, g, 0, 1);
  return { g, body, outline, eyes, stars, born: -1 };
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
const moteViews = new Map<string, T.Sprite>();
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
type Mode = 'menu' | 'intro' | 'play' | 'paused' | 'ending' | 'result' | 'dawn';
let mode: Mode = 'menu', game: Game = createGame(1, {}, 1), night: NightId = 1;
let campaign = { total: 0, scores: [] as number[], attempts: 0 };
const keys = new Set<string>(); let pauseQueue = 0, pauseLatch = false;
let yaw = 0, pitch = 0.42, dist = 12, acc = 0, last = performance.now(), endAt = 0, shake = 0;
let lastCount = -1, windWarned = false, ambient = 0.15;
const fpsStats = { frames: 0, since: performance.now(), fps: 0, samples: [] as number[] };
(window as any).__ddl = { get game() { return game; }, get mode() { return mode; }, fps: fpsStats, get ambient() { return hemi.intensity; },
  /** Render n frames synchronously (GPU-synced via readPixels) and return frames per second the machine sustains. */
  bench(n = 120) { const gl = renderer.getContext(), px = new Uint8Array(4), t0 = performance.now(); for (let i = 0; i < n; i++) { render(1 / 60, t0 + i * 16.7); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return Math.round(n * 1000 / (performance.now() - t0)); },
  /** Debug/evidence: run n fixed ticks through the normal web input path, then draw one frame. */
  advance(n: number) { for (let i = 0; i < n && (mode === 'play' || mode === 'paused'); i++) tickOnce(); const now = performance.now(); if (mode === 'ending') finishNight(); render(1 / 60, now); },
  key(code: string, down: boolean) { if (down) keys.add(code); else keys.delete(code); } };

function clearWorld() {
  scene.remove(world);
  world.traverse(o => { const m = o as T.Mesh; if (m.geometry && m.geometry !== shadeBodyGeo && m.geometry !== shadeTailGeo) m.geometry.dispose(); });
  world = new T.Group(); scene.add(world);
  lamps.clear(); shadeViews.clear(); drifterViews.clear(); charmViews.clear(); pads.length = 0;
  for (const s of moteViews.values()) scene.remove(s); moteViews.clear();
}
function loadNight(n: NightId, seed: number) {
  night = n; game = createGame(seed, {}, n); clearWorld(); buildTerrain(game.def);
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
function show(html: string, cls = '') { scr.className = 'show ' + cls; scr.innerHTML = `<div class="card">${html}</div>`; }
function hideScreen() { scr.className = ''; scr.innerHTML = ''; }
const btn = (act: string, label: string, primary = false) => `<button data-act="${act}" class="${primary ? 'primary' : ''}">${label}</button>`;
function menu() {
  mode = 'menu'; $('hud').classList.add('hidden'); sound.stopMusic();
  loadNight(1, 7);
  show(`<div class="eyebrow">Một đốm sáng nhỏ · Ba hòn đảo thức giấc</div><h1>Đảo Đèn Lồng</h1>
    <p>Sương đen phủ kín quần đảo. Cùng Mây gom đom đóm, thắp lại đèn lồng qua ba đêm dài và đón bình minh trở về.</p>
    <div class="row">${btn('start', 'Bắt đầu hành trình', true)}${btn('settings', 'Cài đặt')}</div>
    <div class="practice">Luyện tập: ${btn('practice-1', 'Đêm 1')}${btn('practice-2', 'Đêm 2')}${btn('practice-3', 'Đêm 3')}</div>
    <div class="note">Bàn phím + chuột · WASD chạy · Space nhảy · Shift lướt · E nạp đèn · Q tỏa sáng · Esc/P tạm dừng</div>`, 'menu');
}
function intro(n: NightId) {
  mode = 'intro'; loadNight(n, 1000 * n + campaign.attempts * 17 + 3); $('hud').classList.add('hidden');
  const s = STORY[n], d = game.def;
  show(`<div class="eyebrow">Đêm ${n} / 3 · ${d.duration / 60 | 0}:${String(d.duration % 60).padStart(2, '0')} tới bình minh</div><h1>${s.title}</h1>
    <div class="elder"><div class="avatar"><span>Ông</span><span>Đăng</span></div><div class="lines">${s.lines.map((l, i) => `<p style="animation-delay:${0.2 + i * 0.9}s">“${l}”</p>`).join('')}</div></div>
    <div class="facts"><span>🏮 ${d.lanterns.length} đèn</span><span>✦ 10 đom đóm / đèn</span>${d.drifters ? '<span>〰 Gió Lạc</span>' : ''}${d.charms.length ? '<span>❖ Bùa Gió</span>' : ''}${d.pads.length ? '<span>⤒ Bục gió</span>' : ''}${d.wind ? '<span>🍃 Gió mạnh</span>' : ''}</div>
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
    <label class="check"><input type="checkbox" data-set="fps" ${settings.fps ? 'checked' : ''}><span>Hiện FPS</span></label></div>
    <div class="note">Tự động lưu trên trình duyệt này.</div><div class="row">${btn('settings-back', 'Xong', true)}</div>`, 'settings');
}
function result() {
  mode = 'result'; const won = game.state === 'won', p = game.player, lit = game.lanterns.filter(l => l.lit).length;
  if (won) { campaign.total += game.score; campaign.scores[night - 1] = game.score; }
  const reason = game.result === 'no_flames' ? 'Mây đã hết Ngọn Lửa.' : 'Bình minh đến trước khi mọi đèn kịp sáng.';
  const stats = `<div class="stats"><div><small>Đèn sáng</small><b>${lit}/${game.lanterns.length}</b></div><div><small>Ngọn Lửa</small><b>${p.flames}</b></div><div><small>Thời gian còn</small><b>${fmt(game.time_left_s)}</b></div><div><small>Điểm đêm</small><b class="gold">${game.score}</b></div></div>`;
  if (won) show(`<div class="eyebrow">Đêm ${night} hoàn thành</div><h1>${STORY[night].title} đã thức giấc</h1>${stats}
      <p>Tổng điểm hành trình: <b class="gold">${campaign.total}</b></p><div class="row">${night < 3 ? btn('next', `Sang Đêm ${night + 1}`, true) : btn('dawn', 'Đón bình minh', true)}${btn('menu', 'Về menu')}</div>`, 'result win');
  else show(`<div class="eyebrow">Đêm ${night} chưa xong</div><h1>Đêm còn dài…</h1><p>${reason} Đừng nản, Mây — giữ đom đóm cho lúc cần và trú bên những đèn đã sáng.</p>${stats}
      <div class="row">${btn('retry', `Chơi lại Đêm ${night}`, true)}${btn('menu', 'Về menu')}</div>`, 'result lose');
}
function dawn() {
  mode = 'dawn'; $('hud').classList.add('hidden'); sound.stopMusic(); sound.play('win');
  show(`<div class="eyebrow">Bình Minh</div><h1>Quần đảo đã sáng đèn</h1><p>“Cháu làm được rồi, Mây. Từ Đảo Bến tới Đảo Chuông, ánh sáng đã trở về.” — Ông Đăng</p>
    <div class="stats">${[1, 2, 3].map(n => `<div><small>Đêm ${n}</small><b>${campaign.scores[n - 1] ?? '—'}</b></div>`).join('')}<div><small>Tổng điểm</small><b class="gold">${campaign.total}</b></div></div>
    <div class="row">${btn('again', 'Chơi lại từ đầu', true)}${btn('menu', 'Về menu')}</div>`, 'dawn');
}
scr.addEventListener('click', e => {
  const act = (e.target as HTMLElement).closest('button')?.dataset.act; if (!act) return;
  sound.ensure(); sound.play('click');
  if (act === 'start' || act === 'again') { campaign = { total: 0, scores: [], attempts: 0 }; intro(1); }
  else if (act.startsWith('practice-')) { campaign = { total: 0, scores: [], attempts: 0 }; intro(Number(act.slice(9)) as NightId); }
  else if (act === 'settings') settingsScreen(mode === 'paused' ? pauseMenu : menu);
  else if (act === 'settings-back') settingsBack();
  else if (act === 'play') play();
  else if (act === 'menu') menu();
  else if (act === 'resume') requestPause();
  else if (act === 'restart' || act === 'retry') { campaign.attempts++; intro(night); }
  else if (act === 'next') intro((night + 1) as NightId);
  else if (act === 'dawn') dawn();
});
scr.addEventListener('input', e => {
  const t = e.target as HTMLInputElement, k = t.dataset.set as keyof Settings | undefined; if (!k) return;
  if (k === 'fps') settings.fps = t.checked; else { (settings as any)[k] = Number(t.value); const o = t.parentElement?.querySelector('output'); if (o) o.textContent = `${Math.round(Number(t.value) * 100)}%`; }
  $('fps').classList.toggle('hidden', !settings.fps); saveSettings();
});
$('fps').classList.toggle('hidden', !settings.fps);

// ---------- Input ----------
function requestPause() { if (mode === 'play' || mode === 'paused') pauseQueue++; }
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
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
    ? { move: keyboardMove(keys), cam_yaw_deg: yaw, jump: keys.has('Space'), interact: keys.has('KeyE'), pulse: keys.has('KeyQ'), dash: keys.has('ShiftLeft') || keys.has('ShiftRight'), pause }
    : { ...idle(), cam_yaw_deg: yaw, pause };
  const events = step(game, input);
  if (wasGrounded && !p.grounded && p.respawn === 0) { if (p.launch && !hadLaunch) { sound.play('pad'); burst([p.pos[0], p.pos[1] + 0.3, p.pos[2]], 14, 5, C.gold); } else if (p.vel[1] > 0) sound.play('jump'); }
  for (const e of events) onEvent(e);
}
function onEvent(e: Event) {
  const p = game.player, at = [p.pos[0], p.pos[1] + 1, p.pos[2]];
  switch (e.name) {
    case 'mote_picked': sound.play('pickup'); burst(at, 4, 2.5); break;
    case 'deposit': sound.play('deposit'); break;
    case 'lantern_lit': { sound.play('light'); const l = game.lanterns.find(x => x.id === e.data.lantern_id)!; burst([l.pos[0] + 0.7, l.pos[1] + 1.9, l.pos[2]], 30, 6, C.lit, 0.7); toast(`Đèn ${l.id} đã sáng! +${tuning.score.per_lantern}`); break; }
    case 'pulse': sound.play('pulse'); waveT = 0; wave.position.set(p.pos[0], p.pos[1] + rules.pulse_center_y, p.pos[2]); waveRing.position.set(p.pos[0], p.pos[1] + 0.08, p.pos[2]); { const n = (e.data.stunned_ids as string[]).length; if (n) toast(`Xua ${n} Bóng Mực · +${n * tuning.score.per_stun}`); } break;
    case 'player_hit': sound.play(e.data.by === 'fall' ? 'fall' : 'hit'); flash(); shake = 0.5; toast(e.data.by === 'fall' ? `Rơi xuống biển mây! Mất ${e.data.lost} đom đóm` : `Bị Bóng Mực chạm! Rơi ${e.data.dropped} đom đóm`, 'danger'); break;
    case 'dash': sound.play('dash'); burst(at, 6, 1.5, 0xdfe8ff, 0.4); break;
    case 'charm_picked': sound.play('charm'); burst(at, 18, 4, C.scarf, 0.6); toast('Bùa Gió! Chạy nhanh và lướt liên tục trong 10 giây'); break;
    case 'drifter_steal': sound.play('steal'); toast(`Gió Lạc cướp ${e.data.amount} đom đóm!`, 'danger'); break;
    case 'drifter_drop': sound.play('drop'); toast(`Gió Lạc đánh rơi ${e.data.amount} đom đóm`); break;
    case 'shade_spawned': sound.play('spawn'); break;
    case 'paused': mode = 'paused'; keys.clear(); pauseMenu(); break;
    case 'resumed': mode = 'play'; hideScreen(); break;
    case 'game_over': mode = 'ending'; endAt = performance.now() + 1400; sound.stopMusic(); sound.play(e.data.result === 'won' ? 'win' : 'lose');
      toast(e.data.result === 'won' ? 'Mọi đèn đã sáng!' : e.data.reason === 'dawn' ? 'Bình minh đã tới…' : 'Ngọn Lửa đã tắt…', e.data.result === 'won' ? 'big' : 'danger big'); break;
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
  let lit = 0;
  for (const l of g.lanterns) {
    const v = lamps.get(l.id)!; if (l.lit) lit++;
    (v.shade.material as T.MeshLambertMaterial).color.setHex(l.lit ? C.lit : C.unlit);
    (v.shade.material as T.MeshLambertMaterial).emissive.setHex(l.lit ? C.lit : 0x000000);
    (v.core.material as T.SpriteMaterial).opacity = l.lit ? 0.9 + Math.sin(t * 3 + l.pos[0]) * 0.08 : l.deposited / 25;
    v.light.intensity = l.lit ? 45 : 0; v.ring.visible = l.lit;
    if (l.lit) (v.ring.material as T.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 2) * 0.1;
    if (v.dep !== l.deposited) { v.dep = l.deposited; v.progress.geometry.dispose(); v.progress.geometry = new T.RingGeometry(0.75, 0.95, 32, 1, Math.PI / 2, Math.max(0.0001, (l.deposited / tuning.lantern_cost) * Math.PI * 2)); }
    v.progress.visible = !l.lit && l.deposited > 0;
  }
  const target = 0.15 + 0.55 * (lit / g.lanterns.length);
  ambient += (target - ambient) * Math.min(1, dt * 2); if (Math.abs(target - ambient) < 0.002) ambient = target; hemi.intensity = ambient;
  moon.intensity = 0.6 + ambient * 0.6;

  // Motes
  sync(moteViews, g.motes, () => { const s = sprite(moteTex, 0.9); scene.add(s); return s; }, s => scene.remove(s));
  g.motes.forEach((m, i) => {
    const s = moteViews.get(m.id)!; const ph = i * 1.7;
    s.position.set(m.pos[0] + Math.sin(t * 1.3 + ph) * 0.12, m.pos[1] + 0.75 + Math.sin(t * 2.2 + ph) * 0.18, m.pos[2] + Math.cos(t * 1.1 + ph) * 0.12);
    const blink = m.ttl !== null && m.ttl < 120 ? (Math.floor(t * 8) % 2 ? 0.25 : 1) : 1;
    (s.material as T.SpriteMaterial).opacity = blink; s.scale.setScalar(0.8 + Math.sin(t * 4 + ph) * 0.12);
  });

  // Shades
  sync(shadeViews, g.shades, () => makeShade(), v => world.remove(v.g));
  for (const s of g.shades) {
    const v = shadeViews.get(s.id)!; if (v.born < 0) { v.born = t; if (g.tick > 0) burst([s.pos[0], s.pos[1] + 1, s.pos[2]], 12, 3, C.outline, 0.8); }
    const grow = Math.min(1, (t - v.born) / 0.5);
    v.g.position.set(s.pos[0], s.pos[1] + Math.sin(t * 3 + s.pos[0]) * 0.12, s.pos[2]);
    v.g.rotation.y = Math.atan2(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]);
    const stunned = s.state === 'stunned';
    (v.body.material as T.MeshBasicMaterial).color.setHex(stunned ? C.stunned : C.shade);
    (v.outline.material as T.MeshBasicMaterial).color.setHex(stunned ? 0x5a4f7a : C.outline);
    v.stars.visible = stunned; v.stars.rotation.y = t * 4;
    v.eyes.forEach(e => e.scale.setScalar(stunned ? 0.4 : s.state === 'chase' ? 1.25 : 1));
    v.g.scale.setScalar((s.state === 'recoil' ? 0.85 : 1) * grow * (1 + Math.sin(t * 5) * 0.03));
    v.g.visible = s.state !== 'recoil' || Math.floor(t * 10) % 2 === 0;
  }

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
  if (mode === 'menu' || mode === 'intro') {
    const o = t * 0.06, r = mode === 'menu' ? 58 : 40;
    camera.position.lerp(new T.Vector3(Math.cos(o) * r + (night === 2 ? 35 : 0), 26, Math.sin(o) * r), 1 - Math.exp(-dt * 1.5)); camera.lookAt(night === 2 ? 35 : 0, 0, 0);
  } else {
    const want = new T.Vector3(focus.x - Math.sin(a) * dist * Math.cos(pitch), focus.y + dist * Math.sin(pitch), focus.z - Math.cos(a) * dist * Math.cos(pitch));
    const gh = g.def.ground(want.x, want.z); if (gh !== null && want.y < gh + 1.5) want.y = gh + 1.5;
    camera.position.lerp(want, 1 - Math.exp(-dt * 8));
    if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; }
    camera.lookAt(focus); updateOcclusion(camera.position, focus);
  }
  renderer.render(scene, camera);
  if (mode !== 'menu' && mode !== 'intro') hud(t);
}

function hud(t: number) {
  const g = game, p = g.player;
  $('flames').innerHTML = Array.from({ length: tuning.flames }, (_, i) => `<span class="flame ${i < p.flames ? 'on' : ''}">${flameSvg}</span>`).join('');
  const timer = $('timer'); timer.textContent = fmt(g.time_left_s); timer.classList.toggle('danger', g.time_left_s <= 30);
  const lit = g.lanterns.filter(l => l.lit).length;
  $('lamps').innerHTML = `<span class="lamp-ico"></span> Đèn <b>${lit}/${g.lanterns.length}</b>`;
  $('score').textContent = `${g.score.toLocaleString('vi-VN')}`;
  const slots = $('motebar').children; for (let i = 0; i < 10; i++) slots[i].className = i < p.carried ? 'on' : '';
  $('carrytext').textContent = p.carried >= tuning.carry_capacity ? 'Túi đầy — mang tới đèn!' : `Đom đóm ${p.carried}/${tuning.carry_capacity}`;
  const dashK = p.charm > 0 ? 0 : p.dashCd / rules.dash_cd_ticks, pulseK = p.pulseCd / rules.pulse_cd_ticks;
  const cd = (id: string, k: number, blocked: boolean, label: string) => { const el = $(id); el.style.setProperty('--p', String(k)); el.classList.toggle('ready', k === 0 && !blocked); el.classList.toggle('blocked', blocked); el.querySelector('span')!.textContent = label; };
  cd('cd-dash', dashK, false, p.charm > 0 ? `Bùa ${Math.ceil(p.charm / 60)}s` : p.dashCd > 0 ? `${(p.dashCd / 60).toFixed(1)}s` : 'Lướt');
  cd('cd-pulse', pulseK, p.carried < tuning.pulse_cost, p.pulseCd > 0 ? `${(p.pulseCd / 60).toFixed(1)}s` : p.carried < tuning.pulse_cost ? 'Cần 3 ✦' : 'Tỏa Sáng');
  // Lantern prompt (interact radius, nearest then id like the core).
  const dxz = (q: number[]) => Math.hypot(q[0] - p.pos[0], q[2] - p.pos[2]);
  const near = g.lanterns.filter(l => !l.lit && dxz(l.pos) <= tuning.interact_radius).sort((a, b) => dxz(a.pos) - dxz(b.pos) || a.id.localeCompare(b.id))[0];
  const pr = $('prompt'); pr.classList.toggle('hidden', !near || p.respawn > 0);
  if (near) pr.innerHTML = `<kbd>E</kbd> — Nạp ánh sáng (${near.deposited}/${tuning.lantern_cost})${p.carried === 0 ? '<small>Cần đom đóm</small>' : ''}`;
  const safe = g.lanterns.some(l => l.lit && dxz(l.pos) <= tuning.safe_radius);
  $('status').innerHTML = [safe ? '<span class="safe">✦ Vùng an toàn</span>' : '', p.charm > 0 ? `<span class="charm">❖ Bùa Gió ${(p.charm / 60).toFixed(1)}s</span>` : '', g.wind.active ? '<span class="wind">🍃 Gió đang thổi</span>' : ''].join('');
  $('windwarn').classList.toggle('hidden', !(g.wind.warning && !g.wind.active));
  if (g.wind.warning && !windWarned) { windWarned = true; sound.play('wind'); }
  if (!g.wind.warning) windWarned = false;
  // Countdown last 10 s
  const sec = Math.ceil(g.time_left_s - 1e-9);
  if (g.state === 'playing' && sec !== lastCount) { if (sec <= 10 && sec > 0 && lastCount !== -1) sound.play(sec <= 3 ? 'count_last' : 'count'); lastCount = sec; }
  // Off-screen arrow to nearest unlit lantern
  const target = g.lanterns.filter(l => !l.lit).sort((a, b) => dxz(a.pos) - dxz(b.pos))[0];
  const arrow = $('arrow');
  if (target) {
    const v = tmp.set(target.pos[0], target.pos[1] + 2, target.pos[2]).project(camera);
    const behind = v.z > 1; let x = v.x, y = v.y; if (behind) { x = -x; y = -y; if (Math.hypot(x, y) < 1e-3) y = -1; }
    const on = !behind && Math.abs(x) <= 0.92 && Math.abs(y) <= 0.9;
    arrow.classList.toggle('hidden', on);
    if (!on) {
      const ang = Math.atan2(y, x), s = Math.min(0.86 / Math.abs(Math.cos(ang) || 1e-6), (Math.sin(ang) < 0 ? 0.6 : 0.72) / Math.abs(Math.sin(ang) || 1e-6)); // keep clear of bottom HUD / help
      arrow.style.left = `${(Math.cos(ang) * s + 1) / 2 * innerWidth}px`; arrow.style.top = `${(1 - Math.sin(ang) * s) / 2 * innerHeight}px`;
      (arrow.firstElementChild as HTMLElement).style.transform = `rotate(${-ang}rad)`;
      arrow.querySelector('span')!.textContent = `${target.id} · ${Math.round(dxz(target.pos))}m`;
    }
  } else arrow.classList.add('hidden');
  void t;
}

function finishNight() { if (game.state === 'won' && night === 3) { campaign.total += game.score; campaign.scores[2] = game.score; dawn(); } else result(); }
// ---------- Main loop ----------
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.25); last = now;
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
menu();
requestAnimationFrame(frame);
