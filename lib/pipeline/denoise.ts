import { FFmpeg } from '@ffmpeg/ffmpeg';

/**
 * ノイズ除去（ノイズゲート + ハイパスフィルタ）
 *
 * Python版のnoisereduce（スペクトラルゲーティング）の代替として、
 * より安全なノイズゲート + ハイパスフィルタの組み合わせを使用
 *
 * アプローチ:
 * 1. ハイパスフィルタ（80Hz以下をカット）→ 低周波ノイズを除去
 * 2. ノイズゲート（閾値以下の音をカット）→ 無音時のノイズを除去
 * 3. ローパスフィルタ（12kHz以上をカット）→ 高周波ノイズを除去
 *
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（FFmpegのFS内）
 * @param outputFile 出力ファイル名（FFmpegのFS内）
 * @param threshold ノイズゲート閾値（dB）デフォルト: -40.0
 */
export async function applyDenoise(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  threshold: number = -40.0
): Promise<void> {
  console.log(`[Denoise] ノイズ除去開始: ${inputFile}`);

  // ノイズ除去フィルタチェーン（agateは音声を消すため除外）
  // 1. highpass=f=80 → 80Hz以下の低周波ノイズ（エアコン、機械音など）を除去
  // 2. lowpass=f=12000 → 12kHz以上の高周波ノイズ（ヒスノイズなど）を除去
  //
  // 注: Python版のnoisereduce（スペクトラルゲーティング）と同等の機能は
  //     FFmpeg.wasmでは利用できないため、基本的なフィルタリングのみ実装
  const af = [
    'highpass=f=80',
    'lowpass=f=12000',
  ].join(',');

  await ffmpeg.exec(['-y', '-i', inputFile, '-af', af, outputFile]);

  console.log(`[Denoise] ノイズ除去完了: ${outputFile}`);
}
