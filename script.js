// ── PHASE 2: PIPE PUZZLE ──
// Each pipe type stores its base connections as [left, right, top, bottom]
// Rotating 90° CW maps: left←bottom, right←top, top←left, bottom←right
// i.e. new[left]=old[bottom], new[right]=old[top], new[top]=old[left], new[bottom]=old[right]

const ROWS = 6, COLS = 7;

// Base connections (rot=0): [left, right, top, bottom]
const PIPE_BASE = {
  'straight-h': [1, 1, 0, 0],   // ─
  'straight-v': [0, 0, 1, 1],   // │
  'corner-bl':  [1, 0, 0, 1],   // ╗ opens left+bottom
  'corner-br':  [0, 1, 0, 1],   // ╔ opens right+bottom
  'corner-tl':  [1, 0, 1, 0],   // ╝ opens left+top
  'corner-tr':  [0, 1, 1, 0],   // ╚ opens right+top
};

const PIPE_TYPES = Object.keys(PIPE_BASE);

let grid = [], puzzle2timer, puzzleTimeLeft, puzzleSolved;

/**
 * Rotate a connections array [L,R,T,B] by `rot` steps of 90° CW.
 * One CW step: new L = old B, new R = old T, new T = old L, new B = old R
 */
function rotateConn(conn, rot) {
  let [L, R, T, B] = conn;
  for (let i = 0; i < (rot % 4); i++) {
    [L, R, T, B] = [B, T, L, R];
  }
  return [L, R, T, B];
}

function getConn(r, c) {
  const cell = grid[r]?.[c];
  if (!cell) return [0, 0, 0, 0];
  if (cell.type === 'source') return [1, 1, 1, 1];
  if (cell.type === 'village') return [1, 1, 1, 1];
  const base = PIPE_BASE[cell.type];
  if (!base) return [0, 0, 0, 0];
  return rotateConn(base, cell.rot);
}

// Two cells are connected if their facing ports both open toward each other
function isConnected(r1, c1, r2, c2) {
  // r2,c2 is to the RIGHT of r1,c1
  if (r1 === r2 && c2 === c1 + 1) return getConn(r1, c1)[1] === 1 && getConn(r2, c2)[0] === 1;
  // r2,c2 is to the LEFT of r1,c1
  if (r1 === r2 && c2 === c1 - 1) return getConn(r1, c1)[0] === 1 && getConn(r2, c2)[1] === 1;
  // r2,c2 is BELOW r1,c1
  if (c1 === c2 && r2 === r1 + 1) return getConn(r1, c1)[3] === 1 && getConn(r2, c2)[2] === 1;
  // r2,c2 is ABOVE r1,c1
  if (c1 === c2 && r2 === r1 - 1) return getConn(r1, c1)[2] === 1 && getConn(r2, c2)[3] === 1;
  return false;
}

// BFS flood fill from source at (0,0)
function floodFill() {
  const visited = new Set();
  const queue = ['0,0'];
  visited.add('0,0');
  while (queue.length) {
    const key = queue.shift();
    const [r, c] = key.split(',').map(Number);
    const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const nkey = `${nr},${nc}`;
      if (visited.has(nkey)) continue;
      if (isConnected(r, c, nr, nc)) {
        visited.add(nkey);
        queue.push(nkey);
      }
    }
  }
  return visited;
}

/**
 * Build the puzzle grid.
 *
 * The SOLUTION PATH goes: (0,0)→right→(0,1)→right→(0,2)→down→(1,2)→down→(2,2)→
 * right→(2,3)→right→(2,4)→down→(3,4)→down→(4,4)→right→(4,5)→right→(4,6)→down→(5,6)
 *
 * Each path cell gets the pipe type that naturally fits that direction pair,
 * at rot=0. Then they are given a random extra rotation so the player must fix them.
 */
