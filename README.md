# Het Geheim van de Duinkapel

Puzzle games for a five-year-old, played in the browser on a tablet, phone,
laptop or TV (Google TV / Chromecast browser with the remote). Pim and his
goat Barend take on the bokkenrijders of Hoofdman Hugo in six game modes,
chosen from a picture menu after **Spelen**:

| Mode | What you do |
|---|---|
| ⛪ **De Duinkapel** | Build roads across the night dunes to bring the stolen treasures back to the chapel |
| ♞ **Verdedig het dorp** | Chess: a piece refresher, safe captures, mate in one and two, and games against the robbers |
| 🕯 **Het spookhuis van Hugo** | Nine rooms of picture and number puzzles; light every candle to break the curse |
| 🐐 **Barends programma** | Lay arrow cards, press Start, and Barend walks the program |
| 🔦 **Lantaarnlicht** | Place mirrors so the lantern's beam lights every moonstone |
| 🛒 **Maak de weg vrij** | Slide the robbers' carts aside so Barend's cart can leave the yard |

- Puzzle logic in **Rust → WebAssembly** (`core/`), rendering and input in plain
  JavaScript ES modules (`web/`). No framework, bundler, backend or network calls
  after load.
- Every puzzle has a solver behind it: levels are checked to have one
  solution where that matters, hints are exact, and stars compare against
  the best possible.
- All art is drawn procedurally in SVG, and all sounds are synthesised with Web
  Audio. There are no image or audio assets. The characters and story are
  original; the folklore they draw on (bokkenrijders, witte wieven) is public
  domain.
- Nothing in the puzzles needs reading. Each screen has one short goal line
  that a parent can read aloud.

## Playing

Every mode has the same frame: a short picture story the first time, a map
of stages (or rooms), and play screens with **Oeps** (undo), 💡 **Hint**,
**Kaart** (back to the map) and ⚙. There are no timers and no lives. Stars
(★★★) reward a clean solve; hints cost a star. On the remote, arrow keys
move the focus, OK chooses, and Back undoes (or goes back a screen).

### De Duinkapel (roads)

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

### Verdedig het dorp (chess)

White are the villagers, black the bokkenrijders (their knight is a goat,
their king is Hugo). Tap a piece to see where it can go, then tap a square.
Village rules: no castling, no en passant, pawns become queens.

1. **De stukken** – one piece captures every robber; stars for the fewest moves.
2. **Veilig slaan** – take the one robber that can't be taken back. A wrong
   choice shows the robber taking back, then undoes it.
3. **Schaakmat!** and 4. **Het grote bord** – mate in one on small boards, then 8×8.
   A wrong move shows how Hugo escapes.
5. **Pionnenrace** – pawns only; the first to reach the other side wins.
6. **Vang de hoofdman** – mate a lone king with queen or rooks.
7. **Mat in twee** – the robbers defend as well as they can.
8. **De grote slag** – small-board games with the robbers a few pieces short.

In the games (5, 6, 8) the robbers answer each move. **Oeps** takes back
your move and theirs, also after a loss. The adult menu sets how well they
play (Heel makkelijk / Makkelijk / Gemiddeld / Sterk).

### Het spookhuis van Hugo

Hugo's spell went wrong: the candles are out and he is stuck in a painting.
The house map shows nine rooms. Solving 5 of a room's puzzles (6 in the
counting room) lights its candle, and each candle opens another room. When
all nine burn, the curse breaks.

| Room | Puzzle |
|---|---|
| De hal | Candles: touching one flips it and its neighbours; light them all |
| De schilderijenzaal | Find the pairs |
| De kelder | Turn the pipes until water reaches every pipe |
| De galerij | What comes next? Colours, shapes, counts, turning arrows |
| De rekenkamer | Number sequences: counting on and back, steps of 2, 5 and 10, doubling, growing steps, missing numbers, Fibonacci and squares |
| De bibliotheek | Slide the portrait back together |
| Het spiegelraam | Make the right half of the window mirror the left |
| De zolder | Which shadow belongs to the toy? |
| De klokkentoren | Listen to the bells and play the tune back |

### Barends programma

Tap arrow cards to lay them in the slots, tap a laid card to make it 2 or 3
steps, and press **Start**. Barend eats every apple he passes and is home
when he reaches his stable with all the apples. Later stages use
**forward / turn left / turn right** cards instead of arrows. Remove a card
with long-press, `Backspace`/`Delete`, or **Terug** (the last card). A hint
adds the next card of a shortest program, or takes a wrong one away.

### Lantaarnlicht

Tap an empty square to put a mirror there, again to turn it, and once more
to take it back. The beam is redrawn after every change; moonstones light
up when it touches them. Bolted mirrors can't be moved.

### Maak de weg vrij

Tap a cart, then one of the dots to slide it there (carts only move along
their length). Get Barend's red cart out through the gate on the right.
The goal line says how few moves it can be done in.

### Progress

**Road game:** finishing 10 levels of a stage opens the next one. Clearing
stages 3, 5 and 8 returns the kandelaar, the beker and the klokje. The
finale plays after the last one. Stars: ★★★ without hints, ★★ with up to
two hints, ★ otherwise. Progress is saved in `localStorage`. The game still
works without it; the adult menu then says that nothing is saved.

**Other modes:** each stage opens after finishing some of the previous
one's levels (the stage file says how many), and the last stage ends with a
short finale. Progress is kept per mode; saves from before the modes
existed are moved into the road game's progress on load.

