//! Planken: the chapel door has gaps. Pim nails his planks over them until
//! every gap is closed: planks only on gap cells, no overlap, and every
//! plank used. Planks are small polyominoes (sticks, corners, a square, …)
//! and can be turned.
//!
//! The solver is an exact-cover search. The first open gap cell (in reading
//! order) must be covered by the first square of some plank, so each step
//! tries every kind of plank that is left in each of its distinct turns.
//! Identical planks are counted together and turns that cover the same
//! squares are tried once, so solutions are distinct by *covering*: which
//! cells go together, not which of two equal planks went where.
//!
//! Doors are made by laying random planks next to each other into one
//! connected gap, then keeping only doors whose gap has exactly one covering.

use crate::rng::Rng;
use serde::{Deserialize, Serialize};

/// A plank: a `w`×`h` box of squares, `cells[y * w + x]` true where wood is.
/// A plank's stored shape is how it lies in the tray at turn 0.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Plank {
    pub w: u8,
    pub h: u8,
    pub cells: Vec<bool>,
}

impl Plank {
    fn from_rows(rows: &[&str]) -> Plank {
        let w = rows[0].len();
        Plank { w: w as u8, h: rows.len() as u8, cells: rows.iter().flat_map(|r| r.chars().map(|c| c == '#')).collect() }
    }

    /// The plank turned `rot` quarter turns clockwise. Same as `Block::shape`
    /// and `turn()` in the web code: old (x, y) goes to new (h - 1 - y, x).
    pub fn turned(&self, rot: u8) -> Plank {
        let mut p = self.clone();
        for _ in 0..rot % 4 {
            let (w, h) = (p.w as usize, p.h as usize);
            let mut cells = vec![false; w * h];
            for y in 0..h {
                for x in 0..w {
                    cells[x * h + (h - 1 - y)] = p.cells[y * w + x];
                }
            }
            p = Plank { w: h as u8, h: w as u8, cells };
        }
        p
    }

    /// The squares (x, y) in reading order.
    pub fn squares(&self) -> Vec<(usize, usize)> {
        let w = self.w as usize;
        self.cells.iter().enumerate().filter(|(_, &c)| c).map(|(i, _)| (i % w, i / w)).collect()
    }

    pub fn size(&self) -> usize {
        self.cells.iter().filter(|&&c| c).count()
    }

    /// The same for every turn of the plank: the smallest of its four shapes.
    pub fn canonical(&self) -> Plank {
        (0..4).map(|r| self.turned(r)).min_by_key(|p| (p.w, p.h, p.cells.clone())).unwrap()
    }

    /// Turns that give different shapes, with the turn count for each.
    pub fn turns(&self) -> Vec<(u8, Plank)> {
        let mut out: Vec<(u8, Plank)> = vec![];
        for r in 0..4 {
            let p = self.turned(r);
            if !out.iter().any(|(_, q)| *q == p) {
                out.push((r, p));
            }
        }
        out
    }

    /// One piece of wood: no empty border rows or columns, squares connected.
    fn well_formed(&self) -> Result<(), String> {
        let (w, h) = (self.w as usize, self.h as usize);
        if w == 0 || h == 0 || w > 4 || h > 4 || self.cells.len() != w * h {
            return Err(format!("plank box {w}×{h} with {} cells", self.cells.len()));
        }
        let sq = self.squares();
        if !(0..w).all(|x| sq.iter().any(|s| s.0 == x)) || !(0..h).all(|y| sq.iter().any(|s| s.1 == y)) {
            return Err("plank has an empty row or column".into());
        }
        let mut seen = vec![sq[0]];
        let mut k = 0;
        while k < seen.len() {
            let (x, y) = seen[k];
            for &s in &sq {
                if !seen.contains(&s) && x.abs_diff(s.0) + y.abs_diff(s.1) == 1 {
                    seen.push(s);
                }
            }
            k += 1;
        }
        if seen.len() != sq.len() {
            return Err("plank is in pieces".into());
        }
        Ok(())
    }
}

/// The plank shapes the generator uses.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Shape {
    Stick2,
    Stick3,
    Stick4,
    /// Three squares in an L.
    Corner,
    /// Four squares in an L.
    L,
    Square,
    T,
}

