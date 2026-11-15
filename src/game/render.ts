import { CHAPTERS, COLS, ROWS, ELEM_COLOR, EMIT_BASE, type Elem } from "./data";
import { Game, T_MAG, T_ORE, T_PIN, T_POUT, T_ROCK, T_VENT, type Building } from "./engine";

export interface View {
  hover: { x: number; y: number } | null;
  tool: string | null;
  sel: Building | null;
  targeting: boolean;
  showPath: boolean;
  w: number;
  h: number;
}

export function layout(w: number, h: number) {
  const cell = Math.floor(Math.min(w / COLS, h / ROWS) * 100) / 100;
  const ox = Math.floor((w - cell * COLS) / 2);
  const oy = Math.floor((h - cell * ROWS) / 2);
  return { cell, ox, oy };
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function render(c: CanvasRenderingContext2D, g: Game, v: View, dpr: number) {
  const { cell, ox, oy } = layout(v.w, v.h);
  const chap = CHAPTERS[g.cfg.chapter - 1];
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, v.w, v.h);
  c.fillStyle = "#05070d";
  c.fillRect(0, 0, v.w, v.h);
  c.save();
  c.translate(ox, oy);
  const px = (x: number) => x * cell;
  const t = g.time;
  // 地面
  c.fillStyle = chap.bg;
  c.fillRect(0, 0, COLS * cell, ROWS * cell);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      const tt = g.terr[i];
      const X = x * cell;
      const Y = y * cell;
      if ((x + y) % 2 === 0) {
        c.fillStyle = "rgba(255,255,255,0.025)";
        c.fillRect(X, Y, cell, cell);
      }
      if (tt === T_ROCK) {
        c.fillStyle = "#1b2030";
        c.fillRect(X, Y, cell, cell);
        c.fillStyle = "#2b3347";
        c.fillRect(X + 2, Y + 2, cell - 4, cell - 4);
        c.fillStyle = "#394460";
        c.beginPath();
        c.moveTo(X + 2, Y + 2);
        c.lineTo(X + cell - 2, Y + 2);
        c.lineTo(X + 2, Y + cell * 0.6);
        c.fill();
      } else if (tt === T_VENT) {
        const g2 = c.createRadialGradient(X + cell / 2, Y + cell / 2, 1, X + cell / 2, Y + cell / 2, cell * 0.6);
        g2.addColorStop(0, "rgba(255,120,40,0.75)");
        g2.addColorStop(1, "rgba(255,80,20,0.05)");
        c.fillStyle = g2;
        c.fillRect(X, Y, cell, cell);
        c.strokeStyle = "rgba(255,170,80,0.7)";
        c.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.moveTo(X + cell * (0.25 + k * 0.25), Y + cell * 0.8);
          c.lineTo(X + cell * (0.25 + k * 0.25), Y + cell * (0.35 + 0.1 * Math.sin(t * 4 + k)));
          c.stroke();
        }
      } else if (tt === T_MAG) {
        c.fillStyle = "rgba(90,140,255,0.22)";
        c.fillRect(X, Y, cell, cell);
        c.strokeStyle = "rgba(160,200,255,0.9)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(X + cell * 0.3, Y + cell * 0.15);
        c.lineTo(X + cell * 0.55, Y + cell * 0.45);
        c.lineTo(X + cell * 0.4, Y + cell * 0.55);
        c.lineTo(X + cell * 0.7, Y + cell * 0.88);
        c.stroke();
      } else if (tt === T_ORE) {
        const left = g.oreLeft.get(i) || 0;
        c.fillStyle = left > 0 ? "rgba(250,204,21,0.18)" : "rgba(120,120,120,0.15)";
        c.fillRect(X, Y, cell, cell);
        c.fillStyle = left > 0 ? "#facc15" : "#6b7280";
        for (const [a, b, s] of [[0.3, 0.35, 0.18], [0.62, 0.55, 0.22], [0.4, 0.72, 0.13]]) {
          c.beginPath();
          c.moveTo(X + cell * a, Y + cell * (b - s));
          c.lineTo(X + cell * (a + s * 0.7), Y + cell * b);
          c.lineTo(X + cell * a, Y + cell * (b + s));
          c.lineTo(X + cell * (a - s * 0.7), Y + cell * b);
          c.fill();
        }
      } else if (tt === T_PIN || tt === T_POUT) {
        const col = tt === T_PIN ? "#c084fc" : "#5eead4";
        c.strokeStyle = col;
        c.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          c.globalAlpha = 0.9 - k * 0.25;
          c.beginPath();
          c.arc(X + cell / 2, Y + cell / 2, cell * (0.18 + k * 0.12 + 0.03 * Math.sin(t * 5 - k)), 0, 7);
          c.stroke();
        }
        c.globalAlpha = 1;
      }
    }
  c.strokeStyle = "rgba(255,255,255,0.05)";
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 0; x <= COLS; x++) {
    c.moveTo(x * cell, 0);
    c.lineTo(x * cell, ROWS * cell);
  }
  for (let y = 0; y <= ROWS; y++) {
    c.moveTo(0, y * cell);
    c.lineTo(COLS * cell, y * cell);
  }
  c.stroke();

  // 路径预览
  if (v.showPath) {
    c.strokeStyle = "rgba(94,234,212,0.5)";
    c.lineWidth = Math.max(2, cell * 0.08);
    c.setLineDash([cell * 0.2, cell * 0.2]);
    c.lineDashOffset = -t * cell * 1.5;
    for (const p of g.pathPreview) {
      c.beginPath();
      p.forEach(([x, y], k) => {
        const X = px(x + 0.5);
        const Y = px(y + 0.5);
        if (k === 0) c.moveTo(X, Y);
        else {
          const [lx, ly] = p[k - 1];
          if (Math.abs(lx - x) + Math.abs(ly - y) > 1) c.moveTo(X, Y);
          else c.lineTo(X, Y);
        }
      });
      c.stroke();
    }
    c.setLineDash([]);
  }
  // 裂隙与核心
  for (const s of g.spawns) {
    const X = px(s.x + 0.5);
    const Y = px(s.y + 0.5);
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = `rgba(248,113,113,${0.8 - k * 0.2})`;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(X, Y, cell * (0.25 + k * 0.1 + 0.04 * Math.sin(t * 4 + k)), cell * (0.45 + k * 0.05), 0, 0, 7);
      c.stroke();
    }
  }
  {
    const X = px(g.core.x + 0.5);
    const Y = px(g.core.y + 0.5);
    const gr = c.createRadialGradient(X, Y, 2, X, Y, cell * 1.1);
    gr.addColorStop(0, "rgba(94,234,212,0.9)");
    gr.addColorStop(1, "rgba(94,234,212,0)");
    c.fillStyle = gr;
    c.fillRect(X - cell * 1.2, Y - cell * 1.2, cell * 2.4, cell * 2.4);
    c.fillStyle = "#0f766e";
    c.strokeStyle = "#5eead4";
    c.lineWidth = 2;
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + t * 0.5;
      c.lineTo(X + Math.cos(a) * cell * 0.4, Y + Math.sin(a) * cell * 0.4);
    }
    c.closePath();
    c.fill();
    c.stroke();
  }
  // 炸药桶
  for (const b of g.barrels) {
    const X = px(b.x + 0.5);
    const Y = px(b.y + 0.5);
    c.fillStyle = "#b91c1c";
    roundRect(c, X - cell * 0.28, Y - cell * 0.32, cell * 0.56, cell * 0.64, cell * 0.1);
    c.fill();
    c.fillStyle = "#fde047";
    c.fillRect(X - cell * 0.28, Y - cell * 0.08, cell * 0.56, cell * 0.16);
    c.strokeStyle = "#fca5a5";
    c.lineWidth = 1.5;
    c.stroke();
  }
  // 引力区
  for (const z of g.zones) {
    c.strokeStyle = "rgba(192,132,252,0.7)";
    c.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const r = ((((t * 1.2 + k / 3) % 1) * z.r) / 1) * cell;
      c.globalAlpha = 1 - r / (z.r * cell);
      c.beginPath();
      c.arc(px(z.x), px(z.y), z.r * cell - r, 0, 7);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  // 回路连线
  for (const b of g.buildings) {
    if (b.def.kind !== "emit" || !b.pw) continue;
    const col = ELEM_COLOR[b.pw.src.def.elem as Elem];
    c.strokeStyle = col;
    c.globalAlpha = 0.55;
    c.lineWidth = Math.max(2, cell * 0.09);
    c.setLineDash([cell * 0.15, cell * 0.2]);
    c.lineDashOffset = -t * cell * 1.2;
    c.beginPath();
    b.pw.path.forEach((n, k) => {
      const X = px(n.x + 0.5);
      const Y = px(n.y + 0.5);
      if (k === 0) c.moveTo(X, Y);
      else c.lineTo(X, Y);
    });
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
  }

  // 建筑
  for (const b of g.buildings) drawBuilding(c, g, b, cell, t, v.sel === b);

  // 光束
  for (const b of g.buildings) {
    if (!b.beams.length || !b.pw) continue;
    const col = ELEM_COLOR[b.pw.src.def.elem as Elem];
    for (const m of b.beams) {
      c.strokeStyle = col;
      c.lineWidth = Math.max(2, cell * 0.12);
      c.globalAlpha = 0.9;
      c.beginPath();
      c.moveTo(px(b.x + 0.5), px(b.y + 0.5));
      c.lineTo(px(m.x), px(m.y));
      c.stroke();
      c.strokeStyle = "#fff";
      c.lineWidth = Math.max(1, cell * 0.04);
      c.stroke();
      c.globalAlpha = 1;
    }
  }

  // 敌人
  for (const e of g.enemies) {
    const X = px(e.x);
    const Y = px(e.y);
    const r = e.def.r * cell * (e.elite ? 1.25 : 1);
    if (e.slow > 0) {
      c.fillStyle = "rgba(90,216,255,0.25)";
      c.beginPath();
      c.arc(X, Y, r + 4, 0, 7);
      c.fill();
    }
    if (e.burnT > 0) {
      c.fillStyle = "rgba(255,110,50,0.3)";
      c.beginPath();
      c.arc(X, Y - 2, r + 3, 0, 7);
      c.fill();
    }
    c.fillStyle = e.flash > 0 ? "#fff" : e.def.color;
    c.strokeStyle = e.elite ? "#fde047" : "rgba(0,0,0,0.5)";
    c.lineWidth = e.elite ? 2.5 : 1.5;
    c.beginPath();
    const id = e.def.id;
    if (id === "runner") {
      c.moveTo(X + Math.cos(Math.atan2(e.vy, e.vx)) * r * 1.3, Y + Math.sin(Math.atan2(e.vy, e.vx)) * r * 1.3);
      c.lineTo(X + Math.cos(Math.atan2(e.vy, e.vx) + 2.5) * r, Y + Math.sin(Math.atan2(e.vy, e.vx) + 2.5) * r);
      c.lineTo(X + Math.cos(Math.atan2(e.vy, e.vx) - 2.5) * r, Y + Math.sin(Math.atan2(e.vy, e.vx) - 2.5) * r);
      c.closePath();
    } else if (id === "tank" || id === "siege" || e.def.boss) {
      roundRect(c, X - r, Y - r, r * 2, r * 2, r * 0.3);
    } else if (id === "phaser") {
      c.moveTo(X, Y - r * 1.2);
      c.lineTo(X + r, Y);
      c.lineTo(X, Y + r * 1.2);
      c.lineTo(X - r, Y);
      c.closePath();
    } else if (id === "jammer") {
      for (let k = 0; k < 6; k++) c.lineTo(X + Math.cos((k * Math.PI) / 3) * r, Y + Math.sin((k * Math.PI) / 3) * r);
      c.closePath();
    } else c.arc(X, Y, r, 0, 7);
    c.fill();
    c.stroke();
    if (e.def.jam) {
      c.strokeStyle = "rgba(56,189,248,0.35)";
      c.setLineDash([4, 4]);
      c.beginPath();
      c.arc(X, Y, e.def.jam * cell, 0, 7);
      c.stroke();
      c.setLineDash([]);
    }
    if (e.immune) {
      c.strokeStyle = ELEM_COLOR[e.immune as Elem] || "#fff";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(X, Y, r + 5, 0, 7);
      c.stroke();
    }
    if (e.phaseCh > 0) {
      c.strokeStyle = "rgba(167,139,250,0.8)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(X, Y, r + 3, 0, 7);
      c.stroke();
    }
    if (e.res > 0.05) {
      c.strokeStyle = `rgba(250,250,250,${Math.min(1, e.res + 0.2)})`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(X, Y, r + 2, 0, Math.PI * 2 * e.res);
      c.stroke();
    }
    if (e.hp < e.maxHp) {
      const bw = Math.max(r * 2, cell * 0.5);
      c.fillStyle = "rgba(0,0,0,0.6)";
      c.fillRect(X - bw / 2, Y - r - 7, bw, 4);
      c.fillStyle = e.def.boss ? "#f472b6" : e.hp / e.maxHp > 0.4 ? "#4ade80" : "#f87171";
      c.fillRect(X - bw / 2, Y - r - 7, bw * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  // 弹体
  for (const p of g.projs) {
    const X = px(p.x);
    const Y = px(p.y);
    c.fillStyle = p.color;
    c.beginPath();
    c.arc(X, Y, p.shell ? cell * 0.14 : p.crit ? cell * 0.1 : cell * 0.065, 0, 7);
    c.fill();
    if (!p.shell) {
      c.strokeStyle = p.color;
      c.globalAlpha = 0.4;
      c.lineWidth = cell * 0.05;
      c.beginPath();
      c.moveTo(X, Y);
      c.lineTo(X - ((p.tx - p.x) / (Math.hypot(p.tx - p.x, p.ty - p.y) + 0.01)) * cell * 0.4, Y - ((p.ty - p.y) / (Math.hypot(p.tx - p.x, p.ty - p.y) + 0.01)) * cell * 0.4);
      c.stroke();
      c.globalAlpha = 1;
    }
  }
  // 特效
  c.textAlign = "center";
  c.textBaseline = "middle";
  for (const f of g.fx) {
    const k = f.t / f.ttl;
    if (f.k === "ring") {
      c.strokeStyle = f.c;
      c.globalAlpha = 1 - k;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(px(f.x), px(f.y), (f.r || 1) * cell * (0.3 + 0.7 * k), 0, 7);
      c.stroke();
      c.globalAlpha = 0.18 * (1 - k);
      c.fillStyle = f.c;
      c.fill();
      c.globalAlpha = 1;
    } else if (f.k === "spark") {
      c.fillStyle = f.c;
      c.globalAlpha = 1 - k;
      c.beginPath();
      c.arc(px(f.x), px(f.y), (f.r || 0.2) * cell * (0.6 + k), 0, 7);
      c.fill();
      c.globalAlpha = 1;
    } else if (f.k === "line") {
      c.strokeStyle = f.c;
      c.globalAlpha = 1 - k;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(px(f.x), px(f.y));
      c.lineTo(px(f.x2 || 0), px(f.y2 || 0));
      c.stroke();
      c.globalAlpha = 1;
    } else if (f.k === "text") {
      c.fillStyle = f.c;
      c.globalAlpha = 1 - k * k;
      c.font = `bold ${Math.max(10, cell * 0.32)}px sans-serif`;
      c.fillText(f.s || "", px(f.x), px(f.y) - k * cell * 0.7);
      c.globalAlpha = 1;
    }
  }

  // 悬停/幽灵/射程
  const drawRange = (x: number, y: number, r: number, col: string) => {
    c.strokeStyle = col;
    c.fillStyle = col.replace(/[\d.]+\)$/, "0.08)");
    c.lineWidth = 2;
    c.beginPath();
    c.arc(px(x + 0.5), px(y + 0.5), r * cell, 0, 7);
    c.fill();
    c.stroke();
  };
  if (v.sel && !v.sel.dead) {
    const st = g.stats(v.sel);
    const base = EMIT_BASE[v.sel.type];
    const r = st ? st.range : base ? (base.range + 0.15 * (v.sel.lvl - 1)) * g.fogMul : 0;
    if (r) drawRange(v.sel.x, v.sel.y, r, "rgba(250,250,250,0.6)");
    c.strokeStyle = "#fff";
    c.lineWidth = 2;
    c.strokeRect(v.sel.x * cell + 1, v.sel.y * cell + 1, cell - 2, cell - 2);
  }
  if (v.hover) {
    const { x, y } = v.hover;
    if (v.targeting) {
      c.strokeStyle = "#fde047";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px(x + 0.5), px(y + 0.5), 2.4 * cell, 0, 7);
      c.stroke();
    } else if (v.tool) {
      const okCell = g.terr[y * COLS + x] !== T_ROCK && !g.bmap[y * COLS + x];
      c.fillStyle = okCell ? "rgba(94,234,212,0.25)" : "rgba(248,113,113,0.3)";
      c.fillRect(x * cell, y * cell, cell, cell);
      const base = EMIT_BASE[v.tool];
      if (base) drawRange(x, y, (base.range + 0.15 * 0) * g.fogMul, "rgba(94,234,212,0.5)");
      if (g.linkRange > 0) {
        c.strokeStyle = "rgba(94,234,212,0.35)";
        c.setLineDash([4, 4]);
        c.lineWidth = 1;
        const R = g.linkRange;
        for (let dx = -R; dx <= R; dx++)
          for (let dy = -R; dy <= R; dy++) {
            if (Math.abs(dx) + Math.abs(dy) > R || (dx === 0 && dy === 0)) continue;
            c.strokeRect((x + dx) * cell + 3, (y + dy) * cell + 3, cell - 6, cell - 6);
          }
        c.setLineDash([]);
      }
    } else {
      c.strokeStyle = "rgba(255,255,255,0.35)";
      c.lineWidth = 1;
      c.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      const b = g.bAt(x, y);
      if (b && b.def.kind === "emit") {
        const st = g.stats(b);
        if (st) drawRange(b.x, b.y, st.range, "rgba(250,250,250,0.45)");
      }
    }
  }
  c.restore();
}

function drawBuilding(c: CanvasRenderingContext2D, g: Game, b: Building, cell: number, t: number, selected: boolean) {
  const X = b.x * cell;
  const Y = b.y * cell;
  const cx = X + cell / 2;
  const cy = Y + cell / 2;
  const kind = b.def.kind;
  const pad = cell * 0.08;
  const col = b.def.color;
  c.globalAlpha = b.jammed ? 0.45 : 1;
  const flash = b.flash > 0;
  if (kind === "wall") {
    c.fillStyle = flash ? "#fff" : "#566074";
    roundRect(c, X + pad, Y + pad, cell - pad * 2, cell - pad * 2, cell * 0.12);
    c.fill();
    c.strokeStyle = "#8c97ad";
    c.lineWidth = 1.5;
    c.stroke();
    c.beginPath();
    c.moveTo(X + cell * 0.25, Y + cell * 0.5);
    c.lineTo(X + cell * 0.75, Y + cell * 0.5);
    c.stroke();
  } else if (kind === "conduit") {
    c.fillStyle = flash ? "#fff" : "#12332f";
    roundRect(c, X + pad, Y + pad, cell - pad * 2, cell - pad * 2, cell * 0.12);
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.arc(cx, cy, cell * 0.12, 0, 7);
    c.fillStyle = col;
    c.fill();
  } else if (kind === "relay") {
    c.fillStyle = "#1c2749";
    c.strokeStyle = col;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx, Y + pad);
    c.lineTo(X + cell - pad, cy);
    c.lineTo(cx, Y + cell - pad);
    c.lineTo(X + pad, cy);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(cx, cy, cell * 0.1 + Math.sin(t * 6) * 1.2, 0, 7);
    c.fillStyle = col;
    c.fill();
  } else if (kind === "drill") {
    const left = g.oreLeft.get(b.y * COLS + b.x) || 0;
    c.fillStyle = "#3b2f12";
    roundRect(c, X + pad, Y + pad, cell - pad * 2, cell - pad * 2, cell * 0.12);
    c.fill();
    c.strokeStyle = left > 0 ? col : "#6b7280";
    c.lineWidth = 2;
    c.stroke();
    c.save();
    c.translate(cx, cy);
    c.rotate(left > 0 ? t * 6 : 0);
    c.fillStyle = left > 0 ? col : "#6b7280";
    c.fillRect(-cell * 0.22, -cell * 0.05, cell * 0.44, cell * 0.1);
    c.fillRect(-cell * 0.05, -cell * 0.22, cell * 0.1, cell * 0.44);
    c.restore();
  } else if (kind === "source") {
    const gr = c.createRadialGradient(cx, cy, 1, cx, cy, cell * 0.55);
    gr.addColorStop(0, col);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gr;
    c.globalAlpha *= 0.6 + 0.2 * Math.sin(t * 4 + b.id);
    c.fillRect(X, Y, cell, cell);
    c.globalAlpha = b.jammed ? 0.45 : 1;
    c.fillStyle = "#0b1220";
    c.strokeStyle = col;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(cx, cy, cell * 0.36, 0, 7);
    c.fill();
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.arc(cx, cy, cell * 0.17, 0, 7);
    c.fill();
  } else if (kind === "mod") {
    c.fillStyle = "#151a2b";
    c.strokeStyle = col;
    c.lineWidth = 2.5;
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 6;
      c.lineTo(cx + Math.cos(a) * cell * 0.4, cy + Math.sin(a) * cell * 0.4);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = col;
    c.font = `bold ${cell * 0.38}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(b.def.short, cx, cy + 1);
  } else if (kind === "emit") {
    const powered = !!b.pw;
    const ec = powered ? ELEM_COLOR[b.pw!.src.def.elem as Elem] : "#64748b";
    c.fillStyle = "#101626";
    c.strokeStyle = b.hot ? "#ef4444" : ec;
    c.lineWidth = 2.5;
    roundRect(c, X + pad, Y + pad, cell - pad * 2, cell - pad * 2, cell * 0.2);
    c.fill();
    c.stroke();
    c.save();
    c.translate(cx, cy);
    c.rotate(b.angle);
    c.fillStyle = powered ? "#e2e8f0" : "#64748b";
    if (b.type === "sniper") c.fillRect(0, -cell * 0.05, cell * 0.5, cell * 0.1);
    else if (b.type === "mortar") c.fillRect(0, -cell * 0.12, cell * 0.36, cell * 0.24);
    else if (b.type === "laser") {
      c.fillRect(0, -cell * 0.07, cell * 0.4, cell * 0.14);
      c.fillStyle = ec;
      c.fillRect(cell * 0.3, -cell * 0.1, cell * 0.1, cell * 0.2);
    } else if (b.type === "drone") {
      c.restore();
      c.save();
      c.fillStyle = "#cbd5e1";
      for (let k = 0; k < 2; k++) {
        const a = t * 2.2 + k * Math.PI;
        c.beginPath();
        c.arc(cx + Math.cos(a) * cell * 0.3, cy + Math.sin(a) * cell * 0.3, cell * 0.08, 0, 7);
        c.fill();
      }
      c.translate(cx, cy);
    } else {
      c.fillRect(0, -cell * 0.09, cell * 0.42, cell * 0.06);
      c.fillRect(0, cell * 0.03, cell * 0.42, cell * 0.06);
    }
    c.restore();
    c.fillStyle = powered ? ec : "#64748b";
    c.beginPath();
    c.arc(cx, cy, cell * 0.12, 0, 7);
    c.fill();
    if (!powered) {
      c.fillStyle = "#f87171";
      c.font = `bold ${cell * 0.3}px sans-serif`;
      c.textAlign = "center";
      c.fillText("!", X + cell * 0.82, Y + cell * 0.2);
    }
    if (b.overT > 0) {
      c.strokeStyle = "#fb923c";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, cy, cell * 0.5 + Math.sin(t * 12) * 2, 0, 7);
      c.stroke();
    }
    if (b.pw && b.pw.mods.some((m) => m.type === "cap")) {
      c.fillStyle = "#fde047";
      c.fillRect(X + pad, Y + cell - pad - 3, (cell - pad * 2) * (b.charge / 5), 3);
    }
  }
  c.globalAlpha = 1;
  // 等级点
  if (b.lvl > 1 || b.retro) {
    c.fillStyle = b.retro ? "#fbbf24" : "#e2e8f0";
    for (let k = 0; k < b.lvl; k++) c.fillRect(X + pad + k * (cell * 0.12), Y + pad - 1, cell * 0.09, 3);
  }
  // 热量
  if (b.heat > 1 && kind === "emit") {
    c.fillStyle = "rgba(0,0,0,0.6)";
    c.fillRect(X + pad, Y + cell - pad - 8, cell - pad * 2, 3);
    c.fillStyle = b.hot ? "#ef4444" : b.heat > 70 ? "#fb923c" : "#fde047";
    c.fillRect(X + pad, Y + cell - pad - 8, (cell - pad * 2) * (b.heat / 100), 3);
  }
  // 耐久
  if (b.hp < b.maxHp) {
    c.fillStyle = "rgba(0,0,0,0.6)";
    c.fillRect(X + pad, Y + cell - 4, cell - pad * 2, 3);
    c.fillStyle = b.hp / b.maxHp > 0.4 ? "#4ade80" : "#f87171";
    c.fillRect(X + pad, Y + cell - 4, (cell - pad * 2) * (b.hp / b.maxHp), 3);
  }
  if (b.jammed) {
    c.strokeStyle = "#38bdf8";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(X + cell * 0.2, Y + cell * 0.2);
    c.lineTo(X + cell * 0.8, Y + cell * 0.8);
    c.moveTo(X + cell * 0.8, Y + cell * 0.2);
    c.lineTo(X + cell * 0.2, Y + cell * 0.8);
    c.stroke();
  }
  void selected;
}
