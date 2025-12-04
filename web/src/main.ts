import './style.css';

// WASMモジュールの型定義
interface ImageFilterModule {
  memory: WebAssembly.Memory;
  grayscale: (width: number, height: number) => void;
  brightness: (width: number, height: number, brightness: number) => void;
  contrast: (width: number, height: number, contrast: number) => void;
  color_balance: (width: number, height: number, red: number, green: number, blue: number) => void;
}

// メモリのオフセット位置（MoonBit側と同じ値を使用）
const BUFFER_OFFSET = 32768;

// グローバル変数
let wasmModule: ImageFilterModule | null = null;
let originalImageData: ImageData | null = null;

// Canvas要素の取得
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const grayscaleBtn = document.getElementById('grayscaleBtn') as HTMLButtonElement;
const brightnessSlider = document.getElementById('brightnessSlider') as HTMLInputElement;
const brightnessValue = document.getElementById('brightnessValue') as HTMLSpanElement;
const applyBrightnessBtn = document.getElementById('applyBrightnessBtn') as HTMLButtonElement;
const contrastSlider = document.getElementById('contrastSlider') as HTMLInputElement;
const contrastValue = document.getElementById('contrastValue') as HTMLSpanElement;
const applyContrastBtn = document.getElementById('applyContrastBtn') as HTMLButtonElement;
const redSlider = document.getElementById('redSlider') as HTMLInputElement;
const redValue = document.getElementById('redValue') as HTMLSpanElement;
const greenSlider = document.getElementById('greenSlider') as HTMLInputElement;
const greenValue = document.getElementById('greenValue') as HTMLSpanElement;
const blueSlider = document.getElementById('blueSlider') as HTMLInputElement;
const blueValue = document.getElementById('blueValue') as HTMLSpanElement;
const applyColorBalanceBtn = document.getElementById('applyColorBalanceBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const clearImageBtn = document.getElementById('clearImageBtn') as HTMLButtonElement;

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
      brightness: instance.exports.brightness as any,
      contrast: instance.exports.contrast as any,
      color_balance: instance.exports.color_balance as any,
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

    // 画像が読み込まれたことを示すクラスを追加
    canvasContainer.classList.add('has-image');

    // ボタンなどを有効化
    grayscaleBtn.disabled = false;
    brightnessSlider.disabled = false;
    applyBrightnessBtn.disabled = false;
    contrastSlider.disabled = false;
    applyContrastBtn.disabled = false;
    redSlider.disabled = false;
    greenSlider.disabled = false;
    blueSlider.disabled = false;
    applyColorBalanceBtn.disabled = false;
    resetBtn.disabled = false;
    clearImageBtn.disabled = false;
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

// スライダーの値が変更されたら表示を更新
brightnessSlider.addEventListener('input', () => {
  brightnessValue.textContent = brightnessSlider.value;
});

// 明度調整を適用
applyBrightnessBtn.addEventListener('click', () => {
  if (!wasmModule || !originalImageData) return;

  const brightness = parseInt(brightnessSlider.value, 10);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  writeImageDataToMemory(imageData);
  wasmModule.brightness(canvas.width, canvas.height, brightness);
  readImageDataFromMemory(imageData);

  ctx.putImageData(imageData, 0, 0);
});

// コントラスト調整スライダーの値表示更新
contrastSlider.addEventListener('input', () => {
  contrastValue.textContent = contrastSlider.value;
});

// コントラスト調整を適用
applyContrastBtn.addEventListener('click', () => {
  if (!wasmModule || !originalImageData) return;

  const contrast = parseInt(contrastSlider.value, 10);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  writeImageDataToMemory(imageData);
  wasmModule.contrast(canvas.width, canvas.height, contrast);
  readImageDataFromMemory(imageData);

  ctx.putImageData(imageData, 0, 0);
});

// 色味調整スライダーの値表示更新
redSlider.addEventListener('input', () => {
  redValue.textContent = redSlider.value;
});
greenSlider.addEventListener('input', () => {
  greenValue.textContent = greenSlider.value;
});
blueSlider.addEventListener('input', () => {
  blueValue.textContent = blueSlider.value;
});

// 色味調整を適用
applyColorBalanceBtn.addEventListener('click', () => {
  if (!wasmModule || !originalImageData) return;

  const red = parseInt(redSlider.value, 10);
  const green = parseInt(greenSlider.value, 10);
  const blue = parseInt(blueSlider.value, 10);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  writeImageDataToMemory(imageData);
  wasmModule.color_balance(canvas.width, canvas.height, red, green, blue);
  readImageDataFromMemory(imageData);

  ctx.putImageData(imageData, 0, 0);
});

// リセットボタン
resetBtn.addEventListener('click', () => {
  if (!originalImageData) return;
  ctx.putImageData(originalImageData, 0, 0);
});

// 画像クリアボタン
clearImageBtn.addEventListener('click', () => {
  // Canvasをクリア
  canvas.width = 0;
  canvas.height = 0;

  // 画像データをリセット
  originalImageData = null;

  // has-imageクラスを削除して「No Image」を再表示
  canvasContainer.classList.remove('has-image');

  // ファイル入力をリセット
  imageInput.value = '';

  // 全てのコントロールを無効化
  grayscaleBtn.disabled = true;
  brightnessSlider.disabled = true;
  applyBrightnessBtn.disabled = true;
  contrastSlider.disabled = true;
  applyContrastBtn.disabled = true;
  redSlider.disabled = true;
  greenSlider.disabled = true;
  blueSlider.disabled = true;
  applyColorBalanceBtn.disabled = true;
  resetBtn.disabled = true;
  clearImageBtn.disabled = true;

  // スライダーの値をリセット
  brightnessSlider.value = '0';
  brightnessValue.textContent = '0';
  contrastSlider.value = '100';
  contrastValue.textContent = '100';
  redSlider.value = '100';
  redValue.textContent = '100';
  greenSlider.value = '100';
  greenValue.textContent = '100';
  blueSlider.value = '100';
  blueValue.textContent = '100';
});

// 初期化
initWasm();
