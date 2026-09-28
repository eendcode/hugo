//! The bokkenrijders' brain: negamax alpha-beta with a capture search, a
//! simple evaluation, and a strength knob that makes it play a little
//! carelessly on purpose. Also a mate-in-N solver for puzzles and hints.

use super::{Board, Color, Kind, Move, Rules, Sq};
use crate::rng::Rng;

pub const MATE: i32 = 100_000;
/// Scores this close to MATE are forced wins or losses.
const MATE_BAND: i32 = 1_000;
/// Nodes per engine move; keeps the WASM reply quick on a TV.
const NODE_BUDGET: u64 = 150_000;
const QUIESCE_DEPTH: i32 = 4;

/// How well the engine plays, from 0 (very easy) to 3 (quite good).
#[derive(Clone, Copy, Debug)]
pub struct Strength {
    /// Full-width search depth in plies.
    depth: i32,
    /// Moves within this many centipawns of the best are equally likely.
    margin: i32,
    /// Chance of a random legal move that doesn't lose at once.
    blunder: f64,
}

pub fn strength(level: u32) -> Strength {
    match level {
        0 => Strength { depth: 1, margin: 250, blunder: 0.35 },
        1 => Strength { depth: 2, margin: 80, blunder: 0.1 },
        2 => Strength { depth: 3, margin: 20, blunder: 0.0 },
        _ => Strength { depth: 4, margin: 0, blunder: 0.0 },
    }
}

struct Search {
    nodes: u64,
    budget: u64,
}

impl Search {
    fn out_of_time(&self) -> bool {
        self.nodes > self.budget
    }

    /// Score for the side to move, or `None` if the game is over.
    fn terminal(&self, b: &Board, ply: i32, moves: &[Move]) -> Option<i32> {
        let o = if b.rules == Rules::Classic && !moves.is_empty() { None } else { b.outcome() }?;
        Some(match o.winner {
            None => 0,
            Some(c) if c == b.turn => MATE - ply,
            Some(_) => -(MATE - ply),
        })
    }

    fn negamax(&mut self, b: &Board, depth: i32, mut alpha: i32, beta: i32, ply: i32) -> i32 {
        self.nodes += 1;
        let mut moves = b.legal_moves();
        if let Some(s) = self.terminal(b, ply, &moves) {
            return s;
        }
        if depth <= 0 {
            return self.quiesce(b, alpha, beta, ply, QUIESCE_DEPTH);
        }
        order(b, &mut moves);
        let mut best = -MATE * 2;
        for m in moves {
            let score = -self.negamax(&b.apply(m), depth - 1, -beta, -alpha, ply + 1);
            if score > best {
                best = score;
            }
            alpha = alpha.max(score);
            if alpha >= beta || self.out_of_time() {
                break;
            }
        }
        best
    }

    fn quiesce(&mut self, b: &Board, mut alpha: i32, beta: i32, ply: i32, depth: i32) -> i32 {
        self.nodes += 1;
        let stand = evaluate(b);
        if stand >= beta || depth == 0 {
            return stand;
        }
        alpha = alpha.max(stand);
        let mut moves: Vec<Move> = b.legal_moves().into_iter().filter(|&m| b.is_capture(m) || is_race_step(b, m)).collect();
        order(b, &mut moves);
        for m in moves {
            let a = b.apply(m);
            let score = match self.terminal(&a, ply + 1, &[Move { from: 0, to: 0 }]) {
                Some(s) if a.rules != Rules::Classic => -s,
                _ => -self.quiesce(&a, -beta, -alpha, ply + 1, depth - 1),
            };
            if score >= beta {
                return score;
            }
            alpha = alpha.max(score);
        }
        alpha
    }
}

/// In a pawn race, a pawn stepping onto the second-to-last row is as
/// forcing as a capture.
fn is_race_step(b: &Board, m: Move) -> bool {
    b.rules == Rules::Pawns && {
        let (_, y) = b.xy(m.to as usize);
        let goal = if b.turn == Color::White { 0 } else { b.h - 1 };
        (y - goal).abs() <= 1
    }
}

