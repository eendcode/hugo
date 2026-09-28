//! Backtracking solver: extends a route from Start cell by cell, choosing
//! tray pieces for free cells, until it reaches Finish with every treasure
//! collected (in order, if required), avoiding mist and the Witte Dame.
//!
//! Blocks (multi-cell pieces) are placed when the route first enters one of
//! their cells; their other cells then act like fixed road for the rest of
//! the route.
//!
//! A solution is identified by its route plus what covers it: single pieces
//! by *kind* (orientations that connect the same way are equal), block cells
//! by their exact tiles. Unused tray pieces do not make distinct solutions.

use crate::model::{Block, Level, Mask, ModelError, Piece, Side, State, Tile, TileKind};
use crate::rules;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

/// A block as placed in a solution.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlacedBlock {
    /// Top-left cell.
    pub anchor: u16,
    /// The block's shape as placed (rotation already applied).
    pub shape: Block,
    /// Covered cells with their tiles (`None` = no road).
    pub cells: Vec<(u16, Option<Tile>)>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Solution {
    /// Cells from Start to Finish.
    pub route: Vec<u16>,
    /// Single pieces on the route's free cells, oriented to connect it.
    pub pieces: Vec<(u16, Tile)>,
    /// Blocks placed on the board.
    #[serde(default)]
    pub blocks: Vec<PlacedBlock>,
}

impl Solution {
    /// What covers the board, for telling solutions apart: single pieces by
    /// kind, block cells by exact tile. Sorted by cell.
    pub fn signature(&self) -> Vec<(u16, u8)> {
        let mut sig: Vec<(u16, u8)> = self.pieces.iter().map(|(c, t)| (*c, t.kind as u8)).collect();
        for b in &self.blocks {
            sig.extend(b.cells.iter().map(|(c, t)| (*c, 32 + t.map_or(0, |t| t.mask()))));
        }
        sig.sort_unstable();
        sig
    }

    /// Same route, same pieces (by the rules in [`Solution::signature`]).
    pub fn same_as(&self, other: &Solution) -> bool {
        self.route == other.route && self.signature() == other.signature()
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Stats {
    /// Search nodes visited (cells stepped into).
    pub nodes: u64,
    /// Nodes where no way forward existed.
    pub dead_ends: u64,
    /// The node budget ran out, so the count may be incomplete.
    pub exhausted: bool,
}

/// Search stops after this many nodes, so a pathological level cannot hang the UI.
pub const DEFAULT_NODE_BUDGET: u64 = 3_000_000;

const FAR: u32 = u32::MAX / 4;

/// Interchangeable pieces share a key. With rotation, a single's key is its
/// kind and a block's key is its canonical shape; without rotation, the
/// orientation it comes in is part of the key.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum PieceKey {
    Single(Tile),
    Block(Block),
}

pub fn piece_key(level: &Level, piece: &Piece) -> PieceKey {
    match piece {
        Piece::Single(t) if level.rotatable => PieceKey::Single(Tile::new(t.kind, 0)),
        Piece::Single(t) => PieceKey::Single(t.normalized()),
        Piece::Block(b) if level.rotatable => PieceKey::Block(b.canonical()),
        Piece::Block(b) => PieceKey::Block(b.shape(b.rot)),
    }
}

/// A group of interchangeable tray pieces, with the shapes the search tries.
struct PieceType {
    key: PieceKey,
    /// For singles: the key tile (kind, and orientation if not rotatable).
    single: Option<Tile>,
    shapes: Vec<Block>,
    /// Per shape: its road cells as (x, y, tile), to try on the route.
    roads: Vec<Vec<(i32, i32, Tile)>>,
}

struct Search<'a> {
    level: &'a Level,
    types: Vec<PieceType>,
    remaining: Vec<u8>,
    /// Road cells the unused pieces could still fill, plus covered road cells
    /// the route has not entered yet.
    cap: u32,
    visited: Vec<bool>,
    path: Vec<usize>,
    /// Singles chosen for route cells.
    chosen: Vec<Option<Tile>>,
    /// Free cells covered by a single or a block, and the tile they now hold.
    covered: Vec<bool>,
    virt: Vec<Option<Tile>>,
    /// Blocks placed so far: (type, shape, anchor).
    blocks: Vec<(usize, usize, usize)>,
    finish: usize,
    all_waypoints: u32,
    /// `dist[k][c]`: fewest free cells to fill going from `c` to waypoint `k`
    /// (the last entry is the finish), ignoring tile shapes.
    dist: Vec<Vec<u32>>,
    /// Ordered levels: free cells needed from waypoint `k` onward to the finish.
    chain: Vec<u32>,
    limit: usize,
    seen: HashSet<(Vec<u16>, Vec<(u16, u8)>)>,
    solutions: Vec<Solution>,
    stats: Stats,
    budget: u64,
}

