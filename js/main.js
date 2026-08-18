import { loadTopicData } from "./dataLoader.js";
import { state, selectedTopics, toggleFavourite } from "./state.js";
import { renderCategoryGrid, selectAll } from "./categories.js";
import { pickTopic, spinReel } from "./roll.js";
import { RingTimer, playChime } from "./timer.js";
import { renderTopic } from "./topicView.js";
import { loadCustom, addCustomCategory, addCustomTopic, addCustomTopicsBulk, deleteCustomCategory, deleteCustomTopic } from "./customData.js";

const $ = sel => document.querySelector(sel);
const catGrid = $("#category-grid");
const pageHome = $("#page-home");
const pageSpeak = $("#page-speak");
const toastEl = $("#toast");
const PREF_KEY = "magniloq_preferences_v1";
const PROGRESS_KEY = "magniloq_progress_v1";

const challengeModes = [
  "Teach it to a 10-year-old.",
  "Defend the unpopular opinion.",
  "Explain both sides of the argument.",
  "Give a real-world example.",
  "Explain the consequences.",
  "Compare it with something unrelated.",
  "Convince someone who disagrees.",
  "Avoid technical terminology.",
];

let rolledCount = 0;
let prepTimer, speakTimer;
let baseData = { categories: [], topics: [] }; // from topics.json, never mutated

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

function loadPreferences() {
  const pref = safeJson(PREF_KEY, {});
  state.theme = pref.theme === "dark" ? "dark" : "light";
  applyTheme(state.theme);
}

function savePreferences() {
  localStorage.setItem(PREF_KEY, JSON.stringify({ theme: state.theme }));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggle = $("#theme-toggle");
  if (!toggle) return;
  toggle.setAttribute("aria-pressed", String(theme === "dark"));
  toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  const label = toggle.querySelector(".theme-toggle-label");
  if (label) label.textContent = theme === "dark" ? "Dark" : "Light";
}

function wireThemeToggle() {
  $("#theme-toggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme(state.theme);
    savePreferences();
  });
}

function loadProgress() {
  const progress = safeJson(PROGRESS_KEY, {});
  state.streak = Number(progress.currentStreak) || 0;
  state.longestStreak = Number(progress.longestStreak) || 0;
  state.lastRollDate = typeof progress.lastRollDate === "string" ? progress.lastRollDate : "";
  state.totalSpeakingSeconds = Number(progress.totalSpeakingSeconds) || 0;
  state.recentTopicIds = Array.isArray(progress.recentTopicIds) ? progress.recentTopicIds : [];
  state.completedTopicIds = new Set(Array.isArray(progress.completedTopicIds) ? progress.completedTopicIds : []);
  state.favourites = new Set(Array.isArray(progress.favouriteIds) ? progress.favouriteIds : []);
  rolledCount = progress.rolledTodayDate === todayKey() ? Number(progress.rolledToday) || 0 : 0;
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    rolledTodayDate: todayKey(),
    rolledToday: rolledCount,
    currentStreak: state.streak,
    longestStreak: state.longestStreak,
    lastRollDate: state.lastRollDate,
    totalSpeakingSeconds: state.totalSpeakingSeconds,
    recentTopicIds: state.recentTopicIds.slice(0, 8),
    completedTopicIds: [...state.completedTopicIds],
    favouriteIds: [...state.favourites],
  }));
}

function updateStreakForRoll() {
  if (state.lastRollDate === todayKey()) return;
  state.streak = state.lastRollDate === yesterdayKey() ? state.streak + 1 : 1;
  state.longestStreak = Math.max(state.longestStreak, state.streak);
  state.lastRollDate = todayKey();
}

function updateSelectionSummary() {
  const pool = selectedTopics();
  const label = state.selectedCategoryIds.size === 0
    ? "All categories"
    : `${state.selectedCategoryIds.size} categor${state.selectedCategoryIds.size === 1 ? "y" : "ies"}`;
  $("#selection-summary").innerHTML = `<b>${label}</b> · ${pool.length} topics in pool`;
  $("#roll-btn").disabled = pool.length === 0;
  $("#surprise-btn").disabled = state.topics.length === 0;
  renderHomeInsights();
}