/// Captures of valuable pieces by cheap ones first, then promotions.
fn order(b: &Board, moves: &mut [Move]) {
    let key = |m: &Move| {
        let victim = match b.sq[m.to as usize] {
            Sq::Piece(_, k) => k.value() + 1000,
            _ => 0,
        };
        let attacker = match b.sq[m.from as usize] {
            Sq::Piece(_, k) => k.value(),
            _ => 0,
        };
        -(victim * 10 - attacker / 10)
    };
    moves.sort_by_key(key);
}

/// Static score for the side to move, in centipawns.
pub fn evaluate(b: &Board) -> i32 {
    let (cx2, cy2) = (b.w as i32 - 1, b.h as i32 - 1); // centre ×2
    let mut score = [0i32; 2];
    let side = |c: Color| if c == Color::White { 0 } else { 1 };
    for i in 0..b.cells() {
        let Sq::Piece(c, k) = b.sq[i] else { continue };
        let (x, y) = b.xy(i);
        let (x, y) = (x as i32, y as i32);
        let centre = -((2 * x - cx2).abs() + (2 * y - cy2).abs());
        // Rows travelled from this side's own edge.
        let advance = if c == Color::White { b.h as i32 - 1 - y } else { y };
        let v = k.value()
            + match k {
                Kind::Knight | Kind::Bishop => centre * 4,
                Kind::Queen => centre * 2,
                Kind::Pawn if b.rules == Rules::Pawns => advance * advance * 12 + passed(b, i, c) * advance * 25,
                Kind::Pawn => advance * 8,
                _ => 0,
            };
        score[side(c)] += v;
    }
    // Mop-up: with a clear material lead, drive the lone king to the edge
    // and bring the own king closer.
    for c in [Color::White, Color::Black] {
        let lead = b.material(c) - b.material(c.other());
        if lead >= 300 {
            if let (Some(k), Some(ek)) = (b.king(c), b.king(c.other())) {
                let (ex, ey) = b.xy(ek);
                let (kx, ky) = b.xy(k);
                let edge = (2 * ex as i32 - cx2).abs() + (2 * ey as i32 - cy2).abs();
                let dist = (kx as i32 - ex as i32).abs().max((ky as i32 - ey as i32).abs());
                score[side(c)] += edge * 10 + (8 - dist) * 6;
            }
        }
    }
    let s = score[0] - score[1];
    if b.turn == Color::White {
        s
    } else {
        -s
    }
}

/// 1 if no enemy pawn can stop this pawn on its way (pawn race), else 0.
fn passed(b: &Board, i: usize, c: Color) -> i32 {
    let (x, y) = b.xy(i);
    let f = if c == Color::White { -1 } else { 1 };
    let mut row = y + f;
    while row >= 0 && row < b.h {
        for dx in -1..=1 {
            let cx = x + dx;
            if cx >= 0 && cx < b.w && b.sq[b.idx(cx, row)] == Sq::Piece(c.other(), Kind::Pawn) {
                return 0;
            }
        }
        row += f;
    }
    1
}

/// Every legal move with its score (for the side to move), searched `depth` plies.
pub fn scored_moves(b: &Board, depth: i32) -> Vec<(Move, i32)> {
    let mut s = Search { nodes: 0, budget: NODE_BUDGET };
    let mut moves = b.legal_moves();
    order(b, &mut moves);
    let mut out = Vec::with_capacity(moves.len());
    // Deepen until the budget runs out; keep the last complete pass.
    for d in 1..=depth {
        let mut pass = Vec::with_capacity(moves.len());
        for &m in &moves {
            pass.push((m, -s.negamax(&b.apply(m), d - 1, -MATE * 2, MATE * 2, 1)));
            if s.out_of_time() {
                break;
            }
        }
        if pass.len() < moves.len() && !out.is_empty() {
            break;
        }
        out = pass;
        // Search the best moves first next time.
        out.sort_by_key(|&(_, sc)| -sc);
        moves = out.iter().map(|&(m, _)| m).collect();
        if s.out_of_time() {
            break;
        }
    }
    out
}

