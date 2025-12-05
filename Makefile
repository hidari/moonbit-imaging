# 開発環境 Makefile

.PHONY: build-wasm copy-wasm set-wasm format-moonbit format-front format start boot

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

# MoonBitのLinting & Formatting
format-moonbit:
	cd moonbit && \
	moon fmt

# フロントエンドのLinting & Formatting
format-front:
	cd web &&\
	pnpm run lint:fix --unsafe

# 全体のLinting & Formatting
format:
	make format-moonbit && \
	make format-front

# Vite開発サーバーの起動
start:
	cd web && \
	pnpm dev

# Vite開発サーバーの起動
boot:
	make set-wasm && \
	make format && \
	make start

.PHONY: build preview

# プロダクションビルド
build:
	make set-wasm && \
	cd web && \
	pnpm build

# ビルド結果のプレビュー
preview:
	cd web && \
	pnpm preview
