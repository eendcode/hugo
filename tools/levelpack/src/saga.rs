//! The story mode's books in `web/levels/saga/`: `index.json` lists the
//! books, and each written one has a `book-N.json` with its chapters. This
//! checks the shape of every page, riddle, puzzle, suspects, meter and name
//! step, and re-verifies the puzzle levels frozen into the book (they are
//! copies, so regenerating a pack never changes the story).

use duinkapel_core::chess::puzzles::{self, Puzzle, PuzzleKind};
use duinkapel_core::chess::search::forces_mate;
use duinkapel_core::chess::{Board, Color, Sq};
use duinkapel_core::model::Level;
use duinkapel_core::{carts, lantern, mansion, program, solver};
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::collections::HashSet;
use std::path::Path;

/// Game modes a story page's `goto` button may lead to (see web/main.js).
const MODES: [&str; 6] = ["duinkapel", "dorp", "spookhuis", "programma", "lantaarn", "wegvrij"];

/// Engines a chapter's puzzle can use (see web/modes/saga/engines.js).
const ENGINES: [&str; 14] = ["bells", "candles", "pipes", "slide", "numbers", "pairs", "planks", "lock", "spot", "carts", "program", "lantern", "road", "chess"];

/// The pictures "Wat is er anders?" can show, with their box (see SPOTS in web/modes/saga/art3.js).
const SPOT_SCENES: [(&str, f64, f64); 1] = [("chapel", 800.0, 600.0)];

/// Who can ask a riddle (a riddle's `by`; see BOOK.speaker in web/modes/saga/art4.js).
const SPEAKERS: [&str; 1] = ["nachtbok"];

/// The one word story text may fill in: the bokje's name, once a `name` step has asked for it.
const NAME: &str = "{bokje}";

/// Story text may only say {bokje}, and only once the book has asked for the name (`named`).
fn placeholders(v: &Value, named: bool) -> Result<(), String> {
    for line in v.as_array().map_or(&[][..], Vec::as_slice).iter().filter_map(Value::as_str) {
        let rest = line.replace(NAME, "");
        if rest.contains('{') || rest.contains('}') {
            return Err(format!("{line:?}: the only word to fill in is {NAME}"));
        }
        if !named && line.contains(NAME) {
            return Err(format!("{line:?} says {NAME} before a name step has asked for it"));
        }
    }
    Ok(())
}

fn strings(v: &Value, what: &str) -> Result<usize, String> {
    let list = v.as_array().ok_or(format!("{what} is not a list"))?;
    if list.iter().any(|s| s.as_str().map_or(true, |s| s.trim().is_empty())) {
        return Err(format!("{what} has an empty or non-text entry"));
    }
    Ok(list.len())
}

/// Story pages: each has a scene and lines and/or a letter, or says it is
/// `silent` (a picture without words, like the one after Book 3's „Einde.”).
/// `named`: the bokje has its name by now (the lines may say {bokje}).
fn pages(v: &Value, named: bool) -> Result<(), String> {
    let list = v.as_array().filter(|l| !l.is_empty()).ok_or("no pages")?;
    for (i, p) in list.iter().enumerate() {
        p["scene"].as_str().ok_or(format!("page {}: no scene", i + 1))?;
        let lines = if p["lines"].is_null() { 0 } else { strings(&p["lines"], "lines")? };
        placeholders(&p["lines"], named).map_err(|e| format!("page {}: {e}", i + 1))?;
        let letter = if p["letter"].is_null() { 0 } else { strings(&p["letter"], "letter")? };
        let silent = p["silent"].as_bool() == Some(true);
        match (lines + letter, silent) {
            (0, false) => return Err(format!("page {}: no text (a picture without words needs \"silent\": true)", i + 1)),
            (n, true) if n > 0 => return Err(format!("page {}: silent, but it has text", i + 1)),
            _ => {}
        }
        let goto = &p["goto"];
        if !goto.is_null() {
            let mode = goto["mode"].as_str().unwrap_or("");
            if !MODES.contains(&mode) || goto["label"].as_str().map_or(true, |l| l.trim().is_empty()) {
                return Err(format!("page {}: goto needs a known mode ({}) and a label", i + 1, MODES.join(", ")));
            }
        }
    }
    Ok(())
}

