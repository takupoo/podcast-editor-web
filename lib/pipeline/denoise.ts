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

  // ノイズ除去フィルタチェーン
  // 1. highpass=f=80 → 80Hz以下の低周波ノイズ（エアコン、機械音など）を除去
  // 2. agate → ノイズゲート（閾値以下の音を減衰）
  //    - threshold: 閾値（dB）
  //    - ratio: 圧縮比（高いほど強力）
  //    - attack: アタックタイム（ms）
  //    - release: リリースタイム（ms）
  // 3. lowpass=f=12000 → 12kHz以上の高周波ノイズ（ヒスノイズなど）を除去
  const af = [
    'highpass=f=80',
    `agate=threshold=${threshold}dB:ratio=10:attack=10:release=100`,
    'lowpass=f=12000',
  ].join(',');

  await ffmpeg.exec(['-y', '-i', inputFile, '-af', af, outputFile]);

  console.log(`[Denoise] ノイズ除去完了: ${outputFile}`);
}
