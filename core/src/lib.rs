//! Het Geheim van de Duinkapel: puzzle core.
//!
//! The logic modules are plain Rust and test natively; only the `wasm`
//! module below touches `wasm-bindgen`.

pub mod ascii;
pub mod generator;
pub mod model;
pub mod rng;
pub mod rules;
pub mod solver;

/// The WASM API. JSON strings cross the boundary; the shapes are the serde
/// forms of [`model::Level`], [`model::State`], [`rules::CheckResult`] and
/// [`solver::Hint`].
#[cfg(target_arch = "wasm32")]
mod wasm {
    use crate::model::{Level, State};
    use crate::{generator, rules, solver};
    use wasm_bindgen::prelude::*;

    fn parse(level: &str, state: &str) -> Result<(Level, State), JsError> {
        Ok((serde_json::from_str(level)?, serde_json::from_str(state)?))
    }

    /// A new level with exactly one solution, as JSON.
    #[wasm_bindgen]
    pub fn generate(seed: u32, difficulty: u32, size: u8) -> Result<String, JsError> {
        let level = generator::generate(seed as u64, difficulty, size)?;
        Ok(serde_json::to_string(&level)?)
    }

    /// Win check: `{won, route, issue, reached}`.
    #[wasm_bindgen]
    pub fn check(level: &str, state: &str) -> Result<String, JsError> {
        let (level, state) = parse(level, state)?;
        Ok(serde_json::to_string(&rules::check(&level, &state)?)?)
    }

    /// One step towards a solution, or `null`.
    #[wasm_bindgen]
    pub fn hint(level: &str, state: &str) -> Result<String, JsError> {
        let (level, state) = parse(level, state)?;
        Ok(serde_json::to_string(&solver::hint(&level, &state)?)?)
    }

    /// Number of solutions, stopping at `limit`.
    #[wasm_bindgen]
    pub fn solve_count(level: &str, limit: u32) -> Result<u32, JsError> {
        let level: Level = serde_json::from_str(level)?;
        Ok(solver::count_solutions(&level, limit))
    }
}
