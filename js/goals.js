import {
  MAX,
  BLOCK_LABELS_3,
  loadGoals,
  loadTodos,
  saveGoalsData,
  saveTodosData,
} from "./storage.js";
import {
  mkGoal,
  normalizeGoals,
  bigGoalLabel,
  blockLabel,
  goalDuration,
  monthCount,
  phaseLabel,
  tod,
} from "./progress.js";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const appState = {
  goals: normalizeGoals(loadGoals() || [defaultGoal()]),
  todos: loadTodos(),
  gId: null,
  mIdx: null,
  mStep: 1,
  mData: { duration: 6 },
};

function defaultGoal() {
  return mkGoal(
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
  );
}

export function persistGoals() {
  saveGoalsData(appState.goals);
}

export function persistTodos() {
  saveTodosData(appState.todos);
}

export function initUiState() {
  if (!window._exp) window._exp = {};
  if (!window._sc) window._sc = {};
  if (!window._selDay) window._selDay = {};
}

async function refreshHomeNav() {
  const [{ renderHome }, { setNav }] = await Promise.all([
    import("./ui.js"),
    import("./navigation.js"),
  ]);
  renderHome();
  setNav("home");
}

function modDur() {
  return appState.mData.duration === 3 ? 3 : 6;
}

function modSteps() {
  return modDur() === 3 ? 2 : 3;
}

export function setDuration(d) {
  if (appState.mStep === 1) {
    appState.mData = {
      ...appState.mData,
      duration: d === 3 ? 3 : 6,
      name: document.getElementById("fn")?.value.trim() || appState.mData.name,
      identity: document.getElementById("fi")?.value.trim() || appState.mData.identity,
      big: document.getElementById("fb")?.value.trim() || appState.mData.big,
      startDate: document.getElementById("fsd")?.value || appState.mData.startDate,
      timeFrom: document.getElementById("ftf")?.value || appState.mData.timeFrom,
      timeTo: document.getElementById("ftt")?.value || appState.mData.timeTo,
      atomicHabit: document.getElementById("fah")?.value.trim() || appState.mData.atomicHabit,
    };
  } else {
    appState.mData.duration = d === 3 ? 3 : 6;
  }
  renderMod();
}

export function delGoal(id) {
  if (!confirm("Delete this goal? All progress will be lost.")) return;
  appState.goals = appState.goals.filter((g) => g.id !== id);
  persistGoals();
  refreshHomeNav();
}

export function moveGoal(id, dir) {
  const i = appState.goals.findIndex((g) => g.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= appState.goals.length) return;
  [appState.goals[i], appState.goals[j]] = [appState.goals[j], appState.goals[i]];
  persistGoals();
  import("./ui.js").then((m) => m.renderHome());
}

