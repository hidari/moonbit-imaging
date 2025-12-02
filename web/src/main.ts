import './style.css';

// WASMモジュールの型定義
interface ImageFilterModule {
  memory: WebAssembly.Memory;
  grayscale: (width: number, height: number) => void;
}

// メモリのオフセット位置（MoonBit側と同じ値を使用）
const BUFFER_OFFSET = 32768;

// グローバル変数
let wasmModule: ImageFilterModule | null = null;
let originalImageData: ImageData | null = null;

// Canvas要素の取得
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const grayscaleBtn = document.getElementById('grayscaleBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

// WASMモジュールの初期化
async function initWasm() {
  try {
    // メモリを作成（8192ページ = 512MB）
    const memory = new WebAssembly.Memory({ initial: 8192 });

    // WASMファイルを読み込む
    const response = await fetch('/wasm/lib.wasm');
    const bytes = await response.arrayBuffer();

    // WASMモジュールをインスタンス化
    const { instance } = await WebAssembly.instantiate(bytes, {
      env: {
        memory: memory,
      },
    });

    wasmModule = {
      memory: memory,
      grayscale: instance.exports.grayscale as any,
    };

    console.info(
      '%c[INFO]%c WebAssembly module initialized.',
      'background: #2196F3; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      'color: #333; margin-left: 5px;',
    );
  } catch (error) {
    console.error(
      '%c[ERROR]%c Failed to initialize WebAssembly module: %s',
      'color: #f44336; font-weight: bold; font-size: 14px; padding: 2px 5px; border-left: 4px solid #f44336;',
      error,
    );
  }
}

// ImageDataをメモリに書き込む関数
function writeImageDataToMemory(imageData: ImageData): void {
  if (!wasmModule) return;

  const data = imageData.data;
  const memory = new Uint8Array(wasmModule.memory.buffer);

  // データ長を書き込む（リトルエンディアン）
  const dataLength = data.length;
  memory[BUFFER_OFFSET] = dataLength & 0xff;
  memory[BUFFER_OFFSET + 1] = (dataLength >> 8) & 0xff;
  memory[BUFFER_OFFSET + 2] = (dataLength >> 16) & 0xff;
  memory[BUFFER_OFFSET + 3] = (dataLength >> 24) & 0xff;

  // 実際のデータを書き込む
  memory.set(data, BUFFER_OFFSET + 4);
}

// メモリから処理結果を読み取る関数
function readImageDataFromMemory(imageData: ImageData): void {
  if (!wasmModule) return;

  const memory = new Uint8Array(wasmModule.memory.buffer);
  const dataLength = imageData.data.length;

  // 処理結果をImageDataにコピー
  imageData.data.set(memory.slice(BUFFER_OFFSET + 4, BUFFER_OFFSET + 4 + dataLength));
}

// 画像の読み込み
imageInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    // Canvasのサイズを画像に合わせる
    canvas.width = img.width;
    canvas.height = img.height;

    // 画像を描画
    ctx.drawImage(img, 0, 0);

    // 元の画像データを保存
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // ボタンを有効化
    grayscaleBtn.disabled = false;
    resetBtn.disabled = false;
  };

  img.src = URL.createObjectURL(file);
});

// グレースケールフィルターの適用
grayscaleBtn.addEventListener('click', () => {
  if (!wasmModule || !originalImageData) return;

  // 現在のImageDataを取得
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // ImageDataをメモリに書き込む
  writeImageDataToMemory(imageData);

  // MoonBit側の処理を呼び出す
  wasmModule.grayscale(canvas.width, canvas.height);

  // 処理結果をメモリから読み取る
  readImageDataFromMemory(imageData);

  // Canvasに描画
  ctx.putImageData(imageData, 0, 0);
});

// リセットボタン
resetBtn.addEventListener('click', () => {
  if (!originalImageData) return;
  ctx.putImageData(originalImageData, 0, 0);
});

// 初期化
initWasm();
