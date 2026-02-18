'use client';

import { useAppStore } from '@/lib/store';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { generateShareUrl } from '@/lib/config-url';
import { saveFileToCache, loadFileFromCache, clearFileFromCache } from '@/lib/file-cache';

function extractFilename(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? 'audio.mp3';
}

/** GitHub の blob URL を raw URL に自動変換
 *  https://github.com/user/repo/blob/branch/path
 *  → https://raw.githubusercontent.com/user/repo/branch/path
 */
function toRawUrl(url: string): string {
  return url.replace(
    /^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//,
    'https://raw.githubusercontent.com/$1/'
  );
}

export function ConfigPanel() {
  const { config, updateConfig } = useAppStore();
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [endsceneFile, setEndsceneFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  // IndexedDB / URL 復元関連
  const [bgmFromCache, setBgmFromCache] = useState(false);
  const [endsceneFromCache, setEndsceneFromCache] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(true);

  // BGM URL 入力（保存済みURLを初期値として表示）
  const [bgmUrl, setBgmUrl] = useState(config.bgm_url ?? '');
  const [bgmUrlLoading, setBgmUrlLoading] = useState(false);
  const [bgmUrlError, setBgmUrlError] = useState<string | null>(null);

  // エンドシーン URL 入力（保存済みURLを初期値として表示）
  const [endsceneUrl, setEndsceneUrl] = useState(config.endscene_url ?? '');
  const [endsceneUrlLoading, setEndsceneUrlLoading] = useState(false);
  const [endsceneUrlError, setEndsceneUrlError] = useState<string | null>(null);

  // マウント時: URL方式 or IndexedDB から自動復元
  useEffect(() => {
    let cancelled = false;

    async function restoreFiles() {
      try {
        // BGM 復元: URL方式優先 → IndexedDB
        if (config.bgm_url) {
          try {
            const res = await fetch(config.bgm_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            const filename = config.bgm_filename ?? extractFilename(config.bgm_url);
            const file = new File([buffer], filename, {
              type: res.headers.get('content-type') ?? 'audio/mpeg',
            });
            if (!cancelled) {
              setBgmFile(file);
              setBgmFromCache(true);
              updateConfig({ bgm: file });
            }
          } catch {
            if (!cancelled) setBgmUrlError('URLからの自動読み込みに失敗しました');
          }
        } else {
          const cached = await loadFileFromCache('bgm');
          if (!cancelled && cached) {
            setBgmFile(cached);
            setBgmFromCache(true);
            updateConfig({ bgm: cached, bgm_filename: cached.name });
          }
        }

        // エンドシーン 復元: URL方式優先 → IndexedDB
        if (config.endscene_url) {
          try {
            const res = await fetch(config.endscene_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = await res.arrayBuffer();
            const filename = config.endscene_filename ?? extractFilename(config.endscene_url);
            const file = new File([buffer], filename, {
              type: res.headers.get('content-type') ?? 'audio/mpeg',
            });
            if (!cancelled) {
              setEndsceneFile(file);
              setEndsceneFromCache(true);
              updateConfig({ endscene: file });
            }
          } catch {
            if (!cancelled) setEndsceneUrlError('URLからの自動読み込みに失敗しました');
          }
        } else {
          const cached = await loadFileFromCache('endscene');
          if (!cancelled && cached) {
            setEndsceneFile(cached);
            setEndsceneFromCache(true);
            updateConfig({ endscene: cached, endscene_filename: cached.name });
          }
        }
      } finally {
        if (!cancelled) setCacheLoading(false);
      }
    }

    restoreFiles();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ファイル選択ハンドラ
  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgmFile(file);
      setBgmFromCache(false);
      updateConfig({ bgm: file, bgm_filename: file.name, bgm_url: undefined });
      saveFileToCache('bgm', file); // IndexedDB に保存（put で上書き）
    }
  };

  const handleEndsceneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEndsceneFile(file);
      setEndsceneFromCache(false);
      updateConfig({ endscene: file, endscene_filename: file.name, endscene_url: undefined });
      saveFileToCache('endscene', file);
    }
  };

  const handleClearBgm = () => {
    setBgmFile(null);
    setBgmFromCache(false);
    setBgmUrl('');
    setBgmUrlError(null);
    updateConfig({ bgm: undefined, bgm_filename: undefined, bgm_url: undefined });
    clearFileFromCache('bgm');
  };

  const handleClearEndscene = () => {
    setEndsceneFile(null);
    setEndsceneFromCache(false);
    setEndsceneUrl('');
    setEndsceneUrlError(null);
    updateConfig({ endscene: undefined, endscene_filename: undefined, endscene_url: undefined });
    clearFileFromCache('endscene');
  };

  // URL 読み込みハンドラ
  const handleBgmUrlLoad = async () => {
    if (!bgmUrl) return;
    setBgmUrlLoading(true);
    setBgmUrlError(null);
    const rawUrl = toRawUrl(bgmUrl);
    if (rawUrl !== bgmUrl) setBgmUrl(rawUrl);
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const filename = extractFilename(rawUrl);
      const file = new File([buffer], filename, {
        type: res.headers.get('content-type') ?? 'audio/mpeg',
      });
      setBgmFile(file);
      setBgmFromCache(false);
      updateConfig({ bgm: file, bgm_filename: filename, bgm_url: rawUrl });
      clearFileFromCache('bgm'); // URL方式が優先: IndexedDB のエントリを削除
    } catch {
      setBgmUrlError('URLの読み込みに失敗しました（Google DriveはCORS非対応。GitHub Raw / S3推奨）');
    } finally {
      setBgmUrlLoading(false);
    }
  };

  const handleEndsceneUrlLoad = async () => {
    if (!endsceneUrl) return;
    setEndsceneUrlLoading(true);
    setEndsceneUrlError(null);
    const rawUrl = toRawUrl(endsceneUrl);
    if (rawUrl !== endsceneUrl) setEndsceneUrl(rawUrl);
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const filename = extractFilename(rawUrl);
      const file = new File([buffer], filename, {
        type: res.headers.get('content-type') ?? 'audio/mpeg',
      });
      setEndsceneFile(file);
      setEndsceneFromCache(false);
      updateConfig({ endscene: file, endscene_filename: filename, endscene_url: rawUrl });
      clearFileFromCache('endscene');
    } catch {
      setEndsceneUrlError('URLの読み込みに失敗しました（Google DriveはCORS非対応。GitHub Raw / S3推奨）');
    } finally {
      setEndsceneUrlLoading(false);
    }
  };

  const handleShareConfig = async () => {
    const shareUrl = generateShareUrl(config);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      alert('URLのコピーに失敗しました: ' + error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">詳細設定</h2>
        <button
          onClick={handleShareConfig}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          {copied ? '✓ コピー済み' : '設定を共有'}
        </button>
      </div>

      <Accordion type="multiple" defaultValue={['preview', 'trim']} className="w-full">
        {/* プレビューモード */}
        <AccordionItem value="preview">
          <AccordionTrigger>🚀 プレビューモード（音質比較用）</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="preview-mode">プレビューモード</Label>
                <p className="text-xs text-gray-500">
                  最初の{config.preview_duration}秒だけを高速処理して音質を比較
                </p>
              </div>
              <Switch
                id="preview-mode"
                checked={config.preview_mode}
                onCheckedChange={(checked) =>
                  updateConfig({ preview_mode: checked })
                }
              />
            </div>

            {config.preview_mode && (
              <div>
                <Label htmlFor="preview-duration">
                  プレビュー時間: {config.preview_duration}秒
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  処理する長さ（10-60秒、推奨: 30秒）
                </p>
                <Slider
                  id="preview-duration"
                  min={10}
                  max={60}
                  step={5}
                  value={[config.preview_duration]}
                  onValueChange={([value]) =>
                    updateConfig({ preview_duration: value })
                  }
                />
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
              💡 <strong>プレビューモード</strong>を使うと、異なるノイズ除去方式を素早く比較できます。
              <br />各設定で処理を実行→ダウンロード→ローカル版と聴き比べ
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 基本設定 */}
        <AccordionItem value="trim">
          <AccordionTrigger>基本設定（トリム）</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="post-clap-cut">
                クラップ後カット位置: {config.post_clap_cut.toFixed(1)}秒
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                クラップ検出後、何秒後から録音を開始するか（0秒=クラップ残す）
              </p>
              <Slider
                id="post-clap-cut"
                min={0}
                max={2}
                step={0.1}
                value={[config.post_clap_cut]}
                onValueChange={([value]) =>
                  updateConfig({ post_clap_cut: value })
                }
              />
            </div>

            <div>
              <Label htmlFor="clap-threshold">
                クラップ検出感度: {config.clap_threshold_db}dB
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                低いほど小さい音でも検出（推奨: -10dB）
              </p>
              <Slider
                id="clap-threshold"
                min={-20}
                max={-5}
                step={1}
                value={[config.clap_threshold_db]}
                onValueChange={([value]) =>
                  updateConfig({ clap_threshold_db: value })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 音声処理 */}
        <AccordionItem value="processing">
          <AccordionTrigger>音声処理</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="denoise-enabled">ノイズ除去</Label>
                <p className="text-xs text-gray-500">
                  ホワイトノイズ・背景ノイズを除去
                </p>
              </div>
              <Switch
                id="denoise-enabled"
                checked={config.denoise_enabled}
                onCheckedChange={(checked) =>
                  updateConfig({ denoise_enabled: checked })
                }
              />
            </div>

            {config.denoise_enabled && (
              <>
                <div>
                  <Label>ノイズ除去方式</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    音質を比較して最適な方式を選択してください
                  </p>
                  <div className="space-y-2">
                    {(['spectral', 'afftdn', 'anlmdn', 'none'] as const).map((method) => (
                      <label
                        key={method}
                        className="flex items-start gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="denoise_method"
                          value={method}
                          checked={config.denoise_method === method}
                          onChange={() => updateConfig({ denoise_method: method })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {method === 'spectral' && 'スペクトル減算（推奨）'}
                            {method === 'afftdn' && 'afftdn（FFTベース）'}
                            {method === 'anlmdn' && 'anlmdn（NLMeans）'}
                            {method === 'none' && 'なし（フィルタのみ）'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {method === 'spectral' && 'Python版noisereduce相当。録音内の静かなフレームからノイズを学習して除去。サー音・キーン音・ファン音に最も効果的。'}
                            {method === 'afftdn' && 'FFTベース。時間的ノイズ追跡あり。軽量で定常ノイズに効果的。'}
                            {method === 'anlmdn' && '非局所平均ベース。高品質だが処理が重い。'}
                            {method === 'none' && 'highpass + lowpassのみ。ノイズ除去なし。'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {config.denoise_method !== 'none' && (
                  <div>
                    <Label htmlFor="noise-gate-threshold">
                      ノイズフロア閾値: {config.noise_gate_threshold}dB
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      低いほど弱いノイズも除去（推奨: -50dB）
                    </p>
                    <Slider
                      id="noise-gate-threshold"
                      min={-60}
                      max={-30}
                      step={5}
                      value={[config.noise_gate_threshold]}
                      onValueChange={([value]) =>
                        updateConfig({ noise_gate_threshold: value })
                      }
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="target-lufs">
                目標ラウドネス: {config.target_lufs}LUFS
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                ポッドキャスト標準: -16 LUFS
              </p>
              <Slider
                id="target-lufs"
                min={-20}
                max={-12}
                step={0.5}
                value={[config.target_lufs]}
                onValueChange={([value]) =>
                  updateConfig({ target_lufs: value })
                }
              />
            </div>

            <div>
              <Label htmlFor="comp-ratio">
                コンプレッサー比率: {config.comp_ratio}:1
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                大きいほど圧縮が強い（推奨: 4:1）
              </p>
              <Slider
                id="comp-ratio"
                min={2}
                max={10}
                step={1}
                value={[config.comp_ratio]}
                onValueChange={([value]) =>
                  updateConfig({ comp_ratio: value })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ミックス */}
        <AccordionItem value="mix">
          <AccordionTrigger>ミックス（BGM・エンドシーン）</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {/* BGM */}
            <div>
              <Label htmlFor="bgm-file">BGMファイル</Label>
              <p className="text-xs text-gray-500 mb-2">
                自動ループ・フェード処理されます
              </p>

              {/* amber 警告: キャッシュ読み込み完了後のみ表示 */}
              {!cacheLoading && !bgmFile && config.bgm_filename && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mb-2">
                  前回: {config.bgm_filename}（再選択が必要です）
                </p>
              )}

              {/* ファイル選択 */}
              <div className="flex items-center gap-2">
                <input
                  id="bgm-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleBgmChange}
                  className="text-sm"
                />
                {(bgmFile || config.bgm_filename) && (
                  <button
                    onClick={handleClearBgm}
                    className="text-xs text-red-600 hover:underline"
                  >
                    クリア
                  </button>
                )}
              </div>

              {/* URL 入力 */}
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={bgmUrl}
                  onChange={(e) => setBgmUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBgmUrlLoad()}
                  placeholder="https://... (GitHub Raw, S3等)"
                  className="flex-1 text-sm border rounded px-2 py-1"
                />
                <button
                  onClick={handleBgmUrlLoad}
                  disabled={bgmUrlLoading || !bgmUrl}
                  className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {bgmUrlLoading ? '読込中...' : 'URLから読込'}
                </button>
              </div>
              {bgmUrlError && (
                <p className="text-xs text-red-600 mt-1">{bgmUrlError}</p>
              )}

              {/* ステータス */}
              {bgmFile && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ {bgmFromCache
                    ? `復元: ${bgmFile.name}${config.bgm_url ? ' (URL)' : ' (キャッシュ)'}`
                    : `選択中: ${bgmFile.name}`}
                </p>
              )}
            </div>

            {bgmFile && (
              <>
                <div>
                  <Label htmlFor="bgm-volume">
                    BGM音量: {config.bgm_target_lufs} LUFS
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    絶対音量指定（推奨: -44 LUFS / 控えめ: -50 / 目立たせる: -36）
                  </p>
                  <Slider
                    id="bgm-volume"
                    min={-60}
                    max={-20}
                    step={1}
                    value={[config.bgm_target_lufs]}
                    onValueChange={([value]) =>
                      updateConfig({ bgm_target_lufs: value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="bgm-fade-in">
                    BGMフェードイン: {config.bgm_fade_in.toFixed(1)}秒
                  </Label>
                  <Slider
                    id="bgm-fade-in"
                    min={0}
                    max={10}
                    step={0.5}
                    value={[config.bgm_fade_in]}
                    onValueChange={([value]) =>
                      updateConfig({ bgm_fade_in: value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="bgm-fade-out">
                    BGMフェードアウト: {config.bgm_fade_out.toFixed(1)}秒
                  </Label>
                  <Slider
                    id="bgm-fade-out"
                    min={0}
                    max={10}
                    step={0.5}
                    value={[config.bgm_fade_out]}
                    onValueChange={([value]) =>
                      updateConfig({ bgm_fade_out: value })
                    }
                  />
                </div>
              </>
            )}

            {/* Endscene */}
            <div className="pt-4 border-t">
              <Label htmlFor="endscene-file">エンドシーンファイル</Label>
              <p className="text-xs text-gray-500 mb-2">
                クロスフェードで接続されます
              </p>

              {/* amber 警告 */}
              {!cacheLoading && !endsceneFile && config.endscene_filename && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mb-2">
                  前回: {config.endscene_filename}（再選択が必要です）
                </p>
              )}

              {/* ファイル選択 */}
              <div className="flex items-center gap-2">
                <input
                  id="endscene-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleEndsceneChange}
                  className="text-sm"
                />
                {(endsceneFile || config.endscene_filename) && (
                  <button
                    onClick={handleClearEndscene}
                    className="text-xs text-red-600 hover:underline"
                  >
                    クリア
                  </button>
                )}
              </div>

              {/* URL 入力 */}
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  value={endsceneUrl}
                  onChange={(e) => setEndsceneUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEndsceneUrlLoad()}
                  placeholder="https://... (GitHub Raw, S3等)"
                  className="flex-1 text-sm border rounded px-2 py-1"
                />
                <button
                  onClick={handleEndsceneUrlLoad}
                  disabled={endsceneUrlLoading || !endsceneUrl}
                  className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {endsceneUrlLoading ? '読込中...' : 'URLから読込'}
                </button>
              </div>
              {endsceneUrlError && (
                <p className="text-xs text-red-600 mt-1">{endsceneUrlError}</p>
              )}

              {/* ステータス */}
              {endsceneFile && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ {endsceneFromCache
                    ? `復元: ${endsceneFile.name}${config.endscene_url ? ' (URL)' : ' (キャッシュ)'}`
                    : `選択中: ${endsceneFile.name}`}
                </p>
              )}
            </div>

            {endsceneFile && (
              <div>
                <Label htmlFor="endscene-crossfade">
                  クロスフェード: {config.endscene_crossfade.toFixed(1)}秒
                </Label>
                <Slider
                  id="endscene-crossfade"
                  min={0}
                  max={5}
                  step={0.5}
                  value={[config.endscene_crossfade]}
                  onValueChange={([value]) =>
                    updateConfig({ endscene_crossfade: value })
                  }
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* エクスポート */}
        <AccordionItem value="export">
          <AccordionTrigger>エクスポート設定</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="output-format">出力フォーマット</Label>
              <select
                id="output-format"
                value={config.output_format}
                onChange={(e) =>
                  updateConfig({
                    output_format: e.target.value as 'mp3' | 'wav',
                  })
                }
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
              </select>
            </div>

            {config.output_format === 'mp3' && (
              <div>
                <Label htmlFor="mp3-bitrate">MP3ビットレート</Label>
                <select
                  id="mp3-bitrate"
                  value={config.mp3_bitrate}
                  onChange={(e) =>
                    updateConfig({ mp3_bitrate: e.target.value })
                  }
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                >
                  <option value="128k">128kbps</option>
                  <option value="192k">192kbps（推奨）</option>
                  <option value="256k">256kbps</option>
                  <option value="320k">320kbps</option>
                </select>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