fn riddle(r: &Value) -> Result<(), String> {
    if strings(&r["lines"], "riddle lines")? == 0 {
        return Err("riddle without lines".into());
    }
    placeholders(&r["lines"], false)?;
    if !r["by"].is_null() && !r["by"].as_str().is_some_and(|b| SPEAKERS.contains(&b)) {
        return Err(format!("riddle by {}: not someone who asks riddles ({})", r["by"], SPEAKERS.join(", ")));
    }
    let answers = r["answers"].as_array().map_or(&[][..], Vec::as_slice);
    if answers.is_empty() {
        return Ok(()); // a riddle card with just Verder
    }
    if answers.iter().any(|a| a["picture"].as_str().is_none()) {
        return Err("an answer without a picture".into());
    }
    let right = answers.iter().filter(|a| a["right"].as_bool() == Some(true)).count();
    if right == 0 {
        return Err("no right answer".into());
    }
    // A riddle with several right answers ("tap them all") may have one card more.
    let most = if right > 1 { 5 } else { 4 };
    if !(2..=most).contains(&answers.len()) {
        return Err(format!("{} answers (2–{most} fit on the card)", answers.len()));
    }
    if right == answers.len() {
        return Err("every answer is right".into());
    }
    Ok(())
}

/// The lock's code: three wheels, each 1–6.
fn lock_code(code: &Value) -> Result<(), String> {
    let digits = code.as_array().ok_or("lock: no code")?;
    if digits.len() != 3 || digits.iter().any(|d| !(1..=6).contains(&d.as_u64().unwrap_or(0))) {
        return Err(format!("lock: code {code} must be three numbers 1–6"));
    }
    Ok(())
}

/// A frozen road level must still have exactly one solution, and if its treasures are in order, the order must matter.
fn road_unique(level: &Level) -> Result<(), String> {
    level.validate().map_err(|e| e.to_string())?;
    match solver::solve(level, 2) {
        (_, stats) if stats.exhausted => return Err("road: solver budget exhausted".into()),
        (sols, _) if sols.len() != 1 => return Err(format!("road: {} solutions", sols.len())),
        _ => {}
    }
    // Treasures in order must matter: without the order rule there is another route
    // (one that picks a treasure up too early), so "Pak eerst …" can happen.
    if level.ordered {
        let mut free = level.clone();
        free.ordered = false;
        if solver::solve(&free, 2).0.len() < 2 {
            return Err("road: the order of the treasures changes nothing".into());
        }
    }
    Ok(())
}

/// The first number in a goal line, as digits or as a Dutch word ("in twee zetten").
fn said_number(goal: &str) -> Option<u32> {
    // Not "een": that is also just "a".
    const WORDS: [(&str, u32); 5] = [("één", 1), ("twee", 2), ("drie", 3), ("vier", 4), ("vijf", 5)];
    goal.split(|c: char| !c.is_alphanumeric()).filter(|w| !w.is_empty()).find_map(|w| {
        w.parse::<u32>().ok().or_else(|| WORDS.iter().find(|(word, _)| w.eq_ignore_ascii_case(word)).map(|&(_, n)| n))
    })
}