/// The engine's move at a strength level. `seed` picks among near-equal
/// moves, so replies vary between games.
pub fn best_move(b: &Board, level: u32, seed: u64) -> Option<Move> {
    let st = strength(level);
    let mut rng = Rng::new(seed);
    let scored = scored_moves(b, st.depth);
    let best = scored.iter().map(|&(_, s)| s).max()?;
    // Never miss a mate in one, and never throw away a forced win.
    if best >= MATE - MATE_BAND {
        return scored.iter().find(|&&(_, s)| s == best).map(|&(m, _)| m);
    }
    if rng.chance(st.blunder) {
        // A careless move, but not one that loses on the spot.
        let safe: Vec<Move> = scored.iter().filter(|&&(_, s)| s > -(MATE - MATE_BAND)).map(|&(m, _)| m).collect();
        if !safe.is_empty() {
            return Some(*rng.pick(&safe));
        }
    }
    let near: Vec<Move> = scored.iter().filter(|&&(_, s)| s >= best - st.margin).map(|&(m, _)| m).collect();
    Some(*rng.pick(&near))
}

// ---------- mate solver ----------

/// Can the side to move force mate within `n` of its own moves?
pub fn forces_mate(b: &Board, n: u32) -> bool {
    first_mating_move(b, n).is_some()
}

fn first_mating_move(b: &Board, n: u32) -> Option<Move> {
    if n == 0 {
        return None;
    }
    let moves = b.legal_moves();
    // Mates in one first: they are checks, which are cheap to find.
    for &m in &moves {
        let a = b.apply(m);
        if a.in_check(a.turn) && a.legal_moves().is_empty() {
            return Some(m);
        }
    }
    if n == 1 {
        return None;
    }
    moves.into_iter().find(|&m| defended_by_nothing(&b.apply(m), n - 1))
}

/// After our move: the opponent has replies, and every one allows mate in `n`.
fn defended_by_nothing(a: &Board, n: u32) -> bool {
    let replies = a.legal_moves();
    !replies.is_empty() && replies.into_iter().all(|r| forces_mate(&a.apply(r), n))
}

/// All moves for the side to move that force mate within `n` moves.
pub fn mating_moves(b: &Board, n: u32) -> Vec<Move> {
    b.legal_moves()
        .into_iter()
        .filter(|&m| {
            let a = b.apply(m);
            a.is_mate() || (n > 1 && defended_by_nothing(&a, n - 1))
        })
        .collect()
}

/// A mating move within `n`, the shortest first.
pub fn mating_move(b: &Board, n: u32) -> Option<Move> {
    (1..=n).find_map(|k| first_mating_move(b, k))
}

/// The defender's reply that holds out longest (for mate-in-2 puzzles).
pub fn longest_defence(a: &Board, n: u32) -> Option<Move> {
    let replies = a.legal_moves();
    replies
        .iter()
        .copied()
        .max_by_key(|&r| {
            let after = a.apply(r);
            let fastest = (1..=n).find(|&k| forces_mate(&after, k)).unwrap_or(n + 1);
            // Prefer long defences, then captures (they look like fighting back).
            (fastest, a.is_capture(r) as u32)
        })
}

#[cfg(test)]
mod tests {
    use super::super::{board, Color::*, Rules};
    use super::*;

    #[test]
    fn engine_takes_a_free_queen() {
        let b = board(&["k.....", "......", "..q...", "......", "..R...", "K....."], White, Rules::Classic);
        for level in 2..4 {
            assert_eq!(best_move(&b, level, 1), Some(Move { from: 26, to: 14 }), "level {level}");
        }
    }

    #[test]
    fn engine_finds_mate_in_one() {
        let b = board(&["k.....", "......", ".K....", "......", "......", ".....R"], White, Rules::Classic);
        let m = best_move(&b, 0, 3).unwrap();
        assert!(b.apply(m).is_mate());
    }

    #[test]
    fn mate_solver() {
        // Rook mate on the back row.
        let b = board(&["k.....", "......", ".K....", "......", "......", ".....R"], White, Rules::Classic);
        assert_eq!(mating_moves(&b, 1), vec![Move { from: 35, to: 5 }]);
        assert_eq!(mating_move(&b, 2), Some(Move { from: 35, to: 5 }), "the shortest mate first");
        // One row further away: no mate in one.
        let b = board(&["...k..", "......", "......", "...K..", "......", "R....."], White, Rules::Classic);
        assert!(!forces_mate(&b, 1));
    }

    #[test]
    fn pawn_race_engine_promotes() {
        let b = board(&["......", "P.....", "......", "......", ".....p", "......"], White, Rules::Pawns);
        assert_eq!(best_move(&b, 1, 5), Some(Move { from: 6, to: 0 }));
    }
}
