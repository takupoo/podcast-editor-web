'use client';

interface ResultDownloadProps {
  blob: Blob;
  filename?: string;
}

export function ResultDownload({
  blob,
  filename = 'podcast_output.mp3',
}: ResultDownloadProps) {
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
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="text-xl font-semibold text-green-600 mb-4">
          ✓ 処理完了！
        </div>
        <div className="mb-4 text-sm text-gray-600">
          サイズ: {(blob.size / 1024 / 1024).toFixed(2)} MB
        </div>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          ダウンロード
        </button>
      </div>
    </div>
  );
}
