//! The Planken doors for the story mode: one ordered list in
//! `web/levels/saga/planks.json`, one door per difficulty from two sticks
//! to five planks with a corner and a square. Chapters pick from it.
//!
//!     levelpack planks generate|validate|show [DIR]

use duinkapel_core::planks::{self, Door, MAX_DIFFICULTY};
use duinkapel_core::rng::Rng;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const FILE: &str = "planks.json";
/// Candidates per door; the one with the middle score is kept, so no door
/// is a fluke of its difficulty.
const CANDIDATES: usize = 9;

#[derive(Serialize, Deserialize)]
struct Pack {
    version: u32,
    levels: Vec<Door>,
}

fn seed(d: u32, i: usize) -> u64 {
    Rng::new(0x9_1A4C << 20 ^ (d as u64) << 12 ^ i as u64).next_u64() & 0xFFFF_FFFF
}

pub fn generate(dir: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let mut levels = vec![];
    for d in 0..=MAX_DIFFICULTY {
        let mut candidates: Vec<Door> = vec![];
        let mut i = 0;
        while candidates.len() < CANDIDATES {
            let door = planks::generate(seed(d, i), d)?;
            i += 1;
            if !candidates.iter().any(|c| c.holes == door.holes && c.planks == door.planks) {
                candidates.push(door);
            }
        }
        candidates.sort_by_key(|c| c.score);
        let door = candidates.swap_remove(CANDIDATES / 2);
        println!("planks door {}: {} planks, {} gaps, score {}", d + 1, door.planks.len(), door.holes.iter().filter(|&&h| h).count(), door.score);
        levels.push(door);
    }
    let json = serde_json::to_string(&Pack { version: 1, levels }).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(FILE), json + "\n").map_err(|e| e.to_string())
}

fn read(dir: &Path) -> Result<Pack, String> {
    let path = dir.join(FILE);
    let text = std::fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
}

pub fn validate(dir: &Path) -> Result<(), String> {
    let pack = read(dir)?;
    let mut bad = 0;
    for (i, door) in pack.levels.iter().enumerate() {
        let problem = planks::verify(door).err().or_else(|| match planks::generate(door.seed, door.difficulty) {
            Ok(again) if &again == door => None,
            _ => Some(format!("seed {} does not reproduce it", door.seed)),
        });
        if let Some(p) = problem {
            bad += 1;
            eprintln!("{FILE} door {}: {p}", i + 1);
        }
    }
    println!("validated {} planks doors, {bad} problems", pack.levels.len());
    if bad > 0 {
        Err(format!("{bad} invalid planks doors"))
    } else {
        Ok(())
    }
}

/// Each door as text: `#` a gap, `.` wood; then the planks and the covering.
pub fn show(dir: &Path) -> Result<(), String> {
    for (i, door) in read(dir)?.levels.iter().enumerate() {
        let w = door.width as usize;
        let mut grid: Vec<char> = door.holes.iter().map(|&h| if h { '#' } else { '.' }).collect();
        for p in &door.solution {
            for c in door.covers(p).unwrap_or_default() {
                grid[c] = (b'a' + p.plank) as char;
            }
        }
        println!("#{} score {}, planks {}", i + 1, door.score, door.planks.len());
        for row in grid.chunks(w) {
            println!("  {}", row.iter().collect::<String>());
        }
    }
    Ok(())
}

pub fn command(args: &[String]) -> Result<(), String> {
    let dir = PathBuf::from(args.get(1).map_or("web/levels/saga", String::as_str));
    match args.first().map(String::as_str) {
        Some("generate") => generate(&dir),
        Some("validate") => validate(&dir),
        Some("show") => show(&dir),
        _ => Err("usage: levelpack planks generate|validate|show [DIR]".into()),
    }
}

/// Validate the doors if `root/saga/planks.json` exists.
pub fn validate_in(root: &Path) -> Result<(), String> {
    let dir = root.join("saga");
    if dir.join(FILE).exists() {
        validate(&dir)?;
    }
    Ok(())
}
