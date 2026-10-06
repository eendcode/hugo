//! Property tests for Planken: every generated door has exactly one
//! covering, is reproducible from its seed, and following the hints from
//! any start (even with a plank in the wrong place) closes the door.

use duinkapel_core::planks::{check, generate, hint, verify, Hint, Placement, MAX_DIFFICULTY};
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn generated_doors_have_one_covering(seed in any::<u64>(), d in 0..=MAX_DIFFICULTY) {
        let door = generate(seed, d).unwrap();
        prop_assert!(verify(&door).is_ok());
        prop_assert!(!check(&door, &[]).unwrap().won);
        prop_assert_eq!(generate(seed, d).unwrap(), door);
    }

    #[test]
    fn hints_close_the_door(seed in any::<u64>(), d in 0..=MAX_DIFFICULTY, first in any::<u8>(), rot in 0u8..4, at in any::<u8>()) {
        let door = generate(seed, d).unwrap();
        // Start with one plank nailed anywhere it fits, right or wrong.
        let mut placed: Vec<Placement> = vec![];
        let p = Placement { plank: first % door.planks.len() as u8, rot, anchor: at % door.holes.len() as u8 };
        if check(&door, &[p]).is_ok() {
            placed.push(p);
        }
        for _ in 0..door.planks.len() * 3 {
            match hint(&door, &placed).unwrap() {
                Some(Hint::Place { plank, rot, anchor }) => placed.push(Placement { plank, rot, anchor }),
                Some(Hint::Remove { plank }) => placed.retain(|q| q.plank != plank),
                None => break,
            }
        }
        prop_assert!(check(&door, &placed).unwrap().won);
    }
}
