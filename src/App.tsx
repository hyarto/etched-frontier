import { useEffect, useMemo, useState } from "react";
import { AFFIXES, AFFIX_MAP, ASC_DESC, CHAPTERS, COMMANDERS, LEVELS, MUTATORS, SKILL_MAP, endlessLevel, type LevelCfg } from "./game/data";
import { mulberry32 } from "./game/engine";
import { levelUnlocked, totalStars, unlockedChapter, updateSave, useSave } from "./game/store";
import { isMuted, setMuted } from "./game/sfx";
import Battle, { type RunConfig } from "./screens/Battle";
import Lab from "./screens/Lab";
import Help from "./screens/Help";

type Screen =
  | { n: "menu" }
  | { n: "campaign"; ch: number }
  | { n: "brief"; level: number; daily?: string }
  | { n: "lab" }
  | { n: "endless" }
  | { n: "help" }
  | { n: "battle"; run: RunConfig; k: number };

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function dailySetup(key: string) {
  const h = hashStr("etched-" + key);
  const r = mulberry32(h);
  const level: LevelCfg = { ...LEVELS[h % 24], seed: h };
  const pool = AFFIXES.map((a) => a.id);
  const affixes: string[] = [];
  while (affixes.length < 2) affixes.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return { level, affixes, asc: 2 + ((h >> 5) % 5), seed: h };
}
function randAffixes() {
  const pool = AFFIXES.map((a) => a.id);
  const out: string[] = [];
  while (out.length < 2) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function newEndlessRun(commander: string, asc: number, affixes?: string[]): RunConfig {
  const seed = (Math.random() * 2147483647) >>> 0;
  return { level: endlessLevel(seed), commander, affixes: affixes || randAffixes(), asc, seed, endless: true };
}

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
}

