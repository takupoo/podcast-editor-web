'use client';

import { ProcessProgress } from '@/lib/pipeline/types';

const stageNames: Record<string, string> = {
  loading:   'ロード中',
  trim:      'トリム',
  denoise:   'ノイズ除去',
  loudness:  'ラウドネス正規化',
  dynamics:  'ダイナミクス処理',
  mix:       'ミックス',
  silence:   '無音カット',
  bgm:       'BGM追加',
  endscene:  'エンドシーン追加',
  export:    'エクスポート',
  complete:  '完了',
  error:     'エラー',
};

export function ProcessingStatus({ progress }: { progress: ProcessProgress }) {
  const stageName = stageNames[progress.stage] ?? progress.stage;
  const isError   = progress.stage === 'error';
  const isDone    = progress.stage === 'complete';

  const trackColor   = isError ? 'rgba(255,69,58,0.2)' : 'rgba(255,255,255,0.08)';
  const fillColor    = isError ? 'var(--tg-red)' : isDone ? 'var(--tg-green)' : 'var(--tg-accent)';
  const glowColor    = isError ? 'rgba(255,69,58,0.4)' : isDone ? 'rgba(48,209,88,0.4)' : 'rgba(10,132,255,0.4)';

  return (
    <div className="tg-grp" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tg-t1)' }}>{stageName}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: fillColor }}>
          {Math.round(progress.percent)}%
        </span>
      </div>
      {/* Track */}
      <div style={{ height: 4, background: trackColor, borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress.percent}%`,
            background: fillColor,
            borderRadius: 2,
            boxShadow: `0 0 8px ${glowColor}`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {progress.message && (
        <p style={{ fontSize: 11, color: 'var(--tg-t2)', marginTop: 8, textAlign: 'center' }}>
          {progress.message}
        </p>
      )}
    </div>
  );
}
