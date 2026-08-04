<div align="center">

# Magniloq

**Structured, topic-driven spoken English practice.**

Pick a category → roll a niche subtopic → prep → speak against the clock.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-visit-3B5BDB?style=for-the-badge&logo=vercel&logoColor=white)](https://magniloq.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-1B2028?style=for-the-badge)](LICENSE)

[Live Demo](https://magniloq.vercel.app/)

</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## About

Most spoken-English tools hand you a generic prompt and a timer. **Magniloq** is built differently: it organizes practice around real subject-matter categories — Finance, AI, Negotiation, Machine Learning, and more — then rolls you a specific, well-scoped subtopic with its own vocabulary, discussion points, and framing questions.

It exists for people preparing for interviews, IELTS speaking sections, or just sharpening how they think out loud in English on topics that actually matter to them — not "describe your favorite holiday," but things like BATNA in a negotiation or the bias-variance tradeoff.

There's no backend, no account, and no build step. Every category and subtopic lives in a single, human-editable JSON file, so the content is entirely transparent and easy to extend — and anyone can add their own topics directly from the UI without touching code.

## Features

- **Category → Roll → Speak flow** — a real reel of candidate titles decelerates onto your topic, not a generic spinner
- **Circular ring timer** with a synthesized finish chime (Web Audio API, zero audio file dependency)
- **No-repeat-until-exhausted rolling** so practice doesn't loop the same subtopic back-to-back
- **20 categories**, 4 fully authored end-to-end (AI, Machine Learning, Finance, Investing), the rest usable immediately with starter subtopics
- **Add topics from the UI** — bulk paste, detailed single-topic form, or new categories, no file editing required
- **Fully static** — HTML, CSS, and vanilla JS modules; deploys anywhere that serves files
- **Single source of truth** — all content in `data/topics.json`, nothing hardcoded in app logic
- **Minimal, dark-theme UI** with structured concepts, discussion points, and vocabulary per topic

## Live Demo

**[magniloq.vercel.app →](https://magniloq.vercel.app/)**

No sign-up required — open it, pick a category, and roll your first topic.

## Tech Stack

| Layer | Technology |
|---|---|
| **Languages** | HTML5, CSS3, JavaScript (ES6 modules) |
| **Frontend** | Vanilla JS — no framework, no bundler, no build step |
| **Styling** | Custom CSS with token-based variables (`tokens.css`, `layout.css`, `components.css`) |
| **Data layer** | `data/topics.json` (static) + `localStorage` (user-added topics/categories) |
| **Audio** | Web Audio API (synthesized finish chime) |
| **Content tooling** | Python (`scripts/build_topics.py`) — optional generator for `topics.json` |
| **Local server** | Python `http.server` |
| **Deployment** | Vercel (static hosting) |

## Project Structure

```
Magniloq/
├── index.html              # markup only — home / speak pages toggled by JS
├── css/
│   ├── tokens.css          # colour, type, radius, shadow variables
│   ├── layout.css          # page structure
│   └── components.css      # cards, buttons, roll module, timers
├── js/
│   ├── dataLoader.js       # fetches topics.json — the only I/O boundary
│   ├── state.js            # in-memory app state (selection, history, streak)
│   ├── categories.js       # renders + wires the category grid
│   ├── roll.js             # random topic pick + no-repeat-until-exhausted + spin animation
│   ├── timer.js             # RingTimer class (circular progress) + chime sound
│   ├── topicView.js         # renders one topic into the topic card
│   └── main.js               # wires everything together
├── data/
│   └── topics.json           # ALL content — the only file you edit to add topics
└── scripts/
    └── build_topics.py       # optional generator used to author topics.json
```

No topic content is hardcoded in application logic — every category, subtopic, and vocabulary entry is read from `data/topics.json` at load time.

## Installation

Magniloq has no dependencies and no build step.

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd magniloq

# 2. Serve it over HTTP (required — fetch() cannot read topics.json via file://)
python3 -m http.server 8000

# 3. Open it
# http://localhost:8000
```

**Environment variables:** none required.

**Deployment:** any static host works (Vercel, Netlify, GitHub Pages). On Vercel, import the repository as-is — no build command or output directory override needed.

## Usage

1. Open the app and choose a **category** from the grid (e.g. Finance, AI, Negotiation).
2. Click **Roll** — the reel spins through real subtopic titles and lands on one.
3. Read the **prep view**: intro, key concepts, discussion points, and vocabulary for that subtopic.
4. Start the **ring timer** and speak on the topic until it runs out; a chime signals the end.
5. Roll again — already-seen subtopics are excluded until the category is exhausted.

To add your own content, click **+ Add topics** to bulk-paste subtopics, fill out a detailed form, or create a new category — all without editing any files. Additions are saved to `localStorage` and merged with the built-in `topics.json` automatically.

## Roadmap

- [ ] AI-assisted feedback on spoken responses
- [ ] Session analytics (speaking time, topics covered, streaks over time)
- [ ] Cloud sync for user-added topics across devices
- [ ] Mobile app (iOS / Android)
- [ ] Shareable/importable topic packs
- [ ] Additional language support

## Contributing

Contributions are welcome, whether that's new topic content, bug fixes, or UI improvements.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Keep changes scoped — content additions belong in `data/topics.json`, not app logic
4. Follow the existing code style (vanilla JS modules, no added dependencies)
5. Commit with a clear message and open a pull request

For new topics, see the schema documented in `scripts/build_topics.py`.

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

## Author

**Harsh Sharma**

Final-year engineering student specializing in Artificial Intelligence and Machine Learning.

Interested in Artificial Intelligence, Machine Learning, Generative AI, Agentic AI, Large Language Models, LangGraph, AI system design, Python, competitive programming, quantitative finance, algorithmic trading, and building practical AI products.

---

<div align="center">

Built with passion by **Harsh Sharma**

</div>