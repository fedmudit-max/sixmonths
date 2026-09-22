import {
  registerServiceWorker,
  setupInstallPrompt,
  promptInstall,
  checkInstallBanner,
  dismissIB,
} from "./pwa.js";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const KEY = "momentum_v4";
const TODO_KEY = "momentum_todos_v1";
const MAX = 5;
const TODO_MAX = 5;
const WEEK_TARGET = 5;
const QUOTES = [
  "Small steps taken daily <em>beat big leaps taken rarely.</em>",
  "You don't rise to your goals. <em>You fall to your systems.</em>",
  "The person you want to become <em>is built one day at a time.</em>",
  "Consistency is the bridge <em>between who you are and who you want to be.</em>",
  "Show up today. <em>That's the whole plan.</em>",
  "Progress isn't always visible. <em>But it is always happening.</em>",
  "Every rep counts. <em>Every day counts. Every week counts.</em>",
  "Identity change is <em>the north star of habit change.</em>",
  "The goal is not the destination. <em>The goal is becoming someone who shows up.</em>",
  "You are not behind. <em>You are exactly where showing up takes you forward.</em>",
];

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(goals));
  } catch (e) {}
}

function load() {
  try {
    const d = localStorage.getItem(KEY);
    return d ? JSON.parse(d) : null;
  } catch (e) {
    return null;
  }
}

function loadTodos() {
  try {
    const d = localStorage.getItem(TODO_KEY);
    if (d) {
      const a = JSON.parse(d);
      if (Array.isArray(a)) {
        const items = a.slice(0, TODO_MAX).map((s) => String(s ?? ""));
        if (items.every((s) => !s.trim())) return [];
        return items;
      }
    }
  } catch (e) {}
  return [];
}

function saveTodos() {
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  } catch (e) {}
}

let todos = loadTodos();

function mkWeeks(duration) {
  duration = duration === 3 ? 3 : 6;
  const total = duration === 3 ? 13 : 26;
  const rests = duration === 3 ? [12] : [12, 25];
  const w = [];
  for (let i = 0; i < total; i++) {
    if (rests.includes(i)) w.push({ t: "rest", label: "Week " + (i + 1) });
    else
      w.push({
        t: "active",
        label: "Week " + (i + 1),
        att: [0, 0, 0, 0, 0, 0, 0],
        entries: ["", "", "", "", "", "", ""],
        dayStatus: ["", "", "", "", "", "", ""],
        focus: "",
        feedback: "",
        repeat: null,
      });
  }
  return w;
}

function goalDuration(g) {
  return g.duration === 3 ? 3 : 6;
}

function monthCount(g) {
  return goalDuration(g) === 3 ? 3 : 6;
}

function phaseMonths(g, ph) {
  return goalDuration(g) === 3
    ? ph === 1
      ? [0]
      : [1, 2]
    : ph === 1
      ? [0, 1, 2]
      : [3, 4, 5];
}

function phaseLabel(g, ph) {
  if (goalDuration(g) === 3) {
    return ph === 1 ? "Phase 1 · Month 1" : "Phase 2 · Months 2–3";
  }
  return ph === 1 ? "Phase 1 · Months 1–3" : "Phase 2 · Months 4–6";
}

function bigGoalLabel(g) {
  return goalDuration(g) === 3 ? "3-month big goal" : "6-month big goal";
}

const BLOCK_LABELS_3 = ["Week 1–4", "Week 5–8", "Week 9–12"];

function blockLabel(g, m) {
  if (goalDuration(g) === 3) return BLOCK_LABELS_3[m] || `Week ${m + 1}`;
  return `Month ${m + 1}`;
}

function curBlock(g) {
  for (let m = 0; m < monthCount(g); m++) if (!mDone(g, m)) return m;
  return null;
}

function modSteps() {
  return modDur() === 3 ? 2 : 3;
}

function normalizeGoals(data) {
  data.forEach((g) => {
    if (!g.duration) g.duration = 6;
    while (g.months.length < monthCount(g)) g.months.push("");
    g.weeks.forEach((w) => {
      if (w.t !== "active") return;
      if (!w.entries) w.entries = Array(7).fill("");
      if (!w.dayStatus) {
        w.dayStatus = Array(7).fill("");
        w.entries.forEach((entry, i) => {
          if (entry) w.dayStatus[i] = w.att[i] ? "done" : "";
        });
      }
    });
  });
  return data;
}

function ensureWeekDay(w) {
  if (!w.entries) w.entries = Array(7).fill("");
  if (!w.dayStatus) w.dayStatus = Array(7).fill("");
}

const DAY_STATUS = {
  rest: { label: "Rest", placeholder: "What is the reason for rest today?" },
  busy: { label: "Busy", placeholder: "What kept you busy today?" },
  done: { label: "Done", placeholder: "What have you accomplished today?" },
};

function dayStatusClass(st, base) {
  if (st === "done") return `${base} on`;
  if (st === "rest") return `${base} st-rest`;
  if (st === "busy") return `${base} st-busy`;
  return base;
}

function attBtnClass(w, i, todayDi, weekIdx) {
  ensureWeekDay(w);
  let cls = dayStatusClass(w.dayStatus[i], "ab");
  if (i === todayDi) cls += " today";
  if (weekIdx !== undefined && i === getSelDay(weekIdx)) cls += " sel";
  return cls;
}

function homeDotClass(w, i, todayDi) {
  ensureWeekDay(w);
  let cls = dayStatusClass(w.dayStatus[i], "dc");
  if (i === todayDi) cls += " dc-today";
  return cls;
}

function mkGoal(nm, id, big, p1, p2, months, sd, tf, tt, ah, duration) {
  duration = duration === 3 ? 3 : 6;
  const mc = duration === 3 ? 3 : 6;
  return {
    id: (Date.now() + Math.random()) | 0,
    name: nm,
    identity: id,
    big,
    duration,
    p1,
    p2,
    months: (months || Array(mc).fill("")).slice(0, mc),
    weeks: mkWeeks(duration),
    startDate: sd || tod(),
    timeFrom: tf || "",
    timeTo: tt || "",
    atomicHabit: ah || "",
  };
}

