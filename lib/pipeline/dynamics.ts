import { FFmpeg } from '@ffmpeg/ffmpeg';
import { execFF } from './exec';

/**
 * dB文字列を線形値に変換（acompressor/alimiterはlinear値が必要）
 * 例: '-20dB' → 0.1, '-1dB' → 0.891
 */
function dbToLinear(dbStr: string): number {
  // '-20dB' → -20, '-1dB' → -1, '-20' → -20
  const db = parseFloat(dbStr.replace(/dB$/i, ''));
  return Math.pow(10, db / 20);
}

/**
 * コンプレッサーを適用（loudnorm の前段で使用）
 * alimiter は不要（loudnorm 内蔵の true peak limiter で十分）
 */
export async function applyDynamics(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  compThreshold: string = '-20dB',
  compRatio: number = 4,
  compAttack: number = 5,
  compRelease: number = 50,
  _limiterLimit?: string
): Promise<void> {
  console.log(`[Dynamics] 処理開始: ${inputFile}`);

  const thresholdLinear = dbToLinear(compThreshold);

  console.log(`[Dynamics] threshold=${compThreshold}→${thresholdLinear.toFixed(4)}`);

  const af = `acompressor=threshold=${thresholdLinear}:ratio=${compRatio}:attack=${compAttack}:release=${compRelease}:knee=8`;

  await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', af, outputFile], 'Dynamics');

  console.log(`[Dynamics] 処理完了: ${outputFile}`);
}
