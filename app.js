// Simple in-memory data model for classes and timers.
const CLASS_DATA = [
  { id: "history", name: "History" },
  { id: "physics", name: "Physics" },
  { id: "precalc", name: "PreCalc" },
  { id: "spanish", name: "Spanish" },
  { id: "english", name: "English" },
];

const classTimers = new Map();

CLASS_DATA.forEach((cls) => {
  classTimers.set(cls.id, {
    id: cls.id,
    name: cls.name,
    accumulatedSeconds: 0,
    sessionSeconds: 0,
    running: false,
    startTimestamp: null,
    countdownMode: false,
    countdownTargetSeconds: 0,
    countdownStartTimestamp: null,
  });
});

let currentView = "home";
let currentClassId = null;

function formatDuration(seconds) {
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
  }

  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatShortDuration(seconds) {
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
  }

  return `${mins}m`;
}

function getTimerState(id) {
  return classTimers.get(id);
}

function getElapsedSeconds(timer) {
  if (!timer) return 0;
  return timer.accumulatedSeconds || 0;
}

function getSessionSeconds(timer) {
  if (!timer) return 0;
  const base = timer.sessionSeconds || 0;
  if (!timer.running || !timer.startTimestamp) return base;
  const delta = (Date.now() - timer.startTimestamp) / 1000;
  return base + delta;
}

function getDisplaySeconds(timer) {
  if (!timer) return 0;
  
  if (timer.countdownMode && timer.running) {
    const elapsed = (Date.now() - timer.countdownStartTimestamp) / 1000;
    const remaining = Math.max(0, timer.countdownTargetSeconds - elapsed);
    return remaining;
  }
  
  return getSessionSeconds(timer);
}

function getWeeklyTotalSeconds() {
  let total = 0;
  classTimers.forEach((timer) => {
    total += getElapsedSeconds(timer);
  });
  return total;
}

function getTopClassThisWeek() {
  let top = null;
  classTimers.forEach((timer) => {
    const elapsed = getElapsedSeconds(timer);
    if (!top || elapsed > top.elapsed) {
      top = { id: timer.id, name: timer.name, elapsed };
    }
  });
  return top;
}

function setView(view, options = {}) {
  currentView = view;
  if (view === "class-detail" && options.classId) {
    currentClassId = options.classId;
  } else if (view !== "class-detail") {
    currentClassId = null;
  }

  updateActiveNav(view);
  render();
}

function updateActiveNav(view) {
  const items = document.querySelectorAll(".nav-item");
  items.forEach((item) => {
    const itemView = item.getAttribute("data-view");
    const isActive = itemView === view;
    item.classList.toggle("is-active", !!isActive);
  });
}

function renderHome() {
  const weeklyTotal = getWeeklyTotalSeconds();

  const top = getTopClassThisWeek();

  const quickClassesHtml = CLASS_DATA.map((cls) => {
    const timer = getTimerState(cls.id);
    const elapsed = getElapsedSeconds(timer);
    return `
      <button class="quick-class" data-class-id="${cls.id}">
        <span class="quick-class-name">${cls.name}</span>
        <span class="quick-class-time">${formatShortDuration(elapsed)}</span>
      </button>
    `;
  }).join("");

  const topClassSection = top
    ? `
      <section class="section">
        <div class="section-header">
          <h3 class="section-title">Top class this week</h3>
          <p class="section-subtitle">
            The class you have focused on the most so far.
          </p>
        </div>
        <article class="card class-card" data-class-id="${top.id}">
          <header class="card-header">
            <div>
              <h3 class="card-title">${top.name}</h3>
              <p class="card-meta">Tracked focus time</p>
            </div>
            <span class="pill">Most active</span>
          </header>
          <div class="time-display">
            ${formatDuration(top.elapsed)}
          </div>
        </article>
      </section>
    `
    : "";

  return `
    <header class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">This week</h2>
        <p class="page-subtitle">
          Your study overview across all classes.
        </p>
      </div>
      <div class="summary-badge">
        <span class="summary-label">Total time</span>
        <span class="summary-value">${formatDuration(weeklyTotal)}</span>
      </div>
    </header>

    ${topClassSection}

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Quick classes</h3>
        <p class="section-subtitle">
          Jump into a class to start a timer or check its leaderboard.
        </p>
      </div>
      <div class="quick-classes-row">
        ${quickClassesHtml}
      </div>
    </section>
  `;
}

