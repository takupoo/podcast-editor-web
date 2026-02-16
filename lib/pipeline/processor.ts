import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ProcessConfig, ProcessProgress } from './types';
import { loadFFmpeg } from '../ffmpeg-worker';
import { applySyncAndTrim } from './trim';
import { applyDenoise } from './denoise';
import { normalizeLoudness } from './loudness';
import { applyDynamics } from './dynamics';
import { mixVoices, addBGM, appendEndscene, exportMP3 } from './mix';

/**
 * ポッドキャスト処理パイプライン（完全版）
 * @param fileA 話者Aの音声ファイル
 * @param fileB 話者Bの音声ファイル
 * @param config 処理設定
 * @param onProgress 進捗コールバック
 * @returns 処理済みMP3のBlob
 */
export async function processPodcast(
  fileA: File,
  fileB: File,
  config: ProcessConfig,
  onProgress: (progress: ProcessProgress) => void
): Promise<Blob> {
  try {
    // FFmpegロード
    console.log('[Processor] FFmpegロード開始');
    onProgress({ stage: 'loading', percent: 0, message: 'FFmpegを読み込み中...' });
    const ffmpeg = await loadFFmpeg((ratio) => {
      onProgress({
        stage: 'loading',
        percent: ratio * 10,
        message: 'FFmpegを読み込み中...',
      });
    });
    console.log('[Processor] FFmpegロード完了');

    // ファイルをFFmpegのFSに書き込み
    console.log('[Processor] ファイル書き込み開始');
    onProgress({ stage: 'loading', percent: 10, message: 'ファイルを読み込み中...' });

    try {
      const dataA = await fetchFile(fileA);
      console.log('[Processor] ファイルA読み込み完了:', dataA.byteLength, 'bytes');
      await ffmpeg.writeFile('input_a.mp3', dataA);
      console.log('[Processor] ファイルA書き込み完了');

      const dataB = await fetchFile(fileB);
      console.log('[Processor] ファイルB読み込み完了:', dataB.byteLength, 'bytes');
      await ffmpeg.writeFile('input_b.mp3', dataB);
      console.log('[Processor] ファイルB書き込み完了');
    } catch (error) {
      console.error('[Processor] ファイル書き込みエラー:', error);
      throw new Error(`ファイルの書き込みに失敗しました: ${error}`);
    }

    // Stage 1: Trim（クラップ検出・同期）
    onProgress({
      stage: 'trim',
      percent: 10,
      message: 'クラップを検出中...',
    });

    await applySyncAndTrim(
      ffmpeg,
      fileA,
      fileB,
      'trimmed_a.wav',
      'trimmed_b.wav',
      config.pre_clap_margin,
      config.post_clap_cut,
      config.clap_threshold_db
    );

    let currentFileA = 'trimmed_a.wav';
    let currentFileB = 'trimmed_b.wav';

    // Stage 2: Denoise（ノイズ除去）
    if (config.denoise_enabled) {
      onProgress({
        stage: 'denoise',
        percent: 15,
        message: 'ノイズを除去中...',
      });

      await applyDenoise(
        ffmpeg,
        currentFileA,
        'denoised_a.wav',
        config.noise_gate_threshold
      );

      await applyDenoise(
        ffmpeg,
        currentFileB,
        'denoised_b.wav',
        config.noise_gate_threshold
      );

      currentFileA = 'denoised_a.wav';
      currentFileB = 'denoised_b.wav';
    }

    // Stage 3: Loudness正規化
    onProgress({
      stage: 'loudness',
      percent: 25,
      message: 'ラウドネスを正規化中（話者A）...',
    });
    await normalizeLoudness(
      ffmpeg,
      currentFileA,
      'loud_a.wav',
      config.target_lufs,
      config.true_peak,
      config.lra
    );

    onProgress({
      stage: 'loudness',
      percent: 35,
      message: 'ラウドネスを正規化中（話者B）...',
    });
    await normalizeLoudness(
      ffmpeg,
      currentFileB,
      'loud_b.wav',
      config.target_lufs,
      config.true_peak,
      config.lra
    );

    // Stage 4: Dynamics処理
    onProgress({
      stage: 'dynamics',
      percent: 40,
      message: 'ダイナミクスを処理中（話者A）...',
    });
    await applyDynamics(
      ffmpeg,
      'loud_a.wav',
      'processed_a.wav',
      config.comp_threshold,
      config.comp_ratio,
      config.comp_attack,
      config.comp_release,
      config.limiter_limit
    );

    onProgress({
      stage: 'dynamics',
      percent: 50,
      message: 'ダイナミクスを処理中（話者B）...',
    });
    await applyDynamics(
      ffmpeg,
      'loud_b.wav',
      'processed_b.wav',
      config.comp_threshold,
      config.comp_ratio,
      config.comp_attack,
      config.comp_release,
      config.limiter_limit
    );

    // Stage 5: ボイスミックス
    onProgress({
      stage: 'mix',
      percent: 60,
      message: '2トラックをミックス中...',
    });
    await mixVoices(ffmpeg, 'processed_a.wav', 'processed_b.wav', 'mixed.wav');

    let currentFile = 'mixed.wav';

    // Stage 6: BGM追加（オプション）
    if (config.bgm) {
      onProgress({
        stage: 'bgm',
        percent: 70,
        message: 'BGMを追加中...',
      });

      // BGMファイルをFFmpegのFSに書き込み
      if (config.bgm instanceof File) {
        const bgmData = await fetchFile(config.bgm);
        console.log('[Processor] BGMファイル読み込み完了:', bgmData.byteLength, 'bytes');
        await ffmpeg.writeFile('bgm.mp3', bgmData);
        console.log('[Processor] BGMファイル書き込み完了');
      } else {
        throw new Error('BGMファイルが不正です');
      }

      await addBGM(
        ffmpeg,
        currentFile,
        'bgm.mp3',
        'with_bgm.wav',
        config.bgm_volume_db,
        config.bgm_fade_in,
        config.bgm_fade_out
      );
      currentFile = 'with_bgm.wav';
    }

    // Stage 7: エンドシーン追加（オプション）
    if (config.endscene) {
      onProgress({
        stage: 'endscene',
        percent: 80,
        message: 'エンドシーンを追加中...',
      });

      // エンドシーンファイルをFFmpegのFSに書き込み
      if (config.endscene instanceof File) {
        const endsceneData = await fetchFile(config.endscene);
        console.log('[Processor] エンドシーンファイル読み込み完了:', endsceneData.byteLength, 'bytes');
        await ffmpeg.writeFile('endscene.mp3', endsceneData);
        console.log('[Processor] エンドシーンファイル書き込み完了');
      } else {
        throw new Error('エンドシーンファイルが不正です');
      }

      await appendEndscene(
        ffmpeg,
        currentFile,
        'endscene.mp3',
        'with_endscene.wav',
        config.endscene_crossfade
      );
      currentFile = 'with_endscene.wav';
    }

    // Stage 8: MP3エンコード
    onProgress({
      stage: 'export',
      percent: 90,
      message: 'MP3にエンコード中...',
    });

    const outputFile =
      config.output_format === 'mp3' ? 'output.mp3' : 'output.wav';

    if (config.output_format === 'mp3') {
      await exportMP3(ffmpeg, currentFile, outputFile, config.mp3_bitrate);
    } else {
      // WAV出力の場合はそのままコピー
      await ffmpeg.exec(['-y', '-i', currentFile, outputFile]);
    }

    // 結果を読み込み
    onProgress({
      stage: 'export',
      percent: 95,
      message: '結果を取得中...',
    });
    const data = await ffmpeg.readFile(outputFile);
    const mimeType =
      config.output_format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const uint8Array = new Uint8Array(data as Uint8Array);
    const blob = new Blob([uint8Array], { type: mimeType });

    onProgress({
      stage: 'complete',
      percent: 100,
      message: '処理完了！',
    });

    return blob;
  } catch (error) {
    console.error('処理エラー:', error);
    onProgress({
      stage: 'error',
      percent: 0,
      message: `エラーが発生しました: ${error}`,
    });
    throw error;
  }
}
