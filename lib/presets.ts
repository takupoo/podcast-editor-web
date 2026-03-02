import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProcessConfig } from './pipeline/types';
import { useAppStore } from './store';

export interface Preset {
  id: string;
  name: string;
  createdAt: number;
  config: Partial<ProcessConfig>;
}

// プリセットに含めないキー（ファイル参照・カット区間）
const EXCLUDED_KEYS: (keyof ProcessConfig)[] = [
  'bgm', 'endscene', 'bgm_filename', 'endscene_filename',
  'bgm_url', 'endscene_url', 'cut_regions',
];

function extractPresetConfig(config: ProcessConfig): Partial<ProcessConfig> {
  const preset = { ...config } as Record<string, unknown>;
  for (const key of EXCLUDED_KEYS) {
    delete preset[key];
  }
  return preset as Partial<ProcessConfig>;
}

interface PresetState {
  presets: Preset[];
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],

      savePreset: (name: string) => {
        const config = useAppStore.getState().config;
        const preset: Preset = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          config: extractPresetConfig(config),
        };
        set((state) => ({
          presets: [...state.presets, preset],
        }));
        useAppStore.getState().setActivePresetId(preset.id);
      },

      loadPreset: (id: string) => {
        const preset = get().presets.find((p) => p.id === id);
        if (!preset) return;
        // activePresetId を先にセットしてから config を更新
        // (updateConfig が activePresetId を null にするので、直接 set する)
        useAppStore.setState((state) => ({
          config: { ...state.config, ...preset.config },
          activePresetId: id,
        }));
      },

      deletePreset: (id: string) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        }));
        if (useAppStore.getState().activePresetId === id) {
          useAppStore.getState().setActivePresetId(null);
        }
      },

      renamePreset: (id: string, name: string) => {
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, name } : p
          ),
        }));
      },
    }),
    {
      name: 'podcast-editor-presets',
    }
  )
);
