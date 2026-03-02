import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProcessConfig, CutRegion } from './pipeline/types';
import { DEFAULT_CONFIG } from './config';
import { loadConfigFromUrl, mergeConfigWithDefaults } from './config-url';

interface AppState {
  // 設定
  config: ProcessConfig;
  updateConfig: (updates: Partial<ProcessConfig>) => void;
  resetConfig: () => void;
  resetAll: () => void;

  // アクティブプリセット
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => void;

  // 手動カット区間
  addCutRegion: (region: Omit<CutRegion, 'id'>) => void;
  removeCutRegion: (id: string) => void;
  clearCutRegions: () => void;

  // ファイル（複数対応）
  files: File[];
  setFiles: (files: File[]) => void;
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
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
          activePresetId: null, // 設定変更時にプリセット解除
        })),
      resetConfig: () => set({ config: DEFAULT_CONFIG, activePresetId: null }),
      resetAll: () => set({
        config: DEFAULT_CONFIG,
        activePresetId: null,
        files: [],
      }),

      // アクティブプリセット
      activePresetId: null,
      setActivePresetId: (id) => set({ activePresetId: id }),

      // 手動カット区間
      addCutRegion: (region) =>
        set((state) => ({
          config: {
            ...state.config,
            cut_regions: [...state.config.cut_regions, { ...region, id: crypto.randomUUID() }]
              .sort((a, b) => a.startTime - b.startTime),
          },
        })),
      removeCutRegion: (id) =>
        set((state) => ({
          config: {
            ...state.config,
            cut_regions: state.config.cut_regions.filter((r) => r.id !== id),
          },
        })),
      clearCutRegions: () =>
        set((state) => ({
          config: { ...state.config, cut_regions: [] },
        })),

      // ファイル（複数対応）
      files: [],
      setFiles: (files) => set({ files }),
      addFiles: (newFiles) =>
        set((state) => ({
          files: [...state.files, ...newFiles],
        })),
      removeFile: (index) =>
        set((state) => ({
          files: state.files.filter((_, i) => i !== index),
        })),
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
        activePresetId: state.activePresetId,
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
          activePresetId: ps?.activePresetId ?? null,
        };
        return merged;
      },
    }
  )
);
