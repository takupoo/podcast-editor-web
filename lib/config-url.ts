import { ProcessConfig } from './pipeline/types';
import { DEFAULT_CONFIG } from './config';

/**
 * 設定をURLパラメータ用のbase64文字列にエンコード
 */
export function encodeConfigToUrl(config: ProcessConfig): string {
  // ファイルオブジェクトは除外
  const serializable = {
    ...config,
    bgm: undefined,
    endscene: undefined,
  };

  const json = JSON.stringify(serializable);
  // btoa は Latin-1 のみ対応。TextEncoder で UTF-8 バイト列に変換してから base64 化
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * URLパラメータのbase64文字列を設定にデコード
 */
export function decodeConfigFromUrl(base64: string): Partial<ProcessConfig> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
    const json = new TextDecoder().decode(bytes);
    const config = JSON.parse(json);
    return config;
  } catch (error) {
    console.error('Failed to decode config from URL:', error);
    return {};
  }
}

/**
 * 現在の設定で共有URLを生成
 */
export function generateShareUrl(config: ProcessConfig): string {
  const encoded = encodeConfigToUrl(config);
  const url = new URL(window.location.href);
  url.searchParams.set('config', encoded);
  return url.toString();
}

/**
 * URLパラメータから設定を読み込み
 */
export function loadConfigFromUrl(): Partial<ProcessConfig> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const configParam = params.get('config');

  if (!configParam) return {};

  return decodeConfigFromUrl(configParam);
}

/**
 * 設定をデフォルトとマージ（URLパラメータ優先）
 */
export function mergeConfigWithDefaults(
  urlConfig: Partial<ProcessConfig>
): ProcessConfig {
  return {
    ...DEFAULT_CONFIG,
    ...urlConfig,
  };
}
