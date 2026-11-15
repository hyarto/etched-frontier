// ===== 《蚀刻防线》静态数据 =====

export type Elem = "pulse" | "cryo" | "magma" | "sing";
export type Kind = "wall" | "conduit" | "relay" | "source" | "mod" | "emit" | "drill";

export interface BuildDef {
  id: string;
  kind: Kind;
  name: string;
  short: string;
  desc: string;
  cost: number;
  color: string;
  ch: number; // 需要解锁的章节
  elem?: Elem;
  legendary?: boolean; // 仅能通过以太抽取获得
}

export const ELEM_COLOR: Record<Elem, string> = {
  pulse: "#ffd84a",
  cryo: "#5ad8ff",
  magma: "#ff6a3a",
  sing: "#c27bff",
};
export const ELEM_NAME: Record<Elem, string> = {
  pulse: "高频脉冲",
  cryo: "液氮冷冻",
  magma: "高爆熔岩",
  sing: "引力奇点",
};

export const BUILDS: BuildDef[] = [
  { id: "wall", kind: "wall", name: "阻挡墙", short: "墙", desc: "廉价阻挡物,用来塑造迷宫。不导能。", cost: 4, color: "#7a8599", ch: 1 },
  { id: "conduit", kind: "conduit", name: "能量导管", short: "导", desc: "既是墙体也能传导能量,连接回路。", cost: 7, color: "#3fd0c0", ch: 1 },
  { id: "relay", kind: "relay", name: "跨区中继器", short: "继", desc: "全图所有中继器彼此直连,实现跨区供电。", cost: 45, color: "#8fb4ff", ch: 3 },
  { id: "drill", kind: "drill", name: "矿脉采集器", short: "矿", desc: "只能建在矿脉上,产出废料,矿脉会枯竭。", cost: 55, color: "#d9a441", ch: 1 },
  // 能源核心
  { id: "pulse", kind: "source", elem: "pulse", name: "脉冲核心", short: "脉", desc: "均衡基础。射速+20%。可暴击。", cost: 40, color: ELEM_COLOR.pulse, ch: 1 },
  { id: "cryo", kind: "source", elem: "cryo", name: "液氮核心", short: "冰", desc: "命中减速并为回路降温。伤害-25%。", cost: 45, color: ELEM_COLOR.cryo, ch: 1 },
  { id: "magma", kind: "source", elem: "magma", name: "熔岩核心", short: "岩", desc: "高伤害+灼烧+溅射。过热更快。", cost: 55, color: ELEM_COLOR.magma, ch: 1 },
  { id: "sing", kind: "source", elem: "sing", name: "奇点核心", short: "奇", desc: "命中牵引周围敌人并减速,削弱护甲。", cost: 85, color: ELEM_COLOR.sing, ch: 2 },
  // 逻辑调制器
  { id: "amp", kind: "mod", name: "增伤调制器", short: "增", desc: "回路伤害 +40%。", cost: 35, color: "#ff9d5c", ch: 1 },
  { id: "split", kind: "mod", name: "一分三散射器", short: "散", desc: "每次射击变3发,单发伤害×0.6。", cost: 50, color: "#6ee7a7", ch: 1 },
  { id: "crit", kind: "mod", name: "暴击增幅器", short: "暴", desc: "暴击率+25%,暴击伤害×2.5。", cost: 45, color: "#ff5c8a", ch: 2 },
  { id: "echo", kind: "mod", name: "回流逻辑门", short: "回", desc: "25%概率能量回流,额外再发射一轮。", cost: 55, color: "#7de3ff", ch: 2 },
  { id: "cap", kind: "mod", name: "蓄力电容器", short: "容", desc: "每5秒蓄力一次,下一击伤害×5。", cost: 60, color: "#ffe066", ch: 2 },
  { id: "exec", kind: "mod", name: "斩杀调制器", short: "斩", desc: "对生命<35%的敌人伤害 +100%。", cost: 55, color: "#ff3b3b", ch: 3 },
  { id: "coolant", kind: "mod", name: "冷却调制器", short: "冷", desc: "热量积累-50%,额外散热。", cost: 35, color: "#9be7ff", ch: 3 },
  { id: "pierce", kind: "mod", name: "贯穿调制器", short: "贯", desc: "弹体贯穿+2个目标,伤害×0.9。", cost: 50, color: "#c0ff6e", ch: 4 },
  // 传奇调制器(以太抽取)
  { id: "prism", kind: "mod", legendary: true, name: "★棱镜阵列", short: "棱", desc: "额外+4发弹体,单发×0.7。", cost: 0, color: "#ffffff", ch: 1 },
  { id: "overdrive", kind: "mod", legendary: true, name: "★超载核芯", short: "载", desc: "射速 +60%。", cost: 0, color: "#ff8a00", ch: 1 },
  { id: "nova", kind: "mod", legendary: true, name: "★新星触发器", short: "新", desc: "命中时有概率引发40%伤害范围爆炸。", cost: 0, color: "#ff7bd5", ch: 1 },
  { id: "siphon", kind: "mod", legendary: true, name: "★虹吸回路", short: "虹", desc: "该回路击杀额外 +3 废料,伤害 +15%。", cost: 0, color: "#7dff9b", ch: 1 },
  // 终端炮塔
  { id: "gun", kind: "emit", name: "脉冲机枪", short: "枪", desc: "高射速近程单体,擅长清杂兵。", cost: 45, color: "#f1f5f9", ch: 1 },
  { id: "sniper", kind: "emit", name: "狙击塔", short: "狙", desc: "远程高伤,部分穿甲,专克重甲。", cost: 70, color: "#f1f5f9", ch: 1 },
  { id: "mortar", kind: "emit", name: "迫击炮", short: "炮", desc: "范围溅射炮弹,克制密集敌群。", cost: 80, color: "#f1f5f9", ch: 1 },
  { id: "laser", kind: "emit", name: "激光塔", short: "激", desc: "持续光束,稳定输出并附带元素效果。", cost: 90, color: "#f1f5f9", ch: 1 },
  { id: "drone", kind: "emit", name: "无人机机库", short: "机", desc: "2架追踪无人机,覆盖范围大。", cost: 100, color: "#f1f5f9", ch: 2 },
];
export const BUILD_MAP: Record<string, BuildDef> = Object.fromEntries(BUILDS.map((b) => [b.id, b]));