function tod() {
  return new Date().toISOString().split("T")[0];
}

let goals = normalizeGoals(
  load() ||
  [
    mkGoal(
      "Learn Spanish",
      "I am someone who speaks Spanish fluently",
      "Reach A2 level in 6 months",
      "Reach A1 level",
      "Reach A2 level",
      [
        "Learn 200 words",
        "Basic sentences",
        "Present tense",
        "Past tense vocab",
        "Listening practice",
        "A2 exam prep",
      ],
      tod(),
      "07:00",
      "08:00",
      "15 mins of Duolingo"
    ),
  ]
);
let gId = null;
let mIdx = null;
let mStep = 1;
let mData = {};

function modDur() {
  return mData.duration === 3 ? 3 : 6;
}

function setDuration(d) {
  if (mStep === 1) {
    mData = {
      ...mData,
      duration: d === 3 ? 3 : 6,
      name: document.getElementById("fn")?.value.trim() || mData.name,
      identity: document.getElementById("fi")?.value.trim() || mData.identity,
      big: document.getElementById("fb")?.value.trim() || mData.big,
      startDate: document.getElementById("fsd")?.value || mData.startDate,
      timeFrom: document.getElementById("ftf")?.value || mData.timeFrom,
      timeTo: document.getElementById("ftt")?.value || mData.timeTo,
      atomicHabit: document.getElementById("fah")?.value.trim() || mData.atomicHabit,
    };
  } else {
    mData.duration = d === 3 ? 3 : 6;
  }
  renderMod();
}
if (!window._exp) window._exp = {};
if (!window._sc) window._sc = {};
if (!window._selDay) window._selDay = {};

function selDayKey(weekIdx) {
  return `${gId}_${weekIdx}`;
}

function getSelDay(weekIdx) {
  const k = selDayKey(weekIdx);
  if (window._selDay[k] !== undefined) return window._selDay[k];
  return new Date().getDay();
}

function setSelDay(weekIdx, di) {
  window._selDay[selDayKey(weekIdx)] = di;
}

function nav(route, params, rep) {
  const cur = document.querySelector(".page.show");
  if (cur) window._sc[cur.id] = cur.scrollTop;
  const state = { route, ...params };
  if (rep) history.replaceState(state, "", "#" + route);
  else history.pushState(state, "", "#" + route);
  applyRoute(route);
}

function applyRoute(route) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("show"));
  const pg = document.getElementById("pg-" + route);
  pg.classList.add("show");
  setTimeout(() => {
    pg.scrollTop = window._sc["pg-" + route] || 0;
  }, 10);
}

window.addEventListener("popstate", (e) => {
  const s = e.state || { route: "home" };
  gId = s.gId ?? null;
  mIdx = s.mIdx ?? null;

  if (s.route === "goal" && s.gId) renderGoal();
  else if (s.route === "month" && s.mIdx !== undefined) renderMonth();
  else if (s.route === "home") renderHome();

  applyRoute(s.route);
  setNav(s.route);
});

function setNav(route) {
  const r = document.getElementById("nav-r");
  if (route === "home") {
    const addBtn =
      goals.length < MAX
        ? `<button class="n-btn n-btn-ac" onclick="openMod()">+ Goal</button>`
        : "";
    r.innerHTML = `${addBtn}<button class="n-ico" onclick="openSettings()" title="Settings" aria-label="Settings">⚙</button>`;
  } else {
    r.innerHTML = `<button class="n-btn" onclick="history.back()">← Back</button>`;
  }
}

function curWk(g) {
  const s = new Date(g.startDate);
  const n = new Date();
  const diff = Math.max(0, Math.floor((n - s) / (7 * 24 * 60 * 60 * 1000)));
  const total = goalDuration(g) === 3 ? 13 : 26;
  const maxActive = goalDuration(g) === 3 ? 12 : 23;
  let a = 0;
  let i = 0;
  while (i < total) {
    if (g.weeks[i].t === "rest") {
      i++;
      continue;
    }
    if (a === Math.min(diff, maxActive)) return i;
    a++;
    i++;
  }
  return 0;
}

function wSc(w) {
  return w.att ? w.att.filter(Boolean).length : 0;
}

function wDaysLogged(w) {
  ensureWeekDay(w);
  let n = 0;
  for (let i = 0; i < 7; i++) if (w.dayStatus[i] && w.entries[i]) n++;
  return n;
}

function isDone(w) {
  return w.t === "active" && wSc(w) >= WEEK_TARGET;
}

function weekScoreClass(sc) {
  if (sc >= WEEK_TARGET) return "ws-ok";
  if (sc > 0) return "ws-pt";
  return "ws-no";
}

function gPct(g) {
  const aw = g.weeks.filter((w) => w.t === "active");
  return Math.round(
    (aw.reduce((s, w) => s + Math.min(wSc(w), WEEK_TARGET), 0) /
      (aw.length * WEEK_TARGET)) *
      100
  );
}

function mWks(g, m) {
  if (goalDuration(g) === 3) {
    const maps = [
      { ws: 0, end: 4 },
      { ws: 4, end: 8 },
      { ws: 8, end: 12 },
    ];
    const { ws, end } = maps[m];
    return { ws, mw: g.weeks.slice(ws, end) };
  }
  const ps = m < 3 ? 0 : 13;
  const ws = ps + (m < 3 ? m : m - 3) * 4;
  return { ws, mw: g.weeks.slice(ws, ws + 4) };
}

function mPct(g, m) {
  const { mw } = mWks(g, m);
  const d = mw.reduce(
    (s, w) => s + (w.t === "active" ? Math.min(wSc(w), WEEK_TARGET) : 0),
    0
  );
  const x = mw.filter((w) => w.t === "active").length * WEEK_TARGET;
  return x ? Math.round((d / x) * 100) : 0;
}

