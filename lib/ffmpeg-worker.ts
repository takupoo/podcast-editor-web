import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

/**
 * FFmpegインスタンスを初期化
 * @param onProgress ロード進捗のコールバック（0-1の範囲）
 * @returns 初期化されたFFmpegインスタンス
 */
export async function loadFFmpeg(
  onProgress?: (ratio: number) => void
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  // ロード進捗を監視
  if (onProgress) {
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });
  }

  try {
    // CDNからFFmpegコアをロード（0.12.10: concat フィルタの abort バグ修正含む）
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    });

    console.log('[FFmpeg] ロード完了');
    if (onProgress) onProgress(1);

    return ffmpeg;
  } catch (error) {
    console.error('[FFmpeg] ロードエラー:', error);
    throw new Error(`FFmpegのロードに失敗しました: ${error}`);
  }
}

/**
 * FFmpegインスタンスを取得（既にロード済みの場合）
 * @returns FFmpegインスタンスまたはnull
 */
export function getFFmpeg(): FFmpeg | null {
  return ffmpeg;
}

/**
 * FFmpegインスタンスをリセット
 */
export function resetFFmpeg(): void {
  ffmpeg = null;
}

/**
 * FFmpegインスタンスを強制再ロード
 * WASM が Aborted() 状態になった後のリカバリー用
 * @param onProgress ロード進捗コールバック
 */
export async function reloadFFmpeg(
  onProgress?: (ratio: number) => void
): Promise<FFmpeg> {
  if (ffmpeg) {
    try { ffmpeg.terminate(); } catch {} // Worker を終了してリソースを解放
  }
  ffmpeg = null; // シングルトンを無効化して新規インスタンスを作成
  return loadFFmpeg(onProgress);
}
