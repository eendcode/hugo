//! Puzzles from Hugo's haunted house that need a real solver:
//!
//! - **Candles** (lights out): touching a candle flips it and its four
//!   neighbours. Light them all. Solved exactly over GF(2), so the hint is
//!   always on a shortest solution.
//! - **Sliding portrait**: slide the tiles back into place. Breadth-first
//!   search gives the shortest distance and the next move.
//!
//! The other rooms' puzzles are simple enough to live in the browser.

use crate::rng::Rng;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

// ---------- candles ----------

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Candles {
    pub size: u8,
    /// Row by row: is this candle burning?
    pub lit: Vec<bool>,
    /// The fewest touches that light every candle.
    pub par: u32,
}

/// The cells a touch on `i` flips.
fn touch_mask(size: usize, i: usize) -> Vec<usize> {
    let (x, y) = (i % size, i / size);
    let mut v = vec![i];
    if x > 0 {
        v.push(i - 1);
    }
    if x + 1 < size {
        v.push(i + 1);
    }
    if y > 0 {
        v.push(i - size);
    }
    if y + 1 < size {
        v.push(i + size);
    }
    v
}

pub fn touch(size: usize, lit: &mut [bool], i: usize) {
    for j in touch_mask(size, i) {
        lit[j] = !lit[j];
    }
}

/// The fewest touches (a set of cells) that light every candle, or `None`.
pub fn solve_candles(size: usize, lit: &[bool]) -> Option<Vec<usize>> {
    let n = size * size;
    // Rows: one equation per cell; columns: one variable per touch, plus the target.
    let mut rows: Vec<Vec<bool>> = (0..n)
        .map(|cell| {
            let mut r = vec![false; n + 1];
            for t in 0..n {
                r[t] = touch_mask(size, t).contains(&cell);
            }
            r[n] = !lit[cell];
            r
        })
        .collect();
    // Gauss-Jordan elimination over GF(2).
    let mut pivots = Vec::new();
    let mut row = 0;
    for col in 0..n {
        let Some(p) = (row..n).find(|&r| rows[r][col]) else { continue };
        rows.swap(row, p);
        for r in 0..n {
            if r != row && rows[r][col] {
                let pivot = rows[row].clone();
                for (a, b) in rows[r].iter_mut().zip(pivot) {
                    *a ^= b;
                }
            }
        }
        pivots.push(col);
        row += 1;
    }
    if rows[row..].iter().any(|r| r[n]) {
        return None; // inconsistent: can't be solved
    }
    let free: Vec<usize> = (0..n).filter(|c| !pivots.contains(c)).collect();
    // Try every setting of the free touches (at most 2^4 on boards up to 5×5).
    let mut best: Option<Vec<usize>> = None;
    for bits in 0..(1u32 << free.len()) {
        let mut x = vec![false; n];
        for (k, &f) in free.iter().enumerate() {
            x[f] = bits >> k & 1 == 1;
        }
        for (r, &pc) in pivots.iter().enumerate() {
            let mut v = rows[r][n];
            for &f in &free {
                if rows[r][f] && x[f] {
                    v = !v;
                }
            }
            x[pc] = v;
        }
        let set: Vec<usize> = (0..n).filter(|&i| x[i]).collect();
        if best.as_ref().is_none_or(|b| set.len() < b.len()) {
            best = Some(set);
        }
    }
    best
}

/// Candles that `presses` touches (from all burning) have blown out.
pub fn candles(size: u8, presses: usize, seed: u64) -> Candles {
    let s = size as usize;
    let mut rng = Rng::new(seed ^ 0xCA4D);
    loop {
        let mut lit = vec![true; s * s];
        let mut cells: Vec<usize> = (0..s * s).collect();
        rng.shuffle(&mut cells);
        for &c in &cells[..presses.min(s * s)] {
            touch(s, &mut lit, c);
        }
        let Some(sol) = solve_candles(s, &lit) else { continue };
        // Touches can cancel out on boards with a null space; insist on the full count.
        if sol.len() == presses {
            return Candles { size, lit, par: sol.len() as u32 };
        }
    }
}

// ---------- sliding portrait ----------

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Slide {
    pub width: u8,
    pub height: u8,
    /// Row by row: the tile on each square, 1-based; 0 is the gap. Solved is 1, 2, …, n−1, 0.
    pub tiles: Vec<u8>,
    /// Moves in a shortest solution.
    pub par: u32,
}

fn pack(tiles: &[u8]) -> u64 {
    tiles.iter().fold(0u64, |acc, &t| acc << 4 | t as u64)
}

fn unpack(key: u64, n: usize) -> Vec<u8> {
    (0..n).map(|i| (key >> (4 * (n - 1 - i)) & 15) as u8).collect()
}

fn solved(n: usize) -> Vec<u8> {
    (1..n as u8).chain([0]).collect()
}