function mDone(g, m) {
  const { mw } = mWks(g, m);
  return mw.filter((w) => w.t === "active").every(isDone);
}

function phDone(g, ph) {
  for (const m of phaseMonths(g, ph)) if (!mDone(g, m)) return false;
  return true;
}

function curMo(g, ph) {
  if (phDone(g, 1) && ph === 1) return null;
  if (!phDone(g, 1) && ph === 2) return null;
  for (const m of phaseMonths(g, ph)) if (!mDone(g, m)) return m;
  return null;
}

function ring(p, sz, sw, col, tr) {
  tr = tr || "rgba(79,70,229,.08)";
  const r = (sz - sw) / 2;
  const c = 2 * Math.PI * r;
  const d = (p / 100) * c;
  return `<svg width="${sz}" height="${sz}" style="flex-shrink:0;display:block"><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="${tr}" stroke-width="${sw}"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${d} ${c}" stroke-linecap="round" transform="rotate(-90 ${sz / 2} ${sz / 2})"/><text x="${sz / 2}" y="${sz / 2 + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="${col}">${p}%</text></svg>`;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtT(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = +h;
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function phaseGoalText(txt, ph, g) {
  const cleaned = String(txt || "")
    .replace(
      goalDuration(g) === 3
        ? ph === 1
          ? /\s*\(Month?\s*1\)\s*$/i
          : /\s*\(Months?\s*2[–-]3\)\s*$/i
        : ph === 1
          ? /\s*\(Months?\s*1[–-]3\)\s*$/i
          : /\s*\(Months?\s*4[–-]6\)\s*$/i,
      ""
    )
    .trim();
  return cleaned || "Set phase goal";
}

function splash() {
  const el = document.getElementById("splash");
  if (localStorage.getItem("splash_seen")) {
    el.classList.add("hide");
    return;
  }

  document.getElementById("sp-q").innerHTML =
    QUOTES[Math.floor(Math.random() * QUOTES.length)];
  setTimeout(() => {
    el.classList.add("hide");
    localStorage.setItem("splash_seen", "1");
  }, 2800);
}

function chkCel(g) {
  if (gPct(g) === 100) {
    document.getElementById("cel-g").textContent = '"' + g.big + '"';
    document.getElementById("celebration").classList.add("show");
  }
}

function closeCel() {
  document.getElementById("celebration").classList.remove("show");
}

function exportD() {
  const b = new Blob([JSON.stringify({ v: 4, goals }, null, 2)], {
    type: "application/json",
  });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = "momentum-" + tod() + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(u);
}

function importD(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.goals || !Array.isArray(d.goals)) throw new Error();
      if (!confirm("Replace all data with this backup?")) return;
      goals = normalizeGoals(d.goals);
      save();
      showHome();
      alert("Imported!");
    } catch {
      alert("Invalid file.");
    }
    e.target.value = "";
  };
  r.readAsText(f);
}

function openSettings() {
  document.getElementById("pips").style.display = "none";
  document.getElementById("ov").classList.add("open");
  document.getElementById("m-body").innerHTML = `
    <div class="m-title">Settings</div>
    <div class="m-sub">Backup your progress — data stays on this device</div>
    <button class="set-btn" onclick="exportD();closeMod()">
      Export backup
      <span class="set-btn-desc">Download all goals as a JSON file</span>
    </button>
    <button class="set-btn" onclick="document.getElementById('imp-f').click()">
      Import backup
      <span class="set-btn-desc">Restore from a previously exported file</span>
    </button>
    <div class="mf"><button onclick="closeMod()">Close</button></div>`;
}

function showHome() {
  gId = null;
  mIdx = null;
  nav("home", {}, true);
  setNav("home");
  renderHome();
}

function renderHome() {
  const total = goals.length;
  document.getElementById("h-sub").textContent =
    total === 0
      ? "Add your first goal to get started"
      : `${total} goal${total > 1 ? "s" : ""} tracked · up to ${MAX} at a time`;

  let h = goals
    .map((g, i) => {
      const p = gPct(g);
      const wi = curWk(g);
      const cw = g.weeks[wi];
      const todayDi = new Date().getDay();
      const dots =
        cw && cw.t === "active"
          ? DAYS.map((d, idx) => `<div class="${homeDotClass(cw, idx, todayDi)}">${d}</div>`).join("")
          : DAYS.map((d) => `<div class="dc">${d}</div>`).join("");
      const timePill =
        g.timeFrom && g.timeTo
          ? `<div class="gc-pill gc-pill-time">🕐 ${fmtT(g.timeFrom)}–${fmtT(g.timeTo)}</div>`
          : "";
      const ahPill = g.atomicHabit
        ? `<div class="gc-pill gc-pill-habit">⚡ ${esc(g.atomicHabit)}</div>`
        : "";
      const moveUp =
        i > 0
          ? `<button class="gc-action" onclick="event.stopPropagation();moveGoal(${g.id},-1)" aria-label="Move up">↑</button>`
          : "";
      return `<div class="gc" onclick="showGoal(${g.id})">
      <div class="gc-top-bar"></div>
      <div class="gc-body">
        <div class="gc-row1">
          <div class="gc-meta">
            <div class="gc-name">${esc(g.name)}</div>
            <div class="gc-id">"${esc(g.identity)}"</div>
            <div class="gc-tag">${esc(g.big)}</div>
            <div class="gc-pills">${timePill}${ahPill}</div>
          </div>
          <div class="gc-ring-area">
            ${ring(p, 58, 5, "#4f46e5", "rgba(79,70,229,.08)")}
            <div class="gc-actions">
              <button class="gc-action" onclick="event.stopPropagation();openEdit(${g.id})" aria-label="Edit goal">✏️</button>
              <button class="gc-action" onclick="event.stopPropagation();delGoal(${g.id})" aria-label="Delete goal">🗑️</button>
              ${moveUp}
            </div>
          </div>
        </div>
      </div>
      <div class="gc-footer">${dots}<span class="gc-wk-label">Wk ${wi + 1}</span></div>
    </div>`;
    })
    .join("");

  if (goals.length < MAX)
    h += `<div class="add-c" onclick="openMod()">
    <div class="add-ico">＋</div>
    <div style="font-size:14px;font-weight:700;color:var(--mu)">Add Goal ${goals.length ? `(${goals.length}/${MAX})` : ""}</div>
    <div style="font-size:12px;color:var(--hi)">Up to ${MAX} goals at a time</div>
  </div>`;

  document.getElementById("goal-grid").innerHTML = h;
  renderPriorityCard();
}