export interface EmitBase {
  range: number;
  dmg: number;
  rate: number;
  speed: number;
  splash: number;
  heat: number;
  pen: number;
  shots: number;
  beam?: boolean;
}
export const EMIT_BASE: Record<string, EmitBase> = {
  gun: { range: 4.2, dmg: 7, rate: 4.5, speed: 15, splash: 0, heat: 2.2, pen: 0, shots: 1 },
  sniper: { range: 8.5, dmg: 58, rate: 0.7, speed: 32, splash: 0, heat: 13, pen: 0.4, shots: 1 },
  mortar: { range: 6.8, dmg: 40, rate: 0.62, speed: 9, splash: 1.5, heat: 15, pen: 0.1, shots: 1 },
  laser: { range: 4.6, dmg: 26, rate: 1, speed: 0, splash: 0, heat: 20, pen: 0, shots: 1, beam: true },
  drone: { range: 5.6, dmg: 9, rate: 1.6, speed: 11, splash: 0, heat: 2.4, pen: 0, shots: 2 },
};

export interface Retrofit {
  id: string;
  emit: string;
  name: string;
  desc: string;
  dmg?: number;
  rate?: number;
  range?: number;
  splash?: number;
  pen?: number;
  pierce?: number;
  crit?: number;
  shots?: number;
}
export const RETROFITS: Retrofit[] = [
  { id: "gun_a", emit: "gun", name: "穿甲弹芯", desc: "伤害×1.2,护甲穿透+50%", dmg: 1.2, pen: 0.5 },
  { id: "gun_b", emit: "gun", name: "双联装", desc: "射速×1.5,射程-10%", rate: 1.5, range: 0.9 },
  { id: "sniper_a", emit: "sniper", name: "贫铀穿甲", desc: "弹体贯穿2个目标,伤害×1.2", pierce: 2, dmg: 1.2 },
  { id: "sniper_b", emit: "sniper", name: "光学瞄具", desc: "射程+2,暴击率+15%", range: 1.24, crit: 0.15 },
  { id: "mortar_a", emit: "mortar", name: "集束战斗部", desc: "爆炸半径×1.5", splash: 1.5 },
  { id: "mortar_b", emit: "mortar", name: "自动装填", desc: "射速×1.45,伤害×1.1", rate: 1.45, dmg: 1.1 },
  { id: "laser_a", emit: "laser", name: "聚焦透镜", desc: "伤害×1.5,射程+0.5", dmg: 1.5, range: 1.1 },
  { id: "laser_b", emit: "laser", name: "棱镜分束", desc: "额外+1道光束", shots: 1 },
  { id: "drone_a", emit: "drone", name: "僚机编队", desc: "额外+2架无人机", shots: 2 },
  { id: "drone_b", emit: "drone", name: "战斗型无人机", desc: "伤害×1.6", dmg: 1.6 },
];
export const RETRO_MAP: Record<string, Retrofit> = Object.fromEntries(RETROFITS.map((r) => [r.id, r]));

