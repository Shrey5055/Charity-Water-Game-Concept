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

export function initRunner() {
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

export function stopRunner() {
  if (frameId) cancelAnimationFrame(frameId);
}

export function isRunnerDead() {
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
    rctx.font = 'bold 13px Inter, sans-serif';
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
