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
import { useState } from 'react';

export function ConfigPanel() {
  const { config, updateConfig } = useAppStore();
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [endsceneFile, setEndsceneFile] = useState<File | null>(null);

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgmFile(file);
      updateConfig({ bgm: file });
    }
  };

  const handleEndsceneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEndsceneFile(file);
      updateConfig({ endscene: file });
    }
  };

  const handleClearBgm = () => {
    setBgmFile(null);
    updateConfig({ bgm: undefined });
  };

  const handleClearEndscene = () => {
    setEndsceneFile(null);
    updateConfig({ endscene: undefined });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">詳細設定</h2>

      <Accordion type="multiple" defaultValue={['trim']} className="w-full">
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
                  ※現在一時無効（Week 3で改善予定）
                </p>
              </div>
              <Switch
                id="denoise-enabled"
                checked={config.denoise_enabled}
                onCheckedChange={(checked) =>
                  updateConfig({ denoise_enabled: checked })
                }
                disabled
              />
            </div>

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
              <div className="flex items-center gap-2">
                <input
                  id="bgm-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleBgmChange}
                  className="text-sm"
                />
                {bgmFile && (
                  <button
                    onClick={handleClearBgm}
                    className="text-xs text-red-600 hover:underline"
                  >
                    クリア
                  </button>
                )}
              </div>
              {bgmFile && (
                <p className="text-xs text-gray-600 mt-1">
                  選択中: {bgmFile.name}
                </p>
              )}
            </div>

            {bgmFile && (
              <>
                <div>
                  <Label htmlFor="bgm-volume">
                    BGM音量: {config.bgm_volume_db}dB
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    マイナス値で音声より小さく（推奨: -30dB）
                  </p>
                  <Slider
                    id="bgm-volume"
                    min={-40}
                    max={-20}
                    step={1}
                    value={[config.bgm_volume_db]}
                    onValueChange={([value]) =>
                      updateConfig({ bgm_volume_db: value })
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
              <div className="flex items-center gap-2">
                <input
                  id="endscene-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleEndsceneChange}
                  className="text-sm"
                />
                {endsceneFile && (
                  <button
                    onClick={handleClearEndscene}
                    className="text-xs text-red-600 hover:underline"
                  >
                    クリア
                  </button>
                )}
              </div>
              {endsceneFile && (
                <p className="text-xs text-gray-600 mt-1">
                  選択中: {endsceneFile.name}
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
