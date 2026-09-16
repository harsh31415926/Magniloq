/**
 * categories.js
 * Renders the category selection grid and wires checkbox behaviour.
 */
import { state, toggleCategory } from "./state.js";
import { countByCategory } from "./dataLoader.js";

const ACCENT_VARS = { blue: "--blue", gold: "--gold", emerald: "--emerald", purple: "--purple", navy: "--navy" };

function checkIcon() {
  return `<span class="check-mark">✓</span>`;
}

export function renderCategoryGrid(container, onChange, onDelete) {
  const counts = countByCategory(state.topics);
  const topicsByCategory = state.topics.reduce((map, topic) => {
    (map[topic.categoryId] ||= []).push(topic);
    return map;
  }, {});
  container.innerHTML = "";

  for (const cat of state.categories) {
    const checked = state.selectedCategoryIds.has(cat.id);
    const expanded = state.expandedCategoryIds.has(cat.id);
    const topics = topicsByCategory[cat.id] || [];
    const card = document.createElement("div");
    card.className = "cat-card";
    card.tabIndex = 0;
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", String(checked));
    card.dataset.checked = String(checked);
    card.dataset.expanded = String(expanded);
    card.style.setProperty("--accent", `var(${ACCENT_VARS[cat.color] || "--blue"})`);
    card.innerHTML = `
      ${cat.custom ? '<span class="custom-dot">Yours</span>' : ""}
      <div class="check">${checkIcon()}</div>
      <div class="cat-card-head">
        <div>
          <div class="cat-name">${escapeHtml(cat.name)}</div>
          <div class="cat-count">${counts[cat.id] || 0} topics</div>
        </div>
        ${state.ownerUnlocked ? `<button class="cat-delete" data-delete-category="${cat.id}" type="button" aria-label="Delete ${escapeHtml(cat.name)}">Delete</button>` : ""}
      </div>
      <div class="subtopic-list" aria-hidden="${!expanded}">
        ${topics.length ? topics.map(topic => `
          <div class="subtopic-row">
            <span>${escapeHtml(topic.title)}</span>
            ${state.ownerUnlocked ? `<button class="subtopic-delete" data-delete-topic="${topic.id}" type="button" aria-label="Delete ${escapeHtml(topic.title)}">Delete</button>` : ""}
          </div>`).join("") : '<div class="subtopic-empty">No subtopics yet.</div>'}
      </div>
    `;

    const activate = () => {
      toggleCategory(cat.id);
      if (state.selectedCategoryIds.has(cat.id)) state.expandedCategoryIds.add(cat.id);
      else state.expandedCategoryIds.delete(cat.id);
      onChange();
    };

    card.addEventListener("click", e => {
      const catButton = e.target.closest("[data-delete-category]");
      const topicButton = e.target.closest("[data-delete-topic]");
      if (catButton || topicButton) {
        e.stopPropagation();
        onDelete && onDelete({
          type: catButton ? "category" : "topic",
          id: catButton ? catButton.dataset.deleteCategory : topicButton.dataset.deleteTopic,
          name: catButton ? cat.name : state.topics.find(t => t.id === topicButton.dataset.deleteTopic)?.title || "this subtopic",
          categoryName: cat.name,
          count: topics.length,
        });
        return;
      }
      activate();
    });
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
    container.appendChild(card);
  }
}

export function selectAll(container, on) {
  state.selectedCategoryIds.clear();
  state.expandedCategoryIds.clear();
  if (on) {
    for (const c of state.categories) {
      state.selectedCategoryIds.add(c.id);
      state.expandedCategoryIds.add(c.id);
    }
  }
  for (const card of container.children) {
    card.dataset.checked = String(on);
    card.dataset.expanded = String(on);
    card.setAttribute("aria-checked", String(on));
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
  }[char]));
}
