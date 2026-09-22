import {
  DAYS,
  DAY_NAMES,
  DAY_STATUS,
  MAX,
  TODO_MAX,
  QUOTES,
  WEEK_TARGET,
} from "./storage.js";
import {
  appState,
  persistGoals,
  persistTodos,
  closeMod,
  replaceGoalsFromBackup,
} from "./goals.js";
import {
  attBtnClass,
  blockLabel,
  curBlock,
  curMo,
  curWk,
  ensureWeekDay,
  gPct,
  getSelDay,
  goalDuration,
  homeDotClass,
  isDone,
  mDone,
  mPct,
  mWks,
  phaseGoalText,
  phaseLabel,
  phaseMonths,
  phDone,
  setSelDay,
  tod,
  wDaysLogged,
  wSc,
  weekScoreClass,
} from "./progress.js";
import {
  downloadGoalsBackup,
  readGoalsBackupFile,
} from "./storage.js";
import { renderGoalIdeasButton } from "./goal-ideas.js";

export function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtT(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = +h;
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

export function ring(p, sz, sw, col, tr) {
  tr = tr || "rgba(79,70,229,.08)";
  const r = (sz - sw) / 2;
  const c = 2 * Math.PI * r;
  const d = (p / 100) * c;
  return `<svg width="${sz}" height="${sz}" style="flex-shrink:0;display:block"><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="${tr}" stroke-width="${sw}"/><circle cx="${sz / 2}" cy="${sz / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${d} ${c}" stroke-linecap="round" transform="rotate(-90 ${sz / 2} ${sz / 2})"/><text x="${sz / 2}" y="${sz / 2 + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="${col}">${p}%</text></svg>`;
}

export function fitFeedback(ta) {
  if (!ta) return;
  const min = 36;
  const max = 120;
  ta.style.height = "auto";
  ta.style.height = Math.min(max, Math.max(min, ta.scrollHeight)) + "px";
}

export function splash() {
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

export function chkCel(g) {
  if (gPct(g) === 100) {
    document.getElementById("cel-g").textContent = '"' + g.big + '"';
    document.getElementById("celebration").classList.add("show");
  }
}

export function closeCel() {
  document.getElementById("celebration").classList.remove("show");
}

export function renderHome() {
  const total = appState.goals.length;
  document.getElementById("h-sub").textContent =
    total === 0
      ? "Add your first goal to get started"
      : `${total} goal${total > 1 ? "s" : ""} tracked · up to ${MAX} at a time`;

  let h = appState.goals
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

  if (appState.goals.length < MAX)
    h += `<div class="add-c" onclick="openMod()">
    <div class="add-ico">＋</div>
    <div style="font-size:14px;font-weight:700;color:var(--mu)">Add Goal ${appState.goals.length ? `(${appState.goals.length}/${MAX})` : ""}</div>
    <div style="font-size:12px;color:var(--hi)">Up to ${MAX} goals at a time</div>
  </div>`;

  document.getElementById("goal-grid").innerHTML = h;
  renderGoalIdeasButton();
  renderPriorityCard();
}

export function renderGoal() {
  const g = appState.goals.find((x) => x.id === appState.gId);
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

export function renderMonth() {
  const g = appState.goals.find((x) => x.id === appState.gId);
  const m = appState.mIdx;
  if (!g || m === null) return;

  const { ws, mw } = mWks(g, m);
  const aw = [...mw];
  if (goalDuration(g) === 6) {
    if (m === 2) aw.push(g.weeks[12]);
    if (m === 5) aw.push(g.weeks[25]);
  } else if (m === 2) {
    aw.push(g.weeks[12]);
  }

  const ek = `${appState.gId}_${m}`;
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
    const di = getSelDay(appState.gId, weekIdx);
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
        `<button class="${attBtnClass(w, i, todayDi, appState.gId, weekIdx)}" onclick="tapDay(${weekIdx},${i})" aria-label="${DAY_NAMES[i]}"><span>${d}</span><i></i></button>`
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
      const pill = d7 ? "" : `<span class="pill pn">NOW</span>`;
      const wkCls = d7 ? "wk ok" : "wk cur";
      html += `<div class="${wkCls}">${weekHdr(w, weekIdx, { pill, sc, scoreClass: d7 ? "ws-ok" : scoreClass, expanded: true, collapsible: false })}${weekBody(w, weekIdx)}</div>`;
    } else if (d7) {
      const ie = !!ex[weekIdx];
      html += `<div class="wk ok">${weekHdr(w, weekIdx, { pill: "", sc, scoreClass: "ws-ok", toggle: `<span class="tog">${ie ? "▲" : "▼"}</span>`, expanded: ie, collapsible: true, ek })}${ie ? weekBody(w, weekIdx) : ""}</div>`;
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
function saveFld(wi, f, v) {
  appState.goals.find((x) => x.id === appState.gId).weeks[wi][f] = v;
  persistGoals();
}

function togExp(ek, wi) {
  if (!window._exp[ek]) window._exp[ek] = {};
  window._exp[ek][wi] = !window._exp[ek][wi];
  renderMonth();
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

function setTodo(i, v) {
  if (i < 0 || i >= appState.todos.length) return;
  appState.todos[i] = v;
  persistTodos();
}

function tapDay(wi, di) {
  const g = appState.goals.find((x) => x.id === appState.gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);
  setSelDay(appState.gId, wi, di);
  if (w.dayStatus[di] && w.entries[di]) {
    renderMonth();
    return;
  }
  openDayEntry(wi, di);
}

function openDayEntry(wi, di) {
  const g = appState.goals.find((x) => x.id === appState.gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);
  setSelDay(appState.gId, wi, di);

  document.getElementById("pips").style.display = "none";
  document.getElementById("ov").classList.add("open");
  renderDayEntryPick(wi, di);
}

function editDayEntry(wi, di) {
  const g = appState.goals.find((x) => x.id === appState.gId);
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
  const g = appState.goals.find((x) => x.id === appState.gId);
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
  const g = appState.goals.find((x) => x.id === appState.gId);
  if (!g) return;
  const w = g.weeks[wi];
  ensureWeekDay(w);
  const meta = DAY_STATUS[status];
  if (!meta) return;

  document.getElementById("m-body").innerHTML = `
    ${dayEntryHeader(w, di)}
    <div class="day-status-pill tag-${status}">${meta.label}</div>
    <textarea class="f-inp" id="day-entry" rows="4" placeholder="${esc(meta.placeholder)}" style="margin-bottom:20px">${esc(editMode || w.dayStatus[di] === status ? w.entries[di] : "")}</textarea>
    <div class="mf">
      <button type="button">← Back</button>
      <button type="button" class="ms">Save ✓</button>
    </div>`;
  const mf = document.querySelector("#m-body .mf");
  const [backBtn, saveBtn] = mf?.querySelectorAll("button") || [];
  if (backBtn) {
    backBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      renderDayEntryPick(wi, di);
    };
  }
  if (saveBtn) {
    saveBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveDayEntry(wi, di, status);
    };
  }
  setTimeout(() => document.getElementById("day-entry")?.focus(), 100);
}

function saveDayEntry(wi, di, status) {
  const g = appState.goals.find((x) => x.id === appState.gId);
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
  setSelDay(appState.gId, wi, di);
  persistGoals();
  closeMod();
  renderMonth();
  renderHome();
  chkCel(g);
}


function addTodo() {
  if (appState.todos.length >= TODO_MAX) return;
  appState.todos.push("");
  persistTodos();
  renderPriorityCard();
  const inputs = document.querySelectorAll(".prio-inp");
  inputs[inputs.length - 1]?.focus();
}

function delTodo(i) {
  if (i < 0 || i >= appState.todos.length) return;
  appState.todos.splice(i, 1);
  persistTodos();
  renderPriorityCard();
}

function renderPriorityCard() {
  const el = document.getElementById("priority-card");
  if (!el) return;
  const rows = appState.todos
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
    appState.todos.length < TODO_MAX
      ? `<button type="button" class="prio-add" onclick="event.stopPropagation();addTodo()">+ Add to do</button>`
      : `<p class="prio-cap">Maximum ${TODO_MAX} items</p>`;
  const empty =
    !appState.todos.length
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



export function exportD() {
  downloadGoalsBackup(appState.goals, tod());
}

export function importD(e) {
  const f = e.target.files[0];
  if (!f) return;
  readGoalsBackupFile(f)
    .then((goals) => {
      if (!confirm("Replace all data with this backup?")) return;
      replaceGoalsFromBackup(goals);
      import("./navigation.js").then((m) => m.showHome());
      alert("Imported!");
    })
    .catch(() => alert("Invalid file."))
    .finally(() => {
      e.target.value = "";
    });
}

export function openSettings() {
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

export {
  saveFld,
  togExp,
  setTodo,
  addTodo,
  delTodo,
  renderPriorityCard,
  tapDay,
  openDayEntry,
  editDayEntry,
  renderDayEntryPick,
  pickDayStatus,
  renderDayEntryNote,
  saveDayEntry,
};
