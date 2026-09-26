//! Backtracking solver: extends a route from Start cell by cell, choosing
//! tray pieces for free cells, until it reaches Finish with every treasure
//! collected (in order, if required), avoiding mist and the Witte Dame.
//!
//! A solution is identified by its route and the piece *kinds* on the route's
//! free cells. Orientations that connect the same way, and unused tray pieces,
//! do not make distinct solutions.

use crate::model::{Level, Mask, ModelError, Side, State, Tile, TileKind};
use crate::rules;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Solution {
    /// Cells from Start to Finish.
    pub route: Vec<u16>,
    /// The pieces placed on the route's free cells, oriented to connect it.
    pub pieces: Vec<(u16, Tile)>,
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

/// Pieces of the same type are interchangeable. With rotation, the type is
/// the kind; without rotation, it is the kind plus its fixed orientation.
fn piece_type(level: &Level, t: Tile) -> Tile {
    if level.rotatable {
        Tile::new(t.kind, 0)
    } else {
        t.normalized()
    }
}

struct Search<'a> {
    level: &'a Level,
    types: Vec<Tile>,
    remaining: Vec<u8>,
    left: u32,
    visited: Vec<bool>,
    path: Vec<usize>,
    chosen: Vec<Option<Tile>>,
    finish: usize,
    all_waypoints: u32,
    /// `dist[k][c]`: fewest free cells to fill going from `c` to waypoint `k`
    /// (the last entry is the finish), ignoring tile shapes.
    dist: Vec<Vec<u32>>,
    /// Ordered levels: free cells needed from waypoint `k` onward to the finish.
    chain: Vec<u32>,
    limit: usize,
    seen: HashSet<Vec<(u16, u8)>>,
    solutions: Vec<Solution>,
    stats: Stats,
    budget: u64,
}

