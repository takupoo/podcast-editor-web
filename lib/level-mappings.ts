/**
 * 5段階パラメータマッピング
 * Level 3 = 推奨デフォルト値
 */

export type LevelValue = 1 | 2 | 3 | 4 | 5;

export interface LevelMapping {
  configKey: string;
  levels: [number, number, number, number, number];
  unit: string;
  /** ラベル方向: 'stronger' = L1弱→L5強, 'quieter' = L1静→L5大 など */
  direction: 'stronger' | 'quieter-to-louder' | 'sensitive';
}

export const LEVEL_MAPPINGS: Record<string, LevelMapping> = {
  noise_gate_threshold: {
    configKey: 'noise_gate_threshold',
    // L1: 弱い除去 → L5: 強い除去（より低い閾値 = より多くのノイズ除去）
    levels: [-35, -40, -50, -55, -60],
    unit: 'dB',
    direction: 'stronger',
  },
  target_lufs: {
    configKey: 'target_lufs',
    // L1: 静か → L5: 大きい
    levels: [-19, -18, -16, -15, -14],
    unit: 'LUFS',
    direction: 'quieter-to-louder',
  },
  comp_ratio: {
    configKey: 'comp_ratio',
    // L1: 軽い圧縮 → L5: 強い圧縮
    levels: [2, 3, 4, 6, 8],
    unit: ':1',
    direction: 'stronger',
  },
  silence_threshold_db: {
    configKey: 'silence_threshold_db',
    // L1: 控えめ（静かな音だけ無音扱い）→ L5: 積極的
    levels: [-45, -40, -35, -30, -25],
    unit: 'dB',
    direction: 'stronger',
  },
  silence_min_duration: {
    configKey: 'silence_min_duration',
    // L1: 控えめ（長い無音のみカット）→ L5: 積極的（短い無音もカット）
    levels: [5.0, 3.0, 2.0, 1.5, 1.0],
    unit: 's',
    direction: 'stronger',
  },
  bgm_target_lufs: {
    configKey: 'bgm_target_lufs',
    // L1: とても静か → L5: はっきり
    levels: [-52, -48, -44, -40, -36],
    unit: 'LUFS',
    direction: 'quieter-to-louder',
  },
  clap_threshold_db: {
    configKey: 'clap_threshold_db',
    // L1: 低感度（大きいクラップのみ）→ L5: 高感度（小さいクラップも検出）
    levels: [-6, -8, -10, -14, -18],
    unit: 'dB',
    direction: 'sensitive',
  },
};

/** 実数値を最近接レベルに変換 */
export function numericToLevel(configKey: string, value: number): LevelValue {
  const mapping = LEVEL_MAPPINGS[configKey];
  if (!mapping) return 3;

  // 完全一致チェック
  const idx = mapping.levels.indexOf(value);
  if (idx !== -1) return (idx + 1) as LevelValue;

  // 最近接レベルを探す
  let closest = 0;
  let minDist = Infinity;
  for (let i = 0; i < 5; i++) {
    const dist = Math.abs(mapping.levels[i] - value);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return (closest + 1) as LevelValue;
}

/** レベルを実数値に変換 */
export function levelToNumeric(configKey: string, level: LevelValue): number {
  const mapping = LEVEL_MAPPINGS[configKey];
  if (!mapping) return 0;
  return mapping.levels[level - 1];
}

/** 現在の値がいずれかのレベルに完全一致するかチェック */
export function isExactLevel(configKey: string, value: number): boolean {
  const mapping = LEVEL_MAPPINGS[configKey];
  if (!mapping) return false;
  return mapping.levels.includes(value);
}
