// ===============================
// ClassClash - Complete app.js
// ===============================

// -------------------------------
// In-Memory Data
// -------------------------------

let CLASS_DATA = [];

const classTimers = new Map();

function initializeTimer(cls) {
  classTimers.set(cls.id, {
    id: cls.id,
    name: cls.name,
    // Total saved time for this class (persists across sessions)
    savedSeconds: 0,
    // Current unsaved session seconds (accumulates while running or paused)
    sessionSeconds: 0,
    // Whether the clock is actively ticking right now
    running: false,
    // Timestamp when the current run started (for live elapsed calculation)
    startTimestamp: null,
    // "idle" | "running" | "stopped"
    state: "idle",
  });
}

CLASS_DATA.forEach(initializeTimer);

let currentView = "home";
let currentClassId = null;

// Single global interval that ticks the live display
let tickInterval = null;

function startTick() {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    if (currentView === "class-detail" && currentClassId) {
      const timer = getTimer(currentClassId);
      if (timer && timer.running) {
        updateTimerDisplay();
      }
    }
  }, 1000);
}

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

// -------------------------------
// Utilities
// -------------------------------

function formatDuration(seconds) {
  const total = Math.floor(seconds);
  const hrs  = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatShortDuration(seconds) {
  const total = Math.floor(seconds);
  const hrs  = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
  return `${mins}m`;
}

function getTimer(id) {
  return classTimers.get(id);
}

// Returns total saved time for a class
function getSavedSeconds(timer) {
  return timer?.savedSeconds || 0;
}

// Returns the current live session seconds (ticking if running, frozen if stopped)
function getLiveSessionSeconds(timer) {
  if (!timer) return 0;
  if (timer.running && timer.startTimestamp) {
    return timer.sessionSeconds + (Date.now() - timer.startTimestamp) / 1000;
  }
  return timer.sessionSeconds;
}

function getWeeklyTotal() {
  let total = 0;
  classTimers.forEach((t) => { total += getSavedSeconds(t); });
  return total;
}

function getTopClass() {
  let top = null;
  classTimers.forEach((t) => {
    const s = getSavedSeconds(t);
    if (!top || s > top.elapsed) top = { id: t.id, name: t.name, elapsed: s };
  });
  return top;
}

// -------------------------------
// Navigation
// -------------------------------

function updateActiveNav(view) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.getAttribute("data-view") === view);
  });
}

function setView(view, options = {}) {
  // If we're leaving a running class detail, pause the timer automatically
  if (currentView === "class-detail" && currentClassId) {
    const timer = getTimer(currentClassId);
    if (timer && timer.running) {
      timer.sessionSeconds += (Date.now() - timer.startTimestamp) / 1000;
      timer.startTimestamp = null;
      timer.running = false;
      timer.state = "stopped";
    }
  }

  stopTick();
  currentView = view;
  currentClassId = options.classId || null;
  updateActiveNav(view);
  render();
}

// -------------------------------
// Add Class
// -------------------------------

function addNewClass() {
  const name = prompt("Enter new class name:");
  if (!name || !name.trim()) return;

  const id = name.trim().toLowerCase().replace(/\s+/g, "-");

  if (classTimers.has(id)) {
    alert("A class with that name already exists.");
    return;
  }

  const newClass = { id, name: name.trim() };
  CLASS_DATA.push(newClass);
  initializeTimer(newClass);
  render();
}

// -------------------------------
// Timer: live display update (no full re-render needed)
// -------------------------------

function updateTimerDisplay() {
  const timer = getTimer(currentClassId);
  if (!timer) return;

  const sessionEl = document.getElementById("session-time");
  if (sessionEl) {
    sessionEl.textContent = formatDuration(getLiveSessionSeconds(timer));
  }
}

// -------------------------------
// Timer Actions
// -------------------------------

function timerStart(classId) {
  const timer = getTimer(classId);
  if (!timer) return;
  timer.running = true;
  timer.startTimestamp = Date.now();
  timer.state = "running";
  currentClassId = classId;
  renderClassDetail(classId);
  startTick();
}

function timerStop(classId) {
  const timer = getTimer(classId);
  if (!timer) return;
  timer.sessionSeconds += (Date.now() - timer.startTimestamp) / 1000;
  timer.startTimestamp = null;
  timer.running = false;
  timer.state = "stopped";
  stopTick();
  renderClassDetail(classId);
}