impl<'a> Search<'a> {
    fn new(level: &'a Level, limit: usize, budget: u64) -> Search<'a> {
        let mut types: Vec<PieceType> = Vec::new();
        let mut remaining: Vec<u8> = Vec::new();
        for piece in &level.tray {
            let key = piece_key(level, piece);
            if let Some(i) = types.iter().position(|t| t.key == key) {
                remaining[i] += 1;
                continue;
            }
            let shapes = match &key {
                PieceKey::Single(t) => vec![Block { w: 1, h: 1, tiles: vec![Some(*t)], rot: 0 }],
                PieceKey::Block(b) if level.rotatable => {
                    let mut shapes: Vec<Block> = Vec::new();
                    for r in 0..4 {
                        let s = b.shape(r);
                        if !shapes.contains(&s) {
                            shapes.push(s);
                        }
                    }
                    shapes
                }
                PieceKey::Block(b) => vec![b.clone()],
            };
            let roads = shapes
                .iter()
                .map(|b| {
                    b.tiles
                        .iter()
                        .enumerate()
                        .filter_map(|(k, t)| t.map(|t| ((k % b.w as usize) as i32, (k / b.w as usize) as i32, t)))
                        .collect()
                })
                .collect();
            let single = match &key {
                PieceKey::Single(t) => Some(*t),
                PieceKey::Block(_) => None,
            };
            types.push(PieceType { key, single, shapes, roads });
            remaining.push(1);
        }
        let waypoints = level.waypoints();
        let finish = level.finish().expect("validated level has a finish");
        let mut dist: Vec<Vec<u32>> = waypoints.iter().map(|&w| fill_distances(level, w)).collect();
        dist.push(fill_distances(level, finish));
        let n = waypoints.len();
        let mut chain = vec![0; n + 1];
        for k in (0..n).rev() {
            let hop = if k + 1 < n { dist[k + 1][waypoints[k]] } else { dist[n][waypoints[k]] };
            chain[k] = hop.saturating_add(chain[k + 1]).min(FAR);
        }
        Search {
            level,
            types,
            remaining,
            cap: level.tray.iter().map(|p| p.road_cells() as u32).sum(),
            visited: vec![false; level.len()],
            path: Vec::new(),
            chosen: vec![None; level.len()],
            covered: vec![false; level.len()],
            virt: vec![None; level.len()],
            blocks: Vec::new(),
            finish,
            all_waypoints: (1u32 << n) - 1,
            dist,
            chain,
            limit,
            seen: HashSet::new(),
            solutions: Vec::new(),
            stats: Stats::default(),
            budget,
        }
    }

    fn run(&mut self) {
        let start = self.level.start().expect("validated level has a start");
        // The Dame may be waiting on the start at tick 0.
        if self.level.meets_dame(start, start, 0) {
            return;
        }
        self.visited[start] = true;
        self.path.push(start);
        self.dfs(start, None, 0, 0);
    }

    fn stop(&self) -> bool {
        self.solutions.len() >= self.limit || self.stats.exhausted
    }

    /// Lower bound on free cells still to fill after standing on `c`.
    fn lower_bound(&self, c: usize, mask: u32, next: usize) -> u32 {
        let n = self.dist.len() - 1;
        if self.level.ordered {
            if next < n {
                self.dist[next][c].saturating_add(self.chain[next])
            } else {
                self.dist[n][c]
            }
        } else {
            (0..n).filter(|k| mask & (1 << k) == 0).map(|k| self.dist[k][c]).fold(self.dist[n][c], u32::max)
        }
    }

    /// The road tile on `c` right now: fixed, or from a piece placed in this search.
    fn tile_at(&self, c: usize) -> Option<Tile> {
        self.level.cells[c].fixed_tile().or(if self.covered[c] { self.virt[c] } else { None })
    }

    fn dfs(&mut self, cur: usize, entry: Option<Side>, mask: u32, next: usize) {
        self.stats.nodes += 1;
        if self.stats.nodes > self.budget {
            self.stats.exhausted = true;
        }
        if self.stop() {
            return;
        }
        if cur == self.finish {
            self.record();
            return;
        }
        let mut progressed = false;
        if let Some(t) = self.tile_at(cur) {
            progressed |= self.exits(cur, t, entry, mask, next);
        } else {
            for ti in 0..self.types.len() {
                if self.remaining[ti] == 0 {
                    continue;
                }
                match self.types[ti].single {
                    Some(key) => progressed |= self.try_single(cur, ti, key, entry, mask, next),
                    None => progressed |= self.try_blocks(cur, ti, entry, mask, next),
                }
            }
        }
        if !progressed {
            self.stats.dead_ends += 1;
        }
    }

    fn exits(&mut self, cur: usize, t: Tile, entry: Option<Side>, mask: u32, next: usize) -> bool {
        let mut progressed = false;
        for s in Side::ALL {
            if t.has(s) && Some(s) != entry {
                progressed |= self.step(cur, s, None, mask, next);
            }
        }
        progressed
    }

    fn try_single(&mut self, cur: usize, ti: usize, key: Tile, entry: Option<Side>, mask: u32, next: usize) -> bool {
        let rots = if self.level.rotatable { 0..key.kind.orientations() } else { key.rot..key.rot + 1 };
        let mut tried: Mask = 0;
        let mut progressed = false;
        for rot in rots {
            let t = Tile::new(key.kind, rot);
            if entry.is_some_and(|e| !t.has(e)) {
                continue;
            }
            for s in Side::ALL {
                if t.has(s) && Some(s) != entry && tried & s.bit() == 0 {
                    tried |= s.bit();
                    progressed |= self.step(cur, s, Some((ti, t)), mask, next);
                }
            }
        }
        progressed
    }

    /// Place a block of type `ti` so that one of its road cells lands on
    /// `cur` and accepts the route from `entry`.
    fn try_blocks(&mut self, cur: usize, ti: usize, entry: Option<Side>, mask: u32, next: usize) -> bool {
        let (cx, cy) = self.level.xy(cur);
        let (gw, gh) = (self.level.width as i32, self.level.height as i32);
        let mut progressed = false;
        for si in 0..self.types[ti].shapes.len() {
            let (w, h) = (self.types[ti].shapes[si].w as i32, self.types[ti].shapes[si].h as i32);
            for ri in 0..self.types[ti].roads[si].len() {
                let (ox, oy, t) = self.types[ti].roads[si][ri];
                if entry.is_some_and(|e| !t.has(e)) {
                    continue;
                }
                let (ax, ay) = (cx - ox, cy - oy);
                if ax < 0 || ay < 0 || ax + w > gw || ay + h > gh {
                    continue;
                }
                let anchor = (ay * gw + ax) as usize;
                let cell_at = |x: i32, y: i32| ((ay + y) * gw + ax + x) as usize;
                let fits = (0..h).all(|y| {
                    (0..w).all(|x| {
                        let c = cell_at(x, y);
                        self.level.cells[c].is_empty() && !self.covered[c] && (c == cur || !self.visited[c])
                    })
                });
                if !fits {
                    continue;
                }
                // Place it: one piece used, its other road cells become reachable capacity.
                self.remaining[ti] -= 1;
                self.cap -= 1;
                let shape = &self.types[ti].shapes[si];
                for y in 0..h {
                    for x in 0..w {
                        let c = cell_at(x, y);
                        self.covered[c] = true;
                        self.virt[c] = shape.tiles[(y * w + x) as usize];
                    }
                }
                self.blocks.push((ti, si, anchor));
                progressed |= self.exits(cur, t, entry, mask, next);
                self.blocks.pop();
                for y in 0..h {
                    for x in 0..w {
                        let c = cell_at(x, y);
                        self.covered[c] = false;
                        self.virt[c] = None;
                    }
                }
                self.cap += 1;
                self.remaining[ti] += 1;
                if self.stop() {
                    return progressed;
                }
            }
        }
        progressed
    }

    /// Try moving from `cur` through side `s`, having put single `choice` on `cur`.
    fn step(&mut self, cur: usize, s: Side, choice: Option<(usize, Tile)>, mask: u32, next: usize) -> bool {
        if self.stop() {
            return false;
        }
        let Some(nb) = self.level.neighbor(cur, s) else { return false };
        if self.visited[nb] {
            return false;
        }
        let cell = &self.level.cells[nb];
        if !cell.passable() {
            return false;
        }
        if self.covered[nb] && self.virt[nb].is_none() {
            return false; // a block cell without road
        }
        if let Some(t) = self.tile_at(nb) {
            if !t.has(s.opposite()) {
                return false;
            }
        }
        let (mask2, next2) = match self.level.waypoint_order(nb) {
            Some(o) if self.level.ordered && o as usize != next => return false,
            Some(o) => (mask | 1 << o, next + 1),
            None => (mask, next),
        };
        if nb == self.finish && mask2 != self.all_waypoints {
            return false;
        }
        if self.level.meets_dame(cur, nb, self.path.len()) {
            return false;
        }
        let used = u32::from(choice.is_some());
        let entering_covered = u32::from(self.covered[nb]);
        let needs_piece = u32::from(cell.is_empty() && !self.covered[nb]);
        let cap_after = self.cap - used - entering_covered;
        if needs_piece + self.lower_bound(nb, mask2, next2) > cap_after {
            return false;
        }

        if let Some((ti, t)) = choice {
            self.remaining[ti] -= 1;
            self.chosen[cur] = Some(t);
            self.covered[cur] = true;
            self.virt[cur] = Some(t);
        }
        let cap_before = self.cap;
        self.cap = cap_after;
        self.visited[nb] = true;
        self.path.push(nb);
        self.dfs(nb, Some(s.opposite()), mask2, next2);
        self.path.pop();
        self.visited[nb] = false;
        self.cap = cap_before;
        if let Some((ti, _)) = choice {
            self.remaining[ti] += 1;
            self.chosen[cur] = None;
            self.covered[cur] = false;
            self.virt[cur] = None;
        }
        true
    }

    fn record(&mut self) {
        let sol = Solution {
            route: self.path.iter().map(|&c| c as u16).collect(),
            pieces: self.path.iter().filter_map(|&c| self.chosen[c].map(|t| (c as u16, t))).collect(),
            blocks: self
                .blocks
                .iter()
                .map(|&(ti, si, anchor)| {
                    let shape = self.types[ti].shapes[si].clone();
                    let cells = self.level.footprint(anchor, &shape).unwrap().into_iter().map(|(c, t)| (c as u16, t)).collect();
                    PlacedBlock { anchor: anchor as u16, shape, cells }
                })
                .collect(),
        };
        if self.seen.insert((sol.route.clone(), sol.signature())) {
            self.solutions.push(sol);
        }
    }
}

/// 0-1 BFS towards `target`: `d[c]` is the fewest free cells entered on a
/// walk from `c` to `target` (not counting `c` itself).
fn fill_distances(level: &Level, target: usize) -> Vec<u32> {
    let mut d = vec![FAR; level.len()];
    d[target] = 0;
    let mut queue = VecDeque::from([target]);
    while let Some(v) = queue.pop_front() {
        let cost = u32::from(level.cells[v].is_empty());
        for s in Side::ALL {
            let Some(u) = level.neighbor(v, s) else { continue };
            if !level.cells[u].passable() {
                continue;
            }
            let nd = d[v] + cost;
            if nd < d[u] {
                d[u] = nd;
                if cost == 0 {
                    queue.push_front(u);
                } else {
                    queue.push_back(u);
                }
            }
        }
    }
    d
}

/// Find up to `limit` distinct solutions.
pub fn solve(level: &Level, limit: usize) -> (Vec<Solution>, Stats) {
    solve_with_budget(level, limit, DEFAULT_NODE_BUDGET)
}

pub fn solve_with_budget(level: &Level, limit: usize, budget: u64) -> (Vec<Solution>, Stats) {
    if limit == 0 || level.validate().is_err() {
        return (vec![], Stats::default());
    }
    let mut search = Search::new(level, limit, budget);
    search.run();
    (search.solutions, search.stats)
}

/// Number of distinct solutions, stopping early at `limit`.
pub fn count_solutions(level: &Level, limit: u32) -> u32 {
    solve(level, limit as usize).0.len() as u32
}

/// One step towards a solution.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Hint {
    /// Put tray piece `piece` with its top-left on `cell`, turned `rot`.
    Place { cell: u16, piece: u16, rot: u8 },
    /// Turn the single piece on `cell` to `rot`.
    Rotate { cell: u16, rot: u8 },
    /// The piece whose top-left is on `cell` is wrong: take it back to the tray.
    Remove { cell: u16 },
}