/// A lone king (Book 4's "Zet de Nachtbok vast", a mate in two): Black has
/// only the king, nobody is in check, the king can't take anything on its
/// first move, and White mates in at most `moves` moves whatever the king
/// does (and not sooner, so the number is honest); `moves` 0 claims nothing.
fn lone_king(puzzle: &Puzzle) -> Result<(), String> {
    let b = Board::from_position(&puzzle.position)?;
    let black: Vec<_> = (0..b.cells()).filter(|&i| matches!(b.sq[i], Sq::Piece(Color::Black, _))).collect();
    if black.len() != 1 || b.king(Color::Black).is_none() {
        return Err("chess: a lone king game needs the black king and nothing else black".into());
    }
    if b.turn != Color::White || b.in_check(Color::Black) || b.in_check(Color::White) {
        return Err("chess: White moves first, and nobody is in check".into());
    }
    let mut king = b;
    king.turn = Color::Black;
    if king.legal_moves().is_empty() || king.legal_moves().iter().any(|&m| b.is_capture(m)) {
        return Err("chess: the lone king must have moves, and nothing it can take".into());
    }
    let n = puzzle.moves;
    if n > 0 && (!forces_mate(&b, n) || forces_mate(&b, n - 1)) {
        return Err(format!("chess: not a mate in exactly {n}"));
    }
    Ok(())
}

/// A frozen chess puzzle must still be what it claims (a mate in two has
/// exactly one first move that mates in two, and none that mates sooner;
/// a game against a lone king, see `lone_king`); a goal line that names a
/// number of moves must name the right one.
fn chess(p: &Value) -> Result<(), String> {
    let puzzle: Puzzle = serde_json::from_value(p["data"].clone()).map_err(|e| format!("data: {e}"))?;
    puzzles::verify(&puzzle)?;
    let lone = Board::from_position(&puzzle.position)?.pieces(Color::Black).count() == 1;
    // Against a lone king (Book 4's Nachtbok), also: nothing hangs at the start, and the mate is as long as it says.
    if matches!(puzzle.kind, PuzzleKind::Endgame | PuzzleKind::Mate) && lone {
        lone_king(&puzzle)?;
    }
    let goal = p["goal"].as_str().unwrap_or("");
    let said = match puzzle.kind {
        // Capture goals count with digits ("in 4 sprongen"); a mate's in words too ("in twee zetten").
        PuzzleKind::Capture => goal.split(|c: char| !c.is_ascii_digit()).find(|w| !w.is_empty()).and_then(|w| w.parse().ok()),
        PuzzleKind::Mate => said_number(goal),
        _ => None,
    };
    match said {
        Some(n) if n != puzzle.moves => Err(format!("chess: the goal says {n} moves, the puzzle needs {}", puzzle.moves)),
        _ => Ok(()),
    }
}

/// "Wat is er anders?": a known picture, a grid for the D-pad and 3–6
/// differences inside the picture that don't overlap, each in its own grid
/// square (so OK on a square finds at most one), at least one of them a
/// story clue.
fn spot(p: &Value) -> Result<(), String> {
    let scene = p["scene"].as_str().unwrap_or("");
    let &(_, w, h) = SPOT_SCENES.iter().find(|s| s.0 == scene).ok_or(format!("spot: unknown picture {scene:?}"))?;
    let grid: Vec<u64> = p["grid"].as_array().map_or(vec![], |g| g.iter().filter_map(Value::as_u64).collect());
    let [cols, rows] = grid[..] else { return Err("spot: grid must be [columns, rows]".into()) };
    if !(2..=6).contains(&cols) || !(2..=6).contains(&rows) {
        return Err(format!("spot: grid {cols}×{rows} (2–6 each)"));
    }
    let zones = p["zones"].as_array().ok_or("spot: no zones")?;
    if !(3..=6).contains(&zones.len()) {
        return Err(format!("spot: {} differences (3–6)", zones.len()));
    }
    let mut seen: Vec<(&str, f64, f64, f64)> = Vec::new();
    let mut squares = HashSet::new();
    for z in zones {
        let id = z["id"].as_str().filter(|s| !s.is_empty()).ok_or("spot: a zone without id")?;
        let num = |k: &str| z[k].as_f64().ok_or(format!("spot: {id} has no {k}"));
        let (x, y, r) = (num("x")?, num("y")?, num("r")?);
        if !(0.0..w).contains(&x) || !(0.0..h).contains(&y) {
            return Err(format!("spot: {id} at {x},{y} is outside the {w}×{h} picture"));
        }
        if !(30.0..=160.0).contains(&r) {
            return Err(format!("spot: {id} has radius {r} (30–160)"));
        }
        if let Some((other, ..)) = seen.iter().find(|&&(o, ox, oy, or)| o == id || (x - ox).hypot(y - oy) < r + or) {
            return Err(format!("spot: {id} overlaps {other} (or has the same id)"));
        }
        let square = (y / (h / rows as f64)) as u64 * cols + (x / (w / cols as f64)) as u64;
        if !squares.insert(square) {
            return Err(format!("spot: {id} shares grid square {} with another difference", square + 1));
        }
        seen.push((id, x, y, r));
    }
    if !zones.iter().any(|z| z["story"].as_bool() == Some(true)) {
        return Err("spot: no difference is a story clue".into());
    }
    Ok(())
}

