# Het Geheim van de Duinkapel — build, test and serve.
# Uses the rustup toolchain in ~/.cargo/bin when present.
export PATH := $(HOME)/.cargo/bin:$(PATH)

PORT ?= 8080

.PHONY: all wasm test levels levels-roads levels-dorp levels-programma levels-lantaarn levels-wegvrij levels-planks validate calibrate perf serve deploy clean

all: wasm

## Build the WASM module into web/pkg (git-ignored).
wasm:
	wasm-pack build core --target web --release --out-dir ../web/pkg

## Rust unit, property and performance tests.
test:
	cargo test --workspace --release

## Regenerate all committed level packs in web/levels.
levels: levels-roads levels-dorp levels-programma levels-lantaarn levels-wegvrij levels-planks

## The road game's packs (web/levels/stage-N.json).
levels-roads:
	cargo run --release -p levelpack -- generate web/levels

## The chess packs (web/levels/dorp).
levels-dorp:
	cargo run --release -p levelpack -- dorp generate web/levels/dorp

## Barend's program, lantern light and the cart yard (the last takes a few minutes).
levels-programma levels-lantaarn levels-wegvrij: levels-%:
	cargo run --release -p levelpack -- $* generate web/levels/$*

## The story mode's Planken doors (web/levels/saga/planks.json).
levels-planks:
	cargo run --release -p levelpack -- planks generate web/levels/saga

## Re-check every committed level and puzzle (unique solutions, all packs).
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

## Copy the game to the Raspberry Pi: make deploy PI=pi@192.168.1.50
PI ?=
PI_DIR ?= /srv/duinkapel
deploy: wasm
	@test -n "$(PI)" || (echo "usage: make deploy PI=user@host" && exit 1)
	rsync -av --delete --exclude .gitignore --exclude package.json --exclude '*.d.ts' web/ $(PI):$(PI_DIR)/

clean:
	cargo clean
	rm -rf web/pkg
