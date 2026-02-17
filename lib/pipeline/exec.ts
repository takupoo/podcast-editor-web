import { FFmpeg } from '@ffmpeg/ffmpeg';

/**
 * ffmpeg.exec() のラッパー
 * @ffmpeg/ffmpeg 0.12.x では非ゼロ終了コードでも reject しないため、
 * 戻り値を検査して失敗時に例外を投げる。
 */
export async function execFF(
  ffmpeg: FFmpeg,
  args: string[],
  label: string = 'FFmpeg'
): Promise<void> {
  const exitCode = await ffmpeg.exec(args);
  if (exitCode !== 0) {
    const cmd = args.slice(0, 8).join(' ');
    throw new Error(`[${label}] exec failed (code=${exitCode}): ${cmd}`);
  }
}
