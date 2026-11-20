// Ticket-04 desktop shell (Electron). Loads the built web game (dist/index.html) — core stays unchanged.
//   npm start                                   → play
//   npm start -- --export-leaderboard out.json  → write {"entries":[...]} (top 10) and exit, no window
//   npm run --silent bench -- --seed 42 --duration 30 --out bench.json → standard benchmark scene, writes bench.json, exit 0
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const t0Epoch = Date.now() - process.uptime() * 1000; // process start (≈ moment the command launched Electron)
const argv = process.argv.slice(1);
const flag = k => argv.includes(`--${k}`);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const cwd = process.env.INIT_CWD || process.cwd(); // npm sets INIT_CWD to where the user ran the command
const resolveOut = f => path.resolve(cwd, f);

app.setName('dao-den-long');
if (process.env.DDL_USER_DATA) app.setPath('userData', path.resolve(process.env.DDL_USER_DATA));
const lbFile = () => path.join(app.getPath('userData'), 'leaderboard.json');
const MAX = 10;
function readBoard() {
  try {
    const raw = JSON.parse(fs.readFileSync(lbFile(), 'utf8'));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.entries) ? raw.entries : [];
    return list.filter(e => e && typeof e.name === 'string' && Number.isFinite(e.score) && typeof e.achieved_at === 'string');
  } catch { return []; }
}
// Same ordering as game/src/leaderboard.ts: score desc, ties → earlier achieved_at first (stable).
const sortBoard = list => list.map((e, i) => [e, i]).sort(([a, i], [b, j]) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at) || i - j).map(([e]) => e).slice(0, MAX);
const pick = e => ({ name: e.name, score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed });

// Laptops with hybrid graphics: ask Chromium for the discrete GPU (WebGL powerPreference alone is not honoured on Windows).
// The GPU actually used is reported in bench.json → renderer.gpu.
app.commandLine.appendSwitch('force_high_performance_gpu');
const BENCH = flag('bench');
const EXPORT = opt('export-leaderboard', null);
if (BENCH) {
  // Requirement: vsync off / uncapped frame rate, fixed 1280×720 at device scale 1.
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
}