// ===== 敌人 =====
export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  spd: number;
  armor: number;
  reward: number;
  cost: number;
  r: number;
  color: string;
  leak: number;
  phase?: number;
  split?: number;
  jam?: number;
  breaker?: number; // 对建筑每秒伤害
  boss?: boolean;
}
export const ENEMIES: Record<string, EnemyDef> = {
  grunt: { id: "grunt", name: "步兵", hp: 40, spd: 1.0, armor: 0, reward: 3, cost: 10, r: 0.26, color: "#d6d3d1", leak: 1 },
  runner: { id: "runner", name: "冲锋虫", hp: 22, spd: 2.1, armor: 0, reward: 3, cost: 8, r: 0.22, color: "#fb923c", leak: 1 },
  tank: { id: "tank", name: "重装兵", hp: 150, spd: 0.7, armor: 5, reward: 9, cost: 30, r: 0.34, color: "#94a3b8", leak: 2 },
  phaser: { id: "phaser", name: "相位潜行者", hp: 75, spd: 1.25, armor: 1, reward: 7, cost: 22, r: 0.27, color: "#a78bfa", leak: 1, phase: 3 },
  splitter: { id: "splitter", name: "分裂母体", hp: 200, spd: 0.8, armor: 2, reward: 10, cost: 40, r: 0.36, color: "#34d399", leak: 2, split: 3 },
  mini: { id: "mini", name: "分裂幼体", hp: 36, spd: 1.5, armor: 0, reward: 1, cost: 0, r: 0.18, color: "#6ee7b7", leak: 1 },
  jammer: { id: "jammer", name: "电磁干扰者", hp: 130, spd: 0.9, armor: 2, reward: 10, cost: 30, r: 0.3, color: "#38bdf8", leak: 1, jam: 2 },
  siege: { id: "siege", name: "攻城巨兽", hp: 650, spd: 0.6, armor: 8, reward: 26, cost: 90, r: 0.46, color: "#f87171", leak: 3, breaker: 45 },
  boss1: { id: "boss1", name: "锈蚀巨像", hp: 2000, spd: 0.5, armor: 7, reward: 120, cost: 0, r: 0.6, color: "#ea580c", leak: 8, boss: true },
  boss2: { id: "boss2", name: "晶母", hp: 3000, spd: 0.55, armor: 5, reward: 150, cost: 0, r: 0.6, color: "#22d3ee", leak: 8, boss: true, split: 4 },
  boss3: { id: "boss3", name: "深渊之主", hp: 4300, spd: 0.5, armor: 8, reward: 180, cost: 0, r: 0.64, color: "#60a5fa", leak: 10, boss: true, jam: 2.5, breaker: 70 },
  boss4: { id: "boss4", name: "核心矩阵", hp: 6200, spd: 0.55, armor: 8, reward: 260, cost: 0, r: 0.66, color: "#e879f9", leak: 12, boss: true, jam: 2 },
};

