'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

interface SctlRow {
  labelKey: TranslationKey;
  valueKey: TranslationKey;
}

const rows: SctlRow[] = [
  { labelKey: 'sctl.businessName', valueKey: 'sctl.businessNameValue' },
  { labelKey: 'sctl.representative', valueKey: 'sctl.representativeValue' },
  { labelKey: 'sctl.address', valueKey: 'sctl.addressValue' },
  { labelKey: 'sctl.phone', valueKey: 'sctl.phoneValue' },
  { labelKey: 'sctl.email', valueKey: 'sctl.emailValue' },
  { labelKey: 'sctl.price', valueKey: 'sctl.priceValue' },
  { labelKey: 'sctl.payment', valueKey: 'sctl.paymentValue' },
  { labelKey: 'sctl.paymentTiming', valueKey: 'sctl.paymentTimingValue' },
  { labelKey: 'sctl.delivery', valueKey: 'sctl.deliveryValue' },
  { labelKey: 'sctl.cancellation', valueKey: 'sctl.cancellationValue' },
  { labelKey: 'sctl.environment', valueKey: 'sctl.environmentValue' },
];

export default function SctlPage() {
  const { t, tf } = useTranslation();

  return (
    <div className="tg-root min-h-screen">
      <div className="mx-auto max-w-[800px] px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
          style={{ color: 'var(--tg-t2)' }}
        >
          <span>&#8592;</span>
          <span>{t('legal.backToHome')}</span>
        </Link>

        <div
          className="rounded-2xl p-8 md:p-12"
          style={{
            background: 'rgba(20, 20, 28, 0.85)',
            backdropFilter: 'blur(20px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <h1
            className="text-3xl font-bold mb-3"
            style={{ color: 'var(--tg-t1)' }}
          >
            {t('sctl.title')}
          </h1>
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--tg-t3)' }}
          >
            {tf('legal.lastUpdated', { date: '2026-03-02' })}
          </p>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {rows.map((row, i) => (
              <div
                key={row.labelKey}
                className="flex flex-col sm:flex-row"
                style={{
                  borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                }}
              >
                <div
                  className="px-5 py-3.5 sm:w-[200px] shrink-0 text-sm font-medium"
                  style={{
                    color: 'var(--tg-t1)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  {t(row.labelKey)}
                </div>
                <div
                  className="px-5 py-3.5 text-sm flex-1"
                  style={{ color: 'var(--tg-t2)' }}
                >
                  {t(row.valueKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
