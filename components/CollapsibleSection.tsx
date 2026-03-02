'use client';

interface CollapsibleSectionProps {
  title: string;
  /** ステータスドット: 'on' = 緑, 'off' = グレー, null = 非表示 */
  dot?: 'on' | 'off' | null;
  /** デフォルトで開くかどうか */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, dot, defaultOpen, children }: CollapsibleSectionProps) {
  return (
    <details className="tg-collapsible" open={defaultOpen || undefined}>
      <summary className="tg-collapsible-summary">
        <span className="tg-collapsible-title">{title}</span>
        {dot !== null && dot !== undefined && (
          <span className={`tg-dot ${dot === 'on' ? 'tg-dot-on' : 'tg-dot-off'}`} style={{ marginLeft: 'auto', flexShrink: 0 }} />
        )}
      </summary>
      <div className="tg-collapsible-content">
        {children}
      </div>
    </details>
  );
}