**Voor ouders (⚙):** Griezelstand (Zacht / Spannend / Eng), sound, language
(Nederlands / English), unlocking all stages and rooms, and resetting
progress. In the road game also: live puzzles (Makkelijker / Nieuwe puzzel /
Moeilijker, difficulty 0–9), the current puzzle's code (seed) and replaying a
code. In the chess village: how well the robbers play.

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
make validate     # re-check every committed level and puzzle in every pack
make levels       # regenerate all packs in web/levels (then commit them)
make levels-dorp  # just one pack: levels-roads, -dorp, -programma, -lantaarn, -wegvrij
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
core/                 Rust crate: models, rules, solvers, generators (native + WASM)
  src/model.rs        road game: Side, Tile, Cell, Level, State (serde JSON shapes)
  src/rules.rs        road game: route finding and win check (mist, treasure order, Dame)
  src/solver.rs       road game: backtracking solver, solution counting, hints
  src/generator.rs    road game: seeded generation, repair to a unique solution, scoring
  src/chess/          chess: board and moves, engine and mate solver, puzzle generators
  src/mansion.rs      haunted house: candles (lights out) and the sliding portrait
  src/program.rs      Barend's program: running cards, shortest program, hints
  src/lantern.rs      lantern light: beam tracing, mirror solver, generator
  src/carts.rs        cart yard: sliding moves, BFS solver, generator
  src/rng.rs          SplitMix64 (no getrandom)
  src/ascii.rs        text format for hand-made road test levels
  src/lib.rs          thin wasm-bindgen API
  tests/              property tests, generation and engine performance tests
tools/levelpack/      generate, validate, calibrate and benchmark level packs
web/                  the static site
  main.js             boot, WASM loading with fallback, title and mode menu
  shell.js            shared: story pages, stage map, win overlay, adult menu
  modes/duinkapel.js  the road game's map, stages and live puzzles
  board.js, game.js   the road game's play screen and level state
  modes/packmode.js   a mode built on level packs (stages, map, next/replay, finale)
  modes/gridplay.js   base play screen for the program, lantern and cart modes
  modes/dorp/         chess village: play screen, piece art, mode
  modes/spookhuis/    haunted house: house map, room frame, the nine puzzles
  modes/programma/    Barend's program
  modes/lantaarn/     lantern light
  modes/wegvrij/      cart yard
  input.js            unified touch/mouse + keyboard/D-pad focus model, Back button
  art.js              shared procedural SVG art and story scenes
  audio.js            Web Audio sounds, bell notes and Griezelstand ambience
  i18n.js             Dutch strings (+ English)
  rng.js              seeded PRNG for puzzles made in the browser
  storage.js          progress per mode in localStorage (every access in try/catch)
  levels/             committed packs: road stages, and dorp/ programma/ lantaarn/ wegvrij/
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

### How the other modes work

- **Chess** (`core/src/chess/`): boards from 4×4 to 8×8 with trees as
  blockers. Legal moves come from pseudo-legal moves filtered for leaving the
  own king in check (boards without a king skip that). The engine is negamax
  alpha-beta with a capture search, material plus simple piece-square terms, a
  pawn-race term, and a mop-up term that drives a lone king to the edge. It is
  capped at 150,000 nodes per move. Strength levels change depth, the margin
  within which moves count as equally good, and the chance of a careless (but
  not losing) move. The engine never misses a mate. Puzzles: capture-all uses a
  BFS over boards for the fewest moves; safe capture needs exactly one capture
  that no robber can take back; mate in N needs exactly one first move, and
  mate in 2 must have no mate in 1. In a mate-in-2 puzzle the robbers reply
  with the defence that holds out longest. `levelpack dorp` keeps the middle of
  three candidates by score and orders each stage easy to hard.
- **Haunted house**: candles is lights out, solved exactly by Gauss–Jordan
  elimination over GF(2), trying every free variable for the fewest touches.
  Puzzles are made by random touches from all lit, and kept only if that count
  is already the minimum. The sliding portrait uses a table of distances from
  solved for every position of the board (181,440 for 3×3), built once. That
  table gives exact move targets and hints. The other rooms are generated in
  the browser from a seed per room and level (`web/rng.js`), so a level is the
  same every time. Pipes are a random spanning tree turned out of place;
  shadows get distractors with a part missing, moved, swapped or mirrored. Every
  room's levels are checked to be solvable.
- **Barend's program**: a BFS over (cell, facing, apples eaten), where one
  step is one card, gives the fewest cards. The slots are that plus a
  stage-dependent spare. A hint finds the longest prefix of the laid cards
  that can still finish within the slots, then adds the next card of a
  shortest program or removes the card after that prefix.
- **Lantern light**: the solver follows the beam and, on each empty square
  it crosses, tries passing straight or either mirror within the tray's
  count. The generator walks a beam with turns and puts stones on straight
  stretches, the last one at the far end. It then repairs the field until one
  set of mirrors works: it walls off squares only another solution uses, or
  bolts down one of the real mirrors (never below the stage's minimum).
- **Cart yard**: a random yard is explored completely, and a multi-source
  BFS from every solved position gives each position's distance. A position
  in the stage's band becomes the level, so the move count shown is exact.
  Hints are a BFS from the current position.

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
- [x] Mode menu (landscape and portrait); old saves move into the road game's progress
- [x] Chess: capture-all won by hints; a wrong mate shows the escape and undoes; a pawn race won against the engine; keyboard-only moves; Back undoes
- [x] Haunted house: every level of every room machine-solved (hints or the core's solution), candle lit after 5 wins, next room opens; pairs, bells (with a mistake), portrait layout
- [x] Barend's program: arrow and turning stages won via hints; bump and "not home" messages; count cycling, Backspace removal and undo with the keyboard
- [x] Lantern light and cart yard: won via hints, with exact par for the cart yard
- [ ] **On the actual TV browser:** remote Back button behaviour, focus ring readable at 3 m, sound, engine reply time
