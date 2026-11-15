import { Game } from "../src/game/engine";
import { LEVELS, COLS, ROWS } from "../src/game/data";

function run(levelId: number, ch: number, upgradeLvl: number, seed = 1, verbose = false) {
  const g = new Game({
    level: LEVELS[levelId], commander: "architect",
    skills: [{ id: "orbital", level: 1 }],
    meta: { startScrap: 0, hp: 0, loot: 0, ether: 0, dmg: 0, slot: 0, cap: 0, skillSlots: 2, cdr: 0 },
    affixes: [], asc: 0, seed, chapterUnlocked: ch,
  });
  const dt = 1 / 30;
  let t = 0;
  const srcs = ["pulse", "magma", "cryo"];
  const ems = ["gun", "sniper", "mortar", "laser"];
  let units = 0;
  const tryUnit = () => {
    const path = g.pathPreview[0];
    for (let tries = 0; tries < 60; tries++) {
      const pc = path[6 + Math.floor(Math.random() * Math.max(1, path.length - 12))];
      if (!pc) return;
      const x = pc[0] + Math.floor(Math.random() * 3) - 1 + (Math.random() < 0.5 ? 0 : 0);
      const y = pc[1] + (Math.random() < 0.5 ? 2 : -2);
      const cells = [[0, 0], [1, 0], [2, 0], [0, 1]];
      if (!cells.every(([dx, dy]) => x + dx < COLS - 3 && y + dy >= 0 && y + dy < ROWS && !g.bmap[(y + dy) * COLS + x + dx] && g.terr[(y + dy) * COLS + x + dx] === 0)) continue;
      const need = 40 + 50 + 70 + 45;
      if (g.scrap < need) return;
      const mods = ch >= 2 ? ["split", "amp", "crit"] : ["split", "amp"];
      g.build(srcs[units % 3], x, y);
      g.build(mods[units % mods.length], x + 1, y);
      g.build(ems[units % 4], x + 2, y);
      g.build(ems[(units + 1) % 4], x, y + 1);
      units++;
      return;
    }
  };
  while (!g.over && t < 4000) {
    t += dt;
    g.update(dt);
    if (Math.floor(t * 30) % 20 === 0) {
      if (g.draft) g.chooseDraft(0);
      if (g.ether >= g.etherCost) g.openDraft();
      // upgrade
      const ups = g.buildings.filter((b) => g.maxLvl(b) > b.lvl && b.lvl < upgradeLvl).sort((a, b) => a.lvl - b.lvl);
      if (units < 2 + g.wave * 0.7) tryUnit(); else if (ups[0]) g.upgrade(ups[0]);
      for (const b of g.buildings) if (b.def.kind === "emit" && b.lvl >= 3 && !b.retro && g.scrap > 200) g.retrofit(b, b.type + "_a");
      if (g.enemies.length > 4 && g.skills[0].cd <= 0) { const e = g.enemies[0]; g.useSkill(0, e.x, e.y); }
    }
    if (g.nextTimer > 10 && g.wave > 0 && g.enemies.length === 0 && !g.queue.length) g.callWave();
  }
  console.log(`L${levelId} (${LEVELS[levelId].chapter}-${LEVELS[levelId].idx+1}) result=${g.over} wave=${g.wave}/${g.cfg.waves} lives=${g.lives}/${g.maxLives} units=${units} bld=${g.buildings.length} scrap=${Math.round(g.scrap)} kills=${g.kills} t=${Math.round(t)}`);
}
const args = process.argv.slice(2).map(Number);
for (const id of (args.length ? args : [0, 2, 5, 6, 11, 12, 17, 18, 23])) run(id, Math.floor(id / 6) + 1, 5);
