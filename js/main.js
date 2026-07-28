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

let rolledCount = 0;
let prepTimer, speakTimer;
let baseData = { categories: [], topics: [] }; // from topics.json, never mutated

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function updateSelectionSummary() {
  const pool = selectedTopics();
  const label = state.selectedCategoryIds.size === 0
    ? "All categories"
    : `${state.selectedCategoryIds.size} categor${state.selectedCategoryIds.size === 1 ? "y" : "ies"}`;
  $("#selection-summary").innerHTML = `<b>${label}</b> · ${pool.length} topics in pool`;
  $("#roll-btn").disabled = pool.length === 0;
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

function refreshEverything() {
  rebuildMergedData();
  renderCategoryGrid(catGrid, updateSelectionSummary);
  updateSelectionSummary();
  populateCategoryDropdown();
  renderManageLists();
}

async function doRoll() {
  const stage = $("#roll-stage");
  const pool = selectedTopics();
  const topic = pickTopic();
  if (!topic) { showToast("No topics available for this selection."); return; }

  goTo(pageSpeak);
  await spinReel(stage, pool.length ? pool : state.topics, topic);

  rolledCount += 1;
  state.streak += 1;
  refreshStats();

  const renderCurrentTopic = () => {
    renderTopic($("#topic-card"), topic, categoryName(topic.categoryId), state.favourites.has(topic.id), () => {
      toggleFavourite(topic.id);
      refreshStats();
      renderCurrentTopic();
    });
  };
  renderCurrentTopic();

  prepTimer.setTotal(state.prepSeconds);
  speakTimer.setTotal(state.speakSeconds);
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
  });
}

function wireTimerActions(prefix, timer) {
  document.querySelectorAll(`button[data-timer="${prefix}"][data-action]`).forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.action === "start") {
        if (btn.textContent === "Start") { timer.start(); btn.textContent = "Pause"; }
        else { timer.pause(); btn.textContent = "Start"; }
      } else {
        timer.reset();
        const startBtn = document.querySelector(`button[data-timer="${prefix}"][data-action="start"]`);
        startBtn.textContent = "Start";
      }
    });
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
    del.className = "btn-icon btn-sm"; del.textContent = "✕";
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
    del.className = "btn-icon btn-sm"; del.textContent = "✕";
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
    return { word: (word || "").trim(), definition: rest.join(":").trim() || "—" };
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
    if (added === 0) { showToast("No subtopics found — add at least one line."); return; }
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

async function init() {
  try {
    baseData = await loadTopicData();
  } catch (err) {
    catGrid.innerHTML = `<div class="empty-state"><div class="glyph">⚠</div>Could not load data/topics.json.<br>Serve this folder with a local server (see README) rather than opening index.html directly.</div>`;
    console.error(err);
    return;
  }

  refreshEverything();
  wireManageModal();

  $("#select-all").addEventListener("click", () => { selectAll(catGrid, true); updateSelectionSummary(); });
  $("#clear-all").addEventListener("click", () => { selectAll(catGrid, false); updateSelectionSummary(); });

  $("#roll-btn").addEventListener("click", async () => {
    $("#roll-btn").disabled = true;
    await doRoll();
    $("#roll-btn").disabled = false;
  });
  $("#reroll-btn").addEventListener("click", async () => { await doRoll(); });
  $("#back-home").addEventListener("click", () => goTo(pageHome));

  const [prepCard, speakCard] = document.querySelectorAll(".timer-card");
  prepTimer = new RingTimer(prepCard, state.prepSeconds, null, () => {
    playChime(); showToast("Preparation time is up — start speaking.");
  });
  speakTimer = new RingTimer(speakCard, state.speakSeconds, null, () => {
    playChime(); showToast("Speaking time is up — nice work.");
  });

  wireTimerControls("prep", prepTimer);
  wireTimerControls("speak", speakTimer);
  wireTimerActions("prep", prepTimer);
  wireTimerActions("speak", speakTimer);

  refreshStats();
}

init();
