import { FFmpeg } from '@ffmpeg/ffmpeg';
import { CutRegion } from './types';
import { execFF } from './exec';

/**
 * 音声の長さを取得（秒）
 */
async function getAudioDuration(
  ffmpeg: FFmpeg,
  inputFile: string
): Promise<number> {
  let duration = 0;

  const logHandler = ({ message }: { message: string }) => {
    const match = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) {
      duration =
        parseInt(match[1]) * 3600 +
        parseInt(match[2]) * 60 +
        parseFloat(match[3]);
    }
  };

  ffmpeg.on('log', logHandler);

  try {
    await ffmpeg.exec(['-i', inputFile, '-f', 'null', '-']);
  } catch {
    // 無視（情報は取得済み）
  } finally {
    ffmpeg.off('log', logHandler);
  }

  return duration;
}

/**
 * 手動カット区間を両トラックから除去する
 *
 * silence.ts の concatSegments と同じ atrim + asetpts + concat パターンを使用。
 * カット区間の補集合（残す部分）を計算し、両トラックに同じフィルタを適用する。
 *
 * @param ffmpeg FFmpegインスタンス
 * @param inputA 入力ファイルA（WASM FS内）
 * @param inputB 入力ファイルB（WASM FS内）
 * @param outputA 出力ファイルA（WASM FS内）
 * @param outputB 出力ファイルB（WASM FS内）
 * @param cutRegions カット区間リスト（生ファイル基準の時間）
 * @param trimOffset クラップ同期でカットされた秒数（区間の時間補正用）
 */
export async function applyCutRegions(
  ffmpeg: FFmpeg,
  inputA: string,
  inputB: string,
  outputA: string,
  outputB: string,
  cutRegions: CutRegion[],
  trimOffset: number
): Promise<void> {
  // カット区間をトリムオフセットで補正（生ファイル基準 → トリム後基準）
  const adjusted = cutRegions
    .map(r => ({
      start: r.startTime - trimOffset,
      end: r.endTime - trimOffset,
    }))
    .filter(r => r.end > 0) // トリムで消えた区間を除外
    .map(r => ({
      start: Math.max(0, r.start),
      end: r.end,
    }))
    .sort((a, b) => a.start - b.start);

  if (adjusted.length === 0) {
    console.log('[Cut] 補正後のカット区間なし、スキップ');
    return;
  }

  // 音声の長さを取得（片方で十分）
  const totalDuration = await getAudioDuration(ffmpeg, inputA);
  console.log(`[Cut] 音声の長さ: ${totalDuration.toFixed(2)}s`);

  // カット区間の補集合（残す部分）を計算
  const keepSegments: { start: number; end: number }[] = [];
  let currentPos = 0;

  for (const region of adjusted) {
    if (region.start > currentPos) {
      keepSegments.push({ start: currentPos, end: region.start });
    }
    currentPos = Math.max(currentPos, region.end);
  }

  // 末尾を追加
  if (currentPos < totalDuration) {
    keepSegments.push({ start: currentPos, end: totalDuration });
  }

  // 有効なセグメントのみ
  const validSegments = keepSegments.filter(s => s.end - s.start > 0.001);

  if (validSegments.length === 0) {
    console.log('[Cut] 有効なセグメントなし（全区間カット）、スキップ');
    return;
  }

  console.log(`[Cut] ${adjusted.length} 区間をカット → ${validSegments.length} セグメントで再構成`);

  // 両トラックに同じフィルタを適用
  await concatSegments(ffmpeg, inputA, outputA, validSegments, 'Cut:A');
  await concatSegments(ffmpeg, inputB, outputB, validSegments, 'Cut:B');

  const removedDuration = adjusted.reduce((sum, r) => sum + (r.end - r.start), 0);
  console.log(
    `[Cut] 完了: ${removedDuration.toFixed(1)}秒をカット ` +
    `(${totalDuration.toFixed(1)}s → ${(totalDuration - removedDuration).toFixed(1)}s)`
  );
}

/**
 * atrim + concat フィルタでセグメントを結合
 */
async function concatSegments(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  segments: { start: number; end: number }[],
  label: string
): Promise<void> {
  const filterParts: string[] = [];
  const concatInputs: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const tag = `s${i}`;
    filterParts.push(
      `[0]atrim=${s.start.toFixed(4)}:${s.end.toFixed(4)},asetpts=N/SR/TB[${tag}]`
    );
    concatInputs.push(`[${tag}]`);
  }

  const filterComplex =
    filterParts.join(';') +
    ';' +
    concatInputs.join('') +
    `concat=n=${segments.length}:v=0:a=1[out]`;

  await execFF(
    ffmpeg,
    [
      '-y',
      '-i', inputFile,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      outputFile,
    ],
    label
  );
}
