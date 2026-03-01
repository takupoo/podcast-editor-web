/**
 * スペクトル減算 Web Worker
 *
 * メインスレッドから Float32Array のチャンネルデータを受け取り、
 * FFT ベースのスペクトル減算を実行して結果を返す。
 * Transferable Objects を使用してコピーコストを最小化。
 */

export interface DenoiseWorkerInput {
  channels: Float32Array[];
  sampleRate: number;
  sensitivity: number;
}

export interface DenoiseWorkerOutput {
  channels: Float32Array[];
}

// ──────────────────────────────────────────────
// FFT ユーティリティ
// ──────────────────────────────────────────────

/** Cooley-Tukey Radix-2 FFT（インプレース） */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
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

// ──────────────────────────────────────────────
// スペクトル減算コア処理
// ──────────────────────────────────────────────

function spectralSubtractChannels(
  channels: Float32Array[],
  sampleRate: number,
  sensitivity: number,
): Float32Array[] {
  const FFT_SIZE = 2048;
  const HOP = FFT_SIZE >> 2;
  const HALF = (FFT_SIZE >> 1) + 1;

  // スペクトルフロア: 元の振幅の6%を最低保証（ミュージカルノイズ防止）
  const SPECTRAL_FLOOR = 0.06;

  // テンポラルスムージング係数
  // 新フレームのゲインを30%、前フレームを70%でブレンド → ゲインの急変を防止
  const GAIN_SMOOTH_ALPHA = 0.3;

  const hann = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
  }

  // 周波数帯域別の感度スケーリングを事前計算
  // 3kHz以上で感度を下げ、高い声の倍音を過剰に除去しない
  const sensitivityScale = new Float32Array(HALF);
  for (let i = 0; i < HALF; i++) {
    const freq = (i * sampleRate) / FFT_SIZE;
    if (freq <= 3000) {
      sensitivityScale[i] = 1.0;
    } else if (freq <= 8000) {
      // 3kHz→8kHz で 1.0→0.5 にリニアに減衰
      sensitivityScale[i] = 1.0 - 0.5 * ((freq - 3000) / 5000);
    } else {
      sensitivityScale[i] = 0.5;
    }
  }

  const outputChannels: Float32Array[] = [];

  for (let ch = 0; ch < channels.length; ch++) {
    const inp = channels[ch];
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

    // 静かなフレームのエネルギー閾値（下位10%、最低10フレーム）
    const sorted = Float32Array.from(energies).sort();
    const noiseThreshold = sorted[Math.max(10, Math.floor(totalFrames * 0.1)) - 1];

    // パス1.5: ノイズフレームから平均マグニチュードスペクトル
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
      const fallbackFrames = Math.ceil(sampleRate / HOP);
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

    // テンポラルスムージング用: 前フレームのゲインバッファ
    const prevGain = new Float32Array(HALF);
    prevGain.fill(1.0);

    // パス2: ウィーナーフィルター + 周波数帯域別感度 + テンポラルスムージング
    for (let f = 0; f < totalFrames; f++) {
      const off = f * HOP;
      for (let i = 0; i < FFT_SIZE; i++) {
        re[i] = (off + i < inp.length ? inp[off + i] : 0) * hann[i];
        im[i] = 0;
      }
      fft(re, im);

      for (let i = 0; i < HALF; i++) {
        const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        const phase = Math.atan2(im[i], re[i]);

        // ウィーナーフィルター: gain = max(1 - (noise/signal)², floor)
        // 単純なスペクトル減算 (mag - noise) より自然な減衰特性
        const scaledNoise = sensitivity * sensitivityScale[i] * noiseSpec[i];
        const noiseRatio = mag > 1e-10 ? scaledNoise / mag : 1.0;
        const wienerGain = Math.max(1.0 - noiseRatio * noiseRatio, SPECTRAL_FLOOR);

        // テンポラルスムージング: 前フレームのゲインとブレンドしてゲイン急変を防止
        const smoothedGain = GAIN_SMOOTH_ALPHA * wienerGain + (1 - GAIN_SMOOTH_ALPHA) * prevGain[i];
        prevGain[i] = smoothedGain;

        const cleanMag = smoothedGain * mag;
        re[i] = cleanMag * Math.cos(phase);
        im[i] = cleanMag * Math.sin(phase);
      }
      for (let i = 1; i < FFT_SIZE >> 1; i++) {
        re[FFT_SIZE - i] = re[i];
        im[FFT_SIZE - i] = -im[i];
      }

      ifft(re, im);

      for (let i = 0; i < FFT_SIZE; i++) {
        if (off + i < out.length) {
          out[off + i] += re[i] * hann[i];
          norm[off + i] += hann[i] * hann[i];
        }
      }
    }

    for (let i = 0; i < out.length; i++) {
      if (norm[i] > 1e-8) out[i] /= norm[i];
    }

    outputChannels.push(out);
  }

  return outputChannels;
}

// ──────────────────────────────────────────────
// Worker メッセージハンドラ
// ──────────────────────────────────────────────

self.onmessage = (e: MessageEvent<DenoiseWorkerInput>) => {
  const { channels, sampleRate, sensitivity } = e.data;

  const result = spectralSubtractChannels(channels, sampleRate, sensitivity);

  // Transferable で返却（コピーなし）
  const transferables = result.map(ch => ch.buffer);
  (self as unknown as Worker).postMessage(
    { channels: result } satisfies DenoiseWorkerOutput,
    transferables,
  );
};