function timerResume(classId) {
  const timer = getTimer(classId);
  if (!timer) return;
  timer.running = true;
  timer.startTimestamp = Date.now();
  timer.state = "running";
  renderClassDetail(classId);
  startTick();
}

function timerSave(classId) {
  const timer = getTimer(classId);
  if (!timer) return;
  // Commit session seconds into the saved total
  timer.savedSeconds += timer.sessionSeconds;
  timer.sessionSeconds = 0;
  timer.startTimestamp = null;
  timer.running = false;
  timer.state = "idle";
  stopTick();
  renderClassDetail(classId);
}

function timerDiscard(classId) {
  const timer = getTimer(classId);
  if (!timer) return;
  timer.sessionSeconds = 0;
  timer.startTimestamp = null;
  timer.running = false;
  timer.state = "idle";
  stopTick();
  renderClassDetail(classId);
}

// -------------------------------
// Render Home
// -------------------------------

function renderHome() {
  const weeklyTotal = getWeeklyTotal();
  const top = getTopClass();

  const quickHtml = CLASS_DATA.map((cls) => {
    const saved = getSavedSeconds(getTimer(cls.id));
    return `
      <button class="quick-class" data-class-id="${cls.id}">
        <span class="quick-class-name">${cls.name}</span>
        <span class="quick-class-time">${formatShortDuration(saved)}</span>
      </button>`;
  }).join("");

  return `
    <header class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">This week</h2>
        <p class="page-subtitle">Your study overview across all classes.</p>
      </div>
      <div class="summary-badge">
        <span class="summary-label">Total time</span>
        <span class="summary-value">${formatDuration(weeklyTotal)}</span>
      </div>
    </header>

    ${top && top.elapsed > 0 ? `
    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Top class this week</h3>
      </div>
      <article class="card class-card" data-class-id="${top.id}">
        <header class="card-header">
          <h3 class="card-title">${top.name}</h3>
          <span class="pill">Most active</span>
        </header>
        <div class="time-display">${formatDuration(top.elapsed)}</div>
      </article>
    </section>` : ""}

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Quick classes</h3>
      </div>
      ${CLASS_DATA.length === 0
        ? `<div class="card"><p class="placeholder">No classes yet. Go to <strong>Classes</strong> and add your first one.</p></div>`
        : `<div class="quick-classes-row">${quickHtml}</div>`}
    </section>`;
}

// -------------------------------
// Render Classes
// -------------------------------

function renderClasses() {
  const weeklyTotal = getWeeklyTotal();

  const cards = CLASS_DATA.map((cls) => {
    const saved = getSavedSeconds(getTimer(cls.id));
    return `
      <article class="card class-card" data-class-id="${cls.id}">
        <header class="card-header">
          <div>
            <h3 class="card-title">${cls.name}</h3>
            <p class="card-meta">Total saved time</p>
          </div>
        </header>
        <div class="time-display">${formatShortDuration(saved)}</div>
        <button class="btn btn-ghost" data-action="open-class" data-class-id="${cls.id}">
          Open class
        </button>
      </article>`;
  }).join("");

  return `
    <header class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">All classes</h2>
        <p class="page-subtitle">See every class and how much you have studied this week.</p>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="summary-badge">
          <span class="summary-label">Total time</span>
          <span class="summary-value">${formatDuration(weeklyTotal)}</span>
        </div>
        <button class="btn btn-primary" data-action="add-class">+ Add Class</button>
      </div>
    </header>
    <section class="section">
      ${CLASS_DATA.length === 0
        ? `<div class="card"><p class="placeholder">No classes yet — hit <strong>+ Add Class</strong> to get started.</p></div>`
        : `<div class="grid">${cards}</div>`}
    </section>`;
}

// -------------------------------
// Render Class Detail
// Writes directly to #main-content so the tick interval can
// update just #session-time without a full re-render.
// -------------------------------

