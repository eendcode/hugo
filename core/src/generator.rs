//! Seeded level generation and difficulty scoring.
//!
//! 1. Walk a random self-avoiding route (biased towards turns).
//! 2. Put Start and Finish at its ends and treasures along it.
//! 3. Derive tiles, fix some as givens, send the rest to the tray.
//! 4. Fill the other cells with scenery, mist (maybe with lure roads),
//!    robber trails or free space; add decoy pieces; maybe a Dame loop.
//! 5. Repair: while the solver finds a second solution, block a cell it uses
//!    (or fix a piece) until the intended route is the only one.

use crate::model::{Cell, Level, Scenery, Side, Tile, TileKind};
use crate::rng::Rng;
use crate::rules;
use crate::solver::{self, Solution};
use serde::{Deserialize, Serialize};

/// Difficulty knobs. See [`Params::for_difficulty`] for the stage ramp.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Params {
    pub width: u8,
    pub height: u8,
    /// Route length as a fraction of all cells (min, max).
    pub route_frac: (f64, f64),
    /// Fraction of the route's inner cells that are fixed givens.
    pub givens: f64,
    pub decoys: usize,
    pub waypoints: usize,
    pub ordered: bool,
    pub rotatable: bool,
    /// Chance a route tile gets a spare opening (becomes a T-junction).
    pub junction_prob: f64,
    /// Weights for cells off the route: [free, obstacle, mist, robber trail].
    pub fill: [f64; 4],
    /// Chance a mist cell next to the route holds a lure road.
    pub lure_prob: f64,
    /// Length range of the Witte Dame's loop, if any.
    pub patrol: Option<(usize, usize)>,
    /// Accept only levels whose score lands in this band (when possible).
    pub band: (u32, u32),
}

/// Highest difficulty with its own parameters; higher values clamp here.
pub const MAX_DIFFICULTY: u32 = 9;

impl Params {
    /// The difficulty ramp. 0–7 are the eight story stages; 8–9 are extra
    /// hard settings for "Moeilijker" in the adult menu.
    pub fn for_difficulty(difficulty: u32, size: u8) -> Params {
        let d = difficulty.min(MAX_DIFFICULTY);
        let size = size.clamp(4, 8);
        let mut p = Params {
            width: size,
            height: size,
            route_frac: (0.45, 0.6),
            givens: 0.5,
            decoys: 0,
            waypoints: 0,
            ordered: false,
            rotatable: true,
            junction_prob: 0.0,
            fill: [1.0, 3.0, 0.0, 0.0],
            lure_prob: 0.0,
            patrol: None,
            band: (0, u32::MAX),
        };
        match d {
            0 => {}
            1 => {
                p.givens = 0.4;
                p.decoys = 1;
                p.fill = [2.0, 3.0, 0.0, 0.4];
                p.junction_prob = 0.1;
            }
            2 => {
                p.givens = 0.35;
                p.decoys = 1;
                p.waypoints = 1;
                p.fill = [2.0, 2.0, 1.2, 0.3];
                p.lure_prob = 0.3;
                p.junction_prob = 0.1;
            }
            3 => {
                p.givens = 0.3;
                p.decoys = 2;
                p.waypoints = 2;
                p.fill = [2.0, 2.0, 1.5, 0.5];
                p.lure_prob = 0.5;
                p.junction_prob = 0.15;
            }
            4 => {
                p.givens = 0.25;
                p.decoys = 2;
                p.waypoints = 2;
                p.ordered = true;
                p.fill = [2.5, 1.5, 1.5, 0.8];
                p.lure_prob = 0.5;
                p.junction_prob = 0.15;
            }
            5 => {
                p.givens = 0.35;
                p.decoys = 1;
                p.waypoints = 1;
                p.fill = [3.0, 2.0, 0.5, 0.2];
                p.patrol = Some((2, 6));
            }
            6 => {
                p.givens = 0.3;
                p.decoys = 2;
                p.waypoints = 2;
                p.fill = [3.0, 1.5, 1.0, 0.5];
                p.lure_prob = 0.4;
                p.patrol = Some((4, 8));
                p.junction_prob = 0.1;
            }
            _ => {
                p.givens = [0.2, 0.15, 0.1][(d - 7) as usize];
                p.decoys = 3 + (d - 7) as usize;
                p.waypoints = 3;
                p.ordered = true;
                p.route_frac = (0.5, 0.65);
                p.fill = [3.0, 1.0, 1.5, 0.8];
                p.lure_prob = 0.6;
                p.patrol = Some((4, 10));
                p.junction_prob = 0.15;
            }
        }
        // Small boards cannot hold many treasures.
        let max_wp = (size as usize).saturating_sub(3);
        p.waypoints = p.waypoints.min(max_wp);
        if p.waypoints < 2 {
            p.ordered = false;
        }
        p.band = band(d, size);
        p
    }
}