export default function App() {
  const save = useSave();
  const [scr, setScr] = useState<Screen>(() => (typeof location !== "undefined" && new URLSearchParams(location.search).get("mode") === "endless" ? { n: "endless" } : { n: "menu" }));
  const [showIOS, setShowIOS] = useState(false);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
  const [installEv, setInstallEv] = useState<BIPEvent | null>(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [mute, setMute] = useState(isMuted());

  useEffect(() => {
    const bip = (e: Event) => {
      e.preventDefault();
      setInstallEv(e as BIPEvent);
    };
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("beforeinstallprompt", bip);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setOfflineReady(true)).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", bip);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const fullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      el.requestFullscreen?.()
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => {}))
        .catch(() => {});
  };

  let body;
  if (scr.n === "battle") {
    const run = scr.run;
    const nextId = run.daily || run.endless ? -1 : run.level.id + 1;
    body = (
      <Battle
        key={run.seed + "-" + run.level.id + "-" + scr.k}
        run={run}
        onRetry={() => setScr({ n: "battle", run: run.endless ? newEndlessRun(run.commander, run.asc) : run, k: scr.k + 1 })}
        onExit={() => setScr(run.daily || run.endless ? { n: "menu" } : { n: "campaign", ch: run.level.chapter })}
        onNext={nextId >= 0 && nextId < 24 && levelUnlocked(save, nextId) ? () => setScr({ n: "brief", level: nextId }) : undefined}
      />
    );
  } else if (scr.n === "brief") {
    body = <Brief level={scr.level} daily={scr.daily} onBack={() => setScr(scr.daily ? { n: "menu" } : { n: "campaign", ch: LEVELS[scr.level].chapter })} onLab={() => setScr({ n: "lab" })} onStart={(run) => setScr({ n: "battle", run, k: 0 })} />;
  } else if (scr.n === "campaign") {
    body = <Campaign ch={scr.ch} setCh={(ch) => setScr({ n: "campaign", ch })} onBack={() => setScr({ n: "menu" })} onPick={(level) => setScr({ n: "brief", level })} />;
  } else if (scr.n === "endless") {
    body = <EndlessBrief onBack={() => setScr({ n: "menu" })} onLab={() => setScr({ n: "lab" })} onStart={(run) => setScr({ n: "battle", run, k: 0 })} />;
  } else if (scr.n === "lab") {
    body = <Lab onBack={() => setScr({ n: "menu" })} />;
  } else if (scr.n === "help") {
    body = <Help onBack={() => setScr({ n: "menu" })} />;
  } else {
    const dk = todayKey();
    const best = save.daily[dk];
    body = (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#05070d]">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.12),transparent_60%)]" />
        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-4 px-4 sm:flex-row sm:gap-10">
          <div className="text-center sm:text-left">
            <div className="text-[11px] tracking-[0.5em] text-cyan-400">ETCHED FRONTIER</div>
            <h1 className="title-glow text-5xl font-black text-white sm:text-6xl">蚀刻防线</h1>
            <p className="mt-2 max-w-xs text-sm text-slate-400">动态造迷宫 · 能量回路耦合 · 肉鸽构筑。把路径拉长,把回路编好。</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-slate-400 sm:justify-start">
              <span className="rounded bg-slate-800 px-2 py-1">◈ {save.shards}</span>
              <span className="rounded bg-slate-800 px-2 py-1">★ {totalStars(save)}/72</span>
              <span className={`rounded px-2 py-1 ${online ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"}`}>{online ? "在线" : "离线模式"}</span>
              {offlineReady && <span className="rounded bg-cyan-900/60 px-2 py-1 text-cyan-300">离线可玩 ✓</span>}
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2">
            <MenuBtn primary onClick={() => setScr({ n: "campaign", ch: Math.min(unlockedChapter(save), 4) })}>
              ▶ 战役
            </MenuBtn>
            <MenuBtn accent onClick={() => setScr({ n: "endless" })}>
              ∞ 无尽肉鸽{save.endless.best ? `(最佳 ${save.endless.best} 波)` : ""}
            </MenuBtn>
            <MenuBtn onClick={() => setScr({ n: "lab" })}>◈ 局外实验室</MenuBtn>
            <MenuBtn onClick={() => setScr({ n: "brief", level: dailySetup(dk).level.id, daily: dk })}>
              ☼ 每日种子{best ? `(最佳 ${best})` : ""}
            </MenuBtn>
            <MenuBtn onClick={() => setScr({ n: "help" })}>? 玩法说明</MenuBtn>
            {isIOS && !standalone && !installEv && <MenuBtn onClick={() => setShowIOS(!showIOS)}>⤓ 安装到主屏幕</MenuBtn>}
            {showIOS && <div className="col-span-2 rounded border border-cyan-700 bg-slate-900 p-2 text-xs text-slate-300">在 Safari 中点击底部「分享」按钮,选择「添加到主屏幕」。安装后即使没有网络也能游玩。</div>}
            {installEv && (
              <MenuBtn
                onClick={() => {
                  void installEv.prompt();
                  setInstallEv(null);
                }}
              >
                ⤓ 安装到设备
              </MenuBtn>
            )}
            <div className="col-span-2 flex gap-2">
              <button onClick={fullscreen} className="flex-1 rounded border border-slate-700 bg-slate-900 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                全屏
              </button>
              <button
                onClick={() => {
                  setMuted(!mute);
                  setMute(!mute);
                }}
                className="flex-1 rounded border border-slate-700 bg-slate-900 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                音效:{mute ? "关" : "开"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#05070d] text-slate-200">
      {body}
      <div className="portrait-warn">
        <div className="text-5xl">⟳</div>
        <div className="mt-3 text-lg font-bold">请将设备横屏游玩</div>
        <div className="mt-1 text-xs text-slate-400">《蚀刻防线》专为横屏设计</div>
      </div>
    </div>
  );
}

