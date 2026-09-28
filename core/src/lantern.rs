//! Lantaarnlicht: Pim's lantern shines a beam across the field. Place the
//! mirrors from the tray so the beam lights every moonstone (the beam
//! passes through them). Walls and the lantern itself stop the beam.
//!
//! A mirror is `/` or `\`. The solver follows the beam and, at every
//! empty cell it crosses, tries passing straight or placing either mirror,
//! within the tray's count. Levels have exactly one set of mirrors on the
//! beam's path that works.

use crate::rng::Rng;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Mirror {
    /// `/`
    Slash,
    /// `\`
    Backslash,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Cell {
    Empty,
    Wall,
    Stone,
    /// A mirror that can't be moved.
    Fixed(Mirror),
    Lantern,
}

/// Beam directions: 0 north, 1 east, 2 south, 3 west.
type Dir = u8;
const DELTA: [(i32, i32); 4] = [(0, -1), (1, 0), (0, 1), (-1, 0)];

fn reflect(m: Mirror, d: Dir) -> Dir {
    match m {
        // `/`: east ↔ north, west ↔ south.
        Mirror::Slash => [1, 0, 3, 2][d as usize],
        // `\`: east ↔ south, west ↔ north.
        Mirror::Backslash => [3, 2, 1, 0][d as usize],
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Field {
    pub width: u8,
    pub height: u8,
    pub cells: Vec<Cell>,
    /// The lantern's cell and the way it shines.
    pub lantern: u8,
    pub facing: Dir,
    /// Mirrors in the tray.
    pub mirrors: u8,
    /// The intended mirrors: (cell, mirror).
    pub solution: Vec<(u8, Mirror)>,
    pub seed: u64,
    pub difficulty: u32,
    #[serde(default)]
    pub score: u32,
}

/// The beam's path: every cell it passes, in order, and the stones it lit.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Beam {
    /// (cell, direction the beam leaves it). The lantern cell comes first.
    pub path: Vec<(u8, Dir)>,
    /// Where the beam stops: a cell it hits (wall, lantern) or −1 off the field.
    pub end: i32,
    pub lit: Vec<u8>,
    pub won: bool,
}

impl Field {
    fn next(&self, cell: usize, d: Dir) -> Option<usize> {
        let (w, h) = (self.width as i32, self.height as i32);
        let (x, y) = (cell as i32 % w + DELTA[d as usize].0, cell as i32 / w + DELTA[d as usize].1);
        (x >= 0 && y >= 0 && x < w && y < h).then(|| (y * w + x) as usize)
    }

    fn stones(&self) -> usize {
        self.cells.iter().filter(|&&c| c == Cell::Stone).count()
    }

    /// Follow the beam with the player's mirrors placed.
    pub fn trace(&self, placed: &HashMap<u8, Mirror>) -> Beam {
        let mut path = vec![(self.lantern, self.facing)];
        let mut seen = HashSet::new();
        let mut lit = Vec::new();
        let (mut cell, mut d) = (self.lantern as usize, self.facing);
        let end = loop {
            let Some(n) = self.next(cell, d) else { break -1 };
            if !seen.insert((n, d)) {
                break n as i32; // a loop: the light goes round in circles
            }
            match self.cells[n] {
                Cell::Wall | Cell::Lantern => break n as i32,
                Cell::Stone => {
                    if !lit.contains(&(n as u8)) {
                        lit.push(n as u8);
                    }
                }
                Cell::Fixed(m) => d = reflect(m, d),
                Cell::Empty => {
                    if let Some(&m) = placed.get(&(n as u8)) {
                        d = reflect(m, d);
                    }
                }
            }
            path.push((n as u8, d));
            cell = n;
        };
        let won = lit.len() == self.stones();
        Beam { path, end, lit, won }
    }

    /// Mirror sets (on the beam's path) that light every stone, up to `limit`.
    pub fn solve(&self, limit: usize) -> Vec<Vec<(u8, Mirror)>> {
        let mut out = Vec::new();
        let mut decided: HashMap<u8, Option<Mirror>> = HashMap::new();
        self.search(self.lantern as usize, self.facing, &mut decided, 0, &mut HashSet::new(), &mut Vec::new(), &mut out, limit, 0);
        out
    }

    #[allow(clippy::too_many_arguments)]
    fn search(
        &self,
        cell: usize,
        d: Dir,
        decided: &mut HashMap<u8, Option<Mirror>>,
        used: u8,
        seen: &mut HashSet<(usize, Dir)>,
        lit: &mut Vec<usize>,
        out: &mut Vec<Vec<(u8, Mirror)>>,
        limit: usize,
        depth: usize,
    ) {
        if out.len() >= limit || depth > 400 {
            return;
        }
        let finish = |decided: &HashMap<u8, Option<Mirror>>, lit: &Vec<usize>, out: &mut Vec<Vec<(u8, Mirror)>>| {
            if lit.len() == self.stones() {
                let mut sol: Vec<(u8, Mirror)> = decided.iter().filter_map(|(&c, &m)| m.map(|m| (c, m))).collect();
                sol.sort_by_key(|&(c, m)| (c, m as u8));
                out.push(sol);
            }
        };
        let Some(n) = self.next(cell, d) else { return finish(decided, lit, out) };
        if seen.contains(&(n, d)) {
            return finish(decided, lit, out);
        }
        seen.insert((n, d));
        match self.cells[n] {
            Cell::Wall | Cell::Lantern => finish(decided, lit, out),
            Cell::Stone => {
                let new = !lit.contains(&n);
                if new {
                    lit.push(n);
                }
                self.search(n, d, decided, used, seen, lit, out, limit, depth + 1);
                if new {
                    lit.pop();
                }
            }
            Cell::Fixed(m) => self.search(n, reflect(m, d), decided, used, seen, lit, out, limit, depth + 1),
            Cell::Empty => match decided.get(&(n as u8)).copied() {
                Some(Some(m)) => self.search(n, reflect(m, d), decided, used, seen, lit, out, limit, depth + 1),
                Some(None) => self.search(n, d, decided, used, seen, lit, out, limit, depth + 1),
                None => {
                    let mut options = vec![None];
                    if used < self.mirrors {
                        options.extend([Some(Mirror::Slash), Some(Mirror::Backslash)]);
                    }
                    for choice in options {
                        decided.insert(n as u8, choice);
                        let nd = choice.map_or(d, |m| reflect(m, d));
                        self.search(n, nd, decided, used + choice.is_some() as u8, seen, lit, out, limit, depth + 1);
                        decided.remove(&(n as u8));
                    }
                }
            },
        }
        seen.remove(&(n, d));
    }
}

/// What to change next: put `mirror` on `cell` (or clear it when `None`).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Hint {
    pub cell: u8,
    pub mirror: Option<Mirror>,
}

/// Walk the intended beam; the first cell where the player's mirrors differ.
pub fn hint(f: &Field, placed: &HashMap<u8, Mirror>) -> Option<Hint> {
    let want: HashMap<u8, Mirror> = f.solution.iter().copied().collect();
    // A wrong mirror on the beam as it is now comes first: it bends the light away.
    for &(cell, _) in f.trace(placed).path.iter().skip(1) {
        if let Some(&m) = placed.get(&cell) {
            if want.get(&cell) != Some(&m) {
                return Some(Hint { cell, mirror: want.get(&cell).copied() });
            }
        }
    }
    for &(cell, _) in f.trace(&want).path.iter().skip(1) {
        if let Some(&m) = want.get(&cell) {
            if placed.get(&cell) != Some(&m) {
                return Some(Hint { cell, mirror: Some(m) });
            }
        }
    }
    None
}

// ---------- generation ----------

#[derive(Clone, Copy, Debug)]
pub struct Params {
    pub size: u8,
    /// Mirrors on the intended path.
    pub turns: (usize, usize),
    pub stones: usize,
    /// Of the turns, how many are fixed mirrors (givens).
    pub fixed: usize,
    /// Extra mirrors in the tray.
    pub spare: u8,
    pub walls: usize,
}

pub fn generate(seed: u64, difficulty: u32, p: &Params) -> Result<Field, String> {
    let mut rng = Rng::new(seed ^ 0x1A7E);
    let s = p.size as i32;
    let n = (s * s) as usize;
    'attempt: for _ in 0..5_000 {
        let mut cells = vec![Cell::Empty; n];
        // The lantern stands on the edge, shining inwards.
        let edge: Vec<(usize, Dir)> = (0..n)
            .filter_map(|i| {
                let (x, y) = (i as i32 % s, i as i32 / s);
                let d = if x == 0 { 1 } else if x == s - 1 { 3 } else if y == 0 { 2 } else if y == s - 1 { 0 } else { return None };
                Some((i, d))
            })
            .collect();
        let &(lantern, facing) = rng.pick(&edge);
        cells[lantern] = Cell::Lantern;
        // Walk a beam with turns; mirrors go where it turns.
        let turns = p.turns.0 + rng.below(p.turns.1 - p.turns.0 + 1);
        let mut path: Vec<usize> = vec![];
        let mut mirrors: Vec<(usize, Mirror)> = vec![];
        let (mut cell, mut d) = (lantern, facing);
        let mut used = HashSet::from([lantern]);
        let mut left = turns;
        loop {
            let run = 1 + rng.below(3);
            for _ in 0..run {
                let dx = DELTA[d as usize];
                let (x, y) = (cell as i32 % s + dx.0, cell as i32 / s + dx.1);
                if x < 0 || y < 0 || x >= s || y >= s || !used.insert((y * s + x) as usize) {
                    continue 'attempt;
                }
                cell = (y * s + x) as usize;
                path.push(cell);
            }
            if left == 0 {
                break;
            }
            // Turn here with a mirror.
            let nd = if rng.chance(0.5) { (d + 1) % 4 } else { (d + 3) % 4 };
            let m = if reflect(Mirror::Slash, d) == nd { Mirror::Slash } else { Mirror::Backslash };
            mirrors.push((cell, m));
            d = nd;
            left -= 1;
        }
        // The beam ends at a wall right after the last cell (or the fence).
        let (ex, ey) = (cell as i32 % s + DELTA[d as usize].0, cell as i32 / s + DELTA[d as usize].1);
        if ex >= 0 && ey >= 0 && ex < s && ey < s {
            cells[(ey * s + ex) as usize] = Cell::Wall;
        }
        // Stones on straight stretches of the path, the last one near the end.
        let straight: Vec<usize> = path.iter().copied().filter(|c| !mirrors.iter().any(|&(m, _)| m == *c)).collect();
        if straight.len() < p.stones {
            continue;
        }
        // The last stone sits at the far end, so the beam has to go all the way.
        let last = *straight.last().unwrap();
        let mut others = straight[..straight.len() - 1].to_vec();
        rng.shuffle(&mut others);
        let mut stones: Vec<usize> = others.into_iter().take(p.stones.saturating_sub(1)).collect();
        stones.push(last);
        if stones.len() < p.stones {
            continue;
        }
        for &st in &stones {
            cells[st] = Cell::Stone;
        }
        rng.shuffle(&mut mirrors);
        for &(c, m) in &mirrors[..p.fixed.min(mirrors.len())] {
            cells[c] = Cell::Fixed(m);
        }
        let solution: Vec<(u8, Mirror)> = mirrors[p.fixed.min(mirrors.len())..].iter().map(|&(c, m)| (c as u8, m)).collect();
        // Some walls off the path, as scenery and to cut short cuts.
        let mut off: Vec<usize> = (0..n).filter(|&i| cells[i] == Cell::Empty && !path.contains(&i)).collect();
        rng.shuffle(&mut off);
        for &w in off.iter().take(p.walls) {
            cells[w] = Cell::Wall;
        }
        let mut f = Field {
            width: p.size,
            height: p.size,
            cells,
            lantern: lantern as u8,
            facing,
            mirrors: solution.len() as u8 + p.spare,
            solution: {
                let mut v = solution.clone();
                v.sort_by_key(|&(c, m)| (c, m as u8));
                v
            },
            seed,
            difficulty,
            score: 0,
        };
        // Repair: wall off the cells other solutions use, or fix a mirror, until one is left.
        for _ in 0..30 {
            let sols = f.solve(2);
            if sols.len() == 1 && sols[0] == f.solution {
                let explored = count_nodes(&f);
                f.score = turns as u32 * 10 + p.stones as u32 * 5 + explored.min(200) / 10;
                return Ok(f);
            }
            if !sols.contains(&f.solution) {
                continue 'attempt;
            }
            let other = sols.iter().find(|s| **s != f.solution).unwrap();
            let on_path: HashSet<usize> = f.trace(&f.solution.iter().copied().collect()).path.iter().map(|&(c, _)| c as usize).collect();
            // A cell only the other solution uses and the real beam never crosses: wall it.
            let other_cells: Vec<usize> = f
                .trace(&other.iter().copied().collect())
                .path
                .iter()
                .map(|&(c, _)| c as usize)
                .filter(|c| f.cells[*c] == Cell::Empty && !on_path.contains(c))
                .collect();
            if let Some(&c) = other_cells.first() {
                f.cells[c] = Cell::Wall;
                continue;
            }
            // Otherwise give away one of the real mirrors where the two differ.
            let diff = f.solution.iter().find(|m| !other.contains(m)).copied();
            // Never give away so many that the puzzle gets easier than its stage.
            let keep = p.turns.0.saturating_sub(p.fixed).max(1);
            match diff {
                Some((c, m)) if f.solution.len() > keep => {
                    f.cells[c as usize] = Cell::Fixed(m);
                    f.solution.retain(|&(x, _)| x != c);
                    f.mirrors -= 1;
                }
                _ => continue 'attempt,
            }
        }
    }
    Err(format!("no lantern field found for seed {seed}"))
}

