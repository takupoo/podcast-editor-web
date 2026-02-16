import { FFmpeg } from '@ffmpeg/ffmpeg';

/**
 * 簡易ノイズ除去（FFmpeg afftdnフィルタ使用）
 *
 * Python版のnoisereduce（スペクトラルゲーティング）ほど高品質ではないが、
 * FFmpeg.wasmで利用可能なafftdnフィルタで簡易的なノイズ除去を行う
 *
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（FFmpegのFS内）
 * @param outputFile 出力ファイル名（FFmpegのFS内）
 * @param noiseReduction ノイズ除去の強度 0.01-0.97（デフォルト: 0.6）
 */
export async function applyDenoise(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  noiseReduction: number = 0.6
): Promise<void> {
  console.log(`[Denoise] ノイズ除去開始: ${inputFile}`);

  // afftdn（FFT Denoise）フィルタを使用
  // nr: ノイズ除去の強度（0.01-0.97）
  // nf: ノイズフロア（dB、-80 - -20）
  // nt: ノイズタイプ（w=白色ノイズ、v=ビニールノイズ、etc）
  const af = `afftdn=nr=${noiseReduction}:nf=-25:tn=1`;

  await ffmpeg.exec(['-y', '-i', inputFile, '-af', af, outputFile]);

  console.log(`[Denoise] ノイズ除去完了: ${outputFile}`);
}
