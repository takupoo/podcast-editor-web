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
  method: 'none' | 'afftdn' | 'anlmdn' | 'spectral' = 'spectral',
  threshold: number = -50.0
): Promise<void> {
  console.log(`[Denoise] ノイズ除去開始: ${inputFile}`);
  console.log(`[Denoise] 方式: ${method}, 閾値: ${threshold}dB`);

  if (method === 'none') {
    // 方式1: ノイズ除去なし（ハイ/ローパスフィルタのみ）
    const basicFilter = ['highpass=f=80', 'lowpass=f=12000'].join(',');
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
      'highpass=f=80',
      `afftdn=nr=${nr}:nf=-25:tn=1`,
      'lowpass=f=12000',
    ].join(',');

    try {
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', filter, outputFile], 'Denoise:afftdn');
      console.log('[Denoise] afftdn完了');
    } catch (error) {
      console.warn('[Denoise] afftdn失敗、フォールバック:', error);
      const basicFilter = ['highpass=f=80', 'lowpass=f=12000'].join(',');
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
    }
    return;
  }

  if (method === 'anlmdn') {
    // 方式3: anlmdn（Non-Local Meansベース）
    const strength = Math.max(1, Math.min(15, ((-threshold - 30) / 10) * 5));
    console.log(`[Denoise] anlmdn strength=${strength}`);

    const filter = [
      'highpass=f=80',
      `anlmdn=s=${strength}:p=7:r=15`,
      'lowpass=f=12000',
    ].join(',');

    try {
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', filter, outputFile], 'Denoise:anlmdn');
      console.log('[Denoise] anlmdn完了');
    } catch (error) {
      console.warn('[Denoise] anlmdn失敗、フォールバック:', error);
      const basicFilter = ['highpass=f=80', 'lowpass=f=12000'].join(',');
      await execFF(ffmpeg, ['-y', '-i', inputFile, '-af', basicFilter, outputFile], 'Denoise:basic');
    }
    return;
  }

  if (method === 'spectral') {
    // 方式4: JavaScriptスペクトル減算（Python版noisereduceと同等）
    // 録音中の最も静かな10%フレームからノイズプロファイルを推定し減算
    console.log('[Denoise] spectral: JSスペクトル減算開始');

    // sensitivity: 過減算係数（1.5〜3.0）- 高いほど積極的にノイズを除去
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

    // スペクトル減算を適用
    const cleaned = spectralSubtract(audioBuf, sensitivity);

    // 16bit PCM WAVにエンコードしてWASM FSへ書き戻す
    const wavData = encodeWav(cleaned);
    await ffmpeg.writeFile(outputFile, wavData);

    console.log('[Denoise] spectral完了');
    return;
  }
}

// ──────────────────────────────────────────────
// スペクトル減算のユーティリティ関数
// ──────────────────────────────────────────────

