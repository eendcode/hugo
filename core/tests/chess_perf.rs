//! Engine speed: one reply per level on the biggest setups must stay quick,
//! since the WASM engine runs on TV hardware. Native is several times faster.

use duinkapel_core::chess::puzzles::{generate, PuzzleKind};
use duinkapel_core::chess::search::best_move;
use duinkapel_core::chess::Board;
use std::time::Instant;

/// Native budget per engine reply. Typical is under 50 ms; the headroom is for
/// slow CI machines. The TV is several times slower than a laptop.
const BUDGET_MS: f64 = 400.0;

#[test]
fn engine_replies_quickly() {
    let mut worst: f64 = 0.0;
    for (kind, d) in [(PuzzleKind::Battle, 5), (PuzzleKind::Battle, 1), (PuzzleKind::PawnRace, 5), (PuzzleKind::Endgame, 4)] {
        let p = generate(kind, 1, d).unwrap();
        let mut b = Board::from_position(&p.position).unwrap();
        // Let the engine play both sides for a few moves.
        for ply in 0..8 {
            for level in 0..4 {
                let t = Instant::now();
                best_move(&b, level, ply);
                let ms = t.elapsed().as_secs_f64() * 1000.0;
                worst = worst.max(ms);
                println!("{kind:?} d{d} ply {ply} level {level}: {ms:.1} ms");
            }
            let Some(m) = best_move(&b, 2, ply) else { break };
            b = b.apply(m);
            if b.outcome().is_some() {
                break;
            }
        }
    }
    println!("worst reply: {worst:.1} ms");
    assert!(worst < BUDGET_MS, "slowest engine reply took {worst:.1} ms");
}
