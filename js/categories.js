/**
 * categories.js
 * Renders the category selection grid and wires checkbox behaviour.
 */
import { state, toggleCategory } from "./state.js";
import { countByCategory } from "./dataLoader.js";

const ACCENT_VARS = { blue: "--blue", gold: "--gold", emerald: "--emerald", purple: "--purple", navy: "--navy" };

function checkIcon() {
  return `<svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function renderCategoryGrid(container, onChange) {
  const counts = countByCategory(state.topics);
  container.innerHTML = "";
  for (const cat of state.categories) {
    const card = document.createElement("div");
    card.className = "cat-card";
    card.tabIndex = 0;
    card.setAttribute("role", "checkbox");
    card.setAttribute("aria-checked", "false");
    card.dataset.checked = "false";
    card.style.setProperty("--accent", `var(${ACCENT_VARS[cat.color] || "--blue"})`);
    card.innerHTML = `
      ${cat.custom ? '<span class="custom-dot">Yours</span>' : ""}
      <div class="check">${checkIcon()}</div>
      <div class="cat-name">${cat.name}</div>
      <div class="cat-count">${counts[cat.id] || 0} topics</div>
    `;
    const activate = () => {
      toggleCategory(cat.id);
      const checked = state.selectedCategoryIds.has(cat.id);
      card.dataset.checked = String(checked);
      card.setAttribute("aria-checked", String(checked));
      onChange();
    };
    card.addEventListener("click", activate);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
    container.appendChild(card);
  }
}

export function selectAll(container, on) {
  state.selectedCategoryIds.clear();
  if (on) for (const c of state.categories) state.selectedCategoryIds.add(c.id);
  for (const card of container.children) {
    card.dataset.checked = String(on);
    card.setAttribute("aria-checked", String(on));
  }
}