function renderClasses() {
  const weeklyTotal = getWeeklyTotalSeconds();

  const cardsHtml = CLASS_DATA.map((cls) => {
    const timer = getTimerState(cls.id);
    const elapsed = getElapsedSeconds(timer);
    const progress = Math.min(100, (elapsed / (60 * 60)) * 100);

    return `
      <article class="card class-card" data-class-id="${cls.id}">
        <header class="card-header">
          <div>
            <h3 class="card-title">${cls.name}</h3>
            <p class="card-meta">This week</p>
          </div>
          <span class="pill">
            Focus
          </span>
        </header>
        <div class="time-display">
          ${formatShortDuration(elapsed)}
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${progress}%"></div>
        </div>
        <button class="btn btn-ghost" data-action="open-class" data-class-id="${cls.id}">
          Open class
        </button>
      </article>
    `;
  }).join("");

  return `
    <header class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">All classes</h2>
        <p class="page-subtitle">
          See every class and how much you have studied this week.
        </p>
      </div>
      <div class="summary-badge">
        <span class="summary-label">Total time</span>
        <span class="summary-value">${formatDuration(weeklyTotal)}</span>
      </div>
    </header>

    <section class="section">
      <div class="grid">
        ${cardsHtml}
      </div>
    </section>
  `;
}

function renderClassDetail() {
  const cls = CLASS_DATA.find((c) => c.id === currentClassId);
  if (!cls) {
    return `
      <div class="section">
        <p class="placeholder">Class not found.</p>
      </div>
    `;
  }

  const timer = getTimerState(cls.id);
  const weeklySaved = getElapsedSeconds(timer);
  const sessionTime = getDisplaySeconds(timer);
  const isRunning = timer.running;
  const hasUnsavedSession = !isRunning && (timer.sessionSeconds || 0) > 0;

  const leaderboardItems = [
    { rank: 1, name: "You", seconds: weeklySaved || 0 },
    { rank: 2, name: "Alex M.", seconds: weeklySaved * 0.8 + 900 },
    { rank: 3, name: "Samir K.", seconds: weeklySaved * 0.5 + 600 },
  ];

  const leaderboardHtml = leaderboardItems
    .map(
      (entry) => `
    <li class="leaderboard-item">
      <span class="leaderboard-rank">#${entry.rank}</span>
      <span class="leaderboard-name">${entry.name}</span>
      <span class="leaderboard-time">${formatShortDuration(
        entry.seconds
      )}</span>
    </li>
  `
    )
    .join("");

  return `
    <header class="page-header">
      <div class="page-title-group">
        <button class="back-link" data-action="back-home">
          ← All classes
        </button>
        <h2 class="page-title">${cls.name}</h2>
        <p class="page-subtitle">
          Fine-tune your focus time and see how you stack up.
        </p>
      </div>
      <div class="summary-badge">
        <span class="summary-label">This week in ${cls.name}</span>
        <span class="summary-value">${formatDuration(weeklySaved)}</span>
      </div>
    </header>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Focus timer</h3>
        <p class="section-subtitle">
          Start a timer whenever you study for this class. We will track the total time here.
        </p>
      </div>
      <div class="card">
        <div class="stack">
          <div class="stack-row">
            <div>
              <div class="card-meta">Current session</div>
              <div class="timer-display" data-role="class-timer-display">
                ${formatDuration(sessionTime)}
              </div>
            </div>
            <div class="chips">
              <span class="chip">25 min sprint</span>
              <span class="chip">45 min deep work</span>
              <span class="chip">60 min exam prep</span>
            </div>
          </div>

          <div class="timer-controls">
            <button class="btn btn-primary" data-action="toggle-timer" data-class-id="${
              cls.id
            }">
              ${isRunning ? "Pause" : "Start"} timer
            </button>
            ${
              hasUnsavedSession
                ? `<button class="btn btn-primary" data-action="save-session" data-class-id="${cls.id}" style="background: linear-gradient(135deg, #00c853, #4caf50);">
                Add to this week
              </button>`
                : ""
            }
            <button class="btn btn-ghost" data-action="reset-timer" data-class-id="${
              cls.id
            }">
              Reset for this week
            </button>
            <span class="btn-pill">
              Tracked this week: ${formatShortDuration(weeklySaved)}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Class leaderboard</h3>
        <p class="section-subtitle">
          Coming soon: real classmates and cross-class rankings. For now, here is a sample layout.
        </p>
      </div>

      <div class="card">
        <ul class="leaderboard-list">
          ${leaderboardHtml}
        </ul>
      </div>
    </section>
  `;
}

