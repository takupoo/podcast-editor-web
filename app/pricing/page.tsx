'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function PricingPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    try {
      setLoading(priceId);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="tg-root flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-colors"
          style={{ color: 'var(--tg-t2)' }}
        >
          <ArrowLeft size={16} />
          {t('pricing.backToApp')}
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-3xl font-bold mb-3"
            style={{ color: 'var(--tg-t1)' }}
          >
            {t('pricing.title')}
          </h1>
          <p
            className="text-base"
            style={{ color: 'var(--tg-t2)' }}
          >
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div
            className="tg-grp p-6 flex flex-col"
          >
            <div className="mb-6">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: 'rgba(48, 209, 88, 0.12)',
                  color: '#30D158',
                  border: '1px solid rgba(48, 209, 88, 0.25)',
                }}
              >
                {t('pricing.freeBadge')}
              </div>
              <h2
                className="text-xl font-bold mb-1"
                style={{ color: 'var(--tg-t1)' }}
              >
                {t('pricing.freeTitle')}
              </h2>
              <p
                className="text-sm"
                style={{ color: 'var(--tg-t2)' }}
              >
                {t('pricing.freeDesc')}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span
                  className="text-3xl font-bold"
                  style={{ color: 'var(--tg-t1)' }}
                >
                  ¥0
                </span>
                <span
                  className="text-sm"
                  style={{ color: 'var(--tg-t3)' }}
                >
                  / {t('pricing.month')}
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {(['freeFeature1', 'freeFeature2', 'freeFeature3'] as const).map(
                (key) => (
                  <li key={key} className="flex items-start gap-3">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0"
                      style={{ color: '#30D158' }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: 'var(--tg-t2)' }}
                    >
                      {t(`pricing.${key}`)}
                    </span>
                  </li>
                )
              )}
            </ul>

            <Link
              href="/"
              className="tg-btn justify-center py-2.5 text-center text-sm font-medium w-full"
            >
              {t('pricing.freeCta')}
            </Link>
          </div>

          {/* Pro Plan */}
          <div
            className="tg-grp p-6 flex flex-col relative overflow-hidden"
            style={{
              border: '1px solid rgba(10, 132, 255, 0.30)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(10, 132, 255, 0.15), 0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {/* Glow accent */}
            <div
              className="absolute -top-24 -right-24 w-48 h-48 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(10,132,255,0.15) 0%, transparent 70%)',
              }}
            />

            <div className="mb-6 relative">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: 'rgba(10, 132, 255, 0.15)',
                  color: '#0A84FF',
                  border: '1px solid rgba(10, 132, 255, 0.30)',
                }}
              >
                <Zap size={12} />
                {t('pricing.proBadge')}
              </div>
              <h2
                className="text-xl font-bold mb-1"
                style={{ color: 'var(--tg-t1)' }}
              >
                {t('pricing.proTitle')}
              </h2>
              <p
                className="text-sm"
                style={{ color: 'var(--tg-t2)' }}
              >
                {t('pricing.proDesc')}
              </p>
            </div>

            <div className="mb-6 relative">
              <div className="flex items-baseline gap-1">
                <span
                  className="text-3xl font-bold"
                  style={{ color: 'var(--tg-t1)' }}
                >
                  ¥980
                </span>
                <span
                  className="text-sm"
                  style={{ color: 'var(--tg-t3)' }}
                >
                  / {t('pricing.month')}
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1 relative">
              {(
                [
                  'proFeature1',
                  'proFeature2',
                  'proFeature3',
                  'proFeature4',
                ] as const
              ).map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0"
                    style={{ color: '#0A84FF' }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: 'var(--tg-t2)' }}
                  >
                    {t(`pricing.${key}`)}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() =>
                handleCheckout(
                  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro'
                )
              }
              disabled={loading !== null}
              className="tg-btn tg-btn-primary justify-center py-2.5 text-center text-sm w-full"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t('pricing.proCta')
              )}
            </button>
          </div>
        </div>

        {/* FAQ / Notice */}
        <div className="mt-10 max-w-3xl mx-auto">
          <div className="tg-notice">
            <span style={{ color: 'var(--tg-t2)' }}>
              {t('pricing.notice')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