export function openEdit(id) {
  const g = appState.goals.find((x) => x.id === id);
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

export function saveEdit(id) {
  const g = appState.goals.find((x) => x.id === id);
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
  persistGoals();
  closeMod();
  import("./ui.js").then((m) => m.renderHome());
}

export function openMod() {
  appState.mStep = 1;
  appState.mData = { duration: 6 };
  document.getElementById("pips").style.display = "flex";
  document.getElementById("ov").classList.add("open");
  pushWizardHistory(1);
  renderMod();
}

export function openModFromTemplate(fields) {
  appState.mStep = 1;
  appState.mData = {
    duration: 6,
    name: fields.name || "",
    identity: fields.identity || "",
    big: fields.big || "",
    p1: fields.p1 || "",
    p2: fields.p2 || "",
    months: Array.isArray(fields.months) ? [...fields.months] : [],
    startDate: fields.startDate || tod(),
    timeFrom: fields.timeFrom || "",
    timeTo: fields.timeTo || "",
    atomicHabit: fields.atomicHabit || "",
  };
  document.getElementById("pips").style.display = "flex";
  document.getElementById("ov").classList.add("open");
  pushWizardHistory(1);
  renderMod();
}

export function closeMod() {
  document.getElementById("ov").classList.remove("open");
  document.getElementById("pips").style.display = "flex";
  document.getElementById("p3").style.display = "";
  const base = history.state && typeof history.state === "object" ? history.state : {};
  if (base.wizardStep != null) {
    const { wizardStep: _w, ...rest } = base;
    history.replaceState({ ...rest, route: rest.route || "home" }, "", "#" + (rest.route || "home"));
  }
}

/** Wizard back — must be on window for inline onclick in modal HTML. */
function stashWizardStepFields() {
  const dur = modDur();
  if (appState.mStep === 1) {
    appState.mData = {
      ...appState.mData,
      duration: dur,
      name: document.getElementById("fn")?.value.trim() ?? appState.mData.name,
      identity: document.getElementById("fi")?.value.trim() ?? appState.mData.identity,
      big: document.getElementById("fb")?.value.trim() ?? appState.mData.big,
      startDate: document.getElementById("fsd")?.value ?? appState.mData.startDate,
      timeFrom: document.getElementById("ftf")?.value ?? appState.mData.timeFrom,
      timeTo: document.getElementById("ftt")?.value ?? appState.mData.timeTo,
      atomicHabit: document.getElementById("fah")?.value.trim() ?? appState.mData.atomicHabit,
    };
  } else if (appState.mStep === 2 && dur !== 3) {
    appState.mData.p1 = document.getElementById("fp1")?.value.trim() ?? appState.mData.p1;
    appState.mData.p2 = document.getElementById("fp2")?.value.trim() ?? appState.mData.p2;
  } else if (appState.mStep === 2 && dur === 3) {
    appState.mData.months = Array.from({ length: 3 }, (_, i) =>
      document.getElementById("mm" + i)?.value.trim()
    );
  } else if (appState.mStep === 3) {
    const mc = dur === 3 ? 3 : 6;
    appState.mData.months = Array.from({ length: mc }, (_, i) =>
      document.getElementById("mm" + i)?.value.trim()
    );
  }
}

function pushWizardHistory(step) {
  const base = history.state && typeof history.state === "object" ? history.state : {};
  history.pushState({ ...base, route: "home", wizardStep: step }, "", "#home");
}

function wireNewGoalFooter({ backStep, primaryLabel, onPrimary }) {
  const mf = document.querySelector("#m-body .mf");
  if (!mf) return;
  const [leftBtn, rightBtn] = mf.querySelectorAll("button");
  if (!leftBtn || !rightBtn) return;

  leftBtn.type = "button";
  rightBtn.type = "button";

  if (backStep == null) {
    leftBtn.textContent = "Cancel";
    leftBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMod();
    };
  } else {
    leftBtn.textContent = "← Back";
    leftBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      modBack(backStep);
    };
  }

  rightBtn.className = "ms";
  rightBtn.textContent = primaryLabel;
  rightBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPrimary();
  };
}

export function modBack(step) {
  stashWizardStepFields();
  if (appState.mStep <= step) return;
  appState.mStep = step;
  const base = history.state && typeof history.state === "object" ? history.state : {};
  history.replaceState({ ...base, route: "home", wizardStep: step }, "", "#home");
  renderMod();
  document.getElementById("ov").classList.add("open");
}

export function handleWizardPopstate(state) {
  if (!document.getElementById("ov").classList.contains("open")) return false;
  if (state?.wizardStep != null) {
    appState.mStep = state.wizardStep;
    renderMod();
    return true;
  }
  closeMod();
  return true;
}

