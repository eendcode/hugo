//! Route finding and the win check.
//!
//! A route is a simple path of cells from Start to Finish where every step
//! goes through matching road openings. Pim may turn any way a junction
//! allows; open ends that are not on the route are fine.

use crate::model::{Cell, Level, ModelError, Side, State, Tile};
use serde::{Deserialize, Serialize};

/// Why a road that reaches the chapel does not count yet.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Issue {
    /// The route runs through ghost mist.
    Mist { cell: u16 },
    /// A treasure is not on the route.
    MissingTreasure { order: u8 },
    /// Treasures are visited out of order; `order` should have come earlier.
    WrongOrder { order: u8 },
    /// Pim meets the Witte Dame at this cell and tick.
    Dame { cell: u16, tick: u16 },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CheckResult {
    pub won: bool,
    /// The winning route, or the closest near-miss that reaches the chapel.
    pub route: Vec<u16>,
    /// Set when the road reaches the chapel but breaks a rule.
    pub issue: Option<Issue>,
    /// Every cell connected to the start by road (for lighting up the road).
    pub reached: Vec<u16>,
}

/// The cell reached from `a` through `side`, if both tiles open towards each other.
pub fn linked(level: &Level, board: &[Option<Tile>], a: usize, side: Side) -> Option<usize> {
    let b = level.neighbor(a, side)?;
    let (ta, tb) = (board[a]?, board[b]?);
    (ta.has(side) && tb.has(side.opposite())).then_some(b)
}

/// All rule violations of a Start→Finish route, most important first.
pub fn route_issues(level: &Level, route: &[usize]) -> Vec<Issue> {
    let mut issues = Vec::new();
    if let Some(&c) = route.iter().find(|&&c| matches!(level.cells[c], Cell::Mist { .. })) {
        issues.push(Issue::Mist { cell: c as u16 });
    }
    let seen: Vec<u8> = route.iter().filter_map(|&c| level.waypoint_order(c)).collect();
    let total = level.waypoints().len() as u8;
    if let Some(order) = (0..total).find(|o| !seen.contains(o)) {
        issues.push(Issue::MissingTreasure { order });
    } else if level.ordered {
        if let Some(k) = seen.iter().enumerate().position(|(k, &o)| o as usize != k) {
            issues.push(Issue::WrongOrder { order: k as u8 });
        }
    }
    if let Some(issue) = dame_issue(level, route) {
        issues.push(issue);
    }
    issues
}

/// First meeting with the Dame when Pim walks `route` one cell per tick.
pub fn dame_issue(level: &Level, route: &[usize]) -> Option<Issue> {
    (0..route.len()).find_map(|t| {
        let from = route[t.saturating_sub(1)];
        level.meets_dame(from, route[t], t).then(|| Issue::Dame { cell: route[t] as u16, tick: t as u16 })
    })
}

/// Cap on path-enumeration steps so open boards full of crossings stay fast.
const SEARCH_BUDGET: usize = 50_000;

pub fn check(level: &Level, state: &State) -> Result<CheckResult, ModelError> {
    level.validate()?;
    state.validate(level)?;
    let board = state.board(level);
    Ok(check_board(level, &board))
}