function renderClassDetail(classId) {
  const timer = getTimer(classId);
  const container = document.getElementById("main-content");
  if (!timer || !container) return;

  const saved   = getSavedSeconds(timer);
  const session = getLiveSessionSeconds(timer);

  let buttonsHtml = "";
  if (timer.state === "idle") {
    buttonsHtml = `
      <button class="btn btn-primary" data-action="timer-start" data-class-id="${classId}">
        Start Timer
      </button>`;
  } else if (timer.state === "running") {
    buttonsHtml = `
      <button class="btn btn-danger" data-action="timer-stop" data-class-id="${classId}">
        Stop Timer
      </button>`;
  } else if (timer.state === "stopped") {
    buttonsHtml = `
      <button class="btn btn-primary" data-action="timer-resume" data-class-id="${classId}">
        Resume Timer
      </button>
      <button class="btn btn-save" data-action="timer-save" data-class-id="${classId}">
        Save Timer
      </button>
      <button class="btn btn-ghost" data-action="timer-discard" data-class-id="${classId}">
        Discard
      </button>`;
  }

  container.innerHTML = `
    <style>
      .btn-danger {
        background: linear-gradient(135deg, #ff5b7a, #ff8fa0);
        color: #1a0008; font-weight: 600;
        box-shadow: 0 10px 28px rgba(255,91,122,.35);
        border: none; border-radius: 999px; padding: 8px 16px;
        font-size: .9rem; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
        transition: transform .08s, box-shadow .12s;
      }
      .btn-danger:hover { transform: translateY(-1px); box-shadow: 0 14px 35px rgba(255,91,122,.5); }
      .btn-save {
        background: linear-gradient(135deg, #00d084, #54f0b8);
        color: #001a0e; font-weight: 600;
        box-shadow: 0 10px 28px rgba(0,208,132,.35);
        border: none; border-radius: 999px; padding: 8px 16px;
        font-size: .9rem; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
        transition: transform .08s, box-shadow .12s;
      }
      .btn-save:hover { transform: translateY(-1px); box-shadow: 0 14px 35px rgba(0,208,132,.5); }
      .session-label { font-size: .8rem; color: var(--text-subtle); text-transform: uppercase; letter-spacing: .08em; margin: 0 0 4px; }
      .session-time  { font-size: 3rem; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -.02em; line-height: 1; }
      .saved-time-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 14px; border-radius: var(--radius-md);
        background: rgba(62,208,255,.07); border: 1px solid rgba(62,208,255,.15);
      }
      .saved-time-label { font-size: .82rem; color: var(--text-subtle); flex: 1; }
      .saved-time-value { font-size: .95rem; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
      .timer-state-pill {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 12px; border-radius: 999px; font-size: .78rem; font-weight: 600;
      }
      .state-idle    { background: rgba(165,179,217,.12); color: var(--text-subtle); }
      .state-running { background: rgba(0,208,132,.12);   color: #00d084; }
      .state-stopped { background: rgba(255,215,0,.12);   color: #ffd700; }
      .timer-controls { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
    </style>

    <header class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">${timer.name}</h2>
        <p class="page-subtitle">Track your focused study time.</p>
      </div>
      <div class="summary-badge">
        <span class="summary-label">Saved total</span>
        <span class="summary-value" id="saved-time-display">${formatDuration(saved)}</span>
      </div>
    </header>

    <section class="section">
      <div class="card stack" style="gap:20px;">

        <div>
          <p class="session-label">Session time</p>
          <div class="session-time" id="session-time">${formatDuration(session)}</div>
        </div>

        <div class="saved-time-row">
          <span class="saved-time-label">💾 Saved to ${timer.name}</span>
          <span class="saved-time-value" id="saved-time-value">${formatDuration(saved)}</span>
        </div>

        <div class="timer-controls">
          ${buttonsHtml}
        </div>

      </div>
    </section>`;
}

// -------------------------------
// Render Leaderboard
// -------------------------------

