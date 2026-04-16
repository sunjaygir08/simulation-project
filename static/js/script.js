/* ═══════════════════════════════════════════════
   SMART WAREHOUSE  –  script.js
═══════════════════════════════════════════════ */

// ── Hamburger nav ────────────────────────────
const hamburger = document.querySelector('.hamburger');
const navLinks  = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// ── Mark active nav link ─────────────────────
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.href === window.location.href) a.classList.add('active');
});

// ── Scroll reveal (Intersection Observer) ────
const observeReveal = () => {
  const els = document.querySelectorAll('.feature-card, .kpi-card, .chart-card, .team-card, .stat-chip');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => {
          e.target.style.opacity  = '1';
          e.target.style.transform = 'translateY(0)';
        }, i * 60);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    obs.observe(el);
  });
};
document.addEventListener('DOMContentLoaded', observeReveal);

/* ═══════════════════════════════════════════════
   DASHBOARD  –  Charts (Chart.js)
═══════════════════════════════════════════════ */
function initDashboardCharts() {
  if (typeof Chart === 'undefined') return;

  const primaryBlue = '#0052cc';
  const secondaryBlue = '#007bff';
  const skyBlue = '#0ea5e9';
  const gridColor  = 'rgba(0,82,204,0.12)';
  const textColor  = '#1a1a2e';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Inter', sans-serif";

  /* ── Throughput line chart ── */
  const throughputCtx = document.getElementById('throughputChart');
  if (throughputCtx) {
    const rawData = JSON.parse(throughputCtx.dataset.values || '[]');
    const labels  = rawData.map((_, i) => `${i * 2}:00`);

    new Chart(throughputCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label          : 'Orders / hr',
          data           : rawData,
          borderColor    : primaryBlue,
          backgroundColor: 'rgba(0,82,204,0.08)',
          borderWidth    : 3,
          pointBackgroundColor: primaryBlue,
          pointRadius    : 5,
          tension        : 0.4,
          fill           : true,
        }]
      },
      options: {
        responsive: true,
        plugins   : { legend: { display: false } },
        scales    : {
          x: { grid: { color: gridColor } },
          y: { grid: { color: gridColor }, beginAtZero: true },
        }
      }
    });
  }

  /* ── Order status doughnut chart ── */
  const statusCtx = document.getElementById('statusChart');
  if (statusCtx) {
    const completed = parseInt(statusCtx.dataset.completed || 0);
    const pending   = parseInt(statusCtx.dataset.pending   || 0);
    const failed    = parseInt(statusCtx.dataset.failed    || 0);

    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels  : ['Completed', 'Pending', 'Failed'],
        datasets: [{
          data           : [completed, pending, failed],
          backgroundColor: [skyBlue, primaryBlue, '#dc2626'],
          borderColor    : '#ffffff',
          borderWidth    : 3,
          hoverOffset    : 8,
        }]
      },
      options: {
        responsive : true,
        cutout     : '72%',
        plugins    : {
          legend: {
            position: 'bottom',
            labels  : { padding: 16, font: { size: 12, weight: '600' } }
          }
        }
      }
    });
  }

  /* ── Robot utilization bar chart ── */
  const robotCtx = document.getElementById('robotChart');
  if (robotCtx) {
    const values = JSON.parse(robotCtx.dataset.values || '[]');
    const labels = values.map((_, i) => `Robot ${i + 1}`);

    new Chart(robotCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label          : 'Utilization %',
          data           : values,
          backgroundColor: values.map(v =>
            v > 85 ? 'rgba(14,165,233,0.8)' :
            v > 65 ? 'rgba(0,82,204,0.8)' : 'rgba(0,123,255,0.7)'),
          borderColor    : values.map(v =>
            v > 85 ? skyBlue : v > 65 ? primaryBlue : secondaryBlue),
          borderWidth    : 2,
          borderRadius   : 8,
        }]
      },
      options: {
        responsive: true,
        plugins   : { legend: { display: false } },
        scales    : {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, max: 100, beginAtZero: true,
               ticks: { callback: v => v + '%' } },
        }
      }
    });
  }
}

