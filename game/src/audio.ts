// Synthesized WebAudio: no downloaded assets. Web layer only (core never imports this).
export type Sfx = 'pickup' | 'deposit' | 'light' | 'pulse' | 'hit' | 'fall' | 'jump' | 'pad' | 'dash' | 'win' | 'lose'
  | 'spawn' | 'count' | 'count_last' | 'wind' | 'charm' | 'steal' | 'drop' | 'click' | 'refuel' | 'out' | 'drain';

const SCALES: Record<number, number[]> = { // gentle pentatonic per night (Hz)
  1: [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33],
  2: [196, 233.08, 261.63, 293.66, 349.23, 392, 466.16, 523.25],
  3: [174.61, 207.65, 233.08, 261.63, 311.13, 349.23, 415.3, 466.16]
};

export class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode; private musicBus!: GainNode; private sfxBus!: GainNode;
  private noise!: AudioBuffer; private timer: number | null = null; private nextBeat = 0; private beat = 0; private night = 1;
  private vol = { master: 0.8, music: 0.5, sfx: 0.8 };

  /** Must be called from a user gesture (browser autoplay policy). */
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext; if (!Ctx) return;
    const ctx = this.ctx = new Ctx();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.connect(comp);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(comp);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.apply();
  }
  setVolumes(master: number, music: number, sfx: number) { this.vol = { master, music, sfx }; this.apply(); }
  private apply() { if (!this.ctx) return; this.master.gain.value = this.vol.master; this.musicBus.gain.value = this.vol.music * 0.55; this.sfxBus.gain.value = this.vol.sfx; }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide?: number, delay = 0, bus = this.sfxBus, attack = 0.005) {
    const ctx = this.ctx!; const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  private hiss(dur: number, vol: number, f0: number, f1: number, kind: BiquadFilterType = 'bandpass', delay = 0, attack = 0.01) {
    const ctx = this.ctx!; const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = kind; f.Q.value = 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t); s.stop(t + dur + 0.05);
  }

  play(name: Sfx) {
    if (!this.ctx) return;
    switch (name) {
      case 'pickup': this.tone(880, 0.12, 'sine', 0.22, 1320); this.tone(1760, 0.1, 'sine', 0.08, undefined, 0.05); break;
      case 'deposit': this.tone(523, 0.14, 'triangle', 0.18, 784); break;
      case 'light': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 1.1, 'triangle', 0.16, undefined, i * 0.07, this.sfxBus, 0.02)); this.hiss(0.8, 0.05, 2000, 6000, 'highpass'); break;
      case 'pulse': this.tone(260, 0.55, 'sine', 0.45, 70); this.hiss(0.45, 0.22, 1600, 260); this.tone(1046, 0.35, 'triangle', 0.08); break;
      case 'hit': this.tone(150, 0.35, 'square', 0.16, 45); this.hiss(0.3, 0.35, 900, 120, 'lowpass'); break;
      case 'fall': this.tone(600, 0.9, 'triangle', 0.18, 90); this.hiss(0.9, 0.15, 3000, 300); break;
      case 'jump': this.tone(330, 0.16, 'triangle', 0.16, 660); break;
      case 'pad': this.tone(220, 0.5, 'triangle', 0.2, 990); this.hiss(0.6, 0.18, 500, 3000); break;
      case 'dash': this.hiss(0.24, 0.32, 3500, 700); this.tone(440, 0.12, 'sine', 0.06, 220); break;
      case 'win': [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.2, undefined, i * 0.13)); break;
      case 'lose': [440, 349.23, 293.66, 220].forEach((f, i) => this.tone(f, 0.55, 'triangle', 0.18, undefined, i * 0.26)); break;
      case 'spawn': this.tone(92, 0.7, 'sawtooth', 0.07, 55); this.hiss(0.7, 0.12, 400, 120, 'lowpass', 0, 0.2); break;
      case 'count': this.tone(1000, 0.07, 'square', 0.08); break;
      case 'count_last': this.tone(1480, 0.12, 'square', 0.1); break;
      case 'wind': this.hiss(2.4, 0.22, 300, 1400, 'bandpass', 0, 0.8); this.hiss(2.0, 0.12, 1800, 500, 'bandpass', 0.5, 0.6); break;
      case 'charm': [987.77, 1318.5, 1975.5].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.14, undefined, i * 0.06)); break;
      case 'steal': this.tone(900, 0.35, 'sawtooth', 0.07, 260); this.hiss(0.3, 0.12, 2500, 900); break;
      case 'drop': this.tone(700, 0.25, 'triangle', 0.14, 1100); break;
      case 'click': this.tone(660, 0.05, 'triangle', 0.1); break;
      case 'refuel': this.tone(392, 0.22, 'triangle', 0.16, 784); this.tone(1175, 0.18, 'sine', 0.06, undefined, 0.08); break;
      case 'out': this.tone(392, 0.8, 'triangle', 0.16, 98); this.hiss(0.6, 0.14, 1800, 200, 'lowpass'); break;
      case 'drain': this.tone(70, 0.6, 'sawtooth', 0.06, 50); this.tone(220, 0.4, 'sine', 0.05, 140, 0.1); break;
    }
  }

  /** Soft night music: slow pad chord + sparse pentatonic plucks, scheduled ahead. */
  startMusic(night: number) {
    this.night = night; if (!this.ctx || this.timer !== null) return;
    this.nextBeat = this.ctx.currentTime + 0.1; this.beat = 0;
    this.timer = window.setInterval(() => this.schedule(), 120);
  }
  stopMusic() { if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } }
  private schedule() {
    const ctx = this.ctx; if (!ctx) return; const sc = SCALES[this.night] ?? SCALES[1]; const spb = 0.5; // 120 bpm eighths feel calm at 0.5 s
    while (this.nextBeat < ctx.currentTime + 0.4) {
      const t = this.nextBeat - ctx.currentTime, b = this.beat;
      if (b % 16 === 0) { const root = sc[[0, 3, 1, 4][(b / 16) % 4]] / 2; for (const m of [1, 1.5, 2.0]) this.tone(root * m, 7.5, 'triangle', 0.05, undefined, t, this.musicBus, 1.8); }
      const pattern = [0, -1, 4, -1, 2, -1, -1, 5, 7, -1, 4, -1, 2, -1, 1, -1];
      const n = pattern[b % 16];
      if (n >= 0 && ((b * 7 + this.night) % 5 !== 0)) this.tone(sc[n] * (b % 32 < 16 ? 1 : 2), 1.4, 'sine', 0.06, undefined, t, this.musicBus, 0.01);
      this.nextBeat += spb; this.beat++;
    }
  }
}