function buildGrid() {
  // Initialize all cells as random noise pipes
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const type = PIPE_TYPES[Math.floor(Math.random() * PIPE_TYPES.length)];
      grid[r][c] = { type, rot: Math.floor(Math.random() * 4), isPath: false };
    }
  }

  // Place source and village
  grid[0][0] = { type: 'source', rot: 0, isPath: true };
  grid[ROWS-1][COLS-1] = { type: 'village', rot: 0, isPath: true };

  // Define the solution path with [row, col, pipe-type-that-fits, correct-rot]
  // conn = [L,R,T,B] at the given rotation must open to incoming + outgoing direction
  // For each segment: figure out which type+rot gives the right openings
  //
  // Path segments (direction from prev → direction to next):
  //  (0,0)src →R→ (0,1): needs [R], has right-bottom or straight-h → straight-h rot0 [1,1,0,0]
  //  (0,1) →R→ (0,2): straight-h rot0
  //  (0,2) →D→ (1,2): came from left(L), go down(B) → corner-tr rot0 = [0,1,1,0]? 
  //    No: came from right (c1→c2 going right means (0,1)→(0,2) the cell at (0,2) receives from left)
  //    At (0,2): in=left, out=bottom → needs L=1,B=1 → corner-bl rot0 = [1,0,0,1]
  //  (1,2) →D→ (2,2): in=top, out=bottom → straight-v rot0 [0,0,1,1]
  //  (2,2) →R→ (2,3): in=top, out=right → corner-tr rot0 = [0,1,1,0]
  //  (2,3) →R→ (2,4): in=left, out=right → straight-h rot0 [1,1,0,0]
  //  (2,4) →D→ (3,4): in=left, out=bottom → corner-bl rot0 [1,0,0,1]
  //  (3,4) →D→ (4,4): in=top, out=bottom → straight-v rot0 [0,0,1,1]
  //  (4,4) →R→ (4,5): in=top, out=right → corner-tr rot0 [0,1,1,0]
  //  (4,5) →R→ (4,6): in=left, out=right → straight-h rot0 [1,1,0,0]
  //  (4,6) →D→ (5,6)vil: in=left, out=bottom → corner-bl rot0 [1,0,0,1]

  const pathCells = [
    // [r, c, type, correctRot]
    [0, 1, 'straight-h', 0],
    [0, 2, 'corner-bl',  0],  // in=left, out=bottom  → L=1,B=1 → corner-bl rot0
    [1, 2, 'straight-v', 0],  // in=top,  out=bottom
    [2, 2, 'corner-tr',  0],  // in=top,  out=right   → T=1,R=1 → corner-tr rot0
    [2, 3, 'straight-h', 0],
    [2, 4, 'corner-bl',  0],  // in=left, out=bottom  → L=1,B=1
    [3, 4, 'straight-v', 0],
    [4, 4, 'corner-tr',  0],  // in=top,  out=right   → T=1,R=1
    [4, 5, 'straight-h', 0],
    [4, 6, 'corner-bl',  0],  // in=left, out=bottom  → L=1,B=1
  ];

  // Place path cells with a random rotation offset (so player must fix them)
  for (const [r, c, type, correctRot] of pathCells) {
    // Give 1-3 extra rotations from the correct position
    const extraRots = Math.floor(Math.random() * 3) + 1;
    grid[r][c] = {
      type,
      rot: (correctRot + extraRots) % 4,
      isPath: true,
      correctRot
    };
  }
}

