'use client';

import { useAppStore } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { saveFileToCache, loadFileFromCache, clearFileFromCache } from '@/lib/file-cache';

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

function StageHeader({ icon, title, desc, enabledKey }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  enabledKey?: keyof ReturnType<typeof useAppStore.getState>['config'];
}) {
  const { config, updateConfig } = useAppStore();
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
          <span style={{ fontSize: 12, color: 'var(--tg-t2)' }}>有効</span>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => updateConfig({ [enabledKey]: v } as Parameters<typeof updateConfig>[0])}
          />
        </div>
      )}
    </div>
  );
}

// ── Section panels ─────────────────────────────────────────────

function TrimSection() {
  const { config, updateConfig } = useAppStore();
  return (
    <div className="flex flex-col gap-4">
      <StageHeader
        icon={
          <svg style={{ width: 21, height: 21, color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="6" y1="9" x2="6" y2="3"/><line x1="18" y1="9" x2="18" y2="3"/>
            <line x1="2" y1="17" x2="22" y2="17"/>
            <path d="M6 9 L2 13"/><path d="M6 9 L10 13"/><path d="M18 9 L14 13"/><path d="M18 9 L22 13"/>
          </svg>
        }
        title="トリム"
        desc="クラップ音検出による前後カット"
      />
      <div className="tg-grp" style={{ background: 'linear-gradient(145deg,rgba(255,159,10,0.06),transparent)' }}>
        <GrpHeader>検出</GrpHeader>
        <Row
          label="クラップ検出閾値"
          hint="低いほど小さい音でも検出（推奨: -10dB）"
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
        <GrpHeader>余白</GrpHeader>
        <Row
          label="クラップ前の余白"
          hint="クラップ前に残す時間"
          right={
            <SliderRow
              id="pre-clap-margin" min={0} max={3} step={0.1}
              value={config.pre_clap_margin}
              onChange={v => updateConfig({ pre_clap_margin: v })}
              valueLabel={`${config.pre_clap_margin.toFixed(1)} 秒`}
            />
          }
        />
        <Row
          label="クラップ後カット"
          hint="クラップから何秒後から録音開始するか（0=クラップ残す）"
          right={
            <SliderRow
              id="post-clap-cut" min={0} max={2} step={0.1}
              value={config.post_clap_cut}
              onChange={v => updateConfig({ post_clap_cut: v })}
              valueLabel={`${config.post_clap_cut.toFixed(1)} 秒`}
            />
          }
        />
      </div>
    </div>
  );
}

function ProcessingSection() {
  const { config, updateConfig } = useAppStore();
  return (
    <div className="flex flex-col gap-4">
      {/* ノイズ除去 */}
      <StageHeader
        icon={
          <svg style={{ width: 21, height: 21, color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 12 Q5 4 8 12 Q11 20 14 12 Q17 4 20 8"/><path d="M20 8 L22 8"/>
          </svg>
        }
        title="ノイズ除去 / ラウドネス / ダイナミクス"
        desc="音声処理パイプライン（Stage 2–4）"
        enabledKey="denoise_enabled"
      />

      {/* Denoise method */}
      <div className="tg-grp">
        <GrpHeader>ノイズ除去アルゴリズム</GrpHeader>
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
                  {method === 'spectral' && 'スペクトル減算（推奨）'}
                  {method === 'afftdn' && 'afftdn（FFTベース）'}
                  {method === 'anlmdn' && 'anlmdn（NLMeans）'}
                  {method === 'none' && 'なし（フィルタのみ）'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tg-t3)', marginTop: 2 }}>
                  {method === 'spectral' && '録音内の静かなフレームからノイズを学習。サー音・キーン音・ファン音に最も効果的。'}
                  {method === 'afftdn' && 'FFTベース。時間的ノイズ追跡あり。軽量で定常ノイズに効果的。'}
                  {method === 'anlmdn' && '非局所平均ベース。高品質だが処理が重い。'}
                  {method === 'none' && 'highpass + lowpassのみ。ノイズ除去なし。'}
                </div>
              </div>
            </label>
          ))}
        </div>
        {config.denoise_method !== 'none' && (
          <Row
            label="ノイズフロア閾値"
            hint="低いほど弱いノイズも除去（推奨: -50dB）"
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
        <GrpHeader>ラウドネス正規化（EBU R128）</GrpHeader>
        <Row
          label="目標ラウドネス"
          hint="ポッドキャスト標準: -16 LUFS"
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
        <GrpHeader>ダイナミクス（コンプレッサー）</GrpHeader>
        <Row
          label="レシオ"
          hint="大きいほど圧縮が強い（推奨: 4:1）"
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
          label="アタック"
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
          label="リリース"
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

function SilenceSection() {
  const { config, updateConfig } = useAppStore();
  return (
    <div className="flex flex-col gap-4">
      <StageHeader
        icon={
          <svg style={{ width: 21, height: 21, color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 9v6M12 5v14M15 9v6M3 12h3M18 12h3"/>
          </svg>
        }
        title="無音カット"
        desc="長い沈黙を短縮してテンポを改善"
        enabledKey="silence_trim_enabled"
      />
      <div className="tg-grp">
        <GrpHeader>検出条件</GrpHeader>
        <Row
          label="無音判定閾値"
          hint="この音量以下を無音とみなす"
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
          label="最小無音時間"
          hint="この秒数以上続く無音をカット対象にする"
          right={
            <SliderRow
              id="silence-min-duration" min={0.5} max={10} step={0.5}
              value={config.silence_min_duration}
              onChange={v => updateConfig({ silence_min_duration: v })}
              valueLabel={`${config.silence_min_duration.toFixed(1)} 秒`}
            />
          }
        />
        <Row
          label="カット後の長さ"
          hint="無音を何秒に詰めるか"
          right={
            <SliderRow
              id="silence-target-duration" min={0.1} max={3} step={0.1}
              value={config.silence_target_duration}
              onChange={v => updateConfig({ silence_target_duration: v })}
              valueLabel={`${config.silence_target_duration.toFixed(1)} 秒`}
            />
          }
        />
      </div>
      <Notice variant="warn">
        <strong>無音カット</strong>はミックス後に適用されます。両方の話者が無音の区間のみがカット対象になります。
      </Notice>
    </div>
  );
}

function MixSection() {
  const { config, updateConfig } = useAppStore();
  const [bgmFile, setBgmFile]             = useState<File | null>(null);
  const [endsceneFile, setEndsceneFile]   = useState<File | null>(null);
  const [bgmFromCache, setBgmFromCache]   = useState(false);
  const [endsceneFromCache, setEndsceneFromCache] = useState(false);
  const [cacheLoading, setCacheLoading]   = useState(true);
  const [bgmUrl, setBgmUrl]               = useState(config.bgm_url ?? '');
  const [bgmUrlLoading, setBgmUrlLoading] = useState(false);
  const [bgmUrlError, setBgmUrlError]     = useState<string | null>(null);
  const [endsceneUrl, setEndsceneUrl]     = useState(config.endscene_url ?? '');
  const [endsceneUrlLoading, setEndsceneUrlLoading] = useState(false);
  const [endsceneUrlError, setEndsceneUrlError]     = useState<string | null>(null);

  // 自動復元
  useEffect(() => {
    let cancelled = false;
    async function restoreFiles() {
      try {
        if (config.bgm_url) {
          try {
            const res = await fetch(config.bgm_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            const filename = config.bgm_filename ?? extractFilename(config.bgm_url);
            const file = new File([buffer], filename, { type: res.headers.get('content-type') ?? 'audio/mpeg' });
            if (!cancelled) { setBgmFile(file); setBgmFromCache(true); updateConfig({ bgm: file }); }
          } catch {
            if (!cancelled) setBgmUrlError('URLからの自動読み込みに失敗しました');
          }
        } else {
          const cached = await loadFileFromCache('bgm');
          if (!cancelled && cached) { setBgmFile(cached); setBgmFromCache(true); updateConfig({ bgm: cached, bgm_filename: cached.name }); }
        }
        if (config.endscene_url) {
          try {
            const res = await fetch(config.endscene_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            const filename = config.endscene_filename ?? extractFilename(config.endscene_url);
            const file = new File([buffer], filename, { type: res.headers.get('content-type') ?? 'audio/mpeg' });
            if (!cancelled) { setEndsceneFile(file); setEndsceneFromCache(true); updateConfig({ endscene: file }); }
          } catch {
            if (!cancelled) setEndsceneUrlError('URLからの自動読み込みに失敗しました');
          }
        } else {
          const cached = await loadFileFromCache('endscene');
          if (!cancelled && cached) { setEndsceneFile(cached); setEndsceneFromCache(true); updateConfig({ endscene: cached, endscene_filename: cached.name }); }
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
    if (file) { setBgmFile(file); setBgmFromCache(false); updateConfig({ bgm: file, bgm_filename: file.name, bgm_url: undefined }); saveFileToCache('bgm', file); }
  };
  const handleEndsceneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setEndsceneFile(file); setEndsceneFromCache(false); updateConfig({ endscene: file, endscene_filename: file.name, endscene_url: undefined }); saveFileToCache('endscene', file); }
  };
  const handleClearBgm = () => { setBgmFile(null); setBgmFromCache(false); setBgmUrl(''); setBgmUrlError(null); updateConfig({ bgm: undefined, bgm_filename: undefined, bgm_url: undefined }); clearFileFromCache('bgm'); };
  const handleClearEndscene = () => { setEndsceneFile(null); setEndsceneFromCache(false); setEndsceneUrl(''); setEndsceneUrlError(null); updateConfig({ endscene: undefined, endscene_filename: undefined, endscene_url: undefined }); clearFileFromCache('endscene'); };

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
      setBgmFile(file); setBgmFromCache(false);
      updateConfig({ bgm: file, bgm_filename: filename, bgm_url: rawUrl });
      clearFileFromCache('bgm');
    } catch { setBgmUrlError('URLの読み込みに失敗しました（Google DriveはCORS非対応。GitHub Raw / S3推奨）'); }
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
      setEndsceneFile(file); setEndsceneFromCache(false);
      updateConfig({ endscene: file, endscene_filename: filename, endscene_url: rawUrl });
      clearFileFromCache('endscene');
    } catch { setEndsceneUrlError('URLの読み込みに失敗しました（Google DriveはCORS非対応。GitHub Raw / S3推奨）'); }
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
        title="BGM / エンディング"
        desc="バックグラウンドミュージックと末尾クリップの合成"
      />

      {/* BGM */}
      <div className="tg-grp">
        <GrpHeader>BGMファイル</GrpHeader>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!cacheLoading && !bgmFile && config.bgm_filename && (
            <Notice variant="warn">前回: {config.bgm_filename}（再選択が必要です）</Notice>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ cursor: 'pointer' }}>
              <span className="tg-btn" style={{ display: 'inline-flex' }}>ファイルを選択</span>
              <input type="file" accept="audio/*" onChange={handleBgmChange} style={{ display: 'none' }} />
            </label>
            {(bgmFile || config.bgm_filename) && (
              <button onClick={handleClearBgm} style={{ fontSize: 12, color: 'var(--tg-red)', cursor: 'pointer', background: 'none', border: 'none' }}>クリア</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url" value={bgmUrl}
              onChange={e => setBgmUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBgmUrlLoad()}
              placeholder="https://... (GitHub Raw, S3等)"
              className="tg-input"
            />
            <button onClick={handleBgmUrlLoad} disabled={bgmUrlLoading || !bgmUrl} className="tg-btn" style={{ flexShrink: 0 }}>
              {bgmUrlLoading ? '読込中...' : 'URLから読込'}
            </button>
          </div>
          {bgmUrlError && <span style={{ fontSize: 11, color: 'var(--tg-red)' }}>{bgmUrlError}</span>}
          {bgmFile && (
            <Notice variant="success">
              {bgmFromCache ? `復元: ${bgmFile.name}${config.bgm_url ? ' (URL)' : ' (キャッシュ)'}` : `選択中: ${bgmFile.name}`}
            </Notice>
          )}
        </div>
        {bgmFile && (
          <>
            <Row
              label="BGM音量"
              hint="絶対音量（推奨: -44 LUFS）"
              right={
                <SliderRow id="bgm-volume" min={-60} max={-20} step={1}
                  value={config.bgm_target_lufs}
                  onChange={v => updateConfig({ bgm_target_lufs: v })}
                  valueLabel={`${config.bgm_target_lufs} LUFS`}
                />
              }
            />
            <Row
              label="フェードイン"
              right={
                <SliderRow id="bgm-fade-in" min={0} max={10} step={0.5}
                  value={config.bgm_fade_in}
                  onChange={v => updateConfig({ bgm_fade_in: v })}
                  valueLabel={`${config.bgm_fade_in.toFixed(1)} 秒`}
                />
              }
            />
            <Row
              label="フェードアウト"
              right={
                <SliderRow id="bgm-fade-out" min={0} max={10} step={0.5}
                  value={config.bgm_fade_out}
                  onChange={v => updateConfig({ bgm_fade_out: v })}
                  valueLabel={`${config.bgm_fade_out.toFixed(1)} 秒`}
                />
              }
            />
          </>
        )}
      </div>

      {/* Endscene */}
      <div className="tg-grp">
        <GrpHeader>エンドシーンファイル</GrpHeader>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!cacheLoading && !endsceneFile && config.endscene_filename && (
            <Notice variant="warn">前回: {config.endscene_filename}（再選択が必要です）</Notice>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ cursor: 'pointer' }}>
              <span className="tg-btn" style={{ display: 'inline-flex' }}>ファイルを選択</span>
              <input type="file" accept="audio/*" onChange={handleEndsceneChange} style={{ display: 'none' }} />
            </label>
            {(endsceneFile || config.endscene_filename) && (
              <button onClick={handleClearEndscene} style={{ fontSize: 12, color: 'var(--tg-red)', cursor: 'pointer', background: 'none', border: 'none' }}>クリア</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url" value={endsceneUrl}
              onChange={e => setEndsceneUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEndsceneUrlLoad()}
              placeholder="https://... (GitHub Raw, S3等)"
              className="tg-input"
            />
            <button onClick={handleEndsceneUrlLoad} disabled={endsceneUrlLoading || !endsceneUrl} className="tg-btn" style={{ flexShrink: 0 }}>
              {endsceneUrlLoading ? '読込中...' : 'URLから読込'}
            </button>
          </div>
          {endsceneUrlError && <span style={{ fontSize: 11, color: 'var(--tg-red)' }}>{endsceneUrlError}</span>}
          {endsceneFile && (
            <Notice variant="success">
              {endsceneFromCache ? `復元: ${endsceneFile.name}${config.endscene_url ? ' (URL)' : ' (キャッシュ)'}` : `選択中: ${endsceneFile.name}`}
            </Notice>
          )}
        </div>
        {endsceneFile && (
          <Row
            label="クロスフェード"
            right={
              <SliderRow id="endscene-crossfade" min={0} max={5} step={0.5}
                value={config.endscene_crossfade}
                onChange={v => updateConfig({ endscene_crossfade: v })}
                valueLabel={`${config.endscene_crossfade.toFixed(1)} 秒`}
              />
            }
          />
        )}
      </div>
    </div>
  );
}

function ExportSection() {
  const { config, updateConfig } = useAppStore();
  return (
    <div className="flex flex-col gap-4">
      <StageHeader
        icon={
          <svg style={{ width: 21, height: 21, color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 3v13M5 10l7 7 7-7"/><path d="M4 20h16"/>
          </svg>
        }
        title="エクスポート"
        desc="出力フォーマットとビットレートの設定"
      />
      <div className="tg-grp">
        <GrpHeader>フォーマット</GrpHeader>
        <Row
          label="出力形式"
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
            label="ビットレート"
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
      <Notice>192kbps はポッドキャストの標準ビットレートです。配信プラットフォームが圧縮するため、320kbps の効果は限定的です。</Notice>
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