const LB_BASE = [
  { name: "Zara Kim",        tag: "@zkim",    emo: "🦊", time: "1:02.34", pts: 4820 },
  { name: "Marcus Webb",     tag: "@mwebb",   emo: "🐺", time: "1:04.11", pts: 4610 },
  { name: "Priya Sharma",    tag: "@priya_s", emo: "🦋", time: "1:05.88", pts: 4390 },
  { name: "Luca Bianchi",    tag: "@lucab",   emo: "🦅", time: "1:07.22", pts: 4105 },
  { name: "Aisha Diallo",    tag: "@adiallo", emo: "🐯", time: "1:09.55", pts: 3870 },
  { name: "Tom Clarke",      tag: "@tclarke", emo: "🦁", time: "1:10.90", pts: 3640 },
  { name: "Mei Lin",         tag: "@meilin",  emo: "🐼", time: "1:12.44", pts: 3410 },
  { name: "Carlos Ruiz",     tag: "@cruiz",   emo: "🐉", time: "1:14.03", pts: 3180 },
  { name: "Fatima Al-Nasri", tag: "@fatima",  emo: "🌙", time: "1:16.77", pts: 2950 },
  { name: "Jake Morrison",   tag: "@jakemo",  emo: "🐻", time: "1:18.50", pts: 2720 },
];

let lbRanked = [...LB_BASE];
let lbPrev   = {};

function lbMedalSVG(place) {
  const configs = {
    1: { rim: "#b8860b", fill0: "#ffe566", fill1: "#b8860b", ribbon: "#ffd700", num: "1", numClr: "#7a5000" },
    2: { rim: "#888fa0", fill0: "#e8ecf5", fill1: "#888fa0", ribbon: "#c0c8d8", num: "2", numClr: "#4a5060" },
    3: { rim: "#8b4a1a", fill0: "#f0a050", fill1: "#8b4a1a", ribbon: "#cd7f32", num: "3", numClr: "#5a2a05" },
  };
  const uid = `mg${place}_${Math.random().toString(36).slice(2, 6)}`;
  const c = configs[place];
  return `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="34" height="34">
      <defs>
        <radialGradient id="${uid}" cx="35%" cy="30%" r="60%">
          <stop offset="0%"   stop-color="${c.fill0}"/>
          <stop offset="100%" stop-color="${c.fill1}"/>
        </radialGradient>
      </defs>
      <path d="M18 20 L14 6 L22 11 L24 4 L26 11 L34 6 L30 20 Z" fill="${c.ribbon}" stroke="${c.rim}" stroke-width="1"/>
      <circle cx="24" cy="32" r="13" fill="${c.rim}" stroke="${c.ribbon}" stroke-width="1.5"/>
      <circle cx="24" cy="32" r="10" fill="url(#${uid})"/>
      <text x="24" y="37" text-anchor="middle" font-size="12" font-weight="800" font-family="system-ui" fill="${c.numClr}">${c.num}</text>
    </svg>`;
}

function lbPodiumHTML() {
  const slots = [
    { idx: 1, avatarCls: "lb-av-silver", blkCls: "lb-blk-silver" },
    { idx: 0, avatarCls: "lb-av-gold",   blkCls: "lb-blk-gold"   },
    { idx: 2, avatarCls: "lb-av-bronze", blkCls: "lb-blk-bronze" },
  ];
  return slots.map((s) => {
    const p = lbRanked[s.idx];
    if (!p) return "";
    const rank = s.idx + 1;
    return `
      <div class="lb-podium-slot">
        <div class="lb-podium-avatar ${s.avatarCls}">
          ${p.emo}
          <div class="lb-medal-pin">${lbMedalSVG(rank)}</div>
        </div>
        <div class="lb-podium-info">
          <div class="lb-podium-name">${p.name.split(" ")[0]}</div>
          <div class="lb-podium-score">${p.pts.toLocaleString()} pts</div>
        </div>
        <div class="lb-blk ${s.blkCls}">${rank}</div>
      </div>`;
  }).join("");
}

