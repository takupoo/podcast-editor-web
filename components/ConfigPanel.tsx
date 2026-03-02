'use client';

import { useAppStore } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { saveFileToCache, loadFileFromCache, clearFileFromCache } from '@/lib/file-cache';
import { useTranslation } from '@/lib/i18n';

export type ConfigSection = 'trim' | 'processing' | 'silence' | 'mix' | 'export';

interface ConfigPanelProps {
  activeSection: ConfigSection;
}

function extractFilename(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? 'audio.mp3';
}

/** GitHub の blob URL を raw URL に自動変換 */
function toRawUrl(url: string): string {
  return url.replace(
    /^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//,
    'https://raw.githubusercontent.com/$1/'
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// ── Shared sub-components ──────────────────────────────────────

function GrpHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '9px 16px 5px',
      fontSize: 11, fontWeight: 600,
      color: 'var(--tg-t3)',
      letterSpacing: '0.5px',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {children}
    </div>
  );
}

function Row({ label, hint, right }: { label: string; hint?: string; right: React.ReactNode }) {
  return (
    <div className="tg-row">
      <div style={{ minWidth: 150, flexShrink: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--tg-t1)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--tg-t3)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        {right}
      </div>
    </div>
  );
}

function SliderRow({
  id, min, max, step, value, onChange, valueLabel,
}: {
  id: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; valueLabel: string;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--tg-t3)', flexShrink: 0, minWidth: 32 }}>{min}</span>
      <Slider
        id={id}
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span style={{ fontSize: 11, color: 'var(--tg-t3)', flexShrink: 0, minWidth: 32 }}>{max}</span>
      <span style={{ fontSize: 12, color: 'var(--tg-t2)', fontFamily: 'var(--font-mono, monospace)', minWidth: 72, textAlign: 'right' }}>{valueLabel}</span>
    </div>
  );
}

function Notice({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warn' | 'success' }) {
  return (
    <div className={`tg-notice${variant === 'warn' ? ' warn' : variant === 'success' ? ' success' : ''}`}>
      <svg style={{ width: 14, height: 14, color: variant === 'warn' ? 'var(--tg-orange)' : variant === 'success' ? 'var(--tg-green)' : 'var(--tg-accent)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.5 3.5h1V9h-1V4.5zm.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/>
      </svg>
      <span>{children}</span>
    </div>
  );
}

function SettingsBanner() {
  const { t } = useTranslation();
  return (
    <Notice>
      {t('config.settingsBanner')}
    </Notice>
  );
}

function StageHeader({ icon, title, desc, enabledKey }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  enabledKey?: keyof ReturnType<typeof useAppStore.getState>['config'];
}) {
  const { config, updateConfig } = useAppStore();
  const { t } = useTranslation();
  const enabled = enabledKey ? config[enabledKey] as boolean : undefined;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.4)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--tg-t2)', marginTop: 2 }}>{desc}</div>
      </div>
      {enabledKey && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--tg-t2)' }}>{t('config.enabled')}</span>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => updateConfig({ [enabledKey]: v } as Parameters<typeof updateConfig>[0])}
          />
        </div>
      )}
    </div>
  );
}

// ── FileStatus component ──────────────────────────────────────
type CacheStatus = 'none' | 'saving' | 'saved' | 'error';

function FileStatus({ file, cacheStatus, url, onClear }: {
  file: File;
  cacheStatus: CacheStatus;
  url?: string;
  onClear: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: 'rgba(48,209,88,0.06)',
      border: '1px solid rgba(48,209,88,0.2)',
      borderRadius: 10,
    }}>
      <svg style={{ width: 16, height: 16, color: 'var(--tg-green)', flexShrink: 0 }} viewBox="0 0 16 16" fill="currentColor">
        <path d="M10 2v8.27A2.5 2.5 0 1 1 8 8V5L4 6V3l6-1z"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tg-t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name}
          </span>
          {cacheStatus === 'saved' && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 100,
              background: 'rgba(48,209,88,0.15)', color: 'var(--tg-green)',
              border: '1px solid rgba(48,209,88,0.3)',
              whiteSpace: 'nowrap',
            }}>
              {t('config.mix.savedInBrowser')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tg-t3)', marginTop: 2, display: 'flex', gap: 8 }}>
          <span>{formatFileSize(file.size)}</span>
          {url && <span>{extractDomain(url)}</span>}
        </div>
      </div>
      <button
        onClick={onClear}
        style={{
          fontSize: 11, color: 'var(--tg-red)', cursor: 'pointer',
          background: 'none', border: 'none', flexShrink: 0,
        }}
      >
        {t('config.mix.clear')}
      </button>
    </div>
  );
}

