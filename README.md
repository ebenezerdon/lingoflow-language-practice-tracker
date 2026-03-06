# LingoFlow - Language Practice Tracker

Built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems, LingoFlow is a premium, client-side language learning companion. It goes beyond simple flashcards by offering deep insights into your learning habits, visual streak tracking, and smart spaced-repetition practice sessions.

## Features
- **Vocabulary Management:** Add, edit, and organize vocabulary across multiple languages.
- **Smart Practice Sessions:** Test your knowledge with built-in review sessions.
- **Deep Insights:** Track your daily activity with visual heatmaps and streak calculations.
- **AI Context Generation & Study Coach:** Use local, browser-based AI powered by WebLLM to generate example sentences and get interactive vocabulary help without sending data to a server.
- **Fully Local & Private:** All data is securely stored in your browser's LocalStorage.

## Technical Stack
- HTML5 & CSS3
- Tailwind CSS (via CDN)
- jQuery 3.7.1
- WebLLM (for local AI features)

## Setup
No build step required. Simply open `index.html` in a modern web browser (Chrome/Edge 113+ or Firefox 118+ recommended for WebGPU support if using AI features).

> Note: For browser performance and compatibility, the app uses the default WebLLM model `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`. Very large models such as 35B-class variants are not used as defaults because they exceed practical in-browser limits.