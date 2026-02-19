'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FileUploader } from '@/components/FileUploader';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultDownload } from '@/components/ResultDownload';
import { useAppStore } from '@/lib/store';
import { processPodcast } from '@/lib/pipeline/processor';
import { ProcessProgress } from '@/lib/pipeline/types';

// SSR時のHydrationエラーを防ぐためSSRを無効化
import type { ConfigSection } from '@/components/ConfigPanel';
const ConfigPanel = dynamic<{ activeSection: ConfigSection }>(
  () => import('@/components/ConfigPanel').then((m) => ({ default: m.ConfigPanel })),
  { ssr: false }
);

// ── Section types ─────────────────────────────────────────────
type SectionId =
  | 'source'
  | 'overview'
  | 'preview'
  | 'trim'
  | 'processing'
  | 'silence'
  | 'mix'
  | 'export';

interface NavSection {
  id: SectionId;
  label: string;
  dot?: 'on' | 'off' | 'none';
}

const STAGES: NavSection[] = [
  { id: 'overview',    label: '概要',              dot: 'none' },
  { id: 'preview',     label: '🚀 プレビュー',     dot: 'none' },
  { id: 'trim',        label: '1. トリム',          dot: 'on'   },
  { id: 'processing',  label: '2–4. 音声処理',     dot: 'on'   },
  { id: 'silence',     label: '5. 無音カット',      dot: 'off'  },
  { id: 'mix',         label: '6. BGM・エンドシーン', dot: 'on' },
  { id: 'export',      label: '7. エクスポート',   dot: 'none' },
];

// ── Stage icon as SVG string component ────────────────────────
function NavIcon({ id }: { id: SectionId }) {
  const cls = 'w-3.5 h-3.5';
  switch (id) {
    case 'source':
      return <svg className={cls} viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1zM9 2l3 3H9V2zm3 11H4V2h4v4h4v7z"/></svg>;
    case 'overview':
      return <svg className={cls} viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1.5H2V3zm0 4h12v1.5H2V7zm0 4h8v1.5H2V11z"/></svg>;
    case 'preview':
      return <svg className={cls} viewBox="0 0 16 16" fill="currentColor"><path d="M6 3.5l7 4.5-7 4.5V3.5z"/></svg>;
    case 'trim':
      return <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M4 5h8M4 11h8M2 8h12"/></svg>;
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

// ── Overview pipeline summary ──────────────────────────────────
function OverviewPanel({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const { config } = useAppStore();
  const items = [
    { id: 'trim' as SectionId,       label: 'トリム',              desc: 'クラップ検出・前後カット',                          on: true  },
    { id: 'processing' as SectionId, label: 'ノイズ除去',          desc: `Spectral モード · ${config.noise_gate_threshold} dB`,   on: config.denoise_enabled },
    { id: 'processing' as SectionId, label: 'ラウドネス正規化',    desc: `目標 ${config.target_lufs} LUFS · EBU R128`,            on: true  },
    { id: 'processing' as SectionId, label: 'ダイナミクス',        desc: `コンプレッサー ${config.comp_ratio}:1`,                  on: true  },
    { id: 'mix' as SectionId,        label: 'BGM',                 desc: config.bgm_filename ? `${config.bgm_filename} · ${config.bgm_target_lufs} LUFS` : 'ファイル未設定', on: !!config.bgm_filename },
    { id: 'mix' as SectionId,        label: 'エンドシーン',        desc: config.endscene_filename ?? 'ファイル未設定',             on: !!config.endscene_filename },
    { id: 'silence' as SectionId,    label: '無音カット',          desc: `${config.silence_min_duration}秒以上 → ${config.silence_target_duration}秒に短縮`, on: config.silence_trim_enabled },
  ];
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="mb-1">
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.35px' }}>処理パイプライン</h2>
        <p style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 2 }}>ステージをクリックして詳細設定を開く</p>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => onNavigate(item.id)}
            className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors duration-100"
            style={{ ':hover': { background: 'rgba(255,255,255,0.05)' } } as React.CSSProperties}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.11)',
              fontSize: 11, fontWeight: 700, color: 'var(--tg-t2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--tg-t1)', fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 1 }}>{item.desc}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 9px', borderRadius: 100,
                background: item.on ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.06)',
                color: item.on ? 'var(--tg-green)' : 'var(--tg-t3)',
                border: `1px solid ${item.on ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.09)'}`,
              }}>
                {item.on ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        ))}
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
  const [copied, setCopied]         = useState(false);
  const [notifPerm, setNotifPerm]   = useState<NotificationPermission>('default');

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

  const handleShareConfig = async () => {
    const { generateShareUrl } = await import('@/lib/config-url');
    const url = generateShareUrl(config);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { alert('URLのコピーに失敗しました'); }
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
  const SOURCE_NAV: NavSection = { id: 'source', label: '音声ファイル', dot: 'none' };

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
      case 'overview':
        return <OverviewPanel onNavigate={navigate} />;
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
            <div className="tg-seg">
              <button
                className={`tg-seg-btn${!config.preview_mode ? ' active' : ''}`}
                onClick={() => useAppStore.getState().updateConfig({ preview_mode: false })}
              >
                通常編集
              </button>
              <button
                className={`tg-seg-btn${config.preview_mode ? ' active' : ''}`}
                onClick={() => useAppStore.getState().updateConfig({ preview_mode: true })}
              >
                ショートプレビュー確認
              </button>
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

          {/* Share config */}
          <button className="tg-btn" onClick={handleShareConfig}>
            <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 8.5L9.5 5.5M6.5 5.5L9.5 8.5"/>
              <path d="M9 4H11C12.1 4 13 4.9 13 6V6C13 7.1 12.1 8 11 8H11"/>
              <path d="M7 8H5C3.9 8 3 8.9 3 10V10C3 11.1 3.9 12 5 12H7"/>
            </svg>
            {copied ? '✓ コピー済み' : 'URL'}
          </button>

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
              className={`tg-nav${activeSection === SOURCE_NAV.id ? ' active' : ''}`}
              onClick={() => navigate(SOURCE_NAV.id)}
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

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

            {/* Stages */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tg-t3)', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '8px 16px 3px' }}>処理ステージ</div>
            {STAGES.map(s => (
              <button
                key={s.id}
                className={`tg-nav${activeSection === s.id ? ' active' : ''}`}
                onClick={() => navigate(s.id)}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: activeSection === s.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <NavIcon id={s.id} />
                </div>
                <span style={{ fontSize: 13, color: activeSection === s.id ? 'var(--tg-t1)' : 'var(--tg-t2)', flex: 1, textAlign: 'left' }}>{s.label}</span>
                {s.dot !== 'none' && s.dot && (
                  <div className={`tg-dot ${s.dot === 'on' ? 'tg-dot-on' : 'tg-dot-off'}`} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                )}
              </button>
            ))}
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
    </div>
  );
}
