import {
  registerServiceWorker,
  setupInstallPrompt,
  promptInstall,
  checkInstallBanner,
  dismissIB,
} from "./pwa.js";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const KEY = "momentum_v4";
const MAX = 5;
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

function mkWeeks() {
  const w = [];
  for (let i = 0; i < 26; i++) {
    if (i === 12 || i === 25) w.push({ t: "rest", label: "Week " + (i + 1) });
    else
      w.push({
        t: "active",
        label: "Week " + (i + 1),
        att: [0, 0, 0, 0, 0, 0, 0],
        focus: "",
        feedback: "",
        repeat: null,
      });
  }
  return w;
}

function mkGoal(nm, id, big, p1, p2, months, sd, tf, tt, ah) {
  return {
    id: (Date.now() + Math.random()) | 0,
    name: nm,
    identity: id,
    big,
    p1,
    p2,
    months: months || Array(6).fill(""),
    checkins: Array(6).fill(""),
    weeks: mkWeeks(),
    startDate: sd || tod(),
    timeFrom: tf || "",
    timeTo: tt || "",
    atomicHabit: ah || "",
  };
}

function tod() {
  return new Date().toISOString().split("T")[0];
}

let goals =
  load() ||
  [
    mkGoal(
      "Learn Spanish",
      "I am someone who speaks Spanish fluently",
      "Reach A2 level in 6 months",
      "Reach A1 level (Months 1–3)",
      "Reach A2 level (Months 4–6)",
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
  ];
let gId = null;
let mIdx = null;
let mStep = 1;
let mData = {};
if (!window._exp) window._exp = {};
if (!window._sc) window._sc = {};

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
  let a = 0;
  let i = 0;
  while (i < 26) {
    if (g.weeks[i].t === "rest") {
      i++;
      continue;
    }
    if (a === Math.min(diff, 23)) return i;
    a++;
    i++;
  }
  return 0;
}

function wSc(w) {
  return w.att ? w.att.filter(Boolean).length : 0;
}

function isDone(w) {
  return w.t === "active" && wSc(w) === 7;
}

function gPct(g) {
  const aw = g.weeks.filter((w) => w.t === "active");
  return Math.round(
    (aw.reduce((s, w) => s + w.att.filter(Boolean).length, 0) / (aw.length * 7)) * 100
  );
}

function mWks(g, m) {
  const ps = m < 3 ? 0 : 13;
  const ws = ps + (m < 3 ? m : m - 3) * 4;
  return { ws, mw: g.weeks.slice(ws, ws + 4) };
}

function mPct(g, m) {
  const { mw } = mWks(g, m);
  const d = mw.reduce(
    (s, w) => s + (w.t === "active" ? w.att.filter(Boolean).length : 0),
    0
  );
  const x = mw.filter((w) => w.t === "active").length * 7;
  return x ? Math.round((d / x) * 100) : 0;
}

function mDone(g, m) {
  const { mw } = mWks(g, m);
  return mw.filter((w) => w.t === "active").every(isDone);
}

function phDone(g, ph) {
  for (let m = ph === 1 ? 0 : 3; m < (ph === 1 ? 3 : 6); m++)
    if (!mDone(g, m)) return false;
  return true;
}

