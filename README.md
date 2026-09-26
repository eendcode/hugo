# Het Geheim van de Duinkapel

A road-building puzzle game for a five-year-old, played in the browser on a
tablet, phone, laptop or TV (Google TV / Chromecast browser with the remote).
Pim and his goat Barend build roads across the night dunes to bring the stolen
treasures back to the Duinkapel. Along the way they stay out of the ghost mist
and dodge the Witte Dame.

- Puzzle logic in **Rust → WebAssembly** (`core/`), rendering and input in plain
  JavaScript ES modules (`web/`). No framework, bundler, backend or network calls
  after load.
- 8 stages × 30 pre-generated levels, from easy 4×4 to hard 6×6. Every level has
  exactly one solution. Parents can also generate new puzzles live.
- All art is drawn procedurally in SVG, and all sounds are synthesised with Web
  Audio. There are no image or audio assets. The characters and story are
  original; the folklore they draw on (bokkenrijders, witte wieven) is public
  domain.

## Playing

**Goal:** connect Pim (start) to the chapel (finish) with road pieces from the
tray. The route must pick up the treasures (in numbered order when shown), may
not go through mist, and must not meet the Witte Dame on her loop. There are
no timers, no lives and no losing. Undo and hints are always available.

**Blocks** are big pieces covering several cells: 2×1, 3×1, 2×2 or 3×2, with
the road already drawn on them. Some cells are grass with no road. Stage 2
introduces a single 2×1 block. Later stages have more and bigger ones, and the
last stages add a decoy block that doesn't belong anywhere.

| Action | Touch / mouse | Keyboard / TV remote |
|---|---|---|
| Move focus | — | Arrow keys (board, tray and buttons) |
| Pick a piece | Tap it in the tray | Focus it + OK/Enter |
| Turn a tray piece | Tap the selected piece again | OK/Enter again |
| Place | Tap an empty cell | Focus the cell + OK/Enter |
| Place a block | Tap a cell it should cover (it snaps to where it fits; mouse and D-pad show a preview) | Same |
| Turn a placed piece | Tap it (a block turns around the tapped cell and shifts if needed) | OK/Enter on it |
| Return a piece to the tray | Long-press it, or the **Terug** button | `Backspace`/`Delete`, or the **Terug** button |
| Undo | **Oeps** button | **Oeps** button, `u`, or the remote's Back button |
| Hint | 💡 **Hint** button | 💡 **Hint** button |
| Watch the Dame's loop | 👻 **Kijk** button | 👻 **Kijk** button |

The **Terug** button returns the most recently placed or turned piece, which
is marked with a dashed outline. With a single tray piece selected, tapping a
placed single piece swaps them.

On the remote, **Back** undoes the last move. With nothing left to undo, it
goes back to the map, and on other screens it closes menus or goes back one
screen. It never leaves the page.

**Progress:** finishing 10 levels of a stage opens the next one. Clearing
stages 3, 5 and 8 returns the kandelaar, the beker and the klokje. The
finale plays after the last one. Stars: ★★★ without hints, ★★ with up to
two hints, ★ otherwise. Progress is saved in `localStorage`. The game still
works without it; the adult menu then says that nothing is saved.

**Voor ouders (⚙):** Griezelstand (Zacht / Spannend / Eng), sound, language
(Nederlands / English), live puzzles (Makkelijker / Nieuwe puzzel /
Moeilijker, difficulty 0–9), the current puzzle's code (seed) and replaying a
code, unlocking all stages, and resetting progress.

## Building and running

