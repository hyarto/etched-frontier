// 无头平衡模拟:  npx tsx scripts/sim.ts [关卡id... | endless [次数]]
import { Game } from "../src/game/engine";
import { LEVELS, COLS, ROWS, endlessLevel, BUILD_MAP } from "../src/game/data";

const META = { startScrap: 0, hp: 0, loot: 0, ether: 0, dmg: 0, slot: 0, cap: 0, skillSlots: 2, cdr: 0 };

function makeBot(g: Game, ch: number, only?: string) {
  const srcs = ["pulse", "magma", "cryo", "sing"].filter((id) => BUILD_MAP[id].ch <= ch);
  const ems = (only ? [only] : ["gun", "sniper", "mortar", "laser", "drone", "shotgun", "flamer", "tesla", "missile", "rail"]).filter((id) => BUILD_MAP[id].ch <= ch);
  let units = 0;
  const tryUnit = () => {
    const path = g.pathPreview[Math.floor(Math.random() * g.pathPreview.length)];
    for (let tries = 0; tries < 80; tries++) {
      const pc = path[6 + Math.floor(Math.random() * Math.max(1, path.length - 12))];
      if (!pc) return;
      const x = pc[0] + Math.floor(Math.random() * 3) - 1;
      const y = pc[1] + (Math.random() < 0.5 ? 2 : -2);
      const cells = [[0, 0], [1, 0], [2, 0], [0, 1]];
      if (!cells.every(([dx, dy]) => x + dx < COLS - 3 && y + dy >= 0 && y + dy < ROWS && !g.bmap[(y + dy) * COLS + x + dx] && g.terr[(y + dy) * COLS + x + dx] === 0)) continue;
      if (g.scrap < 260) return;
      const mods = ch >= 2 ? ["split", "amp", "crit"] : ["split", "amp"];
      g.build(srcs[units % srcs.length], x, y);
      g.build(mods[units % mods.length], x + 1, y);
      g.build(ems[units % ems.length], x + 2, y);
      g.build(ems[(units + 3) % ems.length], x, y + 1);
      units++;
      return;
    }
  };
  return {
    step(t: number, upgradeLvl: number) {
      if (g.cardOffer) g.pickCard(Math.floor(Math.random() * g.cardOffer.length));
      if (Math.floor(t * 30) % 20 === 0) {
        if (g.draft) g.chooseDraft(0);
        if (g.ether >= g.etherCost) g.openDraft();
        const ups = g.buildings.filter((b) => g.maxLvl(b) > b.lvl && b.lvl < upgradeLvl).sort((a, b) => a.lvl - b.lvl);
        if (units < 2 + g.wave * 0.7) tryUnit();
        else if (ups[0]) g.upgrade(ups[0]);
        for (const b of g.buildings) if (b.def.kind === "emit" && b.lvl >= 3 && !b.retro && g.scrap > 200) g.retrofit(b, b.type + "_" + (Math.random() < 0.5 ? "a" : "b"));
        for (const b of g.buildings) if (b.hp < b.maxHp * 0.5) g.repair(b);
        if (g.enemies.length > 4 && g.skills[0] && g.skills[0].cd <= 0) {
          const e = g.enemies[0];
          g.useSkill(0, e.x, e.y);
        }
      }
      if (g.nextTimer > 10 && g.wave > 0 && g.enemies.length === 0 && !g.queue.length) g.callWave();
    },
    get units() {
      return units;
    },
  };
}

function run(levelId: number, seed = 1) {
  const ch = Math.floor(levelId / 6) + 1;
  const g = new Game({ level: LEVELS[levelId], commander: "architect", skills: [{ id: "orbital", level: 1 }], meta: META, affixes: [], asc: 0, seed, chapterUnlocked: ch });
  const bot = makeBot(g, ch);
  const dt = 1 / 30;
  let t = 0;
  while (!g.over && t < 4000) {
    t += dt;
    g.update(dt);
    bot.step(t, 5);
  }
  console.log(`L${levelId} (${LEVELS[levelId].chapter}-${LEVELS[levelId].idx + 1}) result=${g.over} wave=${g.wave}/${g.cfg.waves} lives=${g.lives}/${g.maxLives} units=${bot.units} kills=${g.kills} cards=${g.cardCount()} t=${Math.round(t)}`);
}

function runEndless(seed: number, only?: string, maxWave = 80) {
  const g = new Game({ level: endlessLevel(seed), commander: "architect", skills: [{ id: "orbital", level: 1 }], meta: META, affixes: [], asc: 0, seed, chapterUnlocked: 4, endless: true });
  const bot = makeBot(g, 4, only);
  const dt = 1 / 30;
  let t = 0;
  while (!g.over && t < 6000 && g.wave < maxWave) {
    t += dt;
    g.update(dt);
    bot.step(t, 5);
  }
  const top = Object.entries(g.dmgSource)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${Math.round(v / 1000)}k`)
    .join(" ");
  console.log(`endless${only ? "[" + only + "]" : ""} seed=${seed} result=${g.over} wave=${g.wave} lives=${g.lives}/${g.maxLives} units=${bot.units} kills=${g.kills} cards=${g.cardCount()} shards=${g.shardReward()} t=${Math.round(t)}\n   dmg: ${top}`);
}

const args = process.argv.slice(2);
if (args[0] === "endless") {
  const n = Number(args[1] || 3);
  for (let i = 0; i < n; i++) runEndless(101 + i * 977);
} else if (args[0] === "only") {
  for (const id of args.slice(1)) runEndless(555, id);
} else {
  const ids = args.map(Number);
  for (const id of ids.length ? ids : [0, 2, 5, 6, 11, 12, 17, 18, 23]) run(id);
}
