import { ProcessConfig } from './pipeline/types';

export const DEFAULT_CONFIG: ProcessConfig = {
  // Stage 1: Trim
  pre_clap_margin: 0.5,
  post_clap_cut: 1.0,  // クラップの1秒後からカット（クラップ音を除去）
  clap_threshold_db: -10.0,

  // Stage 2: Denoise
  denoise_enabled: true,
  noise_gate_threshold: -40.0,

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
  bgm_volume_db: -30.0,
  bgm_fade_in: 3.0,
  bgm_fade_out: 3.0,

  // Stage 7: Endscene
  endscene_crossfade: 2.0,

  // Stage 8: Export
  mp3_bitrate: '192k',
  output_format: 'mp3',
};
