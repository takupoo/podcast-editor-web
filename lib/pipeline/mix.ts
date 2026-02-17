import { FFmpeg } from '@ffmpeg/ffmpeg';
import { execFF } from './exec';

/**
 * 音声ファイルの長さ（秒）を取得
 * FFmpeg.wasmのFS内ファイルをWeb Audio APIでデコードして取得
 * （FFmpeg execのログ解析は不安定なため採用しない）
 */
async function getDuration(ffmpeg: FFmpeg, filePath: string): Promise<number> {
  const data = await ffmpeg.readFile(filePath) as Uint8Array;
  // Uint8ArrayのArrayBufferはオフセットを考慮してコピー（SharedArrayBuffer対策でスライス）
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    audioContext.close();
  }
}

/**
 * 2トラックをミックス（モノラル入力に対応）
 * @param ffmpeg FFmpegインスタンス
 * @param trackA トラックA（FFmpegのFS内、monoを想定）
 * @param trackB トラックB（FFmpegのFS内、monoを想定）
 * @param output 出力ファイル（FFmpegのFS内、monoで出力）
 */
export async function mixVoices(
  ffmpeg: FFmpeg,
  trackA: string,
  trackB: string,
  output: string
): Promise<void> {
  console.log(`[Mix] ボイスミックス開始: ${trackA} + ${trackB}`);

  // モノラル入力をそのままamixでミックス
  // normalize=0: 音量を保持（Loudness/Dynamicsで既に調整済み）
  await execFF(ffmpeg, [
    '-y',
    '-i',
    trackA,
    '-i',
    trackB,
    '-filter_complex',
    '[0:a][1:a]amix=inputs=2:duration=first:normalize=0',
    output,
  ], 'Mix:voices');

  console.log(`[Mix] ボイスミックス完了: ${output}`);
}

/**
 * 音声にBGMをミックス（ループ・フェード対応）
 * @param ffmpeg FFmpegインスタンス
 * @param voicePath ボイストラック（FFmpegのFS内）
 * @param bgmPath BGMファイル（FFmpegのFS内）
 * @param output 出力ファイル（FFmpegのFS内）
 * @param bgmVolumeDb BGM音量（dB）デフォルト: -30.0
 * @param bgmFadeIn フェードイン時間（秒）デフォルト: 3.0
 * @param bgmFadeOut フェードアウト時間（秒）デフォルト: 3.0
 */
export async function addBGM(
  ffmpeg: FFmpeg,
  voicePath: string,
  bgmPath: string,
  output: string,
  bgmVolumeDb: number = -30.0,
  bgmFadeIn: number = 3.0,
  bgmFadeOut: number = 3.0
): Promise<void> {
  console.log(`[Mix] BGM追加開始: ${bgmPath}`);

  const voiceDuration = await getDuration(ffmpeg, voicePath);
  const bgmDuration = await getDuration(ffmpeg, bgmPath);

  const fadeOutStart = Math.max(0, voiceDuration - bgmFadeOut);

  // BGMが本編より短い場合: -stream_loop -1 で入力レベルでループ
  // （aloop=size=2e+09 はWASMメモリ不足の原因になるため使用しない）
  const needsLoop = bgmDuration < voiceDuration;

  const bgmFilter = [
    `[1:a]atrim=0:${voiceDuration}`,
    `volume=${bgmVolumeDb}dB`,
    `afade=t=in:d=${bgmFadeIn}`,
    `afade=t=out:st=${fadeOutStart}:d=${bgmFadeOut}[bgm]`,
    '[0:a][bgm]amix=inputs=2:duration=first:normalize=0',
  ].join(',');

  await execFF(ffmpeg, [
    '-y',
    '-i', voicePath,
    ...(needsLoop ? ['-stream_loop', '-1'] : []),
    '-i', bgmPath,
    '-filter_complex', bgmFilter,
    output,
  ], 'Mix:bgm');

  console.log(
    `[Mix] BGM追加完了: ${output} (vol=${bgmVolumeDb}dB, loop=${
      bgmDuration < voiceDuration
    })`
  );
}

/**
 * 本編の末尾にエンドシーンをクロスフェードで結合
 * @param ffmpeg FFmpegインスタンス
 * @param mainPath 本編（FFmpegのFS内）
 * @param endscenePath エンドシーン（FFmpegのFS内）
 * @param output 出力ファイル（FFmpegのFS内）
 * @param crossfadeSec クロスフェード時間（秒）デフォルト: 2.0
 */
export async function appendEndscene(
  ffmpeg: FFmpeg,
  mainPath: string,
  endscenePath: string,
  output: string,
  crossfadeSec: number = 2.0
): Promise<void> {
  console.log(`[Mix] エンドシーン追加開始: ${endscenePath}`);

  const mainDuration = await getDuration(ffmpeg, mainPath);

  const filterComplex = [
    `[0:a]afade=t=out:st=${mainDuration - crossfadeSec}:d=${crossfadeSec}[main]`,
    `[1:a]afade=t=in:d=${crossfadeSec}[end]`,
    '[main][end]concat=n=2:v=0:a=1',
  ].join(';');

  await execFF(ffmpeg, [
    '-y',
    '-i',
    mainPath,
    '-i',
    endscenePath,
    '-filter_complex',
    filterComplex,
    output,
  ], 'Mix:endscene');

  console.log(
    `[Mix] エンドシーン追加完了: ${output} (crossfade=${crossfadeSec}s)`
  );
}

/**
 * WAVをMP3にエンコード
 * @param ffmpeg FFmpegインスタンス
 * @param inputPath 入力ファイル（FFmpegのFS内）
 * @param outputPath 出力ファイル（FFmpegのFS内）
 * @param bitrate ビットレート デフォルト: '192k'
 */
export async function exportMP3(
  ffmpeg: FFmpeg,
  inputPath: string,
  outputPath: string,
  bitrate: string = '192k'
): Promise<void> {
  console.log(`[Export] MP3エンコード開始: ${inputPath}`);

  await execFF(ffmpeg, [
    '-y',
    '-i',
    inputPath,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    bitrate,
    outputPath,
  ], 'Export:mp3');

  console.log(`[Export] MP3エンコード完了: ${outputPath} (${bitrate})`);
}
