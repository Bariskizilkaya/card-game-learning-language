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

## Run locally (optional)

```bash
# From the project folder, for example:
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000` (or the port shown).

## Files

- `index.html` — Page structure
- `styles.css` — Layout and styling
- `app.js` — Word list, storage, drag-and-drop game logic
