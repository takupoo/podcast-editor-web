'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';

const ONBOARDING_KEY = 'spectratrek-onboarding-seen';

export function useOnboarding() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const seen = localStorage.getItem(ONBOARDING_KEY);
            if (!seen) setShow(true);
        }
    }, []);
    const dismiss = useCallback(() => {
        setShow(false);
        localStorage.setItem(ONBOARDING_KEY, '1');
    }, []);
    return { show, dismiss };
}

// ── Icons ──────────────────────────────────────────────────────
const UploadIcon = () => (
    <svg style={{ width: 32, height: 32 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);
const ProcessIcon = () => (
    <svg style={{ width: 32, height: 32 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);
const DownloadIcon = () => (
    <svg style={{ width: 32, height: 32 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const NoiseIcon = () => (
    <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 12h2m3-5h2v10H7zm5-3h2v16h-2zm5 5h2v6h-2zm5-2h2v10h-2z" />
    </svg>
);
const BrowserIcon = () => (
    <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><circle cx="6.5" cy="6" r=".5" fill="currentColor" /><circle cx="9" cy="6" r=".5" fill="currentColor" />
    </svg>
);
const FreeIcon = () => (
    <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
);

// ── Slide data ─────────────────────────────────────────────────
interface SlideProps {
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
}

function WelcomeSlide({ onNext, onSkip }: Pick<SlideProps, 'onNext' | 'onSkip'>) {
    const { t } = useTranslation();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '8px 0' }}>
            {/* Hero icon */}
            <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(10,132,255,0.3), rgba(48,209,88,0.3))',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36,
            }}>
                🎙️
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tg-t1)', letterSpacing: '-0.5px' }}>
                {t('onboarding.welcome')}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--tg-t2)', lineHeight: 1.7, maxWidth: 360 }}>
                {t('onboarding.welcomeDesc')}
            </p>
            {/* Feature badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 4 }}>
                {[
                    { icon: <NoiseIcon />, title: t('onboarding.featureNoDenoise'), desc: t('onboarding.featureNoDenoiseDesc'), color: 'var(--tg-accent)' },
                    { icon: <BrowserIcon />, title: t('onboarding.featureBrowser'), desc: t('onboarding.featureBrowserDesc'), color: 'var(--tg-green)' },
                    { icon: <FreeIcon />, title: t('onboarding.featureFree'), desc: t('onboarding.featureFreeDesc'), color: 'var(--tg-orange)' },
                ].map(f => (
                    <div key={f.title} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 12, textAlign: 'left',
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `color-mix(in srgb, ${f.color} 15%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${f.color} 25%, transparent)`,
                            color: f.color,
                        }}>{f.icon}</div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-t1)' }}>{f.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--tg-t3)', marginTop: 2, lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8, width: '100%' }}>
                <button onClick={onSkip} style={{
                    flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
                    color: 'var(--tg-t2)', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
                    cursor: 'pointer', transition: 'background 0.15s',
                }}>{t('onboarding.skip')}</button>
                <button onClick={onNext} style={{
                    flex: 2, padding: '10px 0', fontSize: 13, fontWeight: 600,
                    color: '#fff',
                    background: 'linear-gradient(180deg, rgba(10,148,255,0.95), rgba(0,105,220,0.95))',
                    border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: '0 4px 16px rgba(0,90,200,0.4)',
                }}>{t('onboarding.next')}</button>
            </div>
        </div>
    );
}

function StepSlide({ stepIndex, totalSteps, onNext, onBack, onSkip }: SlideProps) {
    const { t } = useTranslation();
    const steps = [
        { icon: <UploadIcon />, title: t('onboarding.step1Title'), desc: t('onboarding.step1Desc'), color: 'var(--tg-accent)', num: '1' },
        { icon: <ProcessIcon />, title: t('onboarding.step2Title'), desc: t('onboarding.step2Desc'), color: 'var(--tg-green)', num: '2' },
        { icon: <DownloadIcon />, title: t('onboarding.step3Title'), desc: t('onboarding.step3Desc'), color: '#bf5af2', num: '3' },
    ];
    const step = steps[stepIndex];
    const isLast = stepIndex === steps.length - 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '8px 0' }}>
            {/* Step indicator */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tg-t3)', letterSpacing: '0.5px' }}>
                {t('onboarding.stepOf').replace('{current}', String(stepIndex + 1)).replace('{total}', String(totalSteps))}
            </div>
            {/* Icon */}
            <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: `color-mix(in srgb, ${step.color} 18%, transparent)`,
                border: `2px solid color-mix(in srgb, ${step.color} 40%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: step.color,
            }}>
                {step.icon}
            </div>
            {/* Step number */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{
                    fontSize: 12, fontWeight: 700, color: step.color,
                    background: `color-mix(in srgb, ${step.color} 15%, transparent)`,
                    borderRadius: 6, padding: '2px 10px',
                }}>STEP {step.num}</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--tg-t1)', letterSpacing: '-0.3px' }}>
                {step.title}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--tg-t2)', lineHeight: 1.7, maxWidth: 360 }}>
                {step.desc}
            </p>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {steps.map((_, i) => (
                    <div key={i} style={{
                        width: i === stepIndex ? 20 : 6, height: 6, borderRadius: 3,
                        background: i === stepIndex ? step.color : 'rgba(255,255,255,0.15)',
                        transition: 'all 0.2s',
                    }} />
                ))}
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8, width: '100%' }}>
                <button onClick={onBack} style={{
                    flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
                    color: 'var(--tg-t2)', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
                    cursor: 'pointer', transition: 'background 0.15s',
                }}>{t('onboarding.back')}</button>
                <button onClick={isLast ? onSkip : onNext} style={{
                    flex: 2, padding: '10px 0', fontSize: 13, fontWeight: 600,
                    color: '#fff',
                    background: isLast
                        ? 'linear-gradient(180deg, rgba(48,209,88,0.95), rgba(30,180,70,0.95))'
                        : 'linear-gradient(180deg, rgba(10,148,255,0.95), rgba(0,105,220,0.95))',
                    border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: isLast ? '0 4px 16px rgba(48,209,88,0.4)' : '0 4px 16px rgba(0,90,200,0.4)',
                }}>{isLast ? t('onboarding.getStarted') : t('onboarding.next')}</button>
            </div>
            {!isLast && (
                <button onClick={onSkip} style={{
                    fontSize: 11, color: 'var(--tg-t3)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 8px',
                }}>{t('onboarding.skip')}</button>
            )}
        </div>
    );
}

// ── Main modal ─────────────────────────────────────────────────
export function OnboardingWizard({ onClose }: { onClose: () => void }) {
    const [slide, setSlide] = useState(0); // 0=welcome, 1-3=steps

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    width: '100%', maxWidth: 440,
                    margin: '0 20px',
                    background: 'rgba(28, 28, 36, 0.96)',
                    backdropFilter: 'blur(40px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 20,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                    padding: '28px 28px 24px',
                    overflowY: 'auto',
                    maxHeight: 'calc(100dvh - 80px)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                    animation: 'slideUp 0.25s ease-out',
                }}
            >
                {slide === 0 ? (
                    <WelcomeSlide
                        onNext={() => setSlide(1)}
                        onSkip={onClose}
                    />
                ) : (
                    <StepSlide
                        stepIndex={slide - 1}
                        totalSteps={3}
                        onNext={() => setSlide(s => s + 1)}
                        onBack={() => setSlide(s => s - 1)}
                        onSkip={onClose}
                    />
                )}
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
}
