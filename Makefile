# 開発環境 Makefile

.PHONY: build-wasm copy-wasm set-wasm lint start boot

# MoonBitコードのコンパイル
build-wasm:
	cd moonbit && moon build --target wasm-gc

# WebAssemblyファイルのコピー
copy-wasm:
	cp moonbit/target/wasm-gc/release/build/lib/lib.wasm web/public/wasm/

# wasmをビルドしてコピー
set-wasm:
	make build-wasm && \
	make copy-wasm

# Linting & Formatting
lint:
	cd web &&\
	pnpm run lint:fix

# Vite開発サーバーの起動
start:
	cd web && \
	pnpm dev

# Vite開発サーバーの起動
boot:
	make set-wasm && \
	make lint && \
	make start
