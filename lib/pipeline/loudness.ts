import { FFmpeg } from '@ffmpeg/ffmpeg';
import { LoudnessStats } from './types';

/**
 * ラウドネスを計測（Pass 1）
 */
async function measureLoudness(
  ffmpeg: FFmpeg,
  inputFile: string
): Promise<LoudnessStats> {
  try {
    // ログを収集するための変数
    let logMessages: string[] = [];

    // ログイベントリスナーを設定
    const logHandler = ({ message }: { message: string }) => {
      logMessages.push(message);
    };

    ffmpeg.on('log', logHandler);

    // FFmpegでラウドネス計測
    await ffmpeg.exec([
      '-i',
      inputFile,
      '-af',
      'loudnorm=print_format=json',
      '-f',
      'null',
      '-',
    ]);

    // リスナーを削除
    ffmpeg.off('log', logHandler);

    // ログ全体を結合
    const logText = logMessages.join('\n');

    // JSON部分を正規表現で抽出
    const jsonMatch = logText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error('ログ内容:', logText);
      throw new Error('ラウドネス計測結果のJSONが見つかりません');
    }

    const stats: LoudnessStats = JSON.parse(jsonMatch[0]);
    return stats;
  } catch (error) {
    console.error('ラウドネス計測エラー:', error);
    throw new Error(`ラウドネスの計測に失敗しました: ${error}`);
  }
}

/**
 * 2パスラウドネス正規化
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（FFmpegのFS内）
 * @param outputFile 出力ファイル名（FFmpegのFS内）
 * @param targetLufs 目標ラウドネス（LUFS）デフォルト: -16.0
 * @param truePeak 最大トゥルーピーク（dBTP）デフォルト: -1.5
 * @param lra ラウドネスレンジ（LU）デフォルト: 11.0
 * @returns 計測統計
 */
export async function normalizeLoudness(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  targetLufs: number = -16.0,
  truePeak: number = -1.5,
  lra: number = 11.0
): Promise<LoudnessStats> {
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

  await ffmpeg.exec([
    '-y',
    '-i',
    inputFile,
    '-af',
    af,
    '-ar',
    '48000', // ポッドキャスト標準サンプルレート
    outputFile,
  ]);

  console.log(
    `[Loudness] 正規化完了: ${outputFile} (${targetLufs} LUFS)`
  );

  return stats;
}
