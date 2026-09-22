import { MAX } from "./storage.js";
import { appState, closeMod, openModFromTemplate } from "./goals.js";
import { tod } from "./progress.js";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const GOAL_NAME_6M_SUFFIX = " in 6 Months";

function formatSixMonthGoalName(name) {
  const n = String(name || "").trim();
  if (!n) return "My Goal" + GOAL_NAME_6M_SUFFIX;
  if (n.endsWith(GOAL_NAME_6M_SUFFIX)) return n;
  return n + GOAL_NAME_6M_SUFFIX;
}

const GOAL_IDEAS = [
  {
    id: "language",
    emoji: "🇪🇸",
    title: "Learn a Language",
    name: "Learn a Language",
    identity: "I am a person who practices my target language every day.",
    atomicHabit: "Practice 15 min daily",
    big: "Reach A2 level in a new language",
    p1: "Reach A1 level",
    p2: "Reach A2 level",
    months: [
      "Learn 300 basic words + pronunciation",
      "Learn basic grammar + 300 more words",
      "Complete A1-level material + basic conversation",
      "Begin A2 grammar + 300 new words",
      "Practice listening + 15-minute conversations",
      "Complete A2-level material + hold a basic conversation",
    ],
  },
  {
    id: "guitar",
    emoji: "🎸",
    title: "Learn Guitar",
    name: "Learn Guitar",
    identity: "I am a guitarist who practices consistently.",
    atomicHabit: "Practice 10 min daily",
    big: "Play 15 songs confidently",
    p1: "Learn 5 songs + fundamental chords",
    p2: "Play 15 songs + play continuously for 30 minutes",
    months: [
      "Learn 5 basic chords + 2 songs",
      "Learn 5 more chords + 2 songs",
      "Play 5 songs from start to finish",
      "Learn 4 additional songs",
      "Learn 3 additional songs + improve transitions",
      "Play 15 songs + 30-minute practice set",
    ],
  },
  {
    id: "books",
    emoji: "📚",
    title: "Read 6 Books",
    name: "Read 6 Books",
    identity: "I am a reader who learns every day.",
    atomicHabit: "Read 10 pages daily",
    big: "Read 6 books",
    p1: "Read 3 books",
    p2: "Read 3 more books",
    months: ["Finish Book 1", "Finish Book 2", "Finish Book 3", "Finish Book 4", "Finish Book 5", "Finish Book 6"],
  },
  {
    id: "job",
    emoji: "💼",
    title: "Get a New Job",
    name: "Get a New Job",
    identity: "I am a skilled professional who creates career opportunities.",
    atomicHabit: "Improve skills 20 min daily",
    big: "Secure a job in your target role",
    p1: "Become job-ready",
    p2: "Complete applications/interviews and secure an offer",
    months: [
      "Define target role + identify required skills",
      "Complete/improve key skills + create 1 portfolio project",
      "Finish resume + portfolio + interview preparation",
      "Submit first 15 applications",
      "Complete interviews + submit 15 more applications",
      "Complete final interviews + secure an offer",
    ],
  },
  {
    id: "business",
    emoji: "🚀",
    title: "Build a Business",
    name: "Build a Business",
    identity: "I am a builder who turns ideas into valuable businesses.",
    atomicHabit: "Build 30 min daily",
    big: "Launch a business and get the first paying customers",
    p1: "Validate the business idea",
    p2: "Launch and get paying customers",
    months: [
      "Choose problem + define target customer",
      "Build/test first version of product or service",
      "Get feedback from 10 potential customers",
      "Launch publicly",
      "Get first 5 paying customers",
      "Reach 10 paying customers",
    ],
  },
  {
    id: "online",
    emoji: "🌐",
    title: "Create Something Online",
    name: "Create Something Online",
    identity: "I am a creator who consistently creates and publishes.",
    atomicHabit: "Create 30 min daily",
    big: "Launch an online project with 100 users/followers/subscribers",
    p1: "Build and publish the first version",
    p2: "Grow to 100 people",
    months: [
      "Choose idea + define audience",
      "Build/create the first version",
      "Publish the first version",
      "Reach first 25 users/followers",
      "Reach 50 users/followers",
      "Reach 100 users/followers",
    ],
  },
  {
    id: "half-marathon",
    emoji: "🏃",
    title: "Run a 21K",
    name: "Run a 21K",
    identity: "I am a runner who trains consistently.",
    atomicHabit: "Complete scheduled training",
    big: "Complete a 21.1 km half marathon",
    p1: "Build endurance to 10 km",
    p2: "Build endurance to 21.1 km",
    months: [
      "Establish running routine + complete 5 km",
      "Complete 7 km long run",
      "Complete 10 km long run",
      "Complete 13 km long run",
      "Complete 17 km long run",
      "Complete 21.1 km",
    ],
  },
  {
    id: "martial-arts",
    emoji: "🥋",
    title: "Learn a Fighting Skill",
    name: "Learn a Fighting Skill",
    identity: "I am a disciplined martial-arts student who trains consistently.",
    atomicHabit: "Practice 10 min daily",
    big: "Complete beginner training and demonstrate basic proficiency",
    p1: "Learn fundamentals",
    p2: "Build practical proficiency",
    months: [
      "Learn basic stance, movement and guard",
      "Learn 5 fundamental techniques",
      "Complete beginner fundamentals program",
      "Learn combinations + defensive techniques",
      "Complete controlled partner drills",
      "Complete beginner assessment / demonstrate fundamentals",
    ],
  },
  {
    id: "savings",
    emoji: "💰",
    title: "Build Savings",
    name: "Build Savings",
    identity: "I am someone who saves consistently and spends intentionally.",
    atomicHabit: "Track spending daily",
    big: "Save ₹60,000",
    p1: "Save ₹30,000",
    p2: "Save ₹30,000 more",
    months: ["Save ₹10,000", "Save ₹10,000", "Reach ₹30,000", "Reach ₹40,000", "Reach ₹50,000", "Reach ₹60,000"],
  },
  {
    id: "vacation",
    emoji: "✈️",
    title: "Save for a Dream Vacation",
    name: "Save for a Dream Vacation",
    identity: "I am someone who saves intentionally for meaningful experiences.",
    atomicHabit: "Save before spending",
    big: "Save ₹60,000 for a dream vacation",
    p1: "Save ₹30,000",
    p2: "Reach ₹60,000",
    months: [
      "Save ₹10,000",
      "Save ₹10,000",
      "Reach ₹30,000",
      "Reach ₹40,000",
      "Reach ₹50,000",
      "Reach ₹60,000 + finalize trip budget",
    ],
  },
  {
    id: "lose-weight",
    emoji: "⚖️",
    title: "Lose N Kg",
    titleNote: "You’ll enter your target (kg) when you use this template",
    dynamicKg: true,
    name: "Lose Weight",
    identity: "I am someone who takes care of my body every day.",
    atomicHabit: "Make one healthy choice daily",
    big: "Lose N kg",
    p1: "Lose N/2 kg",
    p2: "Lose N/2 kg more",
    months: [],
  },
  {
    id: "relationship",
    emoji: "❤️",
    title: "Build a Relationship",
    name: "Build a Relationship",
    identity: "I am someone who is open to meaningful relationships.",
    atomicHabit: "Make one genuine connection daily",
    big: "Build an active dating/social life and pursue a meaningful relationship",
    p1: "Expand social opportunities",
    p2: "Build meaningful connections",
    months: [
      "Define relationship values + improve dating profile",
      "Meet 4 new people",
      "Go on 3 dates / meaningful one-on-one meetings",
      "Go on 3 more dates / meetings",
      "Develop 1–2 promising connections",
      "Continue building the most meaningful connection",
    ],
  },
  {
    id: "public-speaking",
    emoji: "🎤",
    title: "Learn Public Speaking",
    name: "Learn Public Speaking",
    identity: "I am a confident communicator who practices expressing ideas clearly.",
    atomicHabit: "Speak aloud 5 min daily",
    big: "Deliver a 15-minute presentation confidently",
    p1: "Deliver a 5-minute presentation",
    p2: "Deliver a 15-minute presentation",
    months: [
      "Give 3 × 2-minute practice talks",
      "Give 3 × 3-minute talks",
      "Deliver a 5-minute presentation",
      "Give 3 × 7-minute presentations",
      "Deliver a 10-minute presentation",
      "Deliver a 15-minute presentation",
    ],
  },
];