// ===== 环境词缀 =====
export interface Affix {
  id: string;
  name: string;
  desc: string;
  icon: string;
}
export const AFFIXES: Affix[] = [
  { id: "acid", name: "强酸暴雨", desc: "墙体与导管每波损失30%耐久,耐久耗尽即被腐蚀", icon: "☂" },
  { id: "supercond", name: "超导磁场", desc: "导管连接距离+1,但建造成本×1.8", icon: "⚡" },
  { id: "storm", name: "过载风暴", desc: "敌人移速+15%,废料掉落+25%", icon: "🌀" },
  { id: "fog", name: "浓雾", desc: "所有炮塔射程×0.85", icon: "🌫" },
  { id: "rich", name: "富矿带", desc: "废料掉落+25%,敌人生命+10%", icon: "💎" },
  { id: "armored", name: "强化装甲", desc: "敌人护甲+2,生命+15%,以太+20%", icon: "🛡" },
  { id: "flare", name: "太阳耀斑", desc: "射速+15%,热量积累×1.6", icon: "☀" },
  { id: "frost", name: "冰封", desc: "减速效果+50%,熔岩伤害-20%", icon: "❄" },
  { id: "swarm", name: "虫潮", desc: "敌人数量+30%,单体生命-15%", icon: "🐛" },
];
export const AFFIX_MAP: Record<string, Affix> = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

// ===== 章节与关卡 =====
export interface Chapter {
  id: number;
  name: string;
  sub: string;
  color: string;
  bg: string;
  feature: string;
}
export const CHAPTERS: Chapter[] = [
  { id: 1, name: "锈蚀荒原", sub: "建立秩序", color: "#f59e0b", bg: "#2a1a0e", feature: "基础造迷宫 · 3种能源核心 · 4种炮塔 · 增伤/散射调制器" },
  { id: 2, name: "晶化矿洞", sub: "回路涌现", color: "#22d3ee", bg: "#0e1f2a", feature: "逻辑门调制器 · 炸药桶 · 单向传送门 · 相位潜行者 · 分裂母体" },
  { id: 3, name: "永冻深渊", sub: "生态剧变", color: "#60a5fa", bg: "#0e1530", feature: "炮塔过热 · 跨区中继器 · 电磁干扰者 · 攻城巨兽" },
  { id: 4, name: "核心矩阵", sub: "终局考验", color: "#e879f9", bg: "#240e2a", feature: "动态坍缩地形 · 多阶段Boss免疫 · 终极蓝图" },
];

const LEVEL_NAMES: string[][] = [
  ["废土哨站", "生锈峡谷", "残骸集市", "风蚀隧道", "断桥渡口", "锈蚀巨像"],
  ["晶簇入口", "回响回廊", "棱镜矿坑", "地下暗湖", "裂隙交汇", "晶母巢穴"],
  ["冰封前哨", "霜裂峡谷", "极寒泵站", "冻结反应堆", "暗流冰窟", "深渊之主"],
  ["数据洪流", "逻辑迷宫", "坍缩走廊", "镜像阵列", "奇点前线", "核心矩阵"],
];

export interface LevelCfg {
  id: number;
  chapter: number;
  idx: number;
  boss: boolean;
  name: string;
  waves: number;
  spawns: number;
  rock: number;
  vents: number;
  mags: number;
  ores: number;
  barrels: number;
  portal: boolean;
  heat: boolean;
  collapse: boolean;
  seed: number;
  startScrap: number;
  lives: number;
  pool: string[];
}

export const COLS = 24;
export const ROWS = 13;

export function buildLevels(): LevelCfg[] {
  const out: LevelCfg[] = [];
  for (let c = 1; c <= 4; c++) {
    for (let i = 0; i < 6; i++) {
      const id = (c - 1) * 6 + i;
      const boss = i === 5;
      const pool = ["grunt", "runner", "tank"];
      if (c >= 2) pool.push("phaser", "splitter");
      if (c >= 3) pool.push("jammer", "siege");
      out.push({
        id,
        chapter: c,
        idx: i,
        boss,
        name: LEVEL_NAMES[c - 1][i],
        waves: 16 + (c - 1) * 3 + i + (boss ? 2 : 0),
        spawns: c === 1 ? (i < 3 ? 1 : 2) : c === 2 ? (i < 2 ? 2 : 3) : 3,
        rock: 0.07 + c * 0.015 + i * 0.004,
        vents: 2 + (i % 3),
        mags: 2 + ((i + c) % 3),
        ores: 2 + (i % 3),
        barrels: c >= 2 ? 3 + (i % 3) : 0,
        portal: c >= 2 && (i % 2 === 1 || boss),
        heat: c >= 3,
        collapse: c === 4,
        seed: 1000 + id * 7919,
        startScrap: 200 + c * 50,
        lives: 20,
        pool,
      });
    }
  }
  return out;
}
export const LEVELS = buildLevels();

