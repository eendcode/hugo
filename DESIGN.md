# Handover: "Het Geheim van de Duinkapel" – a road-building puzzle game for a 5-year-old

This document is a brief for Claude Code. It describes a small, fully in-browser puzzle game with its puzzle logic in Rust compiled to WebAssembly. It should be buildable from this document alone. If the repository already has conventions (tooling, layout, CI), follow those and adapt the layout below.

---

## 1. Context and goals

- **Player:** a bright 5-year-old who loves route-planning puzzles. His favourite physical game is a road puzzle on a 4×4 grid with some fixed road pieces, where you complete the route. 4×4 is now too easy for him.
- **Language:** he reads a little Dutch and a tiny bit of English. A parent always plays along and can read text aloud. UI text is **Dutch first**, kept short. No long instructions.
- **Where it runs:**
  1. a tablet, phone or laptop browser (touch and mouse), and
  2. a **TV browser app on a Google TV / Chromecast**, operated with the **remote's D-pad** (arrow keys, OK/Enter, Back).
- **Hosting:** static files only. They are served over **plain HTTP** from a Raspberry Pi on the home LAN, or optionally from GitHub Pages. There is no backend, no accounts, no analytics, and no network calls after load.
- **Tech wish:** puzzle logic in **Rust → WASM**. Rendering and input in plain JavaScript (ES modules, no framework, no bundler).

### Design principles for the child

- No timers. No lives. No losing. Undo is always available and unlimited.
- Big targets and high contrast. The game must be playable at TV distance.
- Celebrate finishing (a short animation, Pim riding the route), not speed.
- A hint is always available; it reveals one correct placement.
- Difficulty should rise gradually, with an adult-accessible setting to jump levels.

---

## 1b. Theme: "Het Geheim van de Duinkapel" (The Secret of the Dune Chapel)

A spooky-but-safe night adventure in the Brabant dunes. It draws on **public-domain Dutch/Flemish folklore**:

- the **Bokkenrijders**, 18th-century robber bands that, according to legend, flew through the night on goats and marked houses with a goat's hoof;
- the **witte wieven**, ghostly white women who haunt misty heaths and dunes;
- a small chapel alone in the sand.

**IP guardrail:** all characters, names, art, sounds and text must be original. Do not use names, characters, logos, music or attraction designs from theme parks (e.g. the Efteling), and do not imitate their look. The folklore itself is free to use.

### Story (told in 4–6 short picture screens, Dutch, parent reads aloud)

1. One stormy night, the goat-riding robbers of **Hoofdman Hugo** raided the **Duinkapel**. They scattered its treasures across the dunes: the silver candlestick, the golden cup, and the little bell.
2. Since then, **de Witte Dame** floats through the mist at night. She is the chapel's sad guardian, and she scares away anyone who comes near.
3. **Pim** and his brave goat **Barend** decide to bring every treasure back. Each road Pim builds leads him, lantern in hand, across the dunes.
4. On the way, he must **stay out of the ghost mist** and **dodge the Witte Dame** where she drifts.
5. **Finale:** when the last treasure is back, the bell rings. The Witte Dame smiles for the first time, her mist lifts, and the sun comes up over the dunes. The scary thing turns out to be okay. This arc is intentional: the fear resolves into safety.

Hugo only appears in the intro and outro, as a silly-scary silhouette on a goat. He never appears in the road game's levels. (He was first called Graaiert; the other game modes, added later, give him a bigger part: he is the black king in the chess village and the cursed owner of the haunted house.)

### How the theme maps onto the puzzle

| Puzzle concept | Theme |
|---|---|
| Start cell | Pim on Barend, with a lantern |
| Finish cell | De Duinkapel |
| Waypoints (ordered in later stages) | Stolen treasures: kandelaar, beker, klokje |
| Obstacles | Sand dunes, pine trees, heather, the robbers' campfire |
| **Mist cells** (new rule) | Ghost mist: the route may **not** pass through. Fixed road tiles may run *into* the mist as tempting traps |
| Decoy fixed roads | Robber trails, marked with goat-hoof prints, that lead to dead ends |
| **Patrol** (new rule, late stages) | The Witte Dame floats along a fixed loop; Pim must never meet her (see §2.3) |
| Win animation | Pim rides the route with a swinging lantern glow; the treasure flies into the chapel with a chime |