// ── Section panels (exported for use in page.tsx collapsible sections) ──

export function TrimSection() {
  const { config, updateConfig } = useAppStore();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div className="tg-grp" style={{ background: 'linear-gradient(145deg,rgba(255,159,10,0.06),transparent)' }}>
        <GrpHeader>{t('config.trim.detection')}</GrpHeader>
        <Row
          label={t('config.trim.clapThreshold')}
          hint={t('config.trim.clapThresholdHint')}
          right={
            <SliderRow
              id="clap-threshold" min={-20} max={-5} step={1}
              value={config.clap_threshold_db}
              onChange={v => updateConfig({ clap_threshold_db: v })}
              valueLabel={`${config.clap_threshold_db} dB`}
            />
          }
        />
      </div>
      <div className="tg-grp">
        <GrpHeader>{t('config.trim.margin')}</GrpHeader>
        <Row
          label={t('config.trim.preClap')}
          hint={t('config.trim.preClapHint')}
          right={
            <SliderRow
              id="pre-clap-margin" min={0} max={3} step={0.1}
              value={config.pre_clap_margin}
              onChange={v => updateConfig({ pre_clap_margin: v })}
              valueLabel={`${config.pre_clap_margin.toFixed(1)} ${t('common.seconds')}`}
            />
          }
        />
        <Row
          label={t('config.trim.postClap')}
          hint={t('config.trim.postClapHint')}
          right={
            <SliderRow
              id="post-clap-cut" min={0} max={2} step={0.1}
              value={config.post_clap_cut}
              onChange={v => updateConfig({ post_clap_cut: v })}
              valueLabel={`${config.post_clap_cut.toFixed(1)} ${t('common.seconds')}`}
            />
          }
        />
      </div>
    </div>
  );
}

