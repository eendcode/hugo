# Het Geheim van de Duinkapel

Puzzle games for a five-year-old, played in the browser on a tablet, phone,
laptop or TV (Google TV / Chromecast browser with the remote). Pim and his
goat Barend take on the bokkenrijders of Hoofdman Hugo in seven game modes,
chosen from a picture menu after **Spelen**:

| Mode | What you do |
|---|---|
| 📖 **Het grote verhaal** | A story in books: read a scene, solve a riddle, then play the puzzle that *is* the action |
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
  that a parent can read aloud. The story mode is the exception: it is
  written in easy Dutch for a child who is starting to read (see `STORY.md`).

## Playing

Every mode has the same frame: a short picture story the first time, a map
of stages (or rooms), and play screens with **Oeps** (undo), 💡 **Hint**,
**Kaart** (back to the map) and ⚙. There are no timers and no lives. Stars
(★★★) reward a clean solve; hints cost a star. On the remote, arrow keys
move the focus, OK chooses, and Back undoes (or goes back a screen).

### Het grote verhaal (story mode)

The saga of Pim and Barend, in four books (`STORY.md`): Book 1, *De nacht van
de bokkenrijders*, Book 2, *Red Barend!*, Book 3, *Wie heeft het klokje
gestolen?*, and the final, Book 4, *De Nachtbok*. Each book opens when the
one before it is finished; a finished book gets a rosette on its cover, and
with all four read the shelf says so. A book's map has one stop per chapter over a backdrop that
remembers: in Book 1 the chapel's clock moves from six to twelve, and the
village lights, the plank cart, the boarded door, the hoof trail to the mud,
the beacons and the lit windows appear as the chapters are done. In Book 2,
Hugo's house on the heath changes: the gate opens, the corridor, cellar and
library windows light up, Barend's face leaves the tower window, and at the
end the window stands open with a rope of sheets hanging from it. Book 3 is
a mystery by day: the path runs from the chapel (its bell tower empty until
the end) through the woods to the big tree, footprints of Pim and Barend
grow along it, the owl, the three feathers and a glint in the magpie's nest
appear, and the **suspect board** (verdachtenbord) stands beside it with six
suspects whose cards turn over as the clues come in, until only the magpie
is left. Book 4 is a stormy night over the dunes that clears into a sunrise
as the chapters are done: the stops climb into the sky towards the
**Nachtbok** (a big, grumpy goat of storm clouds), and the
**Nachtbok-meter** stands beside it.

A chapter is story pages (large type, one sentence per line), a **riddle
card** with three or four picture answers, and one puzzle from another mode
with a fixed, gentle level: the bells, the cart yard, *Planken*, Barend's
program, lantern light and the candles; in Book 2 the lock (*Slot*), the road
game, the pipes, the sliding picture, Barend's program and a knight's
capture-all; in Book 3 *Wat is er anders?*, the haunted house's number
sequences and pairs, a mate in two, the road game with ordered treasures,
lantern light and the bells; in Book 4 the road game in the sky, lantern
light in the mist, the candles as ribbon knots and a lone-king chess game,
and a last chapter of three riddles only. A wrong answer gets a friendly reply;
💡 crosses out a wrong picture. Items found go into Pim's **bag** (Tas). The
book's intro comes before chapter 1, and the finale and cliffhanger after the
last chapter; 📖 on the map replays them. Done chapters can be played again.

Each book is one file, `web/levels/saga/book-N.json`, listed in
`web/levels/saga/index.json`. A chapter is a list of steps:

```json
{ "title": "De klok in de toren", "hour": 7, "scene": "asleep",
  "steps": [
    { "story": [{ "scene": "asleep", "lines": ["Het dorp slaapt al.", "…"] }] },
    { "riddle": { "lines": ["Ik hang hoog in de toren.", "…", "Wat ben ik?"],
                  "answers": [{ "picture": "klok", "word": "klok", "right": true },
                              { "picture": "vogel", "word": "vogel", "reply": "Nee, een vogel zegt tjilp!" }] } },
    { "puzzle": { "engine": "bells", "level": 1, "seed": 1101, "goal": "Speel het alarm na!" } },
    { "story": [{ "scene": "awake", "lines": ["…"] }] }
  ] }
```

