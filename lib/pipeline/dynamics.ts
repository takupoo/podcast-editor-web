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

export interface DynamicsOptions {
  compThreshold?: string;
  compRatio?: number;
  compAttack?: number;
  compRelease?: number;
  compKnee?: number;
  dynaudnormEnabled?: boolean;
  dynaudnormFramelen?: number;
  dynaudnormGausssize?: number;
  dynaudnormPeak?: number;
  dynaudnormMaxgain?: number;
}

/**
 * コンプレッサーを適用（loudnorm の前段で使用）
 * alimiter は不要（loudnorm 内蔵の true peak limiter で十分）
 */
export async function applyDynamics(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  options: DynamicsOptions = {}
): Promise<void> {
  const {
    compThreshold = '-20dB',
    compRatio = 4,
    compAttack = 5,
    compRelease = 50,
    compKnee = 8,
    dynaudnormEnabled = true,
    dynaudnormFramelen = 500,
    dynaudnormGausssize = 15,
    dynaudnormPeak = 0.9,
    dynaudnormMaxgain = 10,
  } = options;

  console.log(`[Dynamics] 処理開始: ${inputFile}`);

  const thresholdLinear = dbToLinear(compThreshold);

  console.log(`[Dynamics] threshold=${compThreshold}→${thresholdLinear.toFixed(4)}`);

  const compFilter = `acompressor=threshold=${thresholdLinear}:ratio=${compRatio}:attack=${compAttack}:release=${compRelease}:knee=${compKnee}`;

  if (!dynaudnormEnabled) {
    // dynaudnorm OFF: acompressor のみ（warmup パディング不要）
    await execFF(ffmpeg, [
      '-y', '-i', inputFile,
      '-af', compFilter,
      outputFile,
    ], 'Dynamics');
  } else {
    // acompressor: ピークを抑える → dynaudnorm: 静かな部分を持ち上げる
    // dynaudnorm は gausssize × framelen のウォームアップが必要。
    // 冒頭にリバース音声を8秒パディングして処理後にトリムすることで、
    // 冒頭からフルゲインで正規化される。
    const WARMUP_SECS = 8;
    const dynamicsChain = [
      compFilter,
      `dynaudnorm=framelen=${dynaudnormFramelen}:gausssize=${dynaudnormGausssize}:peak=${dynaudnormPeak}:maxgain=${dynaudnormMaxgain}`,
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
  }

  console.log(`[Dynamics] 処理完了: ${outputFile}`);
}