export function ProcessingSection() {
  const { config, updateConfig } = useAppStore();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      {/* Denoise toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--tg-t2)' }}>{t('config.enabled')}</span>
        <Switch
          checked={config.denoise_enabled}
          onCheckedChange={(v) => updateConfig({ denoise_enabled: v })}
        />
      </div>

      {/* Denoise method */}
      <div className="tg-grp">
        <GrpHeader>{t('config.processing.denoiseAlgorithm')}</GrpHeader>
        <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(['spectral', 'afftdn', 'anlmdn', 'none'] as const).map(method => (
            <label
              key={method}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: config.denoise_method === method ? 'rgba(10,132,255,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${config.denoise_method === method ? 'rgba(10,132,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.14s',
              }}
            >
              <input
                type="radio"
                name="denoise_method"
                value={method}
                checked={config.denoise_method === method}
                onChange={() => updateConfig({ denoise_method: method })}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tg-t1)' }}>
                  {method === 'spectral' && t('config.processing.spectral')}
                  {method === 'afftdn' && t('config.processing.afftdn')}
                  {method === 'anlmdn' && t('config.processing.anlmdn')}
                  {method === 'none' && t('config.processing.none')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tg-t3)', marginTop: 2 }}>
                  {method === 'spectral' && t('config.processing.spectralDesc')}
                  {method === 'afftdn' && t('config.processing.afftdnDesc')}
                  {method === 'anlmdn' && t('config.processing.anlmdnDesc')}
                  {method === 'none' && t('config.processing.noneDesc')}
                </div>
              </div>
            </label>
          ))}
        </div>
        {config.denoise_method !== 'none' && (
          <Row
            label={t('config.processing.noiseFloor')}
            hint={t('config.processing.noiseFloorHint')}
            right={
              <SliderRow
                id="noise-gate-threshold" min={-60} max={-30} step={5}
                value={config.noise_gate_threshold}
                onChange={v => updateConfig({ noise_gate_threshold: v })}
                valueLabel={`${config.noise_gate_threshold} dB`}
              />
            }
          />
        )}
      </div>

      {/* Loudness */}
      <div className="tg-grp">
        <GrpHeader>{t('config.processing.loudness')}</GrpHeader>
        <Row
          label={t('config.processing.targetLoudness')}
          hint={t('config.processing.targetLoudnessHint')}
          right={
            <SliderRow
              id="target-lufs" min={-20} max={-12} step={0.5}
              value={config.target_lufs}
              onChange={v => updateConfig({ target_lufs: v })}
              valueLabel={`${config.target_lufs} LUFS`}
            />
          }
        />
        <Row
          label="True Peak"
          right={
            <SliderRow
              id="true-peak" min={-3} max={0} step={0.5}
              value={config.true_peak}
              onChange={v => updateConfig({ true_peak: v })}
              valueLabel={`${config.true_peak} dBTP`}
            />
          }
        />
      </div>

      {/* Dynamics */}
      <div className="tg-grp">
        <GrpHeader>{t('config.processing.dynamics')}</GrpHeader>
        <Row
          label={t('config.processing.ratio')}
          hint={t('config.processing.ratioHint')}
          right={
            <SliderRow
              id="comp-ratio" min={2} max={10} step={1}
              value={config.comp_ratio}
              onChange={v => updateConfig({ comp_ratio: v })}
              valueLabel={`${config.comp_ratio} : 1`}
            />
          }
        />
        <Row
          label={t('config.processing.attack')}
          right={
            <SliderRow
              id="comp-attack" min={1} max={100} step={1}
              value={config.comp_attack}
              onChange={v => updateConfig({ comp_attack: v })}
              valueLabel={`${config.comp_attack} ms`}
            />
          }
        />
        <Row
          label={t('config.processing.release')}
          right={
            <SliderRow
              id="comp-release" min={10} max={500} step={10}
              value={config.comp_release}
              onChange={v => updateConfig({ comp_release: v })}
              valueLabel={`${config.comp_release} ms`}
            />
          }
        />
      </div>
    </div>
  );
}

