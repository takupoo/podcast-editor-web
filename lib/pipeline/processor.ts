import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ProcessConfig, ProcessProgress } from './types';
import { loadFFmpeg, reloadFFmpeg } from '../ffmpeg-worker';
import { applySyncAndTrim } from './trim';
import { applyDenoise } from './denoise';
import { normalizeLoudness } from './loudness';
import { applyDynamics } from './dynamics';
import { mixVoices, addBGM, appendEndscene, exportMP3 } from './mix';
import { trimSilence } from './silence';
import { execFF } from './exec';

/**
 * FFmpegのFS内ファイルを安全に削除（WASMメモリ節約用）
 * 存在しない場合や削除失敗は無視する
 */
async function safeDelete(ffmpeg: FFmpeg, name: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    // 存在しない / 削除不可の場合は無視
  }
}

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
  // finally でアクセスできるよう関数スコープで宣言
  let ffmpeg: FFmpeg | null = null;
  let abortWatcher: ((log: { message: string }) => void) | null = null;

  try {
    // FFmpegロード
    console.log('[Processor] FFmpegロード開始');
    onProgress({ stage: 'loading', percent: 0, message: 'FFmpegを読み込み中...' });
    ffmpeg = await loadFFmpeg((ratio) => {
      onProgress({
        stage: 'loading',
        percent: ratio * 10,
        message: 'FFmpegを読み込み中...',
      });
    });
    console.log('[Processor] FFmpegロード完了');

    // Aborted() を検出するグローバルウォッチャー
    // appendEndscene などの concat フィルタが WASM cleanup で abort() を呼ぶ場合がある
    let wasmAborted = false;
    abortWatcher = ({ message }: { message: string }) => {
      if (message.includes('Aborted()')) {
        wasmAborted = true;
        console.warn('[Processor] WASM Aborted() を検出');
      }
    };
    ffmpeg.on('log', abortWatcher);

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

    let currentFileA: string;
    let currentFileB: string;

    // Stage 1: クラップ検出 + 同期トリム（プレビュー・通常モード共通）
    onProgress({
      stage: 'trim',
      percent: 10,
      message: 'クラップを検出中...',
    });

    await applySyncAndTrim(
      ffmpeg,
      'trimmed_a.wav',
      'trimmed_b.wav',
      config.pre_clap_margin,
      config.post_clap_cut,
      config.clap_threshold_db
    );

    currentFileA = 'trimmed_a.wav';
    currentFileB = 'trimmed_b.wav';

    // プレビューモード: 同期済みトラックをさらにN秒に切り出す
    if (config.preview_mode && config.preview_duration) {
      console.log(`[Processor] プレビューモード: 同期後、最初の${config.preview_duration}秒を切り出し`);
      onProgress({
        stage: 'trim',
        percent: 15,
        message: `プレビュー用に最初の${config.preview_duration}秒を切り出し中...`,
      });

      await execFF(ffmpeg, [
        '-y', '-i', currentFileA,
        '-t', config.preview_duration.toString(),
        'preview_a.wav',
      ], 'Trim:preview:A');
      await safeDelete(ffmpeg, currentFileA);

      await execFF(ffmpeg, [
        '-y', '-i', currentFileB,
        '-t', config.preview_duration.toString(),
        'preview_b.wav',
      ], 'Trim:preview:B');
      await safeDelete(ffmpeg, currentFileB);

      currentFileA = 'preview_a.wav';
      currentFileB = 'preview_b.wav';
    }

    // 入力ファイルを削除してWASMメモリを解放
    await safeDelete(ffmpeg, 'input_a.mp3');
    await safeDelete(ffmpeg, 'input_b.mp3');

    // Stage 2-4: 統合処理（Denoise + Loudness + Dynamics）
    // spectral 以外の場合は3つのステージを1つのFFmpegコマンドにまとめて高速化
    const canUseUnified = !config.denoise_enabled ||
                         (config.denoise_method !== 'spectral' && config.denoise_method !== 'anlmdn');

    if (canUseUnified) {
      // 統合処理パス（afftdn, none の場合）
      onProgress({
        stage: 'processing',
        percent: 20,
        message: '音声を処理中（統合フィルタ）...',
      });

      // フィルタチェーンの構築
      const filterParts: string[] = [];

      // Denoise（有効な場合）
      if (config.denoise_enabled && config.denoise_method === 'afftdn') {
        const nr = Math.round(Math.max(10, Math.min(80, ((-config.noise_gate_threshold - 30) / 10) * 23.3)));
        filterParts.push(
          'highpass=f=80',
          `afftdn=nr=${nr}:nf=-25:tn=1`,
          'lowpass=f=12000'
        );
      } else if (config.denoise_enabled && config.denoise_method === 'none') {
        filterParts.push('highpass=f=80', 'lowpass=f=12000');
      }

      // Loudness（単パス）
      filterParts.push(
        `loudnorm=I=${config.target_lufs}:TP=${config.true_peak}:LRA=${config.lra}`
      );

      // Dynamics
      const dbToLinear = (dbStr: string): number => {
        const db = parseFloat(dbStr.replace(/dB$/i, ''));
        return Math.pow(10, db / 20);
      };
      const thresholdLinear = dbToLinear(config.comp_threshold);
      const limitLinear = dbToLinear(config.limiter_limit);
      filterParts.push(
        `acompressor=threshold=${thresholdLinear}:ratio=${config.comp_ratio}:attack=${config.comp_attack}:release=${config.comp_release}`,
        `alimiter=limit=${limitLinear}`
      );

      const unifiedFilter = filterParts.join(',');
      console.log('[Processor] 統合フィルタ:', unifiedFilter);

      // 話者A
      onProgress({
        stage: 'processing',
        percent: 30,
        message: '話者Aを処理中...',
      });
      await execFF(ffmpeg, [
        '-y', '-i', currentFileA,
        '-af', unifiedFilter,
        '-ar', '48000',
        'processed_a.wav',
      ], 'Unified:A');
      await safeDelete(ffmpeg, currentFileA);

      // 話者B
      onProgress({
        stage: 'processing',
        percent: 50,
        message: '話者Bを処理中...',
      });
      await execFF(ffmpeg, [
        '-y', '-i', currentFileB,
        '-af', unifiedFilter,
        '-ar', '48000',
        'processed_b.wav',
      ], 'Unified:B');
      await safeDelete(ffmpeg, currentFileB);
    } else {
      // 従来の分離処理パス（spectral, anlmdn の場合）
      // Stage 2: Denoise（ノイズ除去）
      if (config.denoise_enabled) {
        onProgress({
          stage: 'denoise',
          percent: 20,
          message: `ノイズを除去中（${config.denoise_method}）...`,
        });

        const prevA = currentFileA, prevB = currentFileB;
        await applyDenoise(
          ffmpeg,
          currentFileA,
          'denoised_a.wav',
          config.denoise_method,
          config.noise_gate_threshold
        );
        await safeDelete(ffmpeg, prevA);

        await applyDenoise(
          ffmpeg,
          currentFileB,
          'denoised_b.wav',
          config.denoise_method,
          config.noise_gate_threshold
        );
        await safeDelete(ffmpeg, prevB);

        currentFileA = 'denoised_a.wav';
        currentFileB = 'denoised_b.wav';
      }

      // Stage 3: Loudness正規化（単パス）
      onProgress({
        stage: 'loudness',
        percent: 30,
        message: 'ラウドネスを調整中...',
      });
      await normalizeLoudness(
        ffmpeg,
        currentFileA,
        'loud_a.wav',
        config.target_lufs,
        config.true_peak,
        config.lra,
        true // 常に単パス
      );
      await safeDelete(ffmpeg, currentFileA);

      onProgress({
        stage: 'loudness',
        percent: 40,
        message: 'ラウドネスを調整中...',
      });
      await normalizeLoudness(
        ffmpeg,
        currentFileB,
        'loud_b.wav',
        config.target_lufs,
        config.true_peak,
        config.lra,
        true // 常に単パス
      );
      await safeDelete(ffmpeg, currentFileB);

      // Stage 4: Dynamics処理
      onProgress({
        stage: 'dynamics',
        percent: 50,
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
      await safeDelete(ffmpeg, 'loud_a.wav');

      onProgress({
        stage: 'dynamics',
        percent: 60,
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
      await safeDelete(ffmpeg, 'loud_b.wav');
    }

    // Stage 5: ボイスミックス
    onProgress({
      stage: 'mix',
      percent: 70,
      message: '2トラックをミックス中...',
    });
    await mixVoices(ffmpeg, 'processed_a.wav', 'processed_b.wav', 'mixed.wav');
    await safeDelete(ffmpeg, 'processed_a.wav');
    await safeDelete(ffmpeg, 'processed_b.wav');

    let currentFile = 'mixed.wav';

    // Stage 5.5: 無音カット（オプション）
    if (config.silence_trim_enabled) {
      onProgress({
        stage: 'silence',
        percent: 73,
        message: '無音区間を検出・カット中...',
      });

      const prevFile = currentFile;
      await trimSilence(
        ffmpeg,
        currentFile,
        'silence_trimmed.wav',
        config.silence_threshold_db,
        config.silence_min_duration,
        config.silence_target_duration
      );
      await safeDelete(ffmpeg, prevFile);
      currentFile = 'silence_trimmed.wav';
    }

    // Stage 6: BGM追加（オプション）
    if (config.bgm) {
      onProgress({
        stage: 'bgm',
        percent: 78,
        message: 'BGMを追加中...',
      });

      if (config.bgm instanceof File) {
        const bgmData = await fetchFile(config.bgm);
        console.log('[Processor] BGMファイル読み込み完了:', bgmData.byteLength, 'bytes');
        await ffmpeg.writeFile('bgm.mp3', bgmData);
        console.log('[Processor] BGMファイル書き込み完了');
      } else {
        throw new Error('BGMファイルが不正です');
      }

      const prevMixed = currentFile;
      await addBGM(
        ffmpeg,
        currentFile,
        'bgm.mp3',
        'with_bgm.wav',
        config.bgm_target_lufs,
        config.bgm_fade_in,
        config.bgm_fade_out
      );
      await safeDelete(ffmpeg, prevMixed);
      await safeDelete(ffmpeg, 'bgm.mp3');
      currentFile = 'with_bgm.wav';
    }

    // Stage 7: エンドシーン追加（オプション）
    if (config.endscene) {
      onProgress({
        stage: 'endscene',
        percent: 85,
        message: 'エンドシーンを追加中...',
      });

      if (config.endscene instanceof File) {
        const endsceneData = await fetchFile(config.endscene);
        console.log('[Processor] エンドシーンファイル読み込み完了:', endsceneData.byteLength, 'bytes');
        await ffmpeg.writeFile('endscene.mp3', endsceneData);
        console.log('[Processor] エンドシーンファイル書き込み完了');
      } else {
        throw new Error('エンドシーンファイルが不正です');
      }

      const prevFile = currentFile;
      await appendEndscene(
        ffmpeg,
        currentFile,
        'endscene.mp3',
        'with_endscene.wav',
        config.endscene_crossfade
      );
      await safeDelete(ffmpeg, prevFile);
      await safeDelete(ffmpeg, 'endscene.mp3');
      currentFile = 'with_endscene.wav';
    }

    // Aborted() が発生していた場合: 出力ファイルを保存してFFmpegを再ロード
    // appendEndscene の concat フィルタが WASM abort を引き起こすことがある
    // その場合、次の exec() が RuntimeError になるため事前にリロードが必要
    if (wasmAborted) {
      console.warn('[Processor] Aborted() 後のリカバリー: FFmpegを再ロード中...');
      onProgress({
        stage: 'export',
        percent: 88,
        message: 'FFmpegを再初期化中...',
      });
      const savedFile = await ffmpeg.readFile(currentFile) as Uint8Array;
      ffmpeg.off('log', abortWatcher);
      ffmpeg = await reloadFFmpeg();
      // 再ロード後のログにもウォッチャーを設定
      ffmpeg.on('log', abortWatcher);
      await ffmpeg.writeFile(currentFile, savedFile);
      wasmAborted = false;
      console.log('[Processor] FFmpeg再ロード完了、処理を継続');
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
      await execFF(ffmpeg, ['-y', '-i', currentFile, outputFile], 'Export:wav');
    }
    await safeDelete(ffmpeg, currentFile);

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
  } finally {
    if (ffmpeg && abortWatcher) {
      ffmpeg.off('log', abortWatcher);
    }
  }
}