// ── DRAWING ──
function drawPipe(ctx, type, rot, isWet, sz) {
  const cx = sz / 2, cy = sz / 2, thick = 10;
  const pipeColor = isWet ? '#2BA4DB' : 'rgba(255,255,255,0.25)';
  const glowColor  = isWet ? '#9FE1CB' : 'rgba(255,255,255,0.15)';

  ctx.clearRect(0, 0, sz, sz);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot % 4) * Math.PI / 2);
  ctx.translate(-cx, -cy);

  ctx.strokeStyle = pipeColor;
  ctx.lineWidth = thick;
  ctx.lineCap = 'round';

  if (type === 'straight-h' || type === 'straight-v') {
    // straight-h at rot=0: horizontal ─
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(sz, cy);
    ctx.stroke();
  } else {
    // All corner types at rot=0 have specific openings.
    // We draw corners as two line segments meeting at center.
    // Then rotation does the rest.
    let dx1, dy1, dx2, dy2; // directions from center to the two open ends

    if (type === 'straight-v') {
      // Won't reach here due to above branch, but just in case
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(sz, cy); ctx.stroke();
    } else if (type === 'corner-bl') {
      // opens: left(L) and bottom(B)
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cx, cy); ctx.stroke();   // left arm
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, sz); ctx.stroke();  // bottom arm
    } else if (type === 'corner-br') {
      // opens: right(R) and bottom(B)
      ctx.beginPath(); ctx.moveTo(sz, cy); ctx.lineTo(cx, cy); ctx.stroke();  // right arm
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, sz); ctx.stroke();  // bottom arm
    } else if (type === 'corner-tl') {
      // opens: left(L) and top(T)
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cx, cy); ctx.stroke();   // left arm
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, 0); ctx.stroke();   // top arm
    } else if (type === 'corner-tr') {
      // opens: right(R) and top(T)
      ctx.beginPath(); ctx.moveTo(sz, cy); ctx.lineTo(cx, cy); ctx.stroke();  // right arm
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, 0); ctx.stroke();   // top arm
    }

    // Inner arc for visual polish
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, sz * 0.28, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center dot
  ctx.fillStyle = isWet ? '#9FE1CB' : 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderGrid() {
  const gridEl = document.getElementById('pipe-grid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 52px)`;
  gridEl.style.gridTemplateRows    = `repeat(${ROWS}, 52px)`;

  const waterCells = floodFill();
  const pct = Math.round(waterCells.size / (ROWS * COLS) * 100);
  document.getElementById('connected-pct').textContent = pct + '%';

  // Check win condition: village reached
  const villageKey = `${ROWS-1},${COLS-1}`;
  if (waterCells.has(villageKey) && !puzzleSolved) {
    puzzleSolved = true;
    clearInterval(puzzle2timer);
    setTimeout(() => window.showWin(true), 600);
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      const div  = document.createElement('div');
      div.className = 'pipe-cell';
      const isWet = waterCells.has(`${r},${c}`);

      if (cell.type === 'source') {
        div.classList.add('source');
        div.innerHTML = `<svg width="52" height="52" viewBox="0 0 52 52">
          <text x="26" y="34" text-anchor="middle" font-size="22">🏔️</text>
          <text x="26" y="48" text-anchor="middle" font-size="9" fill="#FFC107" font-weight="bold">SOURCE</text>
        </svg>`;
      } else if (cell.type === 'village') {
        div.classList.add('village');
        div.innerHTML = `<svg width="52" height="52" viewBox="0 0 52 52">
          <text x="26" y="34" text-anchor="middle" font-size="22">🏘️</text>
          <text x="26" y="48" text-anchor="middle" font-size="9" fill="#1D9E75" font-weight="bold">VILLAGE</text>
        </svg>`;
      } else {
        const cvs = document.createElement('canvas');
        cvs.width  = 52;
        cvs.height = 52;
        const ctx2 = cvs.getContext('2d');
        drawPipe(ctx2, cell.type, cell.rot, isWet, 52);
        div.appendChild(cvs);

        const rLocal = r, cLocal = c;
        const rotatePipe = () => {
          if (puzzleSolved) return;
          grid[rLocal][cLocal].rot = (grid[rLocal][cLocal].rot + 1) % 4;
          window.moveCount = (window.moveCount || 0) + 1;
          document.getElementById('moves-count').textContent = window.moveCount;
          renderGrid();
        };
        div.addEventListener('click', rotatePipe);
        div.addEventListener('touchstart', e => { e.preventDefault(); rotatePipe(); }, { passive: false });
      }
      gridEl.appendChild(div);
    }
  }
}

