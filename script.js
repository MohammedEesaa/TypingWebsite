/* =============================================
   WORD BANKS
   Each category is an array of themed words.
   Add/remove words here to customise the game.
============================================= */
const WORD_BANKS = {
  gaming: [
    'respawn','loadout','hitbox','cooldown','aggro','dungeon','crafting',
    'lootbox','speedrun','checkpoint','glitch','exploit','nerf','buff',
    'pvp','raid','grind','boss','health','stamina','inventory','combo',
    'passive','ultimate','ranked','casual','matchmaking','healer','tank',
    'carry','jungler','support','minion','turret','nexus','ability',
    'critical','knockback','revive','stealth','sniper','shotgun','reload',
    'crosshair','headshot','killstreak','prestige','bloodborne','soulslike',
    'permadeath','roguelike','procedural','sandbox','open','world'
  ],
  cs: [
    'algorithm','recursion','pointer','binary','boolean','compiler',
    'runtime','syntax','function','variable','debugger','interface',
    'abstract','object','class','array','stack','queue','linked','tree',
    'graph','hashing','sorting','merging','parsing','rendering','kernel',
    'thread','process','memory','cache','buffer','packet','latency',
    'protocol','socket','database','query','index','schema','framework',
    'library','module','import','export','async','await','promise',
    'callback','closure','scope','refactor','deploy','iterate','commit',
    'branch','merge','pipeline','docker','container','server','client'
  ],
  leagueoflegends: [
   'aatrox','ahri','akali','akshan','alistar','ambessa','amumu','anivia',
   'annie','aphelios','ashe','aurelion sol','aurora','azir','bard','belveth',
   'blitzcrank','brand','braum','briar','caitlyn','camille','cassiopeia','chogath',
   'corki','darius','diana','dr. mundo','draven','ekko','elise','evelynn','ezreal',
   'fiddlesticks','fiora','fizz','galio','gangplank','garen','gnar','gragas','graves',
   'gwen','hecarim','heimerdinger','hwei','illaoi','irelia','ivern','janna','jarvan iv',
   'jax','jayce','jhin','jinx','ksante','kaisa','kalista','karma','karthus','kassadin',
   'katarina','kayle','kayn','kennen','khazix','kindred','kled','kogmaw','leblanc',
   'lee sin','leona','lillia','lissandra','lucian','lulu','lux','malphite','malzahar',
   'maokai','master yi','mel','milio','miss fortune','mordekaiser','morgana','naafiri',
   'nami','nasus','nautilus','neeko','nidalee','nilah','nocturne','nunu and willump','olaf',
   'orianna','ornn','pantheon','poppy','pyke','qiyana','quinn','rakan','rammus','reksai',
   'rell','renata glasc','renekton','rengar','riven','rumble','ryze','samira','sejuani',
   'senna','seraphine','sett','shaco','shen','shyvana','singed','sion','sivir','skarner',
   'smolder','sona','soraka','swain','sylas','syndra','tahm kench','taliyah','talon',
   'taric','teemo','thresh','tristana','trundle','tryndamere','twisted fate','twitch',
   'udyr','urgot','varus','vayne','veigar','velkoz','vex','vi','viego','viktor',
   'vladimir','volibear','warwick','wukong','xayah','xerath','xin zhao','yasuo',
   'yone','yorick','yuumi','yunara','zac','zed','zeri','ziggs','zilean','zoe','zyra','zaahen'
  ],
  mixed: [] // Filled dynamically by combining both banks
};

/* Populate the mixed bank as a shuffled blend of gaming, cs, and leagueoflegends */
WORD_BANKS.mixed = [...WORD_BANKS.gaming, ...WORD_BANKS.cs, ...WORD_BANKS.leagueoflegends];

/* =============================================
   GAME STATE
   A single object that holds all game variables.
   Keeping state centralised makes it easy to reset.
============================================= */
const state = {
  words: [],          // Array of word strings for this round
  flatChars: [],      // All characters flattened from words (including spaces)
  charIndex: 0,       // Which character the player is currently on
  totalTyped: 0,      // Total keystrokes made (for accuracy)
  errors: 0,         // Total incorrect keystrokes
  timeLeft: 30,       // Seconds remaining
  totalTime: 30,      // Selected duration (used for reset)
  timerInterval: null,// setInterval reference so we can clear it
  started: false,     // Has the timer started yet?
  finished: false,    // Is the round over?
  category: 'gaming'  // Currently selected word category
};

