/**
 * state.js
 * Single in-memory store for the session. Custom user content is stored
 * separately in localStorage by customData.js. Rolling exhaustion state stays
 * here so rerenders do not accidentally make used topics available again.
 */
export const state = {
  categories: [],
  topics: [],
  selectedCategoryIds: new Set(),
  history: [],          // topic ids already rolled this session
  usedTopicIds: new Set(),
  activePoolSignature: "",
  completedCycles: 0,
  favourites: new Set(),
  recentTopicIds: [],
  completedTopicIds: new Set(),
  streak: 0,
  longestStreak: 0,
  lastRollDate: "",
  totalSpeakingSeconds: 0,
  activeChallengeMode: null,
  lastSession: null,
  theme: "light",
  lastRolledTopic: null,
  prepSeconds: 60,
  speakSeconds: 120,
};

export function selectedTopics() {
  const pool = state.selectedCategoryIds.size === 0
    ? state.topics
    : state.topics.filter(t => state.selectedCategoryIds.has(t.categoryId));

  const unique = new Map();
  for (const topic of pool) {
    const key = normalizeTopicTitle(topic.title);
    if (!unique.has(key)) unique.set(key, topic);
  }
  return [...unique.values()];
}

export function toggleCategory(id) {
  if (state.selectedCategoryIds.has(id)) state.selectedCategoryIds.delete(id);
  else state.selectedCategoryIds.add(id);
}

export function toggleFavourite(topicId) {
  if (state.favourites.has(topicId)) state.favourites.delete(topicId);
  else state.favourites.add(topicId);
}

export function poolSignature(topics) {
  return topics.map(t => normalizeTopicTitle(t.title)).sort().join("|");
}

export function syncUnusedPool(topics) {
  const signature = poolSignature(topics);
  if (signature !== state.activePoolSignature) {
    state.activePoolSignature = signature;
    state.usedTopicIds = new Set();
    return;
  }

  const availableIds = new Set(topics.map(t => t.id));
  state.usedTopicIds = new Set([...state.usedTopicIds].filter(id => availableIds.has(id)));
}

function normalizeTopicTitle(title) {
  return String(title || "").toLowerCase().trim().replace(/\s+/g, " ");
}
