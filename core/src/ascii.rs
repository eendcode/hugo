//! Compact text format for hand-made levels (tests, debugging).
//!
//! One row per line, cells separated by spaces:
//! - `.` empty, `#` obstacle, `~` mist
//! - a road glyph alone (`│ ─ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ╵ ╶ ╷ ╴`) is a fixed road
//! - prefixed glyphs: `S╶` start, `F╴` finish, `t─` trail, `m│` mist lure,
//!   `0│` / `1│` / `2│` waypoint with that order
//!
//! The tray is a string of road glyphs; `[─┐/│.]` is a block (rows split
//! by `/`, `.` for a cell without road).

use crate::model::{Block, Cell, Level, Mask, Piece, Scenery, Tile};

const GLYPHS: [(char, Mask); 15] = [
    ('╵', 0b0001),
    ('╶', 0b0010),
    ('╷', 0b0100),
    ('╴', 0b1000),
    ('│', 0b0101),
    ('─', 0b1010),
    ('└', 0b0011),
    ('┌', 0b0110),
    ('┐', 0b1100),
    ('┘', 0b1001),
    ('├', 0b0111),
    ('┬', 0b1110),
    ('┤', 0b1101),
    ('┴', 0b1011),
    ('┼', 0b1111),
];

pub fn glyph_tile(c: char) -> Option<Tile> {
    GLYPHS.iter().find(|(g, _)| *g == c).and_then(|(_, m)| Tile::from_mask(*m))
}

pub fn tile_glyph(t: Tile) -> char {
    GLYPHS.iter().find(|(_, m)| *m == t.mask()).map(|(g, _)| *g).unwrap_or('?')
}

fn parse_cell(tok: &str) -> Result<Cell, String> {
    let chars: Vec<char> = tok.chars().collect();
    let tile = |c: char| glyph_tile(c).ok_or_else(|| format!("bad glyph {c:?}"));
    Ok(match chars.as_slice() {
        ['.'] => Cell::Empty,
        ['#'] => Cell::Obstacle { scenery: Scenery::Dune },
        ['~'] => Cell::Mist { tile: None },
        [g] => Cell::Road { tile: tile(*g)? },
        ['S', g] => Cell::Start { tile: tile(*g)? },
        ['F', g] => Cell::Finish { tile: tile(*g)? },
        ['t', g] => Cell::Trail { tile: tile(*g)? },
        ['m', g] => Cell::Mist { tile: Some(tile(*g)?) },
        [d @ '0'..='9', g] => Cell::Waypoint { tile: tile(*g)?, order: *d as u8 - b'0' },
        _ => return Err(format!("bad cell {tok:?}")),
    })
}

pub fn parse_tray(tray: &str) -> Result<Vec<Piece>, String> {
    let mut out = Vec::new();
    let mut chars = tray.chars().filter(|c| !c.is_whitespace());
    while let Some(c) = chars.next() {
        if c != '[' {
            out.push(Piece::Single(glyph_tile(c).ok_or(format!("bad tray glyph {c:?}"))?));
            continue;
        }
        let body: String = chars.by_ref().take_while(|&c| c != ']').collect();
        let rows: Vec<Vec<Option<Tile>>> = body
            .split('/')
            .map(|r| r.chars().map(|g| if g == '.' { Ok(None) } else { glyph_tile(g).map(Some).ok_or(format!("bad block glyph {g:?}")) }).collect())
            .collect::<Result<_, _>>()?;
        let w = rows.first().map_or(0, Vec::len);
        if w == 0 || rows.iter().any(|r| r.len() != w) {
            return Err(format!("ragged block {body:?}"));
        }
        out.push(Piece::Block(Block { w: w as u8, h: rows.len() as u8, tiles: rows.into_iter().flatten().collect(), rot: 0 }));
    }
    Ok(out)
}

/// Parse a level; panics-free, returns an error string on bad input.
pub fn parse(rows: &str, tray: &str) -> Result<Level, String> {
    let grid: Vec<Vec<Cell>> = rows
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .map(|l| l.split_whitespace().map(parse_cell).collect::<Result<Vec<_>, _>>())
        .collect::<Result<_, _>>()?;
    let height = grid.len();
    let width = grid.first().map_or(0, Vec::len);
    if grid.iter().any(|r| r.len() != width) {
        return Err("ragged rows".into());
    }
    let tray = parse_tray(tray)?;
    Ok(Level {
        width: width as u8,
        height: height as u8,
        cells: grid.into_iter().flatten().collect(),
        tray,
        rotatable: true,
        ordered: false,
        patrol: vec![],
        seed: 0,
        difficulty: 0,
        score: 0,
    })
}

/// Render a level (and optionally a board) as text, for debugging output.
pub fn render(level: &Level, board: Option<&[Option<Tile>]>) -> String {
    let mut out = String::new();
    for y in 0..level.height as usize {
        let row: Vec<String> = (0..level.width as usize)
            .map(|x| {
                let i = y * level.width as usize + x;
                let g = |t: Tile| tile_glyph(t).to_string();
                match &level.cells[i] {
                    Cell::Empty => board.and_then(|b| b[i]).map(|t| format!("+{}", g(t))).unwrap_or_else(|| ". ".into()),
                    Cell::Road { tile } => format!("{} ", g(*tile)),
                    Cell::Trail { tile } => format!("t{}", g(*tile)),
                    Cell::Start { tile } => format!("S{}", g(*tile)),
                    Cell::Finish { tile } => format!("F{}", g(*tile)),
                    Cell::Waypoint { tile, order } => format!("{order}{}", g(*tile)),
                    Cell::Obstacle { .. } => "# ".into(),
                    Cell::Mist { tile } => tile.map(|t| format!("m{}", g(t))).unwrap_or_else(|| "~ ".into()),
                }
            })
            .collect();
        out.push_str(row.join(" ").trim_end());
        out.push('\n');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn glyphs_roundtrip() {
        for (g, _) in GLYPHS {
            assert_eq!(tile_glyph(glyph_tile(g).unwrap()), g);
        }
    }

    #[test]
    fn parse_small() {
        let l = parse("S╶ ─ F╴\n. # ~", "│┘").unwrap();
        assert_eq!((l.width, l.height), (3, 2));
        assert_eq!(l.start(), Some(0));
        assert_eq!(l.finish(), Some(2));
        assert_eq!(l.tray.len(), 2);
        assert!(l.validate().is_ok());
        let t = parse_tray("─[┌─/│.]").unwrap();
        assert_eq!(t.len(), 2);
        assert!(matches!(&t[1], Piece::Block(b) if b.w == 2 && b.h == 2 && b.tiles[3].is_none()));
    }
}
