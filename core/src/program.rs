//! Barends programma: lay a row of cards, press Go, and Barend the goat
//! walks it. He eats every apple he passes and wants to get home to his
//! stable. Trees and the edge of the field stop him.
//!
//! Cards are arrows (step 1–3 cells north/east/south/west), or, in the
//! "turning" stages, forward 1–3 / turn left / turn right from the way he
//! faces. Barend is home as soon as he reaches the stable with every
//! apple eaten; he walks past the stable while apples are left.

use crate::rng::Rng;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Dir {
    N,
    E,
    S,
    W,
}

impl Dir {
    const ALL: [Dir; 4] = [Dir::N, Dir::E, Dir::S, Dir::W];

    fn delta(self) -> (i32, i32) {
        match self {
            Dir::N => (0, -1),
            Dir::E => (1, 0),
            Dir::S => (0, 1),
            Dir::W => (-1, 0),
        }
    }

    fn right(self) -> Dir {
        Dir::ALL[(self as usize + 1) % 4]
    }

    fn left(self) -> Dir {
        Dir::ALL[(self as usize + 3) % 4]
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Card {
    Step { dir: Dir, n: u8 },
    Forward { n: u8 },
    Left,
    Right,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Cell {
    Grass,
    Tree,
    Apple,
    Stable,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Field {
    pub width: u8,
    pub height: u8,
    pub cells: Vec<Cell>,
    pub start: u8,
    pub facing: Dir,
    /// Turning cards (forward/left/right) instead of arrows.
    pub relative: bool,
    /// Room for this many cards.
    pub slots: u8,
    /// The fewest cards that bring Barend home.
    pub best: u8,
    pub seed: u64,
    pub difficulty: u32,
    #[serde(default)]
    pub score: u32,
}

/// How a run ended.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Ending {
    /// Home with every apple.
    Home,
    /// Walked into a tree or the fence at `cell` (−1 when off the field).
    Bump { cell: i32 },
    /// The cards ran out somewhere else.
    Short,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Run {
    /// Barend's cell and facing after every step or turn, starting position first.
    pub steps: Vec<(u8, Dir)>,
    /// Apples eaten, in order.
    pub eaten: Vec<u8>,
    pub ending: Ending,
    /// Cards played before the run ended.
    pub played: usize,
}

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
struct State {
    cell: u8,
    facing: Dir,
    eaten: u16,
}

impl Field {
    fn apples(&self) -> Vec<usize> {
        (0..self.cells.len()).filter(|&i| self.cells[i] == Cell::Apple).collect()
    }

    fn all_eaten(&self) -> u16 {
        (1u16 << self.apples().len()) - 1
    }

    fn is_home(&self, s: State) -> bool {
        self.cells[s.cell as usize] == Cell::Stable && s.eaten == self.all_eaten()
    }

    fn start_state(&self) -> State {
        State { cell: self.start, facing: self.facing, eaten: 0 }
    }

    /// One step in `dir`: the new state, or Err(cell bumped into).
    fn step(&self, s: State, dir: Dir) -> Result<State, i32> {
        let (w, h) = (self.width as i32, self.height as i32);
        let (dx, dy) = dir.delta();
        let (x, y) = (s.cell as i32 % w + dx, s.cell as i32 / w + dy);
        if x < 0 || y < 0 || x >= w || y >= h {
            return Err(-1);
        }
        let to = (y * w + x) as usize;
        if self.cells[to] == Cell::Tree {
            return Err(to as i32);
        }
        let mut eaten = s.eaten;
        if let Some(k) = self.apples().iter().position(|&a| a == to) {
            eaten |= 1 << k;
        }
        Ok(State { cell: to as u8, facing: dir, eaten })
    }

    /// Play one card. Stops early at home. Ok(states after each step) or Err(bump).
    fn play(&self, mut s: State, card: Card, trail: &mut Vec<State>) -> Result<State, i32> {
        match card {
            Card::Left | Card::Right => {
                s.facing = if card == Card::Left { s.facing.left() } else { s.facing.right() };
                trail.push(s);
            }
            Card::Step { n, .. } | Card::Forward { n } => {
                let dir = if let Card::Step { dir, .. } = card { dir } else { s.facing };
                for _ in 0..n {
                    s = self.step(s, dir)?;
                    trail.push(s);
                    if self.is_home(s) {
                        break;
                    }
                }
            }
        }
        Ok(s)
    }

    /// Run a program from the start.
    pub fn run(&self, cards: &[Card]) -> Run {
        let mut s = self.start_state();
        let mut trail = vec![s];
        let mut ending = Ending::Short;
        let mut played = 0;
        for &card in cards {
            played += 1;
            match self.play(s, card, &mut trail) {
                Ok(next) => s = next,
                Err(cell) => {
                    ending = Ending::Bump { cell };
                    break;
                }
            }
            if self.is_home(s) {
                ending = Ending::Home;
                break;
            }
        }
        let apples = self.apples();
        let mut eaten = Vec::new();
        for st in &trail {
            if let Some(k) = apples.iter().position(|&a| a == st.cell as usize) {
                if !eaten.contains(&(apples[k] as u8)) {
                    eaten.push(apples[k] as u8);
                }
            }
        }
        Run { steps: trail.iter().map(|st| (st.cell, st.facing)).collect(), eaten, ending, played }
    }

    fn cards(&self) -> Vec<Card> {
        if self.relative {
            let mut v: Vec<Card> = (1..=3).map(|n| Card::Forward { n }).collect();
            v.extend([Card::Left, Card::Right]);
            v
        } else {
            Dir::ALL.iter().flat_map(|&dir| (1..=3).map(move |n| Card::Step { dir, n })).collect()
        }
    }

    /// The fewest cards home from `from`, as a list of cards.
    fn shortest_from(&self, from: State) -> Option<Vec<Card>> {
        if self.is_home(from) {
            return Some(vec![]);
        }
        let cards = self.cards();
        let mut prev: HashMap<State, (State, Card)> = HashMap::new();
        let mut queue = VecDeque::from([from]);
        let mut seen = std::collections::HashSet::from([from]);
        while let Some(s) = queue.pop_front() {
            for &c in &cards {
                let Ok(next) = self.play(s, c, &mut Vec::new()) else { continue };
                if !seen.insert(next) {
                    continue;
                }
                prev.insert(next, (s, c));
                if self.is_home(next) {
                    let mut path = vec![];
                    let mut cur = next;
                    while cur != from {
                        let (p, c) = prev[&cur];
                        path.push(c);
                        cur = p;
                    }
                    path.reverse();
                    return Some(path);
                }
                queue.push_back(next);
            }
        }
        None
    }

    pub fn shortest(&self) -> Option<Vec<Card>> {
        self.shortest_from(self.start_state())
    }
}

/// What the hint suggests for the cards laid so far.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Hint {
    /// Put this card next.
    Add { card: Card },
    /// Take away the card at `index` (it leads nowhere within the slots).
    Remove { index: usize },
    /// The program already works: press Go.
    Go,
}

pub fn hint(f: &Field, cards: &[Card]) -> Hint {
    // Find the longest prefix that still leads home within the slots.
    for keep in (0..=cards.len()).rev() {
        let mut s = f.start_state();
        let mut ok = true;
        for &c in &cards[..keep] {
            match f.play(s, c, &mut Vec::new()) {
                Ok(n) => s = n,
                Err(_) => {
                    ok = false;
                    break;
                }
            }
            if f.is_home(s) {
                return if keep == cards.len() { Hint::Go } else { Hint::Remove { index: keep } };
            }
        }
        if !ok {
            continue;
        }
        if let Some(rest) = f.shortest_from(s) {
            if keep + rest.len() <= f.slots as usize {
                return if keep < cards.len() {
                    Hint::Remove { index: cards.len() - 1 }
                } else if let Some(&card) = rest.first() {
                    Hint::Add { card }
                } else {
                    Hint::Go
                };
            }
        }
    }
    Hint::Remove { index: cards.len().saturating_sub(1) }
}

// ---------- generation ----------

/// (relative cards, size, trees, apples, best from, best to, spare slots)
#[derive(Clone, Copy, Debug)]
pub struct Params {
    pub relative: bool,
    pub size: u8,
    pub trees: (usize, usize),
    pub apples: (usize, usize),
    pub best: (usize, usize),
    pub spare: usize,
}

pub fn generate(seed: u64, difficulty: u32, p: &Params) -> Result<Field, String> {
    let mut rng = Rng::new(seed ^ 0xB0C5);
    let n = p.size as usize * p.size as usize;
    for _ in 0..20_000 {
        let mut cells = vec![Cell::Grass; n];
        let mut free: Vec<usize> = (0..n).collect();
        rng.shuffle(&mut free);
        let start = free.pop().unwrap();
        let stable = free.pop().unwrap();
        cells[stable] = Cell::Stable;
        let apples = p.apples.0 + rng.below(p.apples.1 - p.apples.0 + 1);
        for _ in 0..apples {
            cells[free.pop().unwrap()] = Cell::Apple;
        }
        let trees = p.trees.0 + rng.below(p.trees.1 - p.trees.0 + 1);
        for _ in 0..trees {
            cells[free.pop().unwrap()] = Cell::Tree;
        }
        let mut f = Field {
            width: p.size,
            height: p.size,
            cells,
            start: start as u8,
            facing: *rng.pick(&Dir::ALL),
            relative: p.relative,
            slots: 0,
            best: 0,
            seed,
            difficulty,
            score: 0,
        };
        let Some(best) = f.shortest().map(|s| s.len()) else { continue };
        if best < p.best.0 || best > p.best.1 {
            continue;
        }
        f.best = best as u8;
        f.slots = (best + p.spare) as u8;
        // Longer walks and more trees in the way are harder.
        let walk = f.shortest().map_or(0, |cs| cs.iter().map(|c| match c {
            Card::Step { n, .. } | Card::Forward { n } => *n as u32,
            _ => 1,
        }).sum());
        f.score = best as u32 * 10 + walk + trees as u32;
        return Ok(f);
    }
    Err(format!("no field found for seed {seed}"))
}

/// Does the field still need exactly `best` cards? (For validation.)
pub fn verify(f: &Field) -> Result<(), String> {
    match f.shortest() {
        Some(s) if s.len() == f.best as usize && f.best <= f.slots => Ok(()),
        Some(s) => Err(format!("shortest is {} cards, level says {} (slots {})", s.len(), f.best, f.slots)),
        None => Err("Barend can't get home".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn field(rows: &[&str], relative: bool) -> Field {
        let w = rows[0].len();
        let mut cells = vec![];
        let mut start = 0;
        for (y, r) in rows.iter().enumerate() {
            for (x, c) in r.chars().enumerate() {
                cells.push(match c {
                    '#' => Cell::Tree,
                    'a' => Cell::Apple,
                    'S' => Cell::Stable,
                    'B' => {
                        start = y * w + x;
                        Cell::Grass
                    }
                    _ => Cell::Grass,
                });
            }
        }
        let mut f = Field {
            width: w as u8,
            height: rows.len() as u8,
            cells,
            start: start as u8,
            facing: Dir::E,
            relative,
            slots: 9,
            best: 0,
            seed: 0,
            difficulty: 0,
            score: 0,
        };
        f.best = f.shortest().map_or(0, |s| s.len() as u8);
        f
    }

    #[test]
    fn arrows_walk_eat_and_bump() {
        let f = field(&["B.a.", "....", "#..S"], false);
        let r = f.run(&[Card::Step { dir: Dir::E, n: 3 }, Card::Step { dir: Dir::S, n: 2 }]);
        assert_eq!(r.ending, Ending::Home);
        assert_eq!(r.eaten, vec![2]);
        let r = f.run(&[Card::Step { dir: Dir::S, n: 2 }]);
        assert_eq!(r.ending, Ending::Bump { cell: 8 });
        let r = f.run(&[Card::Step { dir: Dir::N, n: 1 }]);
        assert_eq!(r.ending, Ending::Bump { cell: -1 });
        assert_eq!(f.best, 2);
    }

    #[test]
    fn home_needs_every_apple() {
        let f = field(&["BS.a"], false);
        let r = f.run(&[Card::Step { dir: Dir::E, n: 1 }]);
        assert_eq!(r.ending, Ending::Short, "apples left: walks on");
        let r = f.run(&[Card::Step { dir: Dir::E, n: 3 }, Card::Step { dir: Dir::W, n: 2 }]);
        assert_eq!(r.ending, Ending::Home);
    }

    #[test]
    fn turning_cards() {
        let f = field(&["B..", "...", "..S"], true);
        let r = f.run(&[Card::Forward { n: 2 }, Card::Right, Card::Forward { n: 2 }]);
        assert_eq!(r.ending, Ending::Home);
        assert_eq!(f.best, 3);
    }

    #[test]
    fn hints_add_remove_go() {
        let f = field(&["B.a.", "....", "#..S"], false);
        assert_eq!(hint(&f, &[]), Hint::Add { card: Card::Step { dir: Dir::E, n: 3 } });
        assert_eq!(hint(&f, &[Card::Step { dir: Dir::S, n: 2 }]), Hint::Remove { index: 0 });
        let good = [Card::Step { dir: Dir::E, n: 3 }, Card::Step { dir: Dir::S, n: 2 }];
        assert_eq!(hint(&f, &good), Hint::Go);
    }

    #[test]
    fn generator_meets_its_params() {
        let p = Params { relative: false, size: 5, trees: (3, 5), apples: (1, 2), best: (3, 5), spare: 1 };
        for seed in 0..20 {
            let f = generate(seed, 1, &p).unwrap();
            verify(&f).unwrap();
            assert!((3..=5).contains(&(f.best as usize)));
            assert_eq!(f.slots, f.best + 1);
            assert_eq!(generate(seed, 1, &p).unwrap(), f);
        }
    }
}
