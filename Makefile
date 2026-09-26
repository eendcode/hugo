# Het Geheim van de Duinkapel — build, test and serve.
# Uses the rustup toolchain in ~/.cargo/bin when present.
export PATH := $(HOME)/.cargo/bin:$(PATH)

PORT ?= 8080

.PHONY: all wasm test levels validate calibrate perf serve clean

all: wasm

## Build the WASM module into web/pkg (git-ignored).
wasm:
	wasm-pack build core --target web --release --out-dir ../web/pkg

## Rust unit, property and performance tests.
test:
	cargo test --workspace --release

## Regenerate the committed level packs in web/levels.
levels:
	cargo run --release -p levelpack -- generate web/levels

## Re-solve every committed level and check it has exactly one solution.
validate:
	cargo run --release -p levelpack -- validate web/levels

## Score distribution per difficulty (for tuning the bands in generator.rs).
calibrate:
	cargo run --release -p levelpack -- calibrate

## Time 100 levels per difficulty and size; fails over budget.
perf:
	cargo run --release -p levelpack -- perf

## Serve web/ on http://localhost:$(PORT)/ for local play.
serve: wasm
	python3 -m http.server -d web $(PORT)

clean:
	cargo clean
	rm -rf web/pkg
