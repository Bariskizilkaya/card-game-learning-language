const STORAGE_KEY = 'pinyin-english-pairs';

let words = [];

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    words = raw ? JSON.parse(raw) : [];
  } catch {
    words = [];
  }
}

function saveWords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function renderWordList() {
  const ul = document.getElementById('words-ul');
  ul.innerHTML = '';
  words.forEach((pair, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="pinyin">${escapeHtml(pair.pinyin)}</span>
      <span class="pair">↔</span>
      <span class="english">${escapeHtml(pair.english)}</span>
      <button type="button" data-index="${i}" aria-label="Remove">×</button>
    `;
    li.querySelector('button').addEventListener('click', () => {
      words.splice(i, 1);
      saveWords();
      renderWordList();
    });
    ul.appendChild(li);
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function addWord() {
  const pinyinInput = document.getElementById('pinyin');
  const englishInput = document.getElementById('english');
  const pinyin = (pinyinInput.value || '').trim();
  const english = (englishInput.value || '').trim();
  if (!pinyin || !english) return;
  words.push({ pinyin, english });
  saveWords();
  renderWordList();
  pinyinInput.value = '';
  englishInput.value = '';
  pinyinInput.focus();
}

document.getElementById('add-btn').addEventListener('click', addWord);

document.getElementById('pinyin').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addWord();
});
document.getElementById('english').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addWord();
});

function parseBulkLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const separators = [/\t/, / – /, / - /, /, /, /: /];
  for (const sep of separators) {
    const idx = trimmed.search(sep);
    if (idx !== -1) {
      const pinyin = trimmed.slice(0, idx).trim();
      const english = trimmed.slice(idx).replace(sep, '').trim();
      if (pinyin && english) return { pinyin, english };
    }
  }
  return null;
}

function addBulk() {
  const textarea = document.getElementById('bulk-input');
  const text = (textarea.value || '').trim();
  if (!text) return;
  const lines = text.split(/\r?\n/);
  let added = 0;
  let skipped = 0;
  for (const line of lines) {
    const pair = parseBulkLine(line);
    if (pair) {
      words.push(pair);
      added++;
    } else if (line.trim()) {
      skipped++;
    }
  }
  const feedback = document.getElementById('bulk-feedback');
  if (added > 0) {
    saveWords();
    renderWordList();
    textarea.value = '';
    feedback.textContent = `Added ${added} pair(s).` + (skipped ? ` ${skipped} skipped.` : '');
    feedback.className = 'bulk-feedback success';
  } else if (skipped > 0) {
    feedback.textContent = 'No pairs added. Use tab, " - ", or ", " between pinyin and English.';
    feedback.className = 'bulk-feedback error';
  } else {
    feedback.textContent = '';
    feedback.className = 'bulk-feedback';
  }
}

document.getElementById('bulk-add-btn').addEventListener('click', addBulk);

document.getElementById('clear-words').addEventListener('click', () => {
  if (words.length && confirm('Clear all words?')) {
    words = [];
    saveWords();
    renderWordList();
  }
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let matchedCount = 0;

function startGame() {
  if (words.length < 2) {
    document.getElementById('game-message').textContent = 'Add at least 2 word pairs to start.';
    document.getElementById('game-message').className = 'game-message error';
    return;
  }
  document.getElementById('game-message').textContent = '';
  document.getElementById('game-message').className = 'game-message';
  matchedCount = 0;
  const pairs = shuffle(words.map((w, i) => ({ ...w, id: i })));
  const pinyinContainer = document.getElementById('pinyin-cards');
  const englishContainer = document.getElementById('english-cards');
  pinyinContainer.innerHTML = '';
  englishContainer.innerHTML = '';
  document.getElementById('game-area').classList.remove('hidden');

  pairs.forEach(({ pinyin, english, id }) => {
    const pinyinCard = document.createElement('div');
    pinyinCard.className = 'card';
    pinyinCard.textContent = pinyin;
    pinyinCard.dataset.pairId = id;
    pinyinCard.draggable = true;
    pinyinCard.id = `pinyin-${id}`;

    pinyinCard.addEventListener('dragstart', (e) => {
      if (pinyinCard.classList.contains('matched')) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      pinyinCard.classList.add('dragging');
    });
    pinyinCard.addEventListener('dragend', () => {
      pinyinCard.classList.remove('dragging');
      document.querySelectorAll('.card.drop-target').forEach((c) => c.classList.remove('drop-target'));
    });

    const englishCard = document.createElement('div');
    englishCard.className = 'card';
    englishCard.textContent = english;
    englishCard.dataset.pairId = id;
    englishCard.id = `english-${id}`;

    englishCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (englishCard.classList.contains('matched')) return;
      e.dataTransfer.dropEffect = 'move';
      englishCard.classList.add('drop-target');
    });
    englishCard.addEventListener('dragleave', () => {
      englishCard.classList.remove('drop-target');
    });
    englishCard.addEventListener('drop', (e) => {
      e.preventDefault();
      englishCard.classList.remove('drop-target');
      if (englishCard.classList.contains('matched')) return;
      const droppedId = e.dataTransfer.getData('text/plain');
      if (droppedId === '' || droppedId === undefined) return;
      const pairId = Number(droppedId);
      if (pairId !== id) return;
      const dragged = document.getElementById(`pinyin-${pairId}`);
      if (!dragged || dragged.classList.contains('matched')) return;
      dragged.classList.add('matched');
      englishCard.classList.add('matched');
      matchedCount++;
      updateScore();
      if (matchedCount === pairs.length) {
        document.getElementById('game-message').textContent = 'All matched! Well done.';
        document.getElementById('game-message').className = 'game-message success';
      }
    });

    pinyinContainer.appendChild(pinyinCard);
    englishContainer.appendChild(englishCard);
  });

  updateScore();
}

function updateScore() {
  const total = words.length;
  document.getElementById('score').textContent = total ? `Matched: ${matchedCount} / ${total}` : '';
}

document.getElementById('start-game').addEventListener('click', startGame);

loadWords();
renderWordList();
