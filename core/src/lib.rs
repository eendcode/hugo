//! Het Geheim van de Duinkapel: puzzle core.
//!
//! The logic modules are plain Rust and test natively; only the `wasm`
//! module below touches `wasm-bindgen`.

pub mod ascii;
pub mod carts;
pub mod chess;
pub mod generator;
pub mod lantern;
pub mod mansion;
pub mod model;
pub mod program;
pub mod rng;
pub mod rules;
pub mod solver;

/// The WASM API. JSON strings cross the boundary; the shapes are the serde
/// forms of [`model::Level`], [`model::State`], [`rules::CheckResult`] and
/// [`solver::Hint`].
#[cfg(target_arch = "wasm32")]
mod wasm {
    use crate::model::{Level, State};
    use crate::{generator, rules, solver};
    use wasm_bindgen::prelude::*;

    fn parse(level: &str, state: &str) -> Result<(Level, State), JsError> {
        Ok((serde_json::from_str(level)?, serde_json::from_str(state)?))
    }

    /// A new level with exactly one solution, as JSON.
    #[wasm_bindgen]
    pub fn generate(seed: u32, difficulty: u32, size: u8) -> Result<String, JsError> {
        let level = generator::generate(seed as u64, difficulty, size)?;
        Ok(serde_json::to_string(&level)?)
    }

    /// Win check: `{won, route, issue, reached}`.
    #[wasm_bindgen]
    pub fn check(level: &str, state: &str) -> Result<String, JsError> {
        let (level, state) = parse(level, state)?;
        Ok(serde_json::to_string(&rules::check(&level, &state)?)?)
    }

    /// One step towards a solution, or `null`.
    #[wasm_bindgen]
    pub fn hint(level: &str, state: &str) -> Result<String, JsError> {
        let (level, state) = parse(level, state)?;
        Ok(serde_json::to_string(&solver::hint(&level, &state)?)?)
    }

    /// Number of solutions, stopping at `limit`.
    #[wasm_bindgen]
    pub fn solve_count(level: &str, limit: u32) -> Result<u32, JsError> {
        let level: Level = serde_json::from_str(level)?;
        Ok(solver::count_solutions(&level, limit))
    }

    // ---------- chess ----------

    use crate::chess::puzzles::{self, Puzzle, PuzzleKind};
    use crate::chess::{self, search, Board, Move, Position};

    fn board(position: &str) -> Result<Board, JsError> {
        let p: Position = serde_json::from_str(position)?;
        Board::from_position(&p).map_err(|e| JsError::new(&e))
    }

    fn json<T: serde::Serialize>(v: &T) -> Result<String, JsError> {
        Ok(serde_json::to_string(v)?)
    }

    /// `{position, check, outcome}` for a position.
    #[wasm_bindgen]
    pub fn chess_status(position: &str) -> Result<String, JsError> {
        json(&chess::status(&board(position)?))
    }

    /// Legal moves `[{from, to}]` of the piece on `from`.
    #[wasm_bindgen]
    pub fn chess_moves(position: &str, from: u8) -> Result<String, JsError> {
        json(&board(position)?.moves_from(from as usize))
    }

    /// Play a legal move; the status after it.
    #[wasm_bindgen]
    pub fn chess_play(position: &str, from: u8, to: u8) -> Result<String, JsError> {
        let b = board(position)?;
        let m = Move { from, to };
        if !b.is_legal(m) {
            return Err(JsError::new("illegal move"));
        }
        json(&chess::status(&b.apply(m)))
    }

    /// The engine's move at strength `level` (0–3), or `null`.
    #[wasm_bindgen]
    pub fn chess_reply(position: &str, level: u32, seed: u32) -> Result<String, JsError> {
        json(&search::best_move(&board(position)?, level, seed as u64))
    }

    /// The defender's most stubborn reply in a mate puzzle, or `null`.
    #[wasm_bindgen]
    pub fn chess_defend(position: &str, mate_left: u32) -> Result<String, JsError> {
        json(&search::longest_defence(&board(position)?, mate_left))
    }

    /// A good next move for White, or `null`.
    #[wasm_bindgen]
    pub fn chess_hint(puzzle: &str, position: &str, mate_left: u32) -> Result<String, JsError> {
        let p: Puzzle = serde_json::from_str(puzzle)?;
        json(&puzzles::hint(&p, &board(position)?, mate_left))
    }

