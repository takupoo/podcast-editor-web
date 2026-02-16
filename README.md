# Podcast Processor (Web版)

**完全無料・サーバー不要のポッドキャスト自動編集ツール**

ブラウザだけで2人の音声を自動でミックス・編集できるWebアプリケーションです。

🌐 **デモ**: https://podcast-editor-web.vercel.app（デプロイ後）

---

## ✨ 特徴

- 🎙️ **クラップ検出・自動同期**: 録音開始時の手拍子で2トラックを自動同期
- 🔇 **ノイズ除去**: ノイズゲート + ハイ/ローパスフィルタで背景ノイズを除去
- 📢 **ラウドネス正規化**: EBU R128準拠の-16 LUFS（ポッドキャスト標準）
- 🎚️ **ダイナミクス処理**: コンプレッサー + リミッターで音量を均一化
- 🎵 **BGM自動追加**: ループ・フェード処理付き（オプション）
- 🎬 **エンドシーン追加**: クロスフェードで接続（オプション）
- 🔧 **詳細設定UI**: 全パラメータを調整可能
- 🔗 **設定共有**: URLで設定を共有
- 🆓 **完全無料**: サーバーコスト0円（ブラウザ内処理）
- 🔒 **プライバシー保護**: 音声ファイルはローカル処理、外部送信なし

---

## 📦 使い方

### 1. ファイルをアップロード

- **話者A**: 左側のファイルアップロードエリアに音声ファイルをドロップ
- **話者B**: 右側のファイルアップロードエリアに音声ファイルをドロップ

対応フォーマット: MP3, WAV, M4A, OGG

### 2. 設定を調整（オプション）

「詳細設定」パネルを開いて、以下を調整できます：

#### 基本設定（トリム）
- **クラップ後カット位置**: クラップ検出後、何秒後から録音を開始するか（0-2秒）
- **クラップ検出感度**: クラップ検出の閾値（-20～-5dB）

#### 音声処理
- **ノイズ除去**: ON/OFF切り替え + 閾値調整（-60～-20dB）
- **目標ラウドネス**: -20～-12 LUFS（推奨: -16 LUFS）
- **コンプレッサー比率**: 2:1～10:1（推奨: 4:1）

#### ミックス
- **BGMファイル**: MP3/WAV等をアップロード（自動ループ・フェード）
- **BGM音量**: -40～-20dB（推奨: -30dB）
- **BGMフェードイン/アウト**: 0～10秒
- **エンドシーンファイル**: MP3/WAV等をアップロード（クロスフェード）
- **クロスフェード時間**: 0～5秒

#### エクスポート
- **出力フォーマット**: MP3 / WAV
- **MP3ビットレート**: 128k / 192k / 256k / 320k

### 3. 処理開始

「処理開始」ボタンをクリックして、自動処理を実行します。

処理時間の目安: 30分の音声で約5-10分（ブラウザ性能に依存）

### 4. ダウンロード

処理完了後、「ダウンロード」ボタンで結果をダウンロードできます。

---

## 🔧 技術スタック

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **UI**: TailwindCSS + shadcn/ui
- **Audio Processing**: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- **State Management**: Zustand (localStorage persist)
- **Hosting**: Vercel（完全無料）

---

## 📋 処理パイプライン

```
Stage 1: Trim（クラップ検出・同期）
  ↓ Web Audio APIでRMSエンベロープ計算
  ↓ 両トラックのクラップ位置を検出
  ↓ FFmpegで同期トリム

Stage 2: Denoise（ノイズ除去）
  ↓ Highpass filter（80Hz以下をカット）
  ↓ Noise gate（閾値以下の音を減衰）
  ↓ Lowpass filter（12kHz以上をカット）

Stage 3: Loudness（ラウドネス正規化）
  ↓ FFmpeg loudnorm 2パス処理
  ↓ EBU R128準拠の-16 LUFS

Stage 4: Dynamics（ダイナミクス処理）
  ↓ Compressor（4:1, -20dB threshold）
  ↓ Limiter（-1dB limit）

Stage 5: Mix（ステレオミックス）
  ↓ 話者A: 左70%
  ↓ 話者B: 右70%
  ↓ amix normalize

Stage 6: BGM（オプション）
  ↓ 自動ループ（aloop）
  ↓ フェードイン/アウト（afade）
  ↓ 音量調整（volume）

Stage 7: Endscene（オプション）
  ↓ クロスフェード（acrossfade）

Stage 8: Export（エンコード）
  ↓ MP3: libmp3lame（192kbps）
  ↓ WAV: PCM 16bit
```

---

## 🚀 ローカル開発

### 前提条件

- Node.js 18以上
- npm または yarn

### セットアップ

```bash
# リポジトリをクローン
cd podcast-editor-web

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

### ビルド

```bash
npm run build
npm start
```

---

## 🔍 トラブルシューティング

### クラップが検出されない

- クラップ音が小さい場合、「クラップ検出感度」を上げる（-15dB等）
- 録音開始直後（最初の5秒以内）に明確なクラップ音を入れる

### ノイズが残る

- 「ノイズゲート閾値」を下げる（-50dB等）
- ただし、下げすぎると音声も減衰するので注意

### BGMが大きすぎる/小さすぎる

- 「BGM音量」を調整（-35dB～-25dB等）
- デフォルトの-30dBは一般的な目安

### ブラウザが応答しない

- 大きなファイル（1時間以上）は処理に時間がかかります
- Chrome/Edge推奨（Safari/Firefoxは制限が多い）

### SharedArrayBuffer エラー

Next.jsの設定で以下のヘッダーが有効になっているか確認：
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## 📝 比較: Web版 vs Mac版

| 項目 | Web版 | Mac版（Python） |
|------|-------|----------------|
| **環境** | ブラウザのみ | macOS + Python + FFmpeg |
| **セットアップ** | 不要 | Homebrew, venv, App Translocation解除 |
| **対応OS** | Windows/Mac/Linux | macOS のみ |
| **処理速度** | 遅い（5-10分/30分音声） | 速い（2-3分/30分音声） |
| **ノイズ除去** | ノイズゲート | スペクトラルゲーティング（高品質） |
| **コスト** | 完全無料 | 無料（ローカル処理） |
| **プライバシー** | ブラウザ内完結 | ローカル処理 |

---

## 🛠️ 開発履歴

- **Week 1**: 基本パイプライン（Loudness, Dynamics, Mix, Export）
- **Week 2**: Trim（クラップ検出）、Denoise骨格実装
- **Week 3**: 詳細設定UI、設定共有URL、Denoise改善、ドキュメント

---

## 📄 ライセンス

MIT License

---

## 🙏 謝辞

- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/): ブラウザ版FFmpeg
- [shadcn/ui](https://ui.shadcn.com/): UIコンポーネント
- [Next.js](https://nextjs.org/): React Framework
- [Vercel](https://vercel.com/): 無料ホスティング

---

## 📧 お問い合わせ

バグ報告・機能リクエストは [GitHub Issues](https://github.com/your-username/podcast-editor-web/issues) までお願いします。
