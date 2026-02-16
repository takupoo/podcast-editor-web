import { FFmpeg } from '@ffmpeg/ffmpeg';

/**
 * コンプレッサー + ハードリミッターを適用
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（FFmpegのFS内）
 * @param outputFile 出力ファイル名（FFmpegのFS内）
 * @param compThreshold コンプレッサー閾値 デフォルト: '-20dB'
 * @param compRatio 圧縮比 デフォルト: 4
 * @param compAttack アタック時間（ms）デフォルト: 5
 * @param compRelease リリース時間（ms）デフォルト: 50
 * @param limiterLimit リミッター上限 デフォルト: '-1dB'
 */
export async function applyDynamics(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  compThreshold: string = '-20dB',
  compRatio: number = 4,
  compAttack: number = 5,
  compRelease: number = 50,
  limiterLimit: string = '-1dB'
): Promise<void> {
  console.log(`[Dynamics] 処理開始: ${inputFile}`);

  // acompressor + alimiter フィルタチェーン
  // acompressorのパラメータは:で連結、フィルタ間は,で区切る
  const af = `acompressor=threshold=${compThreshold}:ratio=${compRatio}:attack=${compAttack}:release=${compRelease},alimiter=limit=${limiterLimit}`;

  await ffmpeg.exec(['-y', '-i', inputFile, '-af', af, outputFile]);

  console.log(`[Dynamics] 処理完了: ${outputFile}`);
}
