export const KEY = "momentum_v4";
export const TODO_KEY = "momentum_todos_v1";
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

export function downloadGoalsBackup(goals, dateLabel) {
  const b = new Blob([JSON.stringify({ v: 4, goals }, null, 2)], {
    type: "application/json",
  });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = "momentum-" + dateLabel + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(u);
}

export function readGoalsBackupFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d.goals || !Array.isArray(d.goals)) throw new Error("invalid");
        resolve(d.goals);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(new Error("read"));
    r.readAsText(file);
  });
}