function goTo(pageEl) {
  pageHome.classList.remove("active");
  pageSpeak.classList.remove("active");
  pageEl.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function categoryName(id) {
  const c = state.categories.find(c => c.id === id);
  return c ? c.name : id;
}

function byId(id) {
  return state.topics.find(topic => topic.id === id);
}

function refreshStats() {
  $("#stat-streak").textContent = state.streak;
  $("#stat-rolled").textContent = rolledCount;
  $("#stat-favs").textContent = state.favourites.size;
}

/** Merges base topics.json data with anything the user has added locally. */
function rebuildMergedData() {
  const custom = loadCustom();
  state.categories = [...baseData.categories, ...custom.categories];
  state.topics = [...baseData.topics, ...custom.topics];
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash) + value.charCodeAt(i) | 0;
  return Math.abs(hash);
}

function todaysChallenge() {
  if (!state.topics.length) return null;
  const topic = state.topics[hashString(todayKey()) % state.topics.length];
  const mode = challengeModes[hashString(`${todayKey()}-${topic.id}`) % challengeModes.length];
  return { topic, mode };
}

function formatMinutes(seconds) {
  if (!seconds) return "0 min";
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

function miniTopicList(ids, emptyText) {
  const items = ids.map(byId).filter(Boolean).slice(0, 4);
  if (!items.length) return `<p class="micro-empty">${emptyText}</p>`;
  return `<div class="mini-topic-list">${items.map(t => `<button class="mini-topic" data-topic-id="${t.id}" type="button"><span>${escapeHtml(t.title)}</span><small>${escapeHtml(categoryName(t.categoryId))}</small></button>`).join("")}</div>`;
}

function renderHomeInsights() {
  const home = $("#home-insights");
  if (!home || !state.topics.length) return;
  const challenge = todaysChallenge();
  const total = state.topics.length;
  const explored = state.completedTopicIds.size;
  home.innerHTML = `
    <article class="insight-card streak-card">
      <span class="card-kicker">Progress</span>
      <div class="metric-row">
        <div><b>${state.streak}</b><span>current streak</span></div>
        <div><b>${state.longestStreak}</b><span>longest</span></div>
        <div><b>${explored}</b><span>completed</span></div>
        <div><b>${formatMinutes(state.totalSpeakingSeconds)}</b><span>spoken</span></div>
      </div>
      <div class="progress-track"><span style="width:${Math.min(100, Math.round((explored / Math.max(1, total)) * 100))}%"></span></div>
      <p>${explored} of ${total} topics explored.</p>
    </article>
    <article class="insight-card challenge-card">
      <span class="card-kicker">Today's Challenge</span>
      <h3>${challenge ? escapeHtml(challenge.topic.title) : "Choose a topic"}</h3>
      <p>${challenge ? escapeHtml(challenge.mode) : "Roll a topic to begin."}</p>
    </article>
    <article class="insight-card library-card">
      <div class="library-tabs">
        <button class="micro-tab" data-list="recent" data-active="true" type="button">Recent</button>
        <button class="micro-tab" data-list="favs" type="button">Favourites</button>
        <button class="micro-tab" data-list="done" type="button">Completed</button>
      </div>
      <div id="library-list">${miniTopicList(state.recentTopicIds, "Roll once and your recent topics appear here.")}</div>
    </article>
  `;
}

function wireHomeInsights() {
  $("#home-insights").addEventListener("click", e => {
    const tab = e.target.closest(".micro-tab");
    if (tab) {
      document.querySelectorAll(".micro-tab").forEach(t => t.removeAttribute("data-active"));
      tab.setAttribute("data-active", "true");
      const map = {
        recent: [state.recentTopicIds, "Roll once and your recent topics appear here."],
        favs: [[...state.favourites], "Favourite a topic to save it here."],
        done: [[...state.completedTopicIds], "Complete a speaking timer to mark topics done."],
      };
      $("#library-list").innerHTML = miniTopicList(...map[tab.dataset.list]);
      return;
    }
    const item = e.target.closest(".mini-topic");
    if (item) revisitTopic(item.dataset.topicId);
  });
}

function chooseChallengeMode(mode = null) {
  state.activeChallengeMode = mode || challengeModes[Math.floor(Math.random() * challengeModes.length)];
  renderChallengeStrip();
}

function renderChallengeStrip() {
  const strip = $("#challenge-strip");
  if (!strip) return;
  strip.innerHTML = `
    <div class="challenge-copy">
      <span class="card-kicker">Speaking Mode</span>
      <b>${state.activeChallengeMode ? escapeHtml(state.activeChallengeMode) : "Normal speaking"}</b>
    </div>
    <div class="challenge-actions">
      <button class="chip" data-challenge="normal" type="button">Normal</button>
      <button class="chip" data-challenge="random" type="button">Random challenge</button>
    </div>
  `;
}

function wireChallengeStrip() {
  $("#challenge-strip").addEventListener("click", e => {
    const btn = e.target.closest("button[data-challenge]");
    if (!btn) return;
    if (btn.dataset.challenge === "normal") state.activeChallengeMode = null;
    else chooseChallengeMode();
    renderChallengeStrip();
    renderSessionSummary();
  });
}

function renderDeeperPanel(topic) {
  const panel = $("#deeper-panel");
  if (!panel || !topic) return;
  const ideas = ["Origin", "Key ideas", "Real-world examples", "Arguments for", "Arguments against", "Criticism", "Modern applications", "Interesting questions"];
  panel.innerHTML = `
    <button class="btn btn-ghost btn-sm" id="go-deeper-btn" type="button">Go Deeper</button>
    <div class="deeper-content" hidden>
      <span class="card-kicker">Research Directions</span>
      <div class="keyword-row">${ideas.map(i => `<span>${i}</span>`).join("")}</div>
    </div>
  `;
  $("#go-deeper-btn").addEventListener("click", () => {
    const content = panel.querySelector(".deeper-content");
    content.hidden = !content.hidden;
  });
}

function renderSessionSummary() {
  const box = $("#session-summary");
  if (!box || !state.lastSession) { if (box) box.innerHTML = ""; return; }
  const s = state.lastSession;
  box.innerHTML = `
    <span class="card-kicker">Session Summary</span>
    <div class="summary-grid">
      <span><b>${escapeHtml(s.topic)}</b><small>Topic</small></span>
      <span><b>${escapeHtml(s.category)}</b><small>Category</small></span>
      <span><b>${formatMinutes(s.seconds)}</b><small>Time spoken</small></span>
      <span><b>${escapeHtml(s.challenge || "Normal")}</b><small>Challenge</small></span>
    </div>
  `;
}

async function renderSelectedTopic(topic, animate = true) {
  if (!topic) return;
  goTo(pageSpeak);
  renderChallengeStrip();
  if (animate) await spinReel($("#roll-stage"), selectedTopics().length ? selectedTopics() : state.topics, topic);
  const renderCurrentTopic = () => {
    renderTopic($("#topic-card"), topic, categoryName(topic.categoryId), state.favourites.has(topic.id), () => {
      toggleFavourite(topic.id);
      saveProgress();
      refreshStats();
      renderCurrentTopic();
      renderHomeInsights();
    });
  };
  renderCurrentTopic();
  renderDeeperPanel(topic);
  renderSessionSummary();
  prepTimer.setTotal(state.prepSeconds);
  speakTimer.setTotal(state.speakSeconds);
}

async function doRoll({ surprise = false } = {}) {
  if (surprise && state.categories.length) {
    const eligible = state.categories.filter(cat => state.topics.some(topic => topic.categoryId === cat.id));
    const category = eligible[Math.floor(Math.random() * eligible.length)];
    state.selectedCategoryIds.clear();
    if (category) state.selectedCategoryIds.add(category.id);
    renderCategoryGrid(catGrid, updateSelectionSummary);
    updateSelectionSummary();
    chooseChallengeMode();
  }

  const pool = selectedTopics();
  const cyclesBefore = state.completedCycles;
  const topic = pickTopic();
  if (!topic) { showToast("No topics available for this selection."); return; }
  if (state.completedCycles > cyclesBefore) showToast("All topics completed. Starting a fresh cycle.");

  state.recentTopicIds = [topic.id, ...state.recentTopicIds.filter(id => id !== topic.id)].slice(0, 8);
  rolledCount += 1;
  updateStreakForRoll();
  refreshStats();
  saveProgress();

  await renderSelectedTopic(topic, true);
}

function revisitTopic(topicId) {
  const topic = byId(topicId);
  if (!topic) return;
  state.lastRolledTopic = topic;
  renderSelectedTopic(topic, false);
}

function completeSpeakingSession() {
  const topic = state.lastRolledTopic;
  if (!topic) return;
  const seconds = Math.max(1, speakTimer.elapsedSeconds() || state.speakSeconds);
  state.completedTopicIds.add(topic.id);
  state.totalSpeakingSeconds += seconds;
  state.lastSession = {
    topic: topic.title,
    category: categoryName(topic.categoryId),
    seconds,
    challenge: state.activeChallengeMode,
  };
  saveProgress();
  refreshStats();
  renderHomeInsights();
  renderSessionSummary();
}

function refreshEverything() {
  rebuildMergedData();
  renderCategoryGrid(catGrid, updateSelectionSummary);
  updateSelectionSummary();
  populateCategoryDropdown();
  renderManageLists();
  renderHomeInsights();
}

function wireTimerControls(prefix, timer) {
  const panel = document.querySelector(`.timer-controls[data-timer="${prefix}"]`);
  panel.addEventListener("click", e => {
    const btn = e.target.closest("button[data-secs]");
    if (!btn) return;
    [...panel.children].forEach(b => b.removeAttribute("data-active"));
    btn.setAttribute("data-active", "true");
    const secs = Number(btn.dataset.secs);
    if (prefix === "prep") state.prepSeconds = secs; else state.speakSeconds = secs;
    timer.setTotal(secs);
    setTimerButton(prefix, "Start");
  });
}

function setTimerButton(prefix, label) {
  const startBtn = document.querySelector(`button[data-timer="${prefix}"][data-action="start"]`);
  if (startBtn) startBtn.textContent = label;
}

function toggleTimer(prefix, timer) {
  if (timer.isRunning()) {
    timer.pause();
    setTimerButton(prefix, "Start");
  } else {
    timer.start();
    setTimerButton(prefix, "Pause");
  }
}

function wireTimerActions(prefix, timer) {
  document.querySelectorAll(`button[data-timer="${prefix}"][data-action]`).forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.action === "start") toggleTimer(prefix, timer);
      else {
        timer.reset();
        setTimerButton(prefix, "Start");
      }
    });
  });
}