function setTodo(i, v) {
  if (i < 0 || i >= todos.length) return;
  todos[i] = v;
  saveTodos();
}

function addTodo() {
  if (todos.length >= TODO_MAX) return;
  todos.push("");
  saveTodos();
  renderPriorityCard();
  const inputs = document.querySelectorAll(".prio-inp");
  inputs[inputs.length - 1]?.focus();
}

function delTodo(i) {
  if (i < 0 || i >= todos.length) return;
  todos.splice(i, 1);
  saveTodos();
  renderPriorityCard();
}

function renderPriorityCard() {
  const el = document.getElementById("priority-card");
  if (!el) return;
  const rows = todos
    .map(
      (t, i) =>
        `<li class="prio-row">
        <span class="prio-n">${i + 1}</span>
        <input class="prio-inp" type="text" value="${esc(t)}" placeholder="To do item…" oninput="setTodo(${i}, this.value)" onclick="event.stopPropagation()"/>
        <button type="button" class="prio-del" onclick="event.stopPropagation();delTodo(${i})" aria-label="Remove item">✕</button>
      </li>`
    )
    .join("");
  const addBtn =
    todos.length < TODO_MAX
      ? `<button type="button" class="prio-add" onclick="event.stopPropagation();addTodo()">+ Add to do</button>`
      : `<p class="prio-cap">Maximum ${TODO_MAX} items</p>`;
  const empty =
    !todos.length
      ? `<p class="prio-empty">Tap below to add your first to do.</p>`
      : "";
  el.innerHTML = `<div class="prio-card">
    <div class="prio-top-bar"></div>
    <div class="prio-body">
      <h2 class="prio-h">Top 5 To Do List</h2>
      ${empty}
      <ol class="prio-list">${rows}</ol>
      ${addBtn}
    </div>
  </div>`;
}

function showGoal(id) {
  gId = id;
  nav("goal", { gId: id });
  setNav("goal");
  renderGoal();
}

function renderGoal() {
  const g = goals.find((x) => x.id === gId);
  if (!g) return;

  if (goalDuration(g) === 3) {
    const cm = curBlock(g);
    const blocks = [0, 1, 2];
    const cur = blocks.filter((m) => m === cm);
    const done = blocks.filter((m) => mDone(g, m)).sort((a, b) => b - a);
    const fut = blocks.filter((m) => !mDone(g, m) && m !== cm);
    const sorted = cm === null ? done.concat(fut) : cur.concat(done, fut);

    document.getElementById("goal-c").innerHTML = sorted
      .map((m, i) => {
        const mp = mPct(g, m);
        const md = mDone(g, m);
        const ic = m === cm;
        const lbl = blockLabel(g, m);
        const bc = md ? "var(--gn-br)" : ic ? "var(--ac)" : "var(--b1)";
        const bg = md ? "var(--gn-b)" : ic ? "rgba(79,70,229,.03)" : "var(--s2)";
        const nb = md ? "var(--gn)" : ic ? "var(--ac)" : "var(--s1)";
        const nc = md || ic ? "#fff" : "var(--mu)";
        const op = !ic && !md && cm !== null ? "opacity:.45" : "";
        const block = `<div class="ph-block${md ? " done" : ""}">
      <div class="ph-months">
        <div class="mc" style="border-color:${bc};background:${bg};${op}" onclick="showMonth(${m})">
        <div class="mc-l">
          <div class="mc-badge" style="background:${nb};border-color:${nb};color:${nc}">${md ? "✓" : m + 1}</div>
          <div>
            <div class="mc-nm">${lbl}</div>
            <div class="mc-gl">${esc(g.months[m]) || "Tap to set goal"}</div>
          </div>
        </div>
        <div class="mc-r">
          <span class="mc-pct" style="color:${md ? "var(--gn)" : ic ? "var(--ac)" : "var(--hi)"}">${mp}%</span>
          ${ring(mp, 30, 3, md ? "#15803d" : ic ? "#4f46e5" : "#b0ac9e", md ? "rgba(21,128,61,.1)" : ic ? "rgba(79,70,229,.1)" : "rgba(176,172,158,.1)")}
          <span class="mc-arr">›</span>
        </div>
      </div>
      </div>
    </div>`;
        return i ? `<div style="margin-top:10px">${block}</div>` : block;
      })
      .join("");
    return;
  }

  function phase(ph) {
    const pd = phDone(g, ph);
    const cm = curMo(g, ph);
    const lbl = phaseLabel(g, ph);
    const txt = ph === 1 ? g.p1 : g.p2;
    const ms = phaseMonths(g, ph);
    const cur = ms.filter((m) => m === cm);
    const done = ms.filter((m) => mDone(g, m)).sort((a, b) => b - a);
    const fut = ms.filter((m) => !mDone(g, m) && m !== cm);
    const sorted = [...cur, ...done, ...fut];
    const cards = sorted
      .map((m) => {
        const mp = mPct(g, m);
        const md = mDone(g, m);
        const ic = m === cm;
        const bc = md ? "var(--gn-br)" : ic ? "var(--ac)" : "var(--b1)";
        const bg = md ? "var(--gn-b)" : ic ? "rgba(79,70,229,.03)" : "var(--s2)";
        const nb = md ? "var(--gn)" : ic ? "var(--ac)" : "var(--s1)";
        const nc = md || ic ? "#fff" : "var(--mu)";
        const op = !ic && !md && cm !== null ? "opacity:.45" : "";
        return `<div class="mc" style="border-color:${bc};background:${bg};${op}" onclick="showMonth(${m})">
        <div class="mc-l">
          <div class="mc-badge" style="background:${nb};border-color:${nb};color:${nc}">${md ? "✓" : m + 1}</div>
          <div>
            <div class="mc-nm">Month ${m + 1}</div>
            <div class="mc-gl">${esc(g.months[m]) || "Tap to set goal"}</div>
          </div>
        </div>
        <div class="mc-r">
          <span class="mc-pct" style="color:${md ? "var(--gn)" : ic ? "var(--ac)" : "var(--hi)"}">${mp}%</span>
          ${ring(mp, 30, 3, md ? "#15803d" : ic ? "#4f46e5" : "#b0ac9e", md ? "rgba(21,128,61,.1)" : ic ? "rgba(79,70,229,.1)" : "rgba(176,172,158,.1)")}
          <span class="mc-arr">›</span>
        </div>
      </div>`;
      })
      .join("");
    return `<div class="ph-block${pd ? " done" : ""}">
      <div class="ph-hdr"><div class="ph-tag">${lbl}${pd ? " · ✓ Complete" : ""}</div><div class="ph-goal">${esc(phaseGoalText(txt, ph, g))}</div></div>
      <div class="ph-months">${cards}</div>
    </div>`;
  }

  const p1d = phDone(g, 1);
  document.getElementById("goal-c").innerHTML = p1d
    ? phase(2) + `<div style="margin-top:10px">` + phase(1) + `</div>`
    : phase(1) + `<div style="margin-top:10px">` + phase(2) + `</div>`;
}

