# 蚀刻防线 Etched Frontier

横屏塔防 PWA:动态造迷宫 × 三段式能量回路(能源核心 → 逻辑调制器 → 终端炮塔)× 肉鸽构筑。

- 4 章 × 6 关(含 4 个机制 Boss),环境词缀、动态抗性、过热、传送门、地形坍缩
- 炮塔升级 / 改造、以太三选一抽取、指挥官技能、3 个非对称指挥核心
- 局外实验室(水平扩展优先)、10 级熵增协议、每日种子
- PWA:可安装,Service Worker 离线可玩,存档保存在 localStorage

## 开发
```bash
npm install
npm run dev
npm run build
```

## 部署到 Vercel
直接导入仓库即可(已包含 `vercel.json`,框架 Vite,输出目录 `dist`)。

## 平衡模拟
`npx tsx scripts/sim.ts [关卡id...]` 用简易 bot 做无头平衡测试。