fn neighbours(w: usize, h: usize, i: usize) -> Vec<usize> {
    let (x, y) = (i % w, i / w);
    let mut v = Vec::with_capacity(4);
    if x > 0 {
        v.push(i - 1);
    }
    if x + 1 < w {
        v.push(i + 1);
    }
    if y > 0 {
        v.push(i - w);
    }
    if y + 1 < h {
        v.push(i + w);
    }
    v
}

/// Positions reachable from `key` in one slide: (new key, square of the tile that moved).
fn slides(w: usize, h: usize, key: u64) -> Vec<(u64, usize)> {
    let n = w * h;
    let tiles = unpack(key, n);
    let gap = tiles.iter().position(|&t| t == 0).expect("a gap");
    neighbours(w, h, gap)
        .into_iter()
        .map(|m| {
            let mut next = tiles.clone();
            next.swap(gap, m);
            (pack(&next), m)
        })
        .collect()
}

type Distances = std::rc::Rc<HashMap<u64, u8>>;

thread_local! {
    static DISTANCES: std::cell::RefCell<HashMap<(usize, usize), Distances>> = Default::default();
}

/// Shortest distance to solved for every position of a w×h board (at most
/// 3×3: 181,440 positions), computed once and kept.
fn distances(w: usize, h: usize) -> Distances {
    DISTANCES.with(|cache| {
        cache
            .borrow_mut()
            .entry((w, h))
            .or_insert_with(|| {
                let goal = pack(&solved(w * h));
                let mut dist = HashMap::new();
                dist.insert(goal, 0u8);
                let mut queue = VecDeque::from([goal]);
                while let Some(cur) = queue.pop_front() {
                    let d = dist[&cur];
                    for (next, _) in slides(w, h, cur) {
                        dist.entry(next).or_insert_with(|| {
                            queue.push_back(next);
                            d + 1
                        });
                    }
                }
                std::rc::Rc::new(dist)
            })
            .clone()
    })
}

/// Shortest solution length, and the square of the tile to slide first.
pub fn solve_slide(w: usize, h: usize, tiles: &[u8]) -> Option<(u32, Option<usize>)> {
    let dist = distances(w, h);
    let key = pack(tiles);
    let d = *dist.get(&key)?;
    let first = slides(w, h, key).into_iter().find(|(next, _)| dist.get(next) == Some(&(d.wrapping_sub(1)))).map(|(_, m)| m);
    Some((d as u32, if d == 0 { None } else { first }))
}

/// A scrambled portrait whose shortest solution is `min..=max` moves.
pub fn slide(width: u8, height: u8, min: u32, max: u32, seed: u64) -> Slide {
    let (w, h) = (width as usize, height as usize);
    let dist = distances(w, h);
    // Sorted, so the same seed picks the same position on every platform.
    let mut candidates: Vec<(u64, u8)> = dist.iter().filter(|&(_, &d)| (min..=max).contains(&(d as u32))).map(|(&k, &d)| (k, d)).collect();
    candidates.sort_unstable();
    let mut rng = Rng::new(seed ^ 0x511D);
    let &(key, d) = rng.pick(&candidates);
    Slide { width, height, tiles: unpack(key, w * h), par: d as u32 }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn candle_solutions_are_shortest_and_work() {
        for size in 3..=5u8 {
            for presses in 1..=6 {
                let c = candles(size, presses, presses as u64 * 31 + size as u64);
                let s = size as usize;
                let sol = solve_candles(s, &c.lit).unwrap();
                assert_eq!(sol.len() as u32, c.par);
                let mut lit = c.lit.clone();
                for &t in &sol {
                    touch(s, &mut lit, t);
                }
                assert!(lit.iter().all(|&l| l), "{size}×{size}, {presses}");
            }
        }
        assert_eq!(solve_candles(3, &[true; 9]), Some(vec![]));
    }

    #[test]
    fn some_candle_boards_have_no_solution() {
        // On 4×4 only some patterns can be solved; one dark corner can't.
        let mut lit = vec![true; 16];
        lit[0] = false;
        assert_eq!(solve_candles(4, &lit), None);
    }

    #[test]
    fn slide_distance_and_hint() {
        // One move from solved: slide tile 8 (on square 8) left into the gap.
        let tiles = [1, 2, 3, 4, 5, 6, 7, 0, 8];
        assert_eq!(solve_slide(3, 3, &tiles), Some((1, Some(8))));
        let s = slide(3, 3, 10, 12, 5);
        let (par, first) = solve_slide(3, 3, &s.tiles).unwrap();
        assert!((10..=12).contains(&par));
        assert_eq!(par, s.par);
        assert!(first.is_some());
        let s = slide(3, 2, 4, 6, 1);
        assert!((4..=6).contains(&s.par));
    }
}