function renderPlaceholder(view) {
  if (view === "leaderboard") {
    return `
      <header class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Global leaderboard</h2>
          <p class="page-subtitle">
            Soon you will be able to see how you compare across all of your classes and friends.
          </p>
        </div>
      </header>
      <section class="section">
        <div class="card">
          <p class="placeholder">
            Leaderboard features will plug into your future backend API.
          </p>
        </div>
      </section>
    `;
  }

  if (view === "account") {
    return `
      <header class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Account</h2>
          <p class="page-subtitle">
            Manage your profile and sync settings when the backend is ready.
          </p>
        </div>
      </header>
      <section class="section">
        <div class="card stack">
          <div class="stack-row">
            <div>
              <div class="card-meta">Signed in as</div>
              <div class="time-display">Student Zero</div>
            </div>
          </div>
          <p class="placeholder">
            In the future this page will connect to your authentication system.
          </p>
        </div>
      </section>
    `;
  }

  if (view === "settings") {
    return `
    
      <header class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Settings</h2>
          <p class="page-subtitle">
            Personalize ClassClash. These settings are visual only for now.
          </p>
        </div>
      </header>
  
      <section class="section">
        <div class="card stack">
  
          <div class="stack-row">
            <span>Dark mode</span>
            <div class="toggle">
              <div class="toggle-thumb"></div>
            </div>
          </div>
  
          <div class="stack-row">
            <span>Weekly reset day</span>
            <span class="btn-pill">Monday</span>
          </div>
  
          <hr />
  
          <h3>Update Profile</h3>
  
          <form id="userForm" class="stack">
            <input 
              id = "userform"
              type="text" 
              placeholder="Username" 
              required
            />

            <input
              id = "userform"
              type="password"
              placeholder="Password"
              required
            />
  
            <button type="submit" class="btn-primary">
              Save Changes
            </button>
          </form>
  
          <p class="placeholder">
            We will eventually wire these options into real preferences saved on your server.
          </p>
  
        </div>
      </section>
    `;
  }

  return `
    <section class="section">
      <p class="placeholder">Nothing to show yet.</p>
    </section>
  `;
}

function render() {
  const container = document.getElementById("main-content");
  if (!container) return;

  let html = "";
  if (currentView === "home") {
    html = renderHome();
  } else if (currentView === "classes") {
    html = renderClasses();
  } else if (currentView === "class-detail") {
    html = renderClassDetail();
  } else {
    html = renderPlaceholder(currentView);
  }

  container.innerHTML = html;
}

