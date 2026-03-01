'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FileUploader } from '@/components/FileUploader';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultDownload } from '@/components/ResultDownload';
import { useAppStore } from '@/lib/store';
import { processPodcast } from '@/lib/pipeline/processor';
import { ProcessProgress } from '@/lib/pipeline/types';
import { CutEditor } from '@/components/CutEditor';

// SSR時のHydrationエラーを防ぐためSSRを無効化
import type { ConfigSection } from '@/components/ConfigPanel';
const ConfigPanel = dynamic<{ activeSection: ConfigSection }>(
  () => import('@/components/ConfigPanel').then((m) => ({ default: m.ConfigPanel })),
  { ssr: false }
);

// ── Section types ─────────────────────────────────────────────
type SectionId =
  | 'source'
  | 'trim'
  | 'cut'
  | 'processing'
  | 'silence'
  | 'mix'
  | 'export';

interface NavItem {
  id: SectionId;
  label: string;
  dot: (config: ReturnType<typeof useAppStore.getState>['config']) => 'on' | 'off' | null;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '編集',
    items: [
      { id: 'trim',       label: '同期',              dot: () => 'on' },
      { id: 'cut',        label: '手動カット',         dot: (c) => c.cut_regions.length > 0 ? 'on' : null },
      { id: 'processing', label: '音声加工',           dot: (c) => c.denoise_enabled ? 'on' : 'off' },
      { id: 'silence',    label: '無音カット',         dot: (c) => c.silence_trim_enabled ? 'on' : 'off' },
      { id: 'mix',        label: 'BGM / エンディング', dot: (c) => (c.bgm_filename || c.endscene_filename) ? 'on' : 'off' },
    ],
  },
  {
    label: '出力',
    items: [
      { id: 'export', label: 'エクスポート', dot: () => null },
    ],
  },
];

// ── Stage icon as SVG string component ────────────────────────
function NavIcon({ id }: { id: SectionId }) {
  const cls = 'w-3.5 h-3.5';
  switch (id) {
    case 'source':
      return <svg className={cls} viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1zM9 2l3 3H9V2zm3 11H4V2h4v4h4v7z"/></svg>;
    case 'trim':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M4 5h8M4 11h8M2 8h12"/></svg>;
    case 'cut':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="5" cy="4" r="2"/><circle cx="5" cy="12" r="2"/><path d="M13 3L6.5 10.5M6.5 5.5L13 13"/></svg>;
    case 'processing':
      return <svg className={cls} viewBox="0 0 16 16" fill="currentColor"><path d="M2 5h2v6H2V5zm3-2h2v10H5V3zm3 2h2v6H8V5zm3-3h2v12h-2V2z" opacity=".75"/></svg>;
    case 'silence':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 8h3M11 8h3M8 4v2M8 10v2"/></svg>;
    case 'mix':
      return <svg className={cls} viewBox="0 0 16 16" fill="currentColor"><path d="M10 2v8.27A2.5 2.5 0 1 1 8 8V5L4 6V3l6-1z"/></svg>;
    case 'export':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M8 2v9M4 8l4 4 4-4M2 13h12"/></svg>;
  }
}