export function renderMod() {
  const dur = modDur();
  const steps = modSteps();
  document.getElementById("p3").style.display = dur === 3 ? "none" : "";
  ["p1", "p2", "p3"].forEach((x, i) => {
    if (dur === 3 && i >= 2) return;
    document.getElementById(x).className = "pip" + (appState.mStep > i ? " on" : "");
  });
  const bigLbl = dur === 3 ? "3-month big goal" : "6-month big goal";
  const mc = dur === 3 ? 3 : 6;
  if (appState.mStep === 1) {
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">New Goal</div><div class="m-sub">Step 1 of ${steps} — The basics</div>
      <label class="f-lbl">Goal duration</label>
      <div class="dur-pick">
        <button type="button" class="dur-btn${dur === 6 ? " on" : ""}" onclick="setDuration(6)">6 months</button>
        <button type="button" class="dur-btn${dur === 3 ? " on" : ""}" onclick="setDuration(3)">3 months</button>
      </div>
      <label class="f-lbl">Goal name</label><input class="f-inp" id="fn" placeholder="e.g. Learn Spanish" value="${esc(appState.mData.name || "")}"/>
      <label class="f-lbl">Identity statement</label><input class="f-inp" id="fi" placeholder="I am someone who..." value="${esc(appState.mData.identity || "")}"/>
      <label class="f-lbl">${bigLbl}</label><input class="f-inp" id="fb" placeholder="e.g. Reach A2 level" value="${esc(appState.mData.big || "")}"/>
      <label class="f-lbl">Start date</label><input class="f-inp" id="fsd" type="date" value="${appState.mData.startDate || tod()}"/>
      <label class="f-lbl">Daily time window</label>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">From</div><input class="f-inp" id="ftf" type="time" value="${appState.mData.timeFrom || ""}" style="margin-bottom:0"/></div>
        <div style="flex:1"><div style="font-size:11px;color:var(--hi);margin-bottom:4px">To</div><input class="f-inp" id="ftt" type="time" value="${appState.mData.timeTo || ""}" style="margin-bottom:0"/></div>
      </div>
      <label class="f-lbl">Atomic habit <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--hi)">(minimum to count a day)</span></label>
      <input class="f-inp" id="fah" placeholder="e.g. 15 mins of Duolingo" value="${esc(appState.mData.atomicHabit || "")}"/>
      <div class="mf"><button type="button">Cancel</button><button type="button" class="ms">Next →</button></div>`;
    wireNewGoalFooter({ backStep: null, primaryLabel: "Next →", onPrimary: mn });
  } else if (appState.mStep === 2 && dur === 3) {
    const bi = Array.from(
      { length: 3 },
      (_, i) =>
        `<div><div class="m-lbl">${BLOCK_LABELS_3[i]}</div><input class="m-inp" id="mm${i}" placeholder="Goal..." value="${esc((appState.mData.months && appState.mData.months[i]) || "")}"/></div>`
    ).join("");
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Period Goals</div><div class="m-sub">Step 2 of 2 — Optional but powerful</div>
      <div class="m-grid">${bi}</div>
      <div class="mf"><button type="button">← Back</button><button type="button" class="ms">Create Goal 🚀</button></div>`;
    wireNewGoalFooter({ backStep: 1, primaryLabel: "Create Goal 🚀", onPrimary: sg });
  } else if (appState.mStep === 2) {
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Phase Goals</div><div class="m-sub">Step 2 of 3 — Your milestones</div>
      <label class="f-lbl" style="color:var(--ac)">Phase 1 · Months 1–3</label><input class="f-inp" id="fp1" placeholder="e.g. Reach A1 level" value="${esc(appState.mData.p1 || "")}"/>
      <label class="f-lbl" style="color:var(--ac-s)">Phase 2 · Months 4–6</label><input class="f-inp" id="fp2" placeholder="e.g. Reach A2 level" value="${esc(appState.mData.p2 || "")}"/>
      <div class="mf"><button type="button">← Back</button><button type="button" class="ms">Next →</button></div>`;
    wireNewGoalFooter({ backStep: 1, primaryLabel: "Next →", onPrimary: mn });
  } else {
    const mi = Array.from(
      { length: mc },
      (_, i) =>
        `<div><div class="m-lbl">Month ${i + 1}</div><input class="m-inp" id="mm${i}" placeholder="Goal..." value="${esc((appState.mData.months && appState.mData.months[i]) || "")}"/></div>`
    ).join("");
    document.getElementById("m-body").innerHTML = `
      <div class="m-title">Monthly Goals</div><div class="m-sub">Step 3 of 3 — ${mc} monthly goals · optional but powerful</div>
      <div class="m-grid">${mi}</div>
      <div class="mf"><button type="button">← Back</button><button type="button" class="ms">Create Goal 🚀</button></div>`;
    wireNewGoalFooter({ backStep: 2, primaryLabel: "Create Goal 🚀", onPrimary: sg });
  }
}

export function mn() {
  if (appState.mStep === 1) {
    const n = document.getElementById("fn").value.trim();
    const i = document.getElementById("fi").value.trim();
    const b = document.getElementById("fb").value.trim();
    if (!n || !i || !b) {
      alert("Please fill goal name, identity and big goal.");
      return;
    }
    appState.mData = {
      ...appState.mData,
      duration: modDur(),
      name: n,
      identity: i,
      big: b,
      startDate: document.getElementById("fsd").value,
      timeFrom: document.getElementById("ftf").value,
      timeTo: document.getElementById("ftt").value,
      atomicHabit: document.getElementById("fah").value.trim(),
    };
    appState.mStep = 2;
  } else if (appState.mStep === 2 && modDur() !== 3) {
    appState.mData = {
      ...appState.mData,
      p1: document.getElementById("fp1").value.trim(),
      p2: document.getElementById("fp2").value.trim(),
    };
    appState.mStep = 3;
  }
  pushWizardHistory(appState.mStep);
  renderMod();
}

export async function sg() {
  if (appState.goals.length >= MAX) {
    alert("Max " + MAX + " goals.");
    return;
  }
  const mc = modDur() === 3 ? 3 : 6;
  const months = Array.from({ length: mc }, (_, i) =>
    document.getElementById("mm" + i).value.trim()
  );
  appState.goals.push(
    mkGoal(
      appState.mData.name,
      appState.mData.identity,
      appState.mData.big,
      appState.mData.p1,
      appState.mData.p2,
      months,
      appState.mData.startDate,
      appState.mData.timeFrom,
      appState.mData.timeTo,
      appState.mData.atomicHabit,
      appState.mData.duration
    )
  );
  persistGoals();
  closeMod();
  const { showHome } = await import("./navigation.js");
  showHome();
}

export function replaceGoalsFromBackup(rawGoals) {
  appState.goals = normalizeGoals(rawGoals);
  persistGoals();
}
