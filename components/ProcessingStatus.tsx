'use client';

import { ProcessProgress } from '@/lib/pipeline/types';

interface ProcessingStatusProps {
  progress: ProcessProgress;
}

const stageNames: Record<string, string> = {
  loading: 'ロード中',
  trim: 'トリム',
  denoise: 'ノイズ除去',
  loudness: 'ラウドネス正規化',
  dynamics: 'ダイナミクス処理',
  mix: 'ミックス',
  silence: '無音カット',
  bgm: 'BGM追加',
  endscene: 'エンドシーン追加',
  export: 'エクスポート',
  complete: '完了',
  error: 'エラー',
};

export function ProcessingStatus({ progress }: ProcessingStatusProps) {
  const stageName = stageNames[progress.stage] || progress.stage;

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{stageName}</span>
          <span className="text-sm font-semibold text-blue-600">
            {Math.round(progress.percent)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              progress.stage === 'error'
                ? 'bg-red-600'
                : progress.stage === 'complete'
                ? 'bg-green-600'
                : 'bg-blue-600'
            }`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
      {progress.message && (
        <p className="text-sm text-gray-600 text-center">{progress.message}</p>
      )}
    </div>
  );
}
