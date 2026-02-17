import { FFmpeg } from '@ffmpeg/ffmpeg';
import { TrimResult } from './types';
import { execFF } from './exec';

/** クラップ検出に使う先頭の長さ（秒）。5分あれば十分 */
const CLAP_DETECT_DURATION = 300;

/**
 * WASM FS 内の WAV ファイルを Web Audio API でデコード
 */
async function decodeWavFromFs(ffmpeg: FFmpeg, name: string): Promise<AudioBuffer> {
  const data = await ffmpeg.readFile(name) as Uint8Array;
  // SharedArrayBuffer 対策: slice で通常の ArrayBuffer に変換
  const arrayBuffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;
  const audioContext = new AudioContext();
  try {
    return await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    audioContext.close();
  }
}

/**
 * クラップ音を検出（Python版 trim.py:25-39 と同じアルゴリズム）
 * @param audioBuffer デコード済みオーディオバッファ
 * @param thresholdDb 検出閾値（dB）デフォルト: -10.0
 * @returns クラップ位置（秒）
 */
function detectClap(
  audioBuffer: AudioBuffer,
  thresholdDb: number = -10.0
): number {
  // モノラルチャンネルデータを取得
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // RMSエンベロープ計算（5msウィンドウ）
  const windowSize = Math.floor((5 * sampleRate) / 1000);
  const rmsEnvelope = new Float32Array(channelData.length - windowSize);

  for (let i = 0; i < rmsEnvelope.length; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += channelData[i + j] ** 2;
    }
    rmsEnvelope[i] = Math.sqrt(sum / windowSize);
  }

  // ピークを検出
  let peak = 0;
  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
  }

  // 閾値を計算（dBから線形値に変換）
  const threshold = peak * Math.pow(10, thresholdDb / 20);

  // 閾値を超える最初の位置を検出
  let clapIndex = -1;
  for (let i = 0; i < rmsEnvelope.length; i++) {
    if (rmsEnvelope[i] > threshold) {
      clapIndex = i;
      break;
    }
  }

  if (clapIndex === -1) {
    throw new Error('クラップ音が検出できませんでした');
  }

  // サンプル位置を秒単位に変換
  return clapIndex / sampleRate;
}

/**
 * 2トラックをクラップ位置で同期してトリム
 *
 * 検出はファイル冒頭 CLAP_DETECT_DURATION 秒（デフォルト5分）のみを使用。
 * input_a.mp3 / input_b.mp3 が WASM FS に書き込まれていることが前提。
 *
 * @param ffmpeg FFmpegインスタンス
 * @param outputA 出力ファイル名A（FFmpegのFS内）
 * @param outputB 出力ファイル名B（FFmpegのFS内）
 * @param preClapMargin クラップ前の余白（秒）デフォルト: 0.5
 * @param postClapCut クラップ後のカット位置（秒）0=クラップ残す デフォルト: 0.0
 * @param clapThresholdDb クラップ検出閾値（dB）デフォルト: -10.0
 * @returns トリム結果
 */
export async function applySyncAndTrim(
  ffmpeg: FFmpeg,
  outputA: string,
  outputB: string,
  preClapMargin: number = 0.5,
  postClapCut: number = 0.0,
  clapThresholdDb: number = -10.0
): Promise<TrimResult> {
  console.log(`[Trim] クラップ検出開始（先頭 ${CLAP_DETECT_DURATION}s のみ使用）`);

  // 冒頭 CLAP_DETECT_DURATION 秒だけ抽出してデコード（高速化）
  await execFF(ffmpeg, [
    '-y', '-t', CLAP_DETECT_DURATION.toString(),
    '-i', 'input_a.mp3',
    '-ac', '1', '-ar', '44100',
    'detect_a.wav',
  ], 'Detect:A');

  await execFF(ffmpeg, [
    '-y', '-t', CLAP_DETECT_DURATION.toString(),
    '-i', 'input_b.mp3',
    '-ac', '1', '-ar', '44100',
    'detect_b.wav',
  ], 'Detect:B');

  const audioBufferA = await decodeWavFromFs(ffmpeg, 'detect_a.wav');
  await ffmpeg.deleteFile('detect_a.wav');

  const audioBufferB = await decodeWavFromFs(ffmpeg, 'detect_b.wav');
  await ffmpeg.deleteFile('detect_b.wav');

  const clapA = detectClap(audioBufferA, clapThresholdDb);
  const clapB = detectClap(audioBufferB, clapThresholdDb);

  console.log(`[Trim] クラップ検出完了: A=${clapA.toFixed(3)}s, B=${clapB.toFixed(3)}s`);

  // カット位置を計算
  let cutA: number;
  let cutB: number;

  if (postClapCut > 0) {
    // クラップ後N秒からカット
    cutA = clapA + postClapCut;
    cutB = clapB + postClapCut;
  } else {
    // クラップ前の余白を保持
    cutA = Math.max(0, clapA - preClapMargin);
    cutB = Math.max(0, clapB - preClapMargin);
  }

  console.log(`[Trim] カット位置: A=${cutA.toFixed(3)}s, B=${cutB.toFixed(3)}s`);

  // FFmpegでトリム実行（WAV形式、モノラル、サンプルレート削減でメモリ節約）
  await execFF(ffmpeg, [
    '-y', '-ss', cutA.toFixed(3), '-i', 'input_a.mp3',
    '-ac', '1', '-ar', '44100', outputA,
  ], 'Trim:A');

  await execFF(ffmpeg, [
    '-y', '-ss', cutB.toFixed(3), '-i', 'input_b.mp3',
    '-ac', '1', '-ar', '44100', outputB,
  ], 'Trim:B');

  console.log('[Trim] トリム完了');

  return { cutA, cutB };
}