function showMonth(m) {
  mIdx = m;
  nav("month", { mIdx: m });
  setNav("month");
  renderMonth();
}

function renderMonth() {
  const g = goals.find((x) => x.id === gId);
  const m = mIdx;
  if (!g || m === null) return;

  const { ws, mw } = mWks(g, m);
  const aw = [...mw];
  if (goalDuration(g) === 6) {
    if (m === 2) aw.push(g.weeks[12]);
    if (m === 5) aw.push(g.weeks[25]);
  } else if (m === 2) {
    aw.push(g.weeks[12]);
  }

  const ek = `${gId}_${m}`;
  if (!window._exp[ek]) window._exp[ek] = {};
  const ex = window._exp[ek];

  const wi = curWk(g);
  let cwi = null;
  if (mw.map((_, i) => ws + i).includes(wi)) cwi = wi;
  else {
    const fi = aw.findIndex((w) => w.t === "active" && !isDone(w));
    if (fi >= 0) cwi = ws + fi;
  }

  const idx = aw.map((w, i) => ({ w, wi: ws + i }));
  const ci = idx.find((x) => x.wi === cwi);
  const di = idx
    .filter(({ w, wi: weekIdx }) => isDone(w) && weekIdx !== cwi)
    .sort((a, b) => b.wi - a.wi);
  const fi = idx.filter(({ w, wi: weekIdx }) => !isDone(w) && weekIdx !== cwi && w.t !== "rest");
  const ri = idx.filter(({ w }) => w.t === "rest");
  const sorted = [...(ci ? [ci] : []), ...di, ...fi, ...ri];

  const todayDi = new Date().getDay();
  const weekTargetHint = (w) => {
    const left = WEEK_TARGET - wSc(w);
    if (left <= 0) return "";
    return `<div class="wk-target-lbl">${left} day${left === 1 ? "" : "s"} remaining for a successful week</div>`;
  };
  const dayLogSlot = (w, weekIdx) => {
    ensureWeekDay(w);
    const di = getSelDay(weekIdx);
    const entry = w.entries[di];
    const st = w.dayStatus[di];
    const hint = weekTargetHint(w);
    if (st && entry) {
      return `<div class="day-logs"><div class="day-slot st-${st}">
        <button class="day-slot-edit" onclick="event.stopPropagation();editDayEntry(${weekIdx},${di})" aria-label="Edit entry">✏️</button>
        <span class="day-log-tag tag-${st}">${DAY_STATUS[st].label}</span>
        <div class="day-slot-text">${esc(entry)}</div>
      </div>${hint}</div>`;
    }
    return `<div class="day-logs"><div class="day-slot empty" onclick="openDayEntry(${weekIdx},${di})"><span class="day-log-placeholder">What did you do?</span></div>${hint}</div>`;
  };
  const atts = (w, weekIdx) =>
    DAYS.map(
      (d, i) =>
        `<button class="${attBtnClass(w, i, todayDi, weekIdx)}" onclick="tapDay(${weekIdx},${i})" aria-label="${DAY_NAMES[i]}"><span>${d}</span><i></i></button>`
    ).join("");
  const weekFeedback = (w, weekIdx) =>
    wDaysLogged(w) >= 7
      ? `<div class="fl">Weekly Feedback</div><textarea class="fi wk-feedback" rows="1" placeholder="Successful, Learned something" oninput="saveFld(${weekIdx},'feedback',this.value);fitFeedback(this)">${esc(w.feedback)}</textarea>`
      : "";
  const weekFocus = (w, weekIdx) =>
    `<input class="fi wk-focus" value="${esc(w.focus)}" placeholder="focus this week?" oninput="saveFld(${weekIdx},'focus',this.value)" onclick="event.stopPropagation()"/>`;
  const weekBody = (w, weekIdx) => {
    return `<div class="wk-body" onclick="event.stopPropagation()">
    <div class="att-row">${atts(w, weekIdx)}</div>
    ${dayLogSlot(w, weekIdx)}
    ${weekFeedback(w, weekIdx)}
  </div>`;
  };
  const weekHdr = (w, weekIdx, { pill, sc, scoreClass, toggle, expanded, collapsible, ek }) =>
    `<div class="wk-hdr open">
      <div class="wk-hdr-row"${collapsible ? ` style="cursor:pointer" onclick="togExp('${ek}',${weekIdx})"` : ""}>
        <div class="wk-nm">${w.label}${pill}</div>
        ${expanded ? weekFocus(w, weekIdx) : ""}
        <div class="wk-hdr-r"><span class="ws ${scoreClass}">${sc}/${WEEK_TARGET}</span>${toggle || ""}</div>
      </div>
    </div>`;

  let html = "";
  sorted.forEach(({ w, wi: weekIdx }) => {
    if (w.t === "rest") {
      html += `<div class="rest"><div class="rest-ico">🌿</div><div><div style="font-weight:700;color:var(--gn);font-size:14px">${w.label} — Rest Week</div><div style="font-size:11px;color:var(--gn);margin-top:2px">Recharge. Reflect. Return stronger.</div></div></div>`;
      return;
    }
    const sc = wSc(w);
    const d7 = isDone(w);
    const ic = weekIdx === cwi;
    const scoreClass = weekScoreClass(sc);
    if (ic) {
      const pill = d7
        ? `<span class="pill pd">✓ Success</span>`
        : `<span class="pill pn">NOW</span>`;
      const wkCls = d7 ? "wk ok" : "wk cur";
      html += `<div class="${wkCls}">${weekHdr(w, weekIdx, { pill, sc, scoreClass: d7 ? "ws-ok" : scoreClass, expanded: true, collapsible: false })}${weekBody(w, weekIdx)}</div>`;
    } else if (d7) {
      const ie = !!ex[weekIdx];
      html += `<div class="wk ok">${weekHdr(w, weekIdx, { pill: `<span class="pill pd">✓ Success</span>`, sc, scoreClass: "ws-ok", toggle: `<span class="tog">${ie ? "▲" : "▼"}</span>`, expanded: ie, collapsible: true, ek })}${ie ? weekBody(w, weekIdx) : ""}</div>`;
    } else {
      const ie = !!ex[weekIdx];
      html += `<div class="wk" style="opacity:.5">${weekHdr(w, weekIdx, { pill: "", sc, scoreClass, toggle: `<span class="tog">${ie ? "▲" : "▼"}</span>`, expanded: ie, collapsible: true, ek })}${ie ? weekBody(w, weekIdx) : ""}</div>`;
    }
  });

  document.getElementById("month-c").innerHTML = `
    <div class="mn-head">
      <div class="mn-title">${esc(g.months[m]) || esc(g.name)}</div>
    </div>
    ${html}`;
  setTimeout(() => document.querySelectorAll(".wk-feedback").forEach(fitFeedback), 0);
}