Pages may also have a `letter` (lines on a scrap of paper), a `sound`, and
a `goto` (`{"mode", "label"}`): a button that leaves for another game mode
(Book 2's last page leads to the haunted house). A picture without words
says `"silent": true` (the last picture of Book 3, after „Einde.”). A chapter's `items` go into the bag (the right answer's picture, or its
`item`, flies there; `"item": null` keeps it for later in the chapter);
`uses` makes bag items glow. A book's `bag` is in the bag from the start
(Pim's magnifying glass in Book 3). A riddle with several `right` answers ("Tik ze
allemaal aan!", solved when all are found) may have five cards. A book can
list `suspects` (`[{id, picture, word}]`), and a chapter step
`{"suspects": {"lines", "turn": [ids], "wrong"?, "scene"?}}` shows the board
as a card: the child taps the suspects in `turn` to turn them over (they
flip to a soft blue back with a green tick), another card wiggles and gets
the `wrong` reply, and 💡 makes the next one glow. Which cards are already
turned comes from the steps before, so the board on the map, in scenes and
in a replayed chapter always matches the story so far
(`web/modes/saga/suspects.js`). A book can list `meter`
(`[{id, picture, word}]`, biggest first: Book 4's berg, huis, boom, paard,
schaap, hond, bokje), and a step `{"meter": {"to", "lines", "scene"?}}` shows
the **Nachtbok-meter** as a card: the Nachtbok next to something as tall
("Zo groot als een huis"; both drawn smaller as it shrinks, cross while it
is big and sad from a sheep down) and the row of sizes; the old size puffs
away, the new one pops up and the old one stays as a faint shape, and at the
end only the little goat is left ("Zo klein als een bokje!") (`web/modes/saga/meter.js`, the panel is `meterParts()`
in `art4.js`). As with the suspects, the size comes from the steps before,
so the map (where the meter stands in the stop layout's `goal` slot), the
scenes (a small meter in the corner, the Nachtbok drawn at its size) and
replays agree. A step `{"name": {"lines", "names": [{id, word, picture}]}}`
lets the child pick the bokje's name (a riddle card where every picture is
right, `pick` in `pages.js`); the pick is saved with the book (`bokje` in
`saga-4`), story text, meter lines and the finale say it where they
have `{bokje}`, and the bokje wears the name's look (Nachtje's moon,
Pikkie's bow, Sterre's star) in the last pictures and on the finished map.
Back on a step goes to the step before it, a riddle shown solved, so a
chapter of riddles never loses one (only a puzzle can't be stepped back
into). A book without items (Book 4) shows no bag. A riddle's `by` (`"nachtbok"`) puts the asker's face on the
card (the book's `BOOK.speaker`, in `art4.js`). A chapter without a puzzle (4.5)
counts as done at its end. Puzzle engines: `bells`, `candles`, `pipes`,
`slide`, `numbers` and `pairs` (`level` + `seed`, made in the browser), `carts`, `program`,
`lantern`, `road` and `chess` (the level is copied into `data`, so
regenerating a pack never changes the story), `planks` (`door`, an index
into `web/levels/saga/planks.json`) and `lock` (`code`, three numbers 1–6) and `spot` (`scene`, `grid`, `zones`).
A puzzle's `text` gives the story's words for some of a screen's messages
(`dame`, `treasure`, `firstTreasure` and `orderFirst` for the road game,
where `{n}` is a treasure's number; `bumpTree`/`bumpFence` for Barend's
program; `chessRobber`/`chessPick`/`chessCantGo` and, for a mate in two,
`goalMate1`/`mateEscape`/`mateEscapeLater`/`mateTaken` (a wrong move whose answer takes a villager), and for a game `check`/`stalemate`/`robbersWin`, for chess; screens look them up
with `textOr()` in `web/i18n.js`). A puzzle in the middle of a chapter (the pairs before the bells in 3.6) shows no stars when it is won: the chapter's stars come with its last puzzle. The chapter counts as done when
its last puzzle is won, also when the child leaves for the map during the
winning animation. `make validate` checks every book: frozen levels are
re-solved (a road level must still have exactly one solution, and with its
treasures in order the order must matter: without it there is another route; a capture's move count must match its goal line; a mate
in two must have exactly one first move and no faster mate, and a goal line
that says "in twee zetten" must say the right number), a lock's code must be
three numbers 1–6, a frozen candles board must light in 1–4 touches, a chess
puzzle against a lone king (Book 4's mate in two) must have only the black
king against White and nothing in check or hanging at the start, the meter may
only shrink and must end at its smallest, a book has at most one name step
and says `{bokje}` only after it, a chapter without a puzzle needs a riddle,
*Wat is er anders?* must have 3–6 differences inside its
picture that don't overlap, each in its own D-pad square, a chapter may only
`use` items that the book's `bag` or an earlier chapter put in the bag, a
suspect can only be turned over once and a mystery ends with one suspect
left, a page without words must say it is `silent`, and a `goto` must name
a known mode.

**Slot** (`web/modes/saga/lock.js`) is the lock on Hugo's gate: three
wheels, 1–6, with a picture of what to count above each one (goats on the
gate, windows in the tower, stars above the roof) and the house next to it.
Tap a wheel to turn it (on the D-pad: left/right picks a wheel, OK or up
turns it on, down turns it back), then **Open**. A wrong code wiggles the
lock; 💡 sets one wheel and counts its things in the picture with number
badges, 1, 2, 3… (with the code already right it only points at Open, and
costs no star). The lock itself has no picture: the `gate` skin brings
Hugo's house and the wheel icons, so another book can count other things.
Arrow keys reach a puzzle through RoomScreen's optional `arrow(dir, id)`
(an `arrow` handler in `web/input.js`).

**Wat is er anders?** (`web/modes/saga/spot.js`, chapter 3.1) shows the
chapel yesterday and today, side by side (in portrait one above the other).
Tap a difference in either picture and it is circled in both; a tap on
something that is the same wiggles the picture and says "Kijk nog eens",
and costs nothing (only hints cost a star). 💡 pulses one difference still to
find, the story's clues first: the klokje is gone from the tower, a
black-and-white feather lies on the step, and the sand has no footprints
(two easy extras: the flower changed colour, a butterfly came). On the D-pad
the today picture is a grid of squares (4×3), every one a focus stop, so the
arrows move a dashed cursor over the picture without giving anything away,
and OK looks in that square. The zones (`id`, centre, radius, `story`) are in
the book file; the pictures come from the `spot` skin (`spotChapel()` in
`art3.js`, which also says where it draws each difference, so a zone that
misses its difference is reported in the console).

A puzzle's `skin` dresses its screen as the scene without changing the
puzzle: Book 1 has `tower` (the bells in the bell tower), `barn` (the plank
cart in boer Teun's barn), `mud` (Barend walks to the mud), `dunes` (beacons
instead of moonstones) and `chapel` (the candles are the chapel's windows).
Book 2 has `gate` (the heath behind the lock), `corridor` (floor boards, a
red carpet runner for the road, a door as the finish, Pim sneaking alone,
and a sleepwalking robber in a nightcap on the patrol loop), `cellar` (a
stone vault; when the water flows, a raft brings the key to Pim),
`library` (the torn drawing of Hugo's house as the sliding picture, under
Oma Hilde's painting), `towerRoom` (a wooden floor, chests, and the door's
bolt as Barend's goal) and `garden` (the chess board as a ditch: water and
grass squares, stepping stones as the robbers, Pim on Barend as the knight,
and hoof prints on the stones he has used). Book 3 has `spot` (the two
pictures on a wooden desk), `owl` (the owl's sums in the woods, on wooden
signs), `kitchen` (the koster's wooden chess set: Hugo's light pieces
against the koster's dark ones), `woods` (a forest trail over moss, bushes,
toadstools and tree stumps, black-and-white feathers numbered 1–3 as the
treasures, the big tree as the finish, and no Witte Dame floating by in
daylight), `nest` (the magpie's shiny things as the moonstones, dull until
the light reaches them, the klokje last along the beam; twigs as the walls,
and Opa Bram's black stone as one of them, never lit), `buttons` (Hugo's
coat buttons as the pairs, on a red cloth) and `towerDay` (the bells in the
tower by day). Book 4 has `sky` (the road game in the storm: cloud paths
over the night sky, storm clouds, wind, stars and the moon as the things in
the way, Pim flying on Barend, the Nachtbok's storm cloud as the finish, and
a flash of lightning walking the patrol loop, with a ⚡ Kijk button),
`mist` (the Witte Dame's lantern as the source, thick mist as the walls,
the weak spots in the mist as the moonstones, bursting into light when the
beam reaches them), `ribbons` (the candles as goats tied with glowing purple
ribbon knots; faint ribbons run from each knot to the ones beside it, which
is why its neighbours flip too) and `skyChess` (a board of clouds: Pim on
Barend is the king, the rooks are a village tower and Hugo in his hat, the
Nachtbok is the lone dark king; 4.4 is a mate in two with one key move, and
a wrong move is shown and undone, also when the Nachtbok takes a rook,
`mateTaken`). Skins and backdrops get the Griezelstand (`skinOpts(name,
{scare})`), so in Zacht the Nachtbok's eyes never glow. A skin, in `SKINS`
in `web/modes/saga/engines.js`, names its backdrop (one of a book's
`BOOK.backdrops`) and the art that the screen swaps in, kept per book in
`skins1.js` … `skins4.js`. Board screens take it as `opts.art` (as listed in
each screen's header: the road game's `ground`, `road`, `scenery`, `finish`,
`pim`, `patrol`, `lookIcon`, `treasure`, `companion`; the program's `grass`,
`tree`, `apple`, `stable`; chess's `piece(letter, k)` (k: the piece's place
among the same pieces at the start, so two rooks can look different),
`tree`, `square`, `taken`; the cart yard's `cart`, `ground`; the lantern's
`stone(lit, k, n)`, where k is the stone's place along the intended beam,
`wall(k)`, `ground(empty)` and `lantern(facing)`), and haunted-house
puzzles as `ctx.art` (the candles' `cellArt(lit)` and `boardArt(size)`, the
pipes' `box(n)` and `boardArt(n, source)`, the slide's `picture()`, the
pairs' `pictures()`, the lock's `picture`, `viewBox` and `wheelIcon`, the
spot's `picture`, `viewBox` and `spots`); a frozen candles board comes as
`data: {size, lit}`. The road game and chess also take `opts.goal` and
`opts.backdrop` like the other board screens. Kaart works during a winning
animation on every screen, and the win still counts.

**The code** (`web/modes/saga/`): `index.js` runs the shelf, the book maps
and the chapters; each book's art module (`art.js` … `art4.js`) exports one
`BOOK` (`scene`, `map`, `cover`, `layouts`, `backdrops`, and Book 4's `goal`
and `speaker`); the small drawing helpers they share (sky, dunes, clouds,
bubbles, hearts, houses, …) are in `kit.js`. `pages.js` has the story pages,
the bag and `cardScreen()`, the frame that the riddle card, the suspect board
(`suspects.js`) and the meter (`meter.js`) all use. The story mode's styles
are in `saga.css` (shared, then one section per book), loaded after
`style.css`.

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
existed are moved into the road game's progress on load. The story mode
keeps each book as its own entry (`saga-1` … `saga-4`), one stage per
chapter.

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
make validate     # re-check every committed level and puzzle in every pack, and the story books
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
  modes/saga/         story mode: books and map (index.js), story pages, bag and
                      the card screen (pages.js), engines and skins (engines.js),
                      one BOOK of art per book (art.js … art4.js), the shared
                      drawing kit (kit.js), puzzle skins (skins1.js … skins4.js),
                      picture icons (pictures.js), Planken, Slot, Wat is er
                      anders? (spot.js), the suspect board (suspects.js), the
                      Nachtbok-meter (meter.js) and its styles (saga.css)
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
  levels/saga/        the story books (index.json, book-N.json)
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
- [x] Story mode: Book 1 played through by touch and by keyboard, wrong and right riddle answers, hints, Back from every screen, replaying a chapter, the finale once and via 📖, unlock-all, reset, storage disabled; landscape, 16:9 TV and portrait
- [x] Story mode, Book 2: played from a save with Book 1 done to the finale by touch, the lock, corridor and chess chapters by keyboard; wrong riddle answers, a wrong lock code and the lock's counting hint; 1280×720, 1920×1080, 720×1280 and 390×844
- [x] Story mode, Book 4: played from a save with Books 1–3 done to „Einde van de saga.” by touch (1280×720, 1024×768 in Eng, 720×1280, 390×844), chapters 4.1, 4.4 and 4.5 by keyboard (1920×1080, also in Zacht); wrong riddle answers, the meter steps, naming the bokje, the shelf with all four books done
- [x] Story mode, Book 3: played from a save with Books 1–2 done to the picture after „Einde.” by touch, the spot-the-difference, suspect-board and chess chapters by keyboard; wrong riddle answers (also on the five-card "tap them all" riddle), wrong taps on the pictures and on the board, hints; 1280×720, 1920×1080, 1024×768, 720×1280 and 390×844
- [x] Story mode, after the clean-up (shared card screen, art kit, `saga.css`): all four books from a fresh save to „Einde van de saga.” by touch at 1280×720, every puzzle won; one chapter per book by keyboard only at 390×844 and 1920×1080 (Zacht), including the lock, *Wat is er anders?*, the suspect board, the 4.4 chess and the 4.5 riddles; Kaart during a winning animation (road game, chess) still counts the win; every other mode's puzzles won in their own modes
- [ ] **On the actual TV browser:** remote Back button behaviour, focus ring readable at 3 m, sound, engine reply time
