import {
  registerServiceWorker,
  setupInstallPrompt,
  promptInstall,
  checkInstallBanner,
  dismissIB,
} from "./pwa.js";
import { initUiState } from "./goals.js";
import {
  showHome,
  showGoal,
  showMonth,
  restoreRoute,
  bindPopstate,
} from "./navigation.js";
import {
  closeCel,
  fitFeedback,
  splash,
  renderHome,
  renderGoal,
  renderMonth,
  exportD,
  importD,
  openSettings,
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
  togExp,
} from "./ui.js";
import {
  openEdit,
  saveEdit,
  delGoal,
  moveGoal,
  openMod,
  closeMod,
  mn,
  sg,
  setDuration,
  modBack,
} from "./goals.js";
import {
  openGoalIdeas,
  openGoalIdeaDetail,
  goalIdeasBack,
  useGoalIdea,
} from "./goal-ideas.js";

initUiState();

document.getElementById("ov").addEventListener("click", (e) => {
  if (e.target.id === "ov") closeMod();
});

bindPopstate();

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
  modBack,
  saveEdit,
  exportD,
  importD,
  dismissIB,
  promptInstall,
  openGoalIdeas,
  openGoalIdeaDetail,
  goalIdeasBack,
  useGoalIdea,
});

registerServiceWorker();
setupInstallPrompt();
history.replaceState({ route: "home" }, "", "#home");
splash();
restoreRoute();
checkInstallBanner();
