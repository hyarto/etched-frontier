import { useCallback, useEffect, useRef, useState } from "react";
import { AFFIX_MAP, BUILD_MAP, COLS, ELEM_COLOR, ELEM_NAME, ENEMIES, RETROFITS, ROWS, SKILL_MAP, type BuildDef, type LevelCfg } from "../game/data";
import { Game, type Building } from "../game/engine";
import { layout, render, type View } from "../game/render";
import { getSave, metaBonus, unlockedChapter, updateSave } from "../game/store";
import { sfx } from "../game/sfx";

export interface RunConfig {
  level: LevelCfg;
  commander: string;
  affixes: string[];
  asc: number;
  seed: number;
  daily?: string;
}

const STEP = 1 / 30;
const GROUPS: { title: string; kinds: string[] }[] = [
  { title: "结构", kinds: ["wall", "conduit", "relay", "drill"] },
  { title: "能源核心", kinds: ["source"] },
  { title: "逻辑调制器", kinds: ["mod"] },
  { title: "终端炮塔", kinds: ["emit"] },
];
const TARGET_NAME = { first: "最前", last: "最后", strong: "最强", close: "最近" } as const;

export default function Battle({ run, onExit, onNext, onRetry }: { run: RunConfig; onExit: () => void; onNext?: () => void; onRetry: () => void }) {
  const [g] = useState(() => {
    const s = getSave();
    return new Game({
      level: run.level,
      commander: run.commander,
      skills: s.loadout.filter((id) => (s.skills[id] || 0) > 0).map((id) => ({ id, level: s.skills[id] })),
      meta: metaBonus(s),
      affixes: run.affixes,
      asc: run.asc,
      seed: run.seed,
      chapterUnlocked: run.daily ? 4 : unlockedChapter(s),
    });
  });
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [, setTick] = useState(0);
  const [tool, setTool] = useState<string | null>(null);
  const [sel, setSel] = useState<Building | null>(null);
  const [skillSel, setSkillSel] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [showPath, setShowPath] = useState(true);
  const [panel, setPanel] = useState(true);
  const [toast, setToast] = useState<string>("");
  const [saved, setSaved] = useState<{ shards: number; stars: number } | null>(null);
  const view = useRef<View>({ hover: null, tool: null, sel: null, targeting: false, showPath: true, w: 800, h: 450 });
  const speedRef = useRef(1);
  const painting = useRef(false);
  const lastPaint = useRef("");
  const dprRef = useRef(1);

  view.current.tool = tool;
  view.current.sel = sel;
  view.current.targeting = skillSel !== null;
  view.current.showPath = showPath;
  speedRef.current = speed;

  // 循环
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const ctx = cv.current!.getContext("2d")!;
    const loop = (now: number) => {
      const real = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sp = speedRef.current;
      if (sp > 0 && !g.draft && !g.over) {
        acc += real * sp;
        let n = 0;
        while (acc >= STEP && n < 14) {
          g.update(STEP);
          acc -= STEP;
          n++;
        }
        if (n >= 14) acc = 0;
      }
      render(ctx, g, view.current, dprRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const iv = setInterval(() => setTick((t) => (t + 1) % 1e6), 120);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, [g]);

  // 尺寸
  useEffect(() => {
    const el = wrap.current!;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      dprRef.current = dpr;
      const c = cv.current!;
      c.width = Math.floor(r.width * dpr);
      c.height = Math.floor(r.height * dpr);
      view.current.w = r.width;
      view.current.h = r.height;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panel]);

  // 结算
  useEffect(() => {
    if (!g.over || saved) return;
    const shards = g.shardReward();
    const stars = g.stars();
    const won = g.over === "won";
    if (won) sfx("win");
    else sfx("lose");
    updateSave((s) => {
      s.shards += shards;
      s.stats.runs++;
      s.stats.kills += g.kills;
      s.stats.bossKills += g.bossKills;
      if (won) {
        s.stats.wins++;
        if (!run.daily) {
          s.cleared[run.level.id] = Math.max(s.cleared[run.level.id] || 0, stars);
          if (run.level.id === 23 && run.asc === s.ascUnlocked && s.ascUnlocked < 10) s.ascUnlocked++;
        }
      }
      if (run.daily) {
        const score = g.wave * 100 + g.kills + (won ? 2000 + g.lives * 50 : 0);
        s.daily[run.daily] = Math.max(s.daily[run.daily] || 0, score);
      }
    });
    setSaved({ shards, stars });
  }, [g.over, g, run, saved, g.version]);

  const flash = useCallback((m: string) => {
    setToast(m);
    sfx("err");
    setTimeout(() => setToast((t) => (t === m ? "" : t)), 1600);
  }, []);

  const cellAt = (e: React.PointerEvent | PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    const { cell, ox, oy } = layout(r.width, r.height);
    const x = Math.floor((e.clientX - r.left - ox) / cell);
    const y = Math.floor((e.clientY - r.top - oy) / cell);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return { x, y };
  };
  const doBuild = (x: number, y: number) => {
    if (!tool) return;
    const res = g.build(tool, x, y);
    if (!res.ok && res.msg) flash(res.msg);
    if (res.ok) sfx("build");
    if (res.ok && !(g.tokens[tool] > 0) && BUILD_MAP[tool].legendary) setTool(null);
  };
  const onDown = (e: React.PointerEvent) => {
    const c = cellAt(e);
    if (!c) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (e.button === 2) {
      setTool(null);
      setSkillSel(null);
      return;
    }
    view.current.hover = c;
    if (skillSel !== null) {
      if (g.useSkill(skillSel, c.x + 0.5, c.y + 0.5)) sfx("skill");
      setSkillSel(null);
      return;
    }
    if (g.barrels.some((b) => b.x === c.x && b.y === c.y)) {
      if (g.detonate(c.x, c.y)) sfx("boom");
      return;
    }
    if (tool) {
      painting.current = true;
      lastPaint.current = `${c.x},${c.y}`;
      doBuild(c.x, c.y);
      return;
    }
    const b = g.bAt(c.x, c.y);
    setSel(b);
  };
  const onMove = (e: React.PointerEvent) => {
    const c = cellAt(e);
    view.current.hover = c;
    if (painting.current && c && tool && (tool === "wall" || tool === "conduit")) {
      const k = `${c.x},${c.y}`;
      if (k !== lastPaint.current) {
        lastPaint.current = k;
        doBuild(c.x, c.y);
      }
    }
  };
  const onUp = () => {
    painting.current = false;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTool(null);
        setSkillSel(null);
        setSel(null);
      } else if (e.key === " ") {
        e.preventDefault();
        setSpeed((s) => (s === 0 ? 1 : 0));
      } else if (e.key === "1" || e.key === "2" || e.key === "3") setSpeed(Number(e.key));
      else if (e.key === "n" || e.key === "N") g.callWave();
      else if (e.key === "q" || e.key === "w" || e.key === "e") {
        const i = ["q", "w", "e"].indexOf(e.key);
        const s = g.skills[i];
        if (s && SKILL_MAP[s.id].target) setSkillSel(i);
        else if (s) g.useSkill(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g]);

  // 选中建筑失效
  if (sel && sel.dead) setTimeout(() => setSel(null), 0);

  const bossE = g.enemies.find((e) => e.def.boss);
  const canDraft = g.ether >= g.etherCost;
  const activeToasts = g.msgs.filter((m) => g.time - m.t < 6).slice(-3);
  const remaining = g.enemies.length + g.queue.length;

  const buildBtn = (d: BuildDef) => {
    const cost = g.costOf(d);
    const can = g.scrap >= cost;
    const tok = g.tokens[d.id] || 0;
    return (
      <button
        key={d.id}
        onClick={() => {
          setTool(tool === d.id ? null : d.id);
          setSel(null);
          setSkillSel(null);
        }}
        title={d.desc}
        className={`flex items-center gap-1 rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition ${
          tool === d.id ? "border-cyan-300 bg-cyan-500/20" : "border-slate-700 bg-slate-800/70 hover:border-slate-500"
        } ${can ? "" : "opacity-50"}`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-bold" style={{ color: d.color, background: "#0b1220", border: `1px solid ${d.color}` }}>
          {d.short}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-slate-100">{d.name}</span>
          <span className="block text-amber-300">{tok > 0 ? `免费×${tok}` : `▣${cost}`}</span>
        </span>
      </button>
    );
  };

  const avail = g.availableBuilds();
  const selStats = sel ? g.stats(sel) : null;

  const infoPanel = () => {
    if (!sel) return null;
    const b = sel;
    const d = b.def;
    const maxL = g.maxLvl(b);
    const upC = g.upgradeCost(b);
    const driven = d.kind === "source" ? g.buildings.filter((x) => x.pw && x.pw.src === b).length : 0;
    return (
      <div className="mb-2 rounded border border-cyan-500/40 bg-slate-900/90 p-2 text-[11px]">
        <div className="flex items-center justify-between">
          <b className="text-sm" style={{ color: d.color }}>
            {d.name} {maxL > 1 && <span className="text-slate-300">Lv{b.lvl}</span>}
          </b>
          <button className="text-slate-400 hover:text-white" onClick={() => setSel(null)}>
            ✕
          </button>
        </div>
        <p className="mb-1 text-slate-400">{d.desc}</p>
        <div className="mb-1 text-slate-300">
          耐久 {Math.ceil(b.hp)}/{b.maxHp}
          {b.jammed && <span className="ml-2 text-sky-300">被电磁干扰!</span>}
        </div>
        {d.kind === "source" && (
          <div className="mb-1 text-slate-300">
            驱动终端 {driven}/{g.srcCap + g.perk.cap} · 元素 {ELEM_NAME[d.elem!]}
          </div>
        )}
        {d.kind === "emit" && (
          <div className="mb-1 space-y-0.5 text-slate-300">
            {selStats ? (
              <>
                <div>
                  <span style={{ color: ELEM_COLOR[selStats.elem] }}>{ELEM_NAME[selStats.elem]}</span> · 伤害 {selStats.dmg.toFixed(1)}×{selStats.shots}
                  {selStats.shotMul < 1 ? `(×${selStats.shotMul.toFixed(2)})` : ""}
                </div>
                <div>
                  射速 {selStats.rate.toFixed(2)}/s · 射程 {selStats.range.toFixed(1)} · 估算DPS <b className="text-amber-300">{selStats.dps.toFixed(0)}</b>
                </div>
                <div>回路调制器:{b.pw!.mods.length ? b.pw!.mods.map((m) => m.def.short + m.lvl).join(" ") : "无"} (槽位 {g.slots + g.perk.slot})</div>
                {(g.cfg.heat || g.terr[b.y * COLS + b.x] === 2) && <div>热量 {Math.round(b.heat)}%{b.hot ? " 过热停机!" : ""}</div>}
              </>
            ) : (
              <div className="text-red-300">未供能:用导管/调制器把它连接到能源核心(相邻即连接)。{b.jammed ? "" : ""}</div>
            )}
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {b.lvl < maxL && (
            <button disabled={g.scrap < upC} onClick={() => { if (g.upgrade(b)) sfx("up"); }} className="rounded bg-emerald-600 px-2 py-1 text-white disabled:opacity-40">
              升级 ▣{upC}
            </button>
          )}
          {d.kind === "emit" && (
            <button onClick={() => g.cycleTarget(b)} className="rounded bg-slate-700 px-2 py-1 text-white">
              目标:{TARGET_NAME[b.target]}
            </button>
          )}
          {b.hp < b.maxHp && (
            <button disabled={g.scrap < g.repairCost(b)} onClick={() => g.repair(b)} className="rounded bg-sky-700 px-2 py-1 text-white disabled:opacity-40">
              修复 ▣{g.repairCost(b)}
            </button>
          )}
          {g.commander === "overclocker" && d.kind === "emit" && (
            <button disabled={b.overCd > 0} onClick={() => g.overload(b)} className="rounded bg-orange-600 px-2 py-1 text-white disabled:opacity-40">
              过载{b.overCd > 0 ? ` ${Math.ceil(b.overCd)}s` : ""}
            </button>
          )}
          <button onClick={() => { g.sell(b); setSel(null); sfx("sell"); }} className="rounded bg-rose-700 px-2 py-1 text-white">
            出售 ▣{Math.floor(b.spent * g.refundRate())}
          </button>
        </div>
        {d.kind === "emit" && (
          <div className="mt-2">
            <div className="mb-0.5 text-amber-300">改造 {b.lvl < 3 ? "(需 Lv3)" : b.retro ? `(已改造,更换 ▣${g.retroCost(b)})` : `(▣${g.retroCost(b)})`}</div>
            <div className="flex flex-col gap-1">
              {RETROFITS.filter((r) => r.emit === b.type).map((r) => (
                <button
                  key={r.id}
                  disabled={b.lvl < 3 || b.retro === r.id || g.scrap < g.retroCost(b)}
                  onClick={() => { if (g.retrofit(b, r.id)) sfx("up"); }}
                  className={`rounded border px-1.5 py-1 text-left disabled:opacity-40 ${b.retro === r.id ? "border-amber-400 bg-amber-500/20" : "border-slate-600 bg-slate-800"}`}
                >
                  <b className="text-slate-100">{r.name}</b> <span className="text-slate-400">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full select-none bg-[#05070d] text-slate-200" onContextMenu={(e) => e.preventDefault()}>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* 顶栏 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-slate-800 bg-slate-950/90 px-2 py-1 text-xs">
          <button onClick={onExit} className="rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700">
            ← 退出
          </button>
          <span className="text-rose-300">❤ {Math.max(0, g.lives)}/{g.maxLives}</span>
          <span className="text-amber-300">▣ {Math.floor(g.scrap)}</span>
          <span className="text-fuchsia-300">◆ {Math.floor(g.ether)}</span>
          <button disabled={!canDraft} onClick={() => { g.openDraft(); sfx("draft"); }} className={`rounded px-2 py-0.5 ${canDraft ? "bg-fuchsia-600 text-white animate-pulse" : "bg-slate-800 text-slate-500"}`}>
            以太抽取 ◆{g.etherCost}
          </button>
          <span className="text-cyan-200">
            波 {g.wave}/{g.cfg.waves}
            {g.wave < g.cfg.waves && <span className="text-slate-400"> · {Math.ceil(g.nextTimer)}s</span>}
            {g.wave >= g.cfg.waves && <span className="text-slate-400"> · 剩余 {remaining}</span>}
          </span>
          {g.wave < g.cfg.waves && (
            <>
              <button onClick={() => { g.callWave(); sfx("wave"); }} className="rounded bg-cyan-700 px-2 py-0.5 text-white hover:bg-cyan-600">
                提前开波 +◆{Math.ceil((Math.max(0, g.nextTimer) / 3) * g.etherMul)}
              </button>
              <button onClick={() => g.toggleBeacon()} className={`rounded px-2 py-0.5 ${g.beacon ? "bg-fuchsia-600 text-white" : "bg-slate-800 hover:bg-slate-700"}`}>
                熵增信标{g.beacon ? "·已激活" : ""}
              </button>
            </>
          )}
          <div className="ml-auto flex items-center gap-1">
            {[0, 1, 2, 3].map((s) => (
              <button key={s} onClick={() => setSpeed(s)} className={`rounded px-2 py-0.5 ${speed === s ? "bg-cyan-600 text-white" : "bg-slate-800 hover:bg-slate-700"}`}>
                {s === 0 ? "⏸" : `${s}x`}
              </button>
            ))}
            <button onClick={() => setShowPath(!showPath)} className={`rounded px-2 py-0.5 ${showPath ? "bg-teal-700" : "bg-slate-800"}`}>
              路径
            </button>
            <button onClick={() => setPanel(!panel)} className="rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700">
              {panel ? "收起▶" : "◀面板"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-slate-800/60 bg-slate-950/60 px-2 py-0.5 text-[10px] text-slate-400">
          {g.opts.affixes.map((a) => (
            <span key={a} title={AFFIX_MAP[a].desc} className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-200">
              {AFFIX_MAP[a].icon} {AFFIX_MAP[a].name}
            </span>
          ))}
          {run.asc > 0 && <span className="rounded bg-red-900/60 px-1.5 py-0.5 text-red-200">熵增 {run.asc}</span>}
          <span className="truncate">{g.cfg.chapter}-{g.cfg.idx + 1} {g.cfg.name}</span>
          {g.commander === "salvager" && <span className="text-emerald-300">拆建加成 +{Math.round(g.tinkerBonus * 100)}%(本波) · 已拆建 {g.tinker}</span>}
        </div>
        {/* 画布 */}
        <div ref={wrap} className="relative min-h-0 flex-1">
          <canvas ref={cv} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: tool ? "crosshair" : skillSel !== null ? "cell" : "default" }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
          {bossE && (
            <div className="pointer-events-none absolute left-1/2 top-1 w-[40%] -translate-x-1/2 text-center text-[11px]">
              <div className="text-pink-300">
                {bossE.def.name} {bossE.immune ? `· 免疫「${ELEM_NAME[bossE.immune as keyof typeof ELEM_NAME] || bossE.immune}」` : ""} {bossE.res > 0.05 ? `· 适应抗性 ${Math.round(bossE.res * 100)}%` : ""}
              </div>
              <div className="h-2 overflow-hidden rounded bg-black/60">
                <div className="h-full bg-pink-500" style={{ width: `${(100 * bossE.hp) / bossE.maxHp}%` }} />
              </div>
            </div>
          )}
          {/* 技能 */}
          <div className="absolute bottom-1 left-1 flex gap-1">
            {g.skills.map((s, i) => {
              const def = SKILL_MAP[s.id];
              const ready = s.cd <= 0;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!ready) return;
                    if (def.target) {
                      setSkillSel(skillSel === i ? null : i);
                      setTool(null);
                    } else if (g.useSkill(i)) sfx("skill");
                  }}
                  title={`${def.name}:${def.desc}(${"QWE"[i]})`}
                  className={`relative h-12 w-14 overflow-hidden rounded border text-center text-[10px] ${skillSel === i ? "border-yellow-300 bg-yellow-500/30" : ready ? "border-cyan-400 bg-slate-900/90" : "border-slate-700 bg-slate-900/80 opacity-70"}`}
                >
                  <div className="text-lg leading-5">{def.icon}</div>
                  <div className="truncate">{def.name}</div>
                  {!ready && <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white" style={{ height: `${(100 * s.cd) / s.maxCd}%` }} />}
                  {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{Math.ceil(s.cd)}</div>}
                </button>
              );
            })}
            {Object.entries(g.tokens).some(([, n]) => n > 0) && <div className="rounded bg-fuchsia-900/70 px-2 py-1 text-[10px] text-fuchsia-100">传奇调制器已入库,见右侧</div>}
          </div>
          {skillSel !== null && <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded bg-yellow-500/80 px-3 py-1 text-xs font-bold text-black">点击地图选择目标 (右键/Esc取消)</div>}
          {/* 提示 */}
          <div className="pointer-events-none absolute bottom-1 right-2 flex max-w-[55%] flex-col items-end gap-0.5 text-[11px]">
            {toast && <div className="rounded bg-red-600/90 px-2 py-0.5 text-white">{toast}</div>}
            {activeToasts.map((m) => (
              <div key={m.id} className="rounded bg-black/60 px-2 py-0.5" style={{ color: m.c }}>
                {m.text}
              </div>
            ))}
          </div>
          {speed === 0 && !g.over && !g.draft && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 text-3xl font-bold tracking-widest text-white/80">已暂停</div>}
          {g.wave === 0 && !g.over && (
            <div className="pointer-events-none absolute left-2 top-2 max-w-[260px] rounded bg-black/55 p-2 text-[11px] leading-snug text-slate-200">
              <b className="text-cyan-300">布防阶段:</b> 敌人将从左侧裂隙走向右侧核心。放置墙体拉长路径,用「能源核心 → 调制器 → 终端炮塔」相邻连接构成回路。
            </div>
          )}
          {/* 抽取 */}
          {g.draft && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-3">
              <div className="text-lg font-bold text-fuchsia-300">以太抽取 · 三选一</div>
              <div className="flex flex-wrap justify-center gap-3">
                {g.draft.map((o, i) => (
                  <button key={i} onClick={() => { g.chooseDraft(i); sfx("up"); }} className={`w-44 rounded-lg border-2 p-3 text-left transition hover:scale-105 ${o.kind === "mod" ? "border-amber-400 bg-amber-950/60" : "border-fuchsia-500 bg-fuchsia-950/60"}`}>
                    <div className="mb-1 text-sm font-bold text-white">{o.name}</div>
                    <div className="text-xs text-slate-300">{o.desc}</div>
                    <div className="mt-2 text-[10px] text-slate-400">{o.kind === "mod" ? "传奇调制器" : "战术增益"}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* 结算 */}
          {g.over && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-3">
              <div className={`w-80 rounded-xl border-2 p-5 text-center ${g.over === "won" ? "border-emerald-400 bg-slate-900" : "border-rose-500 bg-slate-900"}`}>
                <div className={`mb-1 text-2xl font-black ${g.over === "won" ? "text-emerald-300" : "text-rose-400"}`}>{g.over === "won" ? "防线守住!" : "防线崩溃"}</div>
                {g.over === "won" && <div className="mb-2 text-2xl text-yellow-300">{"★".repeat(g.stars())}{"☆".repeat(3 - g.stars())}</div>}
                <div className="mb-3 space-y-0.5 text-sm text-slate-300">
                  <div>
                    抵达波数 {g.wave}/{g.cfg.waves} · 击杀 {g.kills}
                  </div>
                  <div>失去生命 {g.lostLives}</div>
                  <div className="text-cyan-300">获得蚀刻碎片 +{saved?.shards ?? g.shardReward()}</div>
                  {run.daily && <div className="text-amber-300">每日种子得分 {g.wave * 100 + g.kills + (g.over === "won" ? 2000 + g.lives * 50 : 0)}</div>}
                </div>
                <div className="flex justify-center gap-2">
                  <button onClick={onExit} className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600">
                    返回
                  </button>
                  <button onClick={onRetry} className="rounded bg-cyan-700 px-3 py-1.5 text-sm hover:bg-cyan-600">
                    重试
                  </button>
                  {g.over === "won" && onNext && (
                    <button onClick={onNext} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-500">
                      下一关
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 右侧面板 */}
      {panel && (
        <div className="flex w-[196px] shrink-0 flex-col overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-1.5 sm:w-[228px]">
          {infoPanel()}
          {GROUPS.map((gr) => {
            const list = avail.filter((d) => gr.kinds.includes(d.kind) && !d.legendary);
            const leg = gr.kinds.includes("mod") ? avail.filter((d) => d.legendary) : [];
            return (
              <div key={gr.title} className="mb-2">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{gr.title}</div>
                <div className="grid grid-cols-2 gap-1">
                  {list.map(buildBtn)}
                  {leg.map(buildBtn)}
                </div>
              </div>
            );
          })}
          <div className="mt-auto rounded border border-slate-800 p-1.5 text-[10px] leading-snug text-slate-500">
            快捷键:空格暂停 · 1/2/3 倍速 · N 开波 · Q/W/E 技能 · 右键/Esc 取消。点击炸药桶引爆。
            <div className="mt-1 flex flex-wrap gap-x-2">
              {Object.values(ENEMIES).filter((e) => !e.boss).slice(0, 8).map((e) => (
                <span key={e.id} style={{ color: e.color }}>● {e.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
