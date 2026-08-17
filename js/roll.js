/**
 * roll.js
 * Picks one unused subtopic from the currently selected categories, then
 * plays a slot-machine style reel through actual candidate titles before
 * landing on the chosen one.
 */
import { state, selectedTopics, syncUnusedPool } from "./state.js";

export function pickTopic() {
  const pool = selectedTopics();
  if (pool.length === 0) return null;

  syncUnusedPool(pool);
  let candidates = pool.filter(t => !state.usedTopicIds.has(t.id));

  if (candidates.length === 0) {
    state.completedCycles += 1;
    state.usedTopicIds = new Set();
    candidates = pool;
  }

  const topic = candidates[Math.floor(Math.random() * candidates.length)];
  state.usedTopicIds.add(topic.id);
  state.history.push(topic.id);
  state.lastRolledTopic = topic;
  return topic;
}

export function remainingTopicCount() {
  const pool = selectedTopics();
  syncUnusedPool(pool);
  return pool.filter(t => !state.usedTopicIds.has(t.id)).length;
}

/**
 * Spins a vertical reel of real topic titles sampled from the current visual
 * pool and settles on target. Intermediate topics are only animation frames;
 * they are not marked used. Only pickTopic() consumes the final topic.
 */
export function spinReel(stage, pool, target) {
  return new Promise(resolve => {
    const track = stage.querySelector(".reel-track");
    const win = stage.querySelector(".reel-window");
    const ITEM_H = win.clientHeight || 260;
    const REEL_LENGTH = 76;

    const topics = pool.length ? pool : [target];
    const strip = [];
    for (let i = 0; i < REEL_LENGTH - 1; i++) {
      strip.push(topics[Math.floor(Math.random() * topics.length)]);
    }
    strip.push(target);

    track.innerHTML = strip.map((topic, i) => {
      const category = categoryName(topic.categoryId);
      const acronym = acronymFromTitle(topic.title);
      return `<div class="reel-item${i === strip.length - 1 ? " reel-item-final" : ""}" style="height:${ITEM_H}px">
        <span class="reel-category">${escapeHtml(category)}</span>
        <span class="reel-title">${escapeHtml(topic.title)}</span>
        ${acronym ? `<span class="reel-acronym">(${escapeHtml(acronym)})</span>` : ""}
      </div>`;
    }).join("");

    stage.classList.add("spinning");
    track.style.transition = "none";
    track.style.transform = `translateY(${ITEM_H}px)`;
    void track.offsetHeight;

    const finalOffset = -(ITEM_H * (strip.length - 1));
    requestAnimationFrame(() => {
      track.style.transition = "transform 4s cubic-bezier(0.08, 0.72, 0.08, 1)";
      track.style.transform = `translateY(${finalOffset}px)`;
    });

    const onEnd = () => {
      track.removeEventListener("transitionend", onEnd);
      stage.classList.remove("spinning");
      resolve();
    };
    track.addEventListener("transitionend", onEnd);
  });
}

function categoryName(id) {
  return state.categories.find(category => category.id === id)?.name || id || "Selected Topic";
}

function acronymFromTitle(title) {
  const match = String(title || "").match(/\(([A-Z0-9]{2,})\)/);
  return match ? match[1] : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
  }[char]));
}