### "Griezelstand" (scare level) — adult setting

- **Zacht:** bright moon, friendly-looking Dame (soft glow), no spooky sounds.
- **Spannend** (default): fog wisps, owl hoots, a darker sky, and the Dame's glow flickers.
- **Eng:** darker night, wind sounds, and the Dame drifts a bit closer when Pim waits too long. She is never shown as a jump-scare, and every level still ends warm and bright.

### Visual and audio style

- **Palette:** deep night blue, moonlit sand, heather purple, warm lantern yellow, and a cool pale blue-white for the ghost.
- **Roads:** light sand on dark ground, so contrast stays high on the TV.
- **Art:** everything is drawn procedurally in SVG, with no external image assets. Use a simple storybook shape language: rounded dunes, triangle pines, and a small chapel with a bell tower. The Witte Dame is an original design: a softly glowing, flowing figure made of mist carrying a pale-blue lantern, with no face details in the "Zacht" setting.
- **Sound:** synthesised with the Web Audio API where possible (wind noise, a simple owl hoot, bell chimes). Any recorded sounds must be CC0 and committed with their licence notes.

---

## 2. The game

### 2.1 Board and pieces

- Rectangular grid, **N×N with N ∈ {4, 5, 6}**, possibly 7 later. Code must not hard-code a grid size.
- Each cell is either empty, holds a **fixed** tile (pre-placed, locked, visually distinct), or holds a **player-placed** tile.
- Tile types are defined by which of the four sides (N, E, S, W) have a road opening:
  - `Straight` (2 orientations)
  - `Curve` (4)
  - `TJunction` (4)
  - `Cross` (1)
  - `DeadEnd` (4) — optional, used only as start and finish pieces or as decoys
  - `Obstacle` (no openings: dune, pine tree, heather, campfire). Fixed only.
- **Start** (Pim on Barend) and **Finish** (the Duinkapel) are fixed cells, each with a single opening.
- Optional **waypoints** (the stolen treasures) are fixed cells the route must pass through. In harder levels they must be visited in a given order.
- **Mist cells** are fixed cells the route may not use. A mist cell may contain a fixed road tile as a lure.

### 2.2 Player mechanics (default mode: "Leggen" = place)

- A **tray** below or beside the board holds pieces the player can place.
- The player selects a tray piece, then an empty cell, and the piece is placed.
- Selecting an already placed (non-fixed) tile rotates it 90° clockwise. A second action returns it to the tray. Pick one consistent scheme; see §4.
- The tray may contain **decoy pieces** that are not needed.
- **Win condition:** a continuous road connects Start to Finish, passing every waypoint, in the required order if the level sets one. The route must not pass through any mist cell, and it must satisfy the patrol rule (§2.3) if the level has a patrol. Open road ends that are not on the route are allowed. The check runs after every move, and a win triggers the celebration.
- **Near-miss feedback:** if the road reaches Finish but breaks a rule (goes through mist, skips a treasure, or meets the Dame), show *which* rule with an icon and a short Dutch line, with no "fail" sound. For example, the mist cell pulses and the text reads "Oei, daar is de spookmist!"

> **Open question for the owner:** in his physical game, are pieces rotated freely when placed, or does each piece come in a fixed orientation? The default above allows rotation. Put this behind a level flag (`rotatable: bool`) so both modes work.

### 2.3 The Witte Dame's patrol (late stages)

- The Dame follows a fixed **closed loop** of cells, moving one cell per tick. The loop is shown before and during play as faint glowing footprints, and a "👻 kijk" button animates her loop once.
- When the player finishes a route, Pim starts on the Start cell at tick 0 and moves one route cell per tick. He never waits.
- **Rule:** Pim and the Dame may never be on the same cell at the same tick, and may never swap cells between two ticks.
- This turns the puzzle into route **and** timing planning. The solver handles it by carrying the tick (route index) in its search state, and checking the Dame's position at `tick mod loop_length`.
- Introduce it gently:
  - first stage with a patrol: a short loop that crosses only one possible route;
  - later stages: longer loops, where the obvious shortest route gets caught and a longer detour is needed.

