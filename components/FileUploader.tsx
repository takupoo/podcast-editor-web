'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  fileA: File | null;
  fileB: File | null;
  onFileAChange: (file: File | null) => void;
  onFileBChange: (file: File | null) => void;
}

function DropZone({
  label,
  file,
  onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted.length > 0) onFile(accepted[0]); },
    [onFile]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
    multiple: false,
  });

  const hasFfile = !!file;

  return (
    <div
      {...getRootProps()}
      style={{
        flex: 1,
        border: `1.5px dashed ${hasFfile ? 'rgba(48,209,88,0.5)' : isDragActive ? 'rgba(10,132,255,0.6)' : 'rgba(255,255,255,0.14)'}`,
        borderRadius: 14,
        padding: '28px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        transition: 'all 0.18s',
        background: hasFfile
          ? 'rgba(48,209,88,0.06)'
          : isDragActive
            ? 'rgba(10,132,255,0.06)'
            : 'rgba(255,255,255,0.02)',
      }}
    >
      <input {...getInputProps()} />

      {/* Icon */}
      {hasFfile ? (
        <svg style={{ width: 36, height: 36, color: 'var(--tg-green)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
        </svg>
      ) : (
        <svg style={{ width: 36, height: 36, color: 'var(--tg-t3)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      )}

      {/* Label */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-t1)' }}>{label}</div>

      {/* State */}
      {hasFfile ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--tg-green)', fontWeight: 500 }}>選択済み</div>
          <div style={{ fontSize: 11, color: 'var(--tg-t2)', marginTop: 3, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
          <div style={{ fontSize: 11, color: 'var(--tg-t3)', marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--tg-t2)' }}>
            {isDragActive ? 'ここにドロップ' : 'ドロップまたはクリックして選択'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tg-t3)' }}>MP3 · WAV · M4A</div>
        </>
      )}
    </div>
  );
}

export function FileUploader({ fileA, fileB, onFileAChange, onFileBChange }: FileUploaderProps) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <DropZone label="話者 A" file={fileA} onFile={onFileAChange} />
      <DropZone label="話者 B" file={fileB} onFile={onFileBChange} />
    </div>
  );
}
