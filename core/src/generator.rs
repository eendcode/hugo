//! Seeded level generation and difficulty scoring.
//!
//! 1. Walk a random self-avoiding route (biased towards turns).
//! 2. Put Start and Finish at its ends and treasures along it.
//! 3. Derive tiles, fix some as givens, send the rest to the tray.
//! 4. Fill the other cells with scenery, mist (maybe with lure roads),
//!    robber trails or free space; add decoy pieces; maybe a Dame loop.
//! 4b. Carve some stretches of the route into multi-cell blocks (a
//!    rectangle with the road fixed on it); harder levels get more of them.
//! 5. Repair: while the solver finds a second solution, block a cell it uses
//!    (or fix a piece, or drop a spare one) until the intended route is the
//!    only one.

use crate::model::{Block, Cell, Level, Piece, Scenery, Side, Tile, TileKind};
use crate::rng::Rng;
use crate::rules;
use crate::solver::{self, piece_key, PieceKey, PlacedBlock, Solution};
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
    /// Multi-cell blocks carved out of the route.
    pub blocks: usize,
    /// Block sizes (w, h) to choose from; either orientation is used.
    pub block_sizes: Vec<(u8, u8)>,
    /// Decoy blocks added to the tray.
    pub decoy_blocks: usize,
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
            blocks: 0,
            block_sizes: vec![(2, 1)],
            decoy_blocks: 0,
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
        // Blocks: introduced in stage 2, bigger and more of them later on.
        const SMALL: [(u8, u8); 2] = [(2, 1), (3, 1)];
        const ALL: [(u8, u8); 4] = [(2, 1), (3, 1), (2, 2), (3, 2)];
        (p.blocks, p.block_sizes, p.decoy_blocks) = match d {
            0 => (0, vec![], 0),
            1 => (1, vec![(2, 1)], 0),
            2 => (1, SMALL.to_vec(), 0),
            3 => (1, ALL[..3].to_vec(), 0),
            4 => (2, ALL.to_vec(), 0),
            5 => (1, vec![(2, 1), (2, 2)], 0),
            6 => (2, ALL.to_vec(), 1),
            7 => (3, ALL.to_vec(), 1),
            _ => (3 + (d - 8) as usize, ALL.to_vec(), 1),
        };
        if size <= 4 {
            p.block_sizes.retain(|&(w, h)| w * h <= 4);
            p.blocks = p.blocks.min(1);
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
        [(30, 40), (46, 65), (56, 76), (73, 93), (88, 115), (91, 114), (126, 161), (159, 203), (169, 217), (190, 244)];
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
/// Good levels outside the score band to try before taking the closest one.
const BAND_MISSES: usize = 6;
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
    let mut misses = 0;
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
        misses += 1;
        if misses >= BAND_MISSES || attempt > MAX_ATTEMPTS / 4 {
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

/// Pick rectangles over the route to turn into blocks. A block may cover
/// route cells that would otherwise be tray pieces and cells off the route
/// (which stay grass on the block); it needs at least two road cells and
/// mostly road. Returns (anchor, w, h) per block.
fn choose_blocks(rng: &mut Rng, level: &Level, on_route: &[bool], p: &Params) -> Vec<(usize, u8, u8)> {
    let mut taken = vec![false; level.len()];
    let mut out = Vec::new();
    for _ in 0..p.blocks {
        let mut candidates: Vec<(usize, u8, u8, f64)> = Vec::new();
        for &(bw, bh) in &p.block_sizes {
            for (w, h) in [(bw, bh), (bh, bw)] {
                if w == h && (w, h) != (bw, bh) {
                    continue;
                }
                for anchor in 0..level.len() {
                    let shape = Block { w, h, tiles: vec![None; w as usize * h as usize], rot: 0 };
                    let Some(cells) = level.footprint(anchor, &shape) else { continue };
                    let usable = cells.iter().all(|&(c, _)| !taken[c] && (!on_route[c] || level.cells[c].is_empty()));
                    let road = cells.iter().filter(|&&(c, _)| on_route[c]).count();
                    let area = cells.len();
                    if usable && road >= 2 && road + 2 >= area {
                        candidates.push((anchor, w, h, (area * area) as f64));
                    }
                }
            }
        }
        if candidates.is_empty() {
            break;
        }
        let weights: Vec<f64> = candidates.iter().map(|c| c.3).collect();
        let (anchor, w, h, _) = candidates[rng.weighted(&weights)];
        let shape = Block { w, h, tiles: vec![None; w as usize * h as usize], rot: 0 };
        for (c, _) in level.footprint(anchor, &shape).unwrap() {
            taken[c] = true;
        }
        out.push((anchor, w, h));
    }
    out
}

fn random_block(rng: &mut Rng, sizes: &[(u8, u8)]) -> Block {
    let (w, h) = *rng.pick(sizes);
    let n = w as usize * h as usize;
    let mut tiles: Vec<Option<Tile>> = (0..n).map(|_| Some(random_tile(rng, &[3.0, 3.0, 1.0, 0.0, 1.0]))).collect();
    if n > 2 && rng.chance(0.5) {
        tiles[rng.below(n)] = None;
    }
    Block { w, h, tiles, rot: 0 }
}

/// What covers each cell in a solution: 0 + kind for singles, 32 + mask for block cells.
fn coverage(sol: &Solution) -> std::collections::HashMap<u16, u8> {
    sol.signature().into_iter().collect()
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
            Cell::Empty
        };
    }

    // Blocks over stretches of the route; the other free route cells are singles.
    let mut in_block = vec![false; n];
    let mut intended_blocks: Vec<PlacedBlock> = Vec::new();
    for (anchor, w, h) in choose_blocks(&mut rng, &level, &on_route, p) {
        let blank = Block { w, h, tiles: vec![None; w as usize * h as usize], rot: 0 };
        let cells: Vec<(u16, Option<Tile>)> = level
            .footprint(anchor, &blank)
            .unwrap()
            .into_iter()
            .map(|(c, _)| (c as u16, route.iter().position(|&r| r == c).map(|k| tiles[k])))
            .collect();
        for &(c, _) in &cells {
            in_block[c as usize] = true;
        }
        let shape = Block { w, h, tiles: cells.iter().map(|(_, t)| *t).collect(), rot: 0 };
        level.tray.push(Piece::Block(shape.clone()));
        intended_blocks.push(PlacedBlock { anchor: anchor as u16, shape, cells });
    }
    if intended_blocks.len() < p.blocks.min(1) {
        return None;
    }
    for (k, &c) in route.iter().enumerate() {
        if level.cells[c].is_empty() && !in_block[c] {
            level.tray.push(Piece::Single(tiles[k]));
        }
    }

    // Everything off the route (block cells stay free for the block).
    for c in 0..n {
        if on_route[c] || in_block[c] {
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

    // Decoy pieces.
    for _ in 0..p.decoys {
        level.tray.push(Piece::Single(random_tile(&mut rng, &[3.0, 3.0, 1.0, 0.3, 2.0])));
    }
    for _ in 0..p.decoy_blocks {
        level.tray.push(Piece::Block(random_block(&mut rng, &p.block_sizes)));
    }
    if !p.rotatable {
        // Without rotation every piece keeps the orientation it comes in.
        for piece in &mut level.tray {
            if let Piece::Single(t) = piece {
                *t = t.normalized();
            }
        }
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
        let (others, st) = solver::solve_with_budget(&level, 12, GEN_NODE_BUDGET);
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

    // Repair until the intended route is the only solution.
    let intended = |level: &Level| Solution {
        route: route.iter().map(|&c| c as u16).collect(),
        pieces: route
            .iter()
            .zip(&tiles)
            .filter(|(c, _)| level.cells[**c].is_empty() && !in_block[**c])
            .map(|(&c, &t)| (c as u16, t))
            .collect(),
        blocks: intended_blocks.clone(),
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
        let alt = sols.iter().find(|s| !s.same_as(&intended))?;
        if let Some(&c) = alt.route.iter().find(|&&c| !on_route[c as usize] && !in_block[c as usize]) {
            // The other solution leaves the intended route: block that cell.
            let c = c as usize;
            level.cells[c] = match level.cells[c] {
                Cell::Empty if p.fill[2] > 0.0 && rng.chance(0.35) => Cell::Mist { tile: None },
                Cell::Empty | Cell::Trail { .. } => Cell::Obstacle { scenery: random_scenery(&mut rng) },
                _ => return None,
            };
        } else {
            // Same area, different pieces: find the first route cell covered differently.
            let (mine, theirs) = (coverage(&intended), coverage(alt));
            let c = *alt.route.iter().find(|c| mine.get(c) != theirs.get(c))?;
            if let Some(&(_, tile)) = intended.pieces.iter().find(|(pc, _)| *pc == c) {
                // Make the intended single a given.
                let key = piece_key(&level, &Piece::Single(tile));
                let ix = level.tray.iter().position(|t| piece_key(&level, t) == key)?;
                level.tray.remove(ix);
                level.cells[c as usize] = Cell::Road { tile };
            } else {
                // The cell belongs to an intended block, and the other solution
                // covers it differently. Drop a spare piece of the kind it used
                // there; failing that, fix an intended single of that kind as a
                // given so the tray runs short of it.
                let used: PieceKey = if let Some(&(_, t)) = alt.pieces.iter().find(|(pc, _)| *pc == c) {
                    piece_key(&level, &Piece::Single(t))
                } else {
                    let b = alt.blocks.iter().find(|b| b.cells.iter().any(|(bc, _)| *bc == c))?;
                    piece_key(&level, &Piece::Block(b.shape.clone()))
                };
                let needed = intended.pieces.iter().filter(|(_, t)| piece_key(&level, &Piece::Single(*t)) == used).count()
                    + intended.blocks.iter().filter(|b| piece_key(&level, &Piece::Block(b.shape.clone())) == used).count();
                let have: Vec<usize> = (0..level.tray.len()).filter(|&i| piece_key(&level, &level.tray[i]) == used).collect();
                if have.len() > needed {
                    level.tray.remove(*have.last().unwrap());
                } else {
                    let &(gc, tile) = intended.pieces.iter().find(|(_, t)| piece_key(&level, &Piece::Single(*t)) == used)?;
                    level.tray.remove(*have.first()?);
                    level.cells[gc as usize] = Cell::Road { tile };
                }
            }
        }
    }
    // Leave the player something to do.
    let todo = intended(&level);
    if !solved || todo.pieces.len() + todo.blocks.len() < 2 {
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
        for piece in &mut level.tray {
            match piece {
                Piece::Single(t) => *t = Tile::new(t.kind, rng.below(4) as u8),
                Piece::Block(b) => b.rot = rng.below(4) as u8,
            }
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
    let blocks = level.tray.iter().filter(|p| p.is_block()).map(|p| 6.0 + 2.0 * p.road_cells() as f64).sum::<f64>();
    (effort + tray + decoys + wps + dame + blocks).round() as u32
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
        assert!(easy.tray.iter().all(|p| !p.is_block()));
        // More (and bigger) blocks in harder levels.
        let blocks = |d: u32| (0..20).map(|s| generate(s, d, 6).unwrap().tray.iter().filter(|p| p.is_block()).count()).sum::<usize>();
        assert!(blocks(1) >= 15, "stage 2 introduces a block");
        assert!(blocks(7) > blocks(3));
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