pub fn check_board(level: &Level, board: &[Option<Tile>]) -> CheckResult {
    let start = level.start().expect("validated");
    let finish = level.finish().expect("validated");

    // Everything connected to the start.
    let mut reached = vec![false; level.len()];
    let mut queue = vec![start];
    reached[start] = true;
    while let Some(a) = queue.pop() {
        for s in Side::ALL {
            if let Some(b) = linked(level, board, a, s) {
                if !reached[b] {
                    reached[b] = true;
                    queue.push(b);
                }
            }
        }
    }
    let reached_list: Vec<u16> = (0..level.len()).filter(|&i| reached[i]).map(|i| i as u16).collect();

    let mut result = CheckResult { won: false, route: vec![], issue: None, reached: reached_list };
    if !reached[finish] {
        return result;
    }

    // Enumerate simple Start→Finish paths, keeping a winner or the best near-miss.
    let mut best: Option<(usize, Vec<usize>, Option<Issue>)> = None;
    let mut path = vec![start];
    let mut on_path = vec![false; level.len()];
    on_path[start] = true;
    let mut budget = SEARCH_BUDGET;
    let mut stack: Vec<usize> = vec![0]; // next side to try, per path depth
    while let Some(side_ix) = stack.last_mut() {
        let a = *path.last().unwrap();
        if a == finish || *side_ix >= 4 || budget == 0 {
            if a == finish {
                let issues = route_issues(level, &path);
                let rank = issues.len();
                let better = best.as_ref().is_none_or(|(r, p, _)| rank < *r || (rank == *r && path.len() < p.len()));
                if better {
                    best = Some((rank, path.clone(), issues.into_iter().next()));
                }
                if rank == 0 {
                    break;
                }
            }
            stack.pop();
            on_path[a] = false;
            path.pop();
            continue;
        }
        let s = Side::ALL[*side_ix];
        *side_ix += 1;
        budget -= 1;
        if let Some(b) = linked(level, board, a, s) {
            if !on_path[b] {
                on_path[b] = true;
                path.push(b);
                stack.push(0);
            }
        }
    }

    if let Some((rank, route, issue)) = best {
        result.won = rank == 0;
        result.route = route.into_iter().map(|c| c as u16).collect();
        result.issue = issue;
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ascii::parse;
    use crate::model::{Placement, TileKind};

    fn board_of(level: &Level) -> Vec<Option<Tile>> {
        State::empty(level).board(level)
    }

    #[test]
    fn straight_route_wins() {
        let l = parse("S╶ ─ F╴", "").unwrap();
        let r = check_board(&l, &board_of(&l));
        assert!(r.won);
        assert_eq!(r.route, vec![0, 1, 2]);
    }

    #[test]
    fn gap_does_not_win() {
        let l = parse("S╶ . F╴", "─").unwrap();
        let empty = check(&l, &State::empty(&l)).unwrap();
        assert!(!empty.won);
        assert_eq!(empty.reached, vec![0]);
        let mut st = State::empty(&l);
        st.placed[1] = Some(Placement { piece: 0, rot: 0 }); // vertical: wrong way
        assert!(!check(&l, &st).unwrap().won);
        st.placed[1] = Some(Placement { piece: 0, rot: 1 });
        assert!(check(&l, &st).unwrap().won);
    }

    #[test]
    fn mismatched_openings_do_not_link() {
        let l = parse("S╶ │ F╴", "").unwrap();
        assert!(!check_board(&l, &board_of(&l)).won);
    }

    #[test]
    fn route_through_junction_and_dead_ends_allowed() {
        // The T-junction leaves an open end pointing north; that's fine.
        let l = parse(
            ". . .
             S╶ ┴ F╴",
            "",
        )
        .unwrap();
        assert!(check_board(&l, &board_of(&l)).won);
    }

    #[test]
    fn waypoint_must_be_visited() {
        // Two ways round; only the lower one passes the treasure.
        let l = parse(
            "┌ ─ ┐
             S┤ # F┤
             └ 0─ ┘",
            "",
        )
        .unwrap();
        let r = check_board(&l, &board_of(&l));
        assert!(r.won);
        assert!(r.route.contains(&7));

        let l = parse(
            "┌ ─ ┐
             S┤ # F┤
             0╷ # .",
            "",
        )
        .unwrap();
        let r = check_board(&l, &board_of(&l));
        assert!(!r.won);
        assert_eq!(r.issue, Some(Issue::MissingTreasure { order: 0 }));
    }

    #[test]
    fn waypoint_order() {
        // Row: start, treasure 1 (beker), treasure 0 (kandelaar), finish.
        let mut l = parse("S╶ 1─ 0─ F╴", "").unwrap();
        assert!(check_board(&l, &board_of(&l)).won);
        l.ordered = true;
        let r = check_board(&l, &board_of(&l));
        assert!(!r.won);
        assert_eq!(r.issue, Some(Issue::WrongOrder { order: 0 }));
        l.cells.swap(1, 2);
        assert!(check_board(&l, &board_of(&l)).won);
    }

    #[test]
    fn mist_is_never_allowed() {
        let l = parse("S╶ m─ F╴", "").unwrap();
        let r = check_board(&l, &board_of(&l));
        assert!(!r.won);
        assert_eq!(r.issue, Some(Issue::Mist { cell: 1 }));
        assert_eq!(r.route, vec![0, 1, 2]);
    }

    #[test]
    fn mist_detour_wins() {
        let l = parse(
            "┌ ─ ┐
             S┤ m─ F┤",
            "",
        )
        .unwrap();
        let r = check_board(&l, &board_of(&l));
        assert!(r.won);
        assert_eq!(r.route, vec![3, 0, 1, 2, 5]);
    }

    #[test]
    fn patrol_same_cell() {
        // Pim: 0 (t0) → 1 (t1) → 2 (t2). Dame loop: 4,1 → at t1 she is on cell 1.
        let mut l = parse(
            "S╶ ─ F╴
             . . .",
            "",
        )
        .unwrap();
        l.patrol = vec![4, 1];
        let r = check_board(&l, &board_of(&l));
        assert_eq!(r.issue, Some(Issue::Dame { cell: 1, tick: 1 }));
        l.patrol = vec![1, 4]; // at t1 she's on 4, t2 on 1 — Pim is already on 2.
        assert!(check_board(&l, &board_of(&l)).won);
    }

    #[test]
    fn patrol_swap() {
        // Pim 0→1→2→3; the Dame is on cell 2 at t1 and on cell 1 at t2,
        // so they swap cells between t1 and t2.
        let mut l = parse("S╶ ─ ─ F╴\n. . . .", "").unwrap();
        l.patrol = vec![5, 2, 1, 5]; // t0:5 t1:2 t2:1 t3:5
        assert!(l.validate().is_err()); // 5 → 2 is not adjacent
        l.patrol = vec![6, 2, 1, 5]; // t0:6 t1:2 t2:1 t3:5 (loop: 5→6 adjacent)
        l.validate().unwrap();
        let r = check_board(&l, &board_of(&l));
        assert_eq!(r.issue, Some(Issue::Dame { cell: 2, tick: 2 }));
        assert!(!r.won);
    }

    #[test]
    fn patrol_forces_detour() {
        // Straight route along the top meets the Dame; the long way round is safe.
        let mut l = parse(
            "S╷ . F╷
             ├ ─ ┤
             └ ─ ┘",
            "",
        )
        .unwrap();
        l.cells[1] = Cell::Empty;
        // Short route 0,3,4,5,2 is on cell 4 at t2, just when the Dame is.
        l.patrol = vec![4, 1];
        let r = check_board(&l, &board_of(&l));
        assert!(r.won);
        assert_eq!(r.route, vec![0, 3, 6, 7, 8, 5, 2]);
    }

    #[test]
    fn state_validation() {
        let l = parse("S╶ . F╴", "─").unwrap();
        let mut st = State::empty(&l);
        st.placed[0] = Some(Placement { piece: 0, rot: 1 });
        assert!(check(&l, &st).is_err());
        let mut st = State::empty(&l);
        st.placed[1] = Some(Placement { piece: 3, rot: 1 });
        assert!(check(&l, &st).is_err());
        let mut fixed = l.clone();
        fixed.rotatable = false;
        let mut st = State::empty(&l);
        st.placed[1] = Some(Placement { piece: 0, rot: 0 });
        assert!(check(&fixed, &st).is_err());
        assert_eq!(fixed.tray[0], crate::model::Piece::single(TileKind::Straight, 1));
    }
}
