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
  if (!goalHasStarted(g)) return null;
  for (let m = 0; m < monthCount(g); m++) if (!mDone(g, m)) return m;
  return null;
}

export function normalizeGoals(data) {
  if (!Array.isArray(data)) return [];
  data.forEach((g) => {
    if (!g || typeof g !== "object") return;
    if (!g.duration) g.duration = 6;
    if (!Array.isArray(g.weeks)) g.weeks = mkWeeks(g.duration);
    if (!Array.isArray(g.months)) g.months = [];
    if (g.celebrated !== true) g.celebrated = false;
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
  return data.filter((g) => g && typeof g === "object");
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

export function homeDotClass(w, i, todayDi, g, weekIdx) {
  ensureWeekDay(w);
  if (g != null && weekIdx != null && !isDayInWeekPlan(g, weekIdx, i)) {
    return "dc";
  }
  const markToday =
    g &&
    goalHasStarted(g) &&
    weekIdx === curWk(g) &&
    i === todayDi &&
    isDayInWeekPlan(g, weekIdx, i);
  let cls = dayStatusClass(w.dayStatus[i], "dc");
  if (markToday) cls += " dc-today";
  return cls;
}

export function tod() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Upcoming Sunday (today if Sunday) as YYYY-MM-DD — default goal start for Sun–Sat weeks. */
export function nextSundayIso() {
  const n = new Date();
  n.setHours(12, 0, 0, 0);
  const day = n.getDay();
  if (day !== 0) n.setDate(n.getDate() + (7 - day));
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local calendar date for YYYY-MM-DD (avoids UTC date-only parse bugs). */
export function parseStartDate(iso) {
  if (!iso) return null;
  const d = new Date(String(iso).includes("T") ? iso : iso + "T12:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayMidnight() {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return n;
}

/** Sunday at midnight for program week `weekIdx` (0 = calendar week containing start date). */
export function weekCalendarStart(g, weekIdx) {
  const start = parseStartDate(g.startDate);
  const sun = new Date(start);
  sun.setDate(sun.getDate() - sun.getDay());
  sun.setDate(sun.getDate() + weekIdx * 7);
  return sun;
}

/** Calendar date for Su–Sa slot `dayIdx` in program week `weekIdx`. */
export function dateForWeekDay(g, weekIdx, dayIdx) {
  const d = weekCalendarStart(g, weekIdx);
  d.setDate(d.getDate() + dayIdx);
  return d;
}

/** Day counts toward this program week (on/after start date). */
export function isDayInWeekPlan(g, weekIdx, dayIdx) {
  const start = parseStartDate(g.startDate);
  if (!start) return true;
  return dateForWeekDay(g, weekIdx, dayIdx) >= start;
}

export function isDayLoggable(g, weekIdx, dayIdx) {
  if (!goalHasStarted(g)) return false;
  if (!isDayInWeekPlan(g, weekIdx, dayIdx)) return false;
  return dateForWeekDay(g, weekIdx, dayIdx) <= todayMidnight();
}

export function daysInWeekPlan(g, weekIdx) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (isDayInWeekPlan(g, weekIdx, i)) n++;
  return n;
}

/** Successful week target (5 max; partial week 1 from start day through Sat). */
export function weekTarget(g, weekIdx) {
  return Math.min(WEEK_TARGET, daysInWeekPlan(g, weekIdx));
}

export function weekDayDateNum(g, weekIdx, dayIdx) {
  return dateForWeekDay(g, weekIdx, dayIdx).getDate();
}

export function weekDayAriaDate(g, weekIdx, dayIdx) {
  return dateForWeekDay(g, weekIdx, dayIdx).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** e.g. "Sep 17 – 21" or "Sep 28 – Oct 4" for the Sun–Sat row. */
export function weekRangeLabel(g, weekIdx) {
  const a = dateForWeekDay(g, weekIdx, 0);
  const b = dateForWeekDay(g, weekIdx, 6);
  const sm = (d) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${sm(a)} – ${b.getDate()}`;
  }
  return `${sm(a)} – ${sm(b)}`;
}

function defaultSelDay(g, weekIdx) {
  const todayDi = new Date().getDay();
  if (goalHasStarted(g) && weekIdx === curWk(g)) {
    if (isDayLoggable(g, weekIdx, todayDi)) return todayDi;
    for (let i = 0; i < 7; i++) if (isDayLoggable(g, weekIdx, i)) return i;
  }
  for (let i = 0; i < 7; i++) if (isDayInWeekPlan(g, weekIdx, i)) return i;
  return 0;
}

/** Last week slot in the plan (includes final rest week). */
export function lastPlanWeekIndex(g) {
  return (goalDuration(g) === 3 ? 13 : 26) - 1;
}

/** True once the calendar reaches the goal's start date (local midnight). */
export function goalHasStarted(g) {
  const s = parseStartDate(g?.startDate);
  if (!s) return true;
  return todayMidnight() >= s;
}

export function fmtStartDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Celebration after all active weeks succeed and the calendar reaches the final week. */
export function goalReadyToCelebrate(g) {
  const wi = curWk(g);
  if (wi === null) return false;
  return gPct(g) === 100 && wi >= lastPlanWeekIndex(g);
}

/** Program week index (Sun–Sat blocks from start week), or null before start. */
export function curWk(g) {
  if (!goalHasStarted(g)) return null;
  const w0 = weekCalendarStart(g, 0);
  const n = todayMidnight();
  const diff = Math.floor((n - w0) / (7 * 24 * 60 * 60 * 1000));
  const total = goalDuration(g) === 3 ? 13 : 26;
  return Math.min(Math.max(0, diff), total - 1);
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

export function isDone(w, g, weekIdx) {
  if (w.t !== "active") return false;
  const tgt =
    g != null && weekIdx !== undefined ? weekTarget(g, weekIdx) : WEEK_TARGET;
  return wSc(w) >= tgt;
}

export function weekScoreClass(sc, target) {
  target = target ?? WEEK_TARGET;
  if (sc >= target) return "ws-ok";
  if (sc > 0) return "ws-pt";
  return "ws-no";
}

export function gPct(g) {
  let earned = 0;
  let possible = 0;
  g.weeks.forEach((w, wi) => {
    if (w.t !== "active") return;
    const tgt = weekTarget(g, wi);
    possible += tgt;
    earned += Math.min(wSc(w), tgt);
  });
  return possible ? Math.round((earned / possible) * 100) : 0;
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
  const { ws, mw } = mWks(g, m);
  let earned = 0;
  let possible = 0;
  mw.forEach((w, i) => {
    if (w.t !== "active") return;
    const wi = ws + i;
    const tgt = weekTarget(g, wi);
    possible += tgt;
    earned += Math.min(wSc(w), tgt);
  });
  return possible ? Math.round((earned / possible) * 100) : 0;
}

export function mDone(g, m) {
  const { ws, mw } = mWks(g, m);
  return mw.every((w, i) => {
    if (w.t !== "active") return true;
    return isDone(w, g, ws + i);
  });
}

export function phDone(g, ph) {
  for (const m of phaseMonths(g, ph)) if (!mDone(g, m)) return false;
  return true;
}

export function curMo(g, ph) {
  if (!goalHasStarted(g)) return null;
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

export function getSelDay(gId, weekIdx, g) {
  const k = selDayKey(gId, weekIdx);
  if (window._selDay[k] !== undefined) return window._selDay[k];
  if (g) return defaultSelDay(g, weekIdx);
  return new Date().getDay();
}

export function setSelDay(gId, weekIdx, di) {
  window._selDay[selDayKey(gId, weekIdx)] = di;
}

export function attBtnClass(w, i, todayDi, g, weekIdx) {
  ensureWeekDay(w);
  const markToday =
    g && goalHasStarted(g) && weekIdx === curWk(g) && i === todayDi;
  if (g != null && weekIdx != null && !isDayInWeekPlan(g, weekIdx, i)) {
    let cls = dayStatusClass(w.dayStatus[i], "ab ab-out");
    if (markToday) cls += " today";
    return cls;
  }
  if (g != null && weekIdx != null && !isDayLoggable(g, weekIdx, i)) {
    let cls = dayStatusClass(w.dayStatus[i], "ab ab-future");
    if (markToday) cls += " today";
    return cls;
  }
  let cls = dayStatusClass(w.dayStatus[i], "ab");
  if (markToday) cls += " today";
  if (g && weekIdx !== undefined && i === getSelDay(g.id, weekIdx, g)) cls += " sel";
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