export function SilenceSection() {
  const { config, updateConfig } = useAppStore();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      {/* Enable toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--tg-t2)' }}>{t('config.enabled')}</span>
        <Switch
          checked={config.silence_trim_enabled}
          onCheckedChange={(v) => updateConfig({ silence_trim_enabled: v })}
        />
      </div>
      <div className="tg-grp">
        <GrpHeader>{t('config.silence.conditions')}</GrpHeader>
        <Row
          label={t('config.silence.threshold')}
          hint={t('config.silence.thresholdHint')}
          right={
            <SliderRow
              id="silence-threshold" min={-50} max={-20} step={1}
              value={config.silence_threshold_db}
              onChange={v => updateConfig({ silence_threshold_db: v })}
              valueLabel={`${config.silence_threshold_db} dB`}
            />
          }
        />
        <Row
          label={t('config.silence.minDuration')}
          hint={t('config.silence.minDurationHint')}
          right={
            <SliderRow
              id="silence-min-duration" min={0.5} max={10} step={0.5}
              value={config.silence_min_duration}
              onChange={v => updateConfig({ silence_min_duration: v })}
              valueLabel={`${config.silence_min_duration.toFixed(1)} ${t('common.seconds')}`}
            />
          }
        />
        <Row
          label={t('config.silence.afterCut')}
          hint={t('config.silence.afterCutHint')}
          right={
            <SliderRow
              id="silence-target-duration" min={0.1} max={3} step={0.1}
              value={config.silence_target_duration}
              onChange={v => updateConfig({ silence_target_duration: v })}
              valueLabel={`${config.silence_target_duration.toFixed(1)} ${t('common.seconds')}`}
            />
          }
        />
      </div>
      <Notice variant="warn">
        <strong>{t('config.silence.title')}</strong>{t('config.silence.notice').replace(t('config.silence.title'), '')}
      </Notice>
    </div>
  );
}

/** BGM/エンドシーンのパラメータのみ（ファイル選択は AudioFileUploader に分離済み） */
export function MixParamsSection() {
  const { config, updateConfig } = useAppStore();
  const { t } = useTranslation();
  const hasBgm = !!(config.bgm_filename || config.bgm);
  const hasEndscene = !!(config.endscene_filename || config.endscene);

  return (
    <div className="flex flex-col gap-4">
      {/* BGM パラメータ */}
      {hasBgm && (
        <div className="tg-grp">
          <GrpHeader>{t('config.mix.bgmVolume')}</GrpHeader>
          <Row
            label={t('config.mix.bgmVolume')}
            hint={t('config.mix.bgmVolumeHint')}
            right={
              <SliderRow id="bgm-volume" min={-60} max={-20} step={1}
                value={config.bgm_target_lufs}
                onChange={v => updateConfig({ bgm_target_lufs: v })}
                valueLabel={`${config.bgm_target_lufs} LUFS`}
              />
            }
          />
          <Row
            label={t('config.mix.fadeIn')}
            right={
              <SliderRow id="bgm-fade-in" min={0} max={10} step={0.5}
                value={config.bgm_fade_in}
                onChange={v => updateConfig({ bgm_fade_in: v })}
                valueLabel={`${config.bgm_fade_in.toFixed(1)} ${t('common.seconds')}`}
              />
            }
          />
          <Row
            label={t('config.mix.fadeOut')}
            right={
              <SliderRow id="bgm-fade-out" min={0} max={10} step={0.5}
                value={config.bgm_fade_out}
                onChange={v => updateConfig({ bgm_fade_out: v })}
                valueLabel={`${config.bgm_fade_out.toFixed(1)} ${t('common.seconds')}`}
              />
            }
          />
        </div>
      )}

      {/* Endscene パラメータ */}
      {hasEndscene && (
        <div className="tg-grp">
          <GrpHeader>{t('config.mix.endsceneFile')}</GrpHeader>
          <Row
            label={t('config.mix.crossfade')}
            right={
              <SliderRow id="endscene-crossfade" min={0} max={5} step={0.5}
                value={config.endscene_crossfade}
                onChange={v => updateConfig({ endscene_crossfade: v })}
                valueLabel={`${config.endscene_crossfade.toFixed(1)} ${t('common.seconds')}`}
              />
            }
          />
        </div>
      )}

      {/* URL 入力 — BGM */}
      <MixUrlLoader cacheKey="bgm" />
      {/* URL 入力 — Endscene */}
      <MixUrlLoader cacheKey="endscene" />
    </div>
  );
}

/** URL からの読み込みUI（折りたたみ内で使用） */
function MixUrlLoader({ cacheKey }: { cacheKey: 'bgm' | 'endscene' }) {
  const { config, updateConfig } = useAppStore();
  const { t } = useTranslation();
  const urlKey = cacheKey === 'bgm' ? 'bgm_url' : 'endscene_url';
  const filenameKey = cacheKey === 'bgm' ? 'bgm_filename' : 'endscene_filename';
  const fileKey = cacheKey === 'bgm' ? 'bgm' : 'endscene';
  const label = cacheKey === 'bgm' ? t('config.mix.bgmFile') : t('config.mix.endsceneFile');

  const [url, setUrl] = useState(config[urlKey] as string ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async () => {
    if (!url) return;
    setLoading(true); setError(null);
    const rawUrl = toRawUrl(url);
    if (rawUrl !== url) setUrl(rawUrl);
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const filename = extractFilename(rawUrl);
      const file = new File([buffer], filename, { type: res.headers.get('content-type') ?? 'audio/mpeg' });
      updateConfig({ [fileKey]: file, [filenameKey]: filename, [urlKey]: rawUrl });
      saveFileToCache(cacheKey, file);
    } catch { setError(t('config.mix.urlError')); }
    finally { setLoading(false); }
  };

  return (
    <div className="tg-grp">
      <GrpHeader>{label} — {t('config.mix.loadFromUrl')}</GrpHeader>
      <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
        <input
          type="url" value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLoad()}
          placeholder={t('config.mix.urlPlaceholder')}
          className="tg-input"
        />
        <button onClick={handleLoad} disabled={loading || !url} className="tg-btn" style={{ flexShrink: 0 }}>
          {loading ? t('config.mix.loading') : t('config.mix.loadFromUrl')}
        </button>
      </div>
      {error && <div style={{ padding: '0 16px 8px', fontSize: 11, color: 'var(--tg-red)' }}>{error}</div>}
    </div>
  );
}

export function ExportSection() {
  const { config, updateConfig } = useAppStore();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div className="tg-grp">
        <GrpHeader>{t('config.export.format')}</GrpHeader>
        <Row
          label={t('config.export.outputFormat')}
          right={
            <div className="tg-seg">
              {(['mp3', 'wav'] as const).map(fmt => (
                <button
                  key={fmt}
                  className={`tg-seg-btn${config.output_format === fmt ? ' active' : ''}`}
                  onClick={() => updateConfig({ output_format: fmt })}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          }
        />
        {config.output_format === 'mp3' && (
          <Row
            label={t('config.export.bitrate')}
            right={
              <div className="tg-seg">
                {(['128k', '192k', '256k', '320k'] as const).map(br => (
                  <button
                    key={br}
                    className={`tg-seg-btn${config.mp3_bitrate === br ? ' active' : ''}`}
                    onClick={() => updateConfig({ mp3_bitrate: br })}
                  >
                    {br}
                  </button>
                ))}
              </div>
            }
          />
        )}
      </div>
      <Notice>{t('config.export.bitrateNotice')}</Notice>
    </div>
  );
}

// ── Legacy full MixSection (kept for compatibility but no longer used in new layout) ──

function MixSection() {
  const { config, updateConfig } = useAppStore();
  const { t, tf } = useTranslation();
  const [bgmFile, setBgmFile]             = useState<File | null>(null);
  const [endsceneFile, setEndsceneFile]   = useState<File | null>(null);
  const [bgmCacheStatus, setBgmCacheStatus] = useState<CacheStatus>('none');
  const [endsceneCacheStatus, setEndsceneCacheStatus] = useState<CacheStatus>('none');
  const [cacheLoading, setCacheLoading]   = useState(true);
  const [bgmUrl, setBgmUrl]               = useState(config.bgm_url ?? '');
  const [bgmUrlLoading, setBgmUrlLoading] = useState(false);
  const [bgmUrlError, setBgmUrlError]     = useState<string | null>(null);
  const [endsceneUrl, setEndsceneUrl]     = useState(config.endscene_url ?? '');
  const [endsceneUrlLoading, setEndsceneUrlLoading] = useState(false);
  const [endsceneUrlError, setEndsceneUrlError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function restoreFiles() {
      try {
        const bgmCached = await loadFileFromCache('bgm');
        if (!cancelled && bgmCached) {
          setBgmFile(bgmCached);
          setBgmCacheStatus('saved');
          updateConfig({ bgm: bgmCached, bgm_filename: bgmCached.name });
        } else if (!cancelled && config.bgm_url) {
          try {
            const res = await fetch(config.bgm_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            const filename = config.bgm_filename ?? extractFilename(config.bgm_url);
            const file = new File([buffer], filename, { type: res.headers.get('content-type') ?? 'audio/mpeg' });
            if (!cancelled) {
              setBgmFile(file);
              updateConfig({ bgm: file });
              saveFileToCache('bgm', file).then(() => { if (!cancelled) setBgmCacheStatus('saved'); });
            }
          } catch {
            if (!cancelled) setBgmUrlError(t('config.mix.urlAutoError'));
          }
        }

        const endsceneCached = await loadFileFromCache('endscene');
        if (!cancelled && endsceneCached) {
          setEndsceneFile(endsceneCached);
          setEndsceneCacheStatus('saved');
          updateConfig({ endscene: endsceneCached, endscene_filename: endsceneCached.name });
        } else if (!cancelled && config.endscene_url) {
          try {
            const res = await fetch(config.endscene_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            const filename = config.endscene_filename ?? extractFilename(config.endscene_url);
            const file = new File([buffer], filename, { type: res.headers.get('content-type') ?? 'audio/mpeg' });
            if (!cancelled) {
              setEndsceneFile(file);
              updateConfig({ endscene: file });
              saveFileToCache('endscene', file).then(() => { if (!cancelled) setEndsceneCacheStatus('saved'); });
            }
          } catch {
            if (!cancelled) setEndsceneUrlError(t('config.mix.urlAutoError'));
          }
        }
      } finally {
        if (!cancelled) setCacheLoading(false);
      }
    }
    restoreFiles();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgmFile(file);
      setBgmCacheStatus('saving');
      updateConfig({ bgm: file, bgm_filename: file.name, bgm_url: undefined });
      saveFileToCache('bgm', file)
        .then(() => setBgmCacheStatus('saved'))
        .catch(() => setBgmCacheStatus('error'));
    }
  };
  const handleEndsceneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEndsceneFile(file);
      setEndsceneCacheStatus('saving');
      updateConfig({ endscene: file, endscene_filename: file.name, endscene_url: undefined });
      saveFileToCache('endscene', file)
        .then(() => setEndsceneCacheStatus('saved'))
        .catch(() => setEndsceneCacheStatus('error'));
    }
  };
  const handleClearBgm = () => {
    setBgmFile(null); setBgmCacheStatus('none'); setBgmUrl(''); setBgmUrlError(null);
    updateConfig({ bgm: undefined, bgm_filename: undefined, bgm_url: undefined });
    clearFileFromCache('bgm');
  };
  const handleClearEndscene = () => {
    setEndsceneFile(null); setEndsceneCacheStatus('none'); setEndsceneUrl(''); setEndsceneUrlError(null);
    updateConfig({ endscene: undefined, endscene_filename: undefined, endscene_url: undefined });
    clearFileFromCache('endscene');
  };

  const handleBgmUrlLoad = async () => {
    if (!bgmUrl) return;
    setBgmUrlLoading(true); setBgmUrlError(null);
    const rawUrl = toRawUrl(bgmUrl);
    if (rawUrl !== bgmUrl) setBgmUrl(rawUrl);
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const filename = extractFilename(rawUrl);
      const file = new File([buffer], filename, { type: res.headers.get('content-type') ?? 'audio/mpeg' });
      setBgmFile(file);
      setBgmCacheStatus('saving');
      updateConfig({ bgm: file, bgm_filename: filename, bgm_url: rawUrl });
      saveFileToCache('bgm', file)
        .then(() => setBgmCacheStatus('saved'))
        .catch(() => setBgmCacheStatus('error'));
    } catch { setBgmUrlError(t('config.mix.urlError')); }
    finally { setBgmUrlLoading(false); }
  };
  const handleEndsceneUrlLoad = async () => {
    if (!endsceneUrl) return;
    setEndsceneUrlLoading(true); setEndsceneUrlError(null);
    const rawUrl = toRawUrl(endsceneUrl);
    if (rawUrl !== endsceneUrl) setEndsceneUrl(rawUrl);
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const filename = extractFilename(rawUrl);
      const file = new File([buffer], filename, { type: res.headers.get('content-type') ?? 'audio/mpeg' });
      setEndsceneFile(file);
      setEndsceneCacheStatus('saving');
      updateConfig({ endscene: file, endscene_filename: filename, endscene_url: rawUrl });
      saveFileToCache('endscene', file)
        .then(() => setEndsceneCacheStatus('saved'))
        .catch(() => setEndsceneCacheStatus('error'));
    } catch { setEndsceneUrlError(t('config.mix.urlError')); }
    finally { setEndsceneUrlLoading(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <StageHeader
        icon={
          <svg style={{ width: 21, height: 21, color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        }
        title={t('config.mix.title')}
        desc={t('config.mix.desc')}
      />
      <SettingsBanner />

      {/* BGM */}
      <div className="tg-grp">
        <GrpHeader>{t('config.mix.bgmFile')}</GrpHeader>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!cacheLoading && !bgmFile && config.bgm_filename && (
            <Notice variant="warn">{tf('fileCacheStatus.previousFile', { name: config.bgm_filename })}</Notice>
          )}
          {bgmFile ? (
            <FileStatus file={bgmFile} cacheStatus={bgmCacheStatus} url={config.bgm_url} onClear={handleClearBgm} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ cursor: 'pointer' }}>
                <span className="tg-btn" style={{ display: 'inline-flex' }}>{t('config.mix.selectFile')}</span>
                <input type="file" accept="audio/*" onChange={handleBgmChange} style={{ display: 'none' }} />
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url" value={bgmUrl}
              onChange={e => setBgmUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBgmUrlLoad()}
              placeholder={t('config.mix.urlPlaceholder')}
              className="tg-input"
            />
            <button onClick={handleBgmUrlLoad} disabled={bgmUrlLoading || !bgmUrl} className="tg-btn" style={{ flexShrink: 0 }}>
              {bgmUrlLoading ? t('config.mix.loading') : t('config.mix.loadFromUrl')}
            </button>
          </div>
          {bgmUrlError && <span style={{ fontSize: 11, color: 'var(--tg-red)' }}>{bgmUrlError}</span>}
        </div>
        {bgmFile && (
          <>
            <Row
              label={t('config.mix.bgmVolume')}
              hint={t('config.mix.bgmVolumeHint')}
              right={
                <SliderRow id="bgm-volume" min={-60} max={-20} step={1}
                  value={config.bgm_target_lufs}
                  onChange={v => updateConfig({ bgm_target_lufs: v })}
                  valueLabel={`${config.bgm_target_lufs} LUFS`}
                />
              }
            />
            <Row
              label={t('config.mix.fadeIn')}
              right={
                <SliderRow id="bgm-fade-in" min={0} max={10} step={0.5}
                  value={config.bgm_fade_in}
                  onChange={v => updateConfig({ bgm_fade_in: v })}
                  valueLabel={`${config.bgm_fade_in.toFixed(1)} ${t('common.seconds')}`}
                />
              }
            />
            <Row
              label={t('config.mix.fadeOut')}
              right={
                <SliderRow id="bgm-fade-out" min={0} max={10} step={0.5}
                  value={config.bgm_fade_out}
                  onChange={v => updateConfig({ bgm_fade_out: v })}
                  valueLabel={`${config.bgm_fade_out.toFixed(1)} ${t('common.seconds')}`}
                />
              }
            />
          </>
        )}
      </div>

      {/* Endscene */}
      <div className="tg-grp">
        <GrpHeader>{t('config.mix.endsceneFile')}</GrpHeader>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!cacheLoading && !endsceneFile && config.endscene_filename && (
            <Notice variant="warn">{tf('fileCacheStatus.previousFile', { name: config.endscene_filename })}</Notice>
          )}
          {endsceneFile ? (
            <FileStatus file={endsceneFile} cacheStatus={endsceneCacheStatus} url={config.endscene_url} onClear={handleClearEndscene} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ cursor: 'pointer' }}>
                <span className="tg-btn" style={{ display: 'inline-flex' }}>{t('config.mix.selectFile')}</span>
                <input type="file" accept="audio/*" onChange={handleEndsceneChange} style={{ display: 'none' }} />
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url" value={endsceneUrl}
              onChange={e => setEndsceneUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEndsceneUrlLoad()}
              placeholder={t('config.mix.urlPlaceholder')}
              className="tg-input"
            />
            <button onClick={handleEndsceneUrlLoad} disabled={endsceneUrlLoading || !endsceneUrl} className="tg-btn" style={{ flexShrink: 0 }}>
              {endsceneUrlLoading ? t('config.mix.loading') : t('config.mix.loadFromUrl')}
            </button>
          </div>
          {endsceneUrlError && <span style={{ fontSize: 11, color: 'var(--tg-red)' }}>{endsceneUrlError}</span>}
        </div>
        {endsceneFile && (
          <Row
            label={t('config.mix.crossfade')}
            right={
              <SliderRow id="endscene-crossfade" min={0} max={5} step={0.5}
                value={config.endscene_crossfade}
                onChange={v => updateConfig({ endscene_crossfade: v })}
                valueLabel={`${config.endscene_crossfade.toFixed(1)} ${t('common.seconds')}`}
              />
            }
          />
        )}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────
export function ConfigPanel({ activeSection }: ConfigPanelProps) {
  return (
    <div className="p-6">
      {activeSection === 'trim'       && <TrimSection />}
      {activeSection === 'processing' && <ProcessingSection />}
      {activeSection === 'silence'    && <SilenceSection />}
      {activeSection === 'mix'        && <MixSection />}
      {activeSection === 'export'     && <ExportSection />}
    </div>
  );
}
