import { FFmpeg } from '@ffmpeg/ffmpeg';
import { execFF } from './exec';

/**
 * ノイズ除去（複数方式対応）
 *
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（FFmpegのFS内）
 * @param outputFile 出力ファイル名（FFmpegのFS内）
 * @param method ノイズ除去方式（'none' | 'afftdn' | 'anlmdn'）
 * @param threshold ノイズ除去強度（dB）-60～-30（推奨: -50）
 */
export async function applyDenoise(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  method: 'none' | 'afftdn' | 'anlmdn' = 'afftdn',
  threshold: number = -50.0
): Promise<void> {
  console.log(`[Denoise] ノイズ除去開始: ${inputFile}`);
  console.log(`[Denoise] 方式: ${method}, 閾値: ${threshold}dB`);

  if (method === 'none') {
    // 方式1: ノイズ除去なし（ハイ/ローパスフィルタのみ）
    console.log('[Denoise] 方式: none（ハイ/ローパスフィルタのみ）');

    const basicFilter = [
      'highpass=f=80',
      'lowpass=f=12000',
    ].join(',');

    await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
    console.log('[Denoise] 基本フィルタによる処理完了');
    return;
  }

  if (method === 'afftdn') {
    // 方式2: afftdn（FFTベースのノイズ除去）
    // ホワイトノイズや定常的な背景ノイズに効果的
    console.log('[Denoise] 方式: afftdn（FFTベース）');

    // 閾値を適切なノイズ除去量（nr）に変換
    // -60dB → 弱い除去（nr=3）
    // -50dB → 標準除去（nr=6）
    // -40dB → 強い除去（nr=9）
    // -30dB → 最強除去（nr=12）
    const noiseReduction = Math.max(3, Math.min(12, ((-threshold - 30) / 10) * 3));
    console.log(`[Denoise] ノイズ除去量: ${noiseReduction}dB`);

    const afftdnFilter = [
      'highpass=f=80',
      `afftdn=nr=${noiseReduction}:nf=-50:tn=0`,
      'lowpass=f=12000',
    ].join(',');

    console.log(`[Denoise] フィルタ: ${afftdnFilter}`);

    try {
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', afftdnFilter, outputFile], 'Denoise:afftdn');
      console.log('[Denoise] afftdnによるノイズ除去成功');
      return;
    } catch (error) {
      console.warn('[Denoise] afftdn失敗、フォールバック:', error);
      // フォールバック: 基本フィルタのみ
      const basicFilter = ['highpass=f=80', 'lowpass=f=12000'].join(',');
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
      console.log('[Denoise] フォールバックで処理完了');
      return;
    }
  }

  if (method === 'anlmdn') {
    // 方式3: anlmdn（Non-Local Meansベース）
    // afftdnより高品質だが処理が重い
    console.log('[Denoise] 方式: anlmdn（NLMeansベース）');

    // 閾値を適切な強度（s）に変換（1-15の範囲）
    const strength = Math.max(1, Math.min(15, ((-threshold - 30) / 10) * 5));
    console.log(`[Denoise] NLMeans強度: ${strength}`);

    const anlmdnFilter = [
      'highpass=f=80',
      `anlmdn=s=${strength}:p=7:r=15`,
      'lowpass=f=12000',
    ].join(',');

    console.log(`[Denoise] フィルタ: ${anlmdnFilter}`);

    try {
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', anlmdnFilter, outputFile], 'Denoise:anlmdn');
      console.log('[Denoise] anlmdnによるノイズ除去成功');
      return;
    } catch (error) {
      console.warn('[Denoise] anlmdn失敗、フォールバック:', error);
      // フォールバック: 基本フィルタのみ
      const basicFilter = ['highpass=f=80', 'lowpass=f=12000'].join(',');
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
      console.log('[Denoise] フォールバックで処理完了');
      return;
    }
  }
}
