use duinkapel_core::{ascii, model::Level, solver};
fn main() {
    let a: Vec<String> = std::env::args().collect();
    let v: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&a[1]).unwrap()).unwrap();
    for i in a[2..].iter().map(|s| s.parse::<usize>().unwrap()) {
        let l: Level = serde_json::from_value(v["levels"][i].clone()).unwrap();
        let tray: String = l.tray.iter().map(|t| ascii::tile_glyph(*t)).collect();
        let sol = &solver::solve(&l, 1).0[0];
        let mut b = vec![None; l.len()];
        for (c, t) in &sol.pieces { b[*c as usize] = Some(*t); }
        println!("#{i} score {} ordered {} patrol {:?} tray {tray}\n{}\nsolution:\n{}", l.score, l.ordered, l.patrol, ascii::render(&l, None), ascii::render(&l, Some(&b)));
    }
}
