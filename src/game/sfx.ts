// 极简 WebAudio 音效(无需任何音频文件,离线可用)
let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem("ef-mute") === "1";
} catch {
  /* ignore */
}

export function isMuted() {
  return muted;
}
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("ef-mute", m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

const TONES: Record<string, [number, number, number, OscillatorType][]> = {
  build: [[420, 0.06, 0.05, "square"]],
  sell: [[300, 0.08, 0.05, "triangle"]],
  up: [[500, 0.07, 0.06, "triangle"], [750, 0.1, 0.06, "triangle"]],
  err: [[150, 0.12, 0.06, "sawtooth"]],
  skill: [[220, 0.18, 0.08, "sawtooth"], [440, 0.2, 0.07, "triangle"]],
  boom: [[90, 0.3, 0.12, "sawtooth"]],
  draft: [[600, 0.08, 0.05, "sine"], [900, 0.12, 0.05, "sine"]],
  wave: [[260, 0.1, 0.05, "square"]],
  win: [[523, 0.15, 0.07, "triangle"], [659, 0.15, 0.07, "triangle"], [784, 0.3, 0.07, "triangle"]],
  lose: [[300, 0.25, 0.08, "sawtooth"], [200, 0.4, 0.08, "sawtooth"]],
};

export function sfx(name: string) {
  if (muted) return;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    let t = ctx.currentTime;
    for (const [f, d, v, type] of TONES[name] || []) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d * 0.8;
    }
  } catch {
    /* ignore */
  }
}