function toggleTimer(classId) {
  const timer = getTimerState(classId);
  if (!timer) return;

  // #region agent log
  fetch(
    "http://127.0.0.1:7342/ingest/1f0807c9-bad0-4040-8e6e-05d6fec21b49",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "60bb32",
      },
      body: JSON.stringify({
        sessionId: "60bb32",
        runId: "initial",
        hypothesisId: "H1",
        location: "app.js:toggleTimer:before",
        message: "Before toggleTimer state",
        data: {
          classId,
          running: timer.running,
          accumulatedSeconds: timer.accumulatedSeconds,
          startTimestamp: timer.startTimestamp,
        },
        timestamp: Date.now(),
      }),
    }
  ).catch(() => {});
  // #endregion agent log

  if (timer.running) {
    const now = Date.now();
    const delta = (now - timer.startTimestamp) / 1000;
    if (Number.isFinite(delta) && delta > 0) {
      timer.sessionSeconds += delta;
    }
    timer.startTimestamp = null;
    timer.running = false;
  } else {
    timer.startTimestamp = Date.now();
    timer.running = true;
  }

  // #region agent log
  fetch(
    "http://127.0.0.1:7342/ingest/1f0807c9-bad0-4040-8e6e-05d6fec21b49",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "60bb32",
      },
      body: JSON.stringify({
        sessionId: "60bb32",
        runId: "initial",
        hypothesisId: "H1",
        location: "app.js:toggleTimer:after",
        message: "After toggleTimer state",
        data: {
          classId,
          running: timer.running,
          accumulatedSeconds: timer.accumulatedSeconds,
          startTimestamp: timer.startTimestamp,
        },
        timestamp: Date.now(),
      }),
    }
  ).catch(() => {});
  // #endregion agent log

  render();
}

function saveSessionTime(classId) {
  const timer = getTimerState(classId);
  if (!timer) return;

  timer.accumulatedSeconds += timer.sessionSeconds || 0;
  timer.sessionSeconds = 0;
  timer.startTimestamp = null;
  timer.running = false;

  render();
}

function resetTimerForWeek(classId) {
  const timer = getTimerState(classId);
  if (!timer) return;

  timer.accumulatedSeconds = 0;
  timer.sessionSeconds = 0;
  timer.startTimestamp = timer.running ? Date.now() : null;

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".sidebar-nav");
  const container = document.getElementById("main-content");

  if (nav) {
    nav.addEventListener("click", (event) => {
      const target = event.target.closest(".nav-item");
      if (!target) return;
      const view = target.getAttribute("data-view");
      if (!view) return;

      setView(view);
    });
  }

  if (container) {
    container.addEventListener("click", (event) => {
      const classCard = event.target.closest(".class-card");
      const quickClass = event.target.closest(".quick-class");
      const back = event.target.closest("[data-action='back-home']");
      const toggle = event.target.closest("[data-action='toggle-timer']");
      const reset = event.target.closest("[data-action='reset-timer']");
      const saveSession = event.target.closest("[data-action='save-session']");
      const openButton = event.target.closest("[data-action='open-class']");

      // #region agent log
      fetch(
        "http://127.0.0.1:7342/ingest/1f0807c9-bad0-4040-8e6e-05d6fec21b49",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "60bb32",
          },
          body: JSON.stringify({
            sessionId: "60bb32",
            runId: "initial",
            hypothesisId: "H2",
            location: "app.js:mainContent:click",
            message: "Main content click delegation",
            data: {
              hasClassCard: !!classCard,
              hasQuickClass: !!quickClass,
              hasOpenButton: !!openButton,
              hasBack: !!back,
              hasToggle: !!toggle,
              hasReset: !!reset,
            },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => {});
      // #endregion agent log

      if (toggle && toggle.dataset.classId) {
        toggleTimer(toggle.dataset.classId);
        return;
      }

      if (saveSession && saveSession.dataset.classId) {
        saveSessionTime(saveSession.dataset.classId);
        return;
      }

      if (reset && reset.dataset.classId) {
        resetTimerForWeek(reset.dataset.classId);
        return;
      }

      if (classCard) {
        const id = classCard.getAttribute("data-class-id");
        if (id) setView("class-detail", { classId: id });
        return;
      }

      if (quickClass) {
        const id = quickClass.getAttribute("data-class-id");
        if (id) setView("class-detail", { classId: id });
        return;
      }

      if (openButton && openButton.dataset.classId) {
        setView("class-detail", { classId: openButton.dataset.classId });
        return;
      }

      if (back) {
        setView("home");
        return;
      }
    });
  }

  render();

  setInterval(() => {
    if (currentView === "class-detail") {
      const timer = getTimerState(currentClassId);
      if (timer && timer.running) {
        render();
      }
    }
  }, 1000);
});