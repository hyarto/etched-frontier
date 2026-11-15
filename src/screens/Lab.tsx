import { useState } from "react";
import { COMMANDERS, META_UPS, SKILLS } from "../game/data";
import { buyCommander, buyMeta, buySkill, metaBonus, resetSave, skillUpCost, toggleLoadout, updateSave, useSave } from "../game/store";

export default function Lab({ onBack }: { onBack: () => void }) {
  const s = useSave();
  const [tab, setTab] = useState<"up" | "cmd" | "skill" | "data">("up");
  const mb = metaBonus(s);
  const tabs: [typeof tab, string][] = [
    ["up", "研究升级"],
    ["cmd", "指挥核心"],
    ["skill", "指挥官技能"],
    ["data", "档案"],
  ];
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-950 to-[#0a1020] text-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-800 px-3 py-2">
        <button onClick={onBack} className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700">
          ← 返回
        </button>
        <h2 className="text-lg font-bold text-cyan-300">局外实验室</h2>
        <div className="ml-auto rounded bg-cyan-950 px-3 py-1 text-sm font-bold text-cyan-200">◈ 蚀刻碎片 {s.shards}</div>
      </div>
      <div className="flex gap-1 px-3 pt-2">
        {tabs.map(([k, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-t px-4 py-1.5 text-sm ${tab === k ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-cyan-900 p-3">
        {tab === "up" && (
          <>
            <p className="mb-2 text-xs text-slate-400">原则:水平扩展(解锁新机制)优先于垂直膨胀。带「扩展」标记的升级会改变你的构筑空间。</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {META_UPS.map((u) => {
                const lv = s.meta[u.id] || 0;
                const maxed = lv >= u.max;
                const cost = u.costs[lv];
                return (
                  <div key={u.id} className={`rounded-lg border p-3 ${u.horizontal ? "border-amber-500/50 bg-amber-950/20" : "border-slate-700 bg-slate-900/70"}`}>
                    <div className="flex items-center justify-between">
                      <b>
                        {u.name} {u.horizontal && <span className="ml-1 rounded bg-amber-500 px-1 text-[10px] text-black">扩展</span>}
                      </b>
                      <span className="text-xs text-slate-400">
                        {lv}/{u.max}
                      </span>
                    </div>
                    <p className="my-1 text-xs text-slate-400">{u.desc}</p>
                    <div className="mb-2 flex gap-0.5">
                      {Array.from({ length: u.max }).map((_, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded ${i < lv ? "bg-cyan-400" : "bg-slate-700"}`} />
                      ))}
                    </div>
                    <button disabled={maxed || s.shards < cost} onClick={() => buyMeta(u.id)} className="w-full rounded bg-cyan-700 py-1 text-sm text-white disabled:bg-slate-700 disabled:text-slate-400">
                      {maxed ? "已满级" : `升级 ◈${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {tab === "cmd" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {COMMANDERS.map((c) => {
              const own = s.commanders.includes(c.id);
              const active = s.commander === c.id;
              return (
                <div key={c.id} className="rounded-xl border-2 p-4" style={{ borderColor: active ? c.color : "#334155", background: "#0b1220" }}>
                  <div className="text-xl font-black" style={{ color: c.color }}>
                    {c.name} <span className="text-xs font-normal text-slate-500">{c.title}</span>
                  </div>
                  <p className="my-1 text-sm text-slate-300">{c.desc}</p>
                  <ul className="mb-3 list-disc pl-5 text-xs text-slate-400">
                    {c.perks.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  {own ? (
                    <button onClick={() => updateSave((x) => { x.commander = c.id; })} className={`w-full rounded py-1.5 text-sm font-bold ${active ? "bg-emerald-600 text-white" : "bg-slate-700 hover:bg-slate-600"}`}>
                      {active ? "当前指挥核心" : "装备"}
                    </button>
                  ) : (
                    <button disabled={s.shards < c.cost} onClick={() => buyCommander(c.id)} className="w-full rounded bg-cyan-700 py-1.5 text-sm text-white disabled:bg-slate-700 disabled:text-slate-400">
                      解锁 ◈{c.cost}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === "skill" && (
          <>
            <p className="mb-2 text-xs text-slate-400">
              最多携带 {mb.skillSlots} 个技能(战斗中按 Q/W/E 或点击技能栏)。已装备:{s.loadout.map((id) => SKILLS.find((k) => k.id === id)?.name).join("、") || "无"}
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {SKILLS.map((k) => {
                const lv = s.skills[k.id] || 0;
                const eq = s.loadout.includes(k.id);
                return (
                  <div key={k.id} className={`rounded-lg border p-3 ${eq ? "border-cyan-400 bg-cyan-950/30" : "border-slate-700 bg-slate-900/70"}`}>
                    <div className="flex items-center justify-between">
                      <b>
                        <span className="mr-1 text-lg">{k.icon}</span>
                        {k.name}
                      </b>
                      <span className="text-xs text-slate-400">{lv ? `Lv${lv}` : "未解锁"}</span>
                    </div>
                    <p className="my-1 text-xs text-slate-400">{k.desc}</p>
                    <p className="mb-2 text-[11px] text-slate-500">基础冷却 {k.cd}s · 每级效果+25%、冷却-6%</p>
                    <div className="flex gap-2">
                      <button disabled={lv >= 5 || s.shards < (lv === 0 ? k.cost : skillUpCost(lv))} onClick={() => buySkill(k.id)} className="flex-1 rounded bg-cyan-700 py-1 text-sm text-white disabled:bg-slate-700 disabled:text-slate-400">
                        {lv === 0 ? `解锁 ◈${k.cost}` : lv >= 5 ? "满级" : `升级 ◈${skillUpCost(lv)}`}
                      </button>
                      {lv > 0 && (
                        <button onClick={() => toggleLoadout(k.id)} className={`rounded px-3 py-1 text-sm ${eq ? "bg-emerald-600 text-white" : "bg-slate-700"}`}>
                          {eq ? "已装备" : "装备"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {tab === "data" && (
          <div className="max-w-md space-y-2 text-sm">
            <div>通关次数:{s.stats.wins} / 出战 {s.stats.runs}</div>
            <div>累计击杀:{s.stats.kills} · Boss 击杀:{s.stats.bossKills}</div>
            <div>已通关关卡:{Object.keys(s.cleared).length}/24 · 总星数 {Object.values(s.cleared).reduce((a, b) => a + b, 0)}/72</div>
            <div>熵增协议已解锁到:{s.ascUnlocked}/10</div>
            <button
              onClick={() => {
                if (confirm("确定要清除全部存档吗?此操作不可恢复。")) resetSave();
              }}
              className="mt-4 rounded bg-red-800 px-4 py-2 text-white hover:bg-red-700"
            >
              清除存档
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