/// The sides of `route[k]` that the route uses.
fn connections(level: &Level, route: &[u16], k: usize) -> Mask {
    let c = route[k] as usize;
    let mut m = 0;
    if k > 0 {
        m |= level.side_towards(c, route[k - 1] as usize).map_or(0, Side::bit);
    }
    if k + 1 < route.len() {
        m |= level.side_towards(c, route[k + 1] as usize).map_or(0, Side::bit);
    }
    m
}

fn rot_for(kind: TileKind, need: Mask) -> Option<u8> {
    (0..kind.orientations()).find(|&r| Tile::new(kind, r).mask() & need == need)
}

/// A piece the plan still has to put down.
enum Want {
    Single { cell: u16, tile: Tile, need: Mask },
    Block { anchor: u16, shape: Block },
}

/// All steps from `state` to `sol`: removals, then turns, then placements
/// in route order.
fn plan(level: &Level, state: &State, sol: &Solution) -> Vec<Hint> {
    let placements = state.placements(level);
    let mut cover: Vec<Option<usize>> = vec![None; level.len()];
    for (pi, (_, _, cells)) in placements.iter().enumerate() {
        for &(c, _) in cells {
            cover[c] = Some(pi);
        }
    }
    let key_of = |pi: usize| piece_key(level, &level.tray[placements[pi].1.piece as usize]);
    let route_ix: HashMap<u16, usize> = sol.route.iter().enumerate().map(|(k, &c)| (c, k)).collect();

    let mut kept: HashSet<usize> = HashSet::new();
    let mut removed: Vec<usize> = Vec::new();
    let remove = |pi: usize, removed: &mut Vec<usize>| {
        if !removed.contains(&pi) {
            removed.push(pi);
        }
    };
    let mut rotates = Vec::new();
    let mut wants: Vec<(usize, Want)> = Vec::new();

    // Blocks already exactly where the solution has them.
    let mut block_done = vec![false; sol.blocks.len()];
    for (bi, b) in sol.blocks.iter().enumerate() {
        let want: Vec<(usize, Option<Mask>)> = b.cells.iter().map(|&(c, t)| (c as usize, t.map(Tile::mask))).collect();
        let found = placements.iter().enumerate().find(|(pi, (_, p, cells))| {
            !kept.contains(pi)
                && level.tray[p.piece as usize].is_block()
                && key_of(*pi) == PieceKey::Block(if level.rotatable { b.shape.canonical() } else { b.shape.clone() })
                && cells.iter().map(|&(c, t)| (c, t.map(Tile::mask))).collect::<Vec<_>>() == want
        });
        if let Some((pi, _)) = found {
            kept.insert(pi);
            block_done[bi] = true;
        }
    }

    // Singles on the route.
    for (k, &c) in sol.route.iter().enumerate() {
        let Some(&(_, want)) = sol.pieces.iter().find(|(pc, _)| *pc == c) else { continue };
        let need = connections(level, &sol.route, k);
        match cover[c as usize] {
            Some(pi) if !kept.contains(&pi) && placements[pi].0 == c as usize && key_of(pi) == piece_key(level, &Piece::Single(want)) => {
                kept.insert(pi);
                let rot = placements[pi].1.rot;
                if Tile::new(want.kind, rot).mask() & need != need {
                    match rot_for(want.kind, need) {
                        Some(rot) if level.rotatable => rotates.push(Hint::Rotate { cell: c, rot }),
                        _ => {
                            kept.remove(&pi);
                            remove(pi, &mut removed);
                            wants.push((k, Want::Single { cell: c, tile: want, need }));
                        }
                    }
                }
            }
            Some(pi) => {
                remove(pi, &mut removed);
                wants.push((k, Want::Single { cell: c, tile: want, need }));
            }
            None => wants.push((k, Want::Single { cell: c, tile: want, need })),
        }
    }

    // Blocks still to place: clear whatever is in their way.
    for (bi, b) in sol.blocks.iter().enumerate() {
        if block_done[bi] {
            continue;
        }
        for &(c, _) in &b.cells {
            if let Some(pi) = cover[c as usize] {
                if !kept.contains(&pi) {
                    remove(pi, &mut removed);
                }
            }
        }
        let order = b.cells.iter().filter_map(|(c, _)| route_ix.get(c)).min().copied().unwrap_or(usize::MAX);
        wants.push((order, Want::Block { anchor: b.anchor, shape: b.shape.clone() }));
    }

    // Pieces needed vs. pieces free in the tray (including ones about to be removed).
    let on_board: HashSet<u16> = placements.iter().map(|(_, p, _)| p.piece).collect();
    let mut free: HashMap<PieceKey, Vec<u16>> = HashMap::new();
    for (i, piece) in level.tray.iter().enumerate() {
        if !on_board.contains(&(i as u16)) {
            free.entry(piece_key(level, piece)).or_default().push(i as u16);
        }
    }
    let want_key = |w: &Want| match w {
        Want::Single { tile, .. } => piece_key(level, &Piece::Single(*tile)),
        Want::Block { shape, .. } => PieceKey::Block(if level.rotatable { shape.canonical() } else { shape.clone() }),
    };
    let mut needed: HashMap<PieceKey, usize> = HashMap::new();
    for (_, w) in &wants {
        *needed.entry(want_key(w)).or_default() += 1;
    }
    for (k, n) in &needed {
        let returning = removed.iter().filter(|&&pi| key_of(pi) == *k).count();
        let mut short = n.saturating_sub(free.get(k).map_or(0, Vec::len) + returning);
        for pi in 0..placements.len() {
            if short == 0 {
                break;
            }
            if !kept.contains(&pi) && !removed.contains(&pi) && key_of(pi) == *k {
                removed.push(pi);
                short -= 1;
            }
        }
    }

    wants.sort_by_key(|(order, _)| *order);
    let mut places = Vec::new();
    for (_, w) in &wants {
        let pool = free.entry(want_key(w)).or_default();
        // Pieces still on the board get a placeholder id; only the first
        // step of a plan is ever shown, and removals come before placements.
        let piece = if pool.is_empty() { u16::MAX } else { pool.remove(0) };
        let tray = level.tray.get(piece as usize);
        match w {
            Want::Single { cell, tile, need } => {
                let rot = if level.rotatable { rot_for(tile.kind, *need).unwrap_or(tile.rot) } else { tile.rot };
                places.push(Hint::Place { cell: *cell, piece, rot });
            }
            Want::Block { anchor, shape } => {
                let rots: Vec<u8> = match tray {
                    Some(p) if !level.rotatable => vec![p.rot()],
                    _ => (0..4).collect(),
                };
                let rot = tray.and_then(|p| rots.into_iter().find(|&r| p.shape(r) == *shape)).unwrap_or(0);
                places.push(Hint::Place { cell: *anchor, piece, rot });
            }
        }
    }
    removed
        .into_iter()
        .map(|pi| Hint::Remove { cell: placements[pi].0 as u16 })
        .chain(rotates)
        .chain(places)
        .collect()
}