/// A frozen candles board ({size, lit}): it can be lit, gently (1–4
/// touches), and it isn't lit already.
fn candles(data: &Value) -> Result<(), String> {
    let size = data["size"].as_u64().filter(|s| (3..=5).contains(s)).ok_or("candles: size must be 3–5")? as usize;
    let lit: Vec<bool> = serde_json::from_value(data["lit"].clone()).map_err(|e| format!("candles: lit: {e}"))?;
    if lit.len() != size * size {
        return Err(format!("candles: {} candles on a {size}×{size} board", lit.len()));
    }
    match mansion::solve_candles(size, &lit) {
        None => Err("candles: this board can't be lit".into()),
        Some(touches) if !(1..=4).contains(&touches.len()) => Err(format!("candles: {} touches (1–4 is gentle)", touches.len())),
        Some(_) => Ok(()),
    }
}

fn frozen<T: DeserializeOwned>(p: &Value, verify: fn(&T) -> Result<(), String>) -> Result<(), String> {
    let level: T = serde_json::from_value(p["data"].clone()).map_err(|e| format!("data: {e}"))?;
    verify(&level)
}

/// A puzzle step; `doors` is how many doors planks.json has.
fn puzzle(p: &Value, doors: usize) -> Result<(), String> {
    let engine = p["engine"].as_str().ok_or("puzzle without engine")?;
    let number = |k: &str| p[k].as_u64().map(|_| ()).ok_or(format!("{engine}: no {k}"));
    if !p["skin"].is_null() && p["skin"].as_str().is_none() {
        return Err("skin is not a name".into());
    }
    if !p["text"].is_null() && !p["text"].as_object().is_some_and(|t| t.values().all(|v| v.as_str().is_some_and(|s| !s.trim().is_empty()))) {
        return Err("text must map message names to words".into());
    }
    match engine {
        // Candles may bring a frozen board instead of a level and seed (Book 4's ribbons).
        "candles" if !p["data"].is_null() => candles(&p["data"]),
        "bells" | "candles" | "pipes" | "slide" | "numbers" | "pairs" => number("level").and(number("seed")),
        "lock" => lock_code(&p["code"]),
        "spot" => spot(p),
        "road" => frozen::<Level>(p, road_unique),
        "chess" => chess(p),
        "planks" => match p["door"].as_u64() {
            Some(d) if (d as usize) < doors => Ok(()),
            Some(d) => Err(format!("planks: door {d}, but planks.json has {doors}")),
            None => Err("planks: no door".into()),
        },
        "carts" => frozen::<carts::Yard>(p, carts::verify),
        "program" => frozen::<program::Field>(p, program::verify),
        "lantern" => frozen::<lantern::Field>(p, lantern::verify),
        _ => Err(format!("unknown engine {engine} (known: {})", ENGINES.join(", "))),
    }
}