function lbTableHTML(filter = "") {
  const q = filter.toLowerCase();
  const rows = lbRanked
    .map((p, i) => ({ ...p, rank: i + 1 }))
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.tag.includes(q));

  const rankCell = (r) => {
    if (r === 1) return `<div class="lb-rank-cell lb-rc-g">${lbMedalSVG(1)}</div>`;
    if (r === 2) return `<div class="lb-rank-cell lb-rc-s">${lbMedalSVG(2)}</div>`;
    if (r === 3) return `<div class="lb-rank-cell lb-rc-b">${lbMedalSVG(3)}</div>`;
    return `<div class="lb-rank-cell lb-rc-n">${r}</div>`;
  };

  const chg = (name, cur) => {
    if (lbPrev[name] === undefined) return `<span class="lb-badge lb-same">— —</span>`;
    const d = lbPrev[name] - cur;
    if (d > 0) return `<span class="lb-badge lb-up">▲ ${d}</span>`;
    if (d < 0) return `<span class="lb-badge lb-down">▼ ${Math.abs(d)}</span>`;
    return `<span class="lb-badge lb-same">— Same</span>`;
  };

  const rCls = (r) => (r === 1 ? "lb-r1" : r === 2 ? "lb-r2" : r === 3 ? "lb-r3" : "");

  return rows.map((p, i) => `
    <div class="lb-row ${rCls(p.rank)}" style="animation-delay:${i * 0.04}s">
      ${rankCell(p.rank)}
      <div class="lb-player-cell">
        <div class="lb-p-avatar">${p.emo}</div>
        <div>
          <div class="lb-p-name">${p.name}</div>
          <div class="lb-p-tag">${p.tag}</div>
        </div>
      </div>
      <div class="lb-cv lb-col-time">${p.time}</div>
      <div class="lb-cv lb-col-pts">${p.pts.toLocaleString()}</div>
      <div>${chg(p.name, p.rank - 1)}</div>
    </div>`).join("");
}

function renderLeaderboard() {
  return `
    <header class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">Leaderboard</h2>
        <p class="page-subtitle">Rankings update in real time — stay on top!</p>
      </div>
      <div class="summary-badge">
        <span class="summary-label">Season</span>
        <span class="summary-value">Spring 2025</span>
      </div>
    </header>

    <style>
      .lb-controls { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
      .lb-search {
        flex:1; max-width:260px; padding:8px 14px; border-radius:999px;
        border:1px solid var(--border-subtle); background:rgba(11,22,48,.9);
        color:var(--text-main); font-size:.88rem; outline:none; font-family:inherit;
      }
      .lb-search::placeholder { color:var(--text-subtle); }
      .lb-search:focus { border-color:var(--accent-strong); box-shadow:0 0 0 2px rgba(62,208,255,.2); }
      .lb-podium-wrap {
        display:flex; justify-content:center;
        background:linear-gradient(145deg,#0b1630,#121d3b);
        border:1px solid var(--border-subtle); border-radius:var(--radius-lg);
        padding:28px 20px 0; box-shadow:var(--shadow-soft); overflow:hidden;
      }
      .lb-podium-stage { display:flex; align-items:flex-end; gap:16px; }
      .lb-podium-slot  { display:flex; flex-direction:column; align-items:center; gap:8px; }
      .lb-podium-avatar {
        width:62px; height:62px; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:1.8rem; position:relative;
        border:3px solid var(--border-subtle); background:var(--bg-elevated-soft);
      }
      .lb-av-gold   { border-color:#ffd700; box-shadow:0 0 22px rgba(255,215,0,.4); width:72px; height:72px; }
      .lb-av-silver { border-color:#c0c8d8; box-shadow:0 0 16px rgba(192,200,216,.3); }
      .lb-av-bronze { border-color:#cd7f32; box-shadow:0 0 16px rgba(205,127,50,.3); }
      .lb-medal-pin { position:absolute; bottom:-10px; right:-10px; filter:drop-shadow(0 2px 4px rgba(0,0,0,.5)); }
      .lb-podium-info { text-align:center; margin-top:12px; }
      .lb-podium-name  { font-size:.88rem; font-weight:700; }
      .lb-podium-score { font-size:.75rem; color:var(--text-subtle); }
      .lb-blk {
        width:80px; border-radius:10px 10px 0 0;
        display:flex; align-items:center; justify-content:center;
        font-size:1.3rem; font-weight:800; padding:10px 0; margin-top:10px;
      }
      .lb-blk-gold   { height:88px; background:linear-gradient(180deg,rgba(255,215,0,.2),rgba(255,215,0,.05)); border:1px solid rgba(255,215,0,.3); color:#ffd700; width:90px; }
      .lb-blk-silver { height:64px; background:linear-gradient(180deg,rgba(192,200,216,.16),rgba(192,200,216,.04)); border:1px solid rgba(192,200,216,.22); color:#c0c8d8; }
      .lb-blk-bronze { height:48px; background:linear-gradient(180deg,rgba(205,127,50,.16),rgba(205,127,50,.04)); border:1px solid rgba(205,127,50,.22); color:#cd7f32; }
      .lb-card { background:linear-gradient(145deg,#0b1630,#121d3b); border-radius:var(--radius-lg); border:1px solid var(--border-subtle); box-shadow:var(--shadow-soft); overflow:hidden; }
      .lb-table-header {
        display:grid; grid-template-columns:52px 1fr 100px 100px 90px;
        padding:11px 20px; font-size:.74rem; color:var(--text-subtle);
        text-transform:uppercase; letter-spacing:.08em; border-bottom:1px solid var(--border-subtle);
      }
      .lb-row {
        display:grid; grid-template-columns:52px 1fr 100px 100px 90px;
        padding:12px 20px; align-items:center;
        border-bottom:1px solid rgba(32,43,74,.5);
        transition:background .15s; animation:lbRowIn .35s ease both;
      }
      .lb-row:last-child { border-bottom:none; }
      .lb-row:hover { background:rgba(62,208,255,.04); }
      .lb-r1 { background:rgba(255,215,0,.04); }
      .lb-r2 { background:rgba(192,200,216,.03); }
      .lb-r3 { background:rgba(205,127,50,.04); }
      @keyframes lbRowIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
      .lb-rank-cell { display:flex; align-items:center; justify-content:center; font-size:.9rem; font-weight:700; }
      .lb-rc-n { color:var(--text-subtle); }
      .lb-player-cell { display:flex; align-items:center; gap:12px; }
      .lb-p-avatar { width:36px; height:36px; border-radius:50%; background:var(--bg-elevated-soft); border:2px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
      .lb-p-name { font-size:.9rem; font-weight:600; }
      .lb-p-tag  { font-size:.75rem; color:var(--text-subtle); }
      .lb-cv { font-size:.88rem; color:var(--text-subtle); }
      .lb-col-pts { color:var(--accent); font-weight:600; }
      .lb-badge { display:inline-block; padding:3px 9px; border-radius:999px; font-size:.75rem; font-weight:600; }
      .lb-up   { background:rgba(74,222,128,.12); color:#4ade80; }
      .lb-down { background:rgba(255,91,122,.12); color:var(--danger); }
      .lb-same { background:rgba(165,179,217,.1);  color:var(--text-subtle); }
      @media(max-width:640px){
        .lb-table-header,.lb-row{grid-template-columns:44px 1fr 80px 70px;}
        .lb-col-time{display:none;}
      }
    </style>

    <div class="lb-controls">
      <input class="lb-search" id="lbSearch" type="text" placeholder="🔍  Search player…" />
      <button class="btn btn-primary" id="lbShuffle">⚡ Shuffle Ranks</button>
      <button class="btn btn-ghost"   id="lbReset">↩ Reset</button>
    </div>
    <div class="lb-podium-wrap">
      <div class="lb-podium-stage" id="lbPodium"></div>
    </div>
    <div class="lb-card">
      <div class="lb-table-header">
        <div>#</div><div>Player</div>
        <div class="lb-col-time">Best Time</div>
        <div class="lb-col-pts">Points</div>
        <div>Change</div>
      </div>
      <div id="lbBody"></div>
    </div>`;
}