/* =============================================
   DOM REFERENCES
   Grab all the elements we'll need to update.
============================================= */
const wordDisplay   = document.getElementById('word-display');
const typingInput   = document.getElementById('typing-input');
const startOverlay  = document.getElementById('start-overlay');
const resultsScreen = document.getElementById('results-screen');
const wpmDisplay    = document.getElementById('wpm-display');
const timerDisplay  = document.getElementById('timer-display');
const accDisplay    = document.getElementById('acc-display');
const charsDisplay  = document.getElementById('chars-display');
const restartBtn    = document.getElementById('restart-btn');
const themeCheckbox = document.getElementById('theme-checkbox');
const usernameInput = document.getElementById('username-input');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardMeta = document.getElementById('leaderboard-meta');

const DEFAULT_USERNAME = 'Player';

function getCategoryLabel(category) {
  if (category === 'gaming') return 'Gaming';
  if (category === 'cs') return 'Coding';
  if (category === 'leagueoflegends') return 'LoL';
  return 'Mixed';
}

function renderLeaderboard(scores) {
  leaderboardList.innerHTML = '';

  if (!scores.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Complete a round to see scores for this theme and time.';
    leaderboardList.appendChild(empty);
    return;
  }

  scores.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.innerHTML = `
      <div class="rank">#${index + 1}</div>
      <div class="player">${entry.username}</div>
      <div class="score">${entry.wpm}</div>
    `;
    leaderboardList.appendChild(item);
  });
}

async function updateLeaderboardDisplay() {
  try {
    const response = await fetch(`/api/leaderboard?category=${encodeURIComponent(state.category)}&time=${encodeURIComponent(state.totalTime)}`);
    if (!response.ok) throw new Error('Failed to load leaderboard');
    const scores = await response.json();
    renderLeaderboard(scores);
  } catch (err) {
    console.error(err);
    leaderboardList.innerHTML = '<div class="empty-state">Unable to load leaderboard. Please make sure the server is running.</div>';
  }
  leaderboardMeta.textContent = `${getCategoryLabel(state.category)} · ${state.totalTime}s`;
}

async function addLeaderboardEntry(username, wpm) {
  try {
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, category: state.category, time: state.totalTime, wpm })
    });
    if (!response.ok) throw new Error('Failed to save leaderboard entry');
    await response.json();
  } catch (err) {
    console.error(err);
  }
}

function applyTheme(savedTheme) {
  const useLight = savedTheme === 'light';
  document.body.classList.toggle('light-theme', useLight);
  themeCheckbox.checked = useLight;
}

const isMobile = window.innerWidth <= 780;
const defaultTheme = 'dark';
const savedTheme = localStorage.getItem('typingGameTheme') || defaultTheme;
applyTheme(savedTheme);

themeCheckbox.addEventListener('change', () => {
  const theme = themeCheckbox.checked ? 'light' : 'dark';
  document.body.classList.toggle('light-theme', theme === 'light');
  localStorage.setItem('typingGameTheme', theme);
});

usernameInput.value = localStorage.getItem('typingGameUsername') || '';
usernameInput.addEventListener('input', () => {
  localStorage.setItem('typingGameUsername', usernameInput.value.trim());
});

/* =============================================
   UTILITY: SHUFFLE ARRAY
   Fisher-Yates shuffle — randomly reorders an array in-place.
============================================= */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap elements
  }
  return arr;
}

/* =============================================
   GENERATE A SET OF RANDOM WORDS
   Picks ~50 unique words from the selected bank,
   shuffles them, and returns a subset.
============================================= */
function generateWords(category, count = 50) {
  const bank = shuffle([...WORD_BANKS[category]]); // Copy & shuffle so original is untouched
  const selected = [];
  for (let i = 0; i < count; i++) {
    selected.push(bank[i % bank.length]); // Loop if we run out
  }
  return selected;
}

/* =============================================
   BUILD THE DISPLAY
   Takes the array of words, joins them with spaces,
   and wraps every character in a <span> element.
   This lets us colour each character individually.
============================================= */
function buildDisplay(words) {
  // Join words with spaces to make one big string
  const fullText = words.join(' ');

  // Clear previous content
  wordDisplay.innerHTML = '';

  // For each character in the string, create a <span>
  fullText.split('').forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.dataset.index = i; // Store the index so we can find it later
    wordDisplay.appendChild(span);
  });

  // Return the flat char array (used for index-based tracking)
  return fullText.split('');
}