/// Rough search effort, for scoring: how many partial solutions exist.
fn count_nodes(f: &Field) -> u32 {
    let mut g = f.clone();
    g.cells.iter_mut().for_each(|c| {
        if *c == Cell::Stone {
            *c = Cell::Empty;
        }
    });
    g.solve(60).len() as u32 * 4
}

pub fn verify(f: &Field) -> Result<(), String> {
    if f.solution.is_empty() {
        return Err("nothing to place: the beam already lights every stone".into());
    }
    let sols = f.solve(2);
    if sols.len() != 1 {
        return Err(format!("{} solutions", sols.len()));
    }
    if sols[0] != f.solution {
        return Err("stored solution is not the solution".into());
    }
    if !f.trace(&f.solution.iter().copied().collect()).won {
        return Err("the solution does not light every stone".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn field(rows: &[&str], facing: Dir, mirrors: u8) -> Field {
        let w = rows[0].len();
        let mut lantern = 0;
        let cells = rows
            .iter()
            .enumerate()
            .flat_map(|(y, r)| r.chars().enumerate().map(move |(x, c)| (y * w + x, c)))
            .map(|(i, c)| match c {
                '#' => Cell::Wall,
                'o' => Cell::Stone,
                '/' => Cell::Fixed(Mirror::Slash),
                '\\' => Cell::Fixed(Mirror::Backslash),
                'L' => {
                    lantern = i;
                    Cell::Lantern
                }
                _ => Cell::Empty,
            })
            .collect();
        Field { width: w as u8, height: rows.len() as u8, cells, lantern: lantern as u8, facing, mirrors, solution: vec![], seed: 0, difficulty: 0, score: 0 }
    }

    #[test]
    fn beam_reflects_and_lights_stones() {
        // Lantern shines east; a fixed `\` sends it south through the stone.
        let f = field(&["L..\\", "...o", "...."], 1, 0);
        let b = f.trace(&HashMap::new());
        assert!(b.won);
        assert_eq!(b.lit, vec![7]);
        assert_eq!(b.end, -1);
    }

    #[test]
    fn solver_finds_the_one_mirror() {
        // One mirror at the corner (3) turning south lights the stone at 7.
        let f = field(&["L...", "#..o", "...#"], 1, 1);
        let sols = f.solve(3);
        assert_eq!(sols, vec![vec![(3, Mirror::Backslash)]]);
        let mut placed = HashMap::new();
        assert_eq!(hint(&Field { solution: sols[0].clone(), ..f.clone() }, &placed), Some(Hint { cell: 3, mirror: Some(Mirror::Backslash) }));
        placed.insert(1, Mirror::Slash);
        let g = Field { solution: sols[0].clone(), ..f };
        assert_eq!(hint(&g, &placed), Some(Hint { cell: 1, mirror: None }), "a wrong mirror on the beam goes first");
    }

    #[test]
    fn generated_fields_are_unique() {
        let p = Params { size: 5, turns: (2, 3), stones: 2, fixed: 0, spare: 1, walls: 3 };
        for seed in 0..15 {
            let f = generate(seed, 2, &p).unwrap();
            verify(&f).unwrap();
            assert!(!f.trace(&HashMap::new()).won, "not solved before the first move");
            assert_eq!(generate(seed, 2, &p).unwrap(), f);
        }
    }
}
