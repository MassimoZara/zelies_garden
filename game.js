'use strict';

// ── Constants ────────────────────────────────────────────────────
const SAVE_KEY = 'zelie_garden_v1';
const W = 48; // internal canvas width
const H = 48; // internal canvas height

const PLANTS = {
  rose:      { name:'Rose',      emoji:'🌹', days:3, seedCost:5,  reward:25, stemC:'#2d5a1b', flowerC:'#e94560', leafC:'#3a7a2a', centerC:'#ffd700' },
  sunflower: { name:'Sunflower', emoji:'🌻', days:4, seedCost:8,  reward:40, stemC:'#4a7c1f', flowerC:'#f5c542', leafC:'#3a7a2a', centerC:'#5c3a1e' },
  tulip:     { name:'Tulip',     emoji:'🌷', days:2, seedCost:4,  reward:18, stemC:'#2d5a1b', flowerC:'#c86dd7', leafC:'#3a7a2a', centerC:'#f0d060' },
  carrot:    { name:'Carrot',    emoji:'🥕', days:2, seedCost:3,  reward:15, stemC:'#3a7a2a', flowerC:'#ff8c00', leafC:'#2d8a1a', centerC:'#ff6600' },
  tomato:    { name:'Tomato',    emoji:'🍅', days:4, seedCost:7,  reward:32, stemC:'#2d5a1b', flowerC:'#ff4444', leafC:'#3a7a2a', centerC:'#cc2222' },
  pumpkin:   { name:'Pumpkin',   emoji:'🎃', days:5, seedCost:12, reward:55, stemC:'#2d5a1b', flowerC:'#ff6b00', leafC:'#3a7a2a', centerC:'#cc4400' },
};

const SHOP = [
  { type:'seed', key:'rose',      label:'Rose seeds',      price:5  },
  { type:'seed', key:'sunflower', label:'Sunflower seeds', price:8  },
  { type:'seed', key:'tulip',     label:'Tulip seeds',     price:4  },
  { type:'seed', key:'carrot',    label:'Carrot seeds',    price:3  },
  { type:'seed', key:'tomato',    label:'Tomato seeds',    price:7  },
  { type:'seed', key:'pumpkin',   label:'Pumpkin seeds',   price:12 },
  { type:'pot',  key:'pot',       label:'Extra pot',       price:30 },
];

// ── State ────────────────────────────────────────────────────────
let G = {
  coins: 30,
  pots: [],
  inv: { rose:2, sunflower:0, tulip:1, carrot:2, tomato:0, pumpkin:0 },
  selectedSeed: null,
  log: [],
  startDate: null,
};

// ── Date helpers ─────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

// ── Save / Load ──────────────────────────────────────────────────
function saveGame() {
  const { coins, pots, inv, log, startDate } = G;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ coins, pots, inv, log, startDate }));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) Object.assign(G, JSON.parse(raw));
  } catch { /* fresh start */ }

  if (!G.startDate) G.startDate = todayStr();

  // Mark plants as sad if missed 2+ days without watering
  G.pots.forEach(pot => {
    if (!pot.plant) return;
    if (daysBetween(pot.plant.lastWatered, todayStr()) >= 2) pot.plant.sad = true;
  });
}

function initPots(n = 4) {
  if (G.pots.length === 0) {
    for (let i = 0; i < n; i++) G.pots.push({ id: i, plant: null });
  }
}

// ── Pixel art helpers ────────────────────────────────────────────
function hex2rgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}

function shade(col, amt) {
  let r, g, b;
  if (typeof col === 'string' && col.startsWith('#')) {
    [r,g,b] = hex2rgb(col);
  } else {
    const m = String(col).match(/\d+/g);
    [r,g,b] = m ? m.map(Number) : [128,128,128];
  }
  const clamp = x => Math.max(0, Math.min(255, x + amt));
  return `#${[r,g,b].map(x => clamp(x).toString(16).padStart(2,'0')).join('')}`;
}

function px(ctx, x, y, col, a = 1) {
  if (!col || x < 0 || y < 0 || x >= W || y >= H) return;
  const [r,g,b] = hex2rgb(col.startsWith('#') ? col : '#888888');
  ctx.fillStyle = a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx, x, y, w, h, col, a = 1) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      px(ctx, x + dx, y + dy, col, a);
}