function ideaById(id) {
  return GOAL_IDEAS.find((x) => x.id === id);
}

function buildLoseWeightTemplate(n) {
  const kg = Math.max(1, Math.round(Number(n) || 12));
  const step = Math.max(1, Math.round(kg / 6));
  const half = Math.round(kg / 2);
  return {
    name: `Lose ${kg} kg`,
    identity: "I am someone who takes care of my body every day.",
    atomicHabit: "Make one healthy choice daily",
    big: `Lose ${kg} kg`,
    p1: `Lose ${half} kg`,
    p2: `Lose ${half} kg more`,
    months: [
      `Lose ${step} kg`,
      `Lose ${step} kg`,
      `Reach ${half} kg total`,
      `Reach ${Math.round((2 * kg) / 3)} kg total`,
      `Reach ${Math.round((5 * kg) / 6)} kg total`,
      `Reach ${kg} kg total`,
    ],
  };
}

function resolveTemplate(idea) {
  if (!idea.dynamicKg) return idea;
  const raw = prompt("How many kg do you want to lose over 6 months? (e.g. 12)", "12");
  if (raw == null) return null;
  const fields = buildLoseWeightTemplate(raw);
  return { ...idea, ...fields, title: `Lose ${Math.max(1, Math.round(Number(raw) || 12))} kg` };
}

