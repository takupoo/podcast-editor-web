import { FFmpeg } from '@ffmpeg/ffmpeg';

/**
 * 音声ファイルの長さ（秒）を取得
 */
async function getDuration(ffmpeg: FFmpeg, filePath: string): Promise<number> {
  // ログを収集
  let logMessages: string[] = [];
  const logHandler = ({ message }: { message: string }) => {
    logMessages.push(message);
  };

  ffmpeg.on('log', logHandler);

  // FFmpegでファイル情報を取得
  try {
    await ffmpeg.exec(['-i', filePath, '-f', 'null', '-']);
  } catch (error) {
    // -i で情報取得するとエラーが出るが、ログには情報が含まれている
  }

  ffmpeg.off('log', logHandler);

  // ログからDurationを抽出（例: Duration: 00:01:23.45）
  const logText = logMessages.join('\n');
  const durationMatch = logText.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/);

  if (!durationMatch) {
    console.error('ログ内容:', logText);
    throw new Error(`ファイルの長さを取得できませんでした: ${filePath}`);
  }

  const hours = parseInt(durationMatch[1], 10);
  const minutes = parseInt(durationMatch[2], 10);
  const seconds = parseFloat(durationMatch[3]);

  const duration = hours * 3600 + minutes * 60 + seconds;

  return duration;
}

/**
 * 2トラックをセンターにミックス（両耳から両方聞こえる）
 * @param ffmpeg FFmpegインスタンス
 * @param trackA トラックA（FFmpegのFS内）
 * @param trackB トラックB（FFmpegのFS内）
 * @param output 出力ファイル（FFmpegのFS内）
 */
export async function mixVoices(
  ffmpeg: FFmpeg,
  trackA: string,
  trackB: string,
  output: string
): Promise<void> {
  console.log(`[Mix] ボイスミックス開始: ${trackA} + ${trackB}`);

  const filterComplex = [
    '[0:a]pan=mono|c0=0.5*FL+0.5*FR[a]',
    '[1:a]pan=mono|c0=0.5*FL+0.5*FR[b]',
    '[a][b]amix=inputs=2:duration=first:normalize=0[out]',
  ].join(';');

  await ffmpeg.exec([
    '-y',
    '-i',
    trackA,
    '-i',
    trackB,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    output,
  ]);

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

  // BGMが本編より短い場合のみループ
  let bgmSrc: string;
  if (bgmDuration < voiceDuration) {
    bgmSrc = `[1:a]aloop=loop=-1:size=2e+09,atrim=0:${voiceDuration}`;
  } else {
    bgmSrc = `[1:a]atrim=0:${voiceDuration}`;
  }

  const bgmFilter = [
    bgmSrc,
    `volume=${bgmVolumeDb}dB`,
    `afade=t=in:d=${bgmFadeIn}`,
    `afade=t=out:st=${fadeOutStart}:d=${bgmFadeOut}[bgm]`,
    '[0:a][bgm]amix=inputs=2:duration=first:normalize=0',
  ].join(',');

  await ffmpeg.exec([
    '-y',
    '-i',
    voicePath,
    '-i',
    bgmPath,
    '-filter_complex',
    bgmFilter,
    output,
  ]);

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

  await ffmpeg.exec([
    '-y',
    '-i',
    mainPath,
    '-i',
    endscenePath,
    '-filter_complex',
    filterComplex,
    output,
  ]);

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

  await ffmpeg.exec([
    '-y',
    '-i',
    inputPath,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    bitrate,
    outputPath,
  ]);

  console.log(`[Export] MP3エンコード完了: ${outputPath} (${bitrate})`);
}
