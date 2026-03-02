'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { saveFileToCache, loadFileFromCache, clearFileFromCache } from '@/lib/file-cache';
import { useTranslation } from '@/lib/i18n';

type CacheKey = 'bgm' | 'endscene';
type CacheStatus = 'none' | 'saving' | 'saved' | 'error';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface AudioFileUploaderProps {
  /** 'bgm' | 'endscene' */
  cacheKey: CacheKey;
  /** ラベル (例: "BGM", "End Scene") */
  label: string;
  /** アイコン */
  icon: React.ReactNode;
}

export function AudioFileUploader({ cacheKey, label, icon }: AudioFileUploaderProps) {
  const { config, updateConfig } = useAppStore();
  const { t, tf } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>('none');
  const [cacheLoading, setCacheLoading] = useState(true);

  const configFilenameKey = cacheKey === 'bgm' ? 'bgm_filename' : 'endscene_filename';
  const configUrlKey = cacheKey === 'bgm' ? 'bgm_url' : 'endscene_url';
  const configFileKey = cacheKey === 'bgm' ? 'bgm' : 'endscene';

  const currentFilename = config[configFilenameKey] as string | undefined;
  const currentUrl = config[configUrlKey] as string | undefined;

  // 自動復元: IndexedDB キャッシュのみ（URL自動fetchはセキュリティリスクのため除去）
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const cached = await loadFileFromCache(cacheKey);
        if (!cancelled && cached) {
          setFile(cached);
          setCacheStatus('saved');
          updateConfig({ [configFileKey]: cached, [configFilenameKey]: cached.name });
        }
      } finally {
        if (!cancelled) setCacheLoading(false);
      }
    }
    restore();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // config のファイルがクリアされたらローカル state もクリア（リセット連動）
  const configFile = config[configFileKey] as File | undefined;
  useEffect(() => {
    if (!configFile && file) {
      setFile(null);
      setCacheStatus('none');
    }
  }, [configFile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setCacheStatus('saving');
      updateConfig({ [configFileKey]: f, [configFilenameKey]: f.name, [configUrlKey]: undefined });
      saveFileToCache(cacheKey, f)
        .then(() => setCacheStatus('saved'))
        .catch(() => setCacheStatus('error'));
    }
  };

  const handleClear = () => {
    setFile(null);
    setCacheStatus('none');
    updateConfig({ [configFileKey]: undefined, [configFilenameKey]: undefined, [configUrlKey]: undefined });
    clearFileFromCache(cacheKey);
  };

  const handleClick = () => {
    if (!file) {
      fileInputRef.current?.click();
    }
  };

  if (cacheLoading) {
    return (
      <div className="tg-compact-file" style={{ opacity: 0.5 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 12, color: 'var(--tg-t3)', flex: 1 }}>{label}</span>
      </div>
    );
  }

  if (file) {
    return (
      <div className="tg-compact-file has-file">
        <span style={{ fontSize: 16, flexShrink: 0, color: 'var(--tg-green)' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tg-t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
            {cacheStatus === 'saved' && (
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 100,
                background: 'rgba(48,209,88,0.15)', color: 'var(--tg-green)',
                border: '1px solid rgba(48,209,88,0.3)', whiteSpace: 'nowrap',
              }}>
                {t('config.mix.savedInBrowser')}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--tg-t3)' }}>{formatFileSize(file.size)}</span>
        </div>
        <button
          onClick={handleClear}
          style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
            color: 'var(--tg-t2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.color = 'var(--tg-red)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--tg-t2)'; }}
        >
          <svg style={{ width: 10, height: 10 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
      </div>
    );
  }

  // ファイル未選択 — キャッシュミス + 旧ファイル名あり
  return (
    <div>
      <div className="tg-compact-file" onClick={handleClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleClick()}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 12, color: 'var(--tg-t2)', flex: 1 }}>{label}</span>
      </div>
      {!cacheLoading && currentFilename && (
        <div style={{ fontSize: 10, color: 'var(--tg-orange)', marginTop: 4, paddingLeft: 2 }}>
          {tf('fileCacheStatus.previousFile', { name: currentFilename })}
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
    </div>
  );
}
