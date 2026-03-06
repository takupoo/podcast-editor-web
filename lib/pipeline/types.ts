/**
 * 処理パイプラインの型定義
 */

export interface CutRegion {
  id: string;
  startTime: number;  // 秒（生ファイル基準）
  endTime: number;
}

export interface ProcessConfig {
  // Preview Mode
  preview_mode: boolean;         // プレビューモード（最初のN秒のみ処理）
  preview_duration: number;      // プレビュー時の処理時間（秒）

  // Stage 1: Trim
  pre_clap_margin: number;      // クラップ前の余白（秒）
  post_clap_cut: number;         // 0=クラップ残す, >0=クラップ後N秒からカット
  clap_threshold_db: number;     // クラップ検出閾値（dB）

  // Stage 2: Denoise
  denoise_enabled: boolean;
  denoise_method: 'none' | 'afftdn' | 'anlmdn' | 'spectral' | 'rnnoise'; // ノイズ除去方式
  noise_gate_threshold: number;  // ノイズフロア閾値（dB）

  // Stage 3: Loudness
  loudness_enabled: boolean;     // ラウドネス正規化 ON/OFF
  target_lufs: number;           // -16.0 LUFS（ポッドキャスト標準）
  true_peak: number;             // -1.5 dBTP
  lra: number;                   // 11.0 LU

  // Stage 4: Dynamics
  dynamics_enabled: boolean;     // ダイナミクス処理全体 ON/OFF
  comp_threshold: string;        // '-20dB'
  comp_ratio: number;            // 4:1
  comp_attack: number;           // ms
  comp_release: number;          // ms
  comp_knee: number;             // knee (dB)
  limiter_limit: string;         // '-1dB'

  // dynaudnorm
  dynaudnorm_enabled: boolean;   // dynaudnorm 単体 ON/OFF
  dynaudnorm_framelen: number;   // フレーム長 (ms)
  dynaudnorm_gausssize: number;  // ガウス窓サイズ（奇数）
  dynaudnorm_peak: number;       // ターゲットピーク (0-1)
  dynaudnorm_maxgain: number;    // 最大ゲイン (dB)

  // Stage 5-6: Mix
  bgm?: string | File;           // BGMファイルパスまたはFileオブジェクト（非永続化）
  bgm_filename?: string;         // BGMファイル名（永続化・共有URL用）
  bgm_url?: string;              // BGM URL（URL入力方式で永続化）
  bgm_target_lufs: number;       // -44.0 LUFS（絶対音量）
  bgm_fade_in: number;           // 3.0秒
  bgm_fade_out: number;          // 3.0秒

  // Stage 7: Endscene
  endscene?: string | File;      // エンドシーンファイル（非永続化）
  endscene_filename?: string;    // エンドシーンファイル名（永続化・共有URL用）
  endscene_url?: string;         // エンドシーン URL（URL入力方式で永続化）
  endscene_crossfade: number;    // 2.0秒

  // Silence Trimming（無音カット）
  silence_trim_enabled: boolean;       // 無音カット有効/無効
  silence_threshold_db: number;        // 無音判定の閾値（dB）例: -35dB
  silence_min_duration: number;        // この秒数以上の無音をカット対象にする（秒）
  silence_target_duration: number;     // カット後の無音の長さ（秒）例: 0.5

  // Manual Cut（手動カット）
  cut_regions: CutRegion[];            // 手動カット区間リスト

  // Stage 8: Export
  mp3_bitrate: string;           // '192k'
  output_format: 'mp3' | 'wav';
}

export interface ProcessProgress {
  stage: ProcessStage;
  percent: number;
  message?: string;
}

export type ProcessStage =
  | 'loading'
  | 'trim'
  | 'cut'
  | 'denoise'
  | 'loudness'
  | 'dynamics'
  | 'processing'  // 統合処理（Denoise + Loudness + Dynamics）
  | 'mix'
  | 'silence'
  | 'bgm'
  | 'endscene'
  | 'export'
  | 'complete'
  | 'error';

export interface TrimResult {
  cutA: number;  // 秒単位
  cutB: number;  // 秒単位
}

export interface LoudnessStats {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  output_i: string;
  output_tp: string;
  output_lra: string;
  output_thresh: string;
  normalization_type: string;
  target_offset: string;
}