impl Shape {
    pub fn plank(self) -> Plank {
        Plank::from_rows(match self {
            Shape::Stick2 => &["##"],
            Shape::Stick3 => &["###"],
            Shape::Stick4 => &["####"],
            Shape::Corner => &["#.", "##"],
            Shape::L => &["#.", "#.", "##"],
            Shape::Square => &["##", "##"],
            Shape::T => &["###", ".#."],
        })
    }
}

/// A plank on the door: plank `plank` turned `rot`, its box's top-left on `anchor`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Placement {
    pub plank: u8,
    pub rot: u8,
    pub anchor: u8,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Door {
    pub width: u8,
    pub height: u8,
    /// `holes[y * width + x]`: a gap to close.
    pub holes: Vec<bool>,
    /// The tray, in the order shown.
    pub planks: Vec<Plank>,
    /// The one covering, in reading order of each plank's first square.
    pub solution: Vec<Placement>,
    pub seed: u64,
    pub difficulty: u32,
    #[serde(default)]
    pub score: u32,
}

/// The win check: `won` once every gap is closed.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Check {
    pub won: bool,
    /// Gap cells with a plank on them.
    pub covered: Vec<u8>,
}

/// One step towards the covering.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Hint {
    /// Nail this plank here.
    Place { plank: u8, rot: u8, anchor: u8 },
    /// This plank is in the wrong place: take it back to the tray.
    Remove { plank: u8 },
}

/// Planks of one shape, for the search: their distinct turns, each as the
/// offsets of its squares from its first square and that square's x in the
/// box, and for each plank the turn count that gives each of those shapes.
struct Kind {
    planks: Vec<u8>,
    turns: Vec<(Plank, Vec<(i32, i32)>, i32)>,
    rots: Vec<Vec<u8>>,
}

impl Door {
    fn len(&self) -> usize {
        self.width as usize * self.height as usize
    }

    /// The cells a placement covers, or None if it sticks out of the door.
    pub fn covers(&self, p: &Placement) -> Option<Vec<usize>> {
        let plank = self.planks.get(p.plank as usize)?.turned(p.rot);
        let (w, h) = (self.width as usize, self.height as usize);
        let (ax, ay) = (p.anchor as usize % w, p.anchor as usize / w);
        if p.anchor as usize >= self.len() || ax + plank.w as usize > w || ay + plank.h as usize > h {
            return None;
        }
        Some(plank.squares().into_iter().map(|(x, y)| (ay + y) * w + ax + x).collect())
    }

    pub fn validate(&self) -> Result<(), String> {
        if !(2..=8).contains(&self.width) || !(2..=8).contains(&self.height) || self.holes.len() != self.len() {
            return Err(format!("door {}×{} with {} cells", self.width, self.height, self.holes.len()));
        }
        if self.planks.is_empty() {
            return Err("no planks".into());
        }
        for p in &self.planks {
            p.well_formed()?;
        }
        let holes = self.holes.iter().filter(|&&h| h).count();
        let wood: usize = self.planks.iter().map(Plank::size).sum();
        if holes != wood {
            return Err(format!("{holes} gap cells but {wood} squares of plank"));
        }
        Ok(())
    }

    /// The planks grouped by shape.
    fn kinds(&self, avail: &[u8]) -> Vec<Kind> {
        let mut kinds: Vec<(Plank, Kind)> = vec![];
        for &i in avail {
            let canon = self.planks[i as usize].canonical();
            // Equal planks may lie turned differently in the tray.
            let rots = |k: &Kind| k.turns.iter().map(|(s, _, _)| (0..4).find(|&r| self.planks[i as usize].turned(r) == *s).unwrap()).collect();
            if let Some((_, k)) = kinds.iter_mut().find(|(c, _)| *c == canon) {
                k.planks.push(i);
                let r = rots(k);
                k.rots.push(r);
                continue;
            }
            let turns = self.planks[i as usize]
                .turns()
                .into_iter()
                .map(|(_, p)| {
                    let sq = p.squares();
                    let (fx, fy) = (sq[0].0 as i32, sq[0].1 as i32);
                    let offsets = sq.iter().map(|&(x, y)| (x as i32 - fx, y as i32 - fy)).collect();
                    (p, offsets, fx)
                })
                .collect();
            let mut k = Kind { planks: vec![i], turns, rots: vec![] };
            k.rots.push(rots(&k));
            kinds.push((canon, k));
        }
        kinds.into_iter().map(|(_, k)| k).collect()
    }