/**
 * Cooley-Tukey Radix-2 FFT（インプレース）
 * re/im は長さが2の冪乗であること
 */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  // ビット反転置換
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // バタフライ演算
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len >> 1; j++) {
        const ure = re[i + j], uim = im[i + j];
        const vre = re[i + j + (len >> 1)] * cr - im[i + j + (len >> 1)] * ci;
        const vim = re[i + j + (len >> 1)] * ci + im[i + j + (len >> 1)] * cr;
        re[i + j] = ure + vre;          im[i + j] = uim + vim;
        re[i + j + (len >> 1)] = ure - vre; im[i + j + (len >> 1)] = uim - vim;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** IFFT（FFTの共役 + スケール） */
function ifft(re: Float32Array, im: Float32Array): void {
  for (let i = 0; i < im.length; i++) im[i] = -im[i];
  fft(re, im);
  const n = re.length;
  for (let i = 0; i < n; i++) { re[i] /= n; im[i] = -im[i] / n; }
}

/**
 * スペクトル減算（noisereduce スペクトラルゲーティング相当）
 *
 * アルゴリズム:
 * 1. 全フレームのRMSエネルギーを計算
 * 2. 最も静かな10%フレームからノイズプロファイルを推定
 * 3. 各フレームに cleanMag = max(mag - sensitivity * noiseMag, 0.01 * mag) を適用
 * 4. 位相を保持してIFFT、オーバーラップ加算で再合成
 */
function spectralSubtract(buf: AudioBuffer, sensitivity: number): AudioBuffer {
  const sr = buf.sampleRate;
  const nCh = buf.numberOfChannels;
  const FFT_SIZE = 2048;
  const HOP = FFT_SIZE >> 2; // 75%オーバーラップ

  // Hann窓（解析・合成共通）
  const hann = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
  }

  const outputChannels: Float32Array[] = [];

  for (let ch = 0; ch < nCh; ch++) {
    const inp = buf.getChannelData(ch);
    const out = new Float32Array(inp.length);
    const norm = new Float32Array(inp.length);
    const totalFrames = Math.floor((inp.length - FFT_SIZE) / HOP) + 1;

    // パス1: 全フレームのRMSエネルギーを計算
    const energies = new Float32Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) {
      const off = f * HOP;
      let sum = 0;
      for (let i = 0; i < FFT_SIZE; i++) {
        const s = off + i < inp.length ? inp[off + i] : 0;
        sum += s * s;
      }
      energies[f] = Math.sqrt(sum / FFT_SIZE);
    }

    // 静かなフレームのエネルギー閾値を計算（下位10%、最低10フレーム）
    const sorted = Float32Array.from(energies).sort();
    const noiseThreshold = sorted[Math.max(10, Math.floor(totalFrames * 0.1)) - 1];

    // パス1.5: ノイズフレームから平均マグニチュードスペクトルを計算
    const HALF = (FFT_SIZE >> 1) + 1;
    const noiseSpec = new Float32Array(HALF);
    let noiseCount = 0;
    const re = new Float32Array(FFT_SIZE);
    const im = new Float32Array(FFT_SIZE);

    for (let f = 0; f < totalFrames; f++) {
      if (energies[f] > noiseThreshold) continue;
      const off = f * HOP;
      for (let i = 0; i < FFT_SIZE; i++) {
        re[i] = (off + i < inp.length ? inp[off + i] : 0) * hann[i];
        im[i] = 0;
      }
      fft(re, im);
      for (let i = 0; i < HALF; i++) {
        noiseSpec[i] += Math.sqrt(re[i] * re[i] + im[i] * im[i]);
      }
      noiseCount++;
    }

    // ノイズフレームがない場合は最初の1秒を使用
    if (noiseCount === 0) {
      const fallbackFrames = Math.ceil(sr / HOP);
      for (let f = 0; f < Math.min(fallbackFrames, totalFrames); f++) {
        const off = f * HOP;
        for (let i = 0; i < FFT_SIZE; i++) {
          re[i] = (off + i < inp.length ? inp[off + i] : 0) * hann[i];
          im[i] = 0;
        }
        fft(re, im);
        for (let i = 0; i < HALF; i++) {
          noiseSpec[i] += Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        }
        noiseCount++;
      }
    }

    if (noiseCount > 0) {
      for (let i = 0; i < HALF; i++) noiseSpec[i] /= noiseCount;
    }

    // パス2: スペクトル減算を全フレームに適用
    for (let f = 0; f < totalFrames; f++) {
      const off = f * HOP;
      for (let i = 0; i < FFT_SIZE; i++) {
        re[i] = (off + i < inp.length ? inp[off + i] : 0) * hann[i];
        im[i] = 0;
      }
      fft(re, im);

      // 下半分のみ修正（DC〜ナイキスト）
      for (let i = 0; i < HALF; i++) {
        const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        const phase = Math.atan2(im[i], re[i]);
        // スペクトルフロア0.01でアーティファクト（ミュージカルノイズ）を抑制
        const cleanMag = Math.max(mag - sensitivity * noiseSpec[i], 0.01 * mag);
        re[i] = cleanMag * Math.cos(phase);
        im[i] = cleanMag * Math.sin(phase);
      }
      // 共役対称性を補完（実数信号のIFFTに必要）
      for (let i = 1; i < FFT_SIZE >> 1; i++) {
        re[FFT_SIZE - i] = re[i];
        im[FFT_SIZE - i] = -im[i];
      }

      ifft(re, im);

      // オーバーラップ加算（Hann合成窓）
      for (let i = 0; i < FFT_SIZE; i++) {
        if (off + i < out.length) {
          out[off + i] += re[i] * hann[i];
          norm[off + i] += hann[i] * hann[i];
        }
      }
    }

    // 窓正規化（75%オーバーラップのHann窓はCOLA条件を満たし≈1.5）
    for (let i = 0; i < out.length; i++) {
      if (norm[i] > 1e-8) out[i] /= norm[i];
    }

    outputChannels.push(out);
  }

  // 出力用AudioBufferを生成
  const offCtx = new OfflineAudioContext(nCh, buf.length, sr);
  const outBuf = offCtx.createBuffer(nCh, buf.length, sr);
  for (let ch = 0; ch < nCh; ch++) outBuf.getChannelData(ch).set(outputChannels[ch]);
  return outBuf;
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