/// The book's suspects: [{id, picture, word}], ids unique.
fn suspect_list(v: &Value) -> Result<Vec<String>, String> {
    if v.is_null() {
        return Ok(vec![]);
    }
    let list = v.as_array().ok_or("suspects is not a list")?;
    let mut ids = Vec::new();
    for s in list {
        let id = s["id"].as_str().filter(|s| !s.is_empty()).ok_or("a suspect without id")?;
        if s["picture"].as_str().is_none() || s["word"].as_str().map_or(true, |w| w.trim().is_empty()) {
            return Err(format!("suspect {id}: needs a picture and a word"));
        }
        if ids.iter().any(|i| i == id) {
            return Err(format!("suspect {id} twice"));
        }
        ids.push(id.to_string());
    }
    Ok(ids)
}

/// A suspects step: lines, and suspects to turn over that are on the board and still face up.
fn suspects_step(v: &Value, board: &mut Suspects) -> Result<(), String> {
    if strings(&v["lines"], "lines")? == 0 {
        return Err("suspects step without lines".into());
    }
    if !v["scene"].is_null() && v["scene"].as_str().is_none() {
        return Err("suspects: scene is not a name".into());
    }
    if !v["wrong"].is_null() && v["wrong"].as_str().map_or(true, |w| w.trim().is_empty()) {
        return Err("suspects: wrong must be words".into());
    }
    let turn = v["turn"].as_array().filter(|t| !t.is_empty()).ok_or("suspects: nothing to turn over")?;
    for id in turn {
        let id = id.as_str().ok_or("suspects: turn lists ids")?;
        if !board.ids.iter().any(|i| i == id) {
            return Err(format!("suspects: {id} is not on the board"));
        }
        if !board.turned.insert(id.to_string()) {
            return Err(format!("suspects: {id} is already turned over"));
        }
    }
    Ok(())
}

/// The suspect board as the book goes on.
struct Suspects {
    ids: Vec<String>,
    turned: HashSet<String>,
}

/// Book 4's Nachtbok-meter: its sizes, biggest first, and where it stands now.
struct Meter {
    ids: Vec<String>,
    at: usize,
}

/// The book's sizes for the meter: [{id, picture, word}], ids unique.
fn meter_list(v: &Value) -> Result<Vec<String>, String> {
    if v.is_null() {
        return Ok(vec![]);
    }
    let list = v.as_array().filter(|l| l.len() >= 2).ok_or("meter: a list of at least two sizes")?;
    let mut ids: Vec<String> = Vec::new();
    for m in list {
        let id = m["id"].as_str().filter(|s| !s.is_empty()).ok_or("meter: a size without id")?;
        if m["picture"].as_str().is_none() || m["word"].as_str().map_or(true, |w| w.trim().is_empty()) {
            return Err(format!("meter {id}: needs a picture and a word"));
        }
        if ids.iter().any(|i| i == id) {
            return Err(format!("meter {id} twice"));
        }
        ids.push(id.to_string());
    }
    Ok(ids)
}

/// A meter step: the Nachtbok shrinks to a smaller size on the book's list.
fn meter_step(v: &Value, meter: &mut Meter, named: bool) -> Result<(), String> {
    if meter.ids.is_empty() {
        return Err("a meter step, but the book has no meter".into());
    }
    if strings(&v["lines"], "lines")? == 0 {
        return Err("meter step without lines".into());
    }
    placeholders(&v["lines"], named)?;
    if !v["scene"].is_null() && v["scene"].as_str().is_none() {
        return Err("meter: scene is not a name".into());
    }
    let to = v["to"].as_str().ok_or("meter: no size to shrink to")?;
    let k = meter.ids.iter().position(|i| i == to).ok_or(format!("meter: {to} is not on the book's list"))?;
    if k <= meter.at {
        return Err(format!("meter: {to} is not smaller than {}", meter.ids[meter.at]));
    }
    meter.at = k;
    Ok(())
}

