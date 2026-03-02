'use client';

import { LevelValue, LEVEL_MAPPINGS, numericToLevel, levelToNumeric, isExactLevel } from '@/lib/level-mappings';
import { useTranslation } from '@/lib/i18n';

interface LevelSelectorProps {
  /** LEVEL_MAPPINGS のキー名 */
  configKey: string;
  /** 現在の実数値 */
  value: number;
  /** 実数値で返すコールバック */
  onChange: (numericValue: number) => void;
  /** カスタムラベル配列 (5要素)。省略時は数値+単位を表示 */
  labels?: [string, string, string, string, string];
}

export function LevelSelector({ configKey, value, onChange, labels }: LevelSelectorProps) {
  const { t } = useTranslation();
  const mapping = LEVEL_MAPPINGS[configKey];
  if (!mapping) return null;

  const currentLevel = numericToLevel(configKey, value);
  const isCustom = !isExactLevel(configKey, value);

  const handleClick = (level: LevelValue) => {
    onChange(levelToNumeric(configKey, level));
  };

  /** 数値+単位のラベルを生成 */
  const formatValueLabel = (numericValue: number, unit: string): string => {
    if (unit === ':1') return `${numericValue}:1`;
    if (unit === 's') return `${numericValue}s`;
    return `${numericValue} ${unit}`;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="tg-level-seg">
        {([1, 2, 3, 4, 5] as LevelValue[]).map((level) => {
          const numVal = mapping.levels[level - 1];
          const displayLabel = labels
            ? labels[level - 1]
            : formatValueLabel(numVal, mapping.unit);

          return (
            <button
              key={level}
              type="button"
              className={[
                'tg-level-btn',
                currentLevel === level ? 'active' : '',
                level === 3 ? 'recommended' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleClick(level)}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>
      {isCustom && (
        <div style={{
          fontSize: 10,
          color: 'var(--tg-orange)',
          textAlign: 'right',
          fontFamily: 'var(--font-mono, monospace)',
          paddingRight: 2,
        }}>
          {t('levels.custom')}: {value} {mapping.unit}
        </div>
      )}
    </div>
  );
}
