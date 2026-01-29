# Pinyin ↔ English Match

A simple web card game to practice matching Chinese (pinyin/汉字) with English translations.

## How to use

1. **Open the app**  
   Open `index.html` in your browser (double-click or run a local server).

2. **Add word pairs**  
   Type pinyin (or 汉字) in the first field and the English translation in the second, then click **Add**. Pairs are saved in your browser.

3. **Start the game**  
   Click **Start game**. Pinyin cards appear on the left, English cards on the right.

4. **Match**  
   Drag each pinyin card and drop it on the correct English card. Correct matches stay highlighted; wrong drops do nothing. When all pairs are matched, you’re done.

## Run locally

### With Google TTS (recommended — Mandarin pronunciation)

1. **Get an API key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable **Cloud Text-to-Speech API** (APIs & Services → Enable APIs)
   - Create credentials → API key (restrict to “Cloud Text-to-Speech API” if you like)

2. **Start the server**
   ```bash
   cd card-game
   GOOGLE_TTS_API_KEY=your-api-key-here node server.js
   ```
   Or on Windows (PowerShell): `$env:GOOGLE_TTS_API_KEY="your-key"; node server.js`

3. **Open** `http://localhost:3000` in your browser. Pinyin will be spoken with Google’s Chinese (zh-CN) voice. If the server or API fails, the app falls back to your browser’s TTS.

### Without Google TTS

- Open `index.html` directly, or run any static server (e.g. `npx serve .`). Pronunciation uses your system/browser voices; pick a Chinese voice in the dropdown for Mandarin.

## Files

- `index.html` — Page structure
- `styles.css` — Layout and styling
- `app.js` — Word list, storage, drag-and-drop, Google TTS + browser fallback
- `server.js` — Optional Node server: serves the app and proxies Google Cloud Text-to-Speech
- `package.json` — Scripts for `node server.js`
