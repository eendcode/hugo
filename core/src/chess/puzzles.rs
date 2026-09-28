//! Puzzles and games for "Verdedig het dorp".
//!
//! - **Capture** (solo): one villager captures every robber; the robbers
//!   stand still. Stars for doing it in the fewest moves.
//! - **SafeCapture** (solo): exactly one capture can't be taken back.
//! - **Mate**: mate in 1 or 2, with exactly one first move that works.
//! - **PawnRace**, **Endgame**, **Battle**: games against the engine.
//!
//! Every generator is seeded, so a level can be regenerated from its seed.

use super::search::{forces_mate, mating_move, mating_moves};
use super::{Board, Color, Kind, Move, Position, Rules, Sq};
use crate::rng::Rng;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PuzzleKind {
    Capture,
    SafeCapture,
    Mate,
    PawnRace,
    Endgame,
    Battle,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Puzzle {
    pub kind: PuzzleKind,
    pub position: Position,
    /// Mate: moves to mate in. Capture: the fewest moves that capture everything.
    #[serde(default)]
    pub moves: u32,
    pub seed: u64,
    pub difficulty: u32,
    /// Higher is harder (used to order levels within a stage).
    #[serde(default)]
    pub score: u32,
}

pub const MAX_DIFFICULTY: u32 = 5;
const MAX_ATTEMPTS: usize = 200_000;

pub fn generate(kind: PuzzleKind, seed: u64, difficulty: u32) -> Result<Puzzle, String> {
    let d = difficulty.min(MAX_DIFFICULTY);
    let mut rng = Rng::new(seed ^ 0xC4E5_5000 ^ (kind as u64) << 40);
    let made = match kind {
        PuzzleKind::Capture => capture(&mut rng, d),
        PuzzleKind::SafeCapture => safe_capture(&mut rng, d),
        PuzzleKind::Mate => mate(&mut rng, d),
        PuzzleKind::PawnRace => Some(pawn_race(&mut rng, d)),
        PuzzleKind::Endgame => endgame(&mut rng, d),
        PuzzleKind::Battle => Some(battle(d)),
    };
    let (board, moves, score) = made.ok_or_else(|| format!("no {kind:?} puzzle found for seed {seed}"))?;
    Ok(Puzzle { kind, position: board.to_position(), moves, seed, difficulty: d, score })
}

fn random_empty(rng: &mut Rng, b: &Board, rows: std::ops::Range<i8>) -> Option<usize> {
    let free: Vec<usize> = (0..b.cells()).filter(|&i| b.sq[i] == Sq::Empty && rows.contains(&b.xy(i).1)).collect();
    (!free.is_empty()).then(|| *rng.pick(&free))
}

// ---------- capture them all (solo) ----------

/// The piece taught at each capture difficulty, and the board size.
const CAPTURE_STEPS: [(Kind, u8, usize, usize); 6] = [
    // (piece, size, robbers, trees)
    (Kind::Rook, 4, 3, 1),
    (Kind::Bishop, 5, 3, 2),
    (Kind::Queen, 5, 4, 3),
    (Kind::Knight, 4, 3, 1),
    (Kind::King, 5, 4, 3),
    (Kind::Knight, 5, 5, 2),
];

/// Capture puzzles for a single piece kind (the level pack teaches each piece).
pub fn capture_with(seed: u64, piece: Kind, size: u8, robbers: usize, trees: usize) -> Result<Puzzle, String> {
    let mut rng = Rng::new(seed ^ 0xCA97);
    let (b, par, score) = capture_search(&mut rng, piece, size, robbers, trees).ok_or("no capture puzzle found")?;
    Ok(Puzzle { kind: PuzzleKind::Capture, position: b.to_position(), moves: par, seed, difficulty: 0, score })
}

fn capture(rng: &mut Rng, d: u32) -> Option<(Board, u32, u32)> {
    let (piece, size, robbers, trees) = CAPTURE_STEPS[d as usize];
    capture_search(rng, piece, size, robbers, trees)
}

fn capture_search(rng: &mut Rng, piece: Kind, size: u8, robbers: usize, trees: usize) -> Option<(Board, u32, u32)> {
    for _ in 0..MAX_ATTEMPTS {
        let mut b = Board::empty(size, size, Rules::Solo);
        // Pawns start on the bottom row so they have room to climb.
        let start_rows = if piece == Kind::Pawn { size as i8 - 1..size as i8 } else { 0..size as i8 };
        let at = random_empty(rng, &b, start_rows)?;
        b.sq[at] = Sq::Piece(Color::White, piece);
        for _ in 0..trees {
            let t = random_empty(rng, &b, 0..size as i8)?;
            b.sq[t] = Sq::Tree;
        }
        for _ in 0..robbers {
            let r = random_empty(rng, &b, 0..size as i8)?;
            b.sq[r] = Sq::Piece(Color::Black, Kind::Pawn);
        }
        let Some((par, _)) = capture_route(&b) else { continue };
        // Some walking between captures makes it a puzzle, not a list.
        let walks = par - robbers as u32;
        if walks == 0 || walks > robbers as u32 + 1 {
            continue;
        }
        return Some((b, par, par * 10 + walks * 5));
    }
    None
}

/// Fewest moves to capture every black piece (solo), and a first move on
/// such a route. `Some((0, None))` if nothing is left to capture.
pub fn capture_route(b: &Board) -> Option<(u32, Option<Move>)> {
    let mut seen: HashMap<Board, (u32, Option<Move>)> = HashMap::new();
    let mut queue = VecDeque::new();
    seen.insert(*b, (0, None));
    queue.push_back(*b);
    while let Some(cur) = queue.pop_front() {
        let (dist, first) = seen[&cur];
        if cur.pieces(Color::Black).next().is_none() {
            return Some((dist, first));
        }
        for m in cur.legal_moves() {
            let next = cur.apply(m);
            if let std::collections::hash_map::Entry::Vacant(e) = seen.entry(next) {
                e.insert((dist + 1, first.or(Some(m))));
                queue.push_back(next);
            }
        }
    }
    None
}

// ---------- safe capture (solo) ----------

const SAFE_STEPS: [(u8, usize, usize, usize); 6] = [
    // (size, villagers, robbers, captures at least)
    (5, 2, 3, 2),
    (5, 2, 4, 2),
    (6, 3, 4, 3),
    (6, 3, 5, 3),
    (8, 3, 6, 3),
    (8, 4, 7, 4),
];

/// Captures available to White, split into (safe, unsafe) by whether a
/// robber can take back on that square.
pub fn safe_captures(b: &Board) -> (Vec<Move>, Vec<Move>) {
    b.legal_moves().into_iter().filter(|&m| b.is_capture(m)).partition(|&m| !b.apply(m).attacked(m.to as usize, Color::Black))
}

/// A robber's move that takes back on `square`, if any (the cheapest robber first).
pub fn recapture(b: &Board, square: u8) -> Option<Move> {
    let mut robbers = *b;
    robbers.turn = Color::Black;
    robbers.rules = Rules::Classic;
    let mut moves = Vec::new();
    for (i, _) in robbers.pieces(Color::Black) {
        robbers.piece_moves(i, &mut moves);
    }
    moves.into_iter().filter(|m| m.to == square).min_by_key(|m| match b.sq[m.from as usize] {
        Sq::Piece(_, k) => k.value(),
        _ => 0,
    })
}

fn safe_capture(rng: &mut Rng, d: u32) -> Option<(Board, u32, u32)> {
    let (size, villagers, robbers, min_caps) = SAFE_STEPS[d as usize];
    let n = size as i8;
    for _ in 0..MAX_ATTEMPTS {
        let mut b = Board::empty(size, size, Rules::Solo);
        for _ in 0..villagers {
            let k = *rng.pick(&[Kind::Queen, Kind::Rook, Kind::Rook, Kind::Bishop, Kind::Knight, Kind::Knight, Kind::Pawn]);
            let rows = if k == Kind::Pawn { 1..n } else { 0..n };
            let at = random_empty(rng, &b, rows)?;
            b.sq[at] = Sq::Piece(Color::White, k);
        }
        for _ in 0..robbers {
            let k = *rng.pick(&[Kind::Rook, Kind::Bishop, Kind::Knight, Kind::Pawn, Kind::Pawn]);
            let rows = if k == Kind::Pawn { 0..n - 1 } else { 0..n };
            let at = random_empty(rng, &b, rows)?;
            b.sq[at] = Sq::Piece(Color::Black, k);
        }
        let (safe, unsafe_) = safe_captures(&b);
        if safe.len() != 1 || safe.len() + unsafe_.len() < min_caps {
            continue;
        }
        let score = (unsafe_.len() * 10 + robbers * 3) as u32;
        return Some((b, 1, score));
    }
    None
}

// ---------- mate in 1 or 2 ----------

const MATE_STEPS: [(u8, u32, usize, usize); 6] = [
    // (size, mate in, extra villagers, extra robbers)
    (5, 1, 1, 0),
    (6, 1, 2, 1),
    (8, 1, 2, 2),
    (8, 1, 3, 3),
    (6, 2, 1, 1),
    (8, 2, 2, 2),
];

fn mate(rng: &mut Rng, d: u32) -> Option<(Board, u32, u32)> {
    let (size, n, extra_w, extra_b) = MATE_STEPS[d as usize];
    mate_search(rng, size, n, extra_w, extra_b)
}

/// A mate-in-`n` position with exactly one first move that works.
pub fn mate_with(seed: u64, size: u8, n: u32, extra_w: usize, extra_b: usize) -> Result<Puzzle, String> {
    let mut rng = Rng::new(seed ^ 0x3A7E);
    let (b, n, score) = mate_search(&mut rng, size, n, extra_w, extra_b).ok_or("no mate puzzle found")?;
    Ok(Puzzle { kind: PuzzleKind::Mate, position: b.to_position(), moves: n, seed, difficulty: 0, score })
}

fn mate_search(rng: &mut Rng, size: u8, n: u32, extra_w: usize, extra_b: usize) -> Option<(Board, u32, u32)> {
    let s = size as i8;
    for _ in 0..MAX_ATTEMPTS {
        let mut b = Board::empty(size, size, Rules::Classic);
        // The hoofdman hides near the edge (on his side of the board, mostly).
        let edge: Vec<usize> = (0..b.cells())
            .filter(|&i| {
                let (x, y) = b.xy(i);
                y <= 1 && (y == 0 || x == 0 || x == s - 1)
            })
            .collect();
        let bk = *rng.pick(&edge);
        b.sq[bk] = Sq::Piece(Color::Black, Kind::King);
        let wk = random_empty(rng, &b, 0..s)?;
        b.sq[wk] = Sq::Piece(Color::White, Kind::King);
        for _ in 0..extra_w {
            let k = *rng.pick(&[Kind::Queen, Kind::Rook, Kind::Rook, Kind::Bishop, Kind::Knight, Kind::Pawn]);
            let at = random_empty(rng, &b, if k == Kind::Pawn { 1..s - 1 } else { 0..s })?;
            b.sq[at] = Sq::Piece(Color::White, k);
        }
        for _ in 0..extra_b {
            let k = *rng.pick(&[Kind::Pawn, Kind::Pawn, Kind::Knight, Kind::Bishop, Kind::Rook]);
            // Robbers stay near their hoofdman.
            let at = random_empty(rng, &b, if k == Kind::Pawn { 1..s.min(4) } else { 0..s.min(4) })?;
            b.sq[at] = Sq::Piece(Color::Black, k);
        }
        if b.in_check(Color::Black) || b.in_check(Color::White) || b.legal_moves().is_empty() {
            continue;
        }
        // A black pawn one step from queening makes the position odd.
        if (0..s).any(|x| b.sq[b.idx(x, s - 2)] == Sq::Piece(Color::Black, Kind::Pawn)) {
            continue;
        }
        if n == 1 {
            if mating_moves(&b, 1).len() != 1 {
                continue;
            }
        } else {
            if forces_mate(&b, n - 1) || mating_moves(&b, n).len() != 1 {
                continue;
            }
        }
        let checks = b.legal_moves().iter().filter(|&&m| b.apply(m).in_check(Color::Black)).count() as u32;
        let pieces = (0..b.cells()).filter(|&i| matches!(b.sq[i], Sq::Piece(..))).count() as u32;
        return Some((b, n, checks * 10 + pieces * 3 + size as u32));
    }
    None
}

// ---------- games against the engine ----------

fn pawn_race(rng: &mut Rng, d: u32) -> (Board, u32, u32) {
    let (size, pawns) = [(5u8, 3usize), (5, 4), (6, 4), (6, 5), (6, 6), (8, 8)][d as usize];
    let mut b = Board::empty(size, size, Rules::Pawns);
    let s = size as i8;
    let mut files: Vec<i8> = (0..s).collect();
    rng.shuffle(&mut files);
    for &x in &files[..pawns] {
        b.sq[b.idx(x, s - 2)] = Sq::Piece(Color::White, Kind::Pawn);
    }
    rng.shuffle(&mut files);
    for &x in &files[..pawns] {
        b.sq[b.idx(x, 1)] = Sq::Piece(Color::Black, Kind::Pawn);
    }
    (b, 0, d * 10 + pawns as u32)
}

fn endgame(rng: &mut Rng, d: u32) -> Option<(Board, u32, u32)> {
    let (size, white): (u8, &[Kind]) = [
        (6, &[Kind::Rook, Kind::Rook][..]),
        (5, &[Kind::Queen][..]),
        (6, &[Kind::Queen][..]),
        (8, &[Kind::Rook, Kind::Rook][..]),
        (8, &[Kind::Queen][..]),
        (6, &[Kind::Rook][..]),
    ][d as usize];
    let s = size as i8;
    for _ in 0..MAX_ATTEMPTS {
        let mut b = Board::empty(size, size, Rules::Classic);
        // The hoofdman starts in the middle; the villagers near the bottom.
        let bk = random_empty(rng, &b, s / 2 - 1..s / 2 + 1)?;
        b.sq[bk] = Sq::Piece(Color::Black, Kind::King);
        let wk = random_empty(rng, &b, s - 2..s)?;
        b.sq[wk] = Sq::Piece(Color::White, Kind::King);
        for &k in white {
            let at = random_empty(rng, &b, s - 2..s)?;
            b.sq[at] = Sq::Piece(Color::White, k);
        }
        if b.in_check(Color::Black) || b.in_check(Color::White) {
            continue;
        }
        // Nothing hangs: the black king can't take a villager right away.
        let mut black = b;
        black.turn = Color::Black;
        if black.legal_moves().iter().any(|&m| b.is_capture(m)) {
            continue;
        }
        return Some((b, 0, d * 10));
    }
    None
}

fn battle(d: u32) -> (Board, u32, u32) {
    // Village armies on small boards; the robbers start with fewer pieces.
    let rows: [&[&str]; 6] = [
        &["..k..", "ppppp", ".....", "PPPPP", "RNBQK"],
        &["r.k.r", "ppppp", ".....", "PPPPP", "RNBQK"],
        &[".nk.n.", "pppppp", "......", "......", "PPPPPP", "RNQKNR"],
        &["rnk..r", "pppppp", "......", "......", "PPPPPP", "RNQKNR"],
        &["rnbk.r", "ppppp.", "......", "......", "PPPPPP", "RNQKBR"],
        &["rnqknr", "pppppp", "......", "......", "PPPPPP", "RNQKNR"],
    ];
    let r = rows[d as usize];
    let p = Position {
        width: r[0].len() as u8,
        height: r.len() as u8,
        rows: r.iter().map(|s| s.to_string()).collect(),
        turn: Color::White,
        rules: Rules::Classic,
    };
    (Board::from_position(&p).expect("battle setup"), 0, d * 10)
}

// ---------- checking and hints ----------

/// Does this puzzle have exactly the solution it claims? (For validation.)
pub fn verify(p: &Puzzle) -> Result<(), String> {
    let b = Board::from_position(&p.position)?;
    match p.kind {
        PuzzleKind::Capture => match capture_route(&b) {
            Some((par, _)) if par == p.moves => Ok(()),
            other => Err(format!("capture par {:?}, expected {}", other.map(|o| o.0), p.moves)),
        },
        PuzzleKind::SafeCapture => match safe_captures(&b).0.len() {
            1 => Ok(()),
            n => Err(format!("{n} safe captures")),
        },
        PuzzleKind::Mate => {
            if p.moves > 1 && forces_mate(&b, p.moves - 1) {
                return Err("mates faster than claimed".into());
            }
            match mating_moves(&b, p.moves).len() {
                1 => Ok(()),
                n => Err(format!("{n} key moves")),
            }
        }
        PuzzleKind::PawnRace | PuzzleKind::Endgame | PuzzleKind::Battle => {
            if b.outcome().is_some() {
                Err("game already over".into())
            } else {
                Ok(())
            }
        }
    }
}

/// A good next move for White in `b` (the current position of puzzle `p`).
/// `mate_left` is how many mating moves are left in a Mate puzzle.
pub fn hint(p: &Puzzle, b: &Board, mate_left: u32) -> Option<Move> {
    match p.kind {
        PuzzleKind::Capture => capture_route(b).and_then(|(_, m)| m),
        PuzzleKind::SafeCapture => safe_captures(b).0.first().copied(),
        PuzzleKind::Mate => mating_move(b, mate_left.max(1)),
        PuzzleKind::PawnRace | PuzzleKind::Endgame | PuzzleKind::Battle => {
            // A quick mate if there is one, otherwise the engine at full strength.
            mating_move(b, 2).or_else(|| super::search::best_move(b, 3, 0))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::board;
    use super::*;
    use Color::*;

    #[test]
    fn capture_route_counts_walks() {
        // The rook takes the robber on its row, then walks round the tree.
        let b = board(&["R.p.", "..#.", "..p.", "...."], White, Rules::Solo);
        let (par, first) = capture_route(&b).unwrap();
        assert_eq!(par, 4);
        assert!(first.is_some());
        assert_eq!(capture_route(&board(&["R...", "....", "....", "...."], White, Rules::Solo)), Some((0, None)));
    }

    #[test]
    fn safe_capture_split() {
        // Rook can take either pawn; the one on the right is guarded by a bishop.
        let b = board(&[".....", ".....", "p.R.p", "...b.", "....."], White, Rules::Solo);
        let (safe, unsafe_) = safe_captures(&b);
        assert_eq!(safe, vec![Move { from: 12, to: 10 }]);
        assert_eq!(unsafe_, vec![Move { from: 12, to: 14 }]);
        assert_eq!(recapture(&b.apply(unsafe_[0]), 14), Some(Move { from: 18, to: 14 }));
    }

    #[test]
    fn every_kind_generates_and_verifies() {
        for kind in [PuzzleKind::Capture, PuzzleKind::SafeCapture, PuzzleKind::Mate, PuzzleKind::PawnRace, PuzzleKind::Endgame, PuzzleKind::Battle] {
            for d in 0..=MAX_DIFFICULTY {
                if kind == PuzzleKind::Mate && d >= 4 && cfg!(debug_assertions) {
                    continue; // mate in 2 is slow in debug builds; the level-pack validation covers it
                }
                let p = generate(kind, 7 + d as u64, d).unwrap_or_else(|e| panic!("{kind:?} d{d}: {e}"));
                verify(&p).unwrap_or_else(|e| panic!("{kind:?} d{d}: {e}"));
                assert_eq!(generate(kind, 7 + d as u64, d).unwrap(), p, "same seed, same puzzle");
                let b = Board::from_position(&p.position).unwrap();
                if matches!(kind, PuzzleKind::Capture | PuzzleKind::SafeCapture | PuzzleKind::Mate) {
                    let m = hint(&p, &b, p.moves).expect("hint");
                    assert!(b.is_legal(m));
                }
            }
        }
    }

    #[test]
    fn capture_pieces_and_pawns() {
        for (i, k) in [Kind::Rook, Kind::Bishop, Kind::Queen, Kind::Knight, Kind::King, Kind::Pawn].into_iter().enumerate() {
            let p = capture_with(i as u64, k, 5, 3, 1).unwrap();
            verify(&p).unwrap();
        }
    }

    #[test]
    fn mate_hint_follows_through() {
        let p = generate(PuzzleKind::Mate, 3, 0).unwrap();
        let b = Board::from_position(&p.position).unwrap();
        let m = hint(&p, &b, 1).unwrap();
        assert!(b.apply(m).is_mate());
    }
}
