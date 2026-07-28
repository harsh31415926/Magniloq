/**
 * dataLoader.js
 * Fetches data/topics.json — the ONLY place topic content lives.
 * The rest of the app never hardcodes a category or subtopic.
 */
export async function loadTopicData() {
  const res = await fetch("data/topics.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load topics.json: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.categories) || !Array.isArray(data.topics)) {
    throw new Error("topics.json is malformed: expected { categories, topics }");
  }
  return data;
}

export function countByCategory(topics) {
  const counts = {};
  for (const t of topics) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
  return counts;
}