function MenuBtn({ children, onClick, primary, accent }: { children: React.ReactNode; onClick: () => void; primary?: boolean; accent?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition hover:translate-x-1 ${primary ? "border-cyan-300 bg-cyan-600 text-white hover:bg-cyan-500" : accent ? "border-fuchsia-400 bg-fuchsia-700 text-white hover:bg-fuchsia-600" : "border-slate-700 bg-slate-900/90 text-slate-100 hover:border-cyan-500"}`}>
      {children}
    </button>
  );
}

function Campaign({ ch, setCh, onBack, onPick }: { ch: number; setCh: (c: number) => void; onBack: () => void; onPick: (id: number) => void }) {
  const save = useSave();
  const chap = CHAPTERS[ch - 1];
  const unlockedCh = unlockedChapter(save);
  return (
    <div className="flex h-full flex-col" style={{ background: `linear-gradient(180deg, ${chap.bg}, #05070d)` }}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button onClick={onBack} className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700">
          ← 返回
        </button>
        <div className="flex gap-1">
          {CHAPTERS.map((c) => (
            <button key={c.id} disabled={c.id > unlockedCh} onClick={() => setCh(c.id)} className={`rounded px-3 py-1 text-sm disabled:opacity-30 ${c.id === ch ? "text-black" : "bg-slate-800 text-slate-300"}`} style={c.id === ch ? { background: c.color } : undefined}>
              {c.id}.{c.name}
              {c.id > unlockedCh && " 🔒"}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-slate-400">◈ {save.shards}</div>
      </div>
      <div className="px-4 pt-3">
        <h2 className="text-2xl font-black" style={{ color: chap.color }}>
          第{ch}章 · {chap.name} <span className="text-sm font-normal text-slate-400">{chap.sub}</span>
        </h2>
        <p className="text-xs text-slate-400">{chap.feature}</p>
      </div>
      <div className="flex min-h-0 flex-1 items-center overflow-x-auto px-4">
        <div className="flex items-center gap-3 py-3">
          {LEVELS.filter((l) => l.chapter === ch).map((l, i) => {
            const un = levelUnlocked(save, l.id);
            const stars = save.cleared[l.id];
            return (
              <div key={l.id} className="flex items-center gap-3">
                <button
                  disabled={!un}
                  onClick={() => onPick(l.id)}
                  className={`relative flex h-44 w-36 shrink-0 flex-col justify-between rounded-xl border-2 p-3 text-left transition hover:-translate-y-1 disabled:opacity-40 ${l.boss ? "bg-gradient-to-b from-rose-950/80 to-slate-950" : "bg-slate-900/80"}`}
                  style={{ borderColor: l.boss ? "#f43f5e" : chap.color }}
                >
                  <div>
                    <div className="text-xs text-slate-400">{l.boss ? "BOSS 关" : `关卡 ${ch}-${l.idx + 1}`}</div>
                    <div className="text-lg font-black leading-tight text-white">{l.name}</div>
                  </div>
                  <div className="space-y-0.5 text-[11px] text-slate-400">
                    <div>{l.waves} 波 · {l.spawns} 个裂隙</div>
                    <div>
                      {l.portal && "传送门 "}
                      {l.barrels > 0 && "炸药桶 "}
                      {l.heat && "过热 "}
                      {l.collapse && "坍缩 "}
                    </div>
                  </div>
                  <div className="text-lg text-yellow-300">{un ? (stars ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆") : "🔒"}</div>
                </button>
                {i < 5 && <div className="h-0.5 w-5 bg-white/20" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Brief({ level, daily, onBack, onLab, onStart }: { level: number; daily?: string; onBack: () => void; onLab: () => void; onStart: (r: RunConfig) => void }) {
  const save = useSave();
  const dz = useMemo(() => (daily ? dailySetup(daily) : null), [daily]);
  const lv = dz ? dz.level : LEVELS[level];
  const chap = CHAPTERS[lv.chapter - 1];
  const [affixes, setAffixes] = useState<string[]>(() => (dz ? dz.affixes : randAffixes()));
  const [rerolls, setRerolls] = useState(1);
  const asc = dz ? dz.asc : Math.min(save.asc, save.ascUnlocked);
  const cmd = COMMANDERS.find((c) => c.id === save.commander) || COMMANDERS[0];
  return (
    <div className="flex h-full flex-col" style={{ background: `linear-gradient(135deg, ${chap.bg}, #05070d 70%)` }}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button onClick={onBack} className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700">
          ← 返回
        </button>
        <h2 className="text-lg font-black" style={{ color: chap.color }}>
          {daily ? `每日种子 ${daily}` : `${lv.chapter}-${lv.idx + 1}`} · {lv.name}
        </h2>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <h3 className="mb-1 font-bold text-cyan-300">战场情报</h3>
          <ul className="space-y-0.5 text-sm text-slate-300">
            <li>波数:{lv.waves}{lv.boss && "(终波 Boss:" + ["锈蚀巨像", "晶母", "深渊之主", "核心矩阵"][lv.chapter - 1] + ")"}</li>
            <li>裂隙数量:{lv.spawns}</li>
            <li>初始废料:▣{lv.startScrap}</li>
            <li>特殊地形:地热裂谷、磁暴矿脉、矿脉{lv.barrels > 0 && "、炸药桶"}{lv.portal && "、单向传送门"}</li>
            <li>机制:{lv.heat ? "炮塔过热 " : ""}{lv.collapse ? "动态坍缩 " : ""}{!lv.heat && !lv.collapse ? "基础" : ""}</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">{chap.feature}</p>
        </div>
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-bold text-amber-300">环境词缀</h3>
            {!daily && (
              <button disabled={rerolls <= 0} onClick={() => { setAffixes(randAffixes()); setRerolls(rerolls - 1); }} className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white disabled:opacity-40">
                重随 ({rerolls})
              </button>
            )}
          </div>
          {affixes.map((a) => (
            <div key={a} className="mb-1.5 rounded bg-black/30 p-2">
              <b className="text-amber-200">
                {AFFIX_MAP[a].icon} {AFFIX_MAP[a].name}
              </b>
              <div className="text-xs text-slate-400">{AFFIX_MAP[a].desc}</div>
            </div>
          ))}
        </div>
        <div className="col-span-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 lg:col-span-1">
          <h3 className="mb-1 font-bold text-cyan-300">指挥官</h3>
          <div className="mb-2 flex gap-1">
            {COMMANDERS.filter((c) => save.commanders.includes(c.id)).map((c) => (
              <button key={c.id} onClick={() => updateSave((s) => { s.commander = c.id; })} className={`rounded border px-2 py-1 text-sm ${save.commander === c.id ? "text-black" : "border-slate-600 text-slate-300"}`} style={save.commander === c.id ? { background: c.color, borderColor: c.color } : undefined}>
                {c.name}
              </button>
            ))}
            <button onClick={onLab} className="rounded border border-dashed border-slate-600 px-2 py-1 text-xs text-slate-400 hover:text-white">
              + 实验室
            </button>
          </div>
          <ul className="mb-2 list-disc pl-5 text-xs text-slate-400">
            {cmd.perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="text-xs text-slate-400">
            携带技能:{save.loadout.map((id) => SKILL_MAP[id]?.name).join("、") || "无"}
          </div>
          {!daily && save.ascUnlocked > 0 && (
            <div className="mt-3 rounded border border-red-900 bg-red-950/30 p-2">
              <div className="flex items-center justify-between text-sm">
                <b className="text-red-300">熵增协议 {asc}/10</b>
                <div className="flex gap-1">
                  <button onClick={() => updateSave((s) => { s.asc = Math.max(0, asc - 1); })} className="rounded bg-slate-700 px-2">
                    −
                  </button>
                  <button onClick={() => updateSave((s) => { s.asc = Math.min(s.ascUnlocked, asc + 1); })} className="rounded bg-slate-700 px-2">
                    +
                  </button>
                </div>
              </div>
              <ul className="mt-1 text-[11px] text-red-200/80">
                {ASC_DESC.slice(1, asc + 1).map((d, i) => (
                  <li key={i}>
                    L{i + 1} {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {daily && <div className="mt-2 text-xs text-red-300">每日种子固定熵增 {asc} 级(含 L1~L{asc} 全部限制)。得分仅保存在本机。</div>}
        </div>
      </div>
      <div className="flex justify-end border-t border-white/10 p-3">
        <button
          onClick={() => onStart({ level: lv, commander: save.commander, affixes, asc, seed: lv.seed, daily })}
          className="rounded-lg bg-cyan-600 px-10 py-2.5 text-lg font-black text-white shadow-lg shadow-cyan-900 hover:bg-cyan-500"
        >
          部署 ▶
        </button>
      </div>
    </div>
  );
}


function EndlessBrief({ onBack, onLab, onStart }: { onBack: () => void; onLab: () => void; onStart: (r: RunConfig) => void }) {
  const save = useSave();
  const [affixes, setAffixes] = useState<string[]>(() => randAffixes());
  const [rerolls, setRerolls] = useState(1);
  const asc = Math.min(save.asc, save.ascUnlocked);
  const cmd = COMMANDERS.find((c) => c.id === save.commander) || COMMANDERS[0];
  const e = save.endless;
  return (
    <div className="flex h-full flex-col bg-[linear-gradient(135deg,#240e2a,#05070d_70%)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button onClick={onBack} className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700">
          ← 返回
        </button>
        <h2 className="text-lg font-black text-fuchsia-300">∞ 无尽肉鸽</h2>
        <div className="ml-auto flex gap-2 text-xs text-slate-300">
          <span className="rounded bg-slate-800 px-2 py-1">最佳 {e.best} 波</span>
          <span className="rounded bg-slate-800 px-2 py-1">最高击杀 {e.bestKills}</span>
          <span className="rounded bg-slate-800 px-2 py-1">场次 {e.runs}</span>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-3 lg:grid-cols-3">
        <div className="rounded-xl border border-fuchsia-800/60 bg-slate-900/70 p-3">
          <h3 className="mb-1 font-bold text-fuchsia-300">规则</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-slate-300">
            <li>随机地图、无限波次,所有炮塔与调制器从一开始就可建造。</li>
            <li>
              <b className="text-amber-300">抽卡增益</b>:开局三选一,之后每 4 波(Boss 波必出稀有以上)再抽一次;卡牌可叠加,史诗卡能彻底改变打法。
            </li>
            <li>
              <b className="text-orange-300">敌人也在进化</b>:每波可能带有变异({MUTATORS.slice(0, 4).map((m) => m.name).join("、")}…),下一波会提前预告;精英会随机获得再生、护盾、自爆等词条。
            </li>
            <li>每 10 波出现一个 Boss(循环四种),波数越深敌人越强。撤退或失守后按波数结算蚀刻碎片。</li>
          </ul>
        </div>
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-bold text-amber-300">环境词缀</h3>
            <button
              disabled={rerolls <= 0}
              onClick={() => {
                setAffixes(randAffixes());
                setRerolls(rerolls - 1);
              }}
              className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white disabled:opacity-40"
            >
              重随 ({rerolls})
            </button>
          </div>
          {affixes.map((a) => (
            <div key={a} className="mb-1.5 rounded bg-black/30 p-2">
              <b className="text-amber-200">
                {AFFIX_MAP[a].icon} {AFFIX_MAP[a].name}
              </b>
              <div className="text-xs text-slate-400">{AFFIX_MAP[a].desc}</div>
            </div>
          ))}
        </div>
        <div className="col-span-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 lg:col-span-1">
          <h3 className="mb-1 font-bold text-cyan-300">指挥官</h3>
          <div className="mb-2 flex flex-wrap gap-1">
            {COMMANDERS.filter((c) => save.commanders.includes(c.id)).map((c) => (
              <button
                key={c.id}
                onClick={() =>
                  updateSave((s) => {
                    s.commander = c.id;
                  })
                }
                className={`rounded border px-2 py-1 text-sm ${save.commander === c.id ? "text-black" : "border-slate-600 text-slate-300"}`}
                style={save.commander === c.id ? { background: c.color, borderColor: c.color } : undefined}
              >
                {c.name}
              </button>
            ))}
            <button onClick={onLab} className="rounded border border-dashed border-slate-600 px-2 py-1 text-xs text-slate-400 hover:text-white">
              + 实验室
            </button>
          </div>
          <ul className="mb-2 list-disc pl-5 text-xs text-slate-400">
            {cmd.perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="text-xs text-slate-400">携带技能:{save.loadout.map((id) => SKILL_MAP[id]?.name).join("、") || "无"}</div>
          {save.ascUnlocked > 0 && (
            <div className="mt-3 flex items-center justify-between rounded border border-red-900 bg-red-950/30 p-2 text-sm">
              <b className="text-red-300">熵增协议 {asc}/10</b>
              <div className="flex gap-1">
                <button onClick={() => updateSave((s) => { s.asc = Math.max(0, asc - 1); })} className="rounded bg-slate-700 px-2">
                  −
                </button>
                <button onClick={() => updateSave((s) => { s.asc = Math.min(s.ascUnlocked, asc + 1); })} className="rounded bg-slate-700 px-2">
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end border-t border-white/10 p-3">
        <button onClick={() => onStart(newEndlessRun(save.commander, asc, affixes))} className="rounded-lg bg-fuchsia-600 px-10 py-2.5 text-lg font-black text-white shadow-lg shadow-fuchsia-950 hover:bg-fuchsia-500">
          深入无尽 ▶
        </button>
      </div>
    </div>
  );
}
