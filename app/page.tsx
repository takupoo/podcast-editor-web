'use client';

import { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultDownload } from '@/components/ResultDownload';
import { useAppStore } from '@/lib/store';
import { processPodcast } from '@/lib/pipeline/processor';
import { ProcessProgress } from '@/lib/pipeline/types';

export default function Home() {
  const { config, fileA, fileB, setFileA, setFileB } = useAppStore();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const handleProcess = async () => {
    if (!fileA || !fileB) return;

    setProcessing(true);
    setResult(null);
    setProgress(null);

    try {
      const output = await processPodcast(fileA, fileB, config, (p) => {
        setProgress(p);
      });
      setResult(output);
    } catch (error) {
      console.error('処理エラー:', error);
      setProgress({
        stage: 'error',
        percent: 0,
        message: `エラーが発生しました: ${error}`,
      });
    } finally {
      setProcessing(false);
    }
  };

  const canProcess = fileA && fileB && !processing;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Podcast Processor
          </h1>
          <p className="text-lg text-gray-600">
            2人の音声ファイルを自動でミックス・編集
          </p>
          <p className="text-sm text-gray-500 mt-2">
            ブラウザ内で完結（サーバー不要・完全無料）
          </p>
        </div>

        {/* ファイルアップロード */}
        <div className="mb-8">
          <FileUploader
            fileA={fileA}
            fileB={fileB}
            onFileAChange={setFileA}
            onFileBChange={setFileB}
          />
        </div>

        {/* 処理ボタン */}
        <div className="text-center mb-8">
          <button
            onClick={handleProcess}
            disabled={!canProcess}
            className={`
              px-8 py-4 rounded-lg font-semibold text-white text-lg
              transition-all
              ${
                canProcess
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 cursor-not-allowed'
              }
            `}
          >
            {processing ? '処理中...' : '処理開始'}
          </button>
          {!fileA || !fileB ? (
            <p className="text-sm text-gray-500 mt-2">
              両方のファイルを選択してください
            </p>
          ) : null}
        </div>

        {/* 処理進捗 */}
        {progress && !result && (
          <div className="mb-8">
            <ProcessingStatus progress={progress} />
          </div>
        )}

        {/* 結果ダウンロード */}
        {result && (
          <div className="mb-8">
            <ResultDownload blob={result} />
          </div>
        )}

        {/* フッター情報 */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-3">処理内容</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ ラウドネス正規化（-16 LUFS）</li>
            <li>✓ ダイナミクス処理（コンプレッサー + リミッター）</li>
            <li>✓ ステレオミックス</li>
            <li>✓ MP3エンコード（192kbps）</li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            Week 1版: Trim（クラップ検出）とDenoiseは後日実装予定
          </p>
        </div>
      </div>
    </div>
  );
}
