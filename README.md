# TicTacToe Arena

TicTacToe Arena is a modern, mobile-friendly **Red vs Blue** Tic Tac Toe game built with **vanilla HTML/CSS/JS** and a **Canvas** renderer. It’s designed to feel like a polished mini-game: quick matches, smooth UI transitions, light sound effects, and a clean “stadium” HUD that tracks scores and rounds.

This project supports **Play vs Player** (local PvP) and **Play vs Computer** (PvC) with a “Slightly Easy” AI profile that mixes smart choices with occasional mistakes. It’s intended for fast, replayable matches — perfect for quick rounds on desktop or mobile.

---

## Game Info

| Key | Value |
|---|---|
| Name | TicTacToe Arena |
| Genre | Strategy / Casual |
| Players | 1–2 |
| Modes | PvP, PvC, Online (beta) |
| Renderer | Canvas (`<canvas id="game">`) |
| UI Style | Modern HUD + overlays |
| Config | `window.GAME_ENV` (`/js/game.env.js`) |

---

## How To Play

The goal is simple: **get 3 in a row** before your opponent does.

- **Red = X**
- **Blue = O**
- Tap/click an empty cell to place your mark.
- Win a round by getting **three in a row** (horizontal, vertical, or diagonal).
- If the board fills with no winner, it’s a **Draw**.

---

## Match Rules & Scoring

Matches are played in rounds and tracked in the top “stadium” HUD.

| Rule | Detail |
|---|---|
| Round Win | Get 3 in a row |
| Draw | Board fills with no winner |
| Match Victory | First team to reach **3 points** (`WIN_POINTS = 3`) |
| Round Counter | Increments each “Play Again” |
| First Turn (Round 1) | Starts with **X** for stability |
| Next Round First Turn | Winner goes second; draws randomize first turn |

---

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Place mark | Click a cell | Tap a cell |
| Pause | Tap ⏸ button | Tap ⏸ button |
| Resume | “Resume” button | “Resume” button |
| About | “About Game” | “About Game” |

> Audio is unlocked after the first user interaction (tap/click/key press) to support mobile browser rules.

---

## Features

| Category | What’s Included |
|---|---|
| UI / UX | Modern screens (Menu, Side Select, Online Mode, Pause, Game Over, About) |
| HUD | Score + round “stadium” display |
| PvP | Local pass-and-play, with swipe bubble notifications |
| PvC AI | “Smart-1.5” slightly-easy AI with human-like errors |
| Online Mode | Join with a 6-digit code or queue for a match (requires connection) |
| Animations | Mark pop-in + win line + “+1” fly effect |
| Mobile Friendly | Touch-based play + user-select disabled |
| Config Binding | About screen auto-loads from `GAME_ENV` |

---

## Project Structure

| Path | Purpose |
|---|---|
| `index.html` | Main UI layout and script loading order |
| `css/style.css` | Full UI styling (HUD, screens, overlays, About UI) |
| `js/game.env.js` | Environment metadata (`window.GAME_ENV`) |
| `js/game.js` | Game logic, rendering, AI, UI hooks |
| `assets/sounds/*.ogg` | Sound effects (pop/win/lose/draw) |

Example layout:
```txt
/
├─ index.html
├─ README.md
├─ LICENSE.md
├─ css/
│  └─ style.css
├─ js/
│  ├─ game.env.js
│  └─ game.js
└─ assets/
   └─ sounds/
      ├─ pop.ogg
      ├─ win.ogg
      ├─ lose.ogg
      └─ draw.ogg
