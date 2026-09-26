//! Property tests: every generated level is valid, unsolved at the start,
//! has exactly one solution, and is reproducible from its seed.

use duinkapel_core::generator::{generate, MAX_DIFFICULTY};
use duinkapel_core::model::State;
use duinkapel_core::{rules, solver};
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(96))]

    #[test]
    fn generated_levels_have_one_solution(seed in any::<u64>(), d in 0..=MAX_DIFFICULTY, size in 4u8..=6) {
        let level = generate(seed, d, size).unwrap();
        prop_assert!(level.validate().is_ok());
        prop_assert_eq!(level.width, size);
        prop_assert_eq!(solver::count_solutions(&level, 2), 1);
        prop_assert!(!rules::check(&level, &State::empty(&level)).unwrap().won);
    }

    #[test]
    fn same_seed_same_level(seed in any::<u64>(), d in 0..=MAX_DIFFICULTY, size in 4u8..=6) {
        prop_assert_eq!(generate(seed, d, size).unwrap(), generate(seed, d, size).unwrap());
    }

    #[test]
    fn hints_always_lead_to_a_win(seed in any::<u64>(), d in 0..=MAX_DIFFICULTY, size in 4u8..=6) {
        let level = generate(seed, d, size).unwrap();
        let mut state = State::empty(&level);
        for _ in 0..level.len() * 3 {
            match solver::hint(&level, &state).unwrap() {
                Some(solver::Hint::Place { cell, piece, rot }) => {
                    state.placed[cell as usize] = Some(duinkapel_core::model::Placement { piece, rot })
                }
                Some(solver::Hint::Rotate { cell, rot }) => state.placed[cell as usize].as_mut().unwrap().rot = rot,
                Some(solver::Hint::Remove { cell }) => state.placed[cell as usize] = None,
                None => break,
            }
        }
        prop_assert!(rules::check(&level, &state).unwrap().won);
    }
}