// ── Sprite: pot (48×48, pot occupies rows 28–47) ─────────────────
// Rows 28-30: soil  |  Rows 31-33: rim  |  Rows 34-47: body
function drawPot(ctx, sad = false) {
  const soilD = sad ? '#1e0d04' : '#2e1608';
  const soilM = sad ? '#3a1e08' : '#4e2c10';
  const soilL = sad ? '#5a3018' : '#7a4a22';
  const rimL  = sad ? '#9a5828' : '#d88040';
  const rimM  = sad ? '#7a3a14' : '#b06020';
  const rimD  = sad ? '#5a2408' : '#884010';
  const bL    = sad ? '#8a4a20' : '#c07038';
  const bM    = sad ? '#6a3010' : '#9e5020';
  const bD    = sad ? '#4e2008' : '#7a3c10';
  const bS    = sad ? '#321004' : '#502808';

  // Soil (rows 28-30)
  rect(ctx, 11, 28, 26, 3, soilM);
  for (const [x,y] of [[13,28],[18,29],[24,28],[30,29],[34,28],[15,30],[25,30]]) px(ctx,x,y,soilL);
  for (const [x,y] of [[11,29],[17,28],[22,29],[28,28],[36,29],[12,30],[32,29]]) px(ctx,x,y,soilD);
  rect(ctx, 11, 30, 26, 1, rimD); // shadow line at soil/rim join

  // Rim (rows 31-33, x=7, width=34)
  rect(ctx, 7, 31, 34, 3, rimM);
  rect(ctx, 7, 31, 34, 1, rimL);  // top highlight
  rect(ctx, 7, 33, 34, 1, rimD);  // bottom shadow
  px(ctx, 7, 31, rimD); px(ctx, 40, 31, rimD); // outer corners
  px(ctx, 7, 32, rimD); px(ctx, 40, 32, rimD);
  // Inner rim shadow
  rect(ctx, 10, 33, 28, 1, rimD);

  // Body (rows 34-47, trapezoid)
  const bw = [32,31,30,29,28,27,26,25,24,23,22,21,20,19];
  bw.forEach((w, i) => {
    const x = Math.floor((W - w) / 2);
    const y = 34 + i;
    const drk = i * 2;
    rect(ctx, x, y, w, 1, shade(bM, -drk));
    // Highlight (left 2px)
    px(ctx, x,   y, shade(bL, -drk));
    px(ctx, x+1, y, shade(bL, -drk - 12));
    // Specular on top rows
    if (i < 4) px(ctx, x+3, y, shade(bL, 18 - drk));
    // Shadow (right 2px)
    px(ctx, x+w-1, y, bS);
    px(ctx, x+w-2, y, shade(bD, -drk));
  });
  // Base
  rect(ctx, 14, 47, 20, 1, bS);
  // Drainage hole
  px(ctx, 23, 47, shade(bS, -20)); px(ctx, 24, 47, shade(bS, -20));
}

// ── Leaf helpers ─────────────────────────────────────────────────
// Both leaves are teardrop-shaped, 11px wide × 4px tall
function drawLeafL(ctx, ax, ay, lC) {
  const d = shade(lC, -30); const v = shade(lC, +50);
  for (let x = ax-5; x <= ax; x++) px(ctx, x, ay,   lC);
  for (let x = ax-10; x <= ax; x++) px(ctx, x, ay+1, lC);
  for (let x = ax-7;  x <= ax; x++) px(ctx, x, ay+2, lC);
  for (let x = ax-3;  x <= ax; x++) px(ctx, x, ay+3, lC);
  px(ctx, ax-10, ay+1, d); px(ctx, ax-9, ay+1, d); // tip shadow
  px(ctx, ax-7,  ay,   d); // top-tip shadow
  px(ctx, ax-2, ay,   v); px(ctx, ax-4, ay+1, v);  // vein
  px(ctx, ax-3, ay+2, v); px(ctx, ax-1, ay+3, v);
}

function drawLeafR(ctx, ax, ay, lC) {
  const d = shade(lC, -30); const v = shade(lC, +50);
  for (let x = ax; x <= ax+5;  x++) px(ctx, x, ay,   lC);
  for (let x = ax; x <= ax+10; x++) px(ctx, x, ay+1, lC);
  for (let x = ax; x <= ax+7;  x++) px(ctx, x, ay+2, lC);
  for (let x = ax; x <= ax+3;  x++) px(ctx, x, ay+3, lC);
  px(ctx, ax+10, ay+1, d); px(ctx, ax+9, ay+1, d);
  px(ctx, ax+7,  ay,   d);
  px(ctx, ax+2, ay,   v); px(ctx, ax+4, ay+1, v);
  px(ctx, ax+3, ay+2, v); px(ctx, ax+1, ay+3, v);
}