function curMo(g, ph) {
  if (phDone(g, 1) && ph === 1) return null;
  if (!phDone(g, 1) && ph === 2) return null;
  for (let m = ph === 1 ? 0 : 3; m < (ph === 1 ? 3 : 6); m++) if (!mDone(g, m)) return m;
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
      goals = d.goals;
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
    .map((g) => {
      const p = gPct(g);
      const wi = curWk(g);
      const cw = g.weeks[wi];
      const att = cw && cw.t === "active" ? cw.att : Array(7).fill(0);
      const dots = DAYS.map(
        (d, i) => `<div class="dc${att[i] ? " on" : ""}">${d}</div>`
      ).join("");
      const wd = att.filter(Boolean).length;
      const timePill =
        g.timeFrom && g.timeTo
          ? `<div class="gc-pill gc-pill-time">🕐 ${fmtT(g.timeFrom)}–${fmtT(g.timeTo)}</div>`
          : "";
      const ahPill = g.atomicHabit
        ? `<div class="gc-pill gc-pill-habit">⚡ ${esc(g.atomicHabit)}</div>`
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
            </div>
          </div>
        </div>
      </div>
      <div class="gc-footer">${dots}<span class="gc-wk-label">${wd}/7 · Wk ${wi + 1}</span></div>
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

  function phase(ph) {
    const pd = phDone(g, ph);
    const cm = curMo(g, ph);
    const lbl = ph === 1 ? "Phase 1 · Months 1–3" : "Phase 2 · Months 4–6";
    const txt = ph === 1 ? g.p1 : g.p2;
    const ms = Array.from({ length: 3 }, (_, i) => (ph === 1 ? i : i + 3));
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
      <div class="ph-hdr"><div class="ph-tag">${lbl}${pd ? " · ✓ Complete" : ""}</div><div class="ph-goal">${esc(txt) || "Set phase goal"}</div></div>
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
  if (m === 2) aw.push(g.weeks[12]);
  if (m === 5) aw.push(g.weeks[25]);

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
  const di = idx.filter(({ w }) => isDone(w)).sort((a, b) => b.wi - a.wi);
  const fi = idx.filter(({ w, wi: weekIdx }) => !isDone(w) && weekIdx !== cwi && w.t !== "rest");
  const ri = idx.filter(({ w }) => w.t === "rest");
  const sorted = [...(ci ? [ci] : []), ...di, ...fi, ...ri];

  const todayDi = new Date().getDay();
  const atts = (w, weekIdx) =>
    DAYS.map(
      (d, i) =>
        `<button class="ab${w.att[i] ? " on" : ""}${i === todayDi ? " today" : ""}" onclick="togDay(${weekIdx},${i})"><span>${d}</span><i></i></button>`
    ).join("");
  const yn = (w, weekIdx) => `<div class="fl">Would you repeat this approach?</div>
    <div class="yn-r">
      <button class="yn-b${w.repeat === 1 ? " yn-y" : ""}" onclick="setRep(${weekIdx},1)">👍 Yes, it worked</button>
      <button class="yn-b${w.repeat === 0 ? " yn-n" : ""}" onclick="setRep(${weekIdx},0)">👎 Need to change</button>
    </div>`;
  const det = (w, weekIdx) => `<div onclick="event.stopPropagation()">
    <div class="att-lbl">Attendance</div><div class="att-row">${atts(w, weekIdx)}</div>
    <div class="fl">Weekly Focus</div><input class="fi" value="${esc(w.focus)}" placeholder="What's your focus this week?" oninput="saveFld(${weekIdx},'focus',this.value)"/>
    <div class="fl">Weekly Feedback</div><textarea class="fi" rows="2" placeholder="How did the week go?" oninput="saveFld(${weekIdx},'feedback',this.value)">${esc(w.feedback)}</textarea>
    ${yn(w, weekIdx)}
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
    if (ic) {
      html += `<div class="wk cur"><div class="wk-hdr open"><div class="wk-nm">${w.label}<span class="pill pn">NOW</span></div><span class="ws ${sc >= 5 ? "ws-ok" : sc > 0 ? "ws-pt" : "ws-no"}">${sc}/7</span></div>${det(w, weekIdx)}</div>`;
    } else if (d7) {
      const ie = !!ex[weekIdx];
      html += `<div class="wk ok"><div class="wk-hdr${ie ? " open" : ""}" style="cursor:pointer" onclick="togExp('${ek}',${weekIdx})"><div class="wk-nm">${w.label}<span class="pill pd">✓ Done</span></div><div style="display:flex;align-items:center;gap:6px"><span class="ws ws-ok">${sc}/7</span><span class="tog">${ie ? "▲" : "▼"}</span></div></div>${ie ? det(w, weekIdx) : ""}</div>`;
    } else {
      const ie = !!ex[weekIdx];
      html += `<div class="wk" style="opacity:.5"><div class="wk-hdr${ie ? " open" : ""}" style="cursor:pointer" onclick="togExp('${ek}',${weekIdx})"><div class="wk-nm">${w.label}</div><div style="display:flex;align-items:center;gap:6px"><span class="ws ws-no">${sc}/7</span><span class="tog">${ie ? "▲" : "▼"}</span></div></div>${ie ? det(w, weekIdx) : ""}</div>`;
    }
  });

  document.getElementById("month-c").innerHTML = `
    <div class="mn-head">
      <div class="mn-tag">Month ${m + 1} · ${m < 3 ? "Phase 1" : "Phase 2"}</div>
      <div class="mn-title">${esc(g.months[m]) || esc(g.name)}</div>
    </div>
    ${g.atomicHabit ? `<div class="ah-card"><div class="ah-ico">⚡</div><div><div class="ah-label">Minimum daily habit</div><div class="ah-text">${esc(g.atomicHabit)}</div><div class="ah-sub">Do at least this to count the day ✓</div></div></div>` : ""}
    <div class="ci-card"><div class="ci-label">📝 Month ${m + 1} check-in</div><textarea class="fi" rows="3" style="margin-bottom:0" placeholder="What did you learn this month?" oninput="saveCi(${m},this.value)">${esc(g.checkins[m])}</textarea></div>
    ${html}`;
}

function togDay(wi, di) {
  const g = goals.find((x) => x.id === gId);
  g.weeks[wi].att[di] = g.weeks[wi].att[di] ? 0 : 1;
  save();
  renderMonth();
  chkCel(g);
}

function saveFld(wi, f, v) {
  goals.find((x) => x.id === gId).weeks[wi][f] = v;
  save();
}

function saveCi(m, v) {
  goals.find((x) => x.id === gId).checkins[m] = v;
  save();
}

function setRep(wi, v) {
  const g = goals.find((x) => x.id === gId);
  g.weeks[wi].repeat = g.weeks[wi].repeat === v ? null : v;
  save();
  renderMonth();
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

function openEdit(id) {
  const g = goals.find((x) => x.id === id);
  if (!g) return;
  document.getElementById("pips").style.display = "flex";
  ["p1", "p2", "p3"].forEach((x) => (document.getElementById(x).className = "pip"));
  document.getElementById("ov").classList.add("open");
  document.getElementById("m-body").innerHTML = `
    <div class="m-title">Edit Goal</div><div class="m-sub">Update details — progress is kept</div>
    <label class="f-lbl">Goal name</label><input class="f-inp" id="e-nm" value="${esc(g.name)}"/>
    <label class="f-lbl">Identity statement</label><input class="f-inp" id="e-id" value="${esc(g.identity)}"/>
    <label class="f-lbl">6-month big goal</label><input class="f-inp" id="e-big" value="${esc(g.big)}"/>
    <label class="f-lbl">Start date</label><input class="f-inp" id="e-sd" type="date" value="${g.startDate}"/>
    <label class="f-lbl">Daily time window</label>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">From</div><input class="f-inp" id="e-tf" type="time" value="${g.timeFrom || ""}" style="margin-bottom:0"/></div>
      <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">To</div><input class="f-inp" id="e-tt" type="time" value="${g.timeTo || ""}" style="margin-bottom:0"/></div>
    </div>
    <label class="f-lbl">Atomic habit</label><input class="f-inp" id="e-ah" value="${esc(g.atomicHabit || "")}" placeholder="e.g. 15 mins of Duolingo"/>
    <label class="f-lbl" style="color:var(--ac)">Phase 1 goal</label><input class="f-inp" id="e-p1" value="${esc(g.p1)}"/>
    <label class="f-lbl" style="color:var(--ac-s)">Phase 2 goal</label><input class="f-inp" id="e-p2" value="${esc(g.p2)}"/>
    <div class="divider">Monthly goals</div>
    <div class="m-grid">${Array.from({ length: 6 }, (_, i) => `<div><div class="m-lbl">Month ${i + 1}</div><input class="m-inp" id="e-m${i}" value="${esc(g.months[i] || "")}" placeholder="Goal..."/></div>`).join("")}</div>
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
  g.p1 = document.getElementById("e-p1").value.trim();
  g.p2 = document.getElementById("e-p2").value.trim();
  g.months = Array.from({ length: 6 }, (_, i) =>
    document.getElementById("e-m" + i).value.trim()
  );
  save();
  closeMod();
  renderHome();
}

function openMod() {
  mStep = 1;
  mData = {};
  document.getElementById("pips").style.display = "flex";
  document.getElementById("ov").classList.add("open");
  renderMod();
}

function closeMod() {
  document.getElementById("ov").classList.remove("open");
  document.getElementById("pips").style.display = "flex";
}

function renderMod() {
  ["p1", "p2", "p3"].forEach(
    (x, i) => (document.getElementById(x).className = "pip" + (mStep > i ? " on" : ""))
  );
  if (mStep === 1) {
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">New Goal</div><div class="m-sub">Step 1 of 3 — The basics</div>
      <label class="f-lbl">Goal name</label><input class="f-inp" id="fn" placeholder="e.g. Learn Spanish" value="${esc(mData.name || "")}"/>
      <label class="f-lbl">Identity statement</label><input class="f-inp" id="fi" placeholder="I am someone who..." value="${esc(mData.identity || "")}"/>
      <label class="f-lbl">6-month big goal</label><input class="f-inp" id="fb" placeholder="e.g. Reach A2 level" value="${esc(mData.big || "")}"/>
      <label class="f-lbl">Start date</label><input class="f-inp" id="fsd" type="date" value="${mData.startDate || tod()}"/>
      <label class="f-lbl">Daily time window</label>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">From</div><input class="f-inp" id="ftf" type="time" value="${mData.timeFrom || ""}" style="margin-bottom:0"/></div>
        <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">To</div><input class="f-inp" id="ftt" type="time" value="${mData.timeTo || ""}" style="margin-bottom:0"/></div>
      </div>
      <label class="f-lbl">Atomic habit <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--hi)">(minimum to count a day)</span></label>
      <input class="f-inp" id="fah" placeholder="e.g. 15 mins of Duolingo" value="${esc(mData.atomicHabit || "")}"/>
      <div class="mf"><button onclick="closeMod()">Cancel</button><button class="ms" onclick="mn()">Next →</button></div>`;
  } else if (mStep === 2) {
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Phase Goals</div><div class="m-sub">Step 2 of 3 — Your milestones</div>
      <label class="f-lbl" style="color:var(--ac)">Phase 1 · Months 1–3</label><input class="f-inp" id="fp1" placeholder="e.g. Reach A1 level" value="${esc(mData.p1 || "")}"/>
      <label class="f-lbl" style="color:var(--ac-s)">Phase 2 · Months 4–6</label><input class="f-inp" id="fp2" placeholder="e.g. Reach A2 level" value="${esc(mData.p2 || "")}"/>
      <div class="mf"><button onclick="mStep=1;renderMod()">← Back</button><button class="ms" onclick="mn()">Next →</button></div>`;
  } else {
    const mi = Array.from(
      { length: 6 },
      (_, i) =>
        `<div><div class="m-lbl">Month ${i + 1}</div><input class="m-inp" id="mm${i}" placeholder="Goal..." value="${esc((mData.months && mData.months[i]) || "")}"/></div>`
    ).join("");
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Monthly Goals</div><div class="m-sub">Step 3 of 3 — Optional but powerful</div>
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
      name: n,
      identity: i,
      big: b,
      startDate: document.getElementById("fsd").value,
      timeFrom: document.getElementById("ftf").value,
      timeTo: document.getElementById("ftt").value,
      atomicHabit: document.getElementById("fah").value.trim(),
    };
    mStep = 2;
  } else if (mStep === 2) {
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
  const months = Array.from({ length: 6 }, (_, i) =>
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
      mData.atomicHabit
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
  togDay,
  saveFld,
  saveCi,
  setRep,
  togExp,
  mn,
  sg,
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