/// Score bands per difficulty: roughly the 10th–90th percentile on a 5×5
/// board from `levelpack calibrate`, scaled linearly with board size.
fn band(d: u32, size: u8) -> (u32, u32) {
    const AT_5: [(u32, u32); 10] =
        [(30, 40), (36, 55), (48, 67), (62, 85), (78, 96), (85, 99), (105, 124), (131, 148), (140, 164), (150, 180)];
    let (lo, hi) = AT_5[d.min(MAX_DIFFICULTY) as usize];
    let scale = |v: u32| (v as f64 * size as f64 / 5.0).round() as u32;
    (scale(lo), scale(hi))
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GenError(pub String);

impl std::fmt::Display for GenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for GenError {}

const MAX_ATTEMPTS: usize = 400;
const REPAIR_ROUNDS: usize = 60;
/// Solver node budget per check while generating; a level that needs more is
/// too hard for a five-year-old anyway.
const GEN_NODE_BUDGET: u64 = 200_000;

/// Generate a level with exactly one solution. The same inputs always give
/// the same level.
pub fn generate(seed: u64, difficulty: u32, size: u8) -> Result<Level, GenError> {
    let params = Params::for_difficulty(difficulty, size);
    generate_with(seed, difficulty, &params)
}

pub fn generate_with(seed: u64, difficulty: u32, params: &Params) -> Result<Level, GenError> {
    let mut rng = Rng::new(seed ^ ((difficulty as u64) << 48) ^ ((params.width as u64) << 56));
    let mut fallback: Option<Level> = None;
    for attempt in 0..MAX_ATTEMPTS {
        let sub = rng.next_u64();
        let Some(mut level) = attempt_level(sub, params) else { continue };
        level.seed = seed;
        level.difficulty = difficulty;
        let (lo, hi) = params.band;
        if (lo..=hi).contains(&level.score) {
            return Ok(level);
        }
        // Keep the closest miss in case nothing lands in the band.
        let miss = |l: &Level| if l.score < lo { lo - l.score } else { l.score - hi };
        if fallback.as_ref().is_none_or(|f| miss(&level) < miss(f)) {
            fallback = Some(level);
        }
        if attempt > MAX_ATTEMPTS / 4 && fallback.is_some() {
            break;
        }
    }
    fallback.ok_or_else(|| GenError(format!("no level found for seed {seed}, difficulty {difficulty}")))
}

/// Random self-avoiding walk of exactly `len` cells, preferring turns.
fn random_path(rng: &mut Rng, w: u8, h: u8, len: usize) -> Option<Vec<usize>> {
    let proto = Level {
        width: w,
        height: h,
        cells: vec![Cell::Empty; w as usize * h as usize],
        tray: vec![],
        rotatable: true,
        ordered: false,
        patrol: vec![],
        seed: 0,
        difficulty: 0,
        score: 0,
    };
    let n = proto.len();
    let start = rng.below(n);
    let mut path = vec![start];
    let mut on = vec![false; n];
    on[start] = true;
    // Per depth: remaining candidate next cells.
    let mut options: Vec<Vec<usize>> = vec![next_steps(rng, &proto, &path, &on)];
    let mut budget = 4000;
    while path.len() < len {
        budget -= 1;
        if budget == 0 {
            return None;
        }
        match options.last_mut().and_then(Vec::pop) {
            Some(c) => {
                on[c] = true;
                path.push(c);
                options.push(next_steps(rng, &proto, &path, &on));
            }
            None => {
                options.pop();
                if path.len() <= 1 {
                    return None;
                }
                on[path.pop().unwrap()] = false;
            }
        }
    }
    (proto.manhattan(path[0], path[len - 1]) >= 2).then_some(path)
}

/// Unvisited neighbours of the path's head, in the order to try them (last first).
fn next_steps(rng: &mut Rng, level: &Level, path: &[usize], on: &[bool]) -> Vec<usize> {
    let head = *path.last().unwrap();
    let heading = (path.len() >= 2).then(|| level.side_towards(path[path.len() - 2], head)).flatten();
    let mut opts: Vec<(f64, usize)> = Side::ALL
        .into_iter()
        .filter_map(|s| level.neighbor(head, s).filter(|&c| !on[c]).map(|c| (s, c)))
        .map(|(s, c)| {
            let straight = heading == Some(s);
            // Turns are more interesting than long straights.
            (rng.float() * if straight { 0.6 } else { 1.0 }, c)
        })
        .collect();
    opts.sort_by(|a, b| a.0.total_cmp(&b.0));
    opts.into_iter().map(|(_, c)| c).collect()
}

/// Mask of sides of `route[k]` that the route uses.
fn route_mask(level: &Level, route: &[usize], k: usize) -> u8 {
    let mut m = 0;
    if k > 0 {
        m |= level.side_towards(route[k], route[k - 1]).unwrap().bit();
    }
    if k + 1 < route.len() {
        m |= level.side_towards(route[k], route[k + 1]).unwrap().bit();
    }
    m
}

fn random_scenery(rng: &mut Rng) -> Scenery {
    Scenery::ALL[rng.weighted(&[3.0, 3.0, 2.0, 1.0])]
}

fn random_tile(rng: &mut Rng, weights: &[f64; 5]) -> Tile {
    let kind = TileKind::ROADS[rng.weighted(weights)];
    Tile::new(kind, rng.below(4) as u8)
}

/// Candidate Dame loops: rectangle outlines and back-and-forth lines.
fn patrol_candidates(level: &Level, rng: &mut Rng, lo: usize, hi: usize) -> Vec<Vec<u16>> {
    let (w, h) = (level.width as i32, level.height as i32);
    let mut out = Vec::new();
    for rw in 2..=w {
        for rh in 2..=h {
            let perim = (2 * (rw + rh) - 4) as usize;
            if perim < lo || perim > hi {
                continue;
            }
            for x0 in 0..=(w - rw) {
                for y0 in 0..=(h - rh) {
                    let mut ring = Vec::new();
                    for x in x0..x0 + rw {
                        ring.push((x, y0));
                    }
                    for y in y0 + 1..y0 + rh {
                        ring.push((x0 + rw - 1, y));
                    }
                    for x in (x0..x0 + rw - 1).rev() {
                        ring.push((x, y0 + rh - 1));
                    }
                    for y in (y0 + 1..y0 + rh - 1).rev() {
                        ring.push((x0, y));
                    }
                    out.push(ring.into_iter().map(|(x, y)| level.index(x, y).unwrap() as u16).collect::<Vec<_>>());
                }
            }
        }
    }
    // Back-and-forth along a line of m cells: loop length 2m - 2.
    for m in 2..=w.max(h) as usize {
        let len = 2 * m - 2;
        if len < lo || len > hi {
            continue;
        }
        for c in 0..level.len() {
            for s in [Side::E, Side::S] {
                let mut line = vec![c];
                while line.len() < m {
                    match level.neighbor(*line.last().unwrap(), s) {
                        Some(n) => line.push(n),
                        None => break,
                    }
                }
                if line.len() == m {
                    let mut ring: Vec<u16> = line.iter().map(|&c| c as u16).collect();
                    ring.extend(line[1..m - 1].iter().rev().map(|&c| c as u16));
                    out.push(ring);
                }
            }
        }
    }
    // Random direction and starting point.
    for ring in &mut out {
        if rng.chance(0.5) {
            ring.reverse();
        }
        let k = rng.below(ring.len());
        ring.rotate_left(k);
    }
    rng.shuffle(&mut out);
    out
}

fn same_solution(a: &Solution, b: &Solution) -> bool {
    a.route == b.route && a.pieces.iter().zip(&b.pieces).all(|(x, y)| x.0 == y.0 && x.1.kind == y.1.kind)
}

/// One generation attempt; `None` if this sub-seed does not work out.
fn attempt_level(seed: u64, p: &Params) -> Option<Level> {
    let mut rng = Rng::new(seed);
    let n = p.width as usize * p.height as usize;
    let frac = p.route_frac.0 + rng.float() * (p.route_frac.1 - p.route_frac.0);
    let min_len = 4 + 2 * p.waypoints;
    let len = ((frac * n as f64).round() as usize).max(min_len).min(n);
    let route = random_path(&mut rng, p.width, p.height, len)?;

    let mut level = Level {
        width: p.width,
        height: p.height,
        cells: vec![Cell::Empty; n],
        tray: vec![],
        rotatable: p.rotatable,
        ordered: p.ordered,
        patrol: vec![],
        seed: 0,
        difficulty: 0,
        score: 0,
    };
    let mut on_route = vec![false; n];
    for &c in &route {
        on_route[c] = true;
    }

    // Tiles along the route.
    let mut tiles: Vec<Tile> = (0..len).map(|k| Tile::from_mask(route_mask(&level, &route, k)).unwrap()).collect();
    for tile in tiles.iter_mut().take(len - 1).skip(1) {
        if rng.chance(p.junction_prob) {
            let free: Vec<Side> = Side::ALL.into_iter().filter(|s| !tile.has(*s)).collect();
            let extra = *rng.pick(&free);
            *tile = Tile::from_mask(tile.mask() | extra.bit()).unwrap();
        }
    }

    // Treasures spread along the route, in route order.
    let inner = len - 2;
    let mut wp_at: Vec<usize> = Vec::new();
    for k in 0..p.waypoints {
        let centre = 1 + (k + 1) * inner / (p.waypoints + 1);
        let jitter = rng.below(3) as i64 - 1;
        let pos = (centre as i64 + jitter).clamp(1, len as i64 - 2) as usize;
        if wp_at.last().is_some_and(|&last| pos <= last + 1) {
            return None;
        }
        wp_at.push(pos);
    }

    // Givens among the other inner cells.
    let mut inner_ix: Vec<usize> = (1..len - 1).filter(|k| !wp_at.contains(k)).collect();
    rng.shuffle(&mut inner_ix);
    let given_count = ((p.givens * inner_ix.len() as f64).round() as usize).min(inner_ix.len().saturating_sub(2));
    let givens: Vec<usize> = inner_ix[..given_count].to_vec();

    for (k, &c) in route.iter().enumerate() {
        let tile = tiles[k];
        level.cells[c] = if k == 0 {
            Cell::Start { tile }
        } else if k == len - 1 {
            Cell::Finish { tile }
        } else if let Some(order) = wp_at.iter().position(|&w| w == k) {
            Cell::Waypoint { tile, order: order as u8 }
        } else if givens.contains(&k) {
            Cell::Road { tile }
        } else {
            level.tray.push(tile);
            Cell::Empty
        };
    }

    // Everything off the route.
    for c in 0..n {
        if on_route[c] {
            continue;
        }
        level.cells[c] = match rng.weighted(&p.fill) {
            0 => Cell::Empty,
            1 => Cell::Obstacle { scenery: random_scenery(&mut rng) },
            2 => {
                let towards: Vec<Side> = Side::ALL.into_iter().filter(|&s| level.neighbor(c, s).is_some_and(|nb| on_route[nb])).collect();
                let tile = (!towards.is_empty() && rng.chance(p.lure_prob)).then(|| {
                    // A lure: a road piece that opens towards the route.
                    let s = *rng.pick(&towards);
                    let others: Vec<Side> = Side::ALL.into_iter().filter(|&o| o != s).collect();
                    let extra = if rng.chance(0.7) { rng.pick(&others).bit() } else { 0 };
                    Tile::from_mask(s.bit() | extra).unwrap()
                });
                Cell::Mist { tile }
            }
            _ => Cell::Trail { tile: random_tile(&mut rng, &[3.0, 3.0, 1.0, 0.0, 2.0]) },
        };
    }

    // The Witte Dame: a loop the intended route slips past, but that catches
    // at least one tempting other route (so the timing really matters).
    if let Some((lo, hi)) = p.patrol {
        let special: Vec<usize> = level
            .cells
            .iter()
            .enumerate()
            .filter(|(_, c)| matches!(c, Cell::Start { .. } | Cell::Finish { .. } | Cell::Waypoint { .. }))
            .map(|(i, _)| i)
            .collect();
        let (others, st) = solver::solve_with_budget(&level, 24, GEN_NODE_BUDGET);
        if st.exhausted {
            return None;
        }
        let others: Vec<Vec<usize>> =
            others.into_iter().map(|s| s.route.into_iter().map(usize::from).collect()).filter(|r: &Vec<usize>| *r != route).collect();
        if others.is_empty() {
            return None;
        }
        let ring = patrol_candidates(&level, &mut rng, lo, hi).into_iter().find(|ring| {
            let mut l = level.clone();
            l.patrol = ring.clone();
            ring.iter().all(|c| !special.contains(&(*c as usize)))
                && rules::dame_issue(&l, &route).is_none()
                && others.iter().any(|r| rules::dame_issue(&l, r).is_some())
        })?;
        level.patrol = ring;
    }

    // Decoy pieces.
    for _ in 0..p.decoys {
        level.tray.push(random_tile(&mut rng, &[3.0, 3.0, 1.0, 0.3, 2.0]));
    }
    if !p.rotatable {
        // Without rotation every piece keeps the orientation it comes in.
        for t in &mut level.tray {
            *t = t.normalized();
        }
    }

    // Repair until the intended route is the only solution.
    let intended = |level: &Level| Solution {
        route: route.iter().map(|&c| c as u16).collect(),
        pieces: route.iter().zip(&tiles).filter(|(c, _)| level.cells[**c].is_empty()).map(|(&c, &t)| (c as u16, t)).collect(),
    };
    let mut stats = solver::Stats::default();
    let mut solved = false;
    for _ in 0..REPAIR_ROUNDS {
        let (sols, st) = solver::solve_with_budget(&level, 2, GEN_NODE_BUDGET);
        stats = st;
        if st.exhausted || sols.is_empty() {
            return None;
        }
        if sols.len() == 1 {
            solved = true;
            break;
        }
        let intended = intended(&level);
        let alt = sols.iter().find(|s| !same_solution(s, &intended))?;
        if let Some(&c) = alt.route.iter().find(|&&c| !on_route[c as usize]) {
            let c = c as usize;
            level.cells[c] = match level.cells[c] {
                Cell::Empty if p.fill[2] > 0.0 && rng.chance(0.35) => Cell::Mist { tile: None },
                Cell::Empty | Cell::Trail { .. } => Cell::Obstacle { scenery: random_scenery(&mut rng) },
                _ => return None,
            };
        } else {
            // Same cells, different pieces: make the intended piece a given.
            let k = alt.pieces.iter().zip(&intended.pieces).position(|(a, b)| a.0 != b.0 || a.1.kind != b.1.kind)?;
            let (c, tile) = intended.pieces.get(k).copied()?;
            let key = |t: &Tile| if p.rotatable { t.kind == tile.kind } else { t.normalized() == tile.normalized() };
            let ix = level.tray.iter().position(key)?;
            level.tray.remove(ix);
            level.cells[c as usize] = Cell::Road { tile };
        }
    }
    // Leave the player something to do.
    if !solved || intended(&level).pieces.len() < 2 {
        return None;
    }

    // The Dame must actually matter: without her there is another way.
    if !level.patrol.is_empty() {
        let mut free = level.clone();
        free.patrol.clear();
        if solver::solve_with_budget(&free, 2, GEN_NODE_BUDGET).0.len() < 2 {
            return None;
        }
    }

    if p.rotatable {
        for t in &mut level.tray {
            *t = Tile::new(t.kind, rng.below(4) as u8);
        }
    }
    rng.shuffle(&mut level.tray);
    level.score = score(&level, &stats, p.decoys);
    Some(level)
}

/// Difficulty score: solver effort plus route length, tray size, decoys and rules.
pub fn score(level: &Level, stats: &solver::Stats, decoys: usize) -> u32 {
    let effort = (stats.nodes as f64).sqrt() * 4.0;
    let tray = level.tray.len() as f64 * 4.0;
    let decoys = decoys as f64 * 6.0;
    let wps = level.waypoints().len() as f64 * 8.0 + if level.ordered { 12.0 } else { 0.0 };
    let dame = if level.patrol.is_empty() { 0.0 } else { 20.0 + level.patrol.len() as f64 * 2.0 };
    (effort + tray + decoys + wps + dame).round() as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::State;

    #[test]
    fn same_seed_same_level() {
        for d in [0, 3, 6] {
            let a = generate(1234, d, 5).unwrap();
            let b = generate(1234, d, 5).unwrap();
            assert_eq!(a, b);
        }
        assert_ne!(generate(1, 2, 5).unwrap(), generate(2, 2, 5).unwrap());
    }

    #[test]
    fn generated_levels_are_unique_and_solvable() {
        for d in 0..=MAX_DIFFICULTY {
            for size in [4, 5, 6] {
                for seed in 0..3 {
                    let l = generate(seed, d, size).unwrap();
                    l.validate().unwrap();
                    assert_eq!(solver::count_solutions(&l, 2), 1, "d{d} size{size} seed{seed}\n{}", crate::ascii::render(&l, None));
                    assert!(!rules::check(&l, &State::empty(&l)).unwrap().won);
                }
            }
        }
    }

    #[test]
    fn features_follow_difficulty() {
        let l = generate(9, 7, 6).unwrap();
        assert_eq!(l.waypoints().len(), 3);
        assert!(l.ordered);
        assert!(!l.patrol.is_empty());
        let easy = generate(9, 0, 4).unwrap();
        assert!(easy.waypoints().is_empty() && easy.patrol.is_empty());
    }

    #[test]
    fn patrol_candidates_are_loops() {
        let l = crate::ascii::parse(". . . .\n. . . .\n. . . .", "").unwrap();
        let mut rng = Rng::new(3);
        let rings = patrol_candidates(&l, &mut rng, 2, 10);
        assert!(!rings.is_empty());
        for r in rings {
            for k in 0..r.len() {
                assert_eq!(l.manhattan(r[k] as usize, r[(k + 1) % r.len()] as usize), 1, "{r:?}");
            }
        }
    }
}