### 2.4 Later variant (not in the first milestone)

- **"Draaien" (rotate) mode:** every cell is filled, and the player only rotates tiles. This is a pipe-puzzle-style variant. The same core model and solver should support it with little extra work, so keep the model general.

---

## 3. Architecture

```
repo/
├── core/                 # Rust crate: model, solver, generator (no web deps in logic)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs        # wasm-bindgen API surface (thin)
│       ├── model.rs      # Grid, Tile, Side, Level, State
│       ├── rules.rs      # route finding + win check
│       ├── solver.rs     # backtracking solver, solution counting, hints
│       ├── generator.rs  # seeded level generation + difficulty scoring
│       └── rng.rs        # small deterministic PRNG (e.g. SplitMix64/PCG), no getrandom
├── tools/levelpack/      # native Rust binary: pre-generates curated level packs as JSON
├── web/
│   ├── index.html
│   ├── main.js           # boot, WASM loading (with fallback), screen routing
│   ├── board.js          # SVG rendering of grid, tiles, tray, cursor
│   ├── input.js          # unified input: touch/mouse + keyboard/D-pad
│   ├── i18n.js           # Dutch strings (+ English fallback)
│   ├── storage.js        # progress in localStorage (wrapped in try/catch)
│   ├── levels/           # generated level packs (JSON), committed
│   └── pkg/              # wasm-pack output (build artefact, git-ignored)
├── Makefile (or justfile)
└── README.md
```

### 3.1 Rust / WASM

- Build with `wasm-pack build core --target web --release --out-dir ../web/pkg`. Keep the output small: use `opt-level = "z"` or `"s"`, `lto = true`, and `panic = "abort"`. Optionally add `wasm-opt`.
- Use `serde` + `serde-wasm-bindgen` or JSON strings across the boundary. Keep the API small and coarse-grained:
  - `generate(seed: u64, difficulty: u32, size: u8) -> Level`
  - `check(level: Level, state: State) -> CheckResult` (win? route cells for animation, open issues)
  - `hint(level: Level, state: State) -> Option<Move>` (one move toward a solution consistent with the current state; if the state has a wrong piece, the hint says which one to remove)
  - `solve_count(level: Level, limit: u32) -> u32` (for tests and tools)
- The logic modules must compile and test natively (`cargo test`) without wasm. Only `lib.rs` touches `wasm-bindgen`.

### 3.2 Solver

- Model placement as a constraint problem over cells. Each empty cell gets one tray piece (at some orientation) or stays empty, and adjacent openings must match along the route.
- Backtracking with pruning:
  - route-based search: extend a path from Start, cell by cell, choosing available pieces and orientations that connect;
  - do not reuse tray pieces beyond their count;
  - prune when the remaining distance to the next waypoint or Finish exceeds the pieces left;
  - never step into a mist cell;
  - in patrol levels, carry the tick (route index) in the search state and reject a step that lands on, or swaps with, the Dame (§2.3).
- `count_solutions(limit)` stops early at `limit`, which is usually 2 for uniqueness checks.
- Define "solution" by the **set of route cells and their pieces**. Pieces left unused in the tray do not create distinct solutions.

### 3.3 Generator

1. Seeded RNG. The seed is shown in the adult menu, so a level can be replayed or shared.
2. Choose Start, Finish, and optional waypoints on the grid.
3. Generate a random self-avoiding path through them with a target length. Bias toward turns for interest.
4. Derive a tile for each path cell from its entry and exit sides.
5. Mark a fraction of path cells as **fixed** (the givens). The rest go to the tray.
6. Fill non-path cells with fixed obstacles, mist cells (some holding lure roads), or disconnected fixed road scenery such as robber trails (red herrings), or leave them empty. In patrol stages, pick a Dame loop that the intended route safely avoids but that catches at least one tempting shorter route.
7. Add decoy pieces to the tray according to difficulty.
8. Run the solver: require **exactly 1 solution**. Accept 2 only at the easiest difficulty. Otherwise retry with a new sub-seed.
9. Score difficulty and keep the level if it lands in the requested band.

