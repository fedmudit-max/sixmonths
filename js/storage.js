export const KEY = "momentum_v4";
export const TODO_KEY = "momentum_todos_v1";
export const BACKUP_VERSION = 5;
export const MAX = 5;
export const TODO_MAX = 5;

export const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const WEEK_TARGET = 5;
export const BLOCK_LABELS_3 = ["Week 1–4", "Week 5–8", "Week 9–12"];
export const DAY_STATUS = {
  rest: { label: "Rest", placeholder: "What is the reason for rest today?" },
  busy: { label: "Busy", placeholder: "What kept you busy today?" },
  done: { label: "Done", placeholder: "What have you accomplished today?" },
};
export const QUOTES = [
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

export function loadGoals() {
  try {
    const d = localStorage.getItem(KEY);
    return d ? JSON.parse(d) : null;
  } catch (e) {
    return null;
  }
}

export function saveGoalsData(goals) {
  try {
    localStorage.setItem(KEY, JSON.stringify(goals));
  } catch (e) {}
}

export function loadTodos() {
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

export function saveTodosData(todos) {
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  } catch (e) {}
}

export function normalizeTodosImport(raw) {
  if (!Array.isArray(raw)) return [];
  const items = raw.slice(0, TODO_MAX).map((s) => String(s ?? ""));
  if (items.every((s) => !s.trim())) return [];
  return items;
}

export function downloadMomentumBackup(goals, todos, dateLabel) {
  const b = new Blob(
    [JSON.stringify({ v: BACKUP_VERSION, goals, todos }, null, 2)],
    { type: "application/json" }
  );
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = "momentum-" + dateLabel + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(u);
}

function assertImportableGoal(g) {
  if (!g || typeof g !== "object") throw new Error("invalid goal");
  if (g.weeks !== undefined && !Array.isArray(g.weeks)) throw new Error("invalid goal");
}

/** Parse exported backup JSON (v4 goals-only or v5 goals + todos). */
export function parseMomentumBackup(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("empty");
  let d;
  try {
    d = JSON.parse(trimmed);
  } catch {
    throw new Error("invalid json");
  }
  if (!d || typeof d !== "object") throw new Error("invalid");
  if (!Array.isArray(d.goals)) throw new Error("invalid");
  if (d.goals.length > MAX) throw new Error("too many goals");
  d.goals.forEach(assertImportableGoal);
  return {
    goals: d.goals,
    todos: normalizeTodosImport(d.todos),
  };
}

export function backupImportErrorMessage(err) {
  if (!err?.message) return "Invalid or unsupported backup file.";
  switch (err.message) {
    case "empty":
      return "The file is empty.";
    case "too many goals":
      return `This backup has more than ${MAX} goals. Momentum supports up to ${MAX} at a time.`;
    case "invalid goal":
      return "The backup contains a goal that could not be read.";
    default:
      return "Invalid or unsupported backup file.";
  }
}

/** @returns {Promise<{ goals: unknown[], todos: string[] }>} */
export function readMomentumBackupFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        resolve(parseMomentumBackup(ev.target.result));
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(new Error("read"));
    r.readAsText(file);
  });
}
