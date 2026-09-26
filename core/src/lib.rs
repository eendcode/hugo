//! Het Geheim van de Duinkapel: puzzle core.
//!
//! The logic modules are plain Rust and test natively; only the `wasm`
//! module below touches `wasm-bindgen`.

pub mod ascii;
pub mod model;
pub mod rng;
pub mod rules;
pub mod solver;