// ── How to use modal ──────────────────────────────────────────
function HowToUseModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const steps = [
    {
      num: '1',
      title: '音声ファイルをアップロード',
      desc: '話者A・Bの音声ファイル（MP3 / WAV / M4A）を2つドラッグ＆ドロップ、またはクリックして選択します。',
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1zM9 2l3 3H9V2zm3 11H4V2h4v4h4v7z"/></svg>,
    },
    {
      num: '2',
      title: '同期（クラップ検出）',
      desc: '収録開始時の手拍子（クラップ）を自動検出し、2つの音声トラックの開始位置を揃えます。',
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M4 5h8M4 11h8M2 8h12"/></svg>,
    },
    {
      num: '3',
      title: '手動カット（任意）',
      desc: 'タイムライン上で不要な部分をマークして削除できます。再生しながらイン／アウト点を設定します。',
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="5" cy="4" r="2"/><circle cx="5" cy="12" r="2"/><path d="M13 3L6.5 10.5M6.5 5.5L13 13"/></svg>,
    },
    {
      num: '4',
      title: '音声加工',
      desc: 'ノイズ除去、ラウドネス正規化（-16 LUFS）、ダイナミクス処理（コンプレッサー＋リミッター）を設定します。',
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="currentColor"><path d="M2 5h2v6H2V5zm3-2h2v10H5V3zm3 2h2v6H8V5zm3-3h2v12h-2V2z" opacity=".75"/></svg>,
    },
    {
      num: '5',
      title: '無音カット・BGM追加（任意）',
      desc: '長い無音部分を自動で短縮したり、BGMやエンディング音声をミックスできます。',
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="currentColor"><path d="M10 2v8.27A2.5 2.5 0 1 1 8 8V5L4 6V3l6-1z"/></svg>,
    },
    {
      num: '6',
      title: '処理実行 & ダウンロード',
      desc: '「処理実行」ボタンをクリックすると、すべての処理がブラウザ内で実行されます。完了後、結果をダウンロードできます。',
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M8 2v9M4 8l4 4 4-4M2 13h12"/></svg>,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: 520,
          maxHeight: 'calc(100dvh - 80px)',
          margin: '0 20px',
          background: 'rgba(28, 28, 36, 0.95)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px' }}>
              使い方ガイド
            </h2>
            <p style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 3 }}>
              Spectratrek でポッドキャストを編集する手順
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'var(--tg-t2)', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div style={{ overflowY: 'auto', padding: '16px 24px 24px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map((step, i) => (
              <div
                key={step.num}
                style={{
                  display: 'flex', gap: 14, padding: '14px 0',
                  borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(10,132,255,0.12)',
                  border: '1px solid rgba(10,132,255,0.2)',
                  color: 'var(--tg-accent)',
                }}>
                  {step.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: 'var(--tg-accent)',
                      background: 'rgba(10,132,255,0.15)',
                      borderRadius: 6, padding: '1px 7px',
                      lineHeight: '18px',
                    }}>
                      STEP {step.num}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-t1)' }}>
                      {step.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 5, lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ marginTop: 16 }} className="tg-notice">
            <svg style={{ width: 14, height: 14, color: 'var(--tg-accent)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.5 3.5h1V9h-1V4.5zm.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/></svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--tg-t1)', fontSize: 12 }}>Tips</span>
              <span>まず「プレビュー」モードで短い時間だけ試聴してから、「フル処理」で本番実行するのがおすすめです。</span>
              <span>すべての処理はブラウザ内で完結するため、音声データがサーバーに送信されることはありません。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function Home() {
  const { config, files, setFiles, removeFile, resetConfig } = useAppStore();
  const [mounted, setMounted]       = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('source');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]     = useState<ProcessProgress | null>(null);
  const [result, setResult]         = useState<Blob | null>(null);

  const [notifPerm, setNotifPerm]   = useState<NotificationPermission>('default');
  const [showHelp, setShowHelp]     = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPerm(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => setNotifPerm(p));
      }
    }
  }, []);

  const notify = (title: string, body: string) => {
    console.log('notify called:', { title, body, permission: Notification.permission });
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'podcast-processor',
          });
          console.log('Notification created:', notification);
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      } else {
        console.log('Notification permission not granted:', Notification.permission);
      }
    } else {
      console.log('Notification API not supported');
    }
  };

  const handleProcess = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setResult(null);
    setProgress(null);
    try {
      const output = await processPodcast(files[0], files[1], config, p => setProgress(p));
      setResult(output);
      setActiveSection('source'); // 処理完了時に「音声ファイル」セクションに戻る
      notify('処理完了！', 'ポッドキャストの編集が完了しました。');
    } catch (error) {
      setProgress({ stage: 'error', percent: 0, message: `エラーが発生しました: ${error}` });
      notify('処理エラー', 'ポッドキャストの編集中にエラーが発生しました。');
    } finally {
      setProcessing(false);
    }
  };


  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.type === 'audio/wav' ? 'podcast_output.wav' : 'podcast_output.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canProcess = files.length >= 2 && !processing;

  const processLabel = processing
    ? '処理中...'
    : (mounted && config.preview_mode)
      ? `プレビュー（${config.preview_duration}秒）`
      : '処理実行';

  const statusText = processing
    ? (progress?.message ?? '処理中...')
    : result
      ? '処理完了'
      : files.length >= 2
        ? '処理準備完了'
        : '準備完了';

  const fileInfoText = files.length > 0
    ? files.map(f => f.name).join('  ·  ')
    : 'ファイル未選択';

  // ── Sidebar nav sections ────────────────────────────────────

  const navigate = (id: SectionId) => setActiveSection(id);

  // ── Render panel content ────────────────────────────────────
  const renderPanel = () => {
    switch (activeSection) {
      case 'source':
        return (
          <div className="p-6 flex flex-col gap-5">
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px' }}>音声ファイル</h2>
              <p style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 2 }}>処理対象の音声ファイルを選択（話者A・B）</p>
            </div>
            <FileUploader files={files} onFilesChange={setFiles} onRemoveFile={removeFile} />
            <div className="tg-notice">
              <svg style={{ width: 14, height: 14, color: 'var(--tg-accent)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.5 3.5h1V9h-1V4.5zm.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/></svg>
              <span>すべての処理はブラウザ内で完結します。ファイルはサーバーに送信されません。</span>
            </div>
            {(progress || result) && (
              <div className="flex flex-col gap-4 mt-2">
                {progress && !result && <ProcessingStatus progress={progress} />}
                {result && (
                  <ResultDownload
                    blob={result}
                    filename={result.type === 'audio/wav' ? 'podcast_output.wav' : 'podcast_output.mp3'}
                  />
                )}
              </div>
            )}
          </div>
        );
      case 'cut':
        return <CutEditor />;
      default:
        return (
          <ConfigPanel activeSection={activeSection} />
        );
    }
  };

  return (
    <div className="tg-root flex items-stretch justify-center min-h-dvh">
      {/* Main container */}
      <div
        className="tg-window flex flex-col w-full overflow-hidden"
        style={{ minHeight: '100dvh' }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div
          className="flex items-center px-6 shrink-0"
          style={{
            height: 56,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{
            fontSize: 16, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px',
          }}>
            Spectratrek
          </div>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              width: 26, height: 26, borderRadius: 8, marginLeft: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'var(--tg-t2)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.color = 'var(--tg-t1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'var(--tg-t2)';
            }}
            title="使い方ガイド"
          >
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm-.5-2h1v1h-1v-1zm.5-7a2.5 2.5 0 0 0-2.5 2.5h1.2A1.3 1.3 0 0 1 8 5.7c.7 0 1.3.6 1.3 1.3 0 .5-.3.9-.7 1.1-.6.3-1.1 1-1.1 1.7v.2h1.2v-.2c0-.4.2-.7.6-.9.7-.4 1.2-1.1 1.2-1.9A2.5 2.5 0 0 0 8 4.5z"/>
            </svg>
          </button>
        </div>

        {/* ── Toolbar ───────────────────────────────────────── */}
        <div
          className="flex items-center px-6 gap-3 shrink-0"
          style={{
            height: 52,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {/* Segmented preview/full */}
          {mounted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="tg-seg">
                <button
                  className={`tg-seg-btn${!config.preview_mode ? ' active' : ''}`}
                  onClick={() => useAppStore.getState().updateConfig({ preview_mode: false })}
                >
                  フル処理
                </button>
                <button
                  className={`tg-seg-btn${config.preview_mode ? ' active' : ''}`}
                  onClick={() => useAppStore.getState().updateConfig({ preview_mode: true })}
                >
                  プレビュー
                </button>
              </div>
              {config.preview_mode && (
                <select
                  value={config.preview_duration}
                  onChange={e => useAppStore.getState().updateConfig({ preview_duration: Number(e.target.value) })}
                  style={{
                    fontSize: 11, color: 'var(--tg-t1)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 5, padding: '3px 6px',
                    cursor: 'pointer',
                  }}
                >
                  {[10, 15, 20, 30, 45, 60].map(v => (
                    <option key={v} value={v}>{v}秒</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* File badge */}
          {files.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: 100,
              fontSize: 12, color: 'var(--tg-t1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
              maxWidth: 240, overflow: 'hidden',
            }}>
              <svg style={{ width: 12, height: 12, color: 'var(--tg-t3)', flexShrink: 0 }} viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1zM9 2l3 3H9V2zm3 11H4V2h4v4h4v7z"/></svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {files.length}個のファイル
              </span>
            </div>
          )}

          {/* Reset */}
          <button className="tg-btn" onClick={resetConfig}>
            <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5H12a4 4 0 1 1-4-4V2.5zm1.5 0V6h3.5L9.5 2.5z"/></svg>
            リセット
          </button>

          {/* Process */}
          <button
            className="tg-btn tg-btn-primary"
            onClick={handleProcess}
            disabled={!canProcess}
          >
            <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="currentColor"><path d="M6 3.5l7 4.5-7 4.5V3.5z"/></svg>
            {processLabel}
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <aside
            className="tg-sidebar shrink-0 flex flex-col py-2"
            style={{ width: 220, overflowY: 'auto' }}
          >
            {/* Source */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tg-t3)', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '8px 16px 3px' }}>ソース</div>
            <button
              className={`tg-nav${activeSection === 'source' ? ' active' : ''}`}
              onClick={() => navigate('source')}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: activeSection === 'source' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <NavIcon id="source" />
              </div>
              <span style={{ fontSize: 13, color: activeSection === 'source' ? 'var(--tg-t1)' : 'var(--tg-t2)' }}>音声ファイル</span>
              {files.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tg-t3)' }}>
                  {files.length}
                </span>
              )}
            </button>

            {NAV_GROUPS.map(group => {
              const dotStates = group.items.map(item => item.dot(config));
              return (
                <div key={group.label}>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tg-t3)', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '8px 16px 3px' }}>{group.label}</div>
                  {group.items.map((item, i) => {
                    const dot = dotStates[i];
                    return (
                      <button
                        key={item.id}
                        className={`tg-nav${activeSection === item.id ? ' active' : ''}`}
                        onClick={() => navigate(item.id)}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: activeSection === item.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
                          <NavIcon id={item.id} />
                        </div>
                        <span style={{ fontSize: 13, color: activeSection === item.id ? 'var(--tg-t1)' : 'var(--tg-t2)', flex: 1, textAlign: 'left' }}>{item.label}</span>
                        {dot !== null && (
                          <div className={`tg-dot ${dot === 'on' ? 'tg-dot-on' : 'tg-dot-off'}`} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </aside>

          {/* Main panel */}
          <main
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            {renderPanel()}
          </main>
        </div>

        {/* ── Status bar ────────────────────────────────────── */}
        <div
          className="flex items-center px-4 gap-3 shrink-0"
          style={{
            height: processing ? 32 : 24,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.15)',
            transition: 'height 0.2s',
          }}
        >
          {!processing ? (
            <>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: result ? 'var(--tg-green)' : 'var(--tg-green)',
                boxShadow: result ? '0 0 6px rgba(48,209,88,.5)' : '0 0 6px rgba(48,209,88,.3)',
              }} />
              <span style={{ fontSize: 11, color: 'var(--tg-t2)' }}>{statusText}</span>
              {result && (
                <button
                  onClick={handleDownload}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--tg-green)',
                    background: 'rgba(48,209,88,0.15)',
                    border: '1px solid rgba(48,209,88,0.3)',
                    borderRadius: 6,
                    padding: '3px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(48,209,88,0.25)';
                    e.currentTarget.style.borderColor = 'rgba(48,209,88,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(48,209,88,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(48,209,88,0.3)';
                  }}
                >
                  <svg style={{ width: 11, height: 11 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M8 2v9M4 8l4 4 4-4M2 13h12"/>
                  </svg>
                  ダウンロード
                </button>
              )}
              {notifPerm === 'granted' && !result && (
                <span style={{ fontSize: 11, color: 'var(--tg-green)', marginLeft: 'auto' }}>🔔 完了時に通知</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--tg-t3)', marginLeft: (notifPerm === 'granted' && !result) ? 0 : 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{fileInfoText}</span>
            </>
          ) : (
            <>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--tg-accent)',
                boxShadow: '0 0 6px rgba(10,132,255,.5)',
              }} />
              <span style={{ fontSize: 11, color: 'var(--tg-t1)', fontWeight: 500 }}>{progress?.stage || '処理中'}</span>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', maxWidth: 200 }}>
                <div style={{
                  height: '100%',
                  width: `${progress?.percent || 0}%`,
                  background: 'linear-gradient(90deg, var(--tg-accent), var(--tg-green))',
                  borderRadius: 2,
                  transition: 'width 0.3s ease-out',
                  boxShadow: '0 0 8px rgba(10,132,255,0.4)',
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--tg-accent)', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                {progress?.percent || 0}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--tg-t3)', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {progress?.message || '処理中...'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Help modal */}
      {showHelp && <HowToUseModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
