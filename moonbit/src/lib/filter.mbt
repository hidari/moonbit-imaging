///|
/// WebAssemblyのメモリに直接アクセスするためのFFI関数
/// load8: メモリの指定位置から1バイトを読み取る
extern "wasm" fn load8(pos : Int) -> Int =
  #|(func (param $pos i32) (result i32)
  #|  (i32.load8_u (local.get $pos)))

///|
/// store8: メモリの指定位置に1バイトを書き込む
extern "wasm" fn store8(pos : Int, value : Int) =
  #|(func (param $pos i32) (param $value i32)
  #|  (i32.store8 (local.get $pos) (local.get $value)))

///|
/// メモリのオフセット位置を定義
/// WebAssemblyのメモリは64KBページ単位で管理される
/// 32768バイト（32KB）目から使用することで、他のデータとの衝突を避ける
let buffer_offset : Int = 32768

///|
/// メモリからデータ長を読み取る関数
/// リトルエンディアン形式で4バイトの整数として格納されている
fn read_length(offset : Int) -> Int {
  let b0 = load8(offset)
  let b1 = load8(offset + 1)
  let b2 = load8(offset + 2)
  let b3 = load8(offset + 3)
  // 4バイトを結合して32ビット整数に変換
  b0 + b1 * 256 + b2 * 65536 + b3 * 16777216
}

///|
/// グレースケール変換を行う関数
/// width: 画像の幅（ピクセル単位）
/// height: 画像の高さ（ピクセル単位）
///
/// この関数は、メモリの buffer_offset 位置にあるデータを処理します
/// データは以下の形式で配置されている必要があります：
/// [データ長(4バイト)][ピクセルデータ(RGBA形式)]
pub fn grayscale(_width : Int, _height : Int) -> Unit {
  // データ長を読み取る
  let data_len = read_length(buffer_offset)

  // データの開始位置（データ長の4バイト後）
  let data_start = buffer_offset + 4

  // ピクセル数を計算（各ピクセルは4バイト）
  let pixel_count = data_len / 4

  // 全てのピクセルを処理
  for i = 0; i < pixel_count; i = i + 1 {
    // 現在のピクセルの開始位置
    let base = data_start + i * 4

    // RGBA値を読み取る
    let r = load8(base)
    let g = load8(base + 1)
    let b = load8(base + 2)
    let a = load8(base + 3)

    // 輝度を計算
    // 浮動小数点演算を避けるため、整数演算で近似
    // 0.299 ≈ 299/1000, 0.587 ≈ 587/1000, 0.114 ≈ 114/1000
    let gray = (299 * r + 587 * g + 114 * b) / 1000

    // 結果をメモリに書き戻す
    store8(base, gray)
    store8(base + 1, gray)
    store8(base + 2, gray)
    store8(base + 3, a) // アルファチャンネルは保持
  }
}

///|
/// 値を指定範囲にクリップするヘルパー関数
/// value: クリップする値
/// min: 最小値
/// max: 最大値
/// 戻り値: min以上max以下の値
fn clamp(value : Int, min : Int, max : Int) -> Int {
  if value < min {
    min
  } else if value > max {
    max
  } else {
    value
  }
}

///|
/// 明度調整フィルター
/// width: 画像の幅（ピクセル単位）
/// height: 画像の高さ（ピクセル単位）
/// brightness: 調整量（-255から255の範囲）正の値で明るく、負の値で暗くなる
pub fn brightness(width : Int, height : Int, brightness : Int) -> Unit {
  let data_len = read_length(buffer_offset)
  let data_start = buffer_offset + 4
  let pixel_count = data_len / 4
  for i = 0; i < pixel_count; i = i + 1 {
    let base = data_start + i * 4
    let r = load8(base)
    let g = load8(base + 1)
    let b = load8(base + 2)
    let a = load8(base + 3)

    // 明度を調整し、0-255の範囲にクリップ
    let new_r = clamp(r + brightness, 0, 255)
    let new_g = clamp(g + brightness, 0, 255)
    let new_b = clamp(b + brightness, 0, 255)
    store8(base, new_r)
    store8(base + 1, new_g)
    store8(base + 2, new_b)
    store8(base + 3, a)
  }
}