// ── PUBLIC API ──
window.startPhase2 = function(drops, phaseBonus) {
  puzzleSolved = false;
  window.moveCount = 0;
  puzzleTimeLeft = phaseBonus;

  document.getElementById('p2-drops').textContent = drops;
  document.getElementById('moves-count').textContent = '0';
  document.getElementById('connected-pct').textContent = '0%';
  document.getElementById('puzzle-timer').textContent = phaseBonus + 's';
  document.getElementById('puzzle-timer').classList.remove('urgent');

  buildGrid();
  renderGrid();

  puzzle2timer = setInterval(() => {
    if (puzzleSolved) return;
    puzzleTimeLeft--;
    const el = document.getElementById('puzzle-timer');
    el.textContent = puzzleTimeLeft + 's';
    if (puzzleTimeLeft <= 10) el.classList.add('urgent');
    if (puzzleTimeLeft <= 0) {
      clearInterval(puzzle2timer);
      window.showWin(false);
    }
  }, 1000);
};

window.getPuzzleState = function() {
  return { puzzleTimeLeft, moveCount: window.moveCount || 0, floodFill };
};

window.stopPuzzleTimer = function() {
  clearInterval(puzzle2timer);
};

// ── PHASE 1: RUNNER ──
const RC  = document.getElementById('runner-canvas');
const rctx = RC.getContext('2d');
const W = 700, H = 468;

let runner, obstacles, groundY, gameSpeed, frameId, frameCount;
let statShown = {};
let bgX2 = 0;

const STATS = {
  500:  '1 in 10 people lack clean water',
  1000: 'Women walk 6km daily for water',
  2000: 'Girls miss school to collect water',
  3000: '$30 gives 1 person water for life'
};

function initRunner() {
  groundY = H - 80;
  gameSpeed = 4;
  frameCount = 0;
  bgX2 = 0;
  statShown = { 500: false, 1000: false, 2000: false, 3000: false };
  obstacles = [];
  runner = {
    x: 100, y: groundY, w: 28, h: 48,
    vy: 0, onGround: true,
    dead: false, deathTimer: 0,
    canJump: true
  };

  document.getElementById('gameover-overlay').classList.remove('active');
  document.getElementById('hud-drops').textContent = '0';
  document.getElementById('hud-dist').textContent  = '0m';

  if (frameId) cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(runnerLoop);
}

function stopRunner() {
  if (frameId) cancelAnimationFrame(frameId);
}

function isRunnerDead() {
  return runner && runner.dead;
}

// ── INPUT ──
function doJump() {
  if (!runner || runner.dead) return;
  if (runner.onGround && runner.canJump) {
    runner.vy = -14;
    runner.onGround = false;
    runner.canJump  = false;
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); doJump(); }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space' && runner) runner.canJump = true;
});
RC.addEventListener('click', () => {
  if (runner) runner.canJump = true;
  doJump();
});
RC.addEventListener('touchstart', e => {
  e.preventDefault();
  if (runner) runner.canJump = true;
  doJump();
}, { passive: false });

// ── DRAWING HELPERS ──
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

function drawSky(ctx) {
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, W, H - 160);
  ctx.fillStyle = '#FFC107';
  ctx.beginPath(); ctx.arc(580, 60, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  [[80,40,90,22],[220,55,70,18],[400,35,100,24],[550,70,60,16]].forEach(([x,y,cw,ch]) => {
    roundRect(ctx, x, y, cw, ch, ch/2); ctx.fill();
    roundRect(ctx, x+10, y-12, cw-20, ch, ch/2); ctx.fill();
  });
}