**Difficulty knobs**, from easy to hard:

- grid size;
- route length;
- number of tray pieces;
- fraction of givens (fewer = harder);
- number of decoys;
- rotation allowed (with rotation = more branching);
- waypoints and their order;
- scenery roads that look like part of the route;
- mist cells, especially ones holding lure roads;
- a Witte Dame patrol, and its loop length.

**Difficulty score:** use solver effort (number of search nodes or dead ends explored) plus route length and decoy count. Calibrate the bands empirically in `tools/levelpack`.

### 3.4 Level packs vs. live generation

- TV hardware is weak, so ship **pre-generated level packs** (for example 30 levels per stage, about 8 stages from 4×4 easy to 6×6 hard), produced by `tools/levelpack` and committed as JSON.
- Live WASM generation is available in the adult menu ("Nieuwe puzzel", "Moeilijker", "Makkelijker"). Budget: under 200 ms on a mid-range phone. Show a small spinner if it takes longer.

### 3.5 Frontend

- **Rendering:** SVG in the DOM, drawn procedurally with no image assets. Use thick road strokes, clear colours, and a colour-blind-safe palette. Fixed tiles have a distinct background or a small lock mark. The layout is responsive and fills the screen at 16:9 TV and portrait tablet.
- **Animation:** after a win, Pim rides along the route with his lantern, using CSS or SVG animation. The route cells light up in sequence. In patrol levels, the Dame moves in step with him, so the child sees them pass each other safely.
- **Sound:** optional short sounds via the Web Audio API for place, rotate and win, plus the ambient sounds of the chosen Griezelstand (§1b). They must be mutable. Do not depend on speech synthesis, which is unreliable on TV browsers.
- **Progress:** store the current stage and level and the stars in `localStorage`, with every access wrapped in `try/catch`. The game must work if storage is unavailable.

---

## 4. Input: touch and D-pad must both be first-class

A single focus/cursor model serves both input methods.

| Action | Touch / mouse | Keyboard / TV remote |
|---|---|---|
| Move focus | — | Arrow keys move between grid cells and the tray row |
| Pick piece from tray | Tap piece | Focus piece + OK/Enter |
| Place piece | Tap empty cell | Focus cell + OK/Enter |
| Rotate placed piece | Tap placed piece | OK/Enter on placed piece |
| Return piece to tray | Long-press, or drag back | Dedicated key (for example `Backspace`/`Delete`) or an on-screen "terug" button |
| Undo | On-screen ↶ button | On-screen button (focusable), plus the `u` key |
| Hint | On-screen 💡 button | On-screen button (focusable) |

- The focused element needs a very visible focus ring, readable at 3 metres.
- On-screen buttons (undo, hint, menu) must be reachable with arrow keys.
- **The remote's Back button** usually triggers browser history navigation. Use `history.pushState` sentinel entries and a `popstate` handler, so that Back closes menus or undoes instead of leaving the page. Test this in the actual TV browser, because behaviour varies.
- Ignore key-repeat bursts for OK/Enter to avoid accidental double actions.

---

## 5. Text and language

- All strings live in `i18n.js`. Dutch (`nl`) is the default; English (`en`) is a fallback.
- Keep text minimal and in simple words, for example:
  - `"Maak een weg naar de kapel!"`
  - `"Haal eerst de kandelaar!"`
  - `"Pas op voor de spookmist!"`
  - `"Ontwijk de Witte Dame!"`
  - `"Goed zo!"`
  - `"Nog een keer?"`
  - `"Hint"`
  - `"Terug"`
  - `"Moeilijker"` / `"Makkelijker"`
