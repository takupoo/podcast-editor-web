'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultDownload } from '@/components/ResultDownload';
import { useAppStore } from '@/lib/store';
import { processPodcast } from '@/lib/pipeline/processor';
import { ProcessProgress } from '@/lib/pipeline/types';
import { clearFileFromCache } from '@/lib/file-cache';
import { CutEditor } from '@/components/CutEditor';
import { PresetPopover } from '@/components/PresetPopover';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { AudioFileUploader } from '@/components/AudioFileUploader';
import { TrimSection, ProcessingSection, SilenceSection, MixParamsSection, ExportSection } from '@/components/ConfigPanel';
import { FileUploader } from '@/components/FileUploader';
import { useTranslation, useLocaleStore } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { OnboardingWizard, useOnboarding } from '@/components/OnboardingWizard';

// ── How to use modal ──────────────────────────────────────────
function HowToUseModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const mainSteps = [
    {
      num: '1',
      title: t('howToUse.mainStep1Title'),
      desc: t('howToUse.mainStep1Desc'),
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1zM9 2l3 3H9V2zm3 11H4V2h4v4h4v7z" /></svg>,
    },
    {
      num: '2',
      title: t('howToUse.mainStep2Title'),
      desc: t('howToUse.mainStep2Desc'),
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="currentColor"><path d="M10 2v8.27A2.5 2.5 0 1 1 8 8V5L4 6V3l6-1z" /></svg>,
    },
    {
      num: '3',
      title: t('howToUse.mainStep3Title'),
      desc: t('howToUse.mainStep3Desc'),
      icon: <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="currentColor"><path d="M6 3.5l7 4.5-7 4.5V3.5z" /></svg>,
    },
  ];

  const options = [
    {
      title: t('howToUse.option1Title'),
      desc: t('howToUse.option1Desc'),
      icon: <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="5" cy="4" r="2" /><circle cx="5" cy="12" r="2" /><path d="M13 3L6.5 10.5M6.5 5.5L13 13" /></svg>,
    },
    {
      title: t('howToUse.option2Title'),
      desc: t('howToUse.option2Desc'),
      icon: <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="currentColor"><path d="M2 5h2v6H2V5zm3-2h2v10H5V3zm3 2h2v6H8V5zm3-3h2v12h-2V2z" opacity=".75" /></svg>,
    },
    {
      title: t('howToUse.option3Title'),
      desc: t('howToUse.option3Desc'),
      icon: <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 8h3M11 8h3M8 4v2M8 10v2" /></svg>,
    },
    {
      title: t('howToUse.option4Title'),
      desc: t('howToUse.option4Desc'),
      icon: <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8z" /><path d="M8 5v3l2 1.5" /></svg>,
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
              {t('howToUse.title')}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 3 }}>
              {t('howToUse.subtitle')}
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
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px 24px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {/* Main flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tg-green)', background: 'rgba(48,209,88,0.15)', borderRadius: 6, padding: '2px 9px', letterSpacing: '0.5px' }}>
              {t('howToUse.mainFlowLabel')}
            </span>
          </div>
          <div style={{ position: 'relative', paddingLeft: 18 }}>
            <div style={{ position: 'absolute', left: 17, top: 18, bottom: 18, width: 2, background: 'rgba(48,209,88,0.25)', borderRadius: 1 }} />
            {mainSteps.map((step, i) => (
              <div key={step.num} style={{ display: 'flex', gap: 16, padding: '12px 0', position: 'relative' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(48,209,88,0.15)', border: '2px solid rgba(48,209,88,0.4)', color: 'var(--tg-green)', fontSize: 14, fontWeight: 700, position: 'relative', zIndex: 1 }}>
                  {step.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tg-green)', opacity: 0.7 }}>{step.num}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-t1)' }}>{step.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 4, lineHeight: 1.6 }}>{step.desc}</p>
                  {i < mainSteps.length - 1 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--tg-t3)', fontSize: 11 }}>
                      <svg style={{ width: 12, height: 12 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 3v10M4 9l4 4 4-4" /></svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
          {/* Options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tg-t2)', background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 9px', letterSpacing: '0.5px' }}>{t('howToUse.optionsLabel')}</span>
            <span style={{ fontSize: 11, color: 'var(--tg-t3)' }}>{t('howToUse.optionsDesc')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {options.map(opt => (
              <div key={opt.title} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--tg-t2)' }}>{opt.icon}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tg-t1)' }}>{opt.title}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--tg-t3)', lineHeight: 1.55 }}>{opt.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.15)', borderRadius: 10, fontSize: 11, color: 'var(--tg-t2)', lineHeight: 1.5 }}>
            <svg style={{ width: 14, height: 14, color: 'var(--tg-green)', flexShrink: 0 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v2H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3zm0 1.5A1.5 1.5 0 0 1 9.5 4v2h-3V4A1.5 1.5 0 0 1 8 2.5zM8 9a1 1 0 0 1 .5 1.87V12.5h-1v-1.63A1 1 0 0 1 8 9z" /></svg>
            <span>{t('howToUse.privacyNote')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function Home() {
  const { config, files, setFiles, removeFile, resetAll } = useAppStore();
  const { t, locale } = useTranslation();
  const setLocale = useLocaleStore((s) => s.setLocale);

  const [mounted, setMounted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [showHelp, setShowHelp] = useState(false);
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
    }
  };

  const notify = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', tag: 'podcast-processor' });
      } catch { /* ignore */ }
    }
  };

  const handleProcess = async () => {
    if (files.length < 2) return;
    // Request notification permission when processing starts
    await requestNotificationPermission();
    setProcessing(true);
    setResult(null);
    setProgress(null);
    try {
      const output = await processPodcast(files[0], files[1], config, p => setProgress(p));
      setResult(output);
      notify(t('notifications.completeTitle'), t('notifications.completeBody'));
    } catch (error) {
      setProgress({ stage: 'error', percent: 0, message: `${t('notifications.errorOccurred')} ${error}` });
      notify(t('notifications.errorTitle'), t('notifications.errorBody'));
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
    ? t('toolbar.processing')
    : (mounted && config.preview_mode)
      ? `${t('toolbar.preview')}(${config.preview_duration}${t('common.seconds')})`
      : t('toolbar.runProcess');

  const statusText = processing
    ? (progress?.message ?? t('status.processingDots'))
    : result
      ? t('status.complete')
      : files.length >= 2
        ? t('status.ready')
        : t('status.readyShort');

  const fileInfoText = files.length > 0
    ? files.map(f => f.name).join('  ·  ')
    : t('status.noFile');

  // ── Section dot states ──────────────────────────────────────
  const trimDot: 'on' | 'off' = 'on'; // always enabled
  const processingDot: 'on' | 'off' = config.denoise_enabled ? 'on' : 'off';
  const silenceDot: 'on' | 'off' = config.silence_trim_enabled ? 'on' : 'off';
  const mixDot: 'on' | 'off' = (config.bgm_filename || config.endscene_filename) ? 'on' : 'off';

  return (
    <div className="tg-root flex items-stretch justify-center min-h-dvh">
      <div
        className="tg-window flex flex-col w-full overflow-hidden"
        style={{ minHeight: '100dvh' }}
      >
        {/* ── Single column container ── */}
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '0 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>

          {/* ── Header ────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex', alignItems: 'center', height: 56,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px' }}>
              Spectratrek
            </div>
            <div style={{ flex: 1 }} />

            {/* Help button */}
            <button
              onClick={() => setShowHelp(true)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'var(--tg-t2)', cursor: 'pointer',
                marginRight: 4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            >
              <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a2.5 2.5 0 0 1 2.13 3.78l-.63.84A1.5 1.5 0 0 0 9 9.5v.5H7v-.5a3.5 3.5 0 0 1 .88-2.31l.62-.83A.5.5 0 0 0 8 5.5a.5.5 0 0 0-1 0H5A2.5 2.5 0 0 1 8 3.5zM7 11h2v2H7v-2z" />
              </svg>
            </button>

            {/* Guide link */}
            <Link
              href="/guide"
              title={t('onboarding.viewGuide')}
              style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'var(--tg-t2)', cursor: 'pointer',
                marginRight: 8,
                transition: 'background 0.15s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            >
              <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.81 8.985.936 8 1.783z" />
              </svg>
            </Link>

            {/* Language switcher */}
            {mounted && (
              <div className="tg-seg">
                {(['en', 'ja'] as Locale[]).map(l => (
                  <button
                    key={l}
                    className={`tg-seg-btn${locale === l ? ' active' : ''}`}
                    onClick={() => setLocale(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Toolbar ───────────────────────────────────────── */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {/* Full/Preview toggle */}
            {mounted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="tg-seg">
                  <button
                    className={`tg-seg-btn${!config.preview_mode ? ' active' : ''}`}
                    onClick={() => useAppStore.getState().updateConfig({ preview_mode: false })}
                  >
                    {t('toolbar.fullProcess')}
                  </button>
                  <button
                    className={`tg-seg-btn${config.preview_mode ? ' active' : ''}`}
                    onClick={() => useAppStore.getState().updateConfig({ preview_mode: true })}
                  >
                    {t('toolbar.preview')}
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
                      <option key={v} value={v}>{v}{t('common.seconds')}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Presets */}
            {mounted && <PresetPopover />}

            {/* Reset */}
            <button className="tg-btn" onClick={() => {
              resetAll();
              setResult(null);
              setProgress(null);
              clearFileFromCache('bgm');
              clearFileFromCache('endscene');
            }}>
              <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5H12a4 4 0 1 1-4-4V2.5zm1.5 0V6h3.5L9.5 2.5z" /></svg>
              {t('toolbar.reset')}
            </button>
          </div>

          {/* ── Main scrollable content ── */}
          <main style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

            {/* ── Upload Zone (always visible) ── */}
            <div style={{ padding: '24px 0' }}>
              {/* Audio files (unified drop zone) */}
              <FileUploader
                files={files}
                onFilesChange={setFiles}
                onRemoveFile={removeFile}
              />

              {/* BGM / Endscene compact file selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <AudioFileUploader
                  cacheKey="bgm"
                  label={t('upload.bgm')}
                  icon={<svg style={{ width: 16, height: 16 }} viewBox="0 0 16 16" fill="currentColor"><path d="M10 2v8.27A2.5 2.5 0 1 1 8 8V5L4 6V3l6-1z" /></svg>}
                />
                <AudioFileUploader
                  cacheKey="endscene"
                  label={t('upload.endscene')}
                  icon={<svg style={{ width: 16, height: 16 }} viewBox="0 0 16 16" fill="currentColor"><path d="M10 2v8.27A2.5 2.5 0 1 1 8 8V5L4 6V3l6-1z" /></svg>}
                />
              </div>
            </div>

            {/* ── Process Button ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingBottom: 20 }}>
              <button
                className="tg-process-btn"
                onClick={handleProcess}
                disabled={!canProcess}
              >
                <svg style={{ width: 18, height: 18 }} viewBox="0 0 16 16" fill="currentColor"><path d="M6 3.5l7 4.5-7 4.5V3.5z" /></svg>
                {processLabel}
              </button>
              {files.length < 2 && (
                <div style={{ fontSize: 12, color: 'var(--tg-t3)', textAlign: 'center' }}>
                  {t('upload.needTwoFiles')}
                </div>
              )}
              {files.length >= 2 && !processing && !result && (
                <div style={{ fontSize: 12, color: 'var(--tg-t3)', textAlign: 'center' }}>
                  {t('settings.allOptional')}
                </div>
              )}
            </div>

            {/* ── Progress / Result ── */}
            {(progress || result) && (
              <div style={{ paddingBottom: 16 }}>
                {progress && !result && <ProcessingStatus progress={progress} />}
                {result && (
                  <ResultDownload
                    blob={result}
                    filename={result.type === 'audio/wav' ? 'podcast_output.wav' : 'podcast_output.mp3'}
                  />
                )}
              </div>
            )}

            {/* ── Privacy notice ── */}
            <div className="tg-notice" style={{ marginBottom: 12 }}>
              <svg style={{ width: 14, height: 14, color: 'var(--tg-accent)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.5 3.5h1V9h-1V4.5zm.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" /></svg>
              <span>{t('source.browserNotice')}</span>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />

            {/* ── Collapsible Settings ── */}
            <CollapsibleSection title={t('config.trim.title')} dot={trimDot}>
              <TrimSection />
            </CollapsibleSection>

            <CollapsibleSection title={t('config.processing.title')} dot={processingDot}>
              <ProcessingSection />
            </CollapsibleSection>

            <CollapsibleSection title={t('config.silence.title')} dot={silenceDot}>
              <SilenceSection />
            </CollapsibleSection>

            <CollapsibleSection title={t('config.mix.title')} dot={mixDot}>
              <MixParamsSection />
            </CollapsibleSection>

            <CollapsibleSection title={t('cutEditor.title')}>
              <CutEditor />
            </CollapsibleSection>

            <CollapsibleSection title={t('config.export.title')}>
              <ExportSection />
            </CollapsibleSection>

            {/* Bottom padding */}
            <div style={{ height: 24 }} />
          </main>

          {/* ── Status bar ────────────────────────────────────── */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: processing ? 32 : 24,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.15)',
              flexShrink: 0,
              transition: 'height 0.2s',
            }}
          >
            {!processing ? (
              <>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--tg-green)',
                  boxShadow: result ? '0 0 6px rgba(48,209,88,.5)' : '0 0 6px rgba(48,209,88,.3)',
                }} />
                <span style={{ fontSize: 11, color: 'var(--tg-t2)' }}>{statusText}</span>
                {result && (
                  <button
                    onClick={handleDownload}
                    style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--tg-green)',
                      background: 'rgba(48,209,88,0.15)',
                      border: '1px solid rgba(48,209,88,0.3)',
                      borderRadius: 6, padding: '3px 10px',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(48,209,88,0.25)'; e.currentTarget.style.borderColor = 'rgba(48,209,88,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(48,209,88,0.15)'; e.currentTarget.style.borderColor = 'rgba(48,209,88,0.3)'; }}
                  >
                    <svg style={{ width: 11, height: 11 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M8 2v9M4 8l4 4 4-4M2 13h12" />
                    </svg>
                    {t('status.download')}
                  </button>
                )}
                {notifPerm === 'granted' && !result && (
                  <span style={{ fontSize: 11, color: 'var(--tg-green)', marginLeft: 'auto' }}>{t('status.notifyOnComplete')}</span>
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
                <span style={{ fontSize: 11, color: 'var(--tg-t1)', fontWeight: 500 }}>{progress?.stage || t('status.processing')}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', maxWidth: 200 }}>
                  <div style={{
                    height: '100%', width: `${progress?.percent || 0}%`,
                    background: 'linear-gradient(90deg, var(--tg-accent), var(--tg-green))',
                    borderRadius: 2, transition: 'width 0.3s ease-out',
                    boxShadow: '0 0 8px rgba(10,132,255,0.4)',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--tg-accent)', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>
                  {progress?.percent || 0}%
                </span>
                {notifPerm === 'granted' && (
                  <span style={{ fontSize: 11, color: 'var(--tg-green)', whiteSpace: 'nowrap' }}>{t('status.notifyOnComplete')}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--tg-t3)', marginLeft: notifPerm === 'granted' ? 0 : 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  {progress?.message || t('status.processingDots')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && <HowToUseModal onClose={() => setShowHelp(false)} />}

      {/* Onboarding wizard (first visit only) */}
      {mounted && showOnboarding && <OnboardingWizard onClose={dismissOnboarding} />}
    </div>
  );
}
