import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProcessConfig, ProcessProgress } from './pipeline/types';
import { DEFAULT_CONFIG } from './config';

interface AppState {
  // 設定
  config: ProcessConfig;
  updateConfig: (updates: Partial<ProcessConfig>) => void;
  resetConfig: () => void;

  // ファイル
  fileA: File | null;
  fileB: File | null;
  setFileA: (file: File | null) => void;
  setFileB: (file: File | null) => void;

  // 処理状態
  processing: boolean;
  progress: ProcessProgress | null;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: ProcessProgress | null) => void;

  // 結果
  result: Blob | null;
  setResult: (result: Blob | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 設定
      config: DEFAULT_CONFIG,
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
      resetConfig: () => set({ config: DEFAULT_CONFIG }),

      // ファイル
      fileA: null,
      fileB: null,
      setFileA: (file) => set({ fileA: file }),
      setFileB: (file) => set({ fileB: file }),

      // 処理状態
      processing: false,
      progress: null,
      setProcessing: (processing) => set({ processing }),
      setProgress: (progress) => set({ progress }),

      // 結果
      result: null,
      setResult: (result) => set({ result }),
    }),
    {
      name: 'podcast-processor-storage',
      // ファイルや結果は永続化しない
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);
