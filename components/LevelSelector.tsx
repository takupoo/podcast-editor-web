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
  /** カスタムラベル配列 (5要素)。省略時は i18n の汎用ラベルを使用 */
  labels?: [string, string, string, string, string];
}

export function LevelSelector({ configKey, value, onChange, labels }: LevelSelectorProps) {
  const { t } = useTranslation();
  const mapping = LEVEL_MAPPINGS[configKey];
  if (!mapping) return null;

  const currentLevel = numericToLevel(configKey, value);
  const isCustom = !isExactLevel(configKey, value);

  const defaultLabels: [string, string, string, string, string] = [
    t('levels.l1'),
    t('levels.l2'),
    t('levels.l3'),
    t('levels.l4'),
    t('levels.l5'),
  ];
  const displayLabels = labels ?? defaultLabels;

  const handleClick = (level: LevelValue) => {
    onChange(levelToNumeric(configKey, level));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="tg-level-seg">
        {([1, 2, 3, 4, 5] as LevelValue[]).map((level) => (
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
            {displayLabels[level - 1]}
          </button>
        ))}
      </div>
      <div style={{
        fontSize: 10,
        color: 'var(--tg-t3)',
        textAlign: 'right',
        fontFamily: 'var(--font-mono, monospace)',
        paddingRight: 2,
      }}>
        {isCustom ? (
          <span style={{ color: 'var(--tg-orange)' }}>
            {t('levels.custom')}: {value} {mapping.unit}
          </span>
        ) : (
          <span>{value} {mapping.unit}</span>
        )}
      </div>
    </div>
  );
}
