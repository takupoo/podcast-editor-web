import { FFmpeg } from '@ffmpeg/ffmpeg';
import { execFF } from './exec';

/**
 * ノイズ除去（複数方式対応）
 *
 * @param ffmpeg FFmpegインスタンス
 * @param inputFile 入力ファイル名（FFmpegのFS内）
 * @param outputFile 出力ファイル名（FFmpegのFS内）
 * @param method ノイズ除去方式（'none' | 'afftdn' | 'anlmdn' | 'spectral'）
 * @param threshold ノイズ除去強度（dB）-60～-30（推奨: -50）
 */
export async function applyDenoise(
  ffmpeg: FFmpeg,
  inputFile: string,
  outputFile: string,
  method: 'none' | 'afftdn' | 'anlmdn' | 'spectral' | 'rnnoise' = 'rnnoise',
  threshold: number = -50.0,
  highpassFreq: number = 80,
  lowpassFreq: number = 16000
): Promise<void> {
  console.log(`[Denoise] ノイズ除去開始: ${inputFile}`);
  console.log(`[Denoise] 方式: ${method}, 閾値: ${threshold}dB`);

  if (method === 'none') {
    // 方式1: ノイズ除去なし（ハイ/ローパスフィルタのみ）
    const basicFilter = [`highpass=f=${highpassFreq}`, `lowpass=f=${lowpassFreq}`].join(',');
    await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
    console.log('[Denoise] 基本フィルタによる処理完了');
    return;
  }

  if (method === 'afftdn') {
    // 方式2: afftdn（FFTベースのノイズ除去）
    // nr パラメータ: 有効範囲は 0.01～97
    // -60dB → nr≈10（弱）, -50dB → nr≈33（標準）, -40dB → nr≈56, -30dB → nr=80（最強）
    const nr = Math.round(Math.max(10, Math.min(80, ((-threshold - 30) / 10) * 23.3)));
    console.log(`[Denoise] afftdn nr=${nr}, tn=1`);

    const filter = [
      `highpass=f=${highpassFreq}`,
      `afftdn=nr=${nr}:nf=-25:tn=1`,
      `lowpass=f=${lowpassFreq}`,
    ].join(',');

    try {
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', filter, outputFile], 'Denoise:afftdn');
      console.log('[Denoise] afftdn完了');
    } catch (error) {
      console.warn('[Denoise] afftdn失敗、フォールバック:', error);
      const basicFilter = [`highpass=f=${highpassFreq}`, `lowpass=f=${lowpassFreq}`].join(',');
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
    }
    return;
  }

  if (method === 'anlmdn') {
    // 方式3: anlmdn（Non-Local Meansベース）
    const strength = Math.max(1, Math.min(15, ((-threshold - 30) / 10) * 5));
    console.log(`[Denoise] anlmdn strength=${strength}`);

    const filter = [
      `highpass=f=${highpassFreq}`,
      `anlmdn=s=${strength}:p=7:r=15`,
      `lowpass=f=${lowpassFreq}`,
    ].join(',');

    try {
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', filter, outputFile], 'Denoise:anlmdn');
      console.log('[Denoise] anlmdn完了');
    } catch (error) {
      console.warn('[Denoise] anlmdn失敗、フォールバック:', error);
      const basicFilter = [`highpass=f=${highpassFreq}`, `lowpass=f=${lowpassFreq}`].join(',');
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
    }
    return;
  }

  if (method === 'rnnoise') {
    // 方式5: RNNoise WASM（ニューラルネットワークベースのノイズ除去）
    // 48kHz必須・480サンプル/フレームで処理
    console.log('[Denoise] rnnoise: RNNoise WASM ノイズ除去開始');

    // WASM FSからWAVを読み取りWeb Audio APIでデコード
    const data = await ffmpeg.readFile(inputFile) as Uint8Array;
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;

    const audioCtx = new AudioContext();
    let audioBuf: AudioBuffer;
    try {
      audioBuf = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      audioCtx.close();
    }

    console.log(`[Denoise] デコード完了: ${audioBuf.duration.toFixed(1)}s, ${audioBuf.sampleRate}Hz, ${audioBuf.numberOfChannels}ch`);

    // 48kHzにリサンプリング（RNNoise必須要件）
    let buf48k: AudioBuffer;
    if (audioBuf.sampleRate !== 48000) {
      console.log(`[Denoise] リサンプリング: ${audioBuf.sampleRate}Hz → 48000Hz`);
      const offCtx = new OfflineAudioContext(
        audioBuf.numberOfChannels,
        Math.ceil(audioBuf.length * 48000 / audioBuf.sampleRate),
        48000
      );
      const src = offCtx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(offCtx.destination);
      src.start(0);
      buf48k = await offCtx.startRendering();
    } else {
      buf48k = audioBuf;
    }

    // RNNoise WASMをロードして処理
    const { Rnnoise } = await import('@shiguredo/rnnoise-wasm');
    const rnnoise = await Rnnoise.load();

    const FRAME_SIZE = rnnoise.frameSize; // 480 (10ms @ 48kHz)
    const processedChannels: Float32Array[] = [];

    for (let ch = 0; ch < buf48k.numberOfChannels; ch++) {
      const input = buf48k.getChannelData(ch);
      const output = new Float32Array(input.length);
      const denoiseState = rnnoise.createDenoiseState();
      const frame = new Float32Array(FRAME_SIZE);

      for (let i = 0; i < input.length; i += FRAME_SIZE) {
        const remaining = Math.min(FRAME_SIZE, input.length - i);
        frame.fill(0);
        // RNNoise expects PCM16 range (-32768 to 32767)
        for (let j = 0; j < remaining; j++) {
          frame[j] = input[i + j] * 32768;
        }
        denoiseState.processFrame(frame);
        // Convert back to float32 range
        for (let j = 0; j < remaining; j++) {
          output[i + j] = frame[j] / 32768;
        }
      }

      denoiseState.destroy();
      processedChannels.push(output);
    }

    // ハイパス/ローパスフィルタはFFmpegで適用
    // まずRNNoise結果をWAVに書き戻す
    const offCtxOut = new OfflineAudioContext(
      buf48k.numberOfChannels,
      buf48k.length,
      48000
    );
    const outBuf = offCtxOut.createBuffer(
      buf48k.numberOfChannels,
      buf48k.length,
      48000
    );
    for (let ch = 0; ch < processedChannels.length; ch++) {
      outBuf.getChannelData(ch).set(processedChannels[ch]);
    }

    const wavData = encodeWav(outBuf);
    const tempFile = `rnnoise_temp_${outputFile}`;
    await ffmpeg.writeFile(tempFile, wavData);

    // highpass + lowpass フィルタを適用
    const filter = [`highpass=f=${highpassFreq}`, `lowpass=f=${lowpassFreq}`].join(',');
    await execFF(ffmpeg, ['-y', '-i', tempFile, '-af', filter, outputFile], 'Denoise:rnnoise:filter');
    try { await ffmpeg.deleteFile(tempFile); } catch { /* ignore */ }

    console.log('[Denoise] rnnoise完了');
    return;
  }

  if (method === 'spectral') {
    // 方式4: JavaScriptスペクトル減算（Python版noisereduceと同等）
    // Web Worker でメインスレッドをブロックせずに実行
    console.log('[Denoise] spectral: JSスペクトル減算開始（Worker）');

    const sensitivity = Math.max(1.5, Math.min(3.0, (-threshold - 30) / 10 + 1.5));
    console.log(`[Denoise] sensitivity=${sensitivity.toFixed(2)}`);

    // WASM FSからWAVを読み取りWeb Audio APIでデコード
    const data = await ffmpeg.readFile(inputFile) as Uint8Array;
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;

    const audioCtx = new AudioContext();
    let audioBuf: AudioBuffer;
    try {
      audioBuf = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      audioCtx.close();
    }

    console.log(`[Denoise] デコード完了: ${audioBuf.duration.toFixed(1)}s, ${audioBuf.numberOfChannels}ch`);

    // チャンネルデータを抽出して Worker に送信
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < audioBuf.numberOfChannels; ch++) {
      channels.push(new Float32Array(audioBuf.getChannelData(ch)));
    }

    const resultChannels = await runDenoiseWorker(channels, audioBuf.sampleRate, sensitivity);

    // 結果から AudioBuffer を再構築
    const offCtx = new OfflineAudioContext(
      audioBuf.numberOfChannels,
      audioBuf.length,
      audioBuf.sampleRate,
    );
    const outBuf = offCtx.createBuffer(
      audioBuf.numberOfChannels,
      audioBuf.length,
      audioBuf.sampleRate,
    );
    for (let ch = 0; ch < resultChannels.length; ch++) {
      outBuf.getChannelData(ch).set(resultChannels[ch]);
    }

    // 16bit PCM WAVにエンコードしてWASM FSへ書き戻す
    const wavData = encodeWav(outBuf);
    await ffmpeg.writeFile(outputFile, wavData);

    console.log('[Denoise] spectral完了');
    return;
  }
}