    /// Coverings of the `open` cells with exactly the planks in `avail`,
    /// up to `limit`, and the search nodes visited.
    fn cover(&self, open: &[bool], avail: &[u8], limit: usize) -> (Vec<Vec<Placement>>, u32) {
        let kinds = self.kinds(avail);
        let mut search = Search { door: self, kinds: &kinds, used: vec![0; kinds.len()], open: open.to_vec(), chosen: vec![], out: vec![], limit, nodes: 0 };
        let wood: usize = avail.iter().map(|&i| self.planks[i as usize].size()).sum();
        if wood == open.iter().filter(|&&o| o).count() {
            search.run();
        }
        (search.out, search.nodes)
    }

    /// Every covering of the whole door, up to `limit`, and the nodes visited.
    pub fn solve(&self, limit: usize) -> (Vec<Vec<Placement>>, u32) {
        let all: Vec<u8> = (0..self.planks.len() as u8).collect();
        self.cover(&self.holes, &all, limit)
    }

    pub fn count(&self, limit: usize) -> usize {
        self.solve(limit).0.len()
    }

    /// The gap cells left open by `placed`; an error if a plank is off the
    /// gaps, on another plank, or placed twice.
    fn open_after(&self, placed: &[Placement]) -> Result<Vec<bool>, String> {
        let mut open = self.holes.clone();
        let mut seen = vec![false; self.planks.len()];
        for p in placed {
            let i = p.plank as usize;
            if i >= seen.len() || std::mem::replace(&mut seen[i], true) {
                return Err(format!("plank {i} is not in the tray"));
            }
            for c in self.covers(p).ok_or(format!("plank {i} sticks out of the door"))? {
                if !std::mem::replace(&mut open[c], false) {
                    return Err(format!("plank {i} is not on an open gap at {c}"));
                }
            }
        }
        Ok(open)
    }
}

struct Search<'a> {
    door: &'a Door,
    kinds: &'a [Kind],
    used: Vec<usize>,
    open: Vec<bool>,
    chosen: Vec<Placement>,
    out: Vec<Vec<Placement>>,
    limit: usize,
    nodes: u32,
}

impl Search<'_> {
    fn run(&mut self) {
        if self.out.len() >= self.limit {
            return;
        }
        self.nodes += 1;
        let Some(first) = self.open.iter().position(|&o| o) else {
            self.out.push(self.chosen.clone());
            return;
        };
        let w = self.door.width as i32;
        let h = self.door.height as i32;
        let (tx, ty) = (first as i32 % w, first as i32 / w);
        for k in 0..self.kinds.len() {
            let kind = &self.kinds[k];
            if self.used[k] == kind.planks.len() {
                continue;
            }
            for (t, (_, offsets, fx)) in kind.turns.iter().enumerate() {
                let cells: Option<Vec<usize>> = offsets
                    .iter()
                    .map(|&(dx, dy)| {
                        let (x, y) = (tx + dx, ty + dy);
                        (x >= 0 && x < w && y < h && self.open[(y * w + x) as usize]).then_some((y * w + x) as usize)
                    })
                    .collect();
                let Some(cells) = cells else { continue };
                // The next plank of this kind goes here.
                let plank = kind.planks[self.used[k]];
                let rot = kind.rots[self.used[k]][t];
                let anchor = (ty * w + tx - fx) as u8;
                cells.iter().for_each(|&c| self.open[c] = false);
                self.used[k] += 1;
                self.chosen.push(Placement { plank, rot, anchor });
                self.run();
                self.chosen.pop();
                self.used[k] -= 1;
                cells.iter().for_each(|&c| self.open[c] = true);
                if self.out.len() >= self.limit {
                    return;
                }
            }
        }
    }
}

pub fn check(door: &Door, placed: &[Placement]) -> Result<Check, String> {
    let open = door.open_after(placed)?;
    let covered = (0..door.len()).filter(|&c| door.holes[c] && !open[c]).map(|c| c as u8).collect();
    Ok(Check { won: !open.contains(&true), covered })
}

