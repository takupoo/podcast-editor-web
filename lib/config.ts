import { ProcessConfig } from './pipeline/types';

export const DEFAULT_CONFIG: ProcessConfig = {
  // Preview Mode
  preview_mode: false, // プレビューモードOFF（全体を処理）
  preview_duration: 30, // プレビュー時は最初の30秒

  // Stage 1: Trim
  pre_clap_margin: 0.5,
  post_clap_cut: 1.0,  // クラップの1秒後からカット（クラップ音を除去）
  clap_threshold_db: -10.0,

  // Stage 2: Denoise
  denoise_enabled: true,  // デフォルトON
  denoise_method: 'spectral', // デフォルト: spectral（最高品質）
  noise_gate_threshold: -50.0, // ノイズフロア閾値（-60～-30dB）

  // Stage 3: Loudness
  target_lufs: -16.0,
  true_peak: -1.5,
  lra: 11.0,

  // Stage 4: Dynamics
  comp_threshold: '-20dB',
  comp_ratio: 4,
  comp_attack: 5,
  comp_release: 50,
  limiter_limit: '-1dB',

  // Stage 5-6: Mix
  bgm_target_lufs: -44.0,
  bgm_fade_in: 3.0,
  bgm_fade_out: 3.0,

  // Stage 7: Endscene
  endscene_crossfade: 2.0,

  // Silence Trimming（無音カット）
  silence_trim_enabled: false,         // デフォルトOFF
  silence_threshold_db: -35,           // -35dB以下を無音とみなす
  silence_min_duration: 2.0,           // 2秒以上の無音をカット対象
  silence_target_duration: 0.5,        // カット後は0.5秒に詰める

  // Stage 8: Export
  mp3_bitrate: '192k',
  output_format: 'mp3',
};
