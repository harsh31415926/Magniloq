/**
 * customData.js
 * Lets the END USER add their own categories/subtopics from the UI —
 * no editing of topics.json or app code required. Stored in the browser's
 * localStorage and merged with the base dataset on load.
 */
const LEGACY_KEY = "speakforge_custom_v1";
const KEY = "magniloq_custom_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    return normalize(raw ? JSON.parse(raw) : {});
  } catch {
    return normalize({});
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(normalize(data)));
  localStorage.removeItem(LEGACY_KEY);
}

export function loadCustom() {
  return read();
}

export function addCustomCategory({ name, color }) {
  const data = read();
  const id = "custom-" + slug(name) + "-" + Date.now().toString(36);
  data.categories.push({ id, name, color, custom: true });
  write(data);
  return id;
}

export function addCustomTopic(topic) {
  const data = read();
  const id = "custom-" + slug(topic.title) + "-" + Date.now().toString(36);
  data.topics.push({ ...topic, id, custom: true });
  write(data);
  return id;
}

/**
 * Adds many subtopics at once to the same category. `lines` is an array
 * of strings, one per subtopic, each either just a title or "Title :: intro".
 * Shared fields (difficulty, estSpeakingTime) apply to the whole batch.
 */
export function addCustomTopicsBulk(lines, shared) {
  const data = read();
  const now = Date.now();
  let added = 0;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [titlePart, introPart] = trimmed.split("::");
    const title = titlePart.trim();
    if (!title) return;
    const id = "custom-" + slug(title) + "-" + (now + i).toString(36);
    data.topics.push({
      id,
      categoryId: shared.categoryId,
      title,
      difficulty: shared.difficulty,
      estSpeakingTime: shared.estSpeakingTime,
      intro: (introPart || "").trim() || `A speaking prompt on ${title}.`,
      concepts: [],
      discussionPoints: [],
      questions: [],
      applications: [],
      vocabulary: [],
      keywords: [],
      custom: true,
    });
    added++;
  });
  write(data);
  return added;
}

export function deleteCategory(id) {
  const data = read();
  data.categories = data.categories.filter(c => c.id !== id);
  data.topics = data.topics.filter(t => t.categoryId !== id);
  if (!data.deletedCategoryIds.includes(id)) data.deletedCategoryIds.push(id);
  write(data);
}

export function deleteTopic(id) {
  const data = read();
  data.topics = data.topics.filter(t => t.id !== id);
  if (!data.deletedTopicIds.includes(id)) data.deletedTopicIds.push(id);
  write(data);
}

export const deleteCustomCategory = deleteCategory;
export const deleteCustomTopic = deleteTopic;

export function deletedSets() {
  const data = read();
  return {
    categoryIds: new Set(data.deletedCategoryIds),
    topicIds: new Set(data.deletedTopicIds),
  };
}

function slug(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalize(data) {
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    topics: Array.isArray(data.topics) ? data.topics : [],
    deletedCategoryIds: Array.isArray(data.deletedCategoryIds) ? data.deletedCategoryIds : [],
    deletedTopicIds: Array.isArray(data.deletedTopicIds) ? data.deletedTopicIds : [],
  };
}
