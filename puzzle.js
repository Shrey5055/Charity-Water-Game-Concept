/* ════════════════════════════════════════════════════
   EVERY DROP COUNTS — puzzle.js (Phase 2: Pipe Puzzle)
   NOTE: the puzzle.js you uploaded was an accidental copy of
   runner.js (they were byte-for-byte identical). This is the
   real Phase 2 logic, rebuilt from the working version inside
   your index.html.
   ════════════════════════════════════════════════════ */
const Puzzle = (() => {
  const ROWS = 6, COLS = 7;

  /*
    Each pipe is described by which of its 4 sides are OPEN.
    Rotating 90° CW transforms: L→T, T→R, R→B, B→L
    Pipe shapes (at rotation 0):
      'h'  : left + right   (straight horizontal ─)
      'v'  : top  + bottom  (straight vertical   │)
      'tl' : top  + left    (corner ╝)
      'tr' : top  + right   (corner ╚)
      'bl' : bottom + left  (corner ╗)
      'br' : bottom + right (corner ╔)
  */
  function openings(type, rot) {
    const base = {
      'h': new Set(['L', 'R']),
      'v': new Set(['T', 'B']),
      'tl': new Set(['T', 'L']),
      'tr': new Set(['T', 'R']),
      'bl': new Set(['B', 'L']),
      'br': new Set(['B', 'R']),
    }[type];
    const cwMap = { L: 'T', T: 'R', R: 'B', B: 'L' };
    let s = new Set(base);
    for (let i = 0; i < (rot % 4); i++) {
      s = new Set([...s].map(d => cwMap[d]));
    }
    return s;
  }

  // Are cells (r1,c1) and (r2,c2) hydraulically connected?
  function linked(r1, c1, r2, c2, grid) {
    const a = grid[r1]?.[c1], b = grid[r2]?.[c2];
    if (!a || !b) return false;
    const ao = (a.type === 'src' || a.type === 'vil') ? new Set(['L', 'R', 'T', 'B']) : openings(a.type, a.rot);
    const bo = (b.type === 'src' || b.type === 'vil') ? new Set(['L', 'R', 'T', 'B']) : openings(b.type, b.rot);
    if (r1 === r2 && c2 === c1 + 1) return ao.has('R') && bo.has('L');
    if (r1 === r2 && c2 === c1 - 1) return ao.has('L') && bo.has('R');
    if (c1 === c2 && r2 === r1 + 1) return ao.has('B') && bo.has('T');
    if (c1 === c2 && r2 === r1 - 1) return ao.has('T') && bo.has('B');
    return false;
  }

  // BFS from source (0,0)
  function floodFill(grid) {
    const visited = new Set(['0,0']);
    const q = ['0,0'];
    while (q.length) {
      const key = q.shift();
      const [r, c] = key.split(',').map(Number);
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
        const nk = `${nr},${nc}`;
        if (visited.has(nk)) return;
        if (linked(r, c, nr, nc, grid)) { visited.add(nk); q.push(nk); }
      });
    }
    return visited;
  }

  /*
    Guaranteed solution path: (0,0)src → ... → (5,6)vil
    Every non-path cell is randomized, so it never blocks the solution
    but also never solves itself by accident.
  */
  const PATH = [
    [0, 1, 'h'], [0, 2, 'bl'], [1, 2, 'v'], [2, 2, 'tr'],
    [2, 3, 'h'], [2, 4, 'bl'], [3, 4, 'v'], [4, 4, 'tr'],
    [4, 5, 'h'], [4, 6, 'bl'],
  ];
  const TYPES = ['h', 'v', 'tl', 'tr', 'bl', 'br'];

  let grid = [], timer, timeLeft, solved, moveCount;

  function buildGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++)
        grid[r][c] = { type: TYPES[Math.floor(Math.random() * TYPES.length)], rot: Math.floor(Math.random() * 4) };
    }
    grid[0][0] = { type: 'src', rot: 0 };
    grid[ROWS - 1][COLS - 1] = { type: 'vil', rot: 0 };
    PATH.forEach(([r, c, type]) => {
      const extraRots = Math.floor(Math.random() * 3) + 1; // guaranteed shuffled
      grid[r][c] = { type, rot: extraRots % 4, isPath: true };
    });
  }

  function drawPipe(canvas, type, rot, wet) {
    const s = canvas.width, cx = s / 2, cy = s / 2, t = 10;
    const pc = wet ? '#2BA4DB' : 'rgba(255,255,255,.28)';
    const cvs = canvas.getContext('2d');
    cvs.clearRect(0, 0, s, s);
    const op = openings(type, rot);
    cvs.strokeStyle = pc; cvs.lineWidth = t; cvs.lineCap = 'round';
    if (op.has('L')) { cvs.beginPath(); cvs.moveTo(cx, cy); cvs.lineTo(0, cy); cvs.stroke(); }
    if (op.has('R')) { cvs.beginPath(); cvs.moveTo(cx, cy); cvs.lineTo(s, cy); cvs.stroke(); }
    if (op.has('T')) { cvs.beginPath(); cvs.moveTo(cx, cy); cvs.lineTo(cx, 0); cvs.stroke(); }
    if (op.has('B')) { cvs.beginPath(); cvs.moveTo(cx, cy); cvs.lineTo(cx, s); cvs.stroke(); }
    cvs.fillStyle = wet ? '#9FE1CB' : 'rgba(255,255,255,.22)';
    cvs.beginPath(); cvs.arc(cx, cy, 4, 0, Math.PI * 2); cvs.fill();
    if (wet) {
      cvs.strokeStyle = 'rgba(159,225,203,.25)'; cvs.lineWidth = 2;
      cvs.beginPath(); cvs.arc(cx, cy, cx * .45, 0, Math.PI * 2); cvs.stroke();
    }
  }

  function render() {
    const gridEl = document.getElementById('pipe-grid');
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${COLS},min(7.2cqw,52px))`;
    gridEl.style.gridTemplateRows = `repeat(${ROWS},min(7.2cqw,52px))`;

    const wet = floodFill(grid);
    const pct = Math.round(wet.size / (ROWS * COLS) * 100);
    document.getElementById('conn-pct').textContent = pct + '%';

    if (wet.has(`${ROWS - 1},${COLS - 1}`) && !solved) {
      solved = true; clearInterval(timer);
      setTimeout(() => G.win(true, timeLeft), 500);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        const div = document.createElement('div');
        div.className = 'pcell';
        const isWet = wet.has(`${r},${c}`);

        if (cell.type === 'src') {
          div.classList.add('src');
          div.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 52 52"><text x="26" y="33" text-anchor="middle" font-size="20">🏔️</text><text x="26" y="47" text-anchor="middle" font-size="8" fill="#FFC107" font-weight="bold">SOURCE</text></svg>`;
        } else if (cell.type === 'vil') {
          div.classList.add('vil');
          div.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 52 52"><text x="26" y="33" text-anchor="middle" font-size="20">🏘️</text><text x="26" y="47" text-anchor="middle" font-size="8" fill="#1D9E75" font-weight="bold">VILLAGE</text></svg>`;
        } else {
          const cvs = document.createElement('canvas');
          cvs.width = 52; cvs.height = 52;
          drawPipe(cvs, cell.type, cell.rot, isWet);
          div.appendChild(cvs);
          const R = r, C = c;
          const rotate = () => {
            if (solved) return;
            grid[R][C].rot = (grid[R][C].rot + 1) % 4;
            G.moves++;
            Sound.rotate();
            document.getElementById('moves-count').textContent = G.moves;
            render();
          };
          div.addEventListener('click', rotate);
          div.addEventListener('touchstart', e => { e.preventDefault(); rotate(); }, { passive: false });
        }
        gridEl.appendChild(div);
      }
    }
  }

  return {
    init(drops, bonus) {
      solved = false; moveCount = 0; timeLeft = bonus;
      document.getElementById('p2-drops').textContent = drops;
      document.getElementById('moves-count').textContent = '0';
      document.getElementById('conn-pct').textContent = '0%';
      document.getElementById('puzzle-timer').textContent = bonus + 's';
      document.getElementById('puzzle-timer').classList.remove('urgent');
      buildGrid(); render();
      timer = setInterval(() => {
        if (solved) return;
        timeLeft--;
        const el = document.getElementById('puzzle-timer');
        el.textContent = timeLeft + 's';
        if (timeLeft <= 10) el.classList.add('urgent');
        if (timeLeft <= 0) { clearInterval(timer); G.win(false, 0); }
      }, 1000);
    },
    stop() { clearInterval(timer); },
    filledPct() {
      const wet = floodFill(grid);
      return wet.size / (ROWS * COLS) * 100;
    }
  };
})();