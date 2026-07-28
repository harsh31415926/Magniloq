/**
 * state.js
 * Single in-memory store for the session. No localStorage/sessionStorage
 * is used (kept in-memory by design); wire in a backend or storage layer
 * here if you deploy this beyond a single browser session.
 */
export const state = {
  categories: [],
  topics: [],
  selectedCategoryIds: new Set(),
  history: [],          // topic ids already rolled this session
  favourites: new Set(),
  streak: 0,
  lastRolledTopic: null,
  prepSeconds: 60,
  speakSeconds: 120,
};

export function selectedTopics() {
  if (state.selectedCategoryIds.size === 0) return state.topics;
  return state.topics.filter(t => state.selectedCategoryIds.has(t.categoryId));
}

export function toggleCategory(id) {
  if (state.selectedCategoryIds.has(id)) state.selectedCategoryIds.delete(id);
  else state.selectedCategoryIds.add(id);
}

export function toggleFavourite(topicId) {
  if (state.favourites.has(topicId)) state.favourites.delete(topicId);
  else state.favourites.add(topicId);
}
