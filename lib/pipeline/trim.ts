import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { TrimResult } from './types';

/**
 * Web Audio APIでオーディオファイルをデコード
 */
async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();
  return audioBuffer;
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
 * @param ffmpeg FFmpegインスタンス
 * @param fileA 話者Aのファイル
 * @param fileB 話者Bのファイル
 * @param outputA 出力ファイル名A（FFmpegのFS内）
 * @param outputB 出力ファイル名B（FFmpegのFS内）
 * @param preClapMargin クラップ前の余白（秒）デフォルト: 0.5
 * @param postClapCut クラップ後のカット位置（秒）0=クラップ残す デフォルト: 0.0
 * @param clapThresholdDb クラップ検出閾値（dB）デフォルト: -10.0
 * @returns トリム結果
 */
export async function applySyncAndTrim(
  ffmpeg: FFmpeg,
  fileA: File,
  fileB: File,
  outputA: string,
  outputB: string,
  preClapMargin: number = 0.5,
  postClapCut: number = 0.0,
  clapThresholdDb: number = -10.0
): Promise<TrimResult> {
  console.log('[Trim] クラップ検出開始');

  // 各トラックでクラップ検出
  const audioBufferA = await decodeAudioFile(fileA);
  const audioBufferB = await decodeAudioFile(fileB);

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
  const inputA = 'input_a.mp3';
  const inputB = 'input_b.mp3';

  // メモリ節約のため、モノラル変換とサンプルレート44.1kHzに統一
  await ffmpeg.exec([
    '-y',
    '-ss',
    cutA.toFixed(3),
    '-i',
    inputA,
    '-ac',
    '1', // モノラル化
    '-ar',
    '44100', // サンプルレート44.1kHz
    outputA,
  ]);

  await ffmpeg.exec([
    '-y',
    '-ss',
    cutB.toFixed(3),
    '-i',
    inputB,
    '-ac',
    '1', // モノラル化
    '-ar',
    '44100', // サンプルレート44.1kHz
    outputB,
  ]);

  console.log('[Trim] トリム完了');

  return { cutA, cutB };
}