if (EXPORT) {
  app.whenReady().then(() => {
    const out = resolveOut(EXPORT);
    try {
      fs.writeFileSync(out, JSON.stringify({ entries: sortBoard(readBoard()).map(pick) }, null, 2) + '\n');
      console.log(`leaderboard exported → ${out}`); app.exit(0);
    } catch (e) { console.error(`export failed: ${e.message}`); app.exit(1); }
  });
} else {
  ipcMain.handle('lb:get', () => sortBoard(readBoard()).map(pick));
  ipcMain.handle('lb:save', (_e, list) => {
    fs.mkdirSync(path.dirname(lbFile()), { recursive: true });
    fs.writeFileSync(lbFile(), JSON.stringify({ entries: sortBoard(Array.isArray(list) ? list : []).map(pick) }, null, 2) + '\n');
  });

  let first = null, peak = 0, memTimer = null;
  const sampleMem = () => {
    const kb = app.getAppMetrics().reduce((s, m) => s + (m.memory?.workingSetSize ?? 0), 0); // all processes (main, GPU, renderer)
    peak = Math.max(peak, kb / 1024);
  };
  ipcMain.on('bench:first', (_e, epochMs, info) => { first = { epochMs, info }; });
  ipcMain.on('bench:done', (_e, dts) => {
    sampleMem(); clearInterval(memTimer);
    const N = dts.length, sum = dts.reduce((a, b) => a + b, 0);
    const sorted = [...dts].sort((a, b) => a - b), k = Math.max(1, Math.ceil(0.01 * N));
    const worst = sorted.slice(N - k), p95 = sorted[Math.min(N - 1, Math.ceil(0.95 * N) - 1)];
    const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
    const cpus = os.cpus();
    const result = {
      contract_version: '1.3',
      seed: Number(opt('seed', '42')), duration_s: Number(opt('duration', '30')), warmup_s: 3,
      frames: N,
      avg_fps: r(1000 * N / sum),
      p1_low_fps: r(1000 / (worst.reduce((a, b) => a + b, 0) / k)),
      frame_ms_p95: r(p95, 2),
      worst_frames_ms: worst.slice(-10).reverse().map(v => r(v, 1)),
      spikes_over_33ms: dts.filter(v => v > 1000 / 30).length,
      load_ms: first ? Math.round(first.epochMs - t0Epoch) : null,
      peak_mem_mb: r(peak),
      vsync_off: true,
      resolution: '1280x720',
      renderer: { gpu: first?.info?.gpu ?? 'unknown', api: first?.info?.webgl, three: `r${first?.info?.three}`, electron: process.versions.electron, chromium: process.versions.chrome, pixel_ratio: first?.info?.pixelRatio, viewport: first?.info?.size },
      os: { type: os.type(), release: os.release(), platform: process.platform, arch: process.arch, cpu: cpus[0]?.model?.trim(), cores: cpus.length, ram_gb: r(os.totalmem() / 2 ** 30) },
      thresholds: { avg_fps_min: 60, p1_low_fps_min: 30, load_ms_max: 10000 },
      note: 'Scene: Night 1, 200 wander shades + 100 motes, L1–L3 lit (fuel 100); spawns, damage, pickups, fuel decay and night end disabled; camera orbits r 30 m, y 15 m, 15 s/lap. load_ms = process start → first rendered frame. peak_mem_mb = max sum of working sets over all Electron processes.'
    };
    result.pass = result.avg_fps >= 60 && result.p1_low_fps >= 30 && result.load_ms !== null && result.load_ms <= 10000;
    const out = resolveOut(opt('out', 'bench.json'));
    fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    console.log(`bench: ${N} frames, avg ${result.avg_fps} FPS, 1% low ${result.p1_low_fps} FPS, p95 ${result.frame_ms_p95} ms, load ${result.load_ms} ms, peak ${result.peak_mem_mb} MB → ${result.pass ? 'PASS' : 'FAIL'} (${out})`);
    app.exit(0);
  });

  app.whenReady().then(() => {
    const win = new BrowserWindow({
      width: 1280, height: 720, useContentSize: true, resizable: !BENCH, show: true, backgroundColor: '#0E1430',
      title: 'Đảo Đèn Lồng', autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), backgroundThrottling: false, contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    const index = path.join(__dirname, '..', 'dist', 'index.html');
    if (BENCH) {
      memTimer = setInterval(sampleMem, 250);
      const duration = Number(opt('duration', '30'));
      setTimeout(() => { console.error('bench: timeout'); app.exit(2); }, (duration + 60) * 1000);
      if (process.env.DDL_PROF) win.webContents.on('console-message', (_e, _l, msg) => console.log('[page]', msg));
      win.loadFile(index, { query: { prof: process.env.DDL_PROF ? '1' : '0', bench: '1', seed: opt('seed', '42'), duration: String(duration) } });
    } else win.loadFile(index);
    // Dev diagnostic (screenshots for docs / UI checks): DDL_SHOT=<dir> DDL_STEPS=<json [[js, wait_ms, png_name|null], ...]>
    if (process.env.DDL_SHOT) win.webContents.once('did-finish-load', async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      try {
        for (const [js, ms, name] of JSON.parse(process.env.DDL_STEPS || '[]')) {
          if (js) console.log('[js]', JSON.stringify(await win.webContents.executeJavaScript(js, true)));
          await wait(ms);
          if (name) fs.writeFileSync(path.join(process.env.DDL_SHOT, name), (await win.webContents.capturePage()).toPNG());
        }
      } catch (e) { console.error('shot failed', e); }
      app.exit(0);
    });
  });
  app.on('window-all-closed', () => app.quit());
}
