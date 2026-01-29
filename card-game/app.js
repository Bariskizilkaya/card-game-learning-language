const STORAGE_KEY = 'pinyin-english-pairs';
const VOICE_STORAGE_KEY = 'pinyin-match-voice';
const VOICE_ENABLED_KEY = 'pinyin-match-voice-enabled';

let words = [];

function isVoiceEnabled() {
  const raw = localStorage.getItem(VOICE_ENABLED_KEY);
  return raw === null || raw === 'true';
}

function setVoiceEnabled(enabled) {
  localStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
  updateVoiceToggleButton();
}

function updateVoiceToggleButton() {
  const btn = document.getElementById('voice-toggle');
  if (!btn) return;
  if (isVoiceEnabled()) {
    btn.textContent = '🔊 Voice on';
    btn.title = 'Click to disable pronunciation';
  } else {
    btn.textContent = '🔇 Voice off';
    btn.title = 'Click to enable pronunciation';
  }
}

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

// Strip pinyin tone marks so en-US TTS can read it (e.g. "nǐ hǎo" -> "ni hao")
function pinyinToReadable(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'u');
}

// Prefer a female voice (by common OS/browser voice names)
function isLikelyFemaleVoice(voice) {
  const n = (voice.name || '').toLowerCase();
  const femaleHints = ['female', 'woman', 'zira', 'samantha', 'victoria', 'karen', 'kate', 'moira', 'tessa', 'xiaoxiao', 'xiaoyi', 'huihui', 'yaoyao', 'mei-jia', 'hazel', 'susan', 'linda', '女'];
  return femaleHints.some((h) => n.includes(h));
}

// Prefer higher-quality voices (natural, neural, online)
function isBetterQualityVoice(voice) {
  const n = (voice.name || '').toLowerCase();
  return /natural|neural|online|premium|enhanced/.test(n);
}

function pickFemaleVoice(voices, langPrefix) {
  const filtered = langPrefix
    ? voices.filter((v) => v.lang.startsWith(langPrefix))
    : voices;
  const better = filtered.filter((v) => isLikelyFemaleVoice(v) && isBetterQualityVoice(v));
  const female = (better.length ? better : filtered.filter(isLikelyFemaleVoice))[0] || filtered[0];
  return female || filtered[0];
}

let voicesReady = false;
function ensureVoices() {
  if (voicesReady) return;
  if (speechSynthesis.getVoices().length > 0) {
    voicesReady = true;
    populateVoiceSelect();
    return;
  }
  speechSynthesis.onvoiceschanged = () => {
    voicesReady = true;
    populateVoiceSelect();
  };
}

function populateVoiceSelect() {
  const voices = speechSynthesis.getVoices();
  const sel = document.getElementById('voice-select');
  if (!sel || voices.length === 0) return;
  const saved = localStorage.getItem(VOICE_STORAGE_KEY);
  const currentValue = sel.value;
  sel.innerHTML = '<option value="">Auto (Chinese / best female)</option>';
  const zh = voices.filter((v) => v.lang.startsWith('zh'));
  const en = voices.filter((v) => v.lang.startsWith('en'));
  const optgroupZh = document.createElement('optgroup');
  optgroupZh.label = 'Chinese (Mandarin) — use for pinyin';
  zh.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    optgroupZh.appendChild(opt);
  });
  sel.appendChild(optgroupZh);
  const optgroupEn = document.createElement('optgroup');
  optgroupEn.label = 'English (fallback only)';
  en.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    optgroupEn.appendChild(opt);
  });
  sel.appendChild(optgroupEn);
  if (zh.length === 0 && en.length > 0) {
    const other = voices.filter((v) => !v.lang.startsWith('zh') && !v.lang.startsWith('en'));
    if (other.length) {
      const og = document.createElement('optgroup');
      og.label = 'Other';
      other.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    }
  }
  if (saved && voices.some((v) => v.name === saved)) sel.value = saved;
  else if (currentValue && voices.some((v) => v.name === currentValue)) sel.value = currentValue;
}

function getSelectedVoice(voices) {
  const sel = document.getElementById('voice-select');
  const name = (sel && sel.value) || localStorage.getItem(VOICE_STORAGE_KEY);
  if (!name) return null;
  return voices.find((v) => v.name === name) || null;
}

