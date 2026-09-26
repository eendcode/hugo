//! Core data model: sides, tiles, cells, levels and the player's board state.
//! Everything here is plain data and serialises to the JSON used by the web
//! frontend and the committed level packs.

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Side {
    N,
    E,
    S,
    W,
}

impl Side {
    pub const ALL: [Side; 4] = [Side::N, Side::E, Side::S, Side::W];

    pub fn bit(self) -> u8 {
        1 << (self as u8)
    }

    pub fn opposite(self) -> Side {
        Side::ALL[(self as usize + 2) % 4]
    }

    /// (dx, dy) with y growing downwards.
    pub fn delta(self) -> (i32, i32) {
        match self {
            Side::N => (0, -1),
            Side::E => (1, 0),
            Side::S => (0, 1),
            Side::W => (-1, 0),
        }
    }
}

/// Bit mask of open sides: N=1, E=2, S=4, W=8.
pub type Mask = u8;

/// Rotate a mask `r` quarter turns clockwise (N→E→S→W).
pub fn rotate_mask(m: Mask, r: u8) -> Mask {
    let r = r % 4;
    ((m << r) | (m >> ((4 - r) % 4))) & 0xF
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub enum TileKind {
    Straight,
    Curve,
    TJunction,
    Cross,
    DeadEnd,
    Obstacle,
}

impl TileKind {
    pub const ROADS: [TileKind; 5] = [
        TileKind::Straight,
        TileKind::Curve,
        TileKind::TJunction,
        TileKind::Cross,
        TileKind::DeadEnd,
    ];

    /// Openings at rotation 0.
    pub fn base_mask(self) -> Mask {
        match self {
            TileKind::Straight => 0b0101,  // N S
            TileKind::Curve => 0b0011,     // N E
            TileKind::TJunction => 0b0111, // N E S (closed W)
            TileKind::Cross => 0b1111,
            TileKind::DeadEnd => 0b0001, // N
            TileKind::Obstacle => 0,
        }
    }

    /// Number of distinct orientations.
    pub fn orientations(self) -> u8 {
        match self {
            TileKind::Straight => 2,
            TileKind::Cross | TileKind::Obstacle => 1,
            _ => 4,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Tile {
    pub kind: TileKind,
    /// Quarter turns clockwise from the base orientation.
    #[serde(default)]
    pub rot: u8,
}

impl Tile {
    pub fn new(kind: TileKind, rot: u8) -> Tile {
        Tile { kind, rot: rot % kind.orientations() }
    }

    pub fn mask(self) -> Mask {
        rotate_mask(self.kind.base_mask(), self.rot)
    }

    pub fn has(self, side: Side) -> bool {
        self.mask() & side.bit() != 0
    }

    /// The same tile turned 90° clockwise.
    pub fn rotated(self) -> Tile {
        Tile::new(self.kind, self.rot + 1)
    }

    pub fn normalized(self) -> Tile {
        Tile::new(self.kind, self.rot)
    }

    /// The tile (kind + rotation) with exactly these openings, if any.
    pub fn from_mask(mask: Mask) -> Option<Tile> {
        TileKind::ROADS.iter().find_map(|&kind| {
            (0..kind.orientations())
                .map(|rot| Tile::new(kind, rot))
                .find(|t| t.mask() == mask)
        })
    }
}

/// A multi-cell piece: a `w`×`h` rectangle with a fixed road drawn across it.
/// `tiles` is row-major at rotation 0; `None` is a cell without road (grass),
/// which the block still covers.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Block {
    pub w: u8,
    pub h: u8,
    pub tiles: Vec<Option<Tile>>,
    /// Quarter turns clockwise it starts in (tray display / fixed orientation).
    #[serde(default)]
    pub rot: u8,
}

impl Block {
    /// The block turned `rot` quarter turns clockwise, as a rotation-0 block.
    /// A clockwise turn maps old (x, y) to new (h - 1 - y, x).
    pub fn shape(&self, rot: u8) -> Block {
        let mut b = Block { w: self.w, h: self.h, tiles: self.tiles.clone(), rot: 0 };
        for _ in 0..rot % 4 {
            let (w, h) = (b.w as usize, b.h as usize);
            let mut tiles = vec![None; w * h];
            for y in 0..h {
                for x in 0..w {
                    let (nx, ny) = (h - 1 - y, x);
                    tiles[ny * h + nx] = b.tiles[y * w + x].map(Tile::rotated);
                }
            }
            b = Block { w: h as u8, h: w as u8, tiles, rot: 0 };
        }
        b
    }

    /// Same content regardless of orientation: the smallest of its four shapes.
    pub fn canonical(&self) -> Block {
        (0..4).map(|r| self.shape(r)).min_by_key(|b| (b.w, b.h, b.tiles.iter().map(|t| t.map_or(0, |t| t.mask() + 1)).collect::<Vec<_>>())).unwrap()
    }

    /// Number of cells that carry road.
    pub fn road_cells(&self) -> usize {
        self.tiles.iter().filter(|t| t.is_some()).count()
    }
}

/// A tray piece: a single tile or a multi-cell block.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Piece {
    Block(Block),
    Single(Tile),
}

impl Piece {
    pub fn single(kind: TileKind, rot: u8) -> Piece {
        Piece::Single(Tile::new(kind, rot))
    }

    pub fn rot(&self) -> u8 {
        match self {
            Piece::Single(t) => t.rot,
            Piece::Block(b) => b.rot,
        }
    }

    /// Cells it can put road on (its capacity for a route).
    pub fn road_cells(&self) -> usize {
        match self {
            Piece::Single(_) => 1,
            Piece::Block(b) => b.road_cells(),
        }
    }

    pub fn is_block(&self) -> bool {
        matches!(self, Piece::Block(_))
    }

    /// Rotation-0 shape of this piece turned `rot` quarter turns.
    pub fn shape(&self, rot: u8) -> Block {
        match self {
            Piece::Single(t) => Block { w: 1, h: 1, tiles: vec![Some(Tile::new(t.kind, rot))], rot: 0 },
            Piece::Block(b) => b.shape(rot),
        }
    }

    /// Distinct orientations worth trying.
    pub fn orientations(&self) -> u8 {
        match self {
            Piece::Single(t) => t.kind.orientations(),
            Piece::Block(_) => 4,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Scenery {
    Dune,
    Pine,
    Heather,
    Campfire,
}

impl Scenery {
    pub const ALL: [Scenery; 4] = [Scenery::Dune, Scenery::Pine, Scenery::Heather, Scenery::Campfire];
}

/// What a grid cell holds before the player does anything.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum Cell {
    /// Free cell: the player may place a tray piece here.
    Empty,
    /// A fixed road piece (a "given").
    Road { tile: Tile },
    /// A fixed robber trail with goat-hoof prints: scenery road, usually a decoy.
    Trail { tile: Tile },
    /// Pim on Barend. Always a single opening.
    Start { tile: Tile },
    /// De Duinkapel. Always a single opening.
    Finish { tile: Tile },
    /// A stolen treasure on a fixed road piece. `order` is 0 = kandelaar,
    /// 1 = beker, 2 = klokje, and is the visiting order in ordered levels.
    Waypoint { tile: Tile, order: u8 },
    /// Blocked scenery.
    Obstacle { scenery: Scenery },
    /// Ghost mist: the route may not pass. May hold a lure road.
    Mist {
        #[serde(default)]
        tile: Option<Tile>,
    },
}

impl Cell {
    /// The fixed road tile in this cell, if any (including lures in mist).
    pub fn fixed_tile(&self) -> Option<Tile> {
        match self {
            Cell::Road { tile }
            | Cell::Trail { tile }
            | Cell::Start { tile }
            | Cell::Finish { tile }
            | Cell::Waypoint { tile, .. } => Some(*tile),
            Cell::Mist { tile } => *tile,
            Cell::Empty | Cell::Obstacle { .. } => None,
        }
    }

    pub fn is_empty(&self) -> bool {
        matches!(self, Cell::Empty)
    }

    /// Can a route ever pass through this cell?
    pub fn passable(&self) -> bool {
        !matches!(self, Cell::Obstacle { .. } | Cell::Mist { .. })
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Level {
    pub width: u8,
    pub height: u8,
    /// Row-major, `width * height` cells.
    pub cells: Vec<Cell>,
    /// Pieces the player can place. With `rotatable`, `rot` is only the
    /// orientation the piece starts in.
    pub tray: Vec<Piece>,
    #[serde(default = "default_true")]
    pub rotatable: bool,
    /// Treasures must be visited in `order`.
    #[serde(default)]
    pub ordered: bool,
    /// The Witte Dame's closed loop of cell indices (empty = no patrol). She is
    /// on `patrol[t % len]` at tick `t`; consecutive entries (wrapping) are adjacent.
    #[serde(default)]
    pub patrol: Vec<u16>,
    #[serde(default)]
    pub seed: u64,
    #[serde(default)]
    pub difficulty: u32,
    #[serde(default)]
    pub score: u32,
}

fn default_true() -> bool {
    true
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ModelError(pub String);

impl fmt::Display for ModelError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for ModelError {}

impl Level {
    pub fn len(&self) -> usize {
        self.width as usize * self.height as usize
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn xy(&self, i: usize) -> (i32, i32) {
        ((i % self.width as usize) as i32, (i / self.width as usize) as i32)
    }

    pub fn index(&self, x: i32, y: i32) -> Option<usize> {
        if x < 0 || y < 0 || x >= self.width as i32 || y >= self.height as i32 {
            None
        } else {
            Some(y as usize * self.width as usize + x as usize)
        }
    }

    pub fn neighbor(&self, i: usize, side: Side) -> Option<usize> {
        let (x, y) = self.xy(i);
        let (dx, dy) = side.delta();
        self.index(x + dx, y + dy)
    }

    /// The side of `a` that faces the adjacent cell `b`.
    pub fn side_towards(&self, a: usize, b: usize) -> Option<Side> {
        Side::ALL.into_iter().find(|&s| self.neighbor(a, s) == Some(b))
    }

    pub fn manhattan(&self, a: usize, b: usize) -> u32 {
        let (ax, ay) = self.xy(a);
        let (bx, by) = self.xy(b);
        ax.abs_diff(bx) + ay.abs_diff(by)
    }

    pub fn start(&self) -> Option<usize> {
        self.cells.iter().position(|c| matches!(c, Cell::Start { .. }))
    }

    pub fn finish(&self) -> Option<usize> {
        self.cells.iter().position(|c| matches!(c, Cell::Finish { .. }))
    }

    /// Waypoint cell indices sorted by their `order`.
    pub fn waypoints(&self) -> Vec<usize> {
        let mut w: Vec<(u8, usize)> = self
            .cells
            .iter()
            .enumerate()
            .filter_map(|(i, c)| match c {
                Cell::Waypoint { order, .. } => Some((*order, i)),
                _ => None,
            })
            .collect();
        w.sort();
        w.into_iter().map(|(_, i)| i).collect()
    }

    pub fn waypoint_order(&self, i: usize) -> Option<u8> {
        match self.cells[i] {
            Cell::Waypoint { order, .. } => Some(order),
            _ => None,
        }
    }

    /// Where the Witte Dame is at `tick`.
    pub fn dame_at(&self, tick: usize) -> Option<usize> {
        if self.patrol.is_empty() {
            None
        } else {
            Some(self.patrol[tick % self.patrol.len()] as usize)
        }
    }

    /// Would Pim, stepping from `from` (at tick `t - 1`) to `to` (at tick `t`),
    /// meet the Dame on a cell or swap cells with her?
    pub fn meets_dame(&self, from: usize, to: usize, t: usize) -> bool {
        if self.patrol.is_empty() {
            return false;
        }
        let now = self.dame_at(t).unwrap();
        let before = self.dame_at(t.saturating_sub(1)).unwrap();
        now == to || (t > 0 && before == to && now == from)
    }

    /// The cells (and their tiles) a shape covers when its top-left is at
    /// `anchor`, or `None` if it sticks out of the grid.
    pub fn footprint(&self, anchor: usize, shape: &Block) -> Option<Vec<(usize, Option<Tile>)>> {
        let (ax, ay) = self.xy(anchor);
        let mut out = Vec::with_capacity(shape.tiles.len());
        for y in 0..shape.h as i32 {
            for x in 0..shape.w as i32 {
                let c = self.index(ax + x, ay + y)?;
                out.push((c, shape.tiles[(y * shape.w as i32 + x) as usize]));
            }
        }
        Some(out)
    }

    /// Structural sanity checks for levels from untrusted JSON.
    pub fn validate(&self) -> Result<(), ModelError> {
        let err = |m: &str| Err(ModelError(m.to_string()));
        if self.width == 0 || self.height == 0 || self.cells.len() != self.len() {
            return err("grid size does not match cell count");
        }
        if self.len() > u16::MAX as usize {
            return err("grid too large");
        }
        let (Some(s), Some(f)) = (self.start(), self.finish()) else {
            return err("level needs a start and a finish");
        };
        let count = |p: fn(&Cell) -> bool| self.cells.iter().filter(|c| p(c)).count();
        if count(|c| matches!(c, Cell::Start { .. })) != 1 || count(|c| matches!(c, Cell::Finish { .. })) != 1 {
            return err("exactly one start and one finish");
        }
        for i in [s, f] {
            if self.cells[i].fixed_tile().map(|t| t.mask().count_ones()) != Some(1) {
                return err("start and finish need a single opening");
            }
        }
        let mut orders: Vec<u8> = self.waypoints().iter().filter_map(|&i| self.waypoint_order(i)).collect();
        orders.dedup();
        if orders.len() != self.waypoints().len() || orders.iter().enumerate().any(|(i, &o)| o as usize != i) {
            return err("waypoint orders must be 0..n without gaps");
        }
        for piece in &self.tray {
            match piece {
                Piece::Single(t) if t.kind == TileKind::Obstacle => return err("obstacles cannot be in the tray"),
                Piece::Block(b) if b.w == 0 || b.h == 0 || b.tiles.len() != b.w as usize * b.h as usize => {
                    return err("block size does not match its tiles")
                }
                Piece::Block(b) if b.tiles.iter().flatten().any(|t| t.kind == TileKind::Obstacle) => {
                    return err("obstacles cannot be in a block")
                }
                _ => {}
            }
        }
        for (k, &c) in self.patrol.iter().enumerate() {
            let next = self.patrol[(k + 1) % self.patrol.len()] as usize;
            let c = c as usize;
            if c >= self.len() || (self.patrol.len() > 1 && self.manhattan(c, next) != 1) {
                return err("patrol must be a loop of adjacent cells");
            }
        }
        Ok(())
    }
}

/// A player-placed piece: which tray piece, turned how. Blocks are stored
/// at their top-left (anchor) cell and cover the rest of their rectangle.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Placement {
    pub piece: u16,
    #[serde(default)]
    pub rot: u8,
}

/// The player's board: one optional placement per (anchor) cell.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct State {
    pub placed: Vec<Option<Placement>>,
}

impl State {
    pub fn empty(level: &Level) -> State {
        State { placed: vec![None; level.len()] }
    }

    /// Every placement with the cells and tiles it covers.
    pub fn placements(&self, level: &Level) -> Vec<(usize, Placement, Vec<(usize, Option<Tile>)>)> {
        self.placed
            .iter()
            .enumerate()
            .filter_map(|(anchor, p)| {
                let p = (*p)?;
                let piece = level.tray.get(p.piece as usize)?;
                let cells = level.footprint(anchor, &piece.shape(p.rot))?;
                Some((anchor, p, cells))
            })
            .collect()
    }

    /// Check that placements fit on free cells, don't overlap, and use each
    /// tray piece once.
    pub fn validate(&self, level: &Level) -> Result<(), ModelError> {
        if self.placed.len() != level.len() {
            return Err(ModelError("state size does not match level".into()));
        }
        let mut used = vec![false; level.tray.len()];
        let mut covered = vec![false; level.len()];
        for (i, p) in self.placed.iter().enumerate() {
            let Some(p) = p else { continue };
            let piece = p.piece as usize;
            if piece >= level.tray.len() || used[piece] {
                return Err(ModelError(format!("bad or reused tray piece at cell {i}")));
            }
            used[piece] = true;
            let tray = &level.tray[piece];
            if !level.rotatable && tray.shape(p.rot) != tray.shape(tray.rot()) {
                return Err(ModelError(format!("piece at cell {i} may not be rotated")));
            }
            let Some(cells) = level.footprint(i, &tray.shape(p.rot)) else {
                return Err(ModelError(format!("piece at cell {i} sticks out of the board")));
            };
            for (c, _) in cells {
                if !level.cells[c].is_empty() || covered[c] {
                    return Err(ModelError(format!("cell {c} is not free")));
                }
                covered[c] = true;
            }
        }
        Ok(())
    }

    /// The tile currently in each cell: fixed tiles and placed pieces.
    pub fn board(&self, level: &Level) -> Vec<Option<Tile>> {
        let mut board: Vec<Option<Tile>> = level.cells.iter().map(Cell::fixed_tile).collect();
        for (_, _, cells) in self.placements(level) {
            for (c, t) in cells {
                if level.cells[c].is_empty() {
                    board[c] = t;
                }
            }
        }
        board
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rotation_cycles() {
        for kind in TileKind::ROADS {
            let t = Tile::new(kind, 0);
            let mut r = t;
            for _ in 0..kind.orientations() {
                r = r.rotated();
            }
            assert_eq!(t, r, "{kind:?}");
            assert_eq!(rotate_mask(kind.base_mask(), 4), kind.base_mask());
        }
    }

    #[test]
    fn openings() {
        let straight = Tile::new(TileKind::Straight, 1);
        assert!(straight.has(Side::E) && straight.has(Side::W));
        assert!(!straight.has(Side::N));
        let curve = Tile::new(TileKind::Curve, 1); // N E -> E S
        assert_eq!(curve.mask(), Side::E.bit() | Side::S.bit());
        let t = Tile::new(TileKind::TJunction, 2); // N E S -> S W N
        assert!(!t.has(Side::E));
        let d = Tile::new(TileKind::DeadEnd, 3);
        assert_eq!(d.mask(), Side::W.bit());
        assert_eq!(Tile::new(TileKind::Cross, 3), Tile::new(TileKind::Cross, 0));
    }

    #[test]
    fn from_mask_roundtrip() {
        for kind in TileKind::ROADS {
            for rot in 0..kind.orientations() {
                let t = Tile::new(kind, rot);
                assert_eq!(Tile::from_mask(t.mask()), Some(t));
            }
        }
        assert_eq!(Tile::from_mask(0), None);
    }

    #[test]
    fn sides() {
        for s in Side::ALL {
            assert_eq!(s.opposite().opposite(), s);
            let (dx, dy) = s.delta();
            let (ox, oy) = s.opposite().delta();
            assert_eq!((dx + ox, dy + oy), (0, 0));
        }
    }

    #[test]
    fn block_rotation() {
        // 2×1: curve (N,E) on the left, blank on the right.
        let b = Block { w: 2, h: 1, tiles: vec![Some(Tile::new(TileKind::Curve, 0)), None], rot: 0 };
        let r1 = b.shape(1);
        assert_eq!((r1.w, r1.h), (1, 2));
        // Left cell moves to the top; the curve turns to (E,S).
        assert_eq!(r1.tiles, vec![Some(Tile::new(TileKind::Curve, 1)), None]);
        let r2 = b.shape(2);
        assert_eq!(r2.tiles, vec![None, Some(Tile::new(TileKind::Curve, 2))]);
        assert_eq!(b.shape(4), b.shape(0));
        assert_eq!(r1.canonical(), b.canonical());
    }

    #[test]
    fn piece_json() {
        let single: Piece = serde_json::from_str(r#"{"kind":"Curve","rot":1}"#).unwrap();
        assert_eq!(single, Piece::single(TileKind::Curve, 1));
        let block: Piece = serde_json::from_str(r#"{"w":2,"h":1,"tiles":[{"kind":"Straight","rot":1},null]}"#).unwrap();
        assert!(block.is_block());
        assert_eq!(block.road_cells(), 1);
    }

    #[test]
    fn json_shape() {
        let c = Cell::Waypoint { tile: Tile::new(TileKind::Curve, 2), order: 1 };
        let j = serde_json::to_string(&c).unwrap();
        assert_eq!(j, r#"{"kind":"Waypoint","tile":{"kind":"Curve","rot":2},"order":1}"#);
        assert_eq!(serde_json::from_str::<Cell>(r#"{"kind":"Mist"}"#).unwrap(), Cell::Mist { tile: None });
    }
}