// ===== 指挥官与技能 =====
export interface Commander {
  id: string;
  name: string;
  title: string;
  desc: string;
  perks: string[];
  cost: number;
  color: string;
}
export const COMMANDERS: Commander[] = [
  { id: "architect", name: "架构师", title: "Architect", desc: "擅长超大型精密迷宫。", perks: ["墙体/导管造价 -50%", "回路可跨格连接(连接距离+1)"], cost: 0, color: "#38bdf8" },
  { id: "overclocker", name: "超频者", title: "Overclocker", desc: "无法造墙,只能用炮塔与导管微调路径。", perks: ["无法建造阻挡墙(导管造价×2)", "炮塔可手动触发过载:4秒射速+90%", "全体射速 +8%"], cost: 150, color: "#f97316" },
  { id: "salvager", name: "回收者", title: "Salvager", desc: "每波推倒重来。", perks: ["拆除建筑 100% 返还", "每波按上一阶段拆建次数获得最多+40%伤害"], cost: 300, color: "#4ade80" },
];

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  cd: number;
  target: boolean;
  cost: number; // 解锁碎片
  icon: string;
}
export const SKILLS: SkillDef[] = [
  { id: "orbital", name: "轨道打击", desc: "指定地点轰击,造成大范围高额伤害。", cd: 40, target: true, cost: 0, icon: "☄" },
  { id: "overload", name: "全域过载", desc: "所有炮塔射速+60%,持续8秒。", cd: 50, target: false, cost: 0, icon: "⚡" },
  { id: "repair", name: "紧急重构", desc: "恢复基地4点生命并修复全部建筑。", cd: 70, target: false, cost: 0, icon: "✚" },
  { id: "emp", name: "电磁脉冲", desc: "全场敌人减速80%,持续4秒。", cd: 55, target: false, cost: 40, icon: "❄" },
  { id: "salvage", name: "废料空投", desc: "立即获得一批废料(随波数增长)。", cd: 60, target: false, cost: 40, icon: "▣" },
  { id: "gravity", name: "引力塌缩", desc: "指定地点牵引并减速范围内敌人。", cd: 45, target: true, cost: 70, icon: "◉" },
];
export const SKILL_MAP: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

// ===== 局外养成 =====
export interface MetaUp {
  id: string;
  name: string;
  desc: string;
  max: number;
  costs: number[];
  horizontal?: boolean;
}
export const META_UPS: MetaUp[] = [
  { id: "slot", name: "调制器槽位", desc: "每条回路可生效的调制器 +1(水平扩展)", max: 2, costs: [120, 300], horizontal: true },
  { id: "cap", name: "能源核心扩容", desc: "单个核心可驱动的终端 +1(水平扩展)", max: 2, costs: [100, 260], horizontal: true },
  { id: "skillslot", name: "指挥官技能槽", desc: "可携带的技能数量 +1(水平扩展)", max: 1, costs: [200], horizontal: true },
  { id: "scrap", name: "初始废料", desc: "每级开局废料 +25", max: 8, costs: [15, 25, 35, 45, 60, 75, 90, 110] },
  { id: "hp", name: "基地装甲", desc: "每级基地生命 +2", max: 5, costs: [25, 45, 70, 100, 140] },
  { id: "loot", name: "回收协议", desc: "每级废料掉落 +4%", max: 5, costs: [30, 50, 80, 120, 170] },
  { id: "ether", name: "以太共振", desc: "每级以太获取 +8%", max: 5, costs: [35, 60, 90, 130, 180] },
  { id: "dmg", name: "基础校准", desc: "每级全体伤害 +3%", max: 10, costs: [20, 30, 40, 55, 70, 90, 110, 135, 165, 200] },
  { id: "cdr", name: "指挥链路", desc: "每级技能冷却 -4%", max: 5, costs: [40, 70, 110, 160, 220] },
];

export const ASC_DESC: string[] = [
  "无",
  "初始废料 -15%",
  "敌人生命 +10%",
  "调制器槽位 -1(至少1)",
  "Boss 携带护卫",
  "基地生命 -30%",
  "敌人移速 +10%",
  "废料掉落 -15%",
  "以太获取 -30%",
  "精英敌人更频繁",
  "终极:所有拆除仅返还50%",
];

export function chapterOf(level: number) {
  return Math.floor(level / 6) + 1;
}
