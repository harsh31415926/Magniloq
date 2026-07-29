# Magniloq

Structured, topic-driven spoken English practice. Pick categories → Roll a niche subtopic → Prep → Speak against the clock.

## Run it

No build step. It's static HTML/CSS/JS that fetches `data/topics.json`.

```bash
cd Magniloq
python3 -m http.server 8000
# open http://localhost:8000
```

`index.html` must be served over HTTP (not opened via `file://`), because `fetch()` for `data/topics.json` requires it.

## Architecture

```
speakforge/
├── index.html            # markup only — two pages (home / speak) toggled by JS
├── css/
│   ├── tokens.css        # colour, type, radius, shadow variables
│   ├── layout.css        # page structure
│   └── components.css    # cards, buttons, roll module, timers
├── js/
│   ├── dataLoader.js      # fetches topics.json — the only I/O boundary
│   ├── state.js           # in-memory app state (selection, history, streak)
│   ├── categories.js       # renders + wires the category grid
│   ├── roll.js             # random topic pick + no-repeat-until-exhausted + spin animation
│   ├── timer.js             # RingTimer class (circular progress) + chime sound
│   ├── topicView.js          # renders one topic into the topic card
│   └── main.js                # wires everything together
├── data/
│   └── topics.json             # ALL content — the only file you edit to add topics
└── scripts/
    └── build_topics.py          # optional generator used to author topics.json
```

No topic content is hardcoded in the app logic. Add, remove, or rename anything by editing `data/topics.json` directly (or `scripts/build_topics.py` and re-running it).

## Customization

### Add a category
In `data/topics.json`, append to `categories`:
```json
{ "id": "negotiation", "name": "Negotiation", "color": "emerald" }
```
`color` must be one of `blue | gold | emerald | purple | navy` (maps to an accent token).

### Add a subtopic
Append to `topics`:
```json
{
  "id": "negotiation-batna",
  "categoryId": "negotiation",
  "title": "BATNA",
  "difficulty": "Intermediate",
  "estSpeakingTime": 2,
  "intro": "Your best alternative if the deal falls through.",
  "concepts": ["Reservation price", "Walk-away point"],
  "discussionPoints": ["Why does a strong BATNA change leverage?"],
  "questions": ["Should you ever reveal your BATNA to the other side?"],
  "applications": ["Salary negotiation", "M&A deal-making"],
  "vocabulary": [{ "word": "leverage", "definition": "power to influence an outcome" }],
  "keywords": ["BATNA", "leverage", "negotiation"]
}
```
`difficulty` must be `Beginner | Intermediate | Advanced`. Nothing else needs to change — the category grid, roll pool, and topic card all read from this file at load time.

### Add topics from the UI (no file editing)
Click **+ Add topics** (top right).
- **Add multiple**: pick a category, then paste one subtopic per line — adds them all at once. Optionally write `Title :: intro sentence` per line.
- **Add one (detailed)**: full form with concepts, questions, vocabulary, etc.
- **New category**: name + accent colour.
- **Your additions**: delete anything you've added.

All of this is saved to the browser's `localStorage` and merged with `topics.json` automatically. Built-in topics.json content is never modified.

### Content status
20 categories are wired up. 4 (Artificial Intelligence, Machine Learning, Finance, Investing) have fully authored subtopics. The remaining 16 ship with 6 "starter" placeholder subtopics each — clearly labelled in the intro text — so every category is usable immediately while you fill in real content at your own pace. `scripts/build_topics.py` shows the exact schema each entry needs.

## Notes
- Categories/subtopics added via **+ Add topics** persist in `localStorage` across reloads (per browser).
- Streak, history, and favourites are kept in memory only and reset on reload.
- The finish chime is synthesized with the Web Audio API — no audio file dependency.
- Rolling plays a real reel of actual candidate titles that decelerates onto the chosen topic (not a generic spinner).
