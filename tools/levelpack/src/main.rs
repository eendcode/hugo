//! Pre-generates the curated level packs in `web/levels/`, validates them,
//! and calibrates/benchmarks the generator.
//!
//!     levelpack generate [DIR]   write index.json + stage-N.json
//!     levelpack validate [DIR]   re-solve every level; fail if not unique
//!     levelpack calibrate        score distribution per difficulty and size
//!     levelpack perf             time 100 levels per difficulty; fail over budget

use duinkapel_core::generator::{self, Params, MAX_DIFFICULTY};
use duinkapel_core::model::Level;
use duinkapel_core::rng::Rng;
use duinkapel_core::solver;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::Instant;

/// The story stages: (difficulty, board size).
const STAGES: [(u32, u8); 8] = [(0, 4), (1, 5), (2, 5), (3, 5), (4, 6), (5, 5), (6, 6), (7, 6)];
const PER_STAGE: usize = 30;
/// Candidates generated per kept level; the kept ones are spread across
/// the candidates' score range so each stage ramps up gently.
const OVERSAMPLE: usize = 3;
/// Native median budget per level. The WASM budget on a phone is 200 ms;
/// native is several times faster.
const PERF_BUDGET_MS: f64 = 40.0;

#[derive(Serialize, Deserialize)]
struct StageInfo {
    stage: u32,
    difficulty: u32,
    size: u8,
    file: String,
    count: usize,
}

#[derive(Serialize, Deserialize)]
struct Index {
    version: u32,
    stages: Vec<StageInfo>,
}

#[derive(Serialize, Deserialize)]
struct Pack {
    stage: u32,
    difficulty: u32,
    size: u8,
    levels: Vec<Level>,
}

fn stage_seed(stage: u32, i: usize) -> u64 {
    // Keep seeds below 2^32 so they are exact JS numbers and easy to type.
    Rng::new(0xD0E1_u64 << 20 | (stage as u64) << 12 | i as u64).next_u64() & 0xFFFF_FFFF
}

fn generate(dir: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let mut index = Index { version: 1, stages: vec![] };
    for (s, &(difficulty, size)) in STAGES.iter().enumerate() {
        let stage = s as u32 + 1;
        let started = Instant::now();
        let mut candidates: Vec<Level> = Vec::new();
        let mut i = 0;
        while candidates.len() < PER_STAGE * OVERSAMPLE {
            let seed = stage_seed(stage, i);
            i += 1;
            let level = generator::generate(seed, difficulty, size).map_err(|e| e.to_string())?;
            if !candidates.iter().any(|c| c.cells == level.cells) {
                candidates.push(level);
            }
        }
        candidates.sort_by_key(|l| l.score);
        let n = candidates.len();
        let levels: Vec<Level> = (0..PER_STAGE).map(|k| candidates[k * (n - 1) / (PER_STAGE - 1)].clone()).collect();
        let file = format!("stage-{stage}.json");
        let pack = Pack { stage, difficulty, size, levels };
        let json = serde_json::to_string(&pack).map_err(|e| e.to_string())?;
        std::fs::write(dir.join(&file), json + "\n").map_err(|e| e.to_string())?;
        println!(
            "stage {stage}: {size}×{size} d{difficulty}, scores {}..{}, {:.1}s",
            pack.levels.first().unwrap().score,
            pack.levels.last().unwrap().score,
            started.elapsed().as_secs_f64()
        );
        index.stages.push(StageInfo { stage, difficulty, size, file, count: PER_STAGE });
    }
    let json = serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("index.json"), json + "\n").map_err(|e| e.to_string())?;
    Ok(())
}

