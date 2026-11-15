import { useSyncExternalStore } from "react";
import { META_UPS, SKILL_MAP, COMMANDERS } from "./data";

export interface Save {
  shards: number;
  cleared: Record<number, number>; // levelId -> stars
  meta: Record<string, number>;
  commanders: string[];
  commander: string;
  skills: Record<string, number>; // skillId -> level (0 = locked)
  loadout: string[];
  asc: number; // 当前选择
  ascUnlocked: number;
  daily: Record<string, number>; // date -> best score
  stats: { runs: number; wins: number; kills: number; bossKills: number };
  seenHelp: boolean;
}

const KEY = "etched-frontier-save-v1";

export function defaultSave(): Save {
  return {
    shards: 0,
    cleared: {},
    meta: {},
    commanders: ["architect"],
    commander: "architect",
    skills: { orbital: 1, overload: 1, repair: 1 },
    loadout: ["orbital", "overload"],
    asc: 0,
    ascUnlocked: 0,
    daily: {},
    stats: { runs: 0, wins: 0, kills: 0, bossKills: 0 },
    seenHelp: false,
  };
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultSave();
}

let state: Save = load();
const listeners = new Set<() => void>();

export function getSave() {
  return state;
}
export function updateSave(fn: (s: Save) => void) {
  const next: Save = JSON.parse(JSON.stringify(state));
  fn(next);
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
export function resetSave() {
  state = defaultSave();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
export function useSave(): Save {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
}

export function levelUnlocked(s: Save, id: number) {
  if (id === 0) return true;
  return s.cleared[id - 1] !== undefined;
}
export function unlockedChapter(s: Save) {
  let c = 1;
  for (let i = 0; i < 24; i++) if (s.cleared[i] !== undefined) c = Math.max(c, Math.floor(i / 6) + 1 + (i % 6 === 5 ? 1 : 0));
  return Math.min(4, c);
}
export function campaignDone(s: Save) {
  return s.cleared[23] !== undefined;
}
export function totalStars(s: Save) {
  return Object.values(s.cleared).reduce((a, b) => a + b, 0);
}

export interface MetaBonus {
  startScrap: number;
  hp: number;
  loot: number;
  ether: number;
  dmg: number;
  slot: number;
  cap: number;
  skillSlots: number;
  cdr: number;
}
export function metaBonus(s: Save): MetaBonus {
  const m = (id: string) => s.meta[id] || 0;
  return {
    startScrap: m("scrap") * 25,
    hp: m("hp") * 2,
    loot: m("loot") * 0.04,
    ether: m("ether") * 0.08,
    dmg: m("dmg") * 0.03,
    slot: m("slot"),
    cap: m("cap"),
    skillSlots: 2 + m("skillslot"),
    cdr: m("cdr") * 0.04,
  };
}

export function buyMeta(id: string) {
  const up = META_UPS.find((u) => u.id === id)!;
  updateSave((s) => {
    const lv = s.meta[id] || 0;
    if (lv >= up.max) return;
    const c = up.costs[lv];
    if (s.shards < c) return;
    s.shards -= c;
    s.meta[id] = lv + 1;
  });
}
export function buyCommander(id: string) {
  const c = COMMANDERS.find((x) => x.id === id)!;
  updateSave((s) => {
    if (s.commanders.includes(id) || s.shards < c.cost) return;
    s.shards -= c.cost;
    s.commanders.push(id);
  });
}
export function skillUpCost(level: number) {
  return 30 + level * 35;
}
export function buySkill(id: string) {
  const def = SKILL_MAP[id];
  updateSave((s) => {
    const lv = s.skills[id] || 0;
    if (lv === 0) {
      if (s.shards < def.cost) return;
      s.shards -= def.cost;
      s.skills[id] = 1;
    } else if (lv < 5) {
      const c = skillUpCost(lv);
      if (s.shards < c) return;
      s.shards -= c;
      s.skills[id] = lv + 1;
    }
  });
}
export function toggleLoadout(id: string) {
  updateSave((s) => {
    const slots = metaBonus(s).skillSlots;
    if ((s.skills[id] || 0) === 0) return;
    const i = s.loadout.indexOf(id);
    if (i >= 0) s.loadout.splice(i, 1);
    else {
      s.loadout.push(id);
      while (s.loadout.length > slots) s.loadout.shift();
    }
  });
}
