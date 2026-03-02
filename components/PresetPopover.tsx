'use client';

import { useState, useRef, useEffect } from 'react';
import { usePresetStore } from '@/lib/presets';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';

export function PresetPopover() {
  const { t } = useTranslation();
  const { presets, savePreset, loadPreset, deletePreset } = usePresetStore();
  const activePresetId = useAppStore((s) => s.activePresetId);
  const resetConfig = useAppStore((s) => s.resetConfig);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSaving(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (saving && inputRef.current) {
      inputRef.current.focus();
    }
  }, [saving]);

  const activePreset = presets.find((p) => p.id === activePresetId);
  const buttonLabel = activePreset ? activePreset.name : t('presets.custom');

  const handleSave = () => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim());
    setPresetName('');
    setSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleLoadDefault = () => {
    resetConfig();
    setOpen(false);
  };

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        className="tg-btn"
        onClick={() => setOpen(!open)}
        style={{ gap: 5 }}
      >
        <svg style={{ width: 12, height: 12 }} viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z"/>
        </svg>
        {buttonLabel}
        {showSaved && (
          <span style={{ fontSize: 10, color: 'var(--tg-green)', fontWeight: 600 }}>
            {t('presets.saved')}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 6,
          width: 280,
          background: 'rgba(28, 28, 36, 0.96)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px 8px',
            fontSize: 12, fontWeight: 600, color: 'var(--tg-t2)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {t('presets.title')}
          </div>

          {/* Preset list */}
          <div style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {/* Default */}
            <button
              onClick={handleLoadDefault}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', fontSize: 13, color: 'var(--tg-t2)',
                background: !activePresetId ? 'rgba(10,132,255,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = !activePresetId ? 'rgba(10,132,255,0.08)' : 'transparent'}
            >
              <span style={{ flex: 1 }}>{t('presets.default')}</span>
            </button>

            {/* User presets */}
            {presets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 6px 4px 14px',
                  background: activePresetId === preset.id ? 'rgba(10,132,255,0.08)' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = activePresetId === preset.id ? 'rgba(10,132,255,0.08)' : 'transparent'}
              >
                <button
                  onClick={() => { loadPreset(preset.id); setOpen(false); }}
                  style={{
                    flex: 1, fontSize: 13, color: 'var(--tg-t1)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', padding: '4px 0',
                  }}
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--tg-t3)', flexShrink: 0,
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--tg-red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--tg-t3)'}
                  title={t('presets.delete')}
                >
                  <svg style={{ width: 12, height: 12 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8"/>
                  </svg>
                </button>
              </div>
            ))}

            {presets.length === 0 && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--tg-t3)' }}>
                {t('presets.noPresets')}
              </div>
            )}
          </div>

          {/* Save section */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 14px',
          }}>
            {saving ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder={t('presets.namePlaceholder')}
                  className="tg-input"
                  style={{ fontSize: 12, padding: '4px 8px' }}
                />
                <button
                  className="tg-btn tg-btn-primary"
                  onClick={handleSave}
                  disabled={!presetName.trim()}
                  style={{ fontSize: 11, padding: '4px 12px' }}
                >
                  {t('presets.save')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSaving(true)}
                style={{
                  width: '100%', padding: '6px 10px',
                  fontSize: 12, fontWeight: 500, color: 'var(--tg-accent)',
                  background: 'rgba(10,132,255,0.08)',
                  border: '1px solid rgba(10,132,255,0.18)',
                  borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,132,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,132,255,0.08)'}
              >
                {t('presets.save')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