function drawBud(ctx, cx, cy, fC, lC) {
  const d = shade(fC, -35); const l = shade(fC, +40);
  // Sepal
  px(ctx, cx-1, cy+5, lC); px(ctx, cx+2, cy+5, lC);
  px(ctx, cx,   cy+4, lC); px(ctx, cx+1, cy+4, lC); px(ctx, cx-2, cy+4, lC); px(ctx, cx+3, cy+4, lC);
  // Bud petals
  rect(ctx, cx-1, cy+1, 4, 4, fC);
  rect(ctx, cx,   cy,   2, 1, d);   // tip dark
  px(ctx, cx-1, cy+1, d); px(ctx, cx+2, cy+1, d); // sides
  px(ctx, cx,   cy+1, l); px(ctx, cx+1, cy+2, l); // highlight
}

// ── Sprite: plant (rows 0–27) ────────────────────────────────────
function drawPlant(ctx, type, growth, sad) {
  if (!type || growth <= 0) return;
  const p = PLANTS[type];
  const sC  = sad ? shade(p.stemC,   -25) : p.stemC;
  const fC  = sad ? shade(p.flowerC, -70) : p.flowerC;
  const lC  = sad ? shade(p.leafC,   -25) : p.leafC;
  const cC  = sad ? shade(p.centerC, -70) : p.centerC;
  const sHi = shade(sC, +35);

  const stage = growth < 0.15 ? 1
    : growth < 0.45 ? 2
    : growth < 0.70 ? 3
    : growth < 0.90 ? 4
    : 5;

  // ── Stage 1: tiny hook sprout
  if (stage === 1) {
    px(ctx, 23, 26, sC); px(ctx, 24, 26, sC);
    px(ctx, 25, 25, sC); px(ctx, 23, 25, sHi, 0.6);
    return;
  }

  // ── Stem (shared by stages 2-5)
  const stemTop = stage === 2 ? 20 : stage === 3 ? 14 : stage === 4 ? 8 : 12;
  for (let y = stemTop; y <= 27; y++) {
    px(ctx, 23, y, sC);
    px(ctx, 24, y, sC);
    px(ctx, 22, y, sHi, 0.35);
  }

  // ── Stage 2: small cotyledon sprout
  if (stage === 2) {
    if (!sad) {
      // Left cotyledon
      rect(ctx, 16, 21, 7, 1, lC); rect(ctx, 14, 22, 9, 1, lC); rect(ctx, 16, 23, 7, 1, lC);
      px(ctx, 14, 22, shade(lC,-25)); px(ctx, 22, 22, shade(lC,-25));
      px(ctx, 17, 22, shade(lC,+40));
      // Right cotyledon
      rect(ctx, 24, 21, 8, 1, lC); rect(ctx, 24, 22, 10, 1, lC); rect(ctx, 24, 23, 8, 1, lC);
      px(ctx, 33, 22, shade(lC,-25));
      px(ctx, 26, 22, shade(lC,+40));
    } else {
      // Drooping
      rect(ctx, 14, 23, 9, 2, lC); rect(ctx, 24, 23, 9, 2, lC);
      px(ctx, 13, 24, shade(lC,-20)); px(ctx, 33, 24, shade(lC,-20));
    }
    return;
  }

  // ── Stage 3: medium plant with real leaves
  if (stage === 3) {
    if (!sad) {
      drawLeafL(ctx, 22, 16, lC);
      drawLeafR(ctx, 25, 20, lC);
    } else {
      drawLeafL(ctx, 22, 18, lC);
      drawLeafR(ctx, 25, 21, lC);
    }
    if (!sad) { px(ctx, 23, 13, fC); px(ctx, 24, 13, fC); }
    return;
  }

  // ── Stage 4: tall with bud
  if (stage === 4) {
    if (!sad) {
      drawLeafL(ctx, 22, 11, lC);
      drawLeafR(ctx, 25, 16, lC);
      drawBud(ctx, 22, 3, fC, lC);
    } else {
      drawLeafL(ctx, 22, 13, lC);
      drawLeafR(ctx, 25, 18, lC);
      // Drooping bud
      rect(ctx, 18, 8, 4, 4, fC);
      px(ctx, 17, 9, fC); px(ctx, 17, 10, fC);
      px(ctx, 18, 8, shade(fC,-35));
    }
    return;
  }

  // ── Stage 5: full bloom
  drawLeafL(ctx, 22, 15, lC);
  drawLeafR(ctx, 25, 19, lC);
  if (!sad) {
    drawFlower(ctx, type, fC, cC, lC);
  } else {
    drawFlowerSad(ctx, type, fC, cC, lC);
  }
  if (growth >= 1 && !sad) {
    px(ctx, 6,  3,  '#ffffff', 0.9);
    px(ctx, 40, 7,  '#ffffff', 0.9);
    px(ctx, 4,  14, p.flowerC, 0.55);
    px(ctx, 42, 4,  p.flowerC, 0.55);
    px(ctx, 8,  9,  '#ffffff', 0.5);
  }
}