    /// A robber's move taking back on `square`, or `null`.
    #[wasm_bindgen]
    pub fn chess_recapture(position: &str, square: u8) -> Result<String, JsError> {
        json(&puzzles::recapture(&board(position)?, square))
    }

    /// Does White mate from here within `n` moves?
    #[wasm_bindgen]
    pub fn chess_forces_mate(position: &str, n: u32) -> Result<bool, JsError> {
        Ok(search::forces_mate(&board(position)?, n))
    }

    /// A new puzzle: `kind` is "Capture", "SafeCapture", "Mate", …
    #[wasm_bindgen]
    pub fn chess_generate(kind: &str, seed: u32, difficulty: u32) -> Result<String, JsError> {
        let kind: PuzzleKind = serde_json::from_str(&format!("{kind:?}"))?;
        json(&puzzles::generate(kind, seed as u64, difficulty).map_err(|e| JsError::new(&e))?)
    }

    // ---------- Hugo's haunted house ----------

    use crate::mansion;

    /// Candles `{size, lit, par}` blown out by `presses` touches.
    #[wasm_bindgen]
    pub fn candles_generate(size: u8, presses: u32, seed: u32) -> Result<String, JsError> {
        json(&mansion::candles(size, presses as usize, seed as u64))
    }

    /// The touches `[cell]` of a shortest way to light every candle, or `null`.
    #[wasm_bindgen]
    pub fn candles_solve(size: u8, lit: &str) -> Result<String, JsError> {
        let lit: Vec<bool> = serde_json::from_str(lit)?;
        json(&mansion::solve_candles(size as usize, &lit))
    }

    /// A scrambled portrait `{width, height, tiles, par}`.
    #[wasm_bindgen]
    pub fn slide_generate(width: u8, height: u8, min: u32, max: u32, seed: u32) -> Result<String, JsError> {
        json(&mansion::slide(width, height, min, max, seed as u64))
    }

    /// The square of the tile to slide next on a shortest solution, or `null`.
    #[wasm_bindgen]
    pub fn slide_hint(width: u8, height: u8, tiles: &str) -> Result<String, JsError> {
        let tiles: Vec<u8> = serde_json::from_str(tiles)?;
        json(&mansion::solve_slide(width as usize, height as usize, &tiles).and_then(|(_, m)| m))
    }

    // ---------- Barends programma ----------

    use crate::program;

    /// Run the cards: `{steps, eaten, ending, played}`.
    #[wasm_bindgen]
    pub fn program_run(field: &str, cards: &str) -> Result<String, JsError> {
        let f: program::Field = serde_json::from_str(field)?;
        let cards: Vec<program::Card> = serde_json::from_str(cards)?;
        json(&f.run(&cards))
    }

    /// `{type: "Add", card} | {type: "Remove", index} | {type: "Go"}`.
    #[wasm_bindgen]
    pub fn program_hint(field: &str, cards: &str) -> Result<String, JsError> {
        let f: program::Field = serde_json::from_str(field)?;
        let cards: Vec<program::Card> = serde_json::from_str(cards)?;
        json(&program::hint(&f, &cards))
    }

    // ---------- Lantaarnlicht ----------

    use crate::lantern;

    fn placed(placed: &str) -> Result<std::collections::HashMap<u8, lantern::Mirror>, JsError> {
        let list: Vec<(u8, lantern::Mirror)> = serde_json::from_str(placed)?;
        Ok(list.into_iter().collect())
    }

    /// The beam with these mirrors `[[cell, "Slash"|"Backslash"], …]`: `{path, end, lit, won}`.
    #[wasm_bindgen]
    pub fn lantern_trace(field: &str, mirrors: &str) -> Result<String, JsError> {
        let f: lantern::Field = serde_json::from_str(field)?;
        json(&f.trace(&placed(mirrors)?))
    }

    /// `{cell, mirror}` to change next, or `null`.
    #[wasm_bindgen]
    pub fn lantern_hint(field: &str, mirrors: &str) -> Result<String, JsError> {
        let f: lantern::Field = serde_json::from_str(field)?;
        json(&lantern::hint(&f, &placed(mirrors)?))
    }

    // ---------- Maak de weg vrij ----------

    use crate::carts;

    /// The next move `{cart, to}` of a shortest way out, or `null`.
    #[wasm_bindgen]
    pub fn carts_hint(yard: &str, positions: &str) -> Result<String, JsError> {
        let y: carts::Yard = serde_json::from_str(yard)?;
        let positions: Vec<u8> = serde_json::from_str(positions)?;
        json(&carts::hint(&y, &positions))
    }
}
