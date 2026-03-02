'use client';

import { useTranslation, useLocaleStore } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Icons ──────────────────────────────────────────────────────
const ArrowLeft = () => (
    <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M10 3L5 8l5 5" />
    </svg>
);

const StepIcon = ({ num, color }: { num: string; color: string }) => (
    <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        border: `2px solid color-mix(in srgb, ${color} 40%, transparent)`,
        color, fontSize: 16, fontWeight: 700,
    }}>{num}</div>
);

// ── Section component ──────────────────────────────────────────
function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
    return (
        <section id={id} style={{ marginBottom: 32 }}>
            <h2 style={{
                fontSize: 18, fontWeight: 700, color: 'var(--tg-t1)',
                letterSpacing: '-0.3px', marginBottom: 14,
                paddingBottom: 10,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>{title}</h2>
            {children}
        </section>
    );
}

// ── FAQ Item ───────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, marginBottom: 8, overflow: 'hidden',
        }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%', padding: '13px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: 'var(--tg-t1)', textAlign: 'left',
                }}
            >
                {q}
                <span style={{
                    fontSize: 11, color: 'var(--tg-t3)',
                    transform: open ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                }}>▸</span>
            </button>
            {open && (
                <div style={{
                    padding: '0 16px 14px',
                    fontSize: 12, color: 'var(--tg-t2)', lineHeight: 1.7,
                }}>
                    {a}
                </div>
            )}
        </div>
    );
}

