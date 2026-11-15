import {
  BUILD_MAP,
  COLS,
  ROWS,
  ELEM_COLOR,
  EMIT_BASE,
  ENEMIES,
  RETRO_MAP,
  SKILL_MAP,
  type BuildDef,
  type Elem,
  type EnemyDef,
  type LevelCfg,
} from "./data";
import type { MetaBonus } from "./store";

export const T_FLOOR = 0;
export const T_ROCK = 1;
export const T_VENT = 2;
export const T_MAG = 3;
export const T_ORE = 4;
export const T_PIN = 5;
export const T_POUT = 6;

const INF = 1e9;
const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PowerInfo {
  src: Building;
  mods: Building[];
  path: Building[];
}
export interface Building {
  id: number;
  type: string;
  def: BuildDef;
  x: number;
  y: number;
  lvl: number;
  hp: number;
  maxHp: number;
  spent: number;
  retro: string | null;
  target: "first" | "last" | "strong" | "close";
  cd: number;
  heat: number;
  hot: boolean;
  charge: number;
  pw: PowerInfo | null;
  jammed: boolean;
  overT: number;
  overCd: number;
  beams: { x: number; y: number }[];
  dead: boolean;
  angle: number;
  flash: number;
}
export interface Enemy {
  id: number;
  def: EnemyDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  hp: number;
  maxHp: number;
  armor: number;
  shred: number;
  spd: number;
  scale: number;
  rem: number;
  elite: boolean;
  slow: number;
  slowT: number;
  burn: number;
  burnT: number;
  phaseCh: number;
  atk: Building | null;
  dead: boolean;
  mem: Record<string, number>;
  adaptive: boolean;
  immune: string | null;
  phaseDmg: Record<string, number>;
  nextPhase: number;
  flash: number;
  reward: number;
  res: number; // 当前展示的适应抗性
  gravT: number;
}
export interface Proj {
  x: number;
  y: number;
  tx: number;
  ty: number;
  target: Enemy | null;
  speed: number;
  dmg: number;
  elem: Elem;
  splash: number;
  pierce: number;
  hit: Set<number>;
  chain: number;
  pen: number;
  exec: number;
  nova: boolean;
  siphon: boolean;
  shell: boolean;
  crit: boolean;
  src: Building;
  life: number;
  color: string;
}
export interface Fx {
  k: "ring" | "line" | "text" | "spark";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  r?: number;
  t: number;
  ttl: number;
  c: string;
  s?: string;
}
export interface DraftOpt {
  kind: "mod" | "perk";
  id: string;
  name: string;
  desc: string;
}
export interface SkillState {
  id: string;
  level: number;
  cd: number;
  maxCd: number;
}
export interface Msg {
  id: number;
  text: string;
  c: string;
  t: number;
}
interface QItem {
  at: number;
  type: string;
  elite: boolean;
  sp: number;
}

export interface Stats {
  elem: Elem;
  dmg: number;
  rate: number;
  range: number;
  splash: number;
  pen: number;
  shots: number;
  shotMul: number;
  crit: number;
  critMul: number;
  echo: number;
  cap: boolean;
  capMul: number;
  exec: number;
  pierce: number;
  heatMul: number;
  cool: number;
  chain: number;
  nova: boolean;
  siphon: boolean;
  dps: number;
}

export interface GameOpts {
  level: LevelCfg;
  commander: string;
  skills: { id: string; level: number }[];
  meta: MetaBonus;
  affixes: string[];
  asc: number;
  seed: number;
  chapterUnlocked: number;
}

export class Game {
  cfg: LevelCfg;
  opts: GameOpts;
  rng: () => number;
  terr = new Uint8Array(COLS * ROWS);
  bmap: (Building | null)[] = new Array(COLS * ROWS).fill(null);
  buildings: Building[] = [];
  enemies: Enemy[] = [];
  projs: Proj[] = [];
  fx: Fx[] = [];
  msgs: Msg[] = [];
  zones: { x: number; y: number; r: number; t: number }[] = [];
  barrels: { x: number; y: number }[] = [];
  oreLeft = new Map<number, number>();
  spawns: { x: number; y: number }[] = [];
  core = { x: COLS - 1, y: ROWS >> 1 };
  portalIn: { x: number; y: number } | null = null;
  portalOut: { x: number; y: number } | null = null;
  dist = new Float32Array(COLS * ROWS);
  distF = new Float32Array(COLS * ROWS);
  distB = new Float32Array(COLS * ROWS);
  pathPreview: [number, number][][] = [];

  time = 0;
  wave = 0;
  nextTimer = 45;
  queue: QItem[] = [];
  over: "won" | "lost" | null = null;
  lives: number;
  maxLives: number;
  lostLives = 0;
  scrap: number;
  ether = 0;
  etherCost = 20;
  draft: DraftOpt[] | null = null;
  tokens: Record<string, number> = {};
  beacon = false;
  beaconActive = false;
  kills = 0;
  bossKills = 0;
  uid = 1;
  msgId = 1;
  version = 0;
  skills: SkillState[] = [];
  buffRate = 0;
  buffT = 0;
  empT = 0;
  perk = { dmg: 0, rate: 0, range: 0, loot: 0, costMul: 1, cap: 0, slot: 0 };
  tinker = 0;
  tinkerBonus = 0;
  powerDirty = true;
  jamTimer = 0;
  // 派生
  slots: number;
  srcCap: number;
  linkRange: number;
  lootMul: number;
  etherMul: number;
  hpMul: number;
  spdMul: number;
  fogMul: number;
  rateAff: number;
  heatAff: number;
  costAff: number;
  slowAff: number;
  magmaAff: number;
  armorAff: number;
  commander: string;
  dmgSource: Record<string, number> = {};

  constructor(opts: GameOpts) {
    this.opts = opts;
    this.cfg = opts.level;
    this.rng = mulberry32(opts.seed);
    const a = opts.affixes;
    const has = (id: string) => a.includes(id);
    const asc = opts.asc;
    this.commander = opts.commander;
    this.maxLives = Math.round((this.cfg.lives + opts.meta.hp) * (asc >= 5 ? 0.7 : 1));
    this.lives = this.maxLives;
    this.scrap = Math.round((this.cfg.startScrap + opts.meta.startScrap) * (asc >= 1 ? 0.85 : 1));
    this.slots = Math.max(1, 2 + opts.meta.slot - (asc >= 3 ? 1 : 0));
    this.srcCap = 3 + opts.meta.cap;
    this.linkRange = 1 + (opts.commander === "architect" ? 1 : 0) + (has("supercond") ? 1 : 0);
    this.lootMul = (1 + opts.meta.loot) * (has("storm") ? 1.25 : 1) * (has("rich") ? 1.25 : 1) * (asc >= 7 ? 0.85 : 1);
    this.etherMul = (1 + opts.meta.ether) * (has("armored") ? 1.2 : 1) * (asc >= 8 ? 0.7 : 1);
    this.hpMul = (has("rich") ? 1.1 : 1) * (has("armored") ? 1.15 : 1) * (has("swarm") ? 0.85 : 1) * (asc >= 2 ? 1.1 : 1);
    this.spdMul = (has("storm") ? 1.15 : 1) * (asc >= 6 ? 1.1 : 1);
    this.fogMul = has("fog") ? 0.85 : 1;
    this.rateAff = has("flare") ? 1.15 : 1;
    this.heatAff = has("flare") ? 1.6 : 1;
    this.costAff = has("supercond") ? 1.8 : 1;
    this.slowAff = has("frost") ? 1.5 : 1;
    this.magmaAff = has("frost") ? 0.8 : 1;
    this.armorAff = has("armored") ? 2 : 0;
    this.skills = opts.skills.map((s) => {
      const def = SKILL_MAP[s.id];
      const cd = def.cd * (1 - 0.06 * (s.level - 1)) * (1 - opts.meta.cdr);
      return { id: s.id, level: s.level, cd: cd * 0.4, maxCd: cd };
    });
    this.genMap();
    this.recomputePaths();
    this.say(`关卡 ${this.cfg.chapter}-${this.cfg.idx + 1}「${this.cfg.name}」 共 ${this.cfg.waves} 波`, "#9be7ff");
  }

