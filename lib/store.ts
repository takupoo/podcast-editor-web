import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProcessConfig, ProcessProgress } from './pipeline/types';
import { DEFAULT_CONFIG } from './config';
import { loadConfigFromUrl, mergeConfigWithDefaults } from './config-url';

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

// URLパラメータから設定を読み込み（初期化時のみ）
const urlConfig = loadConfigFromUrl();
const initialConfig = mergeConfigWithDefaults(urlConfig);

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 設定
      config: initialConfig,
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
      // ファイルや結果は永続化しない（bgm/endsceneはFileオブジェクトのためJSON化不可）
      partialize: (state) => ({
        config: {
          ...state.config,
          bgm: undefined,
          endscene: undefined,
        },
      }),
      // localStorageから読み込んだ設定をデフォルト値とマージ
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<AppState>;
        const urlConfig = loadConfigFromUrl(); // URLパラメータを再取得
        const merged: AppState = {
          ...currentState,
          config: {
            ...DEFAULT_CONFIG,      // デフォルト値を先に展開
            ...(ps?.config ?? {}),  // 保存された値で上書き
            ...urlConfig,           // URLパラメータを最優先
            bgm: undefined,         // Fileオブジェクトは localStorage から復元不可（旧データの {} を除去）
            endscene: undefined,    // 同上
          },
        };
        return merged;
      },
    }
  )
);