// ── Flower shapes (48×48, flower in top ~13 rows, cx=24) ─────────
function drawFlower(ctx, type, fC, cC, lC) {
  const D = shade(fC, -50);
  const L = shade(fC, +45);
  const H = shade(fC, +80);

  if (type === 'rose') {
    // 12×9 layered rose, top-left at (18, 1)
    const x = 18, y = 1;
    // Outer dark ring
    rect(ctx, x+1, y,   10, 1, D);
    rect(ctx, x+1, y+8, 10, 1, D);
    rect(ctx, x,   y+1,  1, 7, D);
    rect(ctx, x+11,y+1,  1, 7, D);
    // Petal separation nicks on outer ring
    px(ctx, x+4, y,   D); px(ctx, x+7, y,   D);
    px(ctx, x+4, y+8, D); px(ctx, x+7, y+8, D);
    px(ctx, x,   y+3, D); px(ctx, x,   y+6, D);
    px(ctx, x+11,y+3, D); px(ctx, x+11,y+6, D);
    // Main fill
    rect(ctx, x+1, y+1, 10, 7, fC);
    // Inner lighter zone
    rect(ctx, x+2, y+2,  8, 5, L);
    rect(ctx, x+1, y+3,  1, 3, L);
    rect(ctx, x+10,y+3,  1, 3, L);
    // Center zone
    rect(ctx, x+3, y+2,  6, 5, H);
    rect(ctx, x+4, y+3,  4, 3, shade(fC, +90));
    // Gold center
    rect(ctx, x+5, y+3,  2, 3, cC);
    px(ctx, x+5, y+3, shade(cC, +40)); px(ctx, x+6, y+3, shade(cC, +40));
  }

  else if (type === 'sunflower') {
    // Center at (21, 5), size 6×6
    const ox = 21, oy = 5;
    const pD = shade(fC, -20);
    // 8 petals (each 3×4 or 4×3)
    rect(ctx, ox+1, oy-4,  4, 4, fC); px(ctx, ox+1,oy-4,pD); px(ctx, ox+4,oy-4,pD); // top
    rect(ctx, ox+1, oy+6,  4, 4, fC);                                                  // bottom
    rect(ctx, ox-4, oy+1,  4, 4, fC); px(ctx, ox-4,oy+1,pD); px(ctx, ox-4,oy+4,pD); // left
    rect(ctx, ox+6, oy+1,  4, 4, fC);                                                  // right
    // Diagonals (3×3)
    rect(ctx, ox-3, oy-3, 3, 3, fC); px(ctx, ox-3,oy-3,pD);
    rect(ctx, ox+6, oy-3, 3, 3, fC); px(ctx, ox+8,oy-3,pD);
    rect(ctx, ox-3, oy+6, 3, 3, fC); px(ctx, ox-3,oy+8,pD);
    rect(ctx, ox+6, oy+6, 3, 3, fC);
    // Center brown circle (7×7 rounded)
    rect(ctx, ox,   oy,   6, 6, cC);
    rect(ctx, ox-1, oy+1, 8, 4, cC);
    rect(ctx, ox+1, oy-1, 4, 8, cC);
    // Seed texture
    for (let dy = 0; dy < 6; dy++)
      for (let dx = 0; dx < 6; dx++)
        if ((dx+dy)%2===0) px(ctx, ox+dx, oy+dy, shade(cC,+35));
    px(ctx, ox+1, oy+1, shade(cC,+65)); px(ctx, ox+2, oy+1, shade(cC,+65));
  }

  else if (type === 'tulip') {
    // Cup shape, 10×11 at (19, 0)
    const x = 19, y = 0;
    const inner = shade(fC, -15);
    // Three petal tips at top
    px(ctx, x+1,y,   fC); px(ctx, x+2,y,   fC); // left tip
    px(ctx, x+4,y-1, D);  px(ctx, x+5,y-1, D);  // center tip (dark = behind)
    px(ctx, x+7,y,   fC); px(ctx, x+8,y,   fC); // right tip
    // Main cup body
    rect(ctx, x,   y+1, 10, 8, fC);
    rect(ctx, x+1, y+9,  8, 1, fC);
    // Outer shading
    rect(ctx, x,   y+1,  1, 8, D);   // left shadow
    rect(ctx, x+9, y+1,  1, 8, D);   // right shadow
    rect(ctx, x+1, y+9,  8, 1, D);   // bottom
    // Interior — darker inside cup opening
    rect(ctx, x+2, y+4,  6, 5, inner);
    // Highlight stripe
    rect(ctx, x+2, y+1,  2, 8, L);
    px(ctx, x+2,y+1, H); px(ctx, x+3,y+1, H);
  }

  else if (type === 'carrot') {
    // Green fronds + orange body, centered around x=22
    const cx2 = 22;
    // Six green fronds
    const fronds = [cx2-5, cx2-2, cx2+1, cx2+4];
    fronds.forEach((fx, i) => {
      const h = 4 - (i % 2); // alternating heights
      rect(ctx, fx, 0, 2, h, lC);
      px(ctx, fx, 0,   shade(lC, +40));
      px(ctx, fx-1, h-1, lC); px(ctx, fx+2, h-2, lC); // spread
    });
    // Carrot body (inverted triangle, 8 wide → 2)
    for (let i = 0; i < 10; i++) {
      const w = Math.max(2, 9 - i);
      const bx = cx2 - Math.floor(w/2);
      rect(ctx, bx, 4+i, w, 1, fC);
      if (i === 0) { px(ctx,bx,4,L); px(ctx,bx+1,4,L); }
      if (i > 5) px(ctx, bx+w-1, 4+i, D);
    }
  }

  else if (type === 'tomato') {
    // Two round tomatoes side by side
    const drawTomato = (tx, ty, r) => {
      rect(ctx, tx+1, ty,   r-2, 1, fC);
      rect(ctx, tx,   ty+1, r,   r-2, fC);
      rect(ctx, tx+1, ty+r-1, r-2, 1, fC);
      px(ctx, tx+1, ty+1, L); px(ctx, tx+2, ty+1, L); // highlight
      px(ctx, tx+r-2, ty+r-2, D);                      // shadow
      // Calyx
      rect(ctx, tx+1, ty-2, r-2, 2, lC);
      px(ctx, tx, ty-1, lC); px(ctx, tx+r-1, ty-1, lC);
      px(ctx, tx+2, ty-2, shade(lC,+30));
    };
    drawTomato(13, 5, 7);
    drawTomato(21, 4, 6);
    // Stem connecting them
    rect(ctx, 19, 3, 3, 2, lC);
  }

  else if (type === 'pumpkin') {
    // Three lobes, centered at x=24
    const x = 16, y = 2;
    const H2 = shade(fC, +50); const D2 = shade(fC, -35);
    // Left lobe
    rect(ctx, x,   y+1,  5, 8, fC); rect(ctx, x+1, y,   3, 10, fC);
    px(ctx, x,   y+1, D2); px(ctx, x+3, y,   D2); // shadow edges
    px(ctx, x+1, y+1, H2); px(ctx, x+1, y+2, H2); // highlight
    // Middle lobe (taller)
    rect(ctx, x+5, y-1,  6, 10, fC); rect(ctx, x+6, y-2,  4,  2, fC);
    px(ctx, x+5, y-1, D2); px(ctx, x+10,y-1, D2);
    px(ctx, x+6, y,   H2); px(ctx, x+7, y,   H2);
    // Right lobe
    rect(ctx, x+11,y+1,  5, 8, fC); rect(ctx, x+12,y,   3, 10, fC);
    px(ctx, x+15,y+1, D2); px(ctx, x+11,y,   D2);
    px(ctx, x+12,y+1, H2);
    // Rib lines between lobes
    for (let ry = y; ry <= y+9; ry++) {
      px(ctx, x+5,  ry, D2);
      px(ctx, x+11, ry, D2);
    }
    // Stem
    px(ctx, 23, y-2, lC); px(ctx, 24, y-2, lC);
    px(ctx, 23, y-3, lC); px(ctx, 24, y-3, lC);
    px(ctx, 25, y-3, shade(lC,+30)); // little curl
    px(ctx, 26, y-2, shade(lC,+30));
  }
}