/// The next plank of a covering that keeps every plank already placed, or,
/// when there is none, the last placed plank that is not where the door's
/// covering has it. None when the door is closed (or can't be).
pub fn hint(door: &Door, placed: &[Placement]) -> Result<Option<Hint>, String> {
    let open = door.open_after(placed)?;
    if !open.contains(&true) {
        return Ok(None);
    }
    let left: Vec<u8> = (0..door.planks.len() as u8).filter(|i| !placed.iter().any(|p| p.plank == *i)).collect();
    if let Some(rest) = door.cover(&open, &left, 1).0.first() {
        // The search fills cells in reading order, so the first is top-left.
        let p = rest[0];
        return Ok(Some(Hint::Place { plank: p.plank, rot: p.rot, anchor: p.anchor }));
    }
    let Some(full) = door.solve(1).0.into_iter().next() else { return Ok(None) };
    let mut groups: Vec<Vec<usize>> = full.iter().filter_map(|p| door.covers(p)).collect();
    groups.iter_mut().for_each(|g| g.sort_unstable());
    let wrong = placed.iter().rev().find(|p| {
        let mut cells = door.covers(p).unwrap_or_default();
        cells.sort_unstable();
        !groups.contains(&cells)
    });
    Ok(wrong.map(|p| Hint::Remove { plank: p.plank }))
}

// ---------- generation ----------

/// What a door at one difficulty looks like.
#[derive(Clone, Copy, Debug)]
pub struct Params {
    pub width: u8,
    pub height: u8,
    pub planks: usize,
    /// Planks every door at this difficulty has.
    pub must: &'static [Shape],
    /// The other planks come from these.
    pub shapes: &'static [Shape],
    pub holes: (usize, usize),
    /// Planks in the tray lie turned at random (else ready to nail on).
    pub turned: bool,
}

use Shape::*;

/// From two sticks that only need laying down to five planks with a corner and a square.
pub const DIFFICULTIES: [Params; 8] = [
    Params { width: 4, height: 5, planks: 2, must: &[], shapes: &[Stick2, Stick3], holes: (4, 6), turned: false },
    Params { width: 4, height: 5, planks: 2, must: &[], shapes: &[Stick2, Stick3, Stick4], holes: (5, 7), turned: true },
    Params { width: 4, height: 5, planks: 3, must: &[], shapes: &[Stick2, Stick3, Stick4], holes: (7, 9), turned: true },
    Params { width: 4, height: 5, planks: 3, must: &[Corner], shapes: &[Stick2, Stick3], holes: (7, 9), turned: true },
    Params { width: 5, height: 5, planks: 3, must: &[Square], shapes: &[Stick2, Stick3, Corner], holes: (8, 11), turned: true },
    Params { width: 5, height: 6, planks: 4, must: &[L], shapes: &[Stick2, Stick3, Corner], holes: (10, 13), turned: true },
    Params { width: 5, height: 6, planks: 4, must: &[L, Square], shapes: &[Stick2, Stick3], holes: (12, 14), turned: true },
    Params { width: 5, height: 6, planks: 5, must: &[Corner, Square], shapes: &[Stick2, Stick3, L, T], holes: (12, 14), turned: true },
];

pub const MAX_DIFFICULTY: u32 = DIFFICULTIES.len() as u32 - 1;

pub fn generate(seed: u64, difficulty: u32) -> Result<Door, String> {
    let p = DIFFICULTIES.get(difficulty as usize).ok_or(format!("no difficulty {difficulty}"))?;
    generate_with(seed, difficulty, p)
}