function fitFeedback(ta) {
  if (!ta) return;
  const min = 36;
  const max = 120;
  ta.style.height = "auto";
  ta.style.height = Math.min(max, Math.max(min, ta.scrollHeight)) + "px";
}

function dayEntryHeader(w, di) {
  return `<div class="m-top">
      <div>
        <div class="m-title">${DAY_NAMES[di]}</div>
        <div class="m-sub">${esc(w.label)}</div>
      </div>
      <button class="m-close" onclick="closeMod()" aria-label="Close">✕</button>
    </div>`;
}

function tapDay(wi, di) {
  const g = goals.find((x) => x.id === gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);
  setSelDay(wi, di);
  if (w.dayStatus[di] && w.entries[di]) {
    renderMonth();
    return;
  }
  openDayEntry(wi, di);
}

function openDayEntry(wi, di) {
  const g = goals.find((x) => x.id === gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);
  setSelDay(wi, di);

  document.getElementById("pips").style.display = "none";
  document.getElementById("ov").classList.add("open");
  renderDayEntryPick(wi, di);
}

function editDayEntry(wi, di) {
  const g = goals.find((x) => x.id === gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);
  const status = w.dayStatus[di];
  if (!status) return;

  document.getElementById("pips").style.display = "none";
  document.getElementById("ov").classList.add("open");
  renderDayEntryNote(wi, di, status, true);
}

function renderDayEntryPick(wi, di) {
  const g = goals.find((x) => x.id === gId);
  if (!g) return;
  const w = g.weeks[wi];

  document.getElementById("m-body").innerHTML = `
    ${dayEntryHeader(w, di)}
    <div class="f-lbl" style="margin-bottom:12px">What did you do?</div>
    <div class="day-pick-btns">
      <button class="day-pick-btn dp-rest" onclick="pickDayStatus(${wi},${di},'rest')">Rest</button>
      <button class="day-pick-btn dp-busy" onclick="pickDayStatus(${wi},${di},'busy')">Busy</button>
      <button class="day-pick-btn dp-done" onclick="pickDayStatus(${wi},${di},'done')">Done</button>
    </div>`;
}

function pickDayStatus(wi, di, status) {
  renderDayEntryNote(wi, di, status, false);
}

function renderDayEntryNote(wi, di, status, editMode) {
  const g = goals.find((x) => x.id === gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);
  const meta = DAY_STATUS[status];
  if (!meta) return;

  const backFn = `renderDayEntryPick(${wi},${di})`;

  document.getElementById("m-body").innerHTML = `
    ${dayEntryHeader(w, di)}
    <div class="day-status-pill tag-${status}">${meta.label}</div>
    <textarea class="f-inp" id="day-entry" rows="4" placeholder="${esc(meta.placeholder)}" style="margin-bottom:20px">${esc(editMode || w.dayStatus[di] === status ? w.entries[di] : "")}</textarea>
    <div class="mf">
      <button onclick="${backFn}">← Back</button>
      <button class="ms" onclick="saveDayEntry(${wi},${di},'${status}')">Save ✓</button>
    </div>`;
  setTimeout(() => document.getElementById("day-entry")?.focus(), 100);
}

function saveDayEntry(wi, di, status) {
  const g = goals.find((x) => x.id === gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);

  const val = document.getElementById("day-entry").value.trim();
  if (!val) {
    alert("Please add a note before saving.");
    return;
  }

  w.entries[di] = val;
  w.dayStatus[di] = status;
  w.att[di] = status === "done" ? 1 : 0;
  setSelDay(wi, di);
  save();
  closeMod();
  renderMonth();
  renderHome();
  chkCel(g);
}

