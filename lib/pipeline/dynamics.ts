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
 * コンプレッサー + ハードリミッターを適用
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

  // acompressor/alimiter はlinear値(0-1)が必要
  // dB文字列の場合は変換する
  const thresholdLinear = dbToLinear(compThreshold);
  const limitLinear = dbToLinear(limiterLimit);

  console.log(`[Dynamics] threshold=${compThreshold}→${thresholdLinear.toFixed(4)}, limit=${limiterLimit}→${limitLinear.toFixed(4)}`);

  const af = `acompressor=threshold=${thresholdLinear}:ratio=${compRatio}:attack=${compAttack}:release=${compRelease},alimiter=limit=${limitLinear}`;

  await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', af, outputFile], 'Dynamics');

  console.log(`[Dynamics] 処理完了: ${outputFile}`);
}