pub fn generate_with(seed: u64, difficulty: u32, p: &Params) -> Result<Door, String> {
    let mut rng = Rng::new(seed ^ 0x9A4C);
    let (w, h) = (p.width as usize, p.height as usize);
    'attempt: for _ in 0..20_000 {
        let mut shapes: Vec<Shape> = p.must.to_vec();
        while shapes.len() < p.planks {
            shapes.push(*rng.pick(p.shapes));
        }
        // Lay the planks one by one, each touching the gap so far.
        let mut taken = vec![false; w * h];
        let mut laid: Vec<(Plank, Vec<usize>, usize)> = vec![];
        for (k, s) in shapes.iter().enumerate() {
            let plank = s.plank().turned(rng.below(4) as u8);
            let mut spots = vec![];
            for anchor in 0..w * h {
                let (ax, ay) = (anchor % w, anchor / w);
                if ax + plank.w as usize > w || ay + plank.h as usize > h {
                    continue;
                }
                let cells: Vec<usize> = plank.squares().iter().map(|&(x, y)| (ay + y) * w + ax + x).collect();
                let touches = |c: usize| {
                    let (x, y) = (c % w, c / w);
                    (x > 0 && taken[c - 1]) || (x + 1 < w && taken[c + 1]) || (y > 0 && taken[c - w]) || (y + 1 < h && taken[c + w])
                };
                if cells.iter().all(|&c| !taken[c]) && (k == 0 || cells.iter().any(|&c| touches(c))) {
                    spots.push((anchor, cells));
                }
            }
            if spots.is_empty() {
                continue 'attempt;
            }
            let (anchor, cells) = rng.pick(&spots).clone();
            cells.iter().for_each(|&c| taken[c] = true);
            laid.push((plank, cells, anchor));
        }
        let holes = taken.iter().filter(|&&t| t).count();
        if holes < p.holes.0 || holes > p.holes.1 {
            continue;
        }
        // Move the gap to the middle of the door.
        let cells: Vec<(usize, usize)> = (0..w * h).filter(|&c| taken[c]).map(|c| (c % w, c / w)).collect();
        let (x0, x1) = (cells.iter().map(|c| c.0).min().unwrap(), cells.iter().map(|c| c.0).max().unwrap());
        let (y0, y1) = (cells.iter().map(|c| c.1).min().unwrap(), cells.iter().map(|c| c.1).max().unwrap());
        let (dx, dy) = ((w - (x1 - x0 + 1) + rng.below(2)) / 2, (h - (y1 - y0 + 1) + rng.below(2)) / 2);
        let mut taken = vec![false; w * h];
        for (x, y) in cells {
            taken[(y - y0 + dy) * w + x - x0 + dx] = true;
        }
        // The tray: shuffled, and turned at random if the difficulty says so.
        rng.shuffle(&mut laid);
        let planks: Vec<Plank> = laid.iter().map(|(pl, _, _)| if p.turned { pl.turned(rng.below(4) as u8) } else { pl.clone() }).collect();
        let mut door = Door { width: p.width, height: p.height, holes: taken, planks, solution: vec![], seed, difficulty, score: 0 };
        let (sols, nodes) = door.solve(2);
        if sols.len() != 1 {
            continue;
        }
        // Sticks-only doors whose planks are all one shape are too plain.
        if door.planks.len() > 1 && door.planks.iter().all(|q| q.canonical() == door.planks[0].canonical()) {
            continue;
        }
        door.solution = sols[0].clone();
        let turned = door.solution.iter().filter(|s| door.planks[s.plank as usize].turned(s.rot) != door.planks[s.plank as usize]).count();
        door.score = nodes + door.planks.len() as u32 * 10 + holes as u32 + turned as u32 * 3;
        return Ok(door);
    }
    Err(format!("no door found for seed {seed}"))
}