// ── Setting card ───────────────────────────────────────────────
function SettingCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
    return (
        <div style={{
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-t1)' }}>{title}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6 }}>{desc}</p>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────
export default function GuidePage() {
    const { t, locale } = useTranslation();
    const setLocale = useLocaleStore((s) => s.setLocale);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    useEffect(() => { document.documentElement.lang = locale; }, [locale]);

    return (
        <div className="tg-root" style={{ minHeight: '100dvh' }}>
            <div className="tg-window" style={{ minHeight: '100dvh' }}>
                <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0 20px' }}>

                    {/* ── Header ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', height: 56,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <Link href="/" style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 12, fontWeight: 500, color: 'var(--tg-accent)',
                            textDecoration: 'none', transition: 'opacity 0.15s',
                        }}>
                            <ArrowLeft />
                            {t('guide.backToApp')}
                        </Link>
                        <div style={{ flex: 1 }} />
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

                    {/* ── Hero ── */}
                    <div style={{ padding: '40px 0 32px', textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>🎙️</div>
                        <h1 style={{
                            fontSize: 26, fontWeight: 700, color: 'var(--tg-t1)',
                            letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: 10,
                        }}>
                            {t('guide.heroTitle')}
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--tg-t2)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
                            {t('guide.heroDesc')}
                        </p>
                    </div>

                    {/* ── Table of Contents ── */}
                    <nav style={{
                        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32,
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 14,
                    }}>
                        {[
                            { href: '#basic-flow', label: t('guide.basicFlowTitle') },
                            { href: '#preparation', label: t('guide.preparationTitle') },
                            { href: '#toolbar', label: t('guide.toolbarTitle') },
                            { href: '#settings', label: t('guide.settingsTitle') },
                            { href: '#pipeline', label: t('guide.pipelineTitle') },
                            { href: '#faq', label: t('guide.faqTitle') },
                        ].map(item => (
                            <a key={item.href} href={item.href} style={{
                                fontSize: 12, fontWeight: 500, color: 'var(--tg-accent)',
                                padding: '5px 12px', borderRadius: 8,
                                background: 'rgba(10,132,255,0.08)',
                                border: '1px solid rgba(10,132,255,0.15)',
                                textDecoration: 'none', transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                            }}>{item.label}</a>
                        ))}
                    </nav>

                    {/* ── Basic Flow ── */}
                    <Section title={t('guide.basicFlowTitle')} id="basic-flow">
                        <p style={{ fontSize: 13, color: 'var(--tg-t2)', lineHeight: 1.7, marginBottom: 20 }}>
                            {t('guide.basicFlowDesc')}
                        </p>
                        {/* Step 1 */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
                            <StepIcon num="1" color="var(--tg-accent)" />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--tg-t1)', marginBottom: 4 }}>
                                    {t('guide.step1Title')}
                                </h3>
                                <p style={{ fontSize: 13, color: 'var(--tg-t2)', marginBottom: 6 }}>{t('guide.step1Desc')}</p>
                                <p style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6 }}>{t('guide.step1Detail')}</p>
                            </div>
                        </div>
                        {/* Arrow */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <svg style={{ width: 16, height: 16, color: 'var(--tg-t3)' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 3v10M4 9l4 4 4-4" /></svg>
                        </div>
                        {/* Step 2 */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
                            <StepIcon num="2" color="var(--tg-green)" />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--tg-t1)', marginBottom: 4 }}>
                                    {t('guide.step2Title')}
                                </h3>
                                <p style={{ fontSize: 13, color: 'var(--tg-t2)', marginBottom: 6 }}>{t('guide.step2Desc')}</p>
                                <p style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6 }}>{t('guide.step2Detail')}</p>
                            </div>
                        </div>
                        {/* Arrow */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <svg style={{ width: 16, height: 16, color: 'var(--tg-t3)' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 3v10M4 9l4 4 4-4" /></svg>
                        </div>
                        {/* Step 3 */}
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <StepIcon num="3" color="#bf5af2" />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--tg-t1)', marginBottom: 4 }}>
                                    {t('guide.step3Title')}
                                </h3>
                                <p style={{ fontSize: 13, color: 'var(--tg-t2)', marginBottom: 6 }}>{t('guide.step3Desc')}</p>
                                <p style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6 }}>{t('guide.step3Detail')}</p>
                            </div>
                        </div>
                    </Section>

                    {/* ── Preparation ── */}
                    <Section title={t('guide.preparationTitle')} id="preparation">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{
                                padding: '16px 18px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 12,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 18 }}>📁</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-t1)' }}>{t('guide.formatTitle')}</span>
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6 }}>{t('guide.formatDesc')}</p>
                            </div>
                            <div style={{
                                padding: '16px 18px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 12,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 18 }}>👏</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-t1)' }}>{t('guide.clapTitle')}</span>
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6 }}>{t('guide.clapDesc')}</p>
                            </div>
                        </div>
                    </Section>

                    {/* ── Toolbar ── */}
                    <Section title={t('guide.toolbarTitle')} id="toolbar">
                        <p style={{ fontSize: 13, color: 'var(--tg-t2)', lineHeight: 1.7, marginBottom: 16 }}>
                            {t('guide.toolbarDesc')}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { icon: '⚡', title: t('guide.toolbarPreview'), desc: t('guide.toolbarPreviewDesc') },
                                { icon: '💾', title: t('guide.toolbarPresets'), desc: t('guide.toolbarPresetsDesc') },
                                { icon: '🔄', title: t('guide.toolbarReset'), desc: t('guide.toolbarResetDesc') },
                            ].map((item) => (
                                <div key={item.title} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                    padding: '13px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 12,
                                }}>
                                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-t1)', marginBottom: 3 }}>{item.title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6 }}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* ── Settings ── */}
                    <Section title={t('guide.settingsTitle')} id="settings">
                        <p style={{ fontSize: 13, color: 'var(--tg-t2)', lineHeight: 1.7, marginBottom: 16 }}>
                            {t('guide.settingsDesc')}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <SettingCard icon="🔍" title={t('guide.settingsTrim')} desc={t('guide.settingsTrimDesc')} />
                            <SettingCard icon="🎛️" title={t('guide.settingsProcessing')} desc={t('guide.settingsProcessingDesc')} />
                            <SettingCard icon="🔇" title={t('guide.settingsSilence')} desc={t('guide.settingsSilenceDesc')} />
                            <SettingCard icon="🎵" title={t('guide.settingsMix')} desc={t('guide.settingsMixDesc')} />
                            <SettingCard icon="✂️" title={t('guide.settingsCut')} desc={t('guide.settingsCutDesc')} />
                            <SettingCard icon="📦" title={t('guide.settingsExport')} desc={t('guide.settingsExportDesc')} />
                        </div>
                    </Section>

                    {/* ── Pipeline ── */}
                    <Section title={t('guide.pipelineTitle')} id="pipeline">
                        <div style={{
                            padding: '18px 20px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 14,
                        }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                {[
                                    { label: 'Trim', emoji: '🔍', color: 'var(--tg-accent)' },
                                    { label: 'Denoise', emoji: '🔇', color: 'var(--tg-accent)' },
                                    { label: 'Loudness', emoji: '📢', color: 'var(--tg-accent)' },
                                    { label: 'Dynamics', emoji: '🎚️', color: 'var(--tg-accent)' },
                                    { label: 'Mix', emoji: '🎵', color: 'var(--tg-accent)' },
                                    { label: 'BGM', emoji: '🎶', color: '#5856d6', optional: true },
                                    { label: 'End', emoji: '🎬', color: '#5856d6', optional: true },
                                    { label: 'Export', emoji: '📦', color: 'var(--tg-green)' },
                                ].map((stage, i, arr) => (
                                    <div key={stage.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            padding: '6px 10px', borderRadius: 8,
                                            background: `color-mix(in srgb, ${stage.color} 12%, transparent)`,
                                            border: `1px solid color-mix(in srgb, ${stage.color} 25%, transparent)`,
                                        }}>
                                            <span style={{ fontSize: 13 }}>{stage.emoji}</span>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tg-t1)' }}>
                                                {stage.label}
                                                {stage.optional && <span style={{ fontSize: 9, color: 'var(--tg-t3)', marginLeft: 3 }}>opt</span>}
                                            </span>
                                        </div>
                                        {i < arr.length - 1 && (
                                            <span style={{ fontSize: 11, color: 'var(--tg-t3)' }}>→</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--tg-t3)', lineHeight: 1.6, marginTop: 14 }}>
                                {t('guide.pipelineDesc')}
                            </p>
                        </div>
                    </Section>

                    {/* ── FAQ ── */}
                    <Section title={t('guide.faqTitle')} id="faq">
                        <FaqItem q={t('guide.faqClapQ')} a={t('guide.faqClapA')} />
                        <FaqItem q={t('guide.faqNoiseQ')} a={t('guide.faqNoiseA')} />
                        <FaqItem q={t('guide.faqBgmQ')} a={t('guide.faqBgmA')} />
                        <FaqItem q={t('guide.faqBrowserQ')} a={t('guide.faqBrowserA')} />
                        <FaqItem q={t('guide.faqShareQ')} a={t('guide.faqShareA')} />
                    </Section>

                    {/* ── Back to app ── */}
                    <div style={{ textAlign: 'center', padding: '16px 0 48px' }}>
                        <Link href="/" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '10px 24px', fontSize: 13, fontWeight: 600,
                            color: '#fff',
                            background: 'linear-gradient(180deg, rgba(10,148,255,0.95), rgba(0,105,220,0.95))',
                            border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10,
                            textDecoration: 'none',
                            boxShadow: '0 4px 16px rgba(0,90,200,0.4)',
                            transition: 'all 0.15s',
                        }}>
                            <ArrowLeft />
                            {t('guide.backToApp')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