function saveFld(wi, f, v) {
  goals.find((x) => x.id === gId).weeks[wi][f] = v;
  save();
}

function togExp(ek, wi) {
  if (!window._exp[ek]) window._exp[ek] = {};
  window._exp[ek][wi] = !window._exp[ek][wi];
  renderMonth();
}

function delGoal(id) {
  if (!confirm("Delete this goal? All progress will be lost.")) return;
  goals = goals.filter((g) => g.id !== id);
  save();
  renderHome();
  setNav("home");
}

function moveGoal(id, dir) {
  const i = goals.findIndex((g) => g.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= goals.length) return;
  [goals[i], goals[j]] = [goals[j], goals[i]];
  save();
  renderHome();
}

function openEdit(id) {
  const g = goals.find((x) => x.id === id);
  if (!g) return;
  const mc = monthCount(g);
  document.getElementById("pips").style.display = "flex";
  ["p1", "p2", "p3"].forEach((x) => (document.getElementById(x).className = "pip"));
  document.getElementById("ov").classList.add("open");
  document.getElementById("m-body").innerHTML = `
    <div class="m-title">Edit Goal</div><div class="m-sub">Update details — progress is kept</div>
    <div class="dur-readonly">${goalDuration(g)}-month goal</div>
    <label class="f-lbl">Goal name</label><input class="f-inp" id="e-nm" value="${esc(g.name)}"/>
    <label class="f-lbl">Identity statement</label><input class="f-inp" id="e-id" value="${esc(g.identity)}"/>
    <label class="f-lbl">${bigGoalLabel(g)}</label><input class="f-inp" id="e-big" value="${esc(g.big)}"/>
    <label class="f-lbl">Start date</label><input class="f-inp" id="e-sd" type="date" value="${g.startDate}"/>
    <label class="f-lbl">Daily time window</label>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">From</div><input class="f-inp" id="e-tf" type="time" value="${g.timeFrom || ""}" style="margin-bottom:0"/></div>
      <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">To</div><input class="f-inp" id="e-tt" type="time" value="${g.timeTo || ""}" style="margin-bottom:0"/></div>
    </div>
    <label class="f-lbl">Atomic habit</label><input class="f-inp" id="e-ah" value="${esc(g.atomicHabit || "")}" placeholder="e.g. 15 mins of Duolingo"/>
    ${
      goalDuration(g) === 6
        ? `<label class="f-lbl" style="color:var(--ac)">${phaseLabel(g, 1)}</label><input class="f-inp" id="e-p1" value="${esc(g.p1)}"/>
    <label class="f-lbl" style="color:var(--ac-s)">${phaseLabel(g, 2)}</label><input class="f-inp" id="e-p2" value="${esc(g.p2)}"/>`
        : ""
    }
    <div class="divider">${goalDuration(g) === 3 ? "Period goals" : "Monthly goals"}</div>
    <div class="m-grid">${Array.from({ length: mc }, (_, i) => `<div><div class="m-lbl">${blockLabel(g, i)}</div><input class="m-inp" id="e-m${i}" value="${esc(g.months[i] || "")}" placeholder="Goal..."/></div>`).join("")}</div>
    <div class="mf"><button onclick="closeMod()">Cancel</button><button class="ms" onclick="saveEdit(${id})">Save ✓</button></div>`;
}

function saveEdit(id) {
  const g = goals.find((x) => x.id === id);
  if (!g) return;
  g.name = document.getElementById("e-nm").value.trim() || g.name;
  g.identity = document.getElementById("e-id").value.trim() || g.identity;
  g.big = document.getElementById("e-big").value.trim() || g.big;
  g.startDate = document.getElementById("e-sd").value || g.startDate;
  g.timeFrom = document.getElementById("e-tf").value;
  g.timeTo = document.getElementById("e-tt").value;
  g.atomicHabit = document.getElementById("e-ah").value.trim();
  if (goalDuration(g) === 6) {
    g.p1 = document.getElementById("e-p1").value.trim();
    g.p2 = document.getElementById("e-p2").value.trim();
  }
  g.months = Array.from({ length: monthCount(g) }, (_, i) =>
    document.getElementById("e-m" + i).value.trim()
  );
  save();
  closeMod();
  renderHome();
}

function openMod() {
  mStep = 1;
  mData = { duration: 6 };
  document.getElementById("pips").style.display = "flex";
  document.getElementById("ov").classList.add("open");
  renderMod();
}

function closeMod() {
  document.getElementById("ov").classList.remove("open");
  document.getElementById("pips").style.display = "flex";
  document.getElementById("p3").style.display = "";
}