/* =============================================
   UPDATE THE CURSOR
   Adds the .cursor class to the current character span,
   removing it from the previous one.
============================================= */
function updateCursor() {
  // Remove cursor from any previously marked span
  const prev = wordDisplay.querySelector('.cursor');
  if (prev) prev.classList.remove('cursor');

  // Add cursor to current character span
  const current = wordDisplay.querySelector(`[data-index="${state.charIndex}"]`);
  if (current) {
    current.classList.add('cursor');
    // Auto-scroll to keep the cursor in view if text overflows
    current.scrollIntoView({ block: 'nearest' });
  }
}

/* =============================================
   CALCULATE WPM (Words Per Minute)
   Standard formula: (correct chars / 5) / minutes elapsed.
   Dividing by 5 treats every 5 chars as one "word".
============================================= */
function calcWPM() {
  const elapsed = (state.totalTime - state.timeLeft) / 60; // Minutes elapsed
  if (elapsed === 0) return 0;
  const correctChars = Math.max(state.charIndex - state.errors, 0); // Prevent negative char count
  return Math.round((correctChars / 5) / elapsed);
}

/* =============================================
   CALCULATE ACCURACY
   (correct keystrokes / total keystrokes) * 100
============================================= */
function calcAccuracy() {
  if (state.totalTyped === 0) return 100;
  const correct = state.totalTyped - state.errors;
  return Math.round((correct / state.totalTyped) * 100);
}

/* =============================================
   UPDATE LIVE STATS
   Called on every keystroke and every timer tick.
============================================= */
function updateStats() {
  wpmDisplay.textContent  = state.started ? calcWPM() : 0;
  charsDisplay.textContent = state.charIndex;

  const acc = calcAccuracy();
  accDisplay.textContent = state.totalTyped > 0 ? acc + '%' : '—';
}

/* =============================================
   START THE TIMER
   Begins a 1-second countdown. Ends the game when 0.
============================================= */
function startTimer() {
  state.started = true;
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    timerDisplay.textContent = state.timeLeft;

    // Turn timer red when 5 or fewer seconds remain
    timerDisplay.classList.toggle('low', state.timeLeft <= 5);

    updateStats(); // Refresh WPM each second

    if (state.timeLeft <= 0) {
      endGame(); // Time's up!
    }
  }, 1000);
}

/* =============================================
   END THE GAME
   Stops the timer, calculates final scores, shows results.
============================================= */
function endGame() {
  clearInterval(state.timerInterval); // Stop the countdown
  state.finished = true;
  typingInput.blur(); // Remove focus from input

  const wpm = calcWPM();
  const acc = calcAccuracy();

  // Determine rank based on WPM thresholds (like a game score screen!)
  let rank, rankColor;
  if      (wpm >= 100) { rank = 'S'; rankColor = '#ffe600'; }
  else if (wpm >= 80)  { rank = 'A'; rankColor = '#00ffe7'; }
  else if (wpm >= 60)  { rank = 'B'; rankColor = '#7fff7f'; }
  else if (wpm >= 40)  { rank = 'C'; rankColor = '#ff9f00'; }
  else                 { rank = 'D'; rankColor = '#ff2d78'; }

  // Populate results screen
  document.getElementById('rank-badge').textContent   = rank;
  document.getElementById('rank-badge').style.color   = rankColor;
  document.getElementById('result-wpm').textContent   = wpm;
  document.getElementById('result-acc').textContent   = acc + '%';
  document.getElementById('result-correct').textContent = state.charIndex - state.errors;
  document.getElementById('result-errors').textContent  = state.errors;

  const username = usernameInput.value.trim() || DEFAULT_USERNAME;
  localStorage.setItem('typingGameUsername', username);
  addLeaderboardEntry(username, wpm).then(updateLeaderboardDisplay).catch((err) => console.error(err));

  // Hide the word display, show results
  wordDisplay.style.display   = 'none';
  resultsScreen.style.display = 'block';
}