  // ===== 地图生成 =====
  private r() {
    return this.rng();
  }
  private genMap() {
    const { terr } = this;
    const cfg = this.cfg;
    const n = cfg.spawns;
    const ys = n === 1 ? [6] : n === 2 ? [3, 9] : [2, 6, 10];
    this.spawns = ys.map((y) => ({ x: 0, y }));
    for (let y = 0; y < ROWS; y++)
      for (let x = 3; x < COLS - 3; x++) if (this.r() < cfg.rock) terr[y * COLS + x] = T_ROCK;
    for (let k = 0; k < 3; k++) {
      const x = 5 + k * 6 + Math.floor(this.r() * 3);
      const y0 = Math.floor(this.r() * (ROWS - 5));
      const len = 3 + Math.floor(this.r() * 3);
      for (let y = y0; y < y0 + len && y < ROWS; y++) terr[y * COLS + x] = T_ROCK;
    }
    // 出生点/核心周围清空
    for (const s of this.spawns) for (let dx = 0; dx < 3; dx++) for (let dy = -1; dy <= 1; dy++) this.clearCell(s.x + dx, s.y + dy);
    for (let dx = -2; dx <= 0; dx++) for (let dy = -1; dy <= 1; dy++) this.clearCell(this.core.x + dx, this.core.y + dy);
    // 保证连通
    let guard = 0;
    while (guard++ < 400) {
      this.fieldInto(this.dist, 0);
      const bad = this.spawns.some((s) => this.dist[s.y * COLS + s.x] >= INF);
      if (!bad) break;
      const rocks: number[] = [];
      for (let i = 0; i < terr.length; i++) if (terr[i] === T_ROCK) rocks.push(i);
      if (!rocks.length) break;
      terr[rocks[Math.floor(this.r() * rocks.length)]] = T_FLOOR;
    }
    const free = () => {
      for (let t = 0; t < 200; t++) {
        const x = 3 + Math.floor(this.r() * (COLS - 6));
        const y = Math.floor(this.r() * ROWS);
        if (terr[y * COLS + x] === T_FLOOR && !this.barrels.some((b) => b.x === x && b.y === y)) return { x, y };
      }
      return null;
    };
    const place = (count: number, t: number) => {
      for (let i = 0; i < count; i++) {
        const c = free();
        if (c) {
          terr[c.y * COLS + c.x] = t;
          if (t === T_ORE) this.oreLeft.set(c.y * COLS + c.x, 220);
        }
      }
    };
    place(cfg.vents, T_VENT);
    place(cfg.mags, T_MAG);
    place(cfg.ores, T_ORE);
    for (let i = 0; i < cfg.barrels; i++) {
      const c = free();
      if (c) this.barrels.push(c);
    }
    if (cfg.portal) {
      for (let t = 0; t < 100; t++) {
        const a = { x: 5 + Math.floor(this.r() * 5), y: Math.floor(this.r() * ROWS) };
        const b = { x: 14 + Math.floor(this.r() * 5), y: Math.floor(this.r() * ROWS) };
        if (terr[a.y * COLS + a.x] === T_FLOOR && terr[b.y * COLS + b.x] === T_FLOOR) {
          terr[a.y * COLS + a.x] = T_PIN;
          terr[b.y * COLS + b.x] = T_POUT;
          this.portalIn = a;
          this.portalOut = b;
          break;
        }
      }
    }
  }
  private clearCell(x: number, y: number) {
    if (x >= 0 && y >= 0 && x < COLS && y < ROWS) this.terr[y * COLS + x] = T_FLOOR;
  }