function drawFlowerSad(ctx, type, fC, cC, lC) {
  const D = shade(fC, -45);
  // All sad flowers shift down-left (drooping)
  if (type === 'rose') {
    const x = 14, y = 4;
    rect(ctx, x+1,y,8,1,D); rect(ctx, x+1,y+7,8,1,D);
    rect(ctx, x,y+1,1,6,D); rect(ctx, x+9,y+1,1,6,D);
    rect(ctx, x+1,y+1,8,6,fC);
    rect(ctx, x+2,y+2,6,4,shade(fC,+30));
    rect(ctx, x+4,y+3,2,2,cC);
  } else if (type === 'tulip') {
    const x = 13, y = 5;
    rect(ctx, x,y+1,9,7,fC); rect(ctx, x+1,y+8,7,1,fC);
    rect(ctx, x,y+1,1,7,D); rect(ctx, x+9,y+1,1,7,D);
    rect(ctx, x+1,y+1,2,6,shade(fC,+40));
  } else if (type === 'sunflower') {
    const ox = 18, oy = 6;
    px(ctx,ox+1,oy-3,fC); px(ctx,ox+2,oy-3,fC);
    px(ctx,ox-2,oy+1,fC); px(ctx,ox-2,oy+2,fC);
    px(ctx,ox+5,oy,fC);   px(ctx,ox+6,oy+1,fC);
    px(ctx,ox,oy+4,fC);   px(ctx,ox+1,oy+5,fC);
    rect(ctx, ox,oy,5,4,cC); rect(ctx,ox-1,oy+1,7,2,cC); rect(ctx,ox+2,oy-1,2,6,cC);
  } else {
    // Generic drooping for carrot/tomato/pumpkin
    const x = 13, y = 4;
    rect(ctx, x+1,y,8,1,D); rect(ctx, x+1,y+8,8,1,D);
    rect(ctx, x,y+1,1,7,D); rect(ctx, x+9,y+1,1,7,D);
    rect(ctx, x+1,y+1,8,7,fC);
    px(ctx, x+2,y+1,shade(fC,+40));
  }
}