/// A name step: the child picks the bokje's name from 2–4 pictures.
fn name_step(v: &Value) -> Result<(), String> {
    if strings(&v["lines"], "lines")? == 0 {
        return Err("name step without lines".into());
    }
    placeholders(&v["lines"], false)?;
    let names = v["names"].as_array().filter(|n| (2..=4).contains(&n.len())).ok_or("name: 2–4 names to choose from")?;
    let mut ids = HashSet::new();
    for n in names {
        let id = n["id"].as_str().filter(|s| !s.is_empty()).ok_or("name: a name without id")?;
        if n["picture"].as_str().is_none() || n["word"].as_str().map_or(true, |w| w.trim().is_empty() || w.contains(['{', '}'])) {
            return Err(format!("name {id}: needs a picture and a word"));
        }
        if !ids.insert(id) {
            return Err(format!("name {id} twice"));
        }
    }
    Ok(())
}

/// What the story has done so far in a book, checked step by step.
struct Story {
    suspects: Suspects,
    meter: Meter,
    /// A name step has come: from here on, text may say {bokje}.
    named: bool,
}

/// A chapter; `gained` holds the book's own items and those of its earlier chapters (the bag so far).
fn chapter(c: &Value, doors: usize, gained: &[String], story: &mut Story) -> Result<(), String> {
    c["title"].as_str().filter(|s| !s.is_empty()).ok_or("no title")?;
    for key in ["items", "uses"] {
        if !c[key].is_null() {
            strings(&c[key], key)?;
        }
    }
    for used in c["uses"].as_array().map_or(&[][..], Vec::as_slice).iter().filter_map(Value::as_str) {
        if !gained.iter().any(|g| g == used) {
            return Err(format!("uses {used}, but no earlier chapter puts it in the bag"));
        }
    }
    let steps = c["steps"].as_array().filter(|s| !s.is_empty()).ok_or("no steps")?;
    for (k, s) in steps.iter().enumerate() {
        let kinds = ["story", "riddle", "puzzle", "suspects", "meter", "name"].into_iter().filter(|&key| !s[key].is_null()).collect::<Vec<_>>();
        let r = match kinds[..] {
            ["story"] => pages(&s["story"], story.named),
            ["riddle"] => riddle(&s["riddle"]),
            ["puzzle"] => puzzle(&s["puzzle"], doors),
            ["suspects"] if story.suspects.ids.is_empty() => Err("a suspects step, but the book has no suspects".into()),
            ["suspects"] => suspects_step(&s["suspects"], &mut story.suspects),
            ["meter"] => meter_step(&s["meter"], &mut story.meter, story.named),
            ["name"] if story.named => Err("a second name step (the bokje has its name)".into()),
            ["name"] => name_step(&s["name"]).map(|()| story.named = true),
            _ => Err("needs exactly one of story, riddle, puzzle, suspects, meter, name".into()),
        };
        r.map_err(|e| format!("step {}: {e}", k + 1))?;
    }
    // A chapter without a puzzle is a chapter of riddles (Book 4's "De drie raadsels").
    if !steps.iter().any(|s| !s["puzzle"].is_null()) && !steps.iter().any(|s| !s["riddle"].is_null()) {
        return Err("no puzzle and no riddle: a chapter needs one or the other".into());
    }
    Ok(())
}

