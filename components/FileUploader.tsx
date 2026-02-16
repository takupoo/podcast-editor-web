'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  fileA: File | null;
  fileB: File | null;
  onFileAChange: (file: File | null) => void;
  onFileBChange: (file: File | null) => void;
}

export function FileUploader({
  fileA,
  fileB,
  onFileAChange,
  onFileBChange,
}: FileUploaderProps) {
  const onDropA = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileAChange(acceptedFiles[0]);
      }
    },
    [onFileAChange]
  );

  const onDropB = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileBChange(acceptedFiles[0]);
      }
    },
    [onFileBChange]
  );

  const { getRootProps: getRootPropsA, getInputProps: getInputPropsA } =
    useDropzone({
      onDrop: onDropA,
      accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
      multiple: false,
    });

  const { getRootProps: getRootPropsB, getInputProps: getInputPropsB } =
    useDropzone({
      onDrop: onDropB,
      accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
      multiple: false,
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 話者A */}
      <div
        {...getRootPropsA()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${
            fileA
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputPropsA()} />
        <div className="text-lg font-semibold mb-2">話者A</div>
        {fileA ? (
          <div>
            <div className="text-sm text-gray-600 mb-1">✓ 選択済み</div>
            <div className="text-xs text-gray-500 truncate">{fileA.name}</div>
            <div className="text-xs text-gray-400 mt-1">
              {(fileA.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            ファイルをドロップまたはクリックして選択
          </div>
        )}
      </div>

      {/* 話者B */}
      <div
        {...getRootPropsB()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${
            fileB
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputPropsB()} />
        <div className="text-lg font-semibold mb-2">話者B</div>
        {fileB ? (
          <div>
            <div className="text-sm text-gray-600 mb-1">✓ 選択済み</div>
            <div className="text-xs text-gray-500 truncate">{fileB.name}</div>
            <div className="text-xs text-gray-400 mt-1">
              {(fileB.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            ファイルをドロップまたはクリックして選択
          </div>
        )}
      </div>
    </div>
  );
}