// ── Render a single pot canvas ───────────────────────────────────
function renderPot(pot) {
  const canvas = pot._canvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Background (matches page)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Sky
  rect(ctx, 0, 0,  W, 12, '#7ec8e3');
  rect(ctx, 0, 12, W, 6,  '#b0dff0');
  // Clouds
  rect(ctx, 3,  2, 7, 2, '#e8f8ff'); px(ctx, 4,  1, '#e8f8ff'); px(ctx, 8,  1, '#e8f8ff');
  rect(ctx, 30, 4, 6, 2, '#e8f8ff'); px(ctx, 31, 3, '#e8f8ff'); px(ctx, 34, 3, '#e8f8ff');
  // Grass strip
  rect(ctx, 0, 18, W, 10, '#5ab830');
  rect(ctx, 0, 18, W, 2,  '#78d848');
  // Grass blades
  for (let gx = 1; gx < W; gx += 3) {
    px(ctx, gx,   17, '#78d848');
    px(ctx, gx+1, 16, '#5ab830');
  }

  const plant = pot.plant;
  if (plant) drawPlant(ctx, plant.type, plant.growth, plant.sad);
  drawPot(ctx, !!(plant?.sad));
}

// ── Build garden grid DOM ────────────────────────────────────────
function buildGrid() {
  const grid = document.getElementById('garden-grid');
  grid.innerHTML = '';
  G.pots.forEach(pot => {
    const el = document.createElement('div');
    el.className = 'pot';
    el.id = `pot-${pot.id}`;
    el.innerHTML = `
      <canvas width="${W}" height="${H}"></canvas>
      <div class="plant-name">Empty</div>
      <div class="growth-bar"><div class="growth-bar-fill" style="width:0%"></div></div>
      <div class="status-icon"></div>
    `;
    el.addEventListener('click', () => clickPot(pot.id));
    grid.appendChild(el);
  });
}

