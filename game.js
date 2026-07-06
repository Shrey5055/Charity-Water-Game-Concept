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