pub fn validate(dir: &Path) -> Result<(), String> {
    let read = |name: &str| -> Result<Value, String> {
        let p = dir.join(name);
        let text = std::fs::read_to_string(&p).map_err(|e| format!("{}: {e}", p.display()))?;
        serde_json::from_str(&text).map_err(|e| format!("{name}: {e}"))
    };
    let index = read("index.json")?;
    // The doors for Planken (checked themselves by `planks::validate_in`).
    let doors = if dir.join("planks.json").exists() { read("planks.json")?["levels"].as_array().map_or(0, Vec::len) } else { 0 };
    let (mut total, mut bad) = (0, 0);
    for b in index["books"].as_array().ok_or("index.json: no books")? {
        let Some(file) = b["file"].as_str() else { continue };
        let book = read(file)?;
        let mut report = |part: String, r: Result<(), String>| {
            if let Err(e) = r {
                bad += 1;
                eprintln!("saga {file} {part}: {e}");
            }
        };
        report("intro".into(), pages(&book["intro"], false));
        report("bag".into(), if book["bag"].is_null() { Ok(()) } else { strings(&book["bag"], "bag").map(|_| ()) });
        let ids = suspect_list(&book["suspects"]).unwrap_or_else(|e| {
            report("suspects".into(), Err(e));
            vec![]
        });
        let sizes = meter_list(&book["meter"]).unwrap_or_else(|e| {
            report("meter".into(), Err(e));
            vec![]
        });
        let mut story = Story { suspects: Suspects { ids, turned: HashSet::new() }, meter: Meter { ids: sizes, at: 0 }, named: false };
        // The book's own items (Pim's magnifying glass) are in the bag from the start.
        let mut gained: Vec<String> = book["bag"].as_array().map_or(&[][..], Vec::as_slice).iter().filter_map(|v| v.as_str().map(String::from)).collect();
        for (i, c) in book["chapters"].as_array().map_or(&[][..], Vec::as_slice).iter().enumerate() {
            total += 1;
            report(format!("chapter {}", i + 1), chapter(c, doors, &gained, &mut story));
            gained.extend(c["items"].as_array().map_or(&[][..], Vec::as_slice).iter().filter_map(|v| v.as_str().map(String::from)));
        }
        report("finale".into(), pages(&book["finale"], story.named));
        // A mystery ends with one suspect left: the culprit.
        let board = &story.suspects;
        if !board.turned.is_empty() && board.ids.len() - board.turned.len() != 1 {
            report("suspects".into(), Err(format!("{} suspects are left at the end (the mystery needs one)", board.ids.len() - board.turned.len())));
        }
        // The final ends with the Nachtbok at its smallest: the little goat.
        let meter = &story.meter;
        if !meter.ids.is_empty() && meter.at != meter.ids.len() - 1 {
            report("meter".into(), Err(format!("the book ends with the meter at {}, not {}", meter.ids[meter.at], meter.ids[meter.ids.len() - 1])));
        }
    }
    println!("validated {total} saga chapters, {bad} problems");
    if bad > 0 {
        Err(format!("{bad} problems in the saga books"))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn goal_numbers_in_digits_and_words() {
        assert_eq!(said_number("Zet de koning mat in twee zetten!"), Some(2));
        assert_eq!(said_number("Het kan in 4 sprongen."), Some(4));
        assert_eq!(said_number("Zet mat in één zet!"), Some(1));
        assert_eq!(said_number("Maak het spel af!"), None);
        assert_eq!(said_number("Zet een koning mat in drie zetten."), Some(3));
    }

    #[test]
    fn spot_zones_must_be_apart() {
        let zone = |id: &str, x: u32, y: u32| json!({"id": id, "x": x, "y": y, "r": 50, "story": true});
        let p = |zones: Vec<Value>| json!({"engine": "spot", "scene": "chapel", "grid": [4, 3], "zones": zones});
        assert!(spot(&p(vec![zone("a", 100, 100), zone("b", 300, 100), zone("c", 500, 300)])).is_ok());
        // Two differences in one grid square: OK on that square would be ambiguous.
        assert!(spot(&p(vec![zone("a", 30, 60), zone("b", 150, 150), zone("c", 500, 300)])).is_err());
        // Overlapping circles, an unknown picture, too few differences.
        assert!(spot(&p(vec![zone("a", 190, 100), zone("b", 230, 100), zone("c", 500, 300)])).is_err());
        assert!(spot(&json!({"scene": "barn", "grid": [4, 3], "zones": []})).is_err());
        assert!(spot(&p(vec![zone("a", 100, 100), zone("b", 300, 100)])).is_err());
    }

    #[test]
    fn a_page_without_words_must_say_so() {
        assert!(pages(&json!([{"scene": "nest"}]), false).is_err());
        assert!(pages(&json!([{"scene": "nest", "silent": true}]), false).is_ok());
        assert!(pages(&json!([{"scene": "nest", "silent": true, "lines": ["Hoi."]}]), false).is_err());
    }

    #[test]
    fn the_bokje_is_named_before_text_says_its_name() {
        let page = json!([{"scene": "stal", "lines": ["{bokje} woont bij Barend."]}]);
        assert!(pages(&page, false).is_err());
        assert!(pages(&page, true).is_ok());
        assert!(pages(&json!([{"scene": "stal", "lines": ["{naam} is er."]}]), true).is_err());
        let names = |n: Value| json!({"lines": ["Hoe heet het?"], "names": n});
        let name = |id: &str| json!({"id": id, "word": "Sterre", "picture": "bokjeSterre"});
        assert!(name_step(&names(json!([name("a"), name("b"), name("c")]))).is_ok());
        assert!(name_step(&names(json!([name("a"), name("a")]))).is_err());
        assert!(name_step(&names(json!([name("a")]))).is_err());
    }

    #[test]
    fn the_nachtbok_only_shrinks() {
        let mut meter = Meter { ids: ["berg", "huis", "boom", "bokje"].map(String::from).to_vec(), at: 0 };
        let step = |to: &str| json!({"to": to, "lines": ["De Nachtbok krimpt!"]});
        assert!(meter_step(&step("huis"), &mut meter, false).is_ok());
        assert!(meter_step(&step("huis"), &mut meter, false).is_err());
        assert!(meter_step(&step("berg"), &mut meter, false).is_err());
        assert!(meter_step(&step("draak"), &mut meter, false).is_err());
        assert!(meter_step(&step("bokje"), &mut meter, false).is_ok());
        assert_eq!(meter.at, 3);
    }

    #[test]
    fn a_lone_king_game_mates_in_its_moves() {
        let game = |rows: [&str; 5], moves: u32| -> Puzzle {
            serde_json::from_value(json!({"kind": "Endgame", "position": {"width": 5, "height": 5, "rows": rows, "turn": "White", "rules": "Classic"}, "moves": moves, "seed": 0, "difficulty": 0}))
                .unwrap()
        };
        let book4 = [".....", "....k", "..R..", "..R..", "..K.."];
        assert!(lone_king(&game(book4, 2)).is_ok());
        assert!(lone_king(&game(book4, 1)).is_err());
        assert!(lone_king(&game(book4, 3)).is_err());
        // The king could take the rook next to it.
        assert!(lone_king(&game([".kR..", ".....", "R....", "..K..", "....."], 0)).is_err());
        // Not alone.
        assert!(lone_king(&game([".kp..", "....R", "R....", "..K..", "....."], 0)).is_err());
    }

    #[test]
    fn candles_must_be_gently_solvable() {
        assert!(candles(&json!({"size": 3, "lit": [false, true, false, false, false, false, false, false, false]})).is_ok());
        assert!(candles(&json!({"size": 3, "lit": vec![true; 9]})).is_err());
        assert!(candles(&json!({"size": 3, "lit": vec![true; 8]})).is_err());
    }

    #[test]
    fn suspects_turn_over_once() {
        let mut board = Suspects { ids: vec!["kat".into(), "uil".into(), "ekster".into()], turned: HashSet::new() };
        let step = |turn: Value| json!({"lines": ["Draai ze om!"], "turn": turn});
        assert!(suspects_step(&step(json!(["kat"])), &mut board).is_ok());
        assert!(suspects_step(&step(json!(["kat"])), &mut board).is_err());
        assert!(suspects_step(&step(json!(["hond"])), &mut board).is_err());
        assert!(suspects_step(&step(json!([])), &mut board).is_err());
    }

    #[test]
    fn several_right_answers_may_have_five_cards() {
        let card = |right: bool| json!({"picture": "uil", "right": right});
        let r = |answers: Vec<Value>| json!({"lines": ["Wie kan vliegen?"], "answers": answers});
        assert!(riddle(&r(vec![card(true), card(true), card(true), card(false), card(false)])).is_ok());
        assert!(riddle(&r(vec![card(true), card(false), card(false), card(false), card(false)])).is_err());
        assert!(riddle(&r(vec![card(true), card(true)])).is_err());
    }
}
