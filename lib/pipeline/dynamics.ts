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

  // acompressor: ピークを抑える → dynaudnorm: 静かな部分を持ち上げる
  // dynaudnorm は gausssize=15 × framelen=500ms ≒ 7.5秒のウォームアップが必要。
  // 冒頭にリバース音声を8秒パディングして処理後にトリムすることで、
  // 冒頭からフルゲインで正規化される。
  const WARMUP_SECS = 8;
  const dynamicsChain = [
    `acompressor=threshold=${thresholdLinear}:ratio=${compRatio}:attack=${compAttack}:release=${compRelease}:knee=8`,
    'dynaudnorm=framelen=500:gausssize=15:peak=0.9:maxgain=10',
  ].join(',');

  const filterComplex = [
    `[0]asplit=2[orig][forpad]`,
    `[forpad]atrim=end=${WARMUP_SECS},areverse[warmup]`,
    `[warmup][orig]concat=n=2:v=0:a=1[padded]`,
    `[padded]${dynamicsChain}[processed]`,
    `[processed]atrim=start=${WARMUP_SECS},asetpts=PTS-STARTPTS[out]`,
  ].join(';');

  await execFF(ffmpeg, [
    '-y', '-i', inputFile,
    '-filter_complex', filterComplex,
    '-map', '[out]',
    outputFile,
  ], 'Dynamics');

  console.log(`[Dynamics] 処理完了: ${outputFile}`);
}
