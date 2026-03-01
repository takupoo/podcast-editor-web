'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export function Footer() {
  const { t, tf } = useTranslation();
  const year = new Date().getFullYear();

  const links = [
    { href: '/privacy', label: t('footer.privacyPolicy') },
    { href: '/terms', label: t('footer.termsOfService') },
    { href: '/legal/sctl', label: t('footer.sctl') },
    { href: '/pricing', label: t('footer.pricing') },
  ];

  return (
    <footer
      className="w-full mt-auto"
      style={{
        background: 'rgba(0, 0, 8, 0.3)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs transition-colors hover:underline"
                style={{ color: 'var(--tg-t2)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p
            className="text-xs"
            style={{ color: 'var(--tg-t3)' }}
          >
            {tf('footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
