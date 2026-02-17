'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FileUploader } from '@/components/FileUploader';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultDownload } from '@/components/ResultDownload';
import { useAppStore } from '@/lib/store';

// SSR時にlocalStorageからの初期値とサーバー側のデフォルト値が異なるため
// Hydrationエラーを防ぐためSSRを無効化
const ConfigPanel = dynamic(
  () => import('@/components/ConfigPanel').then((m) => ({ default: m.ConfigPanel })),
  { ssr: false }
);
import { processPodcast } from '@/lib/pipeline/processor';
import { ProcessProgress } from '@/lib/pipeline/types';

export default function Home() {
  const { config, fileA, fileB, setFileA, setFileB } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // マウント後にのみZustandのpersistedな値を使う（Hydration対策）
  useEffect(() => setMounted(true), []);

  // 通知許可をリクエスト
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // ブラウザ通知を送信
  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  };

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

      // 処理完了通知
      sendNotification(
        '処理完了！',
        'ポッドキャストの編集が完了しました。ダウンロードできます。'
      );
    } catch (error) {
      console.error('処理エラー:', error);
      setProgress({
        stage: 'error',
        percent: 0,
        message: `エラーが発生しました: ${error}`,
      });

      // エラー通知
      sendNotification(
        '処理エラー',
        'ポッドキャストの編集中にエラーが発生しました。'
      );
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

        {/* 詳細設定 */}
        <div className="mb-8">
          <ConfigPanel />
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
            {processing
              ? '処理中...'
              : (mounted && config.preview_mode)
                ? `プレビュー処理（最初の${config.preview_duration}秒）`
                : '処理開始'}
          </button>
          {!fileA || !fileB ? (
            <p className="text-sm text-gray-500 mt-2">
              両方のファイルを選択してください
            </p>
          ) : null}
          {notificationPermission === 'granted' && (
            <p className="text-xs text-green-600 mt-2">
              🔔 処理完了時にブラウザ通知します
            </p>
          )}
          {notificationPermission === 'denied' && (
            <p className="text-xs text-gray-500 mt-2">
              通知が無効です（ブラウザ設定で有効にできます）
            </p>
          )}
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
            <ResultDownload
              blob={result}
              filename={result.type === 'audio/wav' ? 'podcast_output.wav' : 'podcast_output.mp3'}
            />
          </div>
        )}

        {/* フッター情報 */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-3">処理内容</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ クラップ検出・同期（録音開始時の手拍子で2トラックを自動同期）</li>
            <li>✓ ノイズ除去（FFT/NLMeansベース、ホワイトノイズに効果的）</li>
            <li>✓ ラウドネス正規化（-16 LUFS）</li>
            <li>✓ ダイナミクス処理（コンプレッサー + リミッター）</li>
            <li>✓ ステレオミックス</li>
            <li>✓ BGM追加（オプション、自動ループ・フェード）</li>
            <li>✓ エンドシーン追加（オプション、クロスフェード）</li>
            <li>✓ MP3/WAVエンコード（ビットレート調整可能）</li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            Week 3版: FFT/NLMeansノイズ除去実装。全パラメータ調整可能
          </p>
        </div>
      </div>
    </div>
  );
}