function wireShortcuts() {
  document.addEventListener("keydown", async e => {
    const tag = e.target.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.target.isContentEditable) return;
    if (e.key.toLowerCase() === "r" && pageHome.classList.contains("active")) {
      e.preventDefault();
      if (!$("#roll-btn").disabled) await doRoll();
    }
    if (e.key.toLowerCase() === "n" && pageSpeak.classList.contains("active")) {
      e.preventDefault();
      await doRoll();
    }
    if (e.code === "Space" && pageSpeak.classList.contains("active")) {
      e.preventDefault();
      toggleTimer("speak", speakTimer);
    }
    if (e.key === "Escape" && pageSpeak.classList.contains("active")) {
      prepTimer.reset(); speakTimer.reset();
      setTimerButton("prep", "Start"); setTimerButton("speak", "Start");
      showToast("Timers reset.");
    }
  });
}

/* ---------- Manage Content modal ---------- */

function populateCategoryDropdown() {
  const options = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  [$("#topic-category"), $("#bulk-category")].forEach(sel => {
    const current = sel.value;
    sel.innerHTML = options;
    if (current) sel.value = current;
  });
}

function renderManageLists() {
  const custom = loadCustom();
  const catList = $("#custom-category-list");
  const topicList = $("#custom-topic-list");

  catList.innerHTML = custom.categories.length ? "" : `<div class="hint-sm">No custom categories yet.</div>`;
  custom.categories.forEach(c => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `<div><div class="name">${c.name}</div><div class="sub">${c.color}</div></div>`;
    const del = document.createElement("button");
    del.className = "btn-icon btn-sm"; del.textContent = "x";
    del.addEventListener("click", () => { deleteCustomCategory(c.id); refreshEverything(); });
    row.appendChild(del);
    catList.appendChild(row);
  });

  topicList.innerHTML = custom.topics.length ? "" : `<div class="hint-sm">No custom subtopics yet.</div>`;
  custom.topics.forEach(t => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `<div><div class="name">${t.title}</div><div class="sub">${categoryName(t.categoryId)} · ${t.difficulty}</div></div>`;
    const del = document.createElement("button");
    del.className = "btn-icon btn-sm"; del.textContent = "x";
    del.addEventListener("click", () => { deleteCustomTopic(t.id); refreshEverything(); });
    row.appendChild(del);
    topicList.appendChild(row);
  });
}

