'use client';

interface ResultDownloadProps {
  blob: Blob;
  filename?: string;
}

export function ResultDownload({ blob, filename = 'podcast_output.mp3' }: ResultDownloadProps) {
  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tg-grp" style={{ padding: 20, textAlign: 'center' }}>
      {/* Success icon */}
      <div style={{ marginBottom: 12 }}>
        <svg
          style={{ width: 40, height: 40, color: 'var(--tg-green)', display: 'inline-block' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        >
          <path d="M9 12l2 2 4-4"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tg-green)', marginBottom: 4 }}>処理完了！</div>
      <div style={{ fontSize: 12, color: 'var(--tg-t2)', marginBottom: 16 }}>
        {(blob.size / 1024 / 1024).toFixed(2)} MB
      </div>
      <button
        onClick={handleDownload}
        className="tg-btn tg-btn-primary"
        style={{ margin: '0 auto', fontSize: 14, padding: '8px 28px' }}
      >
        <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 2v9M4 8l4 4 4-4M2 13h12"/>
        </svg>
        ダウンロード
      </button>
    </div>
  );
}