fn validate(dir: &Path) -> Result<(), String> {
    let read = |p: PathBuf| std::fs::read_to_string(&p).map_err(|e| format!("{}: {e}", p.display()));
    let index: Index = serde_json::from_str(&read(dir.join("index.json"))?).map_err(|e| e.to_string())?;
    let mut bad = 0;
    let mut total = 0;
    for info in &index.stages {
        let pack: Pack = serde_json::from_str(&read(dir.join(&info.file))?).map_err(|e| format!("{}: {e}", info.file))?;
        if pack.levels.len() != info.count {
            return Err(format!("{}: expected {} levels, found {}", info.file, info.count, pack.levels.len()));
        }
        for (i, level) in pack.levels.iter().enumerate() {
            total += 1;
            let problem = if let Err(e) = level.validate() {
                Some(e.to_string())
            } else {
                let (sols, stats) = solver::solve(level, 2);
                match (sols.len(), stats.exhausted) {
                    (_, true) => Some("solver budget exhausted".to_string()),
                    (1, _) => None,
                    (n, _) => Some(format!("{n} solutions")),
                }
            };
            if let Some(p) = problem {
                bad += 1;
                eprintln!("{} level {}: {p}", info.file, i + 1);
            }
            // The seed must reproduce the level exactly.
            match generator::generate(level.seed, level.difficulty, level.width) {
                Ok(again) if &again == level => {}
                _ => {
                    bad += 1;
                    eprintln!("{} level {}: seed {} does not reproduce it", info.file, i + 1, level.seed);
                }
            }
        }
    }
    println!("validated {total} levels, {bad} problems");
    if bad > 0 {
        Err(format!("{bad} invalid levels"))
    } else {
        Ok(())
    }
}

fn median(v: &mut [f64]) -> f64 {
    v.sort_by(f64::total_cmp);
    v[v.len() / 2]
}

fn calibrate() {
    println!("diff size  score: min   p10   p50   p90   max   band");
    for d in 0..=MAX_DIFFICULTY {
        for size in [4u8, 5, 6] {
            // Generate without a band to see the raw distribution.
            let mut p = Params::for_difficulty(d, size);
            let band = p.band;
            p.band = (0, u32::MAX);
            let mut scores: Vec<f64> = (0..60)
                .filter_map(|i| generator::generate_with(stage_seed(100 + d, i), d, &p).ok())
                .map(|l| l.score as f64)
                .collect();
            if scores.is_empty() {
                println!("{d:>4} {size:>4}  (no levels)");
                continue;
            }
            scores.sort_by(f64::total_cmp);
            let q = |f: f64| scores[((scores.len() - 1) as f64 * f) as usize];
            println!(
                "{d:>4} {size:>4}       {:>5} {:>5} {:>5} {:>5} {:>5}   {}..{}",
                q(0.0),
                q(0.1),
                q(0.5),
                q(0.9),
                q(1.0),
                band.0,
                if band.1 == u32::MAX { "∞".into() } else { band.1.to_string() }
            );
        }
    }
}

fn perf() -> Result<(), String> {
    let mut over = Vec::new();
    println!("diff size  median ms   max ms");
    for d in 0..=MAX_DIFFICULTY {
        for size in [4u8, 5, 6] {
            let mut times: Vec<f64> = (0..100)
                .map(|i| {
                    let t = Instant::now();
                    generator::generate(stage_seed(200 + d, i), d, size).map_err(|e| e.to_string())?;
                    Ok(t.elapsed().as_secs_f64() * 1000.0)
                })
                .collect::<Result<_, String>>()?;
            let med = median(&mut times);
            let max = times.last().copied().unwrap_or(0.0);
            println!("{d:>4} {size:>4}  {med:>9.2} {max:>8.2}");
            if med > PERF_BUDGET_MS {
                over.push(format!("d{d} size {size}: median {med:.1} ms"));
            }
        }
    }
    if over.is_empty() {
        Ok(())
    } else {
        Err(format!("over the {PERF_BUDGET_MS} ms budget: {}", over.join(", ")))
    }
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let dir = PathBuf::from(args.get(1).map_or("web/levels", String::as_str));
    let result = match args.first().map(String::as_str) {
        Some("generate") => generate(&dir),
        Some("validate") => validate(&dir),
        Some("calibrate") => {
            calibrate();
            Ok(())
        }
        Some("perf") => perf(),
        _ => Err("usage: levelpack generate|validate [DIR] | calibrate | perf".into()),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}