- Icons carry the meaning; text is a bonus for reading practice.
- **The exception: the story mode** (*Het grote verhaal*, added later) is meant to be read. Its story pages and riddles are written in easy Dutch for a child who is starting to read (short sentences, short words, riddles that end in "Wat ben ik?"), with a parent helping. The puzzles inside it still need no reading. See `STORY.md`.

---

## 6. Hosting and deployment

- The output is a static folder (`web/`). Nothing requires HTTPS:
  - WASM, SVG, Web Audio, `localStorage` and keyboard input all work over plain HTTP.
  - Do **not** add a service worker. It requires a secure context, and offline mode isn't needed on the LAN.
- **WASM loading must work even if the server sends the wrong MIME type.** Try `WebAssembly.instantiateStreaming`. On failure, fall back to `fetch → arrayBuffer → WebAssembly.instantiate`. With `wasm-pack --target web`, pass the bytes or module to the generated `init()` in the fallback path.
- **Raspberry Pi:** document a minimal nginx or Caddy config serving `web/` over HTTP on port 80, with `application/wasm` configured. Recommend a DHCP reservation, so the TV bookmark `http://192.168.x.y/` stays valid; avoid relying on `.local` names.
- **Optional:** a GitHub Pages workflow that builds and publishes `web/`. This also enables a future Chromecast Web Receiver, which needs HTTPS.
- Add a `make serve` target for local development, for example `python3 -m http.server -d web 8080`.

---

## 7. Testing

- **Rust unit tests:**
  - tile connectivity and rotation;
  - route detection;
  - win check with waypoints and order;
  - mist cells are never allowed on the route;
  - patrol collisions, both same-cell and swapping cells;
  - solver finds known solutions;
  - `count_solutions` on hand-made levels with 0, 1 and 2 solutions.
- **Property tests** (for example `proptest`): every generated level at every difficulty is solvable, and is unique where required. The same seed always gives the same level.
- **Performance test:** generate 100 levels per difficulty natively and report timings. Fail if the median exceeds its budget.
- **Level-pack validation:** CI re-solves every committed level and checks uniqueness.
- **Frontend:** a small Playwright or similar smoke test, if the repo already uses one. Otherwise do a manual checklist covering:
  - touch play;
  - keyboard-only play (every action reachable);
  - win animation;
  - undo and hint;
  - storage disabled;
  - wrong WASM MIME type.

---

## 8. Milestones

1. **Core model + rules + solver** in Rust, with tests. No UI yet.
2. **Generator + difficulty scoring + `tools/levelpack`**, and the first calibrated packs committed.
3. **Web UI with touch/mouse:** board, tray, placing and rotating, win check, celebration, undo, hint.
4. **D-pad / TV support:** focus model, focus ring, Back-button handling, TV-sized layout.
5. **Theme and progression:** the Duinkapel story screens, themed SVG art, mist and patrol stages, Griezelstand, stages and stars, adult menu (difficulty, seed, sound, Griezelstand), Dutch strings.
6. **Deployment:** Pi config and README instructions; optional GitHub Pages workflow.

**Acceptance for v1:** the game plays start to finish on a tablet and in a TV browser using only the remote. Levels range from easy 4×4 to hard 6×6, every level has exactly one solution, and it runs from a plain-HTTP server on the LAN.

---

## 9. Future ideas (out of scope for v1, keep the core reusable)

> Since v1, the game has a mode menu and five more modes (see README.md): a chess village, Hugo's haunted house, Barend's program (the robot idea below), lantern light, and a Rush Hour-style cart yard (the sliding-block idea below).

- "Draaien" rotate-only mode (§2.4).
- More puzzle types that could share the grid, solver and generator infrastructure:
  - **Programmeer de robot** — plan a sequence of arrows, then press Go;
  - a Rush Hour-style sliding-block puzzle ("Maak de weg vrij");
  - mini Sokoban;
  - connect-the-colours;
  - a picture-based Mastermind.
- **Chromecast Custom Web Receiver:** the game runs on the Chromecast and a phone or tablet acts as the controller over a custom Cast message channel. This requires registering in the Google Cast SDK Developer Console and HTTPS hosting.