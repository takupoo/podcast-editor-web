import { FFmpeg } from '@ffmpeg/ffmpeg';
import { execFF } from './exec';

interface SilenceRegion {
  start: number;
  end: number;
  duration: number;
}

/**
 * FFmpegの silencedetect フィルタで無音区間を検出
 */
async function detectSilenceRegions(
  ffmpeg: FFmpeg,
  inputFile: string,
  thresholdDb: number,
  minDuration: number
): Promise<SilenceRegion[]> {
  const regions: SilenceRegion[] = [];
  let pendingStart: number | null = null;

  const logHandler = ({ message }: { message: string }) => {
    // silencedetect の出力をパース
    // [silencedetect @ 0x...] silence_start: 10.5
    // [silencedetect @ 0x...] silence_end: 15.3 | silence_duration: 4.8
    const startMatch = message.match(/silence_start:\s*([\d.]+)/);
    if (startMatch) {
      pendingStart = parseFloat(startMatch[1]);
      return;
    }

    const endMatch = message.match(
      /silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/
    );
    if (endMatch && pendingStart !== null) {
      const end = parseFloat(endMatch[1]);
      const duration = parseFloat(endMatch[2]);
      regions.push({ start: pendingStart, end, duration });
      pendingStart = null;
    }
  };

  ffmpeg.on('log', logHandler);

  try {
    // silencedetect を実行（出力は不要なので /dev/null 相当）
    // d= は最小無音期間（これ未満の無音は無視される）
    await execFF(
      ffmpeg,
      [
        '-y',
        '-i', inputFile,
        '-af', `silencedetect=noise=${thresholdDb}dB:d=${minDuration}`,
        '-f', 'null',
        '-',
      ],
      'SilenceDetect'
    );
  } finally {
    ffmpeg.off('log', logHandler);
  }

  console.log(`[Silence] ${regions.length} 個の無音区間を検出`);
  for (const r of regions) {
    console.log(
      `  ${r.start.toFixed(2)}s - ${r.end.toFixed(2)}s (${r.duration.toFixed(2)}s)`
    );
  }

  return regions;
}

/**
 * 音声の長さを取得（秒）
 */
async function getAudioDuration(
  ffmpeg: FFmpeg,
  inputFile: string
): Promise<number> {
  let duration = 0;

  const logHandler = ({ message }: { message: string }) => {
    // Duration: 00:01:23.45 形式をパース
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
    // -f null で情報取得のみ
    // exec が非ゼロ終了しても duration が取れていればOK
    await ffmpeg.exec(['-i', inputFile, '-f', 'null', '-']);
  } catch {
    // 無視（情報は取得済み）
  } finally {
    ffmpeg.off('log', logHandler);
  }

  return duration;
}

/**
 * 無音区間を指定の長さに短縮する
 *
 * ミックス後の音声に対して使用。
 * silencedetect で無音区間を検出し、min_duration 秒以上の無音を
 * target_duration 秒に圧縮して再構成する。
 *
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（WASM FS内）
 * @param outputFile 出力ファイル名（WASM FS内）
 * @param thresholdDb 無音判定閾値（dB）例: -35
 * @param minDuration この秒数以上の無音をカット対象にする 例: 2.0
 * @param targetDuration カット後の無音の長さ（秒）例: 0.5
 */
export async function trimSilence(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  thresholdDb: number,
  minDuration: number,
  targetDuration: number
): Promise<void> {
  console.log(
    `[Silence] 無音カット開始: threshold=${thresholdDb}dB, min=${minDuration}s, target=${targetDuration}s`
  );

  // 1. 無音区間を検出
  const regions = await detectSilenceRegions(
    ffmpeg,
    inputFile,
    thresholdDb,
    minDuration
  );

  // 無音区間がなければそのままコピー
  if (regions.length === 0) {
    console.log('[Silence] 対象の無音区間なし、スキップ');
    await execFF(
      ffmpeg,
      ['-y', '-i', inputFile, '-c', 'copy', outputFile],
      'Silence:copy'
    );
    return;
  }

  // 2. 音声の長さを取得
  const totalDuration = await getAudioDuration(ffmpeg, inputFile);
  console.log(`[Silence] 音声の長さ: ${totalDuration.toFixed(2)}s`);

  // 3. セグメントリストを構築
  // 非無音部分 + 短縮された無音部分を交互に配置
  interface Segment {
    start: number;
    end: number;
  }

  const segments: Segment[] = [];
  let currentPos = 0;

  for (const region of regions) {
    // 無音前の音声部分を追加
    if (region.start > currentPos) {
      segments.push({ start: currentPos, end: region.start });
    }

    // 短縮された無音部分を追加（無音の先頭から target_duration 秒）
    const silenceKeep = Math.min(targetDuration, region.duration);
    segments.push({
      start: region.start,
      end: region.start + silenceKeep,
    });

    currentPos = region.end;
  }

  // 末尾の音声部分を追加
  if (currentPos < totalDuration) {
    segments.push({ start: currentPos, end: totalDuration });
  }

  // 空セグメントを除去
  const validSegments = segments.filter((s) => s.end - s.start > 0.001);

  if (validSegments.length === 0) {
    console.log('[Silence] 有効なセグメントなし、スキップ');
    await execFF(
      ffmpeg,
      ['-y', '-i', inputFile, '-c', 'copy', outputFile],
      'Silence:copy'
    );
    return;
  }

  console.log(`[Silence] ${validSegments.length} セグメントで再構成`);

  // 4. filter_complex を構築
  // セグメントが多すぎる場合は分割処理（FFmpegのフィルタ長制限対策）
  const MAX_SEGMENTS_PER_PASS = 100;

  if (validSegments.length <= MAX_SEGMENTS_PER_PASS) {
    await concatSegments(ffmpeg, inputFile, outputFile, validSegments);
  } else {
    // 大量のセグメントの場合は複数パスで処理
    let tempInput = inputFile;
    let passIdx = 0;

    for (let i = 0; i < validSegments.length; i += MAX_SEGMENTS_PER_PASS) {
      const chunk = validSegments.slice(i, i + MAX_SEGMENTS_PER_PASS);
      const isLast = i + MAX_SEGMENTS_PER_PASS >= validSegments.length;
      const tempOutput = isLast ? outputFile : `silence_temp_${passIdx}.wav`;

      await concatSegments(ffmpeg, tempInput, tempOutput, chunk);

      if (tempInput !== inputFile) {
        try { await ffmpeg.deleteFile(tempInput); } catch { /* ignore */ }
      }
      tempInput = tempOutput;
      passIdx++;
    }
  }

  // カット結果のログ
  const originalDuration = totalDuration;
  const removedDuration = regions.reduce(
    (sum, r) => sum + Math.max(0, r.duration - targetDuration),
    0
  );
  console.log(
    `[Silence] 完了: ${removedDuration.toFixed(1)}秒の無音をカット ` +
    `(${originalDuration.toFixed(1)}s → ${(originalDuration - removedDuration).toFixed(1)}s)`
  );
}

/**
 * atrim + concat フィルタでセグメントを結合
 */
async function concatSegments(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  segments: { start: number; end: number }[]
): Promise<void> {
  const filterParts: string[] = [];
  const concatInputs: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const label = `s${i}`;
    filterParts.push(
      `[0]atrim=${s.start.toFixed(4)}:${s.end.toFixed(4)},asetpts=N/SR/TB[${label}]`
    );
    concatInputs.push(`[${label}]`);
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
    'Silence:concat'
  );
}