/* =============================================
   INITIALISE / RESET THE GAME
   Called on page load, restart button, or category change.
============================================= */
function initGame() {
  // Clear any running timer
  clearInterval(state.timerInterval);

  // Reset state
  state.charIndex   = 0;
  state.totalTyped  = 0;
  state.errors      = 0;
  state.timeLeft    = state.totalTime;
  state.started     = false;
  state.finished    = false;

  // Generate words and build the DOM spans
  state.words     = generateWords(state.category);
  state.flatChars = buildDisplay(state.words);

  // Reset displays
  timerDisplay.textContent = state.totalTime;
  timerDisplay.classList.remove('low');
  wpmDisplay.textContent   = 0;
  accDisplay.textContent   = '—';
  charsDisplay.textContent = 0;

  // Show word display, hide results
  wordDisplay.style.display   = '';
  resultsScreen.style.display = 'none';

  // Show the "click to start" overlay
  startOverlay.classList.remove('hidden');

  // Clear the hidden input
  typingInput.value = '';

  updateCursor(); // Mark the first character
  updateLeaderboardDisplay();
}

/* =============================================
   HANDLE KEYSTROKES
   This is the core game logic — fires on every key press.
============================================= */
typingInput.addEventListener('input', (e) => {
  // Ignore input if game is over
  if (state.finished) return;

  // Start timer on the first keystroke
  if (!state.started) startTimer();

  // Get what was just typed (last character entered)
  const typed = typingInput.value;
  const lastChar = typed[typed.length - 1];

  // Clear the input so we can track character-by-character
  // (We don't want the full typed string building up)
  typingInput.value = '';

  // Get the expected character at the current position
  const expected = state.flatChars[state.charIndex];

  // Get the span for the current character
  const span = wordDisplay.querySelector(`[data-index="${state.charIndex}"]`);
  if (!span) return; // Safety check — we've reached the end

  state.totalTyped++; // Count this keystroke

  if (lastChar === expected) {
    // ✅ CORRECT — mark green and advance
    span.classList.add('correct');
    state.charIndex++;
  } else {
    // ❌ WRONG — mark red and still advance (like a real typing test)
    span.classList.add('wrong');
    state.charIndex++;
    state.errors++;
  }

  updateCursor(); // Move the cursor indicator
  updateStats();  // Refresh the live stats display

  // If we've typed all characters, end the game early
  if (state.charIndex >= state.flatChars.length) {
    endGame();
  }
});

/* =============================================
   HANDLE BACKSPACE
   Allows players to correct mistakes by backspacing.
   Removes the last character's styling and moves back.
============================================= */
typingInput.addEventListener('keydown', (e) => {
  // Only handle backspace during active gameplay
  if (e.key !== 'Backspace' || state.finished) return;

  // Don't allow backspacing before the start
  if (state.charIndex === 0) return;

  // Move back one character
  state.charIndex--;

  // Get the span for the previous character
  const span = wordDisplay.querySelector(`[data-index="${state.charIndex}"]`);
  if (span) {
    if (span.classList.contains('wrong')) {
      state.errors = Math.max(0, state.errors - 1);
    }
    // Remove both correct and wrong classes so it can be re-typed
    span.classList.remove('correct', 'wrong');
  }

  // Update stats and cursor
  updateStats();
  updateCursor();
});

/* =============================================
   CLICK WORD DISPLAY (or overlay) TO FOCUS INPUT
   Since the input is hidden, clicking anywhere on the
   display area focuses it so keystrokes are captured.
============================================= */
startOverlay.addEventListener('click', () => {
  startOverlay.classList.add('hidden'); // Hide the overlay
  typingInput.focus();                  // Focus the hidden input
});

wordDisplay.addEventListener('click', () => {
  if (!state.finished) typingInput.focus();
});

/* =============================================
   RESTART BUTTON
============================================= */
restartBtn.addEventListener('click', () => {
  initGame();
});

/* =============================================
   TIME MODE BUTTONS (15s / 30s / 60s)
============================================= */
document.querySelectorAll('.time-modes').forEach(wrapper => {
  wrapper.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-btn');
    if (!btn) return;

    // Update active styling in both selectors
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update state and restart
    state.totalTime = parseInt(btn.dataset.time, 10);
    initGame();
  });
});

/* =============================================
   CATEGORY BUTTONS (Gaming / CS / Mixed)
============================================= */
document.getElementById('category-row').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;

  // Update active styling
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Update state and restart
  state.category = btn.dataset.cat;
  initGame();
});

/* =============================================
   KEYBOARD SHORTCUT — Tab to restart
   Common in typing game UX (like monkeytype)
============================================= */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault(); // Stop Tab from moving focus
    initGame();
  }
});

/* =============================================
   INITIAL LOAD — start the game for the first time
============================================= */
initGame();