// ──────────────────────────────────────────────
// Web Worker 実行
// ──────────────────────────────────────────────

function runDenoiseWorker(
  channels: Float32Array[],
  sampleRate: number,
  sensitivity: number,
): Promise<Float32Array[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./denoise-worker.ts', import.meta.url),
    );

    worker.onmessage = (e: MessageEvent<{ channels: Float32Array[] }>) => {
      worker.terminate();
      resolve(e.data.channels);
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(`Denoise Worker error: ${e.message}`));
    };

    // Transferable で送信（コピーなし）
    const transferables = channels.map(ch => ch.buffer);
    worker.postMessage(
      { channels, sampleRate, sensitivity },
      transferables,
    );
  });
}


/**
 * AudioBuffer → 16bit PCM WAV（Uint8Array）
 */
function encodeWav(buf: AudioBuffer): Uint8Array {
  const nCh = buf.numberOfChannels;
  const len = buf.length;
  const sr = buf.sampleRate;
  const bps = 2; // 16bit = 2 bytes/sample
  const dataLen = len * nCh * bps;
  const ab = new ArrayBuffer(44 + dataLen);
  const v = new DataView(ab);

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };

  str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true);
  str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true);           // PCM chunk size
  v.setUint16(20, 1, true);            // PCM format
  v.setUint16(22, nCh, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * nCh * bps, true); // byte rate
  v.setUint16(32, nCh * bps, true);    // block align
  v.setUint16(34, 16, true);           // bits per sample
  str(36, 'data'); v.setUint32(40, dataLen, true);

  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < nCh; ch++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }

  return new Uint8Array(ab);
}
