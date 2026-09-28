//! Level packs for Barends programma, Lantaarnlicht and Maak de weg vrij,
//! each in its own folder under `web/levels/`. They share one format:
//! `index.json` lists the stages, `stage-N.json` holds `{stage, levels}`.

use duinkapel_core::rng::Rng;
use duinkapel_core::{carts, lantern, program};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Instant;

const PER_STAGE: usize = 10;
const NEED: usize = 6;
/// Candidates per kept level; the kept ones spread over the score range.
const OVERSAMPLE: usize = 3;

pub trait Pack {
    type Level: Serialize + DeserializeOwned + PartialEq + Clone;
    const NAME: &'static str;
    fn stages() -> usize;
    fn make(seed: u64, stage: usize) -> Result<Self::Level, String>;
    fn verify(level: &Self::Level) -> Result<(), String>;
    fn score(level: &Self::Level) -> u32;
    fn show(level: &Self::Level) -> String;
}

pub struct Programma;
pub struct Lantaarn;
pub struct Wegvrij;

const PROGRAMMA: [program::Params; 6] = [
    program::Params { relative: false, size: 4, trees: (1, 3), apples: (0, 0), best: (2, 3), spare: 2 },
    program::Params { relative: false, size: 5, trees: (2, 4), apples: (1, 2), best: (3, 4), spare: 2 },
    program::Params { relative: false, size: 5, trees: (3, 5), apples: (0, 1), best: (3, 5), spare: 0 },
    program::Params { relative: true, size: 4, trees: (1, 3), apples: (0, 0), best: (3, 4), spare: 2 },
    program::Params { relative: true, size: 5, trees: (2, 5), apples: (1, 2), best: (5, 7), spare: 1 },
    program::Params { relative: false, size: 6, trees: (5, 8), apples: (2, 3), best: (5, 7), spare: 0 },
];

impl Pack for Programma {
    type Level = program::Field;
    const NAME: &'static str = "programma";
    fn stages() -> usize {
        PROGRAMMA.len()
    }
    fn make(seed: u64, stage: usize) -> Result<Self::Level, String> {
        program::generate(seed, stage as u32, &PROGRAMMA[stage])
    }
    fn verify(l: &Self::Level) -> Result<(), String> {
        program::verify(l)?;
        match Self::make(l.seed, l.difficulty as usize) {
            Ok(again) if &again == l => Ok(()),
            _ => Err(format!("seed {} does not reproduce it", l.seed)),
        }
    }
    fn score(l: &Self::Level) -> u32 {
        l.score
    }
    fn show(l: &Self::Level) -> String {
        let mut out = format!("best {} of {} slots, facing {:?}\n", l.best, l.slots, l.facing);
        for y in 0..l.height as usize {
            let row: String = (0..l.width as usize)
                .map(|x| {
                    let i = y * l.width as usize + x;
                    if i == l.start as usize {
                        'B'
                    } else {
                        match l.cells[i] {
                            program::Cell::Grass => '.',
                            program::Cell::Tree => '#',
                            program::Cell::Apple => 'a',
                            program::Cell::Stable => 'S',
                        }
                    }
                })
                .collect();
            out += &format!("  {row}\n");
        }
        out
    }
}

const LANTAARN: [lantern::Params; 6] = [
    lantern::Params { size: 4, turns: (1, 1), stones: 1, fixed: 0, spare: 0, walls: 1 },
    lantern::Params { size: 5, turns: (2, 2), stones: 1, fixed: 0, spare: 0, walls: 2 },
    lantern::Params { size: 5, turns: (2, 3), stones: 2, fixed: 0, spare: 0, walls: 3 },
    lantern::Params { size: 5, turns: (2, 3), stones: 2, fixed: 0, spare: 1, walls: 3 },
    lantern::Params { size: 6, turns: (3, 4), stones: 3, fixed: 1, spare: 1, walls: 5 },
    lantern::Params { size: 7, turns: (4, 5), stones: 3, fixed: 1, spare: 1, walls: 7 },
];

impl Pack for Lantaarn {
    type Level = lantern::Field;
    const NAME: &'static str = "lantaarn";
    fn stages() -> usize {
        LANTAARN.len()
    }
    fn make(seed: u64, stage: usize) -> Result<Self::Level, String> {
        lantern::generate(seed, stage as u32, &LANTAARN[stage])
    }
    fn verify(l: &Self::Level) -> Result<(), String> {
        lantern::verify(l)?;
        match Self::make(l.seed, l.difficulty as usize) {
            Ok(again) if &again == l => Ok(()),
            _ => Err(format!("seed {} does not reproduce it", l.seed)),
        }
    }
    fn score(l: &Self::Level) -> u32 {
        l.score
    }
    fn show(l: &Self::Level) -> String {
        let mut out = format!("mirrors {}, solution {:?}\n", l.mirrors, l.solution);
        for y in 0..l.height as usize {
            let row: String = (0..l.width as usize)
                .map(|x| match l.cells[y * l.width as usize + x] {
                    lantern::Cell::Empty => '.',
                    lantern::Cell::Wall => '#',
                    lantern::Cell::Stone => 'o',
                    lantern::Cell::Fixed(lantern::Mirror::Slash) => '/',
                    lantern::Cell::Fixed(lantern::Mirror::Backslash) => '\\',
                    lantern::Cell::Lantern => 'L',
                })
                .collect();
            out += &format!("  {row}\n");
        }
        out
    }
}

const WEGVRIJ: [carts::Params; 6] = [
    carts::Params { carts: (3, 5), par: (1, 3) },
    carts::Params { carts: (5, 7), par: (4, 6) },
    carts::Params { carts: (6, 9), par: (7, 10) },
    carts::Params { carts: (7, 10), par: (11, 15) },
    carts::Params { carts: (8, 11), par: (16, 22) },
    carts::Params { carts: (9, 12), par: (23, 40) },
];

impl Pack for Wegvrij {
    type Level = carts::Yard;
    const NAME: &'static str = "wegvrij";
    fn stages() -> usize {
        WEGVRIJ.len()
    }
    fn make(seed: u64, stage: usize) -> Result<Self::Level, String> {
        carts::generate(seed, stage as u32, &WEGVRIJ[stage])
    }
    // Regenerating the hardest yards takes minutes, so only the par is re-checked.
    fn verify(l: &Self::Level) -> Result<(), String> {
        carts::verify(l)
    }
    fn score(l: &Self::Level) -> u32 {
        l.score
    }
    fn show(l: &Self::Level) -> String {
        let n = l.size as usize;
        let mut g = vec!['.'; n * n];
        for (k, c) in l.carts.iter().enumerate() {
            let ch = if k == 0 { 'B' } else { (b'a' + k as u8 - 1) as char };
            for i in 0..c.len {
                let (x, y) = if c.horizontal { (c.x + i, c.y) } else { (c.x, c.y + i) };
                g[y as usize * n + x as usize] = ch;
            }
        }
        let mut out = format!("par {}\n", l.par);
        for y in 0..n {
            out += &format!("  {}\n", g[y * n..(y + 1) * n].iter().collect::<String>());
        }
        out
    }
}

#[derive(Serialize, Deserialize)]
struct StageInfo {
    stage: u32,
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
#[serde(bound = "L: Serialize + DeserializeOwned")]
struct StagePack<L> {
    stage: u32,
    levels: Vec<L>,
}

fn seed(name: &str, stage: usize, i: usize) -> u64 {
    let h = name.bytes().fold(0u64, |h, b| h.wrapping_mul(31).wrapping_add(b as u64));
    Rng::new(h << 20 ^ (stage as u64) << 12 ^ i as u64).next_u64() & 0xFFFF_FFFF
}

pub fn generate<P: Pack>(dir: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let mut index = Index { version: 1, stages: vec![] };
    for s in 0..P::stages() {
        let started = Instant::now();
        let mut candidates: Vec<P::Level> = Vec::new();
        let mut i = 0;
        while candidates.len() < PER_STAGE * OVERSAMPLE {
            let level = P::make(seed(P::NAME, s, i), s)?;
            i += 1;
            let json = serde_json::to_string(&level).map_err(|e| e.to_string())?;
            // The seed is part of the JSON, so compare without it by score + shape.
            if !candidates.iter().any(|c| same_puzzle(c, &level, &json)) {
                candidates.push(level);
            }
        }
        candidates.sort_by_key(P::score);
        let n = candidates.len();
        let levels: Vec<P::Level> = (0..PER_STAGE).map(|k| candidates[k * (n - 1) / (PER_STAGE - 1)].clone()).collect();
        let stage = s as u32 + 1;
        let file = format!("stage-{stage}.json");
        let first = P::score(&levels[0]);
        let last = P::score(levels.last().unwrap());
        let json = serde_json::to_string(&StagePack { stage, levels }).map_err(|e| e.to_string())?;
        std::fs::write(dir.join(&file), json + "\n").map_err(|e| e.to_string())?;
        println!("{} stage {stage}: scores {first}..{last}, {:.1}s", P::NAME, started.elapsed().as_secs_f64());
        index.stages.push(StageInfo { stage, file, count: PER_STAGE, need: NEED });
    }
    let json = serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("index.json"), json + "\n").map_err(|e| e.to_string())
}

/// Two levels are the same puzzle if they only differ in seed and score.
fn same_puzzle<L: Serialize>(a: &L, _b: &L, b_json: &str) -> bool {
    let strip = |s: &str| -> serde_json::Value {
        let mut v: serde_json::Value = serde_json::from_str(s).unwrap();
        if let Some(o) = v.as_object_mut() {
            o.remove("seed");
            o.remove("score");
        }
        v
    };
    strip(&serde_json::to_string(a).unwrap()) == strip(b_json)
}

pub fn validate<P: Pack>(dir: &Path) -> Result<(), String> {
    let read = |p: PathBuf| std::fs::read_to_string(&p).map_err(|e| format!("{}: {e}", p.display()));
    let index: Index = serde_json::from_str(&read(dir.join("index.json"))?).map_err(|e| e.to_string())?;
    let (mut total, mut bad) = (0, 0);
    for info in &index.stages {
        let pack: StagePack<P::Level> = serde_json::from_str(&read(dir.join(&info.file))?).map_err(|e| format!("{}: {e}", info.file))?;
        if pack.levels.len() != info.count {
            return Err(format!("{}: expected {} levels, found {}", info.file, info.count, pack.levels.len()));
        }
        for (i, l) in pack.levels.iter().enumerate() {
            total += 1;
            if let Err(e) = P::verify(l) {
                bad += 1;
                eprintln!("{} {} level {}: {e}", P::NAME, info.file, i + 1);
            }
        }
    }
    println!("validated {total} {} levels, {bad} problems", P::NAME);
    if bad > 0 {
        Err(format!("{bad} invalid {} levels", P::NAME))
    } else {
        Ok(())
    }
}

pub fn show<P: Pack>(dir: &Path, stage: u32) -> Result<(), String> {
    let path = dir.join(format!("stage-{stage}.json"));
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let pack: StagePack<P::Level> = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    for (i, l) in pack.levels.iter().enumerate() {
        println!("#{} score {}: {}", i + 1, P::score(l), P::show(l));
    }
    Ok(())
}

/// Dispatch `levelpack <name> generate|validate|show …` for these packs.
pub fn command(name: &str, args: &[String]) -> Option<Result<(), String>> {
    fn run<P: Pack>(args: &[String]) -> Result<(), String> {
        let default = format!("web/levels/{}", P::NAME);
        let dir = |i: usize| PathBuf::from(args.get(i).map_or(default.as_str(), String::as_str));
        match args.first().map(String::as_str) {
            Some("generate") => generate::<P>(&dir(1)),
            Some("validate") => validate::<P>(&dir(1)),
            Some("show") => match args.get(1).and_then(|n| n.parse().ok()) {
                Some(n) => show::<P>(&dir(2), n),
                None => Err(format!("usage: levelpack {} show N [DIR]", P::NAME)),
            },
            _ => Err(format!("usage: levelpack {} generate|validate [DIR] | show N [DIR]", P::NAME)),
        }
    }
    Some(match name {
        "programma" => run::<Programma>(args),
        "lantaarn" => run::<Lantaarn>(args),
        "wegvrij" => run::<Wegvrij>(args),
        _ => return None,
    })
}

/// Validate every one of these packs that exists under `root`.
pub fn validate_all(root: &Path) -> Result<(), String> {
    for (name, f) in [
        ("programma", validate::<Programma> as fn(&Path) -> Result<(), String>),
        ("lantaarn", validate::<Lantaarn>),
        ("wegvrij", validate::<Wegvrij>),
    ] {
        let dir = root.join(name);
        if dir.join("index.json").exists() {
            f(&dir)?;
        }
    }
    Ok(())
}