/// A pack's door: well formed, one covering, and the stored one.
pub fn verify(door: &Door) -> Result<(), String> {
    door.validate()?;
    let (sols, _) = door.solve(2);
    if sols.len() != 1 {
        return Err(format!("{} coverings", sols.len()));
    }
    if sols[0] != door.solution {
        return Err("stored solution is not the covering".into());
    }
    if !check(door, &door.solution)?.won {
        return Err("the solution leaves a gap".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn door(rows: &[&str], planks: Vec<Plank>) -> Door {
        let holes = rows.iter().flat_map(|r| r.chars().map(|c| c == '#')).collect();
        Door { width: rows[0].len() as u8, height: rows.len() as u8, holes, planks, solution: vec![], seed: 0, difficulty: 0, score: 0 }
    }

    #[test]
    fn turning_matches_block_shape() {
        // Corner "#. / ##" turned once: old (x, y) → (h-1-y, x) gives "## / #.".
        let c = Shape::Corner.plank();
        assert_eq!(c.turned(1), Plank::from_rows(&["##", "#."]));
        assert_eq!(c.turned(4), c);
        assert_eq!(Shape::Stick3.plank().turned(1), Plank::from_rows(&["#", "#", "#"]));
        assert_eq!(Shape::Square.plank().turns().len(), 1);
        assert_eq!(Shape::Stick2.plank().turns().len(), 2);
        assert_eq!(Shape::L.plank().turns().len(), 4);
        assert_eq!(Shape::L.plank().turned(3).canonical(), Shape::L.plank().canonical());
    }

    #[test]
    fn counts_coverings_not_plank_swaps() {
        // A 2×2 gap and two 1×2 sticks: side by side or one above the other.
        let d = door(&["##..", "##..", "...."], vec![Shape::Stick2.plank(), Shape::Stick2.plank()]);
        assert_eq!(d.count(10), 2, "two coverings, not four");
        // A 1×4 gap and two sticks of two: one covering.
        let d = door(&["####", "....", "...."], vec![Shape::Stick2.plank(), Shape::Stick2.plank()]);
        assert_eq!(d.count(10), 1);
        // Equal planks lying turned differently in the tray are still equal.
        let d = door(&["####", "....", "...."], vec![Shape::Stick2.plank(), Shape::Stick2.plank().turned(1)]);
        let (sols, _) = d.solve(10);
        assert_eq!(sols.len(), 1);
        assert!(check(&d, &sols[0]).unwrap().won);
        // The square covers it in one way only.
        let d = door(&["##..", "##..", "...."], vec![Shape::Square.plank()]);
        assert_eq!(d.count(10), 1);
    }

    #[test]
    fn zero_one_and_two_solutions() {
        let sticks = || vec![Shape::Stick2.plank(), Shape::Stick3.plank()];
        assert_eq!(door(&["#####", "....."], sticks()).count(10), 2, "2+3 or 3+2");
        assert_eq!(door(&["##.#.", "...##"], sticks()).count(10), 0, "a corner, no stick fits");
        assert_eq!(door(&["###..", "..##."], sticks()).count(10), 1);
        assert_eq!(door(&["####.", "....."], sticks()).count(10), 0, "too few holes");
    }

    #[test]
    fn hint_places_then_takes_back() {
        // "#... / ####": the corner must sit left, the stick of two right.
        let d = door(&["#...", "####"], vec![Shape::Stick2.plank(), Shape::Corner.plank()]);
        assert_eq!(d.count(10), 1);
        let first = hint(&d, &[]).unwrap().unwrap();
        assert_eq!(first, Hint::Place { plank: 1, rot: 0, anchor: 0 });
        // The stick on the two bottom-left cells blocks the corner: take it back.
        let wrong = Placement { plank: 0, rot: 0, anchor: 4 };
        assert_eq!(hint(&d, &[wrong]).unwrap(), Some(Hint::Remove { plank: 0 }));
        let right = Placement { plank: 0, rot: 0, anchor: 6 };
        assert_eq!(hint(&d, &[right]).unwrap(), Some(Hint::Place { plank: 1, rot: 0, anchor: 0 }));
        let done = [right, Placement { plank: 1, rot: 0, anchor: 0 }];
        assert!(check(&d, &done).unwrap().won);
        assert_eq!(hint(&d, &done).unwrap(), None);
    }

    #[test]
    fn check_rejects_bad_placements() {
        let d = door(&["##.", "..."], vec![Shape::Stick2.plank()]);
        assert!(check(&d, &[Placement { plank: 0, rot: 0, anchor: 1 }]).is_err(), "half on wood");
        assert!(check(&d, &[Placement { plank: 0, rot: 0, anchor: 2 }]).is_err(), "off the door");
        assert!(check(&d, &[Placement { plank: 1, rot: 0, anchor: 0 }]).is_err(), "no such plank");
        let c = check(&d, &[]).unwrap();
        assert!(!c.won && c.covered.is_empty());
        assert!(check(&d, &[Placement { plank: 0, rot: 2, anchor: 0 }]).unwrap().won);
    }

    #[test]
    fn every_difficulty_makes_unique_doors() {
        for d in 0..=MAX_DIFFICULTY {
            let p = &DIFFICULTIES[d as usize];
            for seed in 0..8 {
                let door = generate(seed, d).unwrap();
                verify(&door).unwrap();
                assert_eq!(door.planks.len(), p.planks);
                let holes = door.holes.iter().filter(|&&h| h).count();
                assert!((p.holes.0..=p.holes.1).contains(&holes), "d{d}: {holes} holes");
                assert_eq!(generate(seed, d).unwrap(), door, "same seed, same door");
            }
        }
    }
}
