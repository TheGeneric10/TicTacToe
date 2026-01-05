(() => {
  const GAME_VERSION_LOCK = "1.0"; // do not change until you say so
  const WIN_POINTS = 3;
  const END_SCREEN_ARM_MS = 220;

  // =========================================================
  // AI Profile: Smart-1.5 (Normal)
  // Difficulty: Slightly Easy
  // Rate: Simple Rate + Slight Delay
  // =========================================================
  const AI_PROFILE = {
    name: "Smart-1.5",
    difficulty: "Slightly Easy",
    delayMin: 520,
    delayMax: 920,
    rate: {
      takeWin: 0.88,
      blockWin: 0.80,
      takeCenter: 0.72,
      takeCorner: 0.70,
      takeFork: 0.45,
      blockFork: 0.40
    },
    mistakeChance: 0.16
  };

  // ---------- Sounds ----------
  const SFX = {
    pop: new Audio("assets/sounds/pop.ogg"),
    win: new Audio("assets/sounds/win.ogg"),
    lose: new Audio("assets/sounds/lose.ogg"),
    draw: new Audio("assets/sounds/draw.ogg")
  };
  Object.values(SFX).forEach(a => {
    a.preload = "auto";
    a.volume = 0.85;
  });

  let audioUnlocked = false;
  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;

    try {
      const a = SFX.pop;
      a.volume = a.volume;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {});
      }
    } catch (_) {}
  }

  function playSfx(name) {
    const a = SFX[name];
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (_) {}
  }

  window.addEventListener("pointerdown", unlockAudioOnce, { passive: true, once: true });
  window.addEventListener("touchstart", unlockAudioOnce, { passive: true, once: true });
  window.addEventListener("keydown", unlockAudioOnce, { once: true });

  // ---------- DOM ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const menu = document.getElementById("menu");
  const sideSelect = document.getElementById("sideSelect");
  const pause = document.getElementById("pause");
  const end = document.getElementById("end");
  const about = document.getElementById("about");

  const pauseBtn = document.getElementById("pauseBtn");
  const turnHUD = document.getElementById("turnHUD");
  const toast = document.getElementById("toast");
  const turnSwipe = document.getElementById("turnSwipe");

  const redScoreEl = document.getElementById("redScore");
  const blueScoreEl = document.getElementById("blueScore");
  const roundNumEl = document.getElementById("roundNum");

  const endText = document.getElementById("endText");
  const againBtn = document.getElementById("again");
  const mainMenuBtn = document.getElementById("mainMenu");
  const goRedVal = document.getElementById("goRedVal");
  const goBlueVal = document.getElementById("goBlueVal");

  const pickRed = document.getElementById("pickRed");
  const pickBlue = document.getElementById("pickBlue");
  const sideBack = document.getElementById("sideBack");

  const pvpBtn = document.getElementById("pvp");
  const pvcBtn = document.getElementById("pvc");
  const aboutBtn = document.getElementById("aboutBtn");

  const resumeBtn = document.getElementById("resume");
  const menuPauseBtn = document.getElementById("menuPause");
  const aboutPauseBtn = document.getElementById("aboutPause");
  const closeAboutBtn = document.getElementById("closeAbout");

  // About ENV targets
  const aboutVersionEl = document.getElementById("aboutVersion");
  const aboutDescEl = document.getElementById("aboutDesc");
  const aboutInfoEl = document.getElementById("aboutInfo");

  window.addEventListener("DOMContentLoaded", () => {
    if (!window.GAME_ENV) return;
    if (aboutVersionEl) aboutVersionEl.textContent = window.GAME_ENV.version || "—";
    if (aboutDescEl) aboutDescEl.textContent = window.GAME_ENV.description || "—";
    if (aboutInfoEl) aboutInfoEl.textContent = window.GAME_ENV.info || "—";
  });

  // ---------- Geometry ----------
  let size = 0, cell = 0, ox = 0, oy = 0;
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    size = Math.min(canvas.width, canvas.height) * 0.7;
    cell = size / 3;
    ox = (canvas.width - size) / 2;
    oy = (canvas.height - size) / 2;
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Game State ----------
  let board = null; // [{value, placedAt}]
  let current = "X";
  let winLine = null;

  let inGame = false;
  let pausedState = false;
  let gameOver = false;
  let aiThinking = false;

  let mode = null;        // "pvp" | "pvc"
  let player1Mark = "X";  // PvP: chosen side
  let humanMark = "X";    // PvC: chosen side

  let scores = { X: 0, O: 0 }; // X=RED, O=BLUE
  let matchRound = 1;
  let lastResult = null;       // "X" | "O" | "draw" | null

  let aiTimeoutId = null;
  let endArmTimeoutId = null;
  let endScreenArmed = false;

  // ---------- Helpers ----------
  function setActive(el, on) { if (el) el.classList.toggle("active", !!on); }
  function hideAllScreens() { [menu, sideSelect, pause, end].forEach(s => setActive(s, false)); }

  function clearAi() {
    if (aiTimeoutId !== null) {
      clearTimeout(aiTimeoutId);
      aiTimeoutId = null;
    }
  }

  function clearEndTimer() {
    if (endArmTimeoutId !== null) {
      clearTimeout(endArmTimeoutId);
      endArmTimeoutId = null;
    }
  }

  function showToast(msg, ms = 2500) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), ms + 60);
  }

  function updateTopHUD() {
    if (redScoreEl) redScoreEl.textContent = String(scores.X);
    if (blueScoreEl) blueScoreEl.textContent = String(scores.O);
    if (roundNumEl) roundNumEl.textContent = String(matchRound);
  }

  function updateGameOverStadium() {
    if (goRedVal) goRedVal.textContent = String(scores.X);
    if (goBlueVal) goBlueVal.textContent = String(scores.O);
  }

  function getTurnText() {
    if (!inGame || pausedState || gameOver) return "";
    if (mode === "pvp") return current === player1Mark ? "Player 1 Turn" : "Player 2 Turn";
    return current === humanMark ? "Your Turn" : "Computer Turn";
  }

  function updateTurnHUD() {
    if (!turnHUD) return;
    const t = getTurnText();
    if (!t) { turnHUD.style.opacity = "0"; return; }
    turnHUD.style.opacity = "1";
    turnHUD.textContent = t;
  }

  // ===== FIXED: bubble dot color depends on the TEAM (X=RED, O=BLUE) =====
  function teamDotClassForMark(mark) {
    return (mark === "X") ? "red" : "blue";
  }

  function showTurnSwipeBubbleForCurrentPlayer() {
    if (mode !== "pvp" || !turnSwipe) return;

    const p1Mark = player1Mark;
    const p2Mark = (player1Mark === "X") ? "O" : "X";

    const isP1Turn = (current === p1Mark);
    const playerNum = isP1Turn ? 1 : 2;

    const side = isP1Turn ? "left" : "right";
    const playerMark = isP1Turn ? p1Mark : p2Mark;

    const dot = teamDotClassForMark(playerMark);
    const text = playerNum === 1 ? "Player 1 Played" : "Player 2 Played";

    turnSwipe.innerHTML = `
      <div class="bubble ${side}">
        <span class="dot ${dot}"></span>
        <span>${text}</span>
      </div>
    `;
  }

  // ---------- Round-first rule ----------
  function nextFirstMark() {
    if (lastResult === "X") return "O";
    if (lastResult === "O") return "X";
    return Math.random() < 0.5 ? "X" : "O";
  }

  // ---------- Match / Board ----------
  function resetBoard(firstMark) {
    clearAi();
    clearEndTimer();

    board = Array(9).fill(null).map(() => ({ value: null, placedAt: 0 }));
    current = firstMark;
    winLine = null;

    pausedState = false;
    gameOver = false;
    aiThinking = false;
    inGame = true;

    endScreenArmed = false;

    updateTopHUD();
    updateTurnHUD();

    if (mode === "pvc" && current !== humanMark) queueAi();
  }

  function startMatch() {
    scores = { X: 0, O: 0 };
    matchRound = 1;
    lastResult = null;

    hideAllScreens();
    setActive(about, false);

    resetBoard("X");

    if (mode === "pvp") {
      const p1Team = player1Mark === "X" ? "RED" : "BLUE";
      const p2Team = player1Mark === "X" ? "BLUE" : "RED";
      showToast(`Player 1 = ${p1Team} • Player 2 = ${p2Team}`, 2500);
    }
  }

  function goMainMenu() {
    clearAi();
    clearEndTimer();

    inGame = false;
    pausedState = false;
    gameOver = false;
    aiThinking = false;

    winLine = null;
    board = null;

    hideAllScreens();
    setActive(about, false);
    setActive(menu, true);
    updateTurnHUD();
  }

  // ---------- Mode / Side Select ----------
  let pendingMode = null;

  function openSideSelect(whichMode) {
    pendingMode = whichMode;
    hideAllScreens();
    setActive(sideSelect, true);
  }

  pvpBtn && (pvpBtn.onclick = () => { playSfx("pop"); openSideSelect("pvp"); });
  pvcBtn && (pvcBtn.onclick = () => { playSfx("pop"); openSideSelect("pvc"); });

  sideBack && (sideBack.onclick = () => {
    playSfx("pop");
    pendingMode = null;
    hideAllScreens();
    setActive(menu, true);
  });

  pickRed && (pickRed.onclick = () => {
    playSfx("pop");
    mode = pendingMode;
    if (mode === "pvp") player1Mark = "X";
    else humanMark = "X";
    startMatch();
  });

  pickBlue && (pickBlue.onclick = () => {
    playSfx("pop");
    mode = pendingMode;
    if (mode === "pvp") player1Mark = "O";
    else humanMark = "O";
    startMatch();
  });

  // About
  aboutBtn && (aboutBtn.onclick = () => { playSfx("pop"); setActive(about, true); });
  aboutPauseBtn && (aboutPauseBtn.onclick = () => { playSfx("pop"); setActive(about, true); });
  closeAboutBtn && (closeAboutBtn.onclick = () => { playSfx("pop"); setActive(about, false); });

  // Pause
  pauseBtn && (pauseBtn.onclick = () => {
    if (!inGame || gameOver) return;
    playSfx("pop");
    pausedState = true;
    setActive(pause, true);
    updateTurnHUD();
  });

  resumeBtn && (resumeBtn.onclick = () => {
    playSfx("pop");
    pausedState = false;
    setActive(pause, false);
    updateTurnHUD();
  });

  menuPauseBtn && (menuPauseBtn.onclick = () => { playSfx("pop"); goMainMenu(); });

  // End menu (armed delay prevents fall-through)
  mainMenuBtn && (mainMenuBtn.onclick = () => {
    if (!endScreenArmed) return;
    playSfx("pop");
    goMainMenu();
  });

  againBtn && (againBtn.onclick = () => {
    if (!endScreenArmed) return;
    if (!gameOver) return;
    if (isMatchComplete()) return;

    playSfx("pop");
    setActive(end, false);
    matchRound += 1;

    const first = nextFirstMark();
    resetBoard(first);
    updateEndButtons();
  });

  // ---------- Input ----------
  function indexFromXY(x, y) {
    const c = Math.floor((x - ox) / cell);
    const r = Math.floor((y - oy) / cell);
    if (c < 0 || c > 2 || r < 0 || r > 2) return -1;
    return r * 3 + c;
  }

  function placeAt(i) {
    if (!inGame || pausedState || gameOver || aiThinking) return;
    if (i < 0 || i > 8) return;
    if (!board || board[i].value) return;

    board[i].value = current;
    board[i].placedAt = performance.now();
    playSfx("pop");

    if (mode === "pvp") showTurnSwipeBubbleForCurrentPlayer();

    checkState();
  }

  // Pointer events = no mobile double-trigger
  canvas.addEventListener("pointerup", (e) => {
    placeAt(indexFromXY(e.clientX, e.clientY));
  }, { passive: true });

  // ---------- Rules ----------
  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function checkWin(mark) {
    for (const w of WIN_LINES) {
      if (w.every(i => board[i].value === mark)) return w;
    }
    return null;
  }

  function isMatchComplete() {
    return scores.X >= WIN_POINTS || scores.O >= WIN_POINTS;
  }

  function updateEndButtons() {
    if (!againBtn) return;
    againBtn.style.display = isMatchComplete() ? "none" : "inline-block";
  }

  function checkState() {
    const w = checkWin(current);
    if (w) {
      winLine = w;
      gameOver = true;
      lastResult = current;
      scores[current] += 1;
      showEnd(current);
      return;
    }

    if (board.every(c => c.value)) {
      winLine = null;
      gameOver = true;
      lastResult = "draw";
      showEnd(null);
      return;
    }

    current = (current === "X") ? "O" : "X";
    updateTurnHUD();

    if (mode === "pvc" && !gameOver) {
      const comp = (humanMark === "X") ? "O" : "X";
      if (current === comp) queueAi();
    }
  }

  // ---------- Smart-1.5 AI (Slightly Easy) ----------
  function rngChance(p) { return Math.random() < p; }

  function emptyCells() {
    const out = [];
    for (let i = 0; i < 9; i++) if (!board[i].value) out.push(i);
    return out;
  }

  function immediateMove(mark) {
    for (const [a,b,c] of WIN_LINES) {
      const v = [board[a].value, board[b].value, board[c].value];
      const countMark = v.filter(x => x === mark).length;
      const countEmpty = v.filter(x => x === null).length;
      if (countMark === 2 && countEmpty === 1) {
        const idx = v.indexOf(null);
        return [a,b,c][idx];
      }
    }
    return -1;
  }

  function findForkMoves(mark) {
    const empties = emptyCells();
    const forks = [];
    for (const i of empties) {
      board[i].value = mark;
      let threats = 0;
      for (const [a,b,c] of WIN_LINES) {
        const v = [board[a].value, board[b].value, board[c].value];
        if (v.filter(x => x === mark).length === 2 && v.includes(null)) threats++;
      }
      board[i].value = null;
      if (threats >= 2) forks.push(i);
    }
    return forks;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function weightedPick(candidates) {
    const sum = candidates.reduce((s, o) => s + o.w, 0);
    let r = Math.random() * sum;
    for (const o of candidates) {
      r -= o.w;
      if (r <= 0) return o.i;
    }
    return candidates[candidates.length - 1].i;
  }

  function computeAiMoveSlightlyEasy(comp, human) {
    const empties = emptyCells();
    if (!empties.length) return -1;

    const winIdx = immediateMove(comp);
    if (winIdx !== -1 && rngChance(AI_PROFILE.rate.takeWin)) return winIdx;

    const blockIdx = immediateMove(human);
    if (blockIdx !== -1 && rngChance(AI_PROFILE.rate.blockWin)) return blockIdx;

    const forks = findForkMoves(comp);
    if (forks.length && rngChance(AI_PROFILE.rate.takeFork)) return pickRandom(forks);

    const humanForks = findForkMoves(human);
    if (humanForks.length && rngChance(AI_PROFILE.rate.blockFork)) return pickRandom(humanForks);

    if (!board[4].value && rngChance(AI_PROFILE.rate.takeCenter)) return 4;

    const corners = [0,2,6,8].filter(i => !board[i].value);
    const sides = [1,3,5,7].filter(i => !board[i].value);

    const mistake = rngChance(AI_PROFILE.mistakeChance);

    const candidates = [];
    if (corners.length) {
      const cornerWeight = mistake ? 1.0 : (rngChance(AI_PROFILE.rate.takeCorner) ? 2.2 : 1.4);
      for (const i of corners) candidates.push({ i, w: cornerWeight });
    }
    if (sides.length) {
      const sideWeight = mistake ? 2.0 : 1.25;
      for (const i of sides) candidates.push({ i, w: sideWeight });
    }

    if (!candidates.length) return pickRandom(empties);
    return weightedPick(candidates);
  }

  function queueAi() {
    clearAi();
    aiThinking = true;
    updateTurnHUD();

    const delay = AI_PROFILE.delayMin + Math.random() * (AI_PROFILE.delayMax - AI_PROFILE.delayMin);
    aiTimeoutId = setTimeout(() => {
      aiTimeoutId = null;
      aiMove();
    }, delay);
  }

  function aiMove() {
    if (!inGame || pausedState || gameOver) { aiThinking = false; updateTurnHUD(); return; }
    if (!board) { aiThinking = false; updateTurnHUD(); return; }

    const comp = (humanMark === "X") ? "O" : "X";
    const human = humanMark;

    const idx = computeAiMoveSlightlyEasy(comp, human);
    if (idx === -1) { aiThinking = false; updateTurnHUD(); return; }

    board[idx].value = comp;
    board[idx].placedAt = performance.now();
    playSfx("pop");

    aiThinking = false;
    checkState();
  }

  // ---------- End overlay ----------
  function showEnd(winner) {
    clearAi();
    clearEndTimer();
    aiThinking = false;

    updateTopHUD();
    updateGameOverStadium();
    updateEndButtons();

    if (winner === "X") endText.textContent = "RED WINS!";
    else if (winner === "O") endText.textContent = "BLUE WINS!";
    else endText.textContent = "DRAW!";

    setActive(end, true);
    endScreenArmed = false;

    endArmTimeoutId = setTimeout(() => { endScreenArmed = true; }, END_SCREEN_ARM_MS);
    updateTurnHUD();

    if (mode === "pvc") {
      if (winner === humanMark) playSfx("win");
      else if (!winner) playSfx("draw");
      else playSfx("lose");
    } else {
      if (!winner) playSfx("draw");
      else playSfx("win");
    }

    if (winner === "X" || winner === "O") spawnPlusOne(winner);
  }

  function spawnPlusOne(mark) {
    const target = (mark === "X") ? goRedVal : goBlueVal;
    if (!target) return;

    const sX = window.innerWidth / 2;
    const sY = window.innerHeight / 2;

    const r = target.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height / 2;

    const el = document.createElement("div");
    el.className = "plusOneFly";
    el.textContent = "+1";
    el.style.left = sX + "px";
    el.style.top = sY + "px";
    el.style.color = (mark === "X") ? "#ff6b6b" : "#4cffd7";
    document.body.appendChild(el);

    const dx = tx - sX;
    const dy = ty - sY;

    requestAnimationFrame(() => {
      el.style.transition = "transform .22s cubic-bezier(.15,1.15,.25,1),opacity .22s ease";
      el.style.transform = `translate(${dx}px,${dy}px) scale(.35)`;
      el.style.opacity = "0";
    });

    setTimeout(() => el.remove(), 260);
  }

  // ---------- Draw ----------
  function drawBoard() {
    ctx.strokeStyle = "#ffffff44";
    ctx.lineWidth = 4;

    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cell, oy);
      ctx.lineTo(ox + i * cell, oy + size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox, oy + i * cell);
      ctx.lineTo(ox + size, oy + i * cell);
      ctx.stroke();
    }
  }

  function drawMarks() {
    if (!board) return;

    board.forEach((c, i) => {
      if (!c.value) return;

      const t = Math.min((performance.now() - c.placedAt) / 200, 1);
      const cx = ox + (i % 3) * cell + cell / 2;
      const cy = oy + Math.floor(i / 3) * cell + cell / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(t, t);
      ctx.globalAlpha = t;

      ctx.lineWidth = 6;
      ctx.strokeStyle = (c.value === "X") ? "#ff6b6b" : "#4cffd7";

      if (c.value === "X") {
        ctx.beginPath();
        ctx.moveTo(-cell / 2 + 20, -cell / 2 + 20);
        ctx.lineTo(cell / 2 - 20, cell / 2 - 20);
        ctx.moveTo(cell / 2 - 20, -cell / 2 + 20);
        ctx.lineTo(-cell / 2 + 20, cell / 2 - 20);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, cell / 2 - 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  function drawWin() {
    if (!winLine) return;

    const a = winLine[0];
    const b = winLine[2];

    const ax = ox + (a % 3) * cell + cell / 2;
    const ay = oy + Math.floor(a / 3) * cell + cell / 2;
    const bx = ox + (b % 3) * cell + cell / 2;
    const by = oy + Math.floor(b / 3) * cell + cell / 2;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (inGame) {
      drawBoard();
      drawMarks();
      drawWin();
    }
    requestAnimationFrame(loop);
  }

  // ---------- Boot ----------
  hideAllScreens();
  setActive(menu, true);
  updateTopHUD();
  updateTurnHUD();
  updateEndButtons();
  loop();
})();