/// The next step towards the solution closest to the player's board, or
/// `None` if the board already wins (or the level has no solution).
pub fn hint(level: &Level, state: &State) -> Result<Option<Hint>, ModelError> {
    if rules::check(level, state)?.won {
        return Ok(None);
    }
    let (sols, _) = solve(level, 16);
    Ok(sols.iter().map(|s| plan(level, state, s)).min_by_key(Vec::len).and_then(|p| p.into_iter().next()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ascii::parse;
    use crate::model::{Cell, Placement};

    fn apply(level: &Level, state: &mut State, h: &Hint) {
        match *h {
            Hint::Place { cell, piece, rot } => state.placed[cell as usize] = Some(Placement { piece, rot }),
            Hint::Rotate { cell, rot } => state.placed[cell as usize].as_mut().unwrap().rot = rot,
            Hint::Remove { cell } => state.placed[cell as usize] = None,
        }
        state.validate(level).unwrap();
    }

    /// Following hints from any board must reach a win.
    fn hints_solve(level: &Level, mut state: State) {
        for _ in 0..(level.len() * 3) {
            match hint(level, &state).unwrap() {
                Some(h) => apply(level, &mut state, &h),
                None => break,
            }
        }
        assert!(rules::check(level, &state).unwrap().won, "hints did not solve:\n{}", crate::ascii::render(level, Some(&state.board(level))));
    }

    /// 3×3 board with one forced route 0,3,4,7,8 of three curves.
    const ZIGZAG: &str = "S╷ # #
                          . . #
                          # . F╴";

    #[test]
    fn finds_known_solution() {
        let l = parse(ZIGZAG, "┐└┌│").unwrap();
        let (sols, stats) = solve(&l, 5);
        assert_eq!(sols.len(), 1, "{sols:?}");
        assert_eq!(sols[0].route, vec![0, 3, 4, 7, 8]);
        let kinds: Vec<TileKind> = sols[0].pieces.iter().map(|(_, t)| t.kind).collect();
        assert_eq!(kinds, vec![TileKind::Curve, TileKind::Curve, TileKind::Curve]);
        assert!(stats.nodes > 0);
        assert!(!stats.exhausted);
    }

    #[test]
    fn zero_solutions() {
        let l = parse("S╶ . F╴", "┘").unwrap();
        assert_eq!(count_solutions(&l, 2), 0);
        let l = parse("S╶ . . F╴", "─").unwrap(); // not enough pieces
        assert_eq!(count_solutions(&l, 2), 0);
    }

    #[test]
    fn one_and_two_solutions() {
        let l = parse(
            "S╷ . F╷
             . . .",
            "┐└┘┌─",
        )
        .unwrap();
        assert_eq!(count_solutions(&l, 5), 1);

        // Round an obstacle, above or below.
        let l = parse(
            "# . . . #
             S╶ . # . F╴
             # . . . #",
            "┘┌┐└─",
        )
        .unwrap();
        assert_eq!(count_solutions(&l, 5), 2);
        assert_eq!(count_solutions(&l, 1), 1);
    }

    #[test]
    fn orientations_do_not_multiply_solutions() {
        // A T-junction fits the gap in two orientations; still one solution.
        let l = parse("S╶ . F╴", "┬").unwrap();
        assert_eq!(count_solutions(&l, 5), 1);
        // A cross or a straight both fit: two solutions by piece kind.
        let l = parse("S╶ . F╴", "─┼").unwrap();
        assert_eq!(count_solutions(&l, 5), 2);
    }

    #[test]
    fn solver_avoids_mist() {
        let mut l = parse(
            "# . . . #
             S╶ . ~ . F╴
             # # # # #",
            "┘┌┐└───",
        )
        .unwrap();
        let sols = solve(&l, 5).0;
        assert_eq!(sols.len(), 1);
        assert!(!sols[0].route.contains(&7));
        l.cells[7] = Cell::Empty;
        assert!(count_solutions(&l, 5) > 1);
    }

    #[test]
    fn solver_respects_order() {
        let mut l = parse("S╶ 1─ . 0─ F╴", "─").unwrap();
        assert_eq!(count_solutions(&l, 5), 1);
        l.ordered = true;
        assert_eq!(count_solutions(&l, 5), 0);
        l.cells.swap(1, 3);
        assert_eq!(count_solutions(&l, 5), 1);
    }

    #[test]
    fn solver_respects_patrol() {
        // Short route 0,3,4,5,2 or long route 0,3,6,7,8,5,2.
        let mut l = parse(
            "S╷ . F╷
             . . .
             . . .",
            "└┘│││",
        )
        .unwrap();
        assert_eq!(count_solutions(&l, 5), 2);
        l.patrol = vec![4, 1]; // on cell 4 at tick 2: catches the short route
        let sols = solve(&l, 5).0;
        assert_eq!(sols.len(), 1);
        assert_eq!(sols[0].route, vec![0, 3, 6, 7, 8, 5, 2]);
        l.patrol = vec![0, 1]; // waiting on the start
        assert_eq!(count_solutions(&l, 5), 0);
    }

    #[test]
    fn non_rotatable_needs_exact_orientation() {
        let mut l = parse("S╶ . F╴", "│").unwrap();
        assert_eq!(count_solutions(&l, 2), 1);
        l.rotatable = false;
        assert_eq!(count_solutions(&l, 2), 0);
        l.tray[0] = Piece::single(TileKind::Straight, 1);
        assert_eq!(count_solutions(&l, 2), 1);
    }

    #[test]
    fn hint_places_then_wins() {
        let l = parse(ZIGZAG, "┐└┌│").unwrap();
        let h = hint(&l, &State::empty(&l)).unwrap().unwrap();
        assert!(matches!(h, Hint::Place { cell: 3, .. }), "{h:?}");
        hints_solve(&l, State::empty(&l));
    }

    #[test]
    fn hint_removes_wrong_piece() {
        let l = parse(ZIGZAG, "┐└┌│").unwrap();
        let mut st = State::empty(&l);
        st.placed[3] = Some(Placement { piece: 3, rot: 0 }); // straight: wrong
        assert_eq!(hint(&l, &st).unwrap(), Some(Hint::Remove { cell: 3 }));
        hints_solve(&l, st);
    }

    #[test]
    fn hint_rotates_and_frees_needed_piece() {
        let l = parse(ZIGZAG, "┐└┌").unwrap();
        let mut st = State::empty(&l);
        st.placed[3] = Some(Placement { piece: 1, rot: 2 }); // right kind, wrong way
        assert_eq!(hint(&l, &st).unwrap(), Some(Hint::Rotate { cell: 3, rot: 0 }));

        // A needed curve is parked off the route.
        let l = parse(
            "S╷ . .
             . . #
             # . F╴",
            "┐└└",
        )
        .unwrap();
        let mut st = State::empty(&l);
        st.placed[2] = Some(Placement { piece: 0, rot: 0 });
        st.placed[1] = Some(Placement { piece: 1, rot: 0 });
        assert!(matches!(hint(&l, &st).unwrap(), Some(Hint::Remove { .. })));
        hints_solve(&l, st);
    }

    #[test]
    fn solves_with_a_block() {
        // A 2×1 straight block spans the gap; no singles in the tray.
        let l = parse("S╶ . . F╴", "[──]").unwrap();
        let (sols, _) = solve(&l, 5);
        assert_eq!(sols.len(), 1);
        assert_eq!(sols[0].blocks.len(), 1);
        assert_eq!(sols[0].blocks[0].anchor, 1);
        // The same block standing up (1×2) also works: it is turned in the search.
        let l = parse("S╶ . . F╴", "[│/│]").unwrap();
        assert_eq!(count_solutions(&l, 5), 1);
        // A block that does not fit anywhere.
        let l = parse("S╶ . F╴", "[──]").unwrap();
        assert_eq!(count_solutions(&l, 5), 0);
    }

    #[test]
    fn block_with_grass_and_a_turn() {
        // 2×2 block with grass top-right, placed at 3: route 0 → 3 → 6 → 7 → 8.
        let l = parse(
            "S╷ # #
             . . #
             . . F╴",
            "[│./└─]",
        )
        .unwrap();
        let sols = solve(&l, 5).0;
        assert_eq!(sols.len(), 1, "{sols:?}");
        assert_eq!(sols[0].route, vec![0, 3, 6, 7, 8]);
        // The grass cell (4) is covered but carries no road.
        assert!(sols[0].blocks[0].cells.contains(&(4, None)));
    }

    #[test]
    fn blank_block_cell_blocks_the_route() {
        // The only way is straight through the block's grass cell: no solution.
        let l = parse("S╶ . . F╴", "[─.]").unwrap();
        assert_eq!(count_solutions(&l, 5), 0);
    }

    #[test]
    fn symmetric_block_counts_once() {
        let l = parse("S╶ . . F╴", "[──]").unwrap();
        // Turned 180° it is the same block in the same place.
        assert_eq!(count_solutions(&l, 5), 1);
        // The block or two single straights: two solutions.
        let l = parse("S╶ . . F╴", "[──]──").unwrap();
        assert_eq!(count_solutions(&l, 5), 2);
    }

    #[test]
    fn hints_place_and_fix_blocks() {
        let l = parse(
            "S╷ # #
             . . #
             . . F╴",
            "[│./└─]┐",
        )
        .unwrap();
        let h = hint(&l, &State::empty(&l)).unwrap().unwrap();
        assert!(matches!(h, Hint::Place { cell: 3, piece: 0, .. }), "{h:?}");
        hints_solve(&l, State::empty(&l));
        // A block put down turned the wrong way is taken back first.
        let mut st = State::empty(&l);
        st.placed[3] = Some(Placement { piece: 0, rot: 2 });
        st.validate(&l).unwrap();
        assert_eq!(hint(&l, &st).unwrap(), Some(Hint::Remove { cell: 3 }));
        hints_solve(&l, st);
    }

    #[test]
    fn no_hint_when_won() {
        let l = parse("S╶ ─ F╴", "").unwrap();
        assert_eq!(hint(&l, &State::empty(&l)).unwrap(), None);
    }
}