Needs Rust via rustup, with the wasm target and [wasm-pack](https://rustwasm.github.io/wasm-pack/):

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
curl -sSfL https://rustwasm.github.io/wasm-pack/installer/init.sh | sh
```

Then:

```sh
make serve        # builds web/pkg and serves http://localhost:8080/
make test         # Rust unit, property (proptest) and performance tests
make validate     # re-solve every committed level: exactly one solution, seed reproduces it
make levels       # regenerate web/levels (then commit them)
make calibrate    # score distribution per difficulty (for the bands in generator.rs)
make perf         # time 100 levels per difficulty and board size
```

The Makefile puts `~/.cargo/bin` first on `PATH`, so it uses the rustup
toolchain even when a distro `cargo` is installed. `web/pkg/` is a build
artefact and is git-ignored. The level packs in `web/levels/` are committed.

`web/` must be served over HTTP; `file://` does not work because the level
packs and WASM are fetched.

## Hosting on a Raspberry Pi (plain HTTP on the LAN)

HTTPS isn't needed: WASM, SVG, Web Audio, `localStorage` and keyboard input
all work over plain HTTP. There is deliberately no service worker, because
that requires a secure context.

1. Install nginx on the Pi: `sudo apt install nginx rsync`, then
   `sudo mkdir -p /srv/duinkapel && sudo chown $USER /srv/duinkapel`.
2. From your machine: `make deploy PI=pi@192.168.1.50`. This builds the WASM
   and rsyncs `web/` to `/srv/duinkapel`.
3. Install the site config (the steps are also in the file's header):
   ```sh
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/duinkapel
   sudo ln -sf /etc/nginx/sites-available/duinkapel /etc/nginx/sites-enabled/duinkapel
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```
   It serves `.wasm` as `application/wasm`. If a server gets the type wrong,
   the game still loads: it falls back from `WebAssembly.compileStreaming`
   to fetching the bytes.
4. Give the Pi a **DHCP reservation** in your router, so the TV bookmark
   `http://192.168.x.y/` stays valid. Don't rely on `.local` names; TV
   browsers often can't resolve them.
5. On the TV, open the browser app, go to `http://192.168.x.y/` and bookmark it.

### GitHub Pages (optional)

`.github/workflows/pages.yml` runs the Rust tests and the level-pack
validation, builds the WASM, and publishes `web/` on every push to `main`.
Enable it under *Settings → Pages → Source: GitHub Actions*. Pages also
provides the HTTPS that a future Chromecast Web Receiver would need.

## Project layout

```
core/                 Rust crate: model, rules, solver, generator (native + WASM)
  src/model.rs        Side, Tile, Cell, Level, State (serde JSON shapes)
  src/rules.rs        route finding and win check (mist, treasure order, Dame)
  src/solver.rs       backtracking solver, solution counting, hints
  src/generator.rs    seeded generation, repair to a unique solution, scoring
  src/rng.rs          SplitMix64 (no getrandom)
  src/ascii.rs        text format for hand-made test levels
  src/lib.rs          thin wasm-bindgen API: generate / check / hint / solve_count
  tests/              property tests and the generation performance test
tools/levelpack/      generate, validate, calibrate and benchmark level packs
web/                  the static site
  main.js             boot, WASM loading with fallback, screens, adult menu
  board.js            play screen: SVG board, tray, feedback, celebration
  game.js             per-level state, undo, hints (calls the core)
  input.js            unified touch/mouse + keyboard/D-pad focus model, Back button
  art.js              procedural SVG art and story scenes
  audio.js            Web Audio sounds and Griezelstand ambience
  i18n.js             Dutch strings (+ English)
  storage.js          progress in localStorage (every access in try/catch)
  levels/             committed level packs (index.json + stage-N.json)
deploy/nginx.conf     Pi web server config
```

### How the puzzle core works

- A **route** is a simple path of cells from Start to Finish through matching
  road openings. Junctions may be turned through any way, and open ends off
  the route are allowed.
- The **Witte Dame** walks a closed loop, one cell per tick. Pim starts at
  tick 0 and moves one route cell per tick without waiting. They may never
  share a cell at the same tick or swap cells between ticks. The solver
  carries the tick (route index) in its search state.
- **Blocks** are tray pieces `{w, h, tiles, rot}`. A `null` tile is grass:
  the block covers that cell, but it has no road. A placement is stored at
  its top-left (anchor) cell. `Block::shape` (Rust) and `shape()` in
  `web/game.js` must rotate the same way: old (x, y) goes to new (h−1−y, x).
- The **solver** extends a route from Start. It chooses tray pieces and
  orientations for free cells, never reuses pieces beyond their count, and
  never enters mist. When the route first steps onto a free cell, the solver
  can also place a block so that one of its road cells lands there. The
  block's other cells then act as fixed road. The solver prunes with a lower
  bound on the free cells still needed to reach the next treasure or the
  chapel, compared against the road cells the remaining pieces can still
  cover. Solutions are distinct by route plus what covers it: single pieces
  by *kind*, block cells by their exact tiles. Orientations that connect the
  same way, and unused tray pieces, don't count as different solutions.
- The **generator** walks a random, turn-biased route. It places treasures
  along it, fixes a fraction of the tiles as givens and sends the rest to the
  tray. It fills the other cells with scenery, mist (sometimes with lure
  roads), robber trails or free space, adds decoy pieces, and in patrol stages
  picks a Dame loop that catches a tempting alternative route. Before that it
  carves rectangles over stretches of the route into blocks; bigger ones are
  preferred, and the count grows with difficulty. It then *repairs* the
  level: while the solver finds a second solution, it blocks a cell that
  solution uses. If the other solution uses the same cells, it fixes the
  differing single piece as a given, or drops a spare piece that could stand
  in for part of a block, until the level has exactly one solution. The difficulty score combines solver effort,
  tray size, decoys, treasures and the patrol. `levelpack` generates three
  candidates per slot and spreads the kept 30 across the score range, so each
  stage ramps up gently.
- Pieces are always rotatable (`rotatable: true`). The core also supports
  fixed-orientation pieces (`rotatable: false`), for use as a difficulty knob
  or if the physical game works that way.

## Testing checklist (frontend)

The repo has no browser test runner. These checks were run in headless
Chromium via Playwright, outside the repo. Re-check them on the real TV.

- [x] Touch/mouse play: select from the tray, place, turn, return (long-press / Terug), swap
- [x] Blocks: preview, snap-to-fit placing, turning (with a "Past hier niet" message when there is no room), returning, hints that place blocks
- [x] Keyboard-only play: arrows reach the board, tray and every button; OK/Enter activates
- [x] Win animation: Pim rides the route, treasures are collected, the Dame moves in step; stars; Verder / Nog een keer
- [x] Undo (button, `u`, Back) and hint
- [x] Near-miss messages: mist, missing or out-of-order treasure, meeting the Dame (with the walk animation)
- [x] Storage disabled (`localStorage` throws): the game plays and shows a warning in the adult menu
- [x] Wrong WASM MIME type (`text/plain`): loads through the fallback
- [x] Back button (history sentinel): undoes, then goes back to the map, and never leaves the page
- [x] Portrait tablet and 16:9 layouts; live puzzle generation from the adult menu
- [ ] **On the actual TV browser:** remote Back button behaviour, focus ring readable at 3 m, sound
