//! Maak de weg vrij: the bokkenrijders parked their carts all over the
//! yard. Slide them out of the way (each cart only moves along its length)
//! until Barend's goat cart can drive out through the gate on the right.
//!
//! A move slides one cart any distance. Levels are chosen by breadth-first
//! search over every position reachable from a random yard, so the number
//! of moves in the shortest solution is exact.

use crate::rng::Rng;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Cart {
    pub x: u8,
    pub y: u8,
    pub len: u8,
    pub horizontal: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Yard {
    pub size: u8,
    /// Cart 0 is Barend's; it is horizontal on the gate's row.
    pub carts: Vec<Cart>,
    /// Moves in a shortest solution.
    pub par: u32,
    pub seed: u64,
    pub difficulty: u32,
    #[serde(default)]
    pub score: u32,
}

/// One move: cart `cart` to position `to` (its x if horizontal, else its y).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Move {
    pub cart: u8,
    pub to: u8,
}

/// Positions along each cart's axis: the whole state.
type State = Vec<u8>;

fn pos(c: &Cart) -> u8 {
    if c.horizontal {
        c.x
    } else {
        c.y
    }
}

impl Yard {
    fn state(&self) -> State {
        self.carts.iter().map(pos).collect()
    }

    fn with(&self, s: &State) -> Vec<Cart> {
        self.carts
            .iter()
            .zip(s)
            .map(|(c, &p)| if c.horizontal { Cart { x: p, ..*c } } else { Cart { y: p, ..*c } })
            .collect()
    }

    fn grid(&self, carts: &[Cart]) -> Vec<i8> {
        let n = self.size as usize;
        let mut g = vec![-1i8; n * n];
        for (k, c) in carts.iter().enumerate() {
            for i in 0..c.len {
                let (x, y) = if c.horizontal { (c.x + i, c.y) } else { (c.x, c.y + i) };
                g[y as usize * n + x as usize] = k as i8;
            }
        }
        g
    }

    fn solved(&self, s: &State) -> bool {
        s[0] + self.carts[0].len == self.size
    }

    /// Every move from `s`.
    fn moves(&self, s: &State) -> Vec<(Move, State)> {
        let carts = self.with(s);
        let g = self.grid(&carts);
        let n = self.size as i32;
        let mut out = vec![];
        for (k, c) in carts.iter().enumerate() {
            let free = |x: i32, y: i32| x >= 0 && y >= 0 && x < n && y < n && g[(y * n + x) as usize] < 0;
            let (cx, cy, len) = (c.x as i32, c.y as i32, c.len as i32);
            for dir in [-1, 1] {
                let mut step = 1;
                loop {
                    let ok = if c.horizontal {
                        let x = if dir < 0 { cx - step } else { cx + len - 1 + step };
                        free(x, cy)
                    } else {
                        let y = if dir < 0 { cy - step } else { cy + len - 1 + step };
                        free(cx, y)
                    };
                    if !ok {
                        break;
                    }
                    let mut next = s.clone();
                    next[k] = (pos(c) as i32 + dir * step) as u8;
                    out.push((Move { cart: k as u8, to: next[k] }, next));
                    step += 1;
                }
            }
        }
        out
    }

    /// Shortest number of moves to free Barend, and the first move.
    pub fn solve_from(&self, s: &State) -> Option<(u32, Option<Move>)> {
        if self.solved(s) {
            return Some((0, None));
        }
        let mut first: HashMap<State, (u32, Move)> = HashMap::new();
        let mut queue = VecDeque::new();
        for (m, next) in self.moves(s) {
            if next != *s && !first.contains_key(&next) {
                if self.solved(&next) {
                    return Some((1, Some(m)));
                }
                first.insert(next.clone(), (1, m));
                queue.push_back(next);
            }
        }
        while let Some(cur) = queue.pop_front() {
            let (d, m0) = first[&cur];
            for (_, next) in self.moves(&cur) {
                if next == *s || first.contains_key(&next) {
                    continue;
                }
                if self.solved(&next) {
                    return Some((d + 1, Some(m0)));
                }
                first.insert(next.clone(), (d + 1, m0));
                queue.push_back(next);
            }
        }
        None
    }

    pub fn solve(&self) -> Option<u32> {
        self.solve_from(&self.state()).map(|(d, _)| d)
    }
}

pub fn hint(y: &Yard, positions: &[u8]) -> Option<Move> {
    y.solve_from(&positions.to_vec()).and_then(|(_, m)| m)
}

// ---------- generation ----------