function drawGround(ctx) {
  ctx.fillStyle = '#C8A96E';
  ctx.fillRect(0, H-160, W, 160);
  ctx.fillStyle = '#A08050';
  ctx.fillRect(0, H-100, W, 100);
  ctx.fillStyle = '#8C6830';
  ctx.fillRect(0, H-80, W, 4);
  ctx.strokeStyle = '#7A5820';
  ctx.lineWidth = 2;
  ctx.setLineDash([30, 20]);
  for (let x = (frameCount * gameSpeed * 0.5) % 50 - 50; x < W + 60; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, H-78); ctx.lineTo(x+30, H-78); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = '#5A7A5A';
  ctx.fillRect(W-60, H-160, 8, 40);
  ctx.fillRect(W-52, H-150, 8, 30);
  ctx.beginPath(); ctx.moveTo(W-65,H-160); ctx.lineTo(W-56,H-180); ctx.lineTo(W-47,H-160); ctx.fill();
}

function drawRunner(ctx, r) {
  const x = r.x, y = r.y, w = r.w, h = r.h;
  const t  = frameCount;
  const la = r.onGround ? Math.sin(t * 0.3) * 0.5 : 0;
  const aa = r.onGround ? Math.cos(t * 0.3) * 0.4 : -0.3;

  ctx.save();
  ctx.translate(x + w/2, y + h);
  if (r.dead) ctx.rotate(Math.min(r.deathTimer * 0.08, Math.PI / 2));

  // Jerry can
  ctx.fillStyle = '#2BA4DB';
  ctx.fillRect(12, -h+4, 12, 18);
  ctx.fillStyle = '#9FE1CB';
  ctx.fillRect(13, -h+5, 3, 4);
  if (!r.dead) {
    ctx.fillStyle = 'rgba(43,164,219,0.5)';
    const slosh = Math.sin(t * 0.4) * 2;
    ctx.fillRect(12, -h+14+slosh, 12, 6);
  }

  // Body
  ctx.fillStyle = r.dead ? '#993C1D' : '#1D9E75';
  ctx.fillRect(-w/2+2, -h+18, w-4, h-22);

  // Head
  ctx.fillStyle = '#E8C87A';
  ctx.beginPath(); ctx.arc(0, -h+12, 10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = r.dead ? '#993C1D' : '#FFC107';
  ctx.beginPath(); ctx.arc(0, -h+8, 10, Math.PI, 0); ctx.fill();
  ctx.fillRect(-10, -h+8, 20, 4);

  // Legs
  ctx.strokeStyle = r.dead ? '#993C1D' : '#0F6E56';
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (!r.dead) {
    ctx.save(); ctx.rotate(la);
    ctx.beginPath(); ctx.moveTo(-5,-6); ctx.lineTo(-6,22); ctx.stroke();
    ctx.fillStyle = '#0F6E56'; ctx.fillRect(-10,18,14,6);
    ctx.restore();
    ctx.save(); ctx.rotate(-la);
    ctx.beginPath(); ctx.moveTo(5,-6); ctx.lineTo(6,22); ctx.stroke();
    ctx.fillStyle = '#0F6E56'; ctx.fillRect(-4,18,14,6);
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.moveTo(-5,-6); ctx.lineTo(-10,22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-6);  ctx.lineTo(12,16); ctx.stroke();
  }

  // Arms
  ctx.save(); ctx.rotate(aa);
  ctx.beginPath(); ctx.moveTo(-4,-h+28); ctx.lineTo(-16,-h+44); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.rotate(-aa+0.3);
  ctx.beginPath(); ctx.moveTo(4,-h+28); ctx.lineTo(10,-h+46); ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawObstacle(ctx, ob) {
  ctx.save();
  ctx.translate(ob.x, groundY + ob.h);
  if (ob.type === 0) {
    ctx.fillStyle = '#888780';
    ctx.beginPath(); ctx.ellipse(0, 0, ob.w/2, ob.h/2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#B4B2A9';
    ctx.beginPath(); ctx.ellipse(-4, -4, ob.w/4, ob.h/4, 0, 0, Math.PI*2); ctx.fill();
  } else if (ob.type === 1) {
    ctx.fillStyle = '#3A6048';
    ctx.fillRect(-6, -(ob.h), 12, ob.h);
    ctx.fillRect(-16, -(ob.h*0.7), 10, ob.h*0.3);
    ctx.fillRect(6, -(ob.h*0.5), 10, ob.h*0.25);
    ctx.fillStyle = '#4A7C59';
    ctx.fillRect(-4, -(ob.h), 8, ob.h);
  } else {
    ctx.fillStyle = '#7A5820';
    ctx.beginPath(); ctx.ellipse(0, 4, ob.w/2, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(43,164,219,0.6)';
    ctx.beginPath(); ctx.ellipse(0, 2, ob.w/2-4, 6, 0, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── OBSTACLE SPAWNING ──
function spawnObstacle() {
  const types = [
    { type: 0, w: 30, h: 26 },
    { type: 1, w: 22, h: 48 },
    { type: 2, w: 50, h: 16 }
  ];
  const t = types[Math.floor(Math.random() * types.length)];
  obstacles.push({ x: W + 50, ...t });
}

function checkCollision(r, ob) {
  const rx = r.x + 4, ry = r.y - r.h + 8, rw = r.w - 8, rh = r.h - 10;
  const ox = ob.x - ob.w/2, oy = groundY - ob.h, ow = ob.w, oh = ob.h;
  return rx < ox+ow && rx+rw > ox && ry < oy+oh && ry+rh > oy;
}

let spawnTimer    = 0;
let spawnInterval = 80;

// ── MAIN LOOP ──
function runnerLoop() {
  if (window.gamePhase !== 'phase1') return;
  frameCount++;
  rctx.clearRect(0, 0, W, H);

  bgX2 = (bgX2 - gameSpeed * 0.5 + W) % W;
  drawSky(rctx);

  // Mountains
  rctx.fillStyle = '#4A7C59';
  for (let i = 0; i < 3; i++) {
    const mx = ((i*250 - bgX2*0.4) % (W+300) + W+300) % (W+300) - 100;
    rctx.beginPath(); rctx.moveTo(mx,H-160); rctx.lineTo(mx+130,H-260); rctx.lineTo(mx+260,H-160); rctx.closePath(); rctx.fill();
  }
  rctx.fillStyle = '#3A6048';
  for (let i = 0; i < 3; i++) {
    const mx = ((i*220+100 - bgX2*0.3) % (W+300) + W+300) % (W+300) - 100;
    rctx.beginPath(); rctx.moveTo(mx,H-160); rctx.lineTo(mx+110,H-220); rctx.lineTo(mx+220,H-160); rctx.closePath(); rctx.fill();
  }

  drawGround(rctx);

  if (!runner.dead) {
    runner.vy += 0.7;
    runner.y  += runner.vy;
    if (runner.y >= groundY) {
      runner.y = groundY;
      runner.vy = 0;
      runner.onGround = true;
    }

    gameSpeed     = 4 + Math.min(frameCount / 600, 5);
    spawnInterval = Math.max(45, 90 - Math.floor(frameCount / 200) * 5);
    spawnTimer++;
    if (spawnTimer >= spawnInterval) { spawnObstacle(); spawnTimer = 0; }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= gameSpeed;
      if (obstacles[i].x < -80) { obstacles.splice(i, 1); continue; }
      if (checkCollision(runner, obstacles[i])) {
        runner.dead = true;
        runner.vy   = -8;
        window.distM = Math.floor(frameCount * gameSpeed * 0.05);
        window.drops = Math.floor(window.distM * 0.8);
        window.onRunnerDead && window.onRunnerDead();
        break;
      }
    }

    window.drops = Math.floor(frameCount * gameSpeed * 0.04);
    window.distM = Math.floor(frameCount * gameSpeed * 0.05);
    document.getElementById('hud-drops').textContent = window.drops;
    document.getElementById('hud-dist').textContent  = window.distM + 'm';

    Object.keys(STATS).forEach(km => {
      const k = parseInt(km);
      if (window.distM >= k && !statShown[k]) {
        statShown[k] = true;
        showStatBanner(STATS[k]);
      }
    });

    if (window.distM >= 5000) {
      window.onAutoComplete && window.onAutoComplete();
    }

  } else {
    runner.deathTimer++;
    runner.vy += 0.7;
    runner.y  += runner.vy;
    if (runner.y > H + 50 && runner.deathTimer > 40) {
      cancelAnimationFrame(frameId);
      return;
    }
    obstacles.forEach(ob => ob.x -= gameSpeed * 0.3);
  }

  obstacles.forEach(ob => drawObstacle(rctx, ob));
  drawRunner(rctx, runner);

  if (frameCount < 60) {
    rctx.fillStyle = 'rgba(255,193,7,0.9)';
    rctx.font = 'bold 13px DM Sans, sans-serif';
    rctx.textAlign = 'center';
    rctx.fillText('TAP OR PRESS SPACE TO JUMP', W/2, H-20);
    rctx.textAlign = 'left';
  }

  frameId = requestAnimationFrame(runnerLoop);
}

let statTimeout;
function showStatBanner(txt) {
  const b = document.getElementById('stat-banner');
  b.textContent = '💧 ' + txt;
  b.classList.add('show');
  clearTimeout(statTimeout);
  statTimeout = setTimeout(() => b.classList.remove('show'), 3000);
}

// ── GLOBAL GAME STATE ──
window.drops     = 0;
window.distM     = 0;
window.moveCount = 0;
window.gamePhase = 'title';
let phaseBonus = 20;

// ── TITLE BACKGROUND ──
(function drawTitleBg() {
  const c   = document.getElementById('title-bg-canvas');
  const ctx = c.getContext('2d');
  const W = 700, H = 520;

  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5BA8D4';
  ctx.fillRect(0, 200, W, 320);

  // Sun rays
  ctx.fillStyle = '#FFF5CC';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(600, 70);
    ctx.rotate(i * Math.PI / 4);
    ctx.fillRect(-2, -90, 4, 60);
    ctx.restore();
  }
  // Sun
  ctx.fillStyle = '#FFC107';
  ctx.beginPath(); ctx.arc(600, 70, 36, 0, Math.PI*2); ctx.fill();

  // Mountains
  ctx.fillStyle = '#4A7C59';
  [[0,300,180,120],[140,310,200,140],[300,290,220,150],[480,305,240,130]].forEach(([x,y,w,h])=>{
    ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = '#3A6048';
  [[60,310,160,110],[250,300,190,120],[430,308,200,120]].forEach(([x,y,w,h])=>{
    ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.closePath(); ctx.fill();
  });
  // Snow caps
  ctx.fillStyle = '#fff';
  [[90,310,60],[340,290,70],[540,305,65]].forEach(([mx,my,hw])=>{
    ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(mx-hw*0.35,my+40); ctx.lineTo(mx+hw*0.35,my+40); ctx.closePath(); ctx.fill();
  });

  // Ground
  ctx.fillStyle = '#C8A96E'; ctx.fillRect(0, 400, W, 120);
  ctx.fillStyle = '#A08050'; ctx.fillRect(0, 440, W, 80);

  // Path dashes
  ctx.strokeStyle = '#8C6830';
  ctx.lineWidth = 20;
  ctx.setLineDash([30, 20]);
  ctx.beginPath(); ctx.moveTo(0, 450); ctx.lineTo(W, 450); ctx.stroke();
  ctx.setLineDash([]);
})();

// ── SCREEN MANAGER ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── GAME FLOW ──
window.startGame = function() {
  window.drops     = 0;
  window.distM     = 0;
  window.moveCount = 0;
  window.gamePhase = 'phase1';
  showScreen('phase1-screen');

  // Set up callbacks for runner events
  window.onRunnerDead = () => {
    setTimeout(() => {
      document.getElementById('go-dist').textContent = window.distM + 'm';
      document.getElementById('gameover-overlay').classList.add('active');
    }, 800);
  };

  window.onAutoComplete = () => {
    window.gamePhase = 'transition';
    phaseBonus = 90;
    document.getElementById('trans-timer-display').textContent = phaseBonus + 's';
    showScreen('transition-screen');
  };

  window.initRunner();
};

window.triggerTransition = function() {
  window.stopRunner();
  window.gamePhase = 'transition';
  phaseBonus = Math.min(90, Math.max(20, 20 + Math.floor(window.distM / 100) * 3));
  document.getElementById('trans-timer-display').textContent = phaseBonus + 's';
  document.getElementById('gameover-overlay').classList.remove('active');
  showScreen('transition-screen');
};

window.startPhase2Wrapper = function() {
  window.gamePhase = 'phase2';
  showScreen('phase2-screen');
  window.startPhase2(window.drops, phaseBonus);
};

// ── WIN / GAME OVER ──
window.showWin = function(solved) {
  const state      = window.getPuzzleState();
  const bonus      = solved ? state.puzzleTimeLeft * 5 : 0;
  const totalDrops = window.drops + bonus;

  document.getElementById('final-drops').textContent = totalDrops;
  document.getElementById('final-dist').textContent  = window.distM + 'm';
  document.getElementById('final-moves').textContent = state.moveCount;
  document.getElementById('win-message').textContent = solved
    ? `Clean water is flowing! You solved it with ${state.puzzleTimeLeft}s to spare. You gave Amara's village a future.`
    : `Time ran out, but pipes were connected. Every effort counts!`;

  document.getElementById('win-overlay').classList.add('active');
  launchConfetti();
  playRipple();
};

window.resetGame = function() {
  document.getElementById('win-overlay').classList.remove('active');
  document.getElementById('gameover-overlay').classList.remove('active');
  window.stopPuzzleTimer && window.stopPuzzleTimer();
  window.stopRunner();
  window.gamePhase = 'title';
  window.drops = 0;
  window.distM = 0;
  window.moveCount = 0;
  showScreen('title-screen');
};

// ── EFFECTS ──
function launchConfetti() {
  const GC     = document.getElementById('game-container');
  const colors = ['#FFC107','#1D9E75','#2BA4DB','#ffffff','#9FE1CB'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left              = Math.random() * 100 + '%';
    el.style.top               = '-10px';
    el.style.background        = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    el.style.animationDelay    = (Math.random() * 0.8) + 's';
    el.style.transform         = `rotate(${Math.random() * 360}deg)`;
    GC.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

function playRipple() {
  const rc    = document.getElementById('ripple-canvas');
  const rctx2 = rc.getContext('2d');
  rc.style.opacity = '1';
  let rippleT = 0;
  function animRipple() {
    rctx2.clearRect(0, 0, 700, 520);
    for (let i = 0; i < 4; i++) {
      const rad = rippleT * 3 + i * 60;
      if (rad > 500) continue;
      rctx2.strokeStyle = `rgba(43,164,219,${0.3 * (1 - rad / 500)})`;
      rctx2.lineWidth   = 2;
      rctx2.beginPath(); rctx2.arc(350, 260, rad, 0, Math.PI * 2); rctx2.stroke();
    }
    rippleT++;
    if (rippleT < 120) requestAnimationFrame(animRipple);
    else { rc.style.opacity = '0'; rctx2.clearRect(0, 0, 700, 520); }
  }
  animRipple();
}

// ── KEYBOARD SHORTCUT: enter after death → transition ──
document.addEventListener('keydown', e => {
  if (e.code === 'Enter' && window.gamePhase === 'phase1') {
    const overlay = document.getElementById('gameover-overlay');
    if (overlay.classList.contains('active')) window.triggerTransition();
  }
});

// Expose runner functions as window globals (no ES module exports in single-file mode)
window.initRunner = initRunner;
window.stopRunner = stopRunner;