  // ===== 寻路 =====
  private fieldInto(d: Float32Array, mode: 0 | 1 | 2) {
    d.fill(INF);
    const ci = this.core.y * COLS + this.core.x;
    d[ci] = 0;
    const q: number[] = [ci];
    const inq = new Uint8Array(COLS * ROWS);
    inq[ci] = 1;
    let head = 0;
    const pout = this.portalOut ? this.portalOut.y * COLS + this.portalOut.x : -1;
    const pin = this.portalIn ? this.portalIn.y * COLS + this.portalIn.x : -1;
    while (head < q.length) {
      const u = q[head++];
      inq[u] = 0;
      const ux = u % COLS;
      const uy = (u / COLS) | 0;
      const entry = mode === 2 && this.bmap[u] ? 8 : 1;
      const relax = (p: number) => {
        if (this.terr[p] === T_ROCK) return;
        if (mode === 0 && this.bmap[p]) return;
        const nd = d[u] + entry;
        if (nd < d[p]) {
          d[p] = nd;
          if (!inq[p]) {
            inq[p] = 1;
            q.push(p);
          }
        }
      };
      for (const [dx, dy] of DIRS) {
        const x = ux + dx;
        const y = uy + dy;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        relax(y * COLS + x);
      }
      if (u === pout && pin >= 0) relax(pin);
    }
  }
  recomputePaths() {
    this.fieldInto(this.dist, 0);
    this.fieldInto(this.distF, 1);
    this.fieldInto(this.distB, 2);
    this.pathPreview = this.spawns.map((s) => this.tracePath(s.x, s.y));
    for (const e of this.enemies) e.rem = this.distF[e.cy * COLS + e.cx];
  }
  private tracePath(sx: number, sy: number): [number, number][] {
    const out: [number, number][] = [[sx, sy]];
    let x = sx;
    let y = sy;
    for (let i = 0; i < 400; i++) {
      if (x === this.core.x && y === this.core.y) break;
      if (this.portalIn && x === this.portalIn.x && y === this.portalIn.y && this.portalOut) {
        x = this.portalOut.x;
        y = this.portalOut.y;
        out.push([x, y]);
        continue;
      }
      let best = INF;
      let bx = -1;
      let by = -1;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const v = this.dist[ny * COLS + nx];
        if (v < best) {
          best = v;
          bx = nx;
          by = ny;
        }
      }
      if (bx < 0 || best >= INF) break;
      x = bx;
      y = by;
      out.push([x, y]);
    }
    return out;
  }
  private pathsOkWith(x: number, y: number, b: Building | null): boolean {
    const i = y * COLS + x;
    const prev = this.bmap[i];
    this.bmap[i] = b;
    this.fieldInto(this.dist, 0);
    let ok = this.spawns.every((s) => this.dist[s.y * COLS + s.x] < INF);
    if (ok) {
      for (const e of this.enemies) {
        if (e.def.breaker || e.phaseCh > 0) continue;
        if (this.bmap[e.cy * COLS + e.cx]) continue;
        if (this.dist[e.cy * COLS + e.cx] >= INF) {
          ok = false;
          break;
        }
      }
    }
    this.bmap[i] = prev;
    return ok;
  }

  // ===== 工具 =====
  say(text: string, c = "#e2e8f0") {
    this.msgs.push({ id: this.msgId++, text, c, t: this.time });
    if (this.msgs.length > 6) this.msgs.shift();
    this.version++;
  }
  addFx(f: Fx) {
    if (this.fx.length < 260) this.fx.push(f);
  }
  bAt(x: number, y: number) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return this.bmap[y * COLS + x];
  }
  hasAffix(id: string) {
    return this.opts.affixes.includes(id);
  }
  availableBuilds(): BuildDef[] {
    return Object.values(BUILD_MAP).filter((d) => {
      if (d.legendary) return (this.tokens[d.id] || 0) > 0;
      if (d.id === "wall" && this.commander === "overclocker") return false;
      return d.ch <= this.opts.chapterUnlocked;
    });
  }
  costOf(def: BuildDef): number {
    if ((this.tokens[def.id] || 0) > 0 && def.legendary) return 0;
    let c = def.cost * this.costAff * this.perk.costMul;
    if (this.commander === "architect" && (def.kind === "wall" || def.kind === "conduit")) c *= 0.5;
    if (this.commander === "overclocker" && def.kind === "conduit") c *= 2;
    return Math.max(1, Math.ceil(c));
  }
  upgradeCost(b: Building): number {
    const base = b.def.cost || 60;
    return Math.ceil(base * 0.9 * Math.pow(1.55, b.lvl - 1) * this.perk.costMul);
  }
  maxLvl(b: Building) {
    if (b.def.kind === "drill") return 3;
    return b.def.kind === "source" || b.def.kind === "mod" || b.def.kind === "emit" ? 5 : 1;
  }
  retroCost(b: Building) {
    return Math.ceil((b.retro ? 60 : 90) * this.perk.costMul);
  }
  refundRate() {
    if (this.commander === "salvager") return 1;
    return this.opts.asc >= 10 ? 0.35 : 0.7;
  }

  // ===== 玩家操作 =====
  build(id: string, x: number, y: number): { ok: boolean; msg?: string } {
    if (this.over) return { ok: false };
    const def = BUILD_MAP[id];
    if (!def) return { ok: false };
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return { ok: false };
    const i = y * COLS + x;
    const t = this.terr[i];
    if (t === T_ROCK || t === T_PIN || t === T_POUT) return { ok: false, msg: "此处无法建造" };
    if (this.bmap[i]) return { ok: false, msg: "已被占用" };
    if (x === this.core.x && y === this.core.y) return { ok: false, msg: "核心位置" };
    if (this.spawns.some((s) => s.x === x && s.y === y)) return { ok: false, msg: "裂隙出口" };
    if (this.barrels.some((b) => b.x === x && b.y === y)) return { ok: false, msg: "炸药桶占据(点击引爆)" };
    if (!this.availableBuilds().some((d) => d.id === id)) return { ok: false, msg: "尚未解锁" };
    if (def.kind === "drill" && t !== T_ORE) return { ok: false, msg: "采集器只能建在矿脉上" };
    if (def.kind === "drill" && (this.oreLeft.get(i) || 0) <= 0) return { ok: false, msg: "矿脉已枯竭" };
    const cost = this.costOf(def);
    if (this.scrap < cost) return { ok: false, msg: "废料不足" };
    for (const e of this.enemies) {
      if ((e.cx === x && e.cy === y) || (e.tx === x && e.ty === y) || Math.hypot(e.x - x - 0.5, e.y - y - 0.5) < 0.7)
        return { ok: false, msg: "有敌人在此" };
    }
    const b: Building = {
      id: this.uid++,
      type: id,
      def,
      x,
      y,
      lvl: 1,
      hp: 0,
      maxHp: def.kind === "wall" ? 160 : def.kind === "conduit" ? 100 : 130,
      spent: cost,
      retro: null,
      target: "first",
      cd: 0,
      heat: 0,
      hot: false,
      charge: 0,
      pw: null,
      jammed: false,
      overT: 0,
      overCd: 0,
      beams: [],
      dead: false,
      angle: 0,
      flash: 0.3,
    };
    b.hp = b.maxHp;
    if (!this.pathsOkWith(x, y, b)) return { ok: false, msg: "不能完全堵死路径" };
    if (def.legendary && (this.tokens[id] || 0) > 0) this.tokens[id]--;
    this.scrap -= cost;
    this.bmap[i] = b;
    this.buildings.push(b);
    this.tinker++;
    this.recomputePaths();
    this.powerDirty = true;
    this.version++;
    return { ok: true };
  }
  sell(b: Building) {
    if (this.over || b.dead) return;
    const refund = Math.floor(b.spent * this.refundRate());
    if (b.def.legendary) this.tokens[b.type] = (this.tokens[b.type] || 0) + 1;
    this.scrap += refund;
    this.tinker++;
    this.removeBuilding(b);
    this.addFx({ k: "text", x: b.x + 0.5, y: b.y, t: 0, ttl: 1, c: "#facc15", s: `+${refund}` });
  }
  private removeBuilding(b: Building) {
    b.dead = true;
    this.bmap[b.y * COLS + b.x] = null;
    this.buildings = this.buildings.filter((x) => x !== b);
    this.recomputePaths();
    this.powerDirty = true;
    this.version++;
  }
  destroy(b: Building) {
    this.addFx({ k: "ring", x: b.x + 0.5, y: b.y + 0.5, r: 1, t: 0, ttl: 0.5, c: "#f87171" });
    this.removeBuilding(b);
  }
  upgrade(b: Building) {
    if (this.over || b.lvl >= this.maxLvl(b)) return false;
    const c = this.upgradeCost(b);
    if (this.scrap < c) return false;
    this.scrap -= c;
    b.spent += c;
    b.lvl++;
    b.maxHp += 20;
    b.hp = b.maxHp;
    b.flash = 0.4;
    this.powerDirty = true;
    this.tinker++;
    this.version++;
    return true;
  }
  retrofit(b: Building, rid: string) {
    const r = RETRO_MAP[rid];
    if (!r || b.def.kind !== "emit" || b.type !== r.emit || b.lvl < 3 || b.retro === rid) return false;
    const c = this.retroCost(b);
    if (this.scrap < c) return false;
    this.scrap -= c;
    b.spent += c;
    b.retro = rid;
    b.flash = 0.5;
    this.version++;
    return true;
  }
  repairCost(b: Building) {
    const miss = 1 - b.hp / b.maxHp;
    return Math.max(1, Math.ceil((b.def.cost || 10) * 0.4 * miss));
  }
  repair(b: Building) {
    if (b.hp >= b.maxHp) return;
    const c = this.repairCost(b);
    if (this.scrap < c) return;
    this.scrap -= c;
    b.hp = b.maxHp;
    this.version++;
  }
  cycleTarget(b: Building) {
    const order: Building["target"][] = ["first", "last", "strong", "close"];
    b.target = order[(order.indexOf(b.target) + 1) % order.length];
    this.version++;
  }
  overload(b: Building) {
    if (this.commander !== "overclocker" || b.overCd > 0 || b.def.kind !== "emit") return;
    b.overT = 4;
    b.overCd = 25;
    this.version++;
  }
  detonate(x: number, y: number) {
    const i = this.barrels.findIndex((b) => b.x === x && b.y === y);
    if (i < 0) return false;
    this.barrels.splice(i, 1);
    const cx = x + 0.5;
    const cy = y + 0.5;
    const dmg = 140 + this.wave * 20;
    for (const e of this.enemies.slice()) {
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d <= 2.3) this.hurt(e, dmg * (1 - d / 6), "magma", { pen: 0.5 });
    }
    this.addFx({ k: "ring", x: cx, y: cy, r: 2.3, t: 0, ttl: 0.5, c: "#fb923c" });
    this.addFx({ k: "ring", x: cx, y: cy, r: 1.2, t: 0, ttl: 0.3, c: "#fde047" });
    this.version++;
    return true;
  }
  callWave() {
    if (this.over || this.wave >= this.cfg.waves) return;
    const gain = Math.ceil((Math.max(0, this.nextTimer) / 3) * this.etherMul);
    this.ether += gain;
    this.scrap += 8 + this.wave * 2;
    this.say(`提前开波:以太 +${gain}`, "#c084fc");
    this.startWave();
  }
  toggleBeacon() {
    this.beacon = !this.beacon;
    this.version++;
  }
  openDraft() {
    if (this.draft || this.ether < this.etherCost || this.over) return false;
    this.ether -= this.etherCost;
    this.etherCost += 8;
    const pool: DraftOpt[] = [];
    const legendary = ["prism", "overdrive", "nova", "siphon"];
    for (const id of legendary) pool.push({ kind: "mod", id, name: BUILD_MAP[id].name, desc: "获得1个免费放置权:" + BUILD_MAP[id].desc });
    pool.push(
      { kind: "perk", id: "dmg", name: "全体增伤", desc: "所有炮塔伤害 +12%" },
      { kind: "perk", id: "rate", name: "全体加速", desc: "所有炮塔射速 +10%" },
      { kind: "perk", id: "range", name: "广域雷达", desc: "所有炮塔射程 +0.4" },
      { kind: "perk", id: "loot", name: "回收增幅", desc: "废料掉落 +15%" },
      { kind: "perk", id: "hp", name: "基地加固", desc: "基地生命 +4 并恢复" },
      { kind: "perk", id: "discount", name: "供应链优化", desc: "建造/升级成本 -10%" },
      { kind: "perk", id: "cap", name: "核心超频", desc: "每个能源核心可驱动终端 +1" },
      { kind: "perk", id: "slot", name: "逻辑扩展", desc: "调制器槽位 +1" },
      { kind: "perk", id: "scrap", name: "战略储备", desc: "立即获得 150 废料" }
    );
    const picks: DraftOpt[] = [];
    while (picks.length < 3 && pool.length) {
      const k = Math.floor(this.r() * pool.length);
      picks.push(pool.splice(k, 1)[0]);
    }
    this.draft = picks;
    this.version++;
    return true;
  }
  chooseDraft(i: number) {
    if (!this.draft) return;
    const o = this.draft[i];
    if (!o) return;
    if (o.kind === "mod") this.tokens[o.id] = (this.tokens[o.id] || 0) + 1;
    else {
      const p = this.perk;
      switch (o.id) {
        case "dmg": p.dmg += 0.12; break;
        case "rate": p.rate += 0.1; break;
        case "range": p.range += 0.4; break;
        case "loot": p.loot += 0.15; break;
        case "hp": this.maxLives += 4; this.lives += 4; break;
        case "discount": p.costMul *= 0.9; break;
        case "cap": p.cap += 1; this.powerDirty = true; break;
        case "slot": p.slot += 1; this.powerDirty = true; break;
        case "scrap": this.scrap += 150; break;
      }
    }
    this.say(`获得:${o.name}`, "#c084fc");
    this.draft = null;
    this.version++;
  }
  useSkill(i: number, x?: number, y?: number) {
    const s = this.skills[i];
    if (!s || s.cd > 0 || this.over) return false;
    const def = SKILL_MAP[s.id];
    const lv = 1 + 0.25 * (s.level - 1);
    if (def.target && (x === undefined || y === undefined)) return false;
    switch (s.id) {
      case "orbital": {
        const dmg = (200 + this.wave * 30) * lv;
        for (const e of this.enemies.slice()) {
          const d = Math.hypot(e.x - x!, e.y - y!);
          if (d <= 2.4) this.hurt(e, dmg, "sky" as Elem, { pen: 0.6 });
        }
        this.addFx({ k: "ring", x: x!, y: y!, r: 2.4, t: 0, ttl: 0.7, c: "#fef08a" });
        this.addFx({ k: "ring", x: x!, y: y!, r: 1.2, t: 0, ttl: 0.4, c: "#ffffff" });
        break;
      }
      case "overload":
        this.buffRate = 0.6;
        this.buffT = 8 * lv;
        break;
      case "repair":
        this.lives = Math.min(this.maxLives, this.lives + Math.round(4 * lv));
        for (const b of this.buildings) b.hp = b.maxHp;
        break;
      case "emp":
        this.empT = 4 * lv;
        break;
      case "salvage": {
        const g = Math.round((60 + this.wave * 10) * lv);
        this.scrap += g;
        this.say(`废料空投 +${g}`, "#facc15");
        break;
      }
      case "gravity":
        this.zones.push({ x: x!, y: y!, r: 3, t: 4 * lv });
        break;
    }
    s.cd = s.maxCd;
    this.version++;
    return true;
  }

  // ===== 回路 =====
  private recomputePower() {
    this.powerDirty = false;
    const nodes = this.buildings.filter((b) => b.def.kind !== "wall" && b.def.kind !== "drill" && !b.jammed);
    for (const b of this.buildings) b.pw = null;
    const n = nodes.length;
    const R = this.linkRange;
    const adj: number[][] = nodes.map(() => []);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if ((a.def.kind === "relay" && b.def.kind === "relay") || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= R) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    const pairs: { s: number; e: number; d: number; prev: number[] }[] = [];
    for (let s = 0; s < n; s++) {
      if (nodes[s].def.kind !== "source") continue;
      const d = new Array(n).fill(INF);
      const prev = new Array(n).fill(-1);
      const done = new Array(n).fill(false);
      d[s] = 0;
      for (let it = 0; it < n; it++) {
        let u = -1;
        for (let k = 0; k < n; k++) if (!done[k] && d[k] < INF && (u < 0 || d[k] < d[u])) u = k;
        if (u < 0) break;
        done[u] = true;
        for (const v of adj[u]) {
          const w = nodes[v].def.kind === "mod" ? 0.98 : 1;
          if (d[u] + w < d[v]) {
            d[v] = d[u] + w;
            prev[v] = u;
          }
        }
      }
      for (let e = 0; e < n; e++) if (nodes[e].def.kind === "emit" && d[e] < INF) pairs.push({ s, e, d: d[e], prev });
    }
    pairs.sort((a, b) => a.d - b.d);
    const used = new Array(n).fill(0);
    const assigned = new Array(n).fill(false);
    const cap = this.srcCap + this.perk.cap;
    const slots = this.slots + this.perk.slot;
    for (const p of pairs) {
      if (assigned[p.e] || used[p.s] >= cap) continue;
      assigned[p.e] = true;
      used[p.s]++;
      const path: Building[] = [];
      let c = p.e;
      while (c >= 0) {
        path.push(nodes[c]);
        c = p.prev[c];
      }
      path.reverse();
      const mods = path.filter((b) => b.def.kind === "mod").slice(0, slots);
      nodes[p.e].pw = { src: nodes[p.s], mods, path };
    }
    this.version++;
  }

  stats(b: Building): Stats | null {
    if (b.def.kind !== "emit" || !b.pw) return null;
    const base = EMIT_BASE[b.type];
    const src = b.pw.src;
    const elem = src.def.elem as Elem;
    const L = b.lvl;
    let dmg = base.dmg * (1 + 0.35 * (L - 1)) * (1 + 0.25 * (src.lvl - 1));
    let rate = base.rate * (1 + 0.08 * (L - 1));
    let range = base.range + 0.15 * (L - 1);
    let splash = base.splash;
    let pen = base.pen;
    let shots = base.shots;
    let shotMul = 1;
    let crit = elem === "pulse" ? 0.05 : 0;
    let critMul = 2;
    let echo = 0;
    let cap = false;
    let capMul = 5;
    let exec = 0;
    let pierce = 0;
    let heatMul = 1;
    let cool = 10;
    let nova = false;
    let siphon = false;
    switch (elem) {
      case "pulse": rate *= 1.2; break;
      case "cryo": dmg *= 0.75; cool += 15; break;
      case "magma": dmg *= 1.25 * this.magmaAff; heatMul *= 1.3; splash += base.splash > 0 ? 0.3 : 0.7; break;
      case "sing": dmg *= 0.9; pen += 0.3; break;
    }
    for (const m of b.pw.mods) {
      const s = 1 + 0.3 * (m.lvl - 1);
      switch (m.type) {
        case "amp": dmg *= 1 + 0.4 * s; break;
        case "split": shots += 2; shotMul *= Math.min(0.85, 0.6 + 0.05 * (m.lvl - 1)); break;
        case "crit": crit += 0.25 * s; critMul = 2.5; break;
        case "echo": echo = Math.min(0.75, echo + 0.25 * s); break;
        case "cap": cap = true; capMul = 5 + 0.5 * (m.lvl - 1); break;
        case "exec": exec += 1.0 * s; break;
        case "coolant": heatMul *= 0.5; cool += 18; break;
        case "pierce": pierce += 2; dmg *= 0.9; break;
        case "prism": shots += 4; shotMul *= 0.7; break;
        case "overdrive": rate *= 1.6; break;
        case "nova": nova = true; break;
        case "siphon": siphon = true; dmg *= 1.15; break;
      }
    }
    if (b.retro) {
      const r = RETRO_MAP[b.retro];
      if (r.dmg) dmg *= r.dmg;
      if (r.rate) rate *= r.rate;
      if (r.range) range *= r.range;
      if (r.splash) splash = splash * r.splash;
      if (r.pen) pen += r.pen;
      if (r.pierce) pierce += r.pierce;
      if (r.crit) crit += r.crit;
      if (r.shots) shots += r.shots;
    }
    const tile = this.terr[b.y * COLS + b.x];
    let chain = 0;
    if (tile === T_VENT) {
      rate *= 1.4;
      heatMul *= 2;
    }
    if (tile === T_MAG) chain = 2;
    const gdmg = 1 + this.opts.meta.dmg + this.perk.dmg + this.tinkerBonus;
    dmg *= gdmg;
    rate *= (1 + this.perk.rate) * this.rateAff * (this.commander === "overclocker" ? 1.08 : 1);
    if (this.buffT > 0) rate *= 1 + this.buffRate;
    if (b.overT > 0) rate *= 1.9;
    range = (range + this.perk.range) * this.fogMul;
    heatMul *= this.heatAff;
    crit = Math.min(0.95, crit);
    const dps = dmg * shotMul * shots * rate * (1 + crit * (critMul - 1)) * (1 + echo * 0.75);
    return { elem, dmg, rate, range, splash, pen: Math.min(0.9, pen), shots, shotMul, crit, critMul, echo, cap, capMul, exec, pierce, heatMul, cool, chain, nova, siphon, dps };
  }
  heatScale(b: Building) {
    return this.cfg.heat || this.terr[b.y * COLS + b.x] === T_VENT ? 1 : 0;
  }

  // ===== 伤害 =====
  hurt(e: Enemy, dmg: number, elem: string, o: { pen?: number; exec?: number; armorK?: number; src?: Building } = {}) {
    if (e.dead) return 0;
    if (e.immune && e.immune === elem) {
      if (Math.random() < 0.05) this.addFx({ k: "text", x: e.x, y: e.y - 0.4, t: 0, ttl: 0.6, c: "#94a3b8", s: "免疫" });
      return 0;
    }
    let d = dmg;
    if (o.exec && e.hp / e.maxHp < 0.35) d *= 1 + o.exec;
    if (e.adaptive) {
      let tot = 0;
      for (const k in e.mem) tot += e.mem[k];
      const share = tot > 30 ? (e.mem[elem] || 0) / tot : 0;
      const resist = share > 0.55 ? Math.min(0.8, (share - 0.55) * 2.2) : 0;
      e.res = resist;
      d *= 1 - resist;
      e.mem[elem] = (e.mem[elem] || 0) + dmg;
    }
    const armor = Math.max(0, e.armor - e.shred) * (o.armorK ?? 1) * (1 - (o.pen || 0));
    d = Math.max(d * 0.25, d - armor);
    e.hp -= d;
    e.flash = 0.08;
    if (e.def.boss) e.phaseDmg[elem] = (e.phaseDmg[elem] || 0) + d;
    if (o.src) this.dmgSource[o.src.type] = (this.dmgSource[o.src.type] || 0) + d;
    if (e.hp <= 0) {
      this.kill(e, o.src);
    } else if (e.def.boss && e.hp / e.maxHp <= e.nextPhase) {
      this.bossPhase(e);
    }
    return d;
  }
  private bossPhase(e: Enemy) {
    e.nextPhase -= 0.25;
    this.say(`${e.def.name} 进入新阶段!`, "#f472b6");
    this.addFx({ k: "ring", x: e.x, y: e.y, r: 2.5, t: 0, ttl: 0.8, c: "#f472b6" });
    const id = e.def.id;
    if (id === "boss4") {
      let best = "";
      let bv = 0;
      for (const k in e.phaseDmg) if (e.phaseDmg[k] > bv && k !== "sky") {
        bv = e.phaseDmg[k];
        best = k;
      }
      e.phaseDmg = {};
      e.immune = best || null;
      if (best) this.say(`核心矩阵对「${ELEM_NAMES[best] || best}」免疫!`, "#f472b6");
    }
    const escort = id === "boss1" ? "runner" : id === "boss2" ? "splitter" : id === "boss3" ? "tank" : ["phaser", "jammer", "siege"][Math.floor(Math.random() * 3)];
    const cnt = id === "boss1" ? 6 : 3;
    for (let k = 0; k < cnt; k++) this.spawnEnemy(escort, e.scale * 0.8, e.x, e.y, { cx: e.cx, cy: e.cy });
  }
  private kill(e: Enemy, src?: Building) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    let gain = e.reward * this.lootMul * (1 + this.perk.loot);
    if (src && src.pw && src.pw.mods.some((m) => m.type === "siphon")) gain += 3;
    this.scrap += gain;
    this.addFx({ k: "text", x: e.x, y: e.y - 0.3, t: 0, ttl: 0.7, c: "#facc15", s: `+${Math.round(gain)}` });
    this.addFx({ k: "spark", x: e.x, y: e.y, t: 0, ttl: 0.3, c: e.def.color, r: e.def.r + 0.3 });
    if (e.elite) this.ether += Math.ceil(3 * this.etherMul);
    if (e.def.boss) {
      this.bossKills++;
      this.ether += Math.ceil(15 * this.etherMul);
    }
    if (e.def.split) {
      const t = e.def.id === "boss2" ? "splitter" : "mini";
      for (let k = 0; k < e.def.split; k++) this.spawnEnemy(t, e.scale * (t === "mini" ? 0.7 : 0.6), e.x + (Math.random() - 0.5) * 0.4, e.y + (Math.random() - 0.5) * 0.4, { cx: e.cx, cy: e.cy });
    }
  }
  spawnEnemy(type: string, scale: number, x: number, y: number, o: { cx?: number; cy?: number; elite?: boolean; speedMul?: number } = {}) {
    const def = ENEMIES[type];
    const elite = !!o.elite;
    const scaleRew = (1 + 0.04 * this.wave) * (1 + 0.05 * this.cfg.id);
    const hp = def.hp * scale * (elite ? 3 : 1);
    const cx = o.cx ?? Math.floor(x);
    const cy = o.cy ?? Math.floor(y);
    const e: Enemy = {
      id: this.uid++,
      def,
      x,
      y,
      vx: 1,
      vy: 0,
      cx,
      cy,
      tx: -1,
      ty: -1,
      hp,
      maxHp: hp,
      armor: def.armor + this.armorAff + (elite ? 2 : 0),
      shred: 0,
      spd: def.spd * this.spdMul * (o.speedMul || 1),
      scale,
      rem: this.distF[cy * COLS + cx],
      elite,
      slow: 0,
      slowT: 0,
      burn: 0,
      burnT: 0,
      phaseCh: def.phase || 0,
      atk: null,
      dead: false,
      mem: {},
      adaptive: elite || !!def.boss,
      immune: null,
      phaseDmg: {},
      nextPhase: 0.75,
      flash: 0,
      reward: def.reward * scaleRew * (elite ? 4 : 1),
      res: 0,
      gravT: 0,
    };
    this.enemies.push(e);
    return e;
  }

  // ===== 波次 =====
  hpScale(w: number) {
    const g = this.cfg.id;
    return (1 + 0.1 * g) * Math.pow(1 + 0.15 * (w - 1), 1.1) * this.hpMul;
  }
  composeWave(w: number): QItem[] {
    const cfg = this.cfg;
    const out: QItem[] = [];
    const swarm = this.hasAffix("swarm") ? 1.3 : 1;
    const budget = (55 + 20 * w) * swarm;
    const unlockW: Record<string, number> = { grunt: 1, runner: 2, tank: 4, phaser: 3, splitter: 5, jammer: 4, siege: 7 };
    const avail = cfg.pool.filter((t) => (unlockW[t] || 1) <= w);
    const groups = w < 3 ? 1 : w < 8 ? 2 : 3;
    const weights: Record<string, number> = { grunt: 3, runner: 2, tank: 2, phaser: 2, splitter: 1.5, jammer: 1, siege: 0.7 };
    let delay = 0;
    const last = w === cfg.waves;
    for (let g = 0; g < groups; g++) {
      let tot = 0;
      for (const t of avail) tot += weights[t];
      let pick = this.r() * tot;
      let type = avail[0];
      for (const t of avail) {
        pick -= weights[t];
        if (pick <= 0) {
          type = t;
          break;
        }
      }
      const def = ENEMIES[type];
      const n = Math.max(1, Math.round(budget / groups / def.cost));
      const interval = Math.min(1.2, 0.3 + def.cost * 0.025);
      const sp = Math.floor(this.r() * this.spawns.length);
      for (let k = 0; k < n; k++) out.push({ at: delay + k * interval, type, elite: false, sp: this.spawns.length > 1 && k % 2 ? (sp + 1) % this.spawns.length : sp });
      delay += n * interval * 0.5 + 2;
    }
    const eliteWave = w % 5 === 0 || (last && !cfg.boss) || (this.opts.asc >= 9 && w % 3 === 0);
    if (eliteWave) {
      const heavy = avail.filter((t) => ["tank", "siege", "splitter", "phaser", "jammer"].includes(t));
      const type = heavy.length ? heavy[Math.floor(this.r() * heavy.length)] : "tank";
      out.push({ at: 3, type, elite: true, sp: 0 });
    }
    if (last && cfg.boss) {
      out.push({ at: 4, type: "boss" + cfg.chapter, elite: false, sp: Math.floor(this.spawns.length / 2) });
      if (this.opts.asc >= 4) {
        out.push({ at: 6, type: "tank", elite: true, sp: 0 });
        out.push({ at: 8, type: avail.includes("siege") ? "siege" : "tank", elite: true, sp: this.spawns.length - 1 });
      }
    }
    return out;
  }
  startWave() {
    this.wave++;
    const w = this.wave;
    this.nextTimer = 26;
    this.tinkerBonus = this.commander === "salvager" ? Math.min(0.4, 0.04 * this.tinker) : 0;
    this.tinker = 0;
    this.scrap += 10 + 2 * w;
    this.beaconActive = this.beacon;
    if (this.beacon) {
      const g = Math.ceil((4 + w * 0.5) * this.etherMul);
      this.ether += g;
      this.say(`熵增信标:敌人强化,以太 +${g}`, "#e879f9");
      this.beacon = false;
    }
    for (const q of this.composeWave(w)) this.queue.push({ ...q, at: this.time + q.at });
    this.queue.sort((a, b) => a.at - b.at);
    if (this.hasAffix("acid") && w > 1) {
      for (const b of this.buildings.slice()) {
        if (b.def.kind === "wall" || b.def.kind === "conduit") {
          b.hp -= b.maxHp * 0.3;
          if (b.hp <= 0) this.destroy(b);
        }
      }
      this.say("强酸侵蚀了墙体与导管", "#a3e635");
    }
    if (this.cfg.collapse && w % 3 === 0) this.collapse();
    const bossWave = this.cfg.boss && w === this.cfg.waves;
    this.say(bossWave ? `第 ${w} 波 — BOSS 来袭!` : `第 ${w} / ${this.cfg.waves} 波`, bossWave ? "#f472b6" : "#e2e8f0");
    this.version++;
  }
  private collapse() {
    let n = 0;
    for (let t = 0; t < 60 && n < 5; t++) {
      const x = 4 + Math.floor(Math.random() * (COLS - 8));
      const edge = Math.random() < 0.5;
      const y = edge ? (Math.random() < 0.5 ? Math.floor(Math.random() * 2) : ROWS - 1 - Math.floor(Math.random() * 2)) : Math.floor(Math.random() * ROWS);
      const i = y * COLS + x;
      if (this.terr[i] !== T_FLOOR || this.bmap[i] || this.barrels.some((b) => b.x === x && b.y === y)) continue;
      if (this.enemies.some((e) => Math.hypot(e.x - x - 0.5, e.y - y - 0.5) < 1.6 || (e.tx === x && e.ty === y))) continue;
      this.terr[i] = T_ROCK;
      this.fieldInto(this.dist, 0);
      const ok = this.spawns.every((s) => this.dist[s.y * COLS + s.x] < INF) && this.enemies.every((e) => e.def.breaker || e.phaseCh > 0 || this.bmap[e.cy * COLS + e.cx] || this.dist[e.cy * COLS + e.cx] < INF);
      if (!ok) this.terr[i] = T_FLOOR;
      else {
        n++;
        this.addFx({ k: "ring", x: x + 0.5, y: y + 0.5, r: 1, t: 0, ttl: 0.6, c: "#a78bfa" });
      }
    }
    this.recomputePaths();
    if (n) this.say(`地形坍缩:${n} 块地面塌陷,迷宫被改写`, "#a78bfa");
  }

  // ===== 主循环 =====
  update(dt: number) {
    if (this.over || this.draft) return;
    this.time += dt;
    if (this.powerDirty) this.recomputePower();
    // 技能/增益
    for (const s of this.skills) if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
    if (this.buffT > 0) this.buffT -= dt;
    if (this.empT > 0) this.empT -= dt;
    for (const z of this.zones) z.t -= dt;
    this.zones = this.zones.filter((z) => z.t > 0);
    // 波次
    if (this.wave < this.cfg.waves) {
      this.nextTimer -= dt;
      if (this.nextTimer <= 0) this.startWave();
    }
    while (this.queue.length && this.queue[0].at <= this.time) {
      const q = this.queue.shift()!;
      const sp = this.spawns[q.sp % this.spawns.length];
      const def = ENEMIES[q.type];
      const w = this.wave;
      let scale = this.hpScale(w);
      if (def.boss) scale = (1 + 0.1 * this.cfg.id) * Math.pow(1 + 0.15 * (this.cfg.waves - 1), 0.8) * this.hpMul;
      if (this.beaconActive) scale *= 1.35;
      this.spawnEnemy(q.type, scale, sp.x + 0.5, sp.y + 0.5, { cx: sp.x, cy: sp.y, elite: q.elite, speedMul: this.beaconActive ? 1.1 : 1 });
    }
    // 敌人
    this.updateEnemies(dt);
    // 干扰
    this.jamTimer -= dt;
    if (this.jamTimer <= 0) {
      this.jamTimer = 0.4;
      let changed = false;
      const jammers = this.enemies.filter((e) => e.def.jam);
      for (const b of this.buildings) {
        const j = jammers.some((e) => Math.hypot(e.x - b.x - 0.5, e.y - b.y - 0.5) <= (e.def.jam as number));
        if (j !== b.jammed) {
          b.jammed = j;
          changed = true;
        }
      }
      if (changed) this.powerDirty = true;
    }
    for (const b of this.buildings) this.updateBuilding(b, dt);
    this.updateProjs(dt);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.ttl);
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.lives <= 0) {
      this.over = "lost";
      this.version++;
    } else if (this.wave >= this.cfg.waves && !this.queue.length && !this.enemies.length) {
      this.over = "won";
      this.version++;
    }
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.slow = 0;
      }
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.hurt(e, e.burn * dt, "magma", { armorK: 0 });
        if (e.dead) continue;
      }
      if (e.adaptive) for (const k in e.mem) e.mem[k] *= 1 - 0.1 * dt;
      if (e.adaptive && Object.keys(e.mem).length === 0) e.res = 0;
      for (const z of this.zones) {
        const d = Math.hypot(z.x - e.x, z.y - e.y);
        if (d < z.r) {
          e.slow = Math.max(e.slow, 0.7);
          e.slowT = Math.max(e.slowT, 0.3);
          if (!e.def.boss) this.nudge(e, e.x + ((z.x - e.x) / (d + 0.01)) * 1.5 * dt, e.y + ((z.y - e.y) / (d + 0.01)) * 1.5 * dt);
        }
      }
      this.moveEnemy(e, dt);
    }
  }
  nudge(e: Enemy, nx: number, ny: number) {
    const cx = Math.floor(nx);
    const cy = Math.floor(ny);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
    if ((cx === e.cx && cy === e.cy) || (cx === e.tx && cy === e.ty)) {
      if (this.terr[cy * COLS + cx] !== T_ROCK) {
        e.x = nx;
        e.y = ny;
      }
    }
  }
  private moveEnemy(e: Enemy, dt: number) {
    if (e.atk) {
      const b = e.atk;
      if (b.dead) e.atk = null;
      else {
        b.hp -= (e.def.breaker || 0) * (e.elite ? 1.3 : 1) * dt;
        b.flash = 0.1;
        if (b.hp <= 0) this.destroy(b);
        return;
      }
    }
    const slow = Math.min(0.9, e.slow + (this.empT > 0 ? 0.8 : 0));
    let rem = e.spd * (1 - slow) * dt;
    if (e.tx >= 0 && this.bmap[e.ty * COLS + e.tx] && !e.def.breaker && e.phaseCh <= 0) e.tx = -1;
    for (let g = 0; g < 4 && rem > 0; g++) {
      if (e.tx < 0) {
        this.pickNext(e);
        if (e.atk || e.tx < 0) return;
      }
      const px = e.tx + 0.5;
      const py = e.ty + 0.5;
      const dx = px - e.x;
      const dy = py - e.y;
      const d = Math.hypot(dx, dy);
      if (d <= rem) {
        e.x = px;
        e.y = py;
        rem -= d;
        e.cx = e.tx;
        e.cy = e.ty;
        e.tx = -1;
        e.rem = this.distF[e.cy * COLS + e.cx];
        if (this.arrive(e)) return;
      } else {
        e.x += (dx / d) * rem;
        e.y += (dy / d) * rem;
        e.vx = dx / d;
        e.vy = dy / d;
        rem = 0;
      }
    }
  }
  private arrive(e: Enemy): boolean {
    if (e.cx === this.core.x && e.cy === this.core.y) {
      const loss = e.def.leak * (e.elite ? 2 : 1);
      this.lives -= loss;
      this.lostLives += loss;
      e.dead = true;
      this.addFx({ k: "ring", x: this.core.x + 0.5, y: this.core.y + 0.5, r: 1.5, t: 0, ttl: 0.5, c: "#ef4444" });
      this.version++;
      return true;
    }
    if (this.portalIn && this.portalOut && e.cx === this.portalIn.x && e.cy === this.portalIn.y) {
      this.addFx({ k: "ring", x: e.x, y: e.y, r: 0.8, t: 0, ttl: 0.3, c: "#c084fc" });
      e.cx = this.portalOut.x;
      e.cy = this.portalOut.y;
      e.x = e.cx + 0.5;
      e.y = e.cy + 0.5;
      e.rem = this.distF[e.cy * COLS + e.cx];
      this.addFx({ k: "ring", x: e.x, y: e.y, r: 0.8, t: 0, ttl: 0.3, c: "#c084fc" });
    }
    return false;
  }
  private pickNext(e: Enemy) {
    let mode: 0 | 1 | 2 = e.def.breaker ? 2 : e.phaseCh > 0 ? 1 : 0;
    let fallback = false;
    const run = (m: 0 | 1 | 2) => {
      const field = m === 0 ? this.dist : m === 1 ? this.distF : this.distB;
      let best = -1;
      let bs = INF;
      for (const [dx, dy] of DIRS) {
        const nx = e.cx + dx;
        const ny = e.cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const ni = ny * COLS + nx;
        if (this.terr[ni] === T_ROCK) continue;
        const bld = this.bmap[ni];
        if (m === 0 && bld) continue;
        const sc = field[ni] + (m === 2 && bld ? 8 : 0);
        if (sc < bs) {
          bs = sc;
          best = ni;
        }
      }
      return best;
    };
    let best = run(mode);
    if (best < 0 && mode === 0) {
      mode = 1;
      fallback = true;
      best = run(1);
    }
    if (best < 0) return;
    const bx = best % COLS;
    const by = (best / COLS) | 0;
    const bld = this.bmap[best];
    if (mode === 1 && bld && !fallback) e.phaseCh--;
    if (mode === 2 && bld) {
      e.atk = bld;
      return;
    }
    e.tx = bx;
    e.ty = by;
  }

  // ===== 炮塔 =====
  private findTargets(b: Building, st: Stats, n: number): Enemy[] {
    const cx = b.x + 0.5;
    const cy = b.y + 0.5;
    const list: { e: Enemy; k: number }[] = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d > st.range) continue;
      const k = b.target === "first" ? e.rem : b.target === "last" ? -e.rem : b.target === "strong" ? -e.hp : d;
      list.push({ e, k });
    }
    list.sort((a, c) => a.k - c.k);
    return list.slice(0, n).map((x) => x.e);
  }
  private updateBuilding(b: Building, dt: number) {
    if (b.flash > 0) b.flash -= dt;
    if (b.overCd > 0) b.overCd -= dt;
    if (b.overT > 0) b.overT -= dt;
    if (b.def.kind === "drill") {
      const i = b.y * COLS + b.x;
      const left = this.oreLeft.get(i) || 0;
      if (left > 0) {
        const m = Math.min(left, 2.2 * (1 + 0.5 * (b.lvl - 1)) * dt);
        this.oreLeft.set(i, left - m);
        this.scrap += m;
      }
      return;
    }
    if (b.def.kind !== "emit") return;
    if (b.beams.length) b.beams = [];
    const st = this.stats(b);
    if (!st || b.jammed) {
      b.heat = Math.max(0, b.heat - 12 * dt);
      if (b.hot && b.heat < 35) b.hot = false;
      return;
    }
    const hs = this.heatScale(b);
    // 自动过载(超频者)
    if (this.commander === "overclocker" && b.overCd <= 0 && b.overT <= 0 && this.enemies.length && Math.random() < 0.02) this.overload(b);
    if (b.hot) {
      b.heat -= (st.cool + 8) * dt;
      if (b.heat < 35) b.hot = false;
      return;
    }
    let firing = false;
    if (st.cap) b.charge = Math.min(5, b.charge + dt);
    const base = EMIT_BASE[b.type];
    if (base.beam) {
      const tg = this.findTargets(b, st, st.shots);
      if (tg.length) {
        firing = true;
        const mul = st.shotMul * (st.shots > 1 ? 1 : 1) * (1 + st.crit * (st.critMul - 1)) * (1 + st.echo * 0.75) * st.rate;
        const burst = st.cap && b.charge >= 5;
        if (burst) b.charge = 0;
        for (const t of tg) {
          b.beams.push({ x: t.x, y: t.y });
          const dps = st.dmg * mul;
          this.hurt(t, dps * dt, st.elem, { pen: st.pen, exec: st.exec, armorK: 3 * dt, src: b });
          if (burst) {
            this.hurt(t, st.dmg * st.capMul * 0.8, st.elem, { pen: st.pen, exec: st.exec, src: b });
            this.addFx({ k: "ring", x: t.x, y: t.y, r: 0.9, t: 0, ttl: 0.3, c: "#ffffff" });
          }
          this.applyElem(t, st, dps * dt * 4, dt);
        }
        b.angle = Math.atan2(tg[0].y - b.y - 0.5, tg[0].x - b.x - 0.5);
        b.heat += base.heat * st.heatMul * hs * dt;
      }
    } else {
      b.cd -= dt;
      if (b.cd <= 0) {
        const tg = this.findTargets(b, st, st.shots);
        if (tg.length) {
          firing = true;
          const burst = st.cap && b.charge >= 5;
          if (burst) b.charge = 0;
          this.volley(b, st, tg, burst ? st.capMul : 1);
          if (Math.random() < st.echo) this.volley(b, st, tg, 0.75 * (burst ? 1 : 1));
          b.cd += 1 / st.rate;
          if (b.cd < -0.1) b.cd = 0;
          b.heat += base.heat * st.heatMul * hs;
        } else b.cd = 0;
      }
    }
    if (!firing) b.heat = Math.max(0, b.heat - (st.cool + 2) * dt);
    else b.heat = Math.max(0, b.heat - st.cool * 0.3 * dt);
    if (b.heat >= 100) {
      b.heat = 100;
      b.hot = true;
      this.addFx({ k: "text", x: b.x + 0.5, y: b.y, t: 0, ttl: 0.8, c: "#f87171", s: "过热!" });
    }
  }
  private volley(b: Building, st: Stats, tg: Enemy[], mult: number) {
    const base = EMIT_BASE[b.type];
    const color = ELEM_COLOR[st.elem];
    b.angle = Math.atan2(tg[0].y - b.y - 0.5, tg[0].x - b.x - 0.5);
    for (let i = 0; i < st.shots; i++) {
      const t = tg[i % tg.length];
      let dmg = st.dmg * st.shotMul * mult;
      const crit = Math.random() < st.crit;
      if (crit) dmg *= st.critMul;
      let ox = b.x + 0.5;
      let oy = b.y + 0.5;
      if (b.type === "drone") {
        const a = this.time * 2.2 + (i * Math.PI * 2) / Math.max(2, st.shots);
        ox += Math.cos(a) * 0.55;
        oy += Math.sin(a) * 0.55;
      }
      const shell = b.type === "mortar";
      let tx = t.x;
      let ty = t.y;
      if (shell) {
        const dd = Math.hypot(t.x - ox, t.y - oy);
        const ft = dd / base.speed;
        tx += t.vx * t.spd * (1 - t.slow) * ft * 0.9 + (i > 0 ? (Math.random() - 0.5) * 1.4 : 0);
        ty += t.vy * t.spd * (1 - t.slow) * ft * 0.9 + (i > 0 ? (Math.random() - 0.5) * 1.4 : 0);
      }
      this.projs.push({
        x: ox,
        y: oy,
        tx,
        ty,
        target: shell ? null : t,
        speed: base.speed,
        dmg,
        elem: st.elem,
        splash: st.splash,
        pierce: st.pierce,
        hit: new Set(),
        chain: st.chain,
        pen: st.pen,
        exec: st.exec,
        nova: st.nova,
        siphon: st.siphon,
        shell,
        crit,
        src: b,
        life: 3,
        color,
      });
    }
  }
  private applyElem(e: Enemy, st: { elem: Elem }, dmg: number, scale = 1) {
    switch (st.elem) {
      case "cryo":
        e.slow = Math.max(e.slow, 0.35 * this.slowAff * (e.def.boss ? 0.5 : 1));
        e.slowT = Math.max(e.slowT, 2);
        break;
      case "magma":
        e.burn = Math.max(e.burn, (dmg * 0.33) / (scale < 0.5 ? scale * 4 : 1));
        e.burnT = 3;
        break;
      case "sing":
        e.slow = Math.max(e.slow, 0.25 * (e.def.boss ? 0.5 : 1));
        e.slowT = Math.max(e.slowT, 1.2);
        e.shred = Math.min(4, e.shred + 0.3 * (scale < 0.5 ? scale * 4 : 1));
        break;
    }
  }
  private explode(x: number, y: number, r: number, dmg: number, p: { elem: Elem; pen: number; exec: number; src: Building }, skip?: Enemy) {
    for (const e of this.enemies) {
      if (e.dead || e === skip) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= r + e.def.r) {
        this.hurt(e, dmg * (1 - 0.45 * (d / (r + 0.01))), p.elem, { pen: p.pen, exec: p.exec, src: p.src });
        this.applyElem(e, p, dmg);
        if (p.elem === "sing" && !e.def.boss) this.nudge(e, e.x + (x - e.x) * 0.3, e.y + (y - e.y) * 0.3);
      }
    }
    this.addFx({ k: "ring", x, y, r, t: 0, ttl: 0.3, c: ELEM_COLOR[p.elem] || "#fff" });
  }
  private hitProj(p: Proj, e: Enemy) {
    this.hurt(e, p.dmg, p.elem, { pen: p.pen, exec: p.exec, src: p.src });
    this.applyElem(e, p, p.dmg);
    if (p.splash > 0 && !p.shell) this.explode(e.x, e.y, p.splash, p.dmg * 0.5, p, e);
    if (p.nova && Math.random() < 0.3) this.explode(e.x, e.y, 1.3, p.dmg * 0.4, p, e);
    if (p.elem === "sing" && !e.def.boss) {
      for (const o of this.enemies) {
        if (o === e || o.dead || o.def.boss) continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) < 1.6) this.nudge(o, o.x + (e.x - o.x) * 0.35, o.y + (e.y - o.y) * 0.35);
      }
    }
    if (p.chain > 0) {
      const near = this.enemies.filter((o) => o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 2.6).sort((a, c) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(c.x - e.x, c.y - e.y));
      for (const o of near.slice(0, p.chain)) {
        this.hurt(o, p.dmg * 0.5, p.elem, { pen: p.pen, src: p.src });
        this.addFx({ k: "line", x: e.x, y: e.y, x2: o.x, y2: o.y, t: 0, ttl: 0.18, c: "#fef08a" });
      }
    }
    this.addFx({ k: "spark", x: e.x, y: e.y, t: 0, ttl: 0.15, c: p.crit ? "#ffffff" : p.color, r: p.crit ? 0.35 : 0.2 });
  }
  private updateProjs(dt: number) {
    for (const p of this.projs) {
      p.life -= dt;
      if (p.shell) {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const d = Math.hypot(dx, dy);
        const step = p.speed * dt;
        if (d <= step) {
          this.explode(p.tx, p.ty, p.splash, p.dmg, p);
          p.life = -1;
        } else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
        continue;
      }
      if (p.target && p.target.dead) p.target = null;
      if (p.target) {
        p.tx = p.target.x;
        p.ty = p.target.y;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      const tr = p.target ? p.target.def.r + 0.08 : 0.1;
      if (d <= Math.max(step, tr)) {
        if (p.target) {
          const e = p.target;
          p.hit.add(e.id);
          this.hitProj(p, e);
          if (p.pierce > 0) {
            p.pierce--;
            let best: Enemy | null = null;
            let bd = 3;
            for (const o of this.enemies) {
              if (o.dead || p.hit.has(o.id)) continue;
              const dd = Math.hypot(o.x - p.x, o.y - p.y);
              if (dd < bd) {
                bd = dd;
                best = o;
              }
            }
            p.target = best;
            if (!best) p.life = -1;
            p.dmg *= 0.85;
          } else p.life = -1;
        } else p.life = -1;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    this.projs = this.projs.filter((p) => p.life > 0);
  }

  // ===== 结算 =====
  stars() {
    if (this.over !== "won") return 0;
    if (this.lostLives === 0) return 3;
    return this.lostLives <= this.maxLives * 0.25 ? 2 : 1;
  }
  shardReward() {
    const won = this.over === "won";
    const asc = 1 + 0.25 * this.opts.asc;
    if (!won) return Math.round(this.wave * 1.2 * asc);
    return Math.round((12 + this.cfg.id * 3 + this.stars() * 8 + (this.cfg.boss ? 40 : 0)) * asc);
  }
}

export const ELEM_NAMES: Record<string, string> = { pulse: "高频脉冲", cryo: "液氮冷冻", magma: "高爆熔岩", sing: "引力奇点", sky: "轨道" };