function renderMod() {
  const dur = modDur();
  const steps = modSteps();
  document.getElementById("p3").style.display = dur === 3 ? "none" : "";
  ["p1", "p2", "p3"].forEach((x, i) => {
    if (dur === 3 && i >= 2) return;
    document.getElementById(x).className = "pip" + (mStep > i ? " on" : "");
  });
  const bigLbl = dur === 3 ? "3-month big goal" : "6-month big goal";
  const mc = dur === 3 ? 3 : 6;
  if (mStep === 1) {
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">New Goal</div><div class="m-sub">Step 1 of ${steps} — The basics</div>
      <label class="f-lbl">Goal duration</label>
      <div class="dur-pick">
        <button type="button" class="dur-btn${dur === 6 ? " on" : ""}" onclick="setDuration(6)">6 months</button>
        <button type="button" class="dur-btn${dur === 3 ? " on" : ""}" onclick="setDuration(3)">3 months</button>
      </div>
      <label class="f-lbl">Goal name</label><input class="f-inp" id="fn" placeholder="e.g. Learn Spanish" value="${esc(mData.name || "")}"/>
      <label class="f-lbl">Identity statement</label><input class="f-inp" id="fi" placeholder="I am someone who..." value="${esc(mData.identity || "")}"/>
      <label class="f-lbl">${bigLbl}</label><input class="f-inp" id="fb" placeholder="e.g. Reach A2 level" value="${esc(mData.big || "")}"/>
      <label class="f-lbl">Start date</label><input class="f-inp" id="fsd" type="date" value="${mData.startDate || tod()}"/>
      <label class="f-lbl">Daily time window</label>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">From</div><input class="f-inp" id="ftf" type="time" value="${mData.timeFrom || ""}" style="margin-bottom:0"/></div>
        <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">To</div><input class="f-inp" id="ftt" type="time" value="${mData.timeTo || ""}" style="margin-bottom:0"/></div>
      </div>
      <label class="f-lbl">Atomic habit <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--hi)">(minimum to count a day)</span></label>
      <input class="f-inp" id="fah" placeholder="e.g. 15 mins of Duolingo" value="${esc(mData.atomicHabit || "")}"/>
      <div class="mf"><button onclick="closeMod()">Cancel</button><button class="ms" onclick="mn()">Next →</button></div>`;
  } else if (mStep === 2 && dur === 3) {
    const bi = Array.from(
      { length: 3 },
      (_, i) =>
        `<div><div class="m-lbl">${BLOCK_LABELS_3[i]}</div><input class="m-inp" id="mm${i}" placeholder="Goal..." value="${esc((mData.months && mData.months[i]) || "")}"/></div>`
    ).join("");
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Period Goals</div><div class="m-sub">Step 2 of 2 — Optional but powerful</div>
      <div class="m-grid">${bi}</div>
      <div class="mf"><button onclick="mStep=1;renderMod()">← Back</button><button class="ms" onclick="sg()">Create Goal 🚀</button></div>`;
  } else if (mStep === 2) {
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Phase Goals</div><div class="m-sub">Step 2 of 3 — Your milestones</div>
      <label class="f-lbl" style="color:var(--ac)">Phase 1 · Months 1–3</label><input class="f-inp" id="fp1" placeholder="e.g. Reach A1 level" value="${esc(mData.p1 || "")}"/>
      <label class="f-lbl" style="color:var(--ac-s)">Phase 2 · Months 4–6</label><input class="f-inp" id="fp2" placeholder="e.g. Reach A2 level" value="${esc(mData.p2 || "")}"/>
      <div class="mf"><button onclick="mStep=1;renderMod()">← Back</button><button class="ms" onclick="mn()">Next →</button></div>`;
  } else {
    const mi = Array.from(
      { length: mc },
      (_, i) =>
        `<div><div class="m-lbl">Month ${i + 1}</div><input class="m-inp" id="mm${i}" placeholder="Goal..." value="${esc((mData.months && mData.months[i]) || "")}"/></div>`
    ).join("");
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Monthly Goals</div><div class="m-sub">Step 3 of 3 — ${mc} monthly goals · optional but powerful</div>
      <div class="m-grid">${mi}</div>
      <div class="mf"><button onclick="mStep=2;renderMod()">← Back</button><button class="ms" onclick="sg()">Create Goal 🚀</button></div>`;
  }
}

function mn() {
  if (mStep === 1) {
    const n = document.getElementById("fn").value.trim();
    const i = document.getElementById("fi").value.trim();
    const b = document.getElementById("fb").value.trim();
    if (!n || !i || !b) {
      alert("Please fill goal name, identity and big goal.");
      return;
    }
    mData = {
      ...mData,
      duration: modDur(),
      name: n,
      identity: i,
      big: b,
      startDate: document.getElementById("fsd").value,
      timeFrom: document.getElementById("ftf").value,
      timeTo: document.getElementById("ftt").value,
      atomicHabit: document.getElementById("fah").value.trim(),
    };
    mStep = 2;
  } else if (mStep === 2 && modDur() !== 3) {
    mData = {
      ...mData,
      p1: document.getElementById("fp1").value.trim(),
      p2: document.getElementById("fp2").value.trim(),
    };
    mStep = 3;
  }
  renderMod();
}

function sg() {
  if (goals.length >= MAX) {
    alert("Max " + MAX + " goals.");
    return;
  }
  const mc = modDur() === 3 ? 3 : 6;
  const months = Array.from({ length: mc }, (_, i) =>
    document.getElementById("mm" + i).value.trim()
  );
  goals.push(
    mkGoal(
      mData.name,
      mData.identity,
      mData.big,
      mData.p1,
      mData.p2,
      months,
      mData.startDate,
      mData.timeFrom,
      mData.timeTo,
      mData.atomicHabit,
      mData.duration
    )
  );
  save();
  closeMod();
  showHome();
}

function restoreRoute() {
  const s = history.state;
  if (s && s.route) {
    gId = s.gId ?? null;
    mIdx = s.mIdx ?? null;
    applyRoute(s.route);
    setNav(s.route);
    if (s.route === "goal" && s.gId) renderGoal();
    else if (s.route === "month" && s.mIdx !== undefined) renderMonth();
    else renderHome();
    return;
  }
  showHome();
}

const hr = new Date().getHours();
document.getElementById("greet").textContent =
  hr < 12 ? "Good morning ☀️" : hr < 17 ? "Good afternoon ⚡" : "Good evening 🌙";

Object.assign(window, {
  closeCel,
  openMod,
  closeMod,
  openSettings,
  showGoal,
  showMonth,
  showHome,
  openEdit,
  delGoal,
  moveGoal,
  setTodo,
  addTodo,
  delTodo,
  openDayEntry,
  tapDay,
  editDayEntry,
  pickDayStatus,
  renderDayEntryPick,
  renderDayEntryNote,
  saveDayEntry,
  saveFld,
  fitFeedback,
  togExp,
  mn,
  sg,
  setDuration,
  saveEdit,
  exportD,
  importD,
  dismissIB,
  promptInstall,
});

registerServiceWorker();
setupInstallPrompt();
history.replaceState({ route: "home" }, "", "#home");
splash();
restoreRoute();
checkInstallBanner();