#[derive(Clone, Copy, Debug)]
pub struct Params {
    pub carts: (usize, usize),
    pub par: (u32, u32),
}

pub const SIZE: u8 = 6;
pub const GATE_ROW: u8 = 2;

pub fn generate(seed: u64, difficulty: u32, p: &Params) -> Result<Yard, String> {
    let mut rng = Rng::new(seed ^ 0xCA27);
    let n = SIZE as usize;
    for _ in 0..3_000 {
        let mut yard = Yard { size: SIZE, carts: vec![Cart { x: rng.below(3) as u8, y: GATE_ROW, len: 2, horizontal: true }], par: 0, seed, difficulty, score: 0 };
        let want = p.carts.0 + rng.below(p.carts.1 - p.carts.0 + 1);
        let mut tries = 0;
        while yard.carts.len() < want && tries < 200 {
            tries += 1;
            let horizontal = rng.chance(0.5);
            let len = if rng.chance(0.3) { 3 } else { 2 };
            // No horizontal cart on the gate row: it could never get out of the way.
            let (x, y) = if horizontal { (rng.below(n - len + 1) as u8, rng.below(n) as u8) } else { (rng.below(n) as u8, rng.below(n - len + 1) as u8) };
            if horizontal && y == GATE_ROW {
                continue;
            }
            let c = Cart { x, y, len: len as u8, horizontal };
            let mut carts = yard.carts.clone();
            carts.push(c);
            let g = yard.grid(&yard.carts);
            let clash = (0..c.len).any(|i| {
                let (cx, cy) = if horizontal { (x + i, y) } else { (x, y + i) };
                g[cy as usize * n + cx as usize] >= 0
            });
            if !clash {
                yard.carts = carts;
            }
        }
        // Explore everything reachable, then measure from the solved end.
        let start = yard.state();
        let mut index: HashMap<State, usize> = HashMap::from([(start.clone(), 0)]);
        let mut states = vec![start];
        let mut edges: Vec<Vec<usize>> = vec![vec![]];
        let mut k = 0;
        while k < states.len() && states.len() < 200_000 {
            let s = states[k].clone();
            for (_, next) in yard.moves(&s) {
                let id = *index.entry(next.clone()).or_insert_with(|| {
                    states.push(next.clone());
                    edges.push(vec![]);
                    states.len() - 1
                });
                edges[k].push(id);
            }
            k += 1;
        }
        let mut dist = vec![u32::MAX; states.len()];
        let mut queue = VecDeque::new();
        for (i, s) in states.iter().enumerate() {
            if yard.solved(s) {
                dist[i] = 0;
                queue.push_back(i);
            }
        }
        while let Some(i) = queue.pop_front() {
            for &j in &edges[i] {
                if dist[j] == u32::MAX {
                    dist[j] = dist[i] + 1;
                    queue.push_back(j);
                }
            }
        }
        let mut fits: Vec<&State> = states.iter().zip(&dist).filter(|&(_, &d)| d >= p.par.0 && d <= p.par.1).map(|(s, _)| s).collect();
        if fits.is_empty() {
            continue;
        }
        fits.sort();
        let chosen = (*rng.pick(&fits)).clone();
        yard.carts = yard.with(&chosen);
        yard.par = yard.solve().ok_or("unsolvable")?;
        yard.score = yard.par * 10 + yard.carts.len() as u32;
        return Ok(yard);
    }
    Err(format!("no yard found for seed {seed}"))
}

pub fn verify(y: &Yard) -> Result<(), String> {
    match y.solve() {
        Some(d) if d == y.par => Ok(()),
        other => Err(format!("shortest {other:?}, level says {}", y.par)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_cart_in_the_way() {
        // Barend at x=0; a vertical cart blocks column 3 over the gate row.
        let y = Yard {
            size: 6,
            carts: vec![Cart { x: 0, y: 2, len: 2, horizontal: true }, Cart { x: 3, y: 1, len: 2, horizontal: false }],
            par: 0,
            seed: 0,
            difficulty: 0,
            score: 0,
        };
        assert_eq!(y.solve(), Some(2));
        let m = hint(&y, &[0, 1]).unwrap();
        assert_eq!(m.cart, 1, "move the blocker first");
    }

    #[test]
    fn generated_yards_hit_their_par() {
        let p = Params { carts: (6, 9), par: (5, 8) };
        for seed in 0..6 {
            let y = generate(seed, 1, &p).unwrap();
            verify(&y).unwrap();
            assert!((5..=8).contains(&y.par), "par {}", y.par);
            assert_eq!(generate(seed, 1, &p).unwrap(), y);
        }
    }
}
