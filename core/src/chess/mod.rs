//! Chess for "Verdedig het dorp": boards from 4×4 to 8×8, legal moves,
//! check and game end, a small alpha-beta engine ([`search`]) and puzzle
//! generators ([`puzzles`]).
//!
//! Village rules: no castling and no en passant, and a pawn that reaches
//! the far row becomes a queen. On boards at least 6 rows high a pawn may
//! step two squares from its first row. Trees (`#`) block every piece; they
//! only appear in the piece-refresher puzzles.
//!
//! Squares are numbered row by row from the top-left, as on the road board.
//! White (the villagers) plays up the board, Black (the bokkenrijders) down.

pub mod puzzles;
pub mod search;

use serde::{Deserialize, Serialize};

pub const MAX_SIZE: usize = 8;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Color {
    White,
    Black,
}

impl Color {
    pub fn other(self) -> Color {
        match self {
            Color::White => Color::Black,
            Color::Black => Color::White,
        }
    }

    /// Row step of this side's pawns.
    fn forward(self) -> i8 {
        match self {
            Color::White => -1,
            Color::Black => 1,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Kind {
    King,
    Queen,
    Rook,
    Bishop,
    Knight,
    Pawn,
}

impl Kind {
    pub fn value(self) -> i32 {
        match self {
            Kind::King => 0,
            Kind::Queen => 900,
            Kind::Rook => 500,
            Kind::Bishop => 320,
            Kind::Knight => 300,
            Kind::Pawn => 100,
        }
    }

    fn letter(self) -> char {
        match self {
            Kind::King => 'k',
            Kind::Queen => 'q',
            Kind::Rook => 'r',
            Kind::Bishop => 'b',
            Kind::Knight => 'n',
            Kind::Pawn => 'p',
        }
    }

    fn from_letter(c: char) -> Option<Kind> {
        Some(match c.to_ascii_lowercase() {
            'k' => Kind::King,
            'q' => Kind::Queen,
            'r' => Kind::Rook,
            'b' => Kind::Bishop,
            'n' => Kind::Knight,
            'p' => Kind::Pawn,
            _ => return None,
        })
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Default)]
pub enum Sq {
    #[default]
    Empty,
    Tree,
    Piece(Color, Kind),
}

/// What decides the game.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
pub enum Rules {
    /// Checkmate wins; stalemate is a draw.
    #[default]
    Classic,
    /// Pawn race: the first pawn on the far row wins, and a side that cannot
    /// move loses.
    Pawns,
    /// Only White moves; Black's pieces stand still. Capture them all.
    Solo,
}

/// A position as it crosses the WASM boundary: one string per row, top row
/// first. `KQRBNP` are White, `kqrbnp` Black, `.` empty and `#` a tree.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Position {
    pub width: u8,
    pub height: u8,
    pub rows: Vec<String>,
    pub turn: Color,
    #[serde(default)]
    pub rules: Rules,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Move {
    pub from: u8,
    pub to: u8,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Reason {
    Mate,
    Stalemate,
    /// A pawn reached the far row (pawn race).
    Promoted,
    /// The side to move has no moves (pawn race).
    Stuck,
    /// Every black piece is captured (solo).
    Cleared,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Outcome {
    /// `None` is a draw.
    pub winner: Option<Color>,
    pub reason: Reason,
}

const KNIGHT: [(i8, i8); 8] = [(1, 2), (2, 1), (2, -1), (1, -2), (-1, -2), (-2, -1), (-2, 1), (-1, 2)];
const KING: [(i8, i8); 8] = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)];
const ROOK: [(i8, i8); 4] = [(1, 0), (0, 1), (-1, 0), (0, -1)];
const BISHOP: [(i8, i8); 4] = [(1, 1), (-1, 1), (-1, -1), (1, -1)];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Board {
    pub w: i8,
    pub h: i8,
    pub sq: [Sq; MAX_SIZE * MAX_SIZE],
    pub turn: Color,
    pub rules: Rules,
}

impl Board {
    pub fn empty(w: u8, h: u8, rules: Rules) -> Board {
        Board { w: w as i8, h: h as i8, sq: [Sq::Empty; MAX_SIZE * MAX_SIZE], turn: Color::White, rules }
    }

    pub fn from_position(p: &Position) -> Result<Board, String> {
        let (w, h) = (p.width as usize, p.height as usize);
        if !(2..=MAX_SIZE).contains(&w) || !(2..=MAX_SIZE).contains(&h) || p.rows.len() != h {
            return Err(format!("bad board size {w}×{h}"));
        }
        let mut b = Board::empty(p.width, p.height, p.rules);
        b.turn = p.turn;
        for (y, row) in p.rows.iter().enumerate() {
            let chars: Vec<char> = row.chars().collect();
            if chars.len() != w {
                return Err(format!("row {y} has {} squares, not {w}", chars.len()));
            }
            for (x, c) in chars.into_iter().enumerate() {
                let s = match c {
                    '.' => Sq::Empty,
                    '#' => Sq::Tree,
                    _ => {
                        let kind = Kind::from_letter(c).ok_or_else(|| format!("bad square {c:?}"))?;
                        Sq::Piece(if c.is_ascii_uppercase() { Color::White } else { Color::Black }, kind)
                    }
                };
                b.sq[y * w + x] = s;
            }
        }
        Ok(b)
    }

    pub fn to_position(&self) -> Position {
        let rows = (0..self.h)
            .map(|y| {
                (0..self.w)
                    .map(|x| match self.sq[self.idx(x, y)] {
                        Sq::Empty => '.',
                        Sq::Tree => '#',
                        Sq::Piece(Color::White, k) => k.letter().to_ascii_uppercase(),
                        Sq::Piece(Color::Black, k) => k.letter(),
                    })
                    .collect()
            })
            .collect();
        Position { width: self.w as u8, height: self.h as u8, rows, turn: self.turn, rules: self.rules }
    }

    pub fn cells(&self) -> usize {
        (self.w as usize) * (self.h as usize)
    }

    pub fn idx(&self, x: i8, y: i8) -> usize {
        y as usize * self.w as usize + x as usize
    }

    pub fn xy(&self, i: usize) -> (i8, i8) {
        ((i % self.w as usize) as i8, (i / self.w as usize) as i8)
    }

    fn on(&self, x: i8, y: i8) -> bool {
        x >= 0 && y >= 0 && x < self.w && y < self.h
    }

    pub fn king(&self, c: Color) -> Option<usize> {
        (0..self.cells()).find(|&i| self.sq[i] == Sq::Piece(c, Kind::King))
    }

    pub fn pieces(&self, c: Color) -> impl Iterator<Item = (usize, Kind)> + '_ {
        (0..self.cells()).filter_map(move |i| match self.sq[i] {
            Sq::Piece(pc, k) if pc == c => Some((i, k)),
            _ => None,
        })
    }

    /// Row where `c`'s pawns promote.
    fn last_row(&self, c: Color) -> i8 {
        match c {
            Color::White => 0,
            Color::Black => self.h - 1,
        }
    }

    /// Row from which `c`'s pawns may step two squares, if the board allows it.
    fn double_row(&self, c: Color) -> Option<i8> {
        (self.h >= 6).then(|| match c {
            Color::White => self.h - 2,
            Color::Black => 1,
        })
    }

    /// Is square `i` attacked by a piece of colour `by`?
    pub fn attacked(&self, i: usize, by: Color) -> bool {
        let (x, y) = self.xy(i);
        let is = |x: i8, y: i8, kinds: &[Kind]| {
            self.on(x, y) && matches!(self.sq[self.idx(x, y)], Sq::Piece(c, k) if c == by && kinds.contains(&k))
        };
        // Pawns attack diagonally forward, so look one row back from here.
        let py = y - by.forward();
        if is(x - 1, py, &[Kind::Pawn]) || is(x + 1, py, &[Kind::Pawn]) {
            return true;
        }
        if KNIGHT.iter().any(|&(dx, dy)| is(x + dx, y + dy, &[Kind::Knight])) {
            return true;
        }
        if KING.iter().any(|&(dx, dy)| is(x + dx, y + dy, &[Kind::King])) {
            return true;
        }
        let ray = |dirs: &[(i8, i8)], kinds: &[Kind]| {
            dirs.iter().any(|&(dx, dy)| {
                let (mut cx, mut cy) = (x + dx, y + dy);
                while self.on(cx, cy) {
                    match self.sq[self.idx(cx, cy)] {
                        Sq::Empty => {}
                        Sq::Piece(c, k) => return c == by && kinds.contains(&k),
                        Sq::Tree => return false,
                    }
                    cx += dx;
                    cy += dy;
                }
                false
            })
        };
        ray(&ROOK, &[Kind::Rook, Kind::Queen]) || ray(&BISHOP, &[Kind::Bishop, Kind::Queen])
    }

    pub fn in_check(&self, c: Color) -> bool {
        self.king(c).is_some_and(|k| self.attacked(k, c.other()))
    }

    /// Moves of the piece on `from`, ignoring whether they leave the own king in check.
    fn piece_moves(&self, from: usize, out: &mut Vec<Move>) {
        let Sq::Piece(c, kind) = self.sq[from] else { return };
        let (x, y) = self.xy(from);
        let target = |x: i8, y: i8| -> Option<(usize, Sq)> { self.on(x, y).then(|| (self.idx(x, y), self.sq[self.idx(x, y)])) };
        let mut push = |to: usize| out.push(Move { from: from as u8, to: to as u8 });
        match kind {
            Kind::Pawn => {
                let f = c.forward();
                if let Some((to, Sq::Empty)) = target(x, y + f) {
                    push(to);
                    if self.double_row(c) == Some(y) {
                        if let Some((to2, Sq::Empty)) = target(x, y + 2 * f) {
                            push(to2);
                        }
                    }
                }
                for dx in [-1, 1] {
                    if let Some((to, Sq::Piece(o, _))) = target(x + dx, y + f) {
                        if o != c {
                            push(to);
                        }
                    }
                }
            }
            Kind::Knight | Kind::King => {
                let steps: &[(i8, i8)] = if kind == Kind::Knight { &KNIGHT } else { &KING };
                for &(dx, dy) in steps {
                    match target(x + dx, y + dy) {
                        Some((to, Sq::Empty)) => push(to),
                        Some((to, Sq::Piece(o, _))) if o != c => push(to),
                        _ => {}
                    }
                }
            }
            Kind::Rook | Kind::Bishop | Kind::Queen => {
                let dirs: Vec<(i8, i8)> = match kind {
                    Kind::Rook => ROOK.to_vec(),
                    Kind::Bishop => BISHOP.to_vec(),
                    _ => ROOK.iter().chain(BISHOP.iter()).copied().collect(),
                };
                for (dx, dy) in dirs {
                    let (mut cx, mut cy) = (x + dx, y + dy);
                    while let Some((to, s)) = target(cx, cy) {
                        match s {
                            Sq::Empty => push(to),
                            Sq::Piece(o, _) if o != c => {
                                push(to);
                                break;
                            }
                            _ => break,
                        }
                        cx += dx;
                        cy += dy;
                    }
                }
            }
        }
    }

    /// Legal moves for the side to move. In a pawn race or solo game that
    /// is already decided, there are none.
    pub fn legal_moves(&self) -> Vec<Move> {
        let mut out = Vec::with_capacity(32);
        if self.rules != Rules::Classic && self.outcome_before_moves().is_some() {
            return out;
        }
        for (i, _) in self.pieces(self.turn) {
            self.piece_moves(i, &mut out);
        }
        if self.king(self.turn).is_some() {
            out.retain(|&m| !self.apply(m).in_check(self.turn));
        }
        out
    }

    /// Legal moves of the piece on `from` (for the UI).
    pub fn moves_from(&self, from: usize) -> Vec<Move> {
        self.legal_moves().into_iter().filter(|m| m.from as usize == from).collect()
    }

    pub fn is_legal(&self, m: Move) -> bool {
        self.legal_moves().contains(&m)
    }

    /// Play `m` (assumed legal). Pawns on the far row become queens, except
    /// in a pawn race where reaching it wins.
    pub fn apply(&self, m: Move) -> Board {
        let mut b = *self;
        let mut piece = b.sq[m.from as usize];
        if let Sq::Piece(c, Kind::Pawn) = piece {
            if self.rules != Rules::Pawns && self.xy(m.to as usize).1 == self.last_row(c) {
                piece = Sq::Piece(c, Kind::Queen);
            }
        }
        b.sq[m.to as usize] = piece;
        b.sq[m.from as usize] = Sq::Empty;
        if self.rules != Rules::Solo {
            b.turn = self.turn.other();
        }
        b
    }

    pub fn is_capture(&self, m: Move) -> bool {
        matches!(self.sq[m.to as usize], Sq::Piece(..))
    }

    /// Decisions that don't need the move list (pawn race, solo).
    fn outcome_before_moves(&self) -> Option<Outcome> {
        match self.rules {
            Rules::Classic => None,
            Rules::Solo => self
                .pieces(Color::Black)
                .next()
                .is_none()
                .then_some(Outcome { winner: Some(Color::White), reason: Reason::Cleared }),
            Rules::Pawns => [Color::White, Color::Black].into_iter().find_map(|c| {
                let row = self.last_row(c);
                (0..self.w)
                    .any(|x| self.sq[self.idx(x, row)] == Sq::Piece(c, Kind::Pawn))
                    .then_some(Outcome { winner: Some(c), reason: Reason::Promoted })
            }),
        }
    }

    /// Is the game over, and who won?
    pub fn outcome(&self) -> Option<Outcome> {
        if let Some(o) = self.outcome_before_moves() {
            return Some(o);
        }
        if !self.legal_moves().is_empty() {
            return None;
        }
        Some(match self.rules {
            Rules::Classic if self.in_check(self.turn) => Outcome { winner: Some(self.turn.other()), reason: Reason::Mate },
            Rules::Classic | Rules::Solo => Outcome { winner: None, reason: Reason::Stalemate },
            Rules::Pawns => Outcome { winner: Some(self.turn.other()), reason: Reason::Stuck },
        })
    }

    pub fn is_mate(&self) -> bool {
        self.rules == Rules::Classic && self.in_check(self.turn) && self.legal_moves().is_empty()
    }

    /// Material of `c`, kings excluded.
    pub fn material(&self, c: Color) -> i32 {
        self.pieces(c).map(|(_, k)| k.value()).sum()
    }
}

/// The status shown after every move.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Status {
    pub position: Position,
    pub check: bool,
    pub outcome: Option<Outcome>,
}

pub fn status(b: &Board) -> Status {
    Status { position: b.to_position(), check: b.in_check(b.turn), outcome: b.outcome() }
}

#[cfg(test)]
pub(crate) fn board(rows: &[&str], turn: Color, rules: Rules) -> Board {
    let p = Position {
        width: rows[0].len() as u8,
        height: rows.len() as u8,
        rows: rows.iter().map(|r| r.to_string()).collect(),
        turn,
        rules,
    };
    Board::from_position(&p).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use Color::*;

    fn targets(b: &Board, from: usize) -> Vec<usize> {
        let mut v: Vec<usize> = b.moves_from(from).iter().map(|m| m.to as usize).collect();
        v.sort();
        v
    }

    #[test]
    fn position_round_trip() {
        let b = board(&["k..#", ".p..", "..N.", "K..Q"], White, Rules::Classic);
        assert_eq!(Board::from_position(&b.to_position()).unwrap(), b);
    }

    #[test]
    fn rook_is_blocked_by_trees_and_pieces() {
        let b = board(&["....", ".R#.", ".p..", "...."], White, Rules::Solo);
        // Up to the edge, left to the edge, down onto the pawn, not past the tree.
        assert_eq!(targets(&b, 5), vec![1, 4, 9]);
    }

    #[test]
    fn knight_jumps() {
        let b = board(&["#####", "#####", "##N##", "#####", "#####"], White, Rules::Classic);
        assert!(targets(&b, 12).is_empty(), "trees block landing squares");
        let b = board(&[".....", ".....", "..N..", ".....", "....."], White, Rules::Classic);
        assert_eq!(targets(&b, 12), vec![1, 3, 5, 9, 15, 19, 21, 23]);
    }

    #[test]
    fn pawns_step_capture_and_double_step() {
        let b = board(&["....", ".p..", "P...", "...."], White, Rules::Solo);
        assert_eq!(targets(&b, 8), vec![4, 5]);
        let b = board(&["......", "......", "......", "......", "P.....", "......"], White, Rules::Classic);
        assert_eq!(targets(&b, 24), vec![12, 18], "two steps from the first row on a 6-high board");
        let b = board(&["....", "....", "P...", "...."], White, Rules::Classic);
        assert_eq!(targets(&b, 8), vec![4], "no double step on small boards");
    }

    #[test]
    fn promotion_to_queen() {
        let b = board(&["....", "P...", "....", "k..K"], White, Rules::Classic);
        let a = b.apply(Move { from: 4, to: 0 });
        assert_eq!(a.sq[0], Sq::Piece(White, Kind::Queen));
    }

    #[test]
    fn cannot_move_into_check() {
        let b = board(&["k...", "....", ".R..", "K..."], Black, Rules::Classic);
        // The rook covers file 1 and row 2: a1 (idx 1) and idx 4? (0,1) is on neither.
        assert_eq!(targets(&b, 0), vec![4]);
    }

    #[test]
    fn mate_and_stalemate() {
        let mate = board(&["k.R.", "....", ".K..", "...."], Black, Rules::Classic);
        assert!(mate.is_mate());
        assert_eq!(mate.outcome(), Some(Outcome { winner: Some(White), reason: Reason::Mate }));
        let stale = board(&["k...", "..Q.", ".K..", "...."], Black, Rules::Classic);
        assert_eq!(stale.outcome(), Some(Outcome { winner: None, reason: Reason::Stalemate }));
    }

    #[test]
    fn pawn_race_ends() {
        let b = board(&["P...", "....", "...p", "...."], Black, Rules::Pawns);
        assert_eq!(b.outcome(), Some(Outcome { winner: Some(White), reason: Reason::Promoted }));
        assert!(b.legal_moves().is_empty());
        let stuck = board(&["....", "p...", "P...", "...."], White, Rules::Pawns);
        assert_eq!(stuck.outcome(), Some(Outcome { winner: Some(Black), reason: Reason::Stuck }));
    }

    #[test]
    fn solo_keeps_white_to_move_until_cleared() {
        let b = board(&["p...", "....", "....", "R..."], White, Rules::Solo);
        let a = b.apply(Move { from: 12, to: 0 });
        assert_eq!(a.turn, White);
        assert_eq!(a.outcome(), Some(Outcome { winner: Some(White), reason: Reason::Cleared }));
    }
}