function splitList(value) {
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

function parseVocab(value) {
  return splitList(value).map(pair => {
    const [word, ...rest] = pair.split(":");
    return { word: (word || "").trim(), definition: rest.join(":").trim() || "-" };
  }).filter(v => v.word);
}

function wireManageModal() {
  const overlay = $("#manage-modal");
  const openModal = () => { overlay.classList.add("open"); populateCategoryDropdown(); renderManageLists(); };
  const closeModal = () => overlay.classList.remove("open");

  $("#manage-btn").addEventListener("click", openModal);
  $("#modal-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

  document.querySelectorAll(".modal-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".modal-tab").forEach(t => t.removeAttribute("data-active"));
      tab.setAttribute("data-active", "true");
      document.querySelectorAll(".modal-pane").forEach(p => p.classList.remove("active"));
      document.querySelector(`.modal-pane[data-pane="${tab.dataset.pane}"]`).classList.add("active");
    });
  });

  let chosenColor = "blue";
  $("#category-swatches").addEventListener("click", e => {
    const sw = e.target.closest(".swatch");
    if (!sw) return;
    document.querySelectorAll(".swatch").forEach(s => s.removeAttribute("data-active"));
    sw.setAttribute("data-active", "true");
    chosenColor = sw.dataset.color;
  });

  $("#pane-add-bulk").addEventListener("submit", e => {
    e.preventDefault();
    const lines = $("#bulk-lines").value.split("\n");
    const added = addCustomTopicsBulk(lines, {
      categoryId: $("#bulk-category").value,
      difficulty: $("#bulk-difficulty").value,
      estSpeakingTime: Number($("#bulk-mins").value) || 2,
    });
    if (added === 0) { showToast("No subtopics found - add at least one line."); return; }
    e.target.reset();
    refreshEverything();
    showToast(`Added ${added} subtopic${added === 1 ? "" : "s"}.`);
  });

  $("#pane-add-category").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#category-name").value.trim();
    if (!name) return;
    addCustomCategory({ name, color: chosenColor });
    $("#category-name").value = "";
    refreshEverything();
    showToast(`Category "${name}" added.`);
  });

  $("#pane-add-topic").addEventListener("submit", e => {
    e.preventDefault();
    const topic = {
      categoryId: $("#topic-category").value,
      title: $("#topic-title").value.trim(),
      difficulty: $("#topic-difficulty").value,
      estSpeakingTime: Number($("#topic-mins").value) || 2,
      intro: $("#topic-intro").value.trim(),
      concepts: splitList($("#topic-concepts").value),
      discussionPoints: splitList($("#topic-points").value),
      questions: splitList($("#topic-questions").value),
      applications: splitList($("#topic-applications").value),
      vocabulary: parseVocab($("#topic-vocab").value),
      keywords: splitList($("#topic-keywords").value),
    };
    if (!topic.title || !topic.intro || !topic.categoryId) return;
    addCustomTopic(topic);
    e.target.reset();
    refreshEverything();
    showToast(`Subtopic "${topic.title}" added.`);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
  }[char]));
}

