/* ════════════════════════════════════════════════════
   EVERY DROP COUNTS — runner.js (Phase 1: The Walk)
   ════════════════════════════════════════════════════ */
const Runner = (() => {
  const RC = document.getElementById('runner-canvas');
  const ctx = RC.getContext('2d');
  const W = 700, H = 468;
  RC.width = W; RC.height = H;

  let runner, obstacles, groundY, speed, frameId, frame, spawnT, spawnI;
  let bgX = 0;
  let statShown = {};
  let cfg = DIFF.normal;

  const FACTS = {
    400: '1 in 10 people lack clean water',
    900: 'Women walk 6 km daily for water',
    1800: 'Girls miss school to collect water',
    3000: '$30 gives 1 person water for life'
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }

  function drawSky() {
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, W, H - 160);
    ctx.fillStyle = '#FFC107'; ctx.beginPath(); ctx.arc(580, 60, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    [[80, 40, 90, 22], [220, 55, 70, 18], [400, 35, 100, 24], [550, 70, 60, 16]].forEach(([x, y, cw, ch]) => {
      rr(ctx, x, y, cw, ch, ch / 2); ctx.fill();
      rr(ctx, x + 10, y - 12, cw - 20, ch, ch / 2); ctx.fill();
    });
  }

  function drawGround() {
    ctx.fillStyle = '#C8A96E'; ctx.fillRect(0, H - 160, W, 160);
    ctx.fillStyle = '#A08050'; ctx.fillRect(0, H - 100, W, 100);
    ctx.fillStyle = '#8C6830'; ctx.fillRect(0, H - 80, W, 4);
    ctx.strokeStyle = '#7A5820'; ctx.lineWidth = 2; ctx.setLineDash([30, 20]);
    for (let x = (frame * speed * .5) % 50 - 50; x < W + 60; x += 50) { ctx.beginPath(); ctx.moveTo(x, H - 78); ctx.lineTo(x + 30, H - 78); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.fillStyle = '#5A7A5A';
    ctx.fillRect(W - 60, H - 160, 8, 40); ctx.fillRect(W - 52, H - 150, 8, 30);
    ctx.beginPath(); ctx.moveTo(W - 65, H - 160); ctx.lineTo(W - 56, H - 180); ctx.lineTo(W - 47, H - 160); ctx.fill();
  }

  function drawRunner() {
    const r = runner, t = frame;
    const la = r.onGround ? Math.sin(t * .3) * .5 : 0;
    const aa = r.onGround ? Math.cos(t * .3) * .4 : -.3;
    ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h);
    if (r.dead) ctx.rotate(Math.min(r.dt * .08, Math.PI / 2));
    // Jerry can
    ctx.fillStyle = '#2BA4DB'; ctx.fillRect(12, -r.h + 4, 12, 18);
    ctx.fillStyle = '#9FE1CB'; ctx.fillRect(13, -r.h + 5, 3, 4);
    if (!r.dead) { ctx.fillStyle = 'rgba(43,164,219,.5)'; ctx.fillRect(12, -r.h + 14 + Math.sin(t * .4) * 2, 12, 6); }
    // body
    ctx.fillStyle = r.dead ? '#993C1D' : '#1D9E75'; ctx.fillRect(-r.w / 2 + 2, -r.h + 18, r.w - 4, r.h - 22);
    // head
    ctx.fillStyle = '#E8C87A'; ctx.beginPath(); ctx.arc(0, -r.h + 12, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = r.dead ? '#993C1D' : '#FFC107';
    ctx.beginPath(); ctx.arc(0, -r.h + 8, 10, Math.PI, 0); ctx.fill();
    ctx.fillRect(-10, -r.h + 8, 20, 4);
    // legs
    ctx.strokeStyle = r.dead ? '#993C1D' : '#0F6E56'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    if (!r.dead) {
      ctx.save(); ctx.rotate(la);
      ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(-6, 22); ctx.stroke();
      ctx.fillStyle = '#0F6E56'; ctx.fillRect(-10, 18, 14, 6); ctx.restore();
      ctx.save(); ctx.rotate(-la);
      ctx.beginPath(); ctx.moveTo(5, -6); ctx.lineTo(6, 22); ctx.stroke();
      ctx.fillStyle = '#0F6E56'; ctx.fillRect(-4, 18, 14, 6); ctx.restore();
    } else {
      ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(-10, 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, -6); ctx.lineTo(12, 16); ctx.stroke();
    }
    ctx.save(); ctx.rotate(aa);
    ctx.beginPath(); ctx.moveTo(-4, -r.h + 28); ctx.lineTo(-16, -r.h + 44); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.rotate(-aa + .3);
    ctx.beginPath(); ctx.moveTo(4, -r.h + 28); ctx.lineTo(10, -r.h + 46); ctx.stroke(); ctx.restore();
    ctx.restore();
  }

  function drawObstacle(ob) {
    ctx.save(); ctx.translate(ob.x, groundY + ob.h);
    if (ob.t === 0) {
      ctx.fillStyle = '#888780'; ctx.beginPath(); ctx.ellipse(0, 0, ob.w / 2, ob.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#B4B2A9'; ctx.beginPath(); ctx.ellipse(-4, -4, ob.w / 4, ob.h / 4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (ob.t === 1) {
      ctx.fillStyle = '#3A6048'; ctx.fillRect(-6, -ob.h, 12, ob.h); ctx.fillRect(-16, -ob.h * .7, 10, ob.h * .3); ctx.fillRect(6, -ob.h * .5, 10, ob.h * .25);
      ctx.fillStyle = '#4A7C59'; ctx.fillRect(-4, -ob.h, 8, ob.h);
    } else {
      ctx.fillStyle = '#7A5820'; ctx.beginPath(); ctx.ellipse(0, 4, ob.w / 2, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(43,164,219,.6)'; ctx.beginPath(); ctx.ellipse(0, 2, ob.w / 2 - 4, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function collides(r, ob) {
    const rx = r.x + 4, ry = r.y - r.h + 8, rw = r.w - 8, rh = r.h - 10;
    const ox = ob.x - ob.w / 2, oy = groundY - ob.h;
    return rx < ox + ob.w && rx + rw > ox && ry < oy + ob.h && ry + rh > oy;
  }

  function jump() {
    if (!runner || runner.dead) return;
    if (runner.onGround && runner.canJump) {
      runner.vy = -14; runner.onGround = false; runner.canJump = false;
      Sound.jump();
    }
  }

  function loop() {
    if (G.phase !== 'runner') return;
    frame++;
    ctx.clearRect(0, 0, W, H);
    bgX = (bgX - speed * .5 + W) % W;
    drawSky();
    // mountains
    ctx.fillStyle = '#4A7C59';
    for (let i = 0; i < 3; i++) { const mx = ((i * 250 - bgX * .4) % (W + 300) + W + 300) % (W + 300) - 100; ctx.beginPath(); ctx.moveTo(mx, H - 160); ctx.lineTo(mx + 130, H - 260); ctx.lineTo(mx + 260, H - 160); ctx.fill(); }
    ctx.fillStyle = '#3A6048';
    for (let i = 0; i < 3; i++) { const mx = ((i * 220 + 100 - bgX * .3) % (W + 300) + W + 300) % (W + 300) - 100; ctx.beginPath(); ctx.moveTo(mx, H - 160); ctx.lineTo(mx + 110, H - 220); ctx.lineTo(mx + 220, H - 160); ctx.fill(); }
    drawGround();

    if (!runner.dead) {
      runner.vy += .7; runner.y += runner.vy;
      if (runner.y >= groundY) { runner.y = groundY; runner.vy = 0; runner.onGround = true; }
      speed = (4 + Math.min(frame / 600, 5)) * cfg.speedMult;
      spawnI = Math.max(30, (90 - Math.floor(frame / 200) * 5) * cfg.spawnMult);
      if (++spawnT >= spawnI) {
        const types = [{ t: 0, w: 30, h: 26 }, { t: 1, w: 22, h: 48 }, { t: 2, w: 50, h: 16 }];
        const tp = types[Math.floor(Math.random() * types.length)];
        obstacles.push({ x: W + 50, ...tp });
        spawnT = 0;
      }
      for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= speed;
        if (obstacles[i].x < -80) { obstacles.splice(i, 1); continue; }
        if (collides(runner, obstacles[i])) {
          runner.dead = true; runner.vy = -8;
          Sound.hit();
          G.distM = Math.floor(frame * speed * .05);
          G.drops = Math.floor(G.distM * .8 * cfg.dropMult);
          setTimeout(() => {
            document.getElementById('go-dist').textContent = G.distM + 'm';
            document.getElementById('over-overlay').classList.add('active');
          }, 800);
          break;
        }
      }
      G.drops = Math.floor(frame * speed * .04 * cfg.dropMult);
      G.distM = Math.floor(frame * speed * .05);
      document.getElementById('hud-drops').textContent = G.drops;
      document.getElementById('hud-dist').textContent = G.distM + ' m';
      G.checkMilestones(G.drops);
      Object.keys(FACTS).forEach(k => {
        const km = parseInt(k);
        if (G.distM >= km && !statShown[km]) { statShown[km] = true; showBanner(FACTS[km]); }
      });
      if (G.distM >= cfg.goalDist) G.toTransition();
    } else {
      runner.dt++;
      runner.vy += .7; runner.y += runner.vy;
      if (runner.y > H + 60 && runner.dt > 40) { cancelAnimationFrame(frameId); return; }
      obstacles.forEach(ob => ob.x -= speed * .3);
    }
    obstacles.forEach(drawObstacle);
    drawRunner();
    if (frame < 70) {
      ctx.fillStyle = 'rgba(255,193,7,.9)';
      ctx.font = 'bold 13px DM Sans,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAP  OR  PRESS  SPACE  TO  JUMP', W / 2, H - 18);
      ctx.textAlign = 'left';
    }
    frameId = requestAnimationFrame(loop);
  }

  let bannerTO;
  function showBanner(txt) {
    const b = document.getElementById('stat-banner');
    b.textContent = '💧 ' + txt; b.classList.add('show');
    clearTimeout(bannerTO);
    bannerTO = setTimeout(() => b.classList.remove('show'), 3000);
  }

  document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump(); } });
  document.addEventListener('keyup', e => { if (e.code === 'Space' && runner) runner.canJump = true; });
  RC.addEventListener('click', () => { if (runner) runner.canJump = true; jump(); });
  RC.addEventListener('touchstart', e => { e.preventDefault(); if (runner) runner.canJump = true; jump(); }, { passive: false });
  document.addEventListener('keydown', e => {
    if (e.code === 'Enter' && G.phase === 'runner') {
      const ov = document.getElementById('over-overlay');
      if (ov.classList.contains('active')) G.toTransition();
    }
  });

  return {
    init() {
      cfg = G.cfg();
      groundY = H - 80; speed = 4 * cfg.speedMult; frame = 0; bgX = 0; spawnT = 0; spawnI = 80;
      statShown = {}; obstacles = [];
      runner = { x: 100, y: groundY, w: 28, h: 48, vy: 0, onGround: true, dead: false, dt: 0, canJump: true };
      document.getElementById('over-overlay').classList.remove('active');
      document.getElementById('hud-drops').textContent = '0';
      document.getElementById('hud-dist').textContent = '0 m';
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(loop);
    },
    stop() { if (frameId) cancelAnimationFrame(frameId); }
  };
})();