/* ── Dashboard live refresh ── */
function initDashboardRefresh() {
  const btn = document.getElementById('refreshBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.textContent = '↻  Refreshing…';
    btn.disabled = true;

    try {
      const res  = await fetch('/api/dashboard-refresh');
      const data = await res.json();

      // update KPI values
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('kpi-active',   data.active_robots);
      set('kpi-idle',     data.idle_robots);
      set('kpi-completed',data.completed_orders);
      set('kpi-pending',  data.pending_orders);
      set('kpi-efficiency', data.system_efficiency + '%');
      set('kpi-avgtime',  data.avg_completion + ' steps');
      set('kpi-inventory', data.current_inventory);
      set('last-updated', data.last_updated);

    } catch (e) { console.error(e); }
    finally {
      btn.textContent = '↻  Refresh Data';
      btn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboardCharts();
  initDashboardRefresh();
});

/* ═══════════════════════════════════════════════
   SIMULATION  –  Canvas animation
═══════════════════════════════════════════════ */
(function SimulationCanvas() {
  const canvas = document.getElementById('sim-canvas');
  if (!canvas) return;

  const ctx   = canvas.getContext('2d');
  const COLS  = 12, ROWS = 10;
  const CELL  = 52;

  canvas.width  = COLS * CELL;
  canvas.height = ROWS * CELL;

  // ── Colors ──
  const C = {
    bg      : '#ffffff',
    grid    : 'rgba(0,82,204,0.08)',
    shelf   : 'rgba(0,82,204,0.12)',
    shelfBd : 'rgba(0,82,204,0.6)',
    exit    : 'rgba(14,165,233,0.18)',
    exitBd  : '#0052cc',
    robot   : ['#0052cc', '#007bff', '#0ea5e9', '#1e81f7', '#6c9de8'],
    robotGlow: ['rgba(0,82,204,0.3)', 'rgba(0,123,255,0.3)',
                'rgba(14,165,233,0.3)', 'rgba(30,129,247,0.3)', 'rgba(108,157,232,0.3)'],
    item    : '#0052cc',
    path    : 'rgba(0,82,204,0.1)',
  };

  // ── Shelves (fixed) ──
  const shelves = [];
  const used    = new Set();
  const EXIT    = { r: ROWS - 1, c: COLS - 1 };
  used.add(`${EXIT.r},${EXIT.c}`);

  while (shelves.length < 18) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    const k = `${r},${c}`;
    if (!used.has(k)) { shelves.push({r,c}); used.add(k); }
  }

  const shelfSet = new Set(shelves.map(s => `${s.r},${s.c}`));

  // ── Robots ──
  const NUM_ROBOTS = 4;
  let   simRunning = true;
  let   simSpeed   = 1;
  let   ordersCompleted = 0;
  let   totalOrders     = 0;
  let   animId;

  function randomShelf() { return shelves[Math.floor(Math.random() * shelves.length)]; }

  function heuristic(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  }

  function aStarPath(start, goal) {
    const openSet = [{r: start.r, c: start.c, g: 0, f: heuristic(start, goal), path: [start]}];
    const closedSet = new Set();
    const dirs = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const k = `${current.r},${current.c}`;

      if (current.r === goal.r && current.c === goal.c) return current.path;
      
      closedSet.add(k);

      for (const d of dirs) {
        const nr = current.r + d.r, nc = current.c + d.c;
        const nk = `${nr},${nc}`;

        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !closedSet.has(nk) && !shelfSet.has(nk)) {
          const g = current.g + 1;
          const f = g + heuristic({r: nr, c: nc}, goal);
          
          let existing = openSet.find(n => n.r === nr && n.c === nc);
          if (existing) {
            if (g < existing.g) {
              existing.g = g;
              existing.f = f;
              existing.path = [...current.path, {r: nr, c: nc}];
            }
          } else {
            openSet.push({r: nr, c: nc, g, f, path: [...current.path, {r: nr, c: nc}]});
          }
        }
      }
    }
    return [start];
  }

  function makeRobot(i) {
    const target = randomShelf();
    totalOrders++;
    return {
      id      : i,
      r       : 0,
      c       : i * Math.floor(COLS / NUM_ROBOTS),
      state   : 'moving',       // moving | carrying | idle
      target,
      path    : aStarPath({r:0,c:i*Math.floor(COLS/NUM_ROBOTS)}, target),
      pathIdx : 0,
      tickAcc : 0,
    };
  }

  const robots = Array.from({length: NUM_ROBOTS}, (_, i) => makeRobot(i));

  // ── Draw helpers ──
  function cellX(c) { return c * CELL; }
  function cellY(r) { return r * CELL; }

  function drawGrid() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = C.grid;
    ctx.lineWidth   = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,canvas.height); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(canvas.width,r*CELL); ctx.stroke();
    }
  }

  function drawShelves() {
    shelves.forEach(s => {
      ctx.fillStyle   = C.shelf;
      ctx.strokeStyle = C.shelfBd;
      ctx.lineWidth   = 0.8;
      roundRect(ctx, cellX(s.c)+3, cellY(s.r)+3, CELL-6, CELL-6, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle  = 'rgba(227,242,255,0.95)';
      ctx.font       = '10px Montserrat, sans-serif';
      ctx.textAlign  = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📦', cellX(s.c)+CELL/2, cellY(s.r)+CELL/2);
    });
  }

  function drawExit() {
    ctx.fillStyle   = C.exit;
    ctx.strokeStyle = C.exitBd;
    ctx.lineWidth   = 1;
    roundRect(ctx, cellX(EXIT.c)+2, cellY(EXIT.r)+2, CELL-4, CELL-4, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = '#ffffff';
    ctx.font         = '9px Montserrat, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', cellX(EXIT.c)+CELL/2, cellY(EXIT.r)+CELL/2);
  }

  function drawRobot(robot) {
    const px = cellX(robot.c) + CELL/2;
    const py = cellY(robot.r) + CELL/2;
    const col   = C.robot[robot.id % C.robot.length];
    const glow  = C.robotGlow[robot.id % C.robotGlow.length];

    // glow shadow
    ctx.shadowColor = col;
    ctx.shadowBlur  = 12;

    // body
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI*2);
    ctx.fill();

    // inner ring
    ctx.strokeStyle = 'rgba(7,21,40,0.45)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI*2);
    ctx.stroke();

    // carrying indicator
    if (robot.state === 'carrying') {
      ctx.fillStyle = C.item;
      ctx.shadowColor = C.item;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(px+10, py-10, 5, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';

    // ID label
    ctx.fillStyle    = '#00152c';
    ctx.font         = 'bold 9px Montserrat, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R' + (robot.id+1), px, py);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  // ── Robot tick ──
  function tickRobot(robot) {
    robot.tickAcc += simSpeed;
    if (robot.tickAcc < 8) return;
    robot.tickAcc = 0;

    if (robot.pathIdx < robot.path.length - 1) {
      const nextStep = robot.path[robot.pathIdx + 1];
      
      // Collision Avoidance: Check if another robot is at or moving to nextStep this tick
      let collision = false;
      for (const other of robots) {
        if (other.id !== robot.id) {
          // If another robot is currently at that cell
          if (other.r === nextStep.r && other.c === nextStep.c) {
            collision = true; break;
          }
        }
      }

      if (!collision) {
        robot.pathIdx++;
        robot.r = robot.path[robot.pathIdx].r;
        robot.c = robot.path[robot.pathIdx].c;
      }
    } else {
      // reached destination
      if (robot.state === 'moving') {
        robot.state = 'carrying';
        // now go to exit
        robot.path    = aStarPath({r:robot.r, c:robot.c}, EXIT);
        robot.pathIdx = 0;
      } else if (robot.state === 'carrying') {
        // delivered – pick new order
        ordersCompleted++;
        totalOrders++;
        robot.state = 'moving';
        const target  = randomShelf();
        robot.target  = target;
        robot.path    = aStarPath({r:robot.r,c:robot.c}, target);
        robot.pathIdx = 0;
      }
    }

    // Update live counters on page
    const el1 = document.getElementById('sim-completed');
    const el2 = document.getElementById('sim-total');
    const el3 = document.getElementById('sim-efficiency');
    if (el1) el1.textContent = ordersCompleted;
    if (el2) el2.textContent = totalOrders;
    if (el3) el3.textContent = totalOrders
      ? Math.round((ordersCompleted/totalOrders)*100) + '%' : '0%';
  }

  // ── Main loop ──
  function loop() {
    drawGrid();
    drawShelves();
    drawExit();

    if (simRunning) robots.forEach(tickRobot);
    robots.forEach(drawRobot);

    animId = requestAnimationFrame(loop);
  }

  loop();

  // ── Sync to Backend ──
  setInterval(() => {
    if (!simRunning) return;
    const active = robots.filter(r => r.state === 'carrying' || (r.state === 'moving' && r.pathIdx < r.path.length - 1)).length;
    const idle = NUM_ROBOTS - active;
    
    fetch('/api/simulation-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active_robots: active,
        idle_robots: idle,
        total_orders: totalOrders,
        completed_orders: ordersCompleted
      })
    }).catch(e => console.error("Sync error:", e));
  }, 1000);

  // ── Controls ──
  const startBtn  = document.getElementById('sim-start');
  const pauseBtn  = document.getElementById('sim-pause');
  const resetBtn  = document.getElementById('sim-reset');
  const speedSel  = document.getElementById('sim-speed');

  if (startBtn) startBtn.addEventListener('click', () => { simRunning = true; });
  if (pauseBtn) pauseBtn.addEventListener('click', () => { simRunning = false; });
  if (resetBtn) resetBtn.addEventListener('click', () => {
    ordersCompleted = 0; totalOrders = 0;
    robots.forEach((r, i) => { Object.assign(r, makeRobot(i)); });
  });
  if (speedSel) speedSel.addEventListener('change', () => {
    simSpeed = parseInt(speedSel.value);
  });
})();