function updatePotEl(pot) {
  const el = document.getElementById(`pot-${pot.id}`);
  if (!el) return;
  pot._canvas = el.querySelector('canvas');
  renderPot(pot);

  const nameEl = el.querySelector('.plant-name');
  const fillEl = el.querySelector('.growth-bar-fill');
  const iconEl = el.querySelector('.status-icon');

  if (pot.plant) {
    const p = PLANTS[pot.plant.type];
    const pct = Math.round(pot.plant.growth * 100);
    nameEl.textContent = p.name;
    fillEl.style.width = `${pct}%`;
    fillEl.style.background = pot.plant.growth >= 1 ? '#f5c542'
      : pot.plant.sad ? '#e57373'
      : '#4caf50';
    iconEl.textContent = pot.plant.growth >= 1 ? '✨'
      : pot.plant.sad ? '💧'
      : pot.plant.lastWatered === todayStr() ? '✓'
      : '';
  } else {
    nameEl.textContent = 'Empty';
    fillEl.style.width = '0%';
    fillEl.style.background = '#4caf50';
    iconEl.textContent = '';
  }
}

// ── Sidebar renderers ────────────────────────────────────────────
function renderSeedList() {
  const list = document.getElementById('seed-list');
  list.innerHTML = '';
  const keys = Object.keys(PLANTS).filter(k => (G.inv[k] || 0) > 0);
  if (keys.length === 0) {
    list.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted)">No seeds — visit the shop!</div>';
    return;
  }
  keys.forEach(k => {
    const p = PLANTS[k];
    const el = document.createElement('div');
    el.className = 'seed-item' + (G.selectedSeed === k ? ' selected' : '');
    el.innerHTML = `<span>${p.emoji} ${p.name}</span><span class="seed-qty">×${G.inv[k]}</span>`;
    el.addEventListener('click', () => {
      G.selectedSeed = G.selectedSeed === k ? null : k;
      renderSeedList();
      addLog(G.selectedSeed ? `Selected <span>${p.name}</span> seed` : 'Seed deselected');
    });
    list.appendChild(el);
  });
}

function renderShopList() {
  const list = document.getElementById('shop-list');
  list.innerHTML = '';
  SHOP.forEach(item => {
    const el = document.createElement('div');
    el.className = 'shop-item';
    const can = G.coins >= item.price;
    const label = item.type === 'seed' ? `${PLANTS[item.key].emoji} ${item.label}` : `🪴 ${item.label}`;
    el.innerHTML = `
      <span>${label}</span>
      <button ${can ? '' : 'disabled'}>${item.price}g</button>
    `;
    el.querySelector('button').addEventListener('click', () => buy(item));
    list.appendChild(el);
  });
}

function renderHUD() {
  document.getElementById('hud-coins').textContent = G.coins;
  const total = Object.values(G.inv).reduce((a, b) => a + b, 0);
  document.getElementById('hud-seeds').textContent = total;
  const day = daysBetween(G.startDate, todayStr()) + 1;
  document.getElementById('hud-day').textContent = day;
}

function renderAll() {
  renderHUD();
  renderSeedList();
  renderShopList();
  G.pots.forEach(p => updatePotEl(p));
}

// ── Log ──────────────────────────────────────────────────────────
function addLog(msg) {
  G.log.unshift(msg);
  if (G.log.length > 20) G.log.pop();
  const el = document.getElementById('log');
  el.innerHTML = G.log.map(l => `<p>${l}</p>`).join('');
}

// ── Game actions ─────────────────────────────────────────────────
function clickPot(id) {
  const pot = G.pots.find(p => p.id === id);
  if (!pot) return;

  if (!pot.plant) {
    if (!G.selectedSeed) {
      showModal('Empty pot', 'Choose a seed from your inventory first, then click a pot.', [
        { label: 'Got it', primary: true, action: closeModal },
      ]);
      return;
    }
    if (!G.inv[G.selectedSeed]) {
      showModal('No seeds!', `You're out of ${PLANTS[G.selectedSeed].name} seeds. Visit the shop!`, [
        { label: 'OK', primary: true, action: closeModal },
      ]);
      return;
    }
    doPlant(pot, G.selectedSeed);
    return;
  }

  if (pot.plant.growth >= 1) {
    const p = PLANTS[pot.plant.type];
    showModal(`Harvest ${p.emoji} ${p.name}`, `Your ${p.name} is fully grown!\nHarvest for ${p.reward} coins?`, [
      { label: 'Harvest!', primary: true,  action: () => { doHarvest(pot); closeModal(); } },
      { label: 'Not yet',  primary: false, action: closeModal },
    ]);
    return;
  }

  if (pot.plant.lastWatered === todayStr()) {
    const p = PLANTS[pot.plant.type];
    const pct = Math.round(pot.plant.growth * 100);
    const extra = pot.plant.sad ? '\nStill a bit sad — keep watering every day!' : '';
    showModal(`${p.emoji} ${p.name}`, `Already watered today! Growth: ${pct}%${extra}`, [
      { label: 'OK', primary: true, action: closeModal },
    ]);
    return;
  }

  doWater(pot);
}

function doPlant(pot, seedKey) {
  const p = PLANTS[seedKey];
  G.inv[seedKey]--;
  const growPerDay = 1 / p.days;
  pot.plant = {
    type: seedKey,
    plantedDate: todayStr(),
    lastWatered: todayStr(),
    growth: growPerDay, // planting day counts as first watering
    sad: false,
  };
  addLog(`Planted <span>${p.emoji} ${p.name}</span> in pot ${pot.id + 1}`);
  saveGame();
  renderAll();
}

function doWater(pot) {
  const p = PLANTS[pot.plant.type];
  const growPerDay = 1 / p.days;
  pot.plant.growth = Math.min(1, pot.plant.growth + growPerDay);
  pot.plant.lastWatered = todayStr();
  pot.plant.sad = false;
  addLog(`Watered <span>${p.emoji} ${p.name}</span> 💧 (${Math.round(pot.plant.growth * 100)}%)`);
  saveGame();
  renderAll();
}

function doHarvest(pot) {
  const p = PLANTS[pot.plant.type];
  G.coins += p.reward;
  addLog(`Harvested <span>${p.emoji} ${p.name}</span> → +${p.reward} coins! 🎉`);
  pot.plant = null;
  saveGame();
  renderAll();
}

function buy(item) {
  if (G.coins < item.price) return;
  G.coins -= item.price;
  if (item.type === 'seed') {
    G.inv[item.key] = (G.inv[item.key] || 0) + 1;
    addLog(`Bought <span>${PLANTS[item.key].name} seed</span> for ${item.price}g`);
  } else if (item.type === 'pot') {
    G.pots.push({ id: G.pots.length, plant: null });
    buildGrid();
    G.pots.forEach(p => updatePotEl(p));
    addLog(`Added a <span>new pot</span> to the garden!`);
  }
  saveGame();
  renderAll();
}

// ── Modal ────────────────────────────────────────────────────────
function showModal(title, body, buttons) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = body;
  const acts = document.getElementById('modal-actions');
  acts.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.label;
    if (b.primary) btn.classList.add('primary');
    btn.addEventListener('click', b.action);
    acts.appendChild(btn);
  });
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target.id === 'modal-overlay') closeModal();
});

// ── Debug helpers ────────────────────────────────────────────────
function dbgGrowAll() {
  G.pots.forEach(pot => {
    if (!pot.plant || pot.plant.growth >= 1) return;
    const growPerDay = 1 / PLANTS[pot.plant.type].days;
    pot.plant.growth = Math.min(1, pot.plant.growth + growPerDay);
    pot.plant.lastWatered = todayStr();
    pot.plant.sad = false;
  });
  addLog('[debug] All plants advanced one day');
  saveGame();
  renderAll();
}

function dbgReadyAll() {
  G.pots.forEach(pot => {
    if (!pot.plant) return;
    pot.plant.growth = 1;
    pot.plant.lastWatered = todayStr();
    pot.plant.sad = false;
  });
  addLog('[debug] All plants set to ready');
  saveGame();
  renderAll();
}

function dbgAddCoins() {
  G.coins += 50;
  addLog('[debug] +50 coins');
  saveGame();
  renderAll();
}

function dbgReset() {
  if (!confirm('Reset all save data?')) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

// ── Boot ─────────────────────────────────────────────────────────
loadGame();
initPots(4);
buildGrid();
renderAll();
addLog('Welcome to <span>Zelie\'s Garden</span>! 🌱');