async function init() {
  loadPreferences();
  loadProgress();
  try {
    baseData = await loadTopicData();
  } catch (err) {
    catGrid.innerHTML = `<div class="empty-state"><div class="glyph">!</div>Could not load data/topics.json.<br>Serve this folder with a local server (see README) rather than opening index.html directly.</div>`;
    console.error(err);
    return;
  }

  refreshEverything();
  wireThemeToggle();
  wireHomeInsights();
  wireChallengeStrip();
  wireManageModal();

  $("#select-all").addEventListener("click", () => { selectAll(catGrid, true); updateSelectionSummary(); });
  $("#clear-all").addEventListener("click", () => { selectAll(catGrid, false); updateSelectionSummary(); });

  $("#roll-btn").addEventListener("click", async () => {
    $("#roll-btn").disabled = true;
    await doRoll();
    $("#roll-btn").disabled = false;
  });
  $("#surprise-btn").addEventListener("click", async () => { await doRoll({ surprise: true }); });
  $("#reroll-btn").addEventListener("click", async () => { await doRoll(); });
  $("#back-home").addEventListener("click", () => goTo(pageHome));

  const [prepCard, speakCard] = document.querySelectorAll(".timer-card");
  prepTimer = new RingTimer(prepCard, state.prepSeconds, null, () => {
    playChime(); showToast("Preparation time is up - start speaking."); setTimerButton("prep", "Start");
  });
  speakTimer = new RingTimer(speakCard, state.speakSeconds, null, () => {
    playChime(); showToast("Speaking time is up - nice work."); setTimerButton("speak", "Start"); completeSpeakingSession();
  });

  wireTimerControls("prep", prepTimer);
  wireTimerControls("speak", speakTimer);
  wireTimerActions("prep", prepTimer);
  wireTimerActions("speak", speakTimer);
  wireShortcuts();

  refreshStats();
}

init();