function initLeaderboard() {
  const podium     = document.getElementById("lbPodium");
  const body       = document.getElementById("lbBody");
  const search     = document.getElementById("lbSearch");
  const shuffleBtn = document.getElementById("lbShuffle");
  const resetBtn   = document.getElementById("lbReset");
  if (!podium || !body) return;

  function drawAll(filter = "") {
    podium.innerHTML = lbPodiumHTML();
    body.innerHTML   = lbTableHTML(filter);
  }

  shuffleBtn.addEventListener("click", () => {
    lbRanked.forEach((p, i) => { lbPrev[p.name] = i; });
    for (let i = lbRanked.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lbRanked[i], lbRanked[j]] = [lbRanked[j], lbRanked[i]];
    }
    drawAll(search.value);
  });

  resetBtn.addEventListener("click", () => {
    lbPrev = {}; lbRanked = [...LB_BASE]; search.value = ""; drawAll();
  });

  search.addEventListener("input", (e) => drawAll(e.target.value));
  drawAll();
}

// -------------------------------
// Main Render Switch
// -------------------------------

function render() {
  const container = document.getElementById("main-content");
  if (!container) return;

  if (currentView === "home") {
    container.innerHTML = renderHome();
  } else if (currentView === "classes") {
    container.innerHTML = renderClasses();
  } else if (currentView === "class-detail" && currentClassId) {
    renderClassDetail(currentClassId);
    // Resume ticking if this timer was already running
    if (getTimer(currentClassId)?.running) startTick();
  } else if (currentView === "leaderboard") {
    container.innerHTML = renderLeaderboard();
    initLeaderboard();
  } else if (currentView === "account") {
    const user = window._currentUser || {};
    const username = user.username || "Account";
    const email    = user.email    || "";
    container.innerHTML = `
      <header class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">${username}</h2>
          <p class="page-subtitle">${email}</p>
        </div>
      </header>
      <section class="section">
        <div class="card stack" style="gap:16px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="
              width:52px; height:52px; border-radius:50%;
              background: linear-gradient(135deg, rgba(62,208,255,.2), rgba(62,208,255,.05));
              border: 1px solid rgba(62,208,255,.25);
              display:flex; align-items:center; justify-content:center;
              font-size:1.4rem; font-weight:700; color:var(--accent);
            ">${username.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:600; font-size:1rem;">${username}</div>
              <div style="font-size:.82rem; color:var(--text-subtle);">${email}</div>
            </div>
          </div>
          <div style="height:1px; background:rgba(255,255,255,.06);"></div>
          <button class="btn btn-ghost" data-action="sign-out" style="
            color:#ff8fa0;
            border-color:rgba(255,91,122,.2);
            align-self:flex-start;
          ">Sign Out</button>
        </div>
      </section>`;
  } else if (currentView === "settings") {
    container.innerHTML = `
      <header class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Settings</h2>
          <p class="page-subtitle">Customize your ClassClash experience.</p>
        </div>
      </header>
      <section class="section">
        <div class="card"><p class="placeholder">Settings coming soon.</p></div>
      </section>`;
  } else {
    container.innerHTML = renderHome();
  }
}

