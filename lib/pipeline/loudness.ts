import { FFmpeg } from '@ffmpeg/ffmpeg';
import { LoudnessStats } from './types';
import { execFF } from './exec';

/**
 * ラウドネスを計測（Pass 1）
 * Note: `-f null -` はFFmpeg.wasmの仮想FSで動作不安定なため
 * tempファイルに出力する。loudnormのJSONはstderrログに出力される。
 */
async function measureLoudness(
  ffmpeg: FFmpeg,
  inputFile: string
): Promise<LoudnessStats> {
  const logMessages: string[] = [];

  const logHandler = ({ message }: { message: string }) => {
    logMessages.push(message);
  };

  ffmpeg.on('log', logHandler);

  try {
    // execFF は使わず生の exec を呼ぶ（非ゼロでもログは収集できているため）
    // -f null - : 出力ファイルを書かない（null muxer）
    // measure_temp.wav を書くと大きなファイルがWASMヒープを圧迫してAborted()を引き起こすため
    await ffmpeg.exec([
      '-y',
      '-i',
      inputFile,
      '-af',
      'loudnorm=print_format=json',
      '-f', 'null',
      '-',
    ]);
  } catch {
    // FFmpeg.wasmではAborted()で例外が出ることがあるが、ログは収集できている
  } finally {
    ffmpeg.off('log', logHandler);
  }

  const logText = logMessages.join('\n');
  console.log(`[Loudness] ログ件数: ${logMessages.length}, テキスト長: ${logText.length}`);

  // loudnormのJSONはネストなしのフラットJSON。{...}をマッチ
  const jsonMatch = logText.match(/\{[^{}]*\}/);
  if (!jsonMatch) {
    console.error('[Loudness] ログ内容（末尾2000文字）:', logText.slice(-2000));
    throw new Error('ラウドネス計測結果のJSONが見つかりません');
  }

  const stats: LoudnessStats = JSON.parse(jsonMatch[0]);
  return stats;
}

/**
 * 単パスラウドネス正規化（プレビューモード用・高速）
 * 2パスより精度は低いが、音質確認用途には十分
 */
async function normalizeLoudnessSinglePass(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  targetLufs: number,
  truePeak: number,
  lra: number
): Promise<void> {
  const af = `loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}`;

  console.log(`[Loudness] 単パス正規化（プレビュー用）: ${inputFile} -> ${outputFile}`);

  await execFF(ffmpeg, [
    '-y', '-i', inputFile, '-af', af, '-ar', '48000', outputFile,
  ], 'Loudness:SinglePass');

  console.log(`[Loudness] 単パス正規化完了: ${outputFile}`);
}

/**
 * 2パスラウドネス正規化
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（FFmpegのFS内）
 * @param outputFile 出力ファイル名（FFmpegのFS内）
 * @param targetLufs 目標ラウドネス（LUFS）デフォルト: -16.0
 * @param truePeak 最大トゥルーピーク（dBTP）デフォルト: -1.5
 * @param lra ラウドネスレンジ（LU）デフォルト: 11.0
 * @param singlePass 単パスモード（プレビュー用）デフォルト: false
 * @returns 計測統計（singlePassの場合はnull）
 */
export async function normalizeLoudness(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  targetLufs: number = -16.0,
  truePeak: number = -1.5,
  lra: number = 11.0,
  singlePass: boolean = false
): Promise<LoudnessStats | null> {
  if (singlePass) {
    await normalizeLoudnessSinglePass(ffmpeg, inputFile, outputFile, targetLufs, truePeak, lra);
    return null;
  }

  console.log(`[Loudness] 計測開始: ${inputFile}`);

  // Pass 1: 計測
  const stats = await measureLoudness(ffmpeg, inputFile);
  console.log('[Loudness] 計測完了:', stats);

  // Pass 2: 計測値を使って正確に調整
  const af = [
    `loudnorm=I=${targetLufs}`,
    `TP=${truePeak}`,
    `LRA=${lra}`,
    `measured_I=${stats.input_i}`,
    `measured_LRA=${stats.input_lra}`,
    `measured_TP=${stats.input_tp}`,
    `measured_thresh=${stats.input_thresh}`,
    'linear=true',
  ].join(':');

  console.log(`[Loudness] 正規化開始: ${inputFile} -> ${outputFile}`);

  await execFF(ffmpeg, [
    '-y', '-i', inputFile, '-af', af, '-ar', '48000', outputFile,
  ], 'Loudness:Pass2');

  console.log(`[Loudness] 正規化完了: ${outputFile} (${targetLufs} LUFS)`);

  return stats;
}
