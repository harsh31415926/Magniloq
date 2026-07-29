/**
 * roll.js
 * Picks a random subtopic from the currently selected categories, then
 * plays a real slot-machine style reel through actual candidate titles
 * before landing on the chosen one.
 */
import { state, selectedTopics } from "./state.js";

export function pickTopic() {
  const pool = selectedTopics();
  if (pool.length === 0) return null;

  let candidates = pool.filter(t => !state.history.includes(t.id));
  if (candidates.length === 0) {
    state.history = []; // pool exhausted — reshuffle
    candidates = pool;
  }
  const topic = candidates[Math.floor(Math.random() * candidates.length)];
  state.history.push(topic.id);
  state.lastRolledTopic = topic;
  return topic;
}

/**
 * Spins a vertical reel of real topic titles (sampled from `pool`) and
 * settles on `target`. Resolves once the reel has fully stopped.
 */
export function spinReel(stage, pool, target) {
  return new Promise(resolve => {
    const track = stage.querySelector(".reel-track");
    const win = stage.querySelector(".reel-window");
    const ITEM_H = win.clientHeight / 3 || 68;
    const REEL_LENGTH = 100; // how many titles fly past before landing

    const titles = pool.length ? pool.map(t => t.title) : [target.title];
    const strip = [];
    for (let i = 0; i < REEL_LENGTH - 1; i++) {
      strip.push(titles[Math.floor(Math.random() * titles.length)]);
    }
    strip.push(target.title); // final, centered item

    track.innerHTML = strip.map((title, i) =>
      `<div class="reel-item${i === strip.length - 1 ? " reel-item-final" : ""}" style="height:${ITEM_H}px;line-height:${ITEM_H}px">${title}</div>`
    ).join("");

    stage.classList.add("spinning");
    track.style.transition = "none";
    track.style.transform = `translateY(${ITEM_H}px)`;
    void track.offsetHeight; // force reflow so the transition below animates from here

    const finalOffset = -(ITEM_H * (strip.length - 1)) + ITEM_H; // center the last item in the 3-row window
    requestAnimationFrame(() => {
      track.style.transition = "transform 7s cubic-bezier(0.1, 0.65, 0.1, 1)";
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
