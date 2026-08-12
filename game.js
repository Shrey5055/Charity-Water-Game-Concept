/* ════════════════════════════════════════════════════
   EVERY DROP COUNTS — game.js (main controller)
   ════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════
//  DIFFICULTY MODES
//  Each mode meaningfully changes rules:
//   - speedMult / spawnMult -> how hard Phase 1 (the run) is
//   - goalDist              -> how far you must run to finish Phase 1 (win condition)
//   - bonusMult             -> multiplies the pipe-puzzle time limit
//   - dropMult              -> multiplies drops earned (scoring)
// ═══════════════════════════════════════════════════
const DIFF = {
  easy:   { label: 'Easy',   speedMult: 0.8, spawnMult: 1.3, goalDist: 4000, bonusMult: 1.4,  dropMult: 1.15 },
  normal: { label: 'Normal', speedMult: 1,   spawnMult: 1,   goalDist: 5000, bonusMult: 1,    dropMult: 1    },
  hard:   { label: 'Hard',   speedMult: 1.3, spawnMult: 0.7, goalDist: 6500, bonusMult: 0.65, dropMult: 0.85 }
};

// ═══════════════════════════════════════════════════
//  MILESTONES — tracked & displayed using an array + conditionals
// ═══════════════════════════════════════════════════
const MILESTONES = [
  { drops: 50,  msg: "50 drops! That's a day of clean water for one person." },
  { drops: 150, msg: '150 drops! Enough to help fund a hand-dug well.' },
  { drops: 300, msg: '300 drops! That could fund a rope-pump part.' },
  { drops: 500, msg: '500 drops! Full well-drilling milestone reached!' }
];
let milestonesShown = {};

function checkMilestones(drops) {
  MILESTONES.forEach(m => {
    if (drops >= m.drops && !milestonesShown[m.drops]) {
      milestonesShown[m.drops] = true;
      showMilestoneBanner(m.msg);
      Sound.milestone();
    }
  });
}

let milestoneTO;
function showMilestoneBanner(txt) {
  const b = document.getElementById('milestone-banner');
  if (!b) return;
  b.textContent = '🏅 ' + txt;
  b.classList.add('show');
  clearTimeout(milestoneTO);
  milestoneTO = setTimeout(() => b.classList.remove('show'), 3200);
}

// ── Screen helper ──────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Responsive resize (kept for parity with the shell's aspect-ratio sizing) ──
window.addEventListener('resize', () => {
  const shell = document.getElementById('shell');
  shell.style.width = '';
  shell.style.height = '';
});

// ── Title background ───────────────────────────────
(function () {
  const c = document.getElementById('title-bg');
  const ctx = c.getContext('2d');
  const W = 700, H = 520;
  ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5BA8D4'; ctx.fillRect(0, 200, W, 320);
  ctx.fillStyle = '#FFF5CC';
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.translate(600, 70); ctx.rotate(i * Math.PI / 4);
    ctx.fillRect(-2, -90, 4, 60); ctx.restore();
  }
  ctx.fillStyle = '#FFC107'; ctx.beginPath(); ctx.arc(600, 70, 36, 0, Math.PI * 2); ctx.fill();
  [[0, 300, 180, 120], [140, 310, 200, 140], [300, 290, 220, 150], [480, 305, 240, 130]].forEach(([x, y, w, h]) => {
    ctx.fillStyle = '#4A7C59';
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.fill();
  });
  [[60, 310, 160, 110], [250, 300, 190, 120], [430, 308, 200, 120]].forEach(([x, y, w, h]) => {
    ctx.fillStyle = '#3A6048';
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.fill();
  });
  ctx.fillStyle = '#fff';
  [[90, 310, 60], [340, 290, 70], [540, 305, 65]].forEach(([mx, my, hw]) => {
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - hw * .35, my + 40); ctx.lineTo(mx + hw * .35, my + 40); ctx.fill();
  });
  ctx.fillStyle = '#C8A96E'; ctx.fillRect(0, 400, W, 120);
  ctx.fillStyle = '#A08050'; ctx.fillRect(0, 440, W, 80);
  ctx.strokeStyle = '#8C6830'; ctx.lineWidth = 20; ctx.setLineDash([30, 20]);
  ctx.beginPath(); ctx.moveTo(0, 450); ctx.lineTo(W, 450); ctx.stroke();
  ctx.setLineDash([]);
})();

// ═══════════════════════════════════════════════════
//  GAME CONTROLLER
// ═══════════════════════════════════════════════════
const G = {
  drops: 0, distM: 0, moves: 0,
  phase: 'title', bonus: 20,
  difficulty: 'normal',
  currentSessionId: null,

  cfg() { return DIFF[this.difficulty]; },

  setDifficulty(level) {
    this.difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.diff === level);
    });
  },

  checkMilestones(drops) { checkMilestones(drops); },

  start() {
    Sound.unlock();
    this.drops = 0; this.distM = 0; this.moves = 0;
    milestonesShown = {};
    this.currentSessionId = Analytics.startSession(this.difficulty);
    this.phase = 'runner';
    showScreen('phase1-screen');
    Runner.init();
  },

  toTransition() {
    Runner.stop();
    document.getElementById('over-overlay').classList.remove('active');
    const raw = Math.min(90, Math.max(20, 20 + Math.floor(this.distM / 100) * 3));
    this.bonus = Math.round(raw * this.cfg().bonusMult);
    document.getElementById('trans-bonus').textContent = this.bonus + 's';
    this.phase = 'transition';
    showScreen('transition-screen');
  },

  startPuzzle() {
    this.phase = 'puzzle';
    showScreen('phase2-screen');
    Puzzle.init(this.drops, this.bonus);
  },

  win(solved, puzzleTime) {
    const bonus = solved ? puzzleTime * 5 : 0;
    const total = this.drops + bonus;
    checkMilestones(total);
    
    // Save analytics
    try {
      if (typeof Analytics !== 'undefined' && Analytics.endSession) {
        Analytics.endSession(this.currentSessionId, solved, puzzleTime, this.distM, this.moves);
        console.log('✅ Analytics saved:', { sessionId: this.currentSessionId, solved, puzzleTime });
      } else {
        console.warn('⚠️ Analytics not available');
      }
    } catch (e) {
      console.error('❌ Analytics error:', e);
    }
    
    document.getElementById('f-drops').textContent = total;
    document.getElementById('f-dist').textContent = this.distM + 'm';
    document.getElementById('f-moves').textContent = this.moves;
    document.getElementById('win-msg').textContent = solved
      ? `Clean water is flowing! You solved it with ${puzzleTime}s to spare.`
      : `Time's up, but ${Math.round(Puzzle.filledPct())}% of the village received water. Keep trying!`;
    document.getElementById('win-overlay').classList.add('active');
    Sound.win();
    fx.confetti();
    fx.ripple();
  },

  reset() {
    Runner.stop();
    Puzzle.stop();
    document.getElementById('win-overlay').classList.remove('active');
    document.getElementById('over-overlay').classList.remove('active');
    this.drops = 0; this.distM = 0; this.moves = 0;
    milestonesShown = {};
    this.currentSessionId = null;
    this.phase = 'title';
    showScreen('title-screen');
  }
};

// ═══════════════════════════════════════════════════
//  FX
// ═══════════════════════════════════════════════════
const fx = {
  confetti() {
    const sh = document.getElementById('shell');
    const cols = ['#FFC107', '#1D9E75', '#2BA4DB', '#fff', '#9FE1CB'];
    for (let i = 0; i < 70; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + '%';
      el.style.top = '-10px';
      el.style.background = cols[i % cols.length];
      el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      el.style.animationDelay = (Math.random() * .8) + 's';
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      sh.appendChild(el);
      setTimeout(() => el.remove(), 3600);
    }
  },
  ripple() {
    const rc = document.getElementById('ripple-canvas');
    const ctx = rc.getContext('2d');
    rc.style.opacity = '1';
    let t = 0;
    (function anim() {
      ctx.clearRect(0, 0, 700, 520);
      for (let i = 0; i < 4; i++) {
        const rad = t * 3 + i * 60; if (rad > 500) continue;
        ctx.strokeStyle = `rgba(43,164,219,${.3 * (1 - rad / 500)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(350, 260, rad, 0, Math.PI * 2); ctx.stroke();
      }
      t++;
      if (t < 120) requestAnimationFrame(anim);
      else { rc.style.opacity = '0'; ctx.clearRect(0, 0, 700, 520); }
    })();
  }
};

// ═══════════════════════════════════════════════════
//  DOM INTERACTION: clickable fact-drops on the title screen.
//  Each drop shows a charity: water fact in a toast, then
//  removes itself from the DOM (a real DOM element change/removal).
// ═══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fact-drop').forEach(btn => {
    btn.addEventListener('click', () => {
      const fact = btn.dataset.fact;
      const toast = document.getElementById('fact-toast');
      if (toast) {
        toast.textContent = '💧 ' + fact;
        toast.classList.add('show');
        clearTimeout(toast._to);
        toast._to = setTimeout(() => toast.classList.remove('show'), 3600);
      }
      Sound.drop();
      btn.classList.add('popped');
      btn.disabled = true;
      setTimeout(() => btn.remove(), 350); // element actually leaves the DOM
    });
  });
});