impl<'a> Search<'a> {
    fn new(level: &'a Level, limit: usize, budget: u64) -> Search<'a> {
        let mut counts: Vec<(Tile, u8)> = Vec::new();
        for &t in &level.tray {
            let key = piece_type(level, t);
            match counts.iter_mut().find(|(k, _)| *k == key) {
                Some((_, n)) => *n += 1,
                None => counts.push((key, 1)),
            }
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
            types: counts.iter().map(|(t, _)| *t).collect(),
            remaining: counts.iter().map(|(_, n)| *n).collect(),
            left: level.tray.len() as u32,
            visited: vec![false; level.len()],
            path: Vec::new(),
            chosen: vec![None; level.len()],
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
        if let Some(t) = self.level.cells[cur].fixed_tile() {
            for s in Side::ALL {
                if t.has(s) && Some(s) != entry {
                    progressed |= self.step(cur, s, None, mask, next);
                }
            }
        } else {
            for ti in 0..self.types.len() {
                if self.remaining[ti] == 0 {
                    continue;
                }
                let kind = self.types[ti].kind;
                let rots: Vec<u8> = if self.level.rotatable { (0..kind.orientations()).collect() } else { vec![self.types[ti].rot] };
                let mut tried: Mask = 0;
                for rot in rots {
                    let t = Tile::new(kind, rot);
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
            }
        }
        if !progressed {
            self.stats.dead_ends += 1;
        }
    }

    /// Try moving from `cur` through side `s`, having put `choice` on `cur`.
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
        if let Some(t) = cell.fixed_tile() {
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
        let used = choice.map_or(0, |_| 1);
        let need_here = u32::from(cell.is_empty());
        if need_here + self.lower_bound(nb, mask2, next2) > self.left - used {
            return false;
        }

        if let Some((ti, t)) = choice {
            self.remaining[ti] -= 1;
            self.chosen[cur] = Some(t);
        }
        self.left -= used;
        self.visited[nb] = true;
        self.path.push(nb);
        self.dfs(nb, Some(s.opposite()), mask2, next2);
        self.path.pop();
        self.visited[nb] = false;
        self.left += used;
        if let Some((ti, _)) = choice {
            self.remaining[ti] += 1;
            self.chosen[cur] = None;
        }
        true
    }

    fn record(&mut self) {
        let key: Vec<(u16, u8)> = self
            .path
            .iter()
            .map(|&c| (c as u16, self.chosen[c].map_or(u8::MAX, |t| t.kind as u8)))
            .collect();
        if self.seen.insert(key) {
            self.solutions.push(Solution {
                route: self.path.iter().map(|&c| c as u16).collect(),
                pieces: self.path.iter().filter_map(|&c| self.chosen[c].map(|t| (c as u16, t))).collect(),
            });
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
    /// Put tray piece `piece` on `cell`, turned `rot`.
    Place { cell: u16, piece: u16, rot: u8 },
    /// Turn the piece on `cell` to `rot`.
    Rotate { cell: u16, rot: u8 },
    /// The piece on `cell` is wrong: take it back to the tray.
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

/// All steps from `state` to `sol`: removals, then turns, then placements
/// in route order.
fn plan(level: &Level, state: &State, sol: &Solution) -> Vec<Hint> {
    let key = |t: Tile| piece_type(level, t);
    let mut removes = Vec::new();
    let mut rotates = Vec::new();
    let mut to_place: Vec<(u16, Tile, Mask)> = Vec::new();
    let mut on_route = vec![false; level.len()];
    for (k, &c) in sol.route.iter().enumerate() {
        on_route[c as usize] = true;
        let Some(&(_, want)) = sol.pieces.iter().find(|(pc, _)| *pc == c) else { continue };
        let need = connections(level, &sol.route, k);
        match state.placed[c as usize] {
            Some(p) if key(level.tray[p.piece as usize]) == key(want) => {
                if Tile::new(want.kind, p.rot).mask() & need != need {
                    match rot_for(want.kind, need) {
                        Some(rot) if level.rotatable => rotates.push(Hint::Rotate { cell: c, rot }),
                        _ => removes.push(Hint::Remove { cell: c }),
                    }
                }
            }
            Some(_) => {
                removes.push(Hint::Remove { cell: c });
                to_place.push((c, want, need));
            }
            None => to_place.push((c, want, need)),
        }
    }

    // Pieces needed vs. pieces free in the tray (including ones about to be removed).
    let placed_pieces: HashSet<u16> = state.placed.iter().flatten().map(|p| p.piece).collect();
    let mut free: HashMap<Tile, Vec<u16>> = HashMap::new();
    for (i, &t) in level.tray.iter().enumerate() {
        if !placed_pieces.contains(&(i as u16)) {
            free.entry(key(t)).or_default().push(i as u16);
        }
    }
    let mut returning: HashMap<Tile, usize> = HashMap::new();
    for h in &removes {
        if let Hint::Remove { cell } = h {
            let p = state.placed[*cell as usize].unwrap();
            *returning.entry(key(level.tray[p.piece as usize])).or_default() += 1;
        }
    }
    let mut needed: HashMap<Tile, usize> = HashMap::new();
    for (_, want, _) in &to_place {
        *needed.entry(key(*want)).or_default() += 1;
    }
    for (k, n) in &needed {
        let have = free.get(k).map_or(0, Vec::len) + returning.get(k).copied().unwrap_or(0);
        let mut short = n.saturating_sub(have);
        for (c, p) in state.placed.iter().enumerate() {
            if short == 0 {
                break;
            }
            if let Some(p) = p {
                if !on_route[c] && key(level.tray[p.piece as usize]) == *k {
                    removes.push(Hint::Remove { cell: c as u16 });
                    short -= 1;
                }
            }
        }
    }

    let mut places = Vec::new();
    for (c, want, need) in to_place {
        let pool = free.entry(key(want)).or_default();
        // Pieces still on the board get a placeholder id; only the first
        // step of a plan is ever shown, and removals come before placements.
        let piece = if pool.is_empty() { u16::MAX } else { pool.remove(0) };
        let rot = if level.rotatable { rot_for(want.kind, need).unwrap_or(want.rot) } else { want.rot };
        places.push(Hint::Place { cell: c, piece, rot });
    }
    removes.into_iter().chain(rotates).chain(places).collect()
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
        l.tray[0] = Tile::new(TileKind::Straight, 1);
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
    fn no_hint_when_won() {
        let l = parse("S╶ ─ F╴", "").unwrap();
        assert_eq!(hint(&l, &State::empty(&l)).unwrap(), None);
    }
}
