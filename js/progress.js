import { WEEK_TARGET, BLOCK_LABELS_3 } from "./storage.js";

export function mkWeeks(duration) {
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

export function goalDuration(g) {
  return g.duration === 3 ? 3 : 6;
}

export function monthCount(g) {
  return goalDuration(g) === 3 ? 3 : 6;
}

export function phaseMonths(g, ph) {
  return goalDuration(g) === 3
    ? ph === 1
      ? [0]
      : [1, 2]
    : ph === 1
      ? [0, 1, 2]
      : [3, 4, 5];
}

export function phaseLabel(g, ph) {
  if (goalDuration(g) === 3) {
    return ph === 1 ? "Phase 1 · Month 1" : "Phase 2 · Months 2–3";
  }
  return ph === 1 ? "Phase 1 · Months 1–3" : "Phase 2 · Months 4–6";
}

export function bigGoalLabel(g) {
  return goalDuration(g) === 3 ? "3-month big goal" : "6-month big goal";
}

export function blockLabel(g, m) {
  if (goalDuration(g) === 3) return BLOCK_LABELS_3[m] || `Week ${m + 1}`;
  return `Month ${m + 1}`;
}

export function curBlock(g) {
  for (let m = 0; m < monthCount(g); m++) if (!mDone(g, m)) return m;
  return null;
}

export function normalizeGoals(data) {
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

export function ensureWeekDay(w) {
  if (!w.entries) w.entries = Array(7).fill("");
  if (!w.dayStatus) w.dayStatus = Array(7).fill("");
}

export function dayStatusClass(st, base) {
  if (st === "done") return `${base} on`;
  if (st === "rest") return `${base} st-rest`;
  if (st === "busy") return `${base} st-busy`;
  return base;
}

export function homeDotClass(w, i, todayDi) {
  ensureWeekDay(w);
  let cls = dayStatusClass(w.dayStatus[i], "dc");
  if (i === todayDi) cls += " dc-today";
  return cls;
}

export function tod() {
  return new Date().toISOString().split("T")[0];
}

export function curWk(g) {
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

export function wSc(w) {
  return w.att ? w.att.filter(Boolean).length : 0;
}

export function wDaysLogged(w) {
  ensureWeekDay(w);
  let n = 0;
  for (let i = 0; i < 7; i++) if (w.dayStatus[i] && w.entries[i]) n++;
  return n;
}

export function isDone(w) {
  return w.t === "active" && wSc(w) >= WEEK_TARGET;
}

export function weekScoreClass(sc) {
  if (sc >= WEEK_TARGET) return "ws-ok";
  if (sc > 0) return "ws-pt";
  return "ws-no";
}

export function gPct(g) {
  const aw = g.weeks.filter((w) => w.t === "active");
  return Math.round(
    (aw.reduce((s, w) => s + Math.min(wSc(w), WEEK_TARGET), 0) /
      (aw.length * WEEK_TARGET)) *
      100
  );
}

export function mWks(g, m) {
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

export function mPct(g, m) {
  const { mw } = mWks(g, m);
  const d = mw.reduce(
    (s, w) => s + (w.t === "active" ? Math.min(wSc(w), WEEK_TARGET) : 0),
    0
  );
  const x = mw.filter((w) => w.t === "active").length * WEEK_TARGET;
  return x ? Math.round((d / x) * 100) : 0;
}

export function mDone(g, m) {
  const { mw } = mWks(g, m);
  return mw.filter((w) => w.t === "active").every(isDone);
}

export function phDone(g, ph) {
  for (const m of phaseMonths(g, ph)) if (!mDone(g, m)) return false;
  return true;
}

export function curMo(g, ph) {
  if (phDone(g, 1) && ph === 1) return null;
  if (!phDone(g, 1) && ph === 2) return null;
  for (const m of phaseMonths(g, ph)) if (!mDone(g, m)) return m;
  return null;
}

export function phaseGoalText(txt, ph, g) {
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

function selDayKey(gId, weekIdx) {
  return `${gId}_${weekIdx}`;
}

export function getSelDay(gId, weekIdx) {
  const k = selDayKey(gId, weekIdx);
  if (window._selDay[k] !== undefined) return window._selDay[k];
  return new Date().getDay();
}

export function setSelDay(gId, weekIdx, di) {
  window._selDay[selDayKey(gId, weekIdx)] = di;
}

export function attBtnClass(w, i, todayDi, gId, weekIdx) {
  ensureWeekDay(w);
  let cls = dayStatusClass(w.dayStatus[i], "ab");
  if (i === todayDi) cls += " today";
  if (weekIdx !== undefined && i === getSelDay(gId, weekIdx)) cls += " sel";
  return cls;
}

export function mkGoal(nm, id, big, p1, p2, months, sd, tf, tt, ah, duration) {
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