// -------------------------------
// Events
// -------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const nav       = document.querySelector(".sidebar-nav");
  const container = document.getElementById("main-content");

  // Sidebar navigation
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (!btn) return;
    setView(btn.dataset.view);
  });

  // All main-content clicks — delegation handles every button in every view
  container.addEventListener("click", async (e) => {
    const addBtn     = e.target.closest("[data-action='add-class']");
    const openBtn    = e.target.closest("[data-action='open-class']");
    const card       = e.target.closest(".class-card");
    const quick      = e.target.closest(".quick-class");
    const startBtn   = e.target.closest("[data-action='timer-start']");
    const stopBtn    = e.target.closest("[data-action='timer-stop']");
    const resumeBtn  = e.target.closest("[data-action='timer-resume']");
    const saveBtn    = e.target.closest("[data-action='timer-save']");
    const discardBtn = e.target.closest("[data-action='timer-discard']");
    const signOutBtn = e.target.closest("[data-action='sign-out']");

    if (addBtn)     return addNewClass();
    if (openBtn)    return setView("class-detail", { classId: openBtn.dataset.classId });
    if (card)       return setView("class-detail", { classId: card.dataset.classId });
    if (quick)      return setView("class-detail", { classId: quick.dataset.classId });

    if (startBtn)   return timerStart(startBtn.dataset.classId);
    if (stopBtn)    return timerStop(stopBtn.dataset.classId);
    if (resumeBtn)  return timerResume(resumeBtn.dataset.classId);
    if (saveBtn)    return timerSave(saveBtn.dataset.classId);
    if (discardBtn) return timerDiscard(discardBtn.dataset.classId);

    if (signOutBtn) {
      if (window.supabase) {
        const client = window.supabase.createClient(
          'https://tdohwluxhtjtzgxcvbxo.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkb2h3bHV4aHRqdHpneGN2YnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTA4OTUsImV4cCI6MjA4NjkyNjg5NX0.-nfHWLTO36JM-j8AUWbtL02-8ApIZnN3xb_1ku1gXTc'
        );
        await client.auth.signOut();
      }
      window.location.href = './login.html';
    }
  });

  // Wait for auth session to resolve before rendering
  (window._appReady || Promise.resolve()).then(() => {
    render();
  });
});