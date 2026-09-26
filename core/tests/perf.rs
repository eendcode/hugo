//! Generate 100 levels per difficulty and fail if the median is over budget.
//! The WASM budget is 200 ms on a mid-range phone; native release builds
//! should stay far below that. Debug builds get a looser budget.

use duinkapel_core::generator::{generate, MAX_DIFFICULTY};
use std::time::Instant;

#[test]
fn generation_is_fast_enough() {
    let budget_ms = if cfg!(debug_assertions) { 400.0 } else { 40.0 };
    for d in 0..=MAX_DIFFICULTY {
        let size = if d == 0 { 4 } else if d < 4 { 5 } else { 6 };
        let mut times: Vec<f64> = (0..100u64)
            .map(|seed| {
                let t = Instant::now();
                generate(seed, d, size).unwrap();
                t.elapsed().as_secs_f64() * 1000.0
            })
            .collect();
        times.sort_by(f64::total_cmp);
        let median = times[50];
        println!("difficulty {d} ({size}×{size}): median {median:.2} ms, max {:.2} ms", times[99]);
        assert!(median < budget_ms, "difficulty {d}: median {median:.1} ms over {budget_ms} ms");
    }
}
