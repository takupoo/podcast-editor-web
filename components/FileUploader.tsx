'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

export function FileUploader({ files, onFilesChange, onRemoveFile }: FileUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        onFilesChange([...files, ...accepted]);
      }
    },
    [files, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
    multiple: true,
  });

  const hasFiles = files.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `1.5px dashed ${hasFiles ? 'rgba(48,209,88,0.5)' : isDragActive ? 'rgba(10,132,255,0.6)' : 'rgba(255,255,255,0.14)'}`,
          borderRadius: 14,
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          transition: 'all 0.18s',
          background: isDragActive
            ? 'rgba(10,132,255,0.06)'
            : 'rgba(255,255,255,0.02)',
        }}
      >
        <input {...getInputProps()} />

        {/* Icon */}
        <svg style={{ width: 40, height: 40, color: 'var(--tg-t3)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>

        {/* Text */}
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-t1)' }}>音声ファイルを追加</div>
        <div style={{ fontSize: 12, color: 'var(--tg-t2)', textAlign: 'center' }}>
          {isDragActive ? 'ここにドロップ' : '複数ファイルをドロップまたはクリックして選択'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tg-t3)' }}>MP3 · WAV · M4A</div>
      </div>

      {/* File list */}
      {hasFiles && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: 'rgba(48,209,88,0.06)',
                border: '1px solid rgba(48,209,88,0.2)',
                borderRadius: 10,
              }}
            >
              {/* Icon */}
              <svg style={{ width: 18, height: 18, color: 'var(--tg-green)', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
              </svg>

              {/* File info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tg-t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tg-t3)', marginTop: 1 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFile(index);
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--tg-t2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,69,58,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255,69,58,0.3)';
                  e.currentTarget.style.color = 'var(--tg-red)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'var(--tg-t2)';
                }}
              >
                <svg style={{ width: 12, height: 12 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="4" x2="4" y2="12"/><line x1="4" y1="4" x2="12" y2="12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
