/**
 * topicView.js
 * Renders a topic object into the topic-card DOM structure.
 */
export function renderTopic(container, topic, categoryName, isFavourite, onToggleFavourite) {
  const diffClass = `diff-${topic.difficulty.toLowerCase()}`;
  container.innerHTML = `
    <div class="topic-meta">
      <span class="badge cat">${categoryName}</span>
      <span class="badge ${diffClass}">${topic.difficulty}</span>
      <span class="badge time">~${topic.estSpeakingTime} min</span>
      ${topic.custom ? '<span class="custom-tag">Your topic</span>' : ""}
      <button class="btn-icon fav-btn" aria-label="Toggle favourite" style="margin-left:auto">
        ${isFavourite ? "★" : "☆"}
      </button>
    </div>
    <h2>${topic.title}</h2>
    <p class="intro">${topic.intro}</p>
    <div class="topic-grid">
      <div class="topic-block">
        <h3>Important Concepts</h3>
        <ul>${topic.concepts.map(c => `<li>${c}</li>`).join("")}</ul>
      </div>
      <div class="topic-block">
        <h3>Discussion Points</h3>
        <ul>${topic.discussionPoints.map(c => `<li>${c}</li>`).join("")}</ul>
      </div>
      <div class="topic-block">
        <h3>Thought-Provoking Questions</h3>
        <ul>${topic.questions.map(c => `<li>${c}</li>`).join("")}</ul>
      </div>
      <div class="topic-block">
        <h3>Real-World Applications</h3>
        <ul>${topic.applications.map(c => `<li>${c}</li>`).join("")}</ul>
      </div>
    </div>
    <div class="topic-block" style="margin-top:22px">
      <h3>Key Vocabulary</h3>
      <div class="vocab-list">
        ${topic.vocabulary.map(v => `<span class="vocab-pill"><b>${v.word}</b> — <span>${v.definition}</span></span>`).join("")}
      </div>
    </div>
    <div class="topic-block" style="margin-top:16px">
      <h3>Keywords</h3>
      <div class="keyword-row">${topic.keywords.map(k => `<span>${k}</span>`).join("")}</div>
    </div>
  `;
  container.querySelector(".fav-btn").addEventListener("click", onToggleFavourite);
}
