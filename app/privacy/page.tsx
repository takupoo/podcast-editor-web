'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function PrivacyPolicyPage() {
  const { t, tf } = useTranslation();

  const sections = [
    { title: t('privacy.dataHandlingTitle'), body: t('privacy.dataHandlingDesc') },
    { title: t('privacy.authDataTitle'), body: t('privacy.authDataDesc') },
    { title: t('privacy.paymentDataTitle'), body: t('privacy.paymentDataDesc') },
    { title: t('privacy.cookieTitle'), body: t('privacy.cookieDesc') },
    { title: t('privacy.logsTitle'), body: t('privacy.logsDesc') },
    {
      title: t('privacy.thirdPartyTitle'),
      body: t('privacy.thirdPartyDesc'),
      list: [
        t('privacy.thirdPartyClerk'),
        t('privacy.thirdPartyStripe'),
        t('privacy.thirdPartyVercel'),
      ],
    },
    { title: t('privacy.userRightsTitle'), body: t('privacy.userRightsDesc') },
    { title: t('privacy.contactTitle'), body: t('privacy.contactDesc') },
  ];

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
            {t('privacy.title')}
          </h1>
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--tg-t3)' }}
          >
            {tf('legal.lastUpdated', { date: '2026-03-02' })}
          </p>

          <p
            className="text-sm leading-relaxed mb-8"
            style={{ color: 'var(--tg-t2)' }}
          >
            {t('privacy.intro')}
          </p>

          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h2
                  className="text-lg font-semibold mb-3"
                  style={{ color: 'var(--tg-t1)' }}
                >
                  {section.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--tg-t2)' }}
                >
                  {section.body}
                </p>
                {section.list && (
                  <ul className="mt-3 space-y-1.5">
                    {section.list.map((item) => (
                      <li
                        key={item}
                        className="text-sm leading-relaxed flex items-start gap-2"
                        style={{ color: 'var(--tg-t2)' }}
                      >
                        <span style={{ color: 'var(--tg-accent)' }}>&#8226;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