function monthRows(idea) {
  return idea.months
    .map(
      (t, i) =>
        `<div class="idea-mo"><span class="idea-mo-n">Month ${i + 1}</span><span class="idea-mo-t">${esc(t)}</span></div>`
    )
    .join("");
}

export function renderGoalIdeasButton() {
  const el = document.getElementById("goal-ideas-slot");
  if (!el) return;
  el.innerHTML = `<button type="button" class="goal-ideas-btn" onclick="openGoalIdeas()">💡 Goal Ideas</button>`;
}

export function openGoalIdeas() {
  document.getElementById("pips").style.display = "none";
  document.getElementById("ov").classList.add("open");
  renderGoalIdeasList();
}

function renderGoalIdeasList() {
  const list = GOAL_IDEAS.map(
    (idea) =>
      `<button type="button" class="idea-row" onclick="openGoalIdeaDetail('${idea.id}')">
        <span class="idea-row-emoji">${idea.emoji}</span>
        <span class="idea-row-txt">
          <span class="idea-row-title">${esc(idea.title)}</span>
          <span class="idea-row-sub">${esc(idea.big)}</span>
        </span>
        <span class="idea-row-arr">›</span>
      </button>`
  ).join("");

  document.getElementById("m-body").innerHTML = `
    <div class="m-title">Goal Ideas</div>
    <div class="m-sub">13 six-month templates — tap one to preview, then use it in the goal wizard</div>
    <div class="idea-list">${list}</div>
    <div class="mf"><button type="button" onclick="closeMod()">Close</button></div>`;
  const closeBtn = document.querySelector("#m-body .mf button");
  if (closeBtn) {
    closeBtn.type = "button";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeMod();
    };
  }
}

export function openGoalIdeaDetail(id) {
  const idea = ideaById(id);
  if (!idea) return;

  document.getElementById("m-body").innerHTML = `
    <div class="m-top">
      <div>
        <div class="m-title">${idea.emoji} ${esc(idea.title)}</div>
        <div class="m-sub">${idea.titleNote ? esc(idea.titleNote) : "6-month structure you can edit after applying"}</div>
      </div>
      <button type="button" class="m-close" onclick="goalIdeasBack()" aria-label="Back to list">✕</button>
    </div>
    <div class="idea-block">
      <div class="idea-lbl">Goal name</div>
      <div class="idea-val">${esc(
        idea.dynamicKg ? `Lose N kg${GOAL_NAME_6M_SUFFIX}` : formatSixMonthGoalName(idea.name)
      )}</div>
    </div>
    <div class="idea-block">
      <div class="idea-lbl">6-month goal</div>
      <div class="idea-val">${esc(idea.dynamicKg ? "Lose N kg (you choose N)" : idea.big)}</div>
    </div>
    <div class="idea-block">
      <div class="idea-lbl">Phase 1 · Months 1–3</div>
      <div class="idea-val">${esc(idea.dynamicKg ? "Lose N/2 kg" : idea.p1)}</div>
    </div>
    <div class="idea-block">
      <div class="idea-lbl">Phase 2 · Months 4–6</div>
      <div class="idea-val">${esc(idea.dynamicKg ? "Lose N/2 kg more" : idea.p2)}</div>
    </div>
    <div class="idea-block">
      <div class="idea-lbl">Identity</div>
      <div class="idea-val">"${esc(idea.identity)}"</div>
    </div>
    <div class="idea-block">
      <div class="idea-lbl">Atomic habit</div>
      <div class="idea-val">${esc(idea.atomicHabit || "")}</div>
    </div>
    <div class="idea-lbl" style="margin-top:16px">Monthly targets</div>
    <div class="idea-months">${
      idea.dynamicKg
        ? `<p class="idea-hint">Monthly milestones are calculated from your target when you use this template.</p>`
        : monthRows(idea)
    }</div>
    <div class="mf">
      <button type="button">← Back</button>
      <button type="button" class="ms">Use template</button>
    </div>`;

  const [backBtn, useBtn] = document.querySelectorAll("#m-body .mf button");
  backBtn.onclick = (e) => {
    e.stopPropagation();
    goalIdeasBack();
  };
  useBtn.onclick = (e) => {
    e.stopPropagation();
    useGoalIdea(id);
  };
}

export function goalIdeasBack() {
  renderGoalIdeasList();
}

export function useGoalIdea(id) {
  if (appState.goals.length >= MAX) {
    alert("Max " + MAX + " goals. Delete one to add a new goal.");
    return;
  }
  const base = ideaById(id);
  if (!base) return;
  const idea = resolveTemplate(base);
  if (!idea) return;

  openModFromTemplate({
    name: formatSixMonthGoalName(idea.name),
    identity: idea.identity,
    big: idea.big,
    p1: idea.p1,
    p2: idea.p2,
    months: idea.months,
    atomicHabit: idea.atomicHabit || "",
    startDate: tod(),
  });
}
