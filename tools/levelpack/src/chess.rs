//! Level packs for "Verdedig het dorp" (chess) in `web/levels/dorp/`.

use duinkapel_core::chess::puzzles::{self, capture_with, mate_with, Puzzle, PuzzleKind};
use duinkapel_core::chess::Kind;
use duinkapel_core::rng::Rng;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Instant;

/// Candidates per level; the middle one by score is kept.
const OVERSAMPLE: usize = 3;

struct StageDef {
    kind: PuzzleKind,
    count: usize,
    /// Levels to finish before the next stage opens.
    need: usize,
    make: fn(u64, usize) -> Result<Puzzle, String>,
}

/// The piece refresher: each piece gets a few levels, easy to harder.
/// (piece, size, robbers, trees)
const CAPTURE_LEVELS: [(Kind, u8, usize, usize); 12] = [
    (Kind::Rook, 4, 2, 1),
    (Kind::Rook, 5, 3, 2),
    (Kind::Bishop, 4, 2, 0),
    (Kind::Bishop, 5, 3, 1),
    (Kind::Queen, 5, 3, 2),
    (Kind::Queen, 5, 4, 3),
    (Kind::Knight, 4, 2, 0),
    (Kind::Knight, 5, 3, 1),
    (Kind::King, 4, 3, 1),
    (Kind::King, 5, 4, 3),
    (Kind::Pawn, 5, 2, 0),
    (Kind::Knight, 5, 4, 2),
];

fn stages() -> Vec<StageDef> {
    vec![
        StageDef {
            kind: PuzzleKind::Capture,
            count: CAPTURE_LEVELS.len(),
            need: 8,
            make: |seed, i| {
                let (piece, size, robbers, trees) = CAPTURE_LEVELS[i];
                let mut p = capture_with(seed, piece, size, robbers, trees)?;
                p.difficulty = i as u32;
                Ok(p)
            },
        },
        StageDef { kind: PuzzleKind::SafeCapture, count: 12, need: 8, make: |seed, i| puzzles::generate(PuzzleKind::SafeCapture, seed, (i / 2) as u32) },
        StageDef {
            kind: PuzzleKind::Mate,
            count: 12,
            need: 8,
            make: |seed, i| {
                let (size, w, b) = [(5, 1, 0), (5, 1, 1), (5, 2, 1), (6, 2, 1)][i / 3];
                let mut p = mate_with(seed, size, 1, w, b)?;
                p.difficulty = (i / 3) as u32;
                Ok(p)
            },
        },
        StageDef { kind: PuzzleKind::Mate, count: 12, need: 8, make: |seed, i| puzzles::generate(PuzzleKind::Mate, seed, 2 + (i / 6) as u32) },
        StageDef { kind: PuzzleKind::PawnRace, count: 6, need: 3, make: |seed, i| puzzles::generate(PuzzleKind::PawnRace, seed, i as u32) },
        StageDef { kind: PuzzleKind::Endgame, count: 6, need: 3, make: |seed, i| puzzles::generate(PuzzleKind::Endgame, seed, i as u32) },
        StageDef { kind: PuzzleKind::Mate, count: 12, need: 8, make: |seed, i| puzzles::generate(PuzzleKind::Mate, seed, 4 + (i / 6) as u32) },
        StageDef { kind: PuzzleKind::Battle, count: 6, need: 3, make: |seed, i| puzzles::generate(PuzzleKind::Battle, seed, i as u32) },
    ]
}

#[derive(Serialize, Deserialize)]
struct StageInfo {
    stage: u32,
    kind: PuzzleKind,
    file: String,
    count: usize,
    need: usize,
}

#[derive(Serialize, Deserialize)]
struct Index {
    version: u32,
    stages: Vec<StageInfo>,
}

#[derive(Serialize, Deserialize)]
struct Pack {
    stage: u32,
    puzzles: Vec<Puzzle>,
}

fn seed(stage: u32, i: usize) -> u64 {
    Rng::new(0xD0_5B << 24 | (stage as u64) << 12 | i as u64).next_u64() & 0xFFFF_FFFF
}

pub fn generate(dir: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let mut index = Index { version: 1, stages: vec![] };
    for (s, def) in stages().iter().enumerate() {
        let stage = s as u32 + 1;
        let started = Instant::now();
        let mut kept: Vec<Puzzle> = Vec::new();
        let mut k = 0;
        // Games against the engine have fixed setups: nothing to choose from.
        let game = matches!(def.kind, PuzzleKind::PawnRace | PuzzleKind::Endgame | PuzzleKind::Battle);
        let oversample = if game { 1 } else { OVERSAMPLE };
        for i in 0..def.count {
            let mut candidates = Vec::new();
            while candidates.len() < oversample {
                let p = (def.make)(seed(stage, k), i)?;
                k += 1;
                if game || !kept.iter().chain(candidates.iter()).any(|q: &Puzzle| q.position == p.position) {
                    candidates.push(p);
                }
            }
            candidates.sort_by_key(|p| p.score);
            kept.push(candidates.swap_remove(oversample / 2));
        }
        // Within each difficulty step, easier first.
        kept.sort_by_key(|p| (p.difficulty, p.score));
        let file = format!("stage-{stage}.json");
        let json = serde_json::to_string(&Pack { stage, puzzles: kept }).map_err(|e| e.to_string())?;
        std::fs::write(dir.join(&file), json + "\n").map_err(|e| e.to_string())?;
        println!("dorp stage {stage}: {} × {:?}, {:.1}s", def.count, def.kind, started.elapsed().as_secs_f64());
        index.stages.push(StageInfo { stage, kind: def.kind, file, count: def.count, need: def.need });
    }
    let json = serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("index.json"), json + "\n").map_err(|e| e.to_string())
}

pub fn validate(dir: &Path) -> Result<(), String> {
    let read = |p: PathBuf| std::fs::read_to_string(&p).map_err(|e| format!("{}: {e}", p.display()));
    let index: Index = serde_json::from_str(&read(dir.join("index.json"))?).map_err(|e| e.to_string())?;
    let (mut total, mut bad) = (0, 0);
    for info in &index.stages {
        let pack: Pack = serde_json::from_str(&read(dir.join(&info.file))?).map_err(|e| format!("{}: {e}", info.file))?;
        if pack.puzzles.len() != info.count {
            return Err(format!("{}: expected {} puzzles, found {}", info.file, info.count, pack.puzzles.len()));
        }
        for (i, p) in pack.puzzles.iter().enumerate() {
            total += 1;
            if let Err(e) = puzzles::verify(p) {
                bad += 1;
                eprintln!("dorp {} puzzle {}: {e}", info.file, i + 1);
            }
        }
    }
    println!("validated {total} village puzzles, {bad} problems");
    if bad > 0 {
        Err(format!("{bad} invalid puzzles"))
    } else {
        Ok(())
    }
}

/// Print a stage's puzzles as boards, for eyeballing.
pub fn show(dir: &Path, stage: u32) -> Result<(), String> {
    let path = dir.join(format!("stage-{stage}.json"));
    let pack: Pack = serde_json::from_str(&std::fs::read_to_string(&path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    for (i, p) in pack.puzzles.iter().enumerate() {
        println!("#{} {:?} moves={} d={} score={} seed={}", i + 1, p.kind, p.moves, p.difficulty, p.score, p.seed);
        for row in &p.position.rows {
            println!("  {row}");
        }
    }
    Ok(())
}