function showNoChineseVoiceHint() {
  const msg = document.getElementById('game-message');
  if (!msg) return;
  msg.textContent = 'No Chinese voice found — install one for Mandarin pronunciation (e.g. Microsoft Huihui: Settings → Time & language → Speech).';
  msg.className = 'game-message error';
  setTimeout(() => {
    msg.textContent = '';
    msg.className = 'game-message';
  }, 6000);
}

let googleAudio = null;
function speakViaGoogle(text) {
  return fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim() }),
  }).then((res) => {
    if (!res.ok) throw new Error(res.status);
    return res.arrayBuffer();
  }).then((buf) => {
    if (googleAudio) {
      googleAudio.pause();
      googleAudio.src = '';
    }
    const blob = new Blob([buf], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    googleAudio = new Audio(url);
    return new Promise((resolve, reject) => {
      googleAudio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      googleAudio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Playback failed'));
      };
      googleAudio.play().then(resolve).catch(reject);
    });
  });
}

function speakPinyin(pinyin) {
  if (!isVoiceEnabled()) return;
  if (!pinyin) return;
  const textToSpeak = pinyin.trim();
  if (!textToSpeak) return;

  speakViaGoogle(textToSpeak).catch(() => {
    if (typeof speechSynthesis === 'undefined') return;
    ensureVoices();
    speechSynthesis.cancel();
    setTimeout(() => {
    const voices = speechSynthesis.getVoices();
    const selected = getSelectedVoice(voices);
    const zhVoices = voices.filter((v) => v.lang.startsWith('zh'));
    const u = new SpeechSynthesisUtterance();
    u.rate = 0.6;
    u.volume = 1;
    u.pitch = 1;
    if (selected) {
      u.voice = selected;
      u.lang = selected.lang || (selected.lang.startsWith('zh') ? 'zh-CN' : 'en-US');
      u.text = selected.lang.startsWith('zh') ? textToSpeak : pinyinToReadable(textToSpeak);
      if (!selected.lang.startsWith('zh') && zhVoices.length > 0) {
        showNoChineseVoiceHint();
      }
    } else {
      const zhFemale = pickFemaleVoice(voices, 'zh');
      const zhAny = zhVoices[0];
      if (zhFemale) {
        u.lang = zhFemale.lang || 'zh-CN';
        u.text = textToSpeak;
        u.voice = zhFemale;
      } else if (zhAny) {
        u.lang = zhAny.lang || 'zh-CN';
        u.text = textToSpeak;
        u.voice = zhAny;
      } else {
        const enFemale = pickFemaleVoice(voices, 'en');
        if (enFemale) {
          u.lang = enFemale.lang || 'en-US';
          u.text = pinyinToReadable(textToSpeak);
          u.voice = enFemale;
        } else {
          u.lang = 'en-US';
          u.text = pinyinToReadable(textToSpeak);
        }
        showNoChineseVoiceHint();
      }
    }
    speechSynthesis.speak(u);
  }, 50);
  });
}

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

    pinyinCard.addEventListener('click', () => {
      if (!pinyinCard.classList.contains('matched')) speakPinyin(pinyin);
    });
    pinyinCard.addEventListener('dragstart', (e) => {
      if (pinyinCard.classList.contains('matched')) {
        e.preventDefault();
        return;
      }
      speakPinyin(pinyin);
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

document.getElementById('test-sound').addEventListener('click', () => {
  if (!isVoiceEnabled()) return;
  ensureVoices();
  populateVoiceSelect();
  speakPinyin('nǐ hǎo');
});

document.getElementById('voice-toggle').addEventListener('click', () => {
  setVoiceEnabled(!isVoiceEnabled());
});

const voiceSelectEl = document.getElementById('voice-select');
if (voiceSelectEl) {
  voiceSelectEl.addEventListener('change', () => {
    const val = voiceSelectEl.value;
    if (val) localStorage.setItem(VOICE_STORAGE_KEY, val);
    else localStorage.removeItem(VOICE_STORAGE_KEY);
  });
}

loadWords();
renderWordList();
updateVoiceToggleButton();
if (typeof speechSynthesis !== 'undefined') populateVoiceSelect();
