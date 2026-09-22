import { MAX } from "./storage.js";
import { appState, handleWizardPopstate } from "./goals.js";
import { renderHome, renderGoal, renderMonth } from "./ui.js";

export function applyRoute(route) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("show"));
  const pg = document.getElementById("pg-" + route);
  pg.classList.add("show");
  setTimeout(() => {
    pg.scrollTop = window._sc["pg-" + route] || 0;
  }, 10);
}

export function nav(route, params, rep) {
  const cur = document.querySelector(".page.show");
  if (cur) window._sc[cur.id] = cur.scrollTop;
  const state = { route, ...params };
  if (rep) history.replaceState(state, "", "#" + route);
  else history.pushState(state, "", "#" + route);
  applyRoute(route);
}

export function setNav(route) {
  const r = document.getElementById("nav-r");
  if (route === "home") {
    const addBtn =
      appState.goals.length < MAX
        ? `<button class="n-btn n-btn-ac" onclick="openMod()">+ Goal</button>`
        : "";
    r.innerHTML = `${addBtn}<button class="n-ico" onclick="openSettings()" title="Settings" aria-label="Settings">⚙</button>`;
  } else {
    r.innerHTML = `<button class="n-btn" onclick="history.back()">← Back</button>`;
  }
}

export function showHome() {
  appState.gId = null;
  appState.mIdx = null;
  nav("home", {}, true);
  setNav("home");
  renderHome();
}

export function showGoal(id) {
  appState.gId = id;
  nav("goal", { gId: id });
  setNav("goal");
  renderGoal();
}

export function showMonth(m) {
  appState.mIdx = m;
  nav("month", { mIdx: m });
  setNav("month");
  renderMonth();
}

export function restoreRoute() {
  const s = history.state;
  if (s && s.route) {
    appState.gId = s.gId ?? null;
    appState.mIdx = s.mIdx ?? null;
    applyRoute(s.route);
    setNav(s.route);
    if (s.route === "goal" && s.gId) renderGoal();
    else if (s.route === "month" && s.mIdx !== undefined) renderMonth();
    else renderHome();
    return;
  }
  showHome();
}

export function bindPopstate() {
  window.addEventListener("popstate", (e) => {
    const s = e.state || { route: "home" };
    if (handleWizardPopstate(s) && s.wizardStep != null) return;

    appState.gId = s.gId ?? null;
    appState.mIdx = s.mIdx ?? null;

    if (s.route === "goal" && s.gId) renderGoal();
    else if (s.route === "month" && s.mIdx !== undefined) renderMonth();
    else if (s.route === "home") renderHome();

    applyRoute(s.route);
    setNav(s.route);
  });
}
