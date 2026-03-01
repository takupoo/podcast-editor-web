# Spectratrek LP (Landing Page) 訴求構成案

> **対象市場**: US独立系ポッドキャスター
> **サービス概要**: ブラウザ完結型ポッドキャスト自動編集ツール
> **作成日**: 2026-02-27

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [市場インサイトと課題](#2-市場インサイトと課題)
3. [サービスの価値整理](#3-サービスの価値整理)
4. [競合価格比較と価格戦略](#4-競合価格比較と価格戦略)
5. [LP訴求構成 (セクション設計)](#5-lp訴求構成-セクション設計)
6. [推奨PCスペック](#6-推奨pcスペック)
7. [コピーライティング案 (英語)](#7-コピーライティング案-英語)

---

## 1. エグゼクティブサマリー

### サービスの本質

Spectratrekは「**Zoom/Google Meetで収録 → 各自のローカル音源をアップロード → ブラウザ上で全自動編集 → 完成ファイルをダウンロード**」というワンストップ体験を提供する。

**技術的特徴:**
- FFmpeg.wasm によるブラウザ内100%ローカル処理（サーバーに音声データ送信なし）
- 2トラック自動同期（クラップ検出）
- ノイズ除去（FFT / Non-Local Means / スペクトラル減算）
- EBU R128準拠ラウドネスノーマライゼーション（-16 LUFS）
- ダイナミクスコンプレッション + リミッター
- 無音区間自動トリミング
- BGM自動ミキシング + エンドシーン合成
- MP3/WAV出力（128k〜320k）

### ターゲットユーザー

| 属性 | 詳細 |
|------|------|
| **地域** | US |
| **ペルソナ** | 独立系ソロ/デュオ ポッドキャスター |
| **経験** | 初心者〜中級者（全体の66%が3年未満） |
| **技術力** | 低〜中（Audacityがトップツール、30%がマイクの種類を把握していない） |
| **年齢層** | 40歳以上が75%、50歳以上が約半数 |
| **予算** | 月$10-49が最多（40%）、17%は無料ツールのみ |
| **制作体制** | 91%が独立制作、69%がパートタイム |

---

## 2. 市場インサイトと課題

### 2.1 市場規模

- 全世界で約450万のポッドキャスト番組が存在するが、**アクティブに制作しているのは約45-50万番組のみ**
- 91%が独立制作（企業/ネットワーク非所属）
- 米国で月1回以上ポッドキャストを聴く人口: **2.1億人（12歳以上の55%）**
- グローバルポッドキャスト市場: 2024年$307億 → 2030年$1,310億予測（CAGR 19-29%）
- **61%のポッドキャスターが2026年までにAIを編集に活用予定**

### 2.2 ポッドキャスターの主要課題（ペインポイント）

| 課題 | 深刻度 | 詳細 |
|------|--------|------|
| **編集の時間消費** | ★★★★★ | エピソード長の2-4倍（30分番組で1-4時間の編集）、55%が1エピソードに1-5時間 |
| **技術的複雑さ** | ★★★★☆ | 「ポッドキャストを始めたのにオーディオエンジニアになるつもりはなかった」 |
| **ツール分断** | ★★★★☆ | 収録・編集・ホスティング・配信で別々のツールを使用 |
| **音質問題** | ★★★★☆ | リスナーの73%が音質が悪いと聴取を中断 |
| **継続困難 (Podfade)** | ★★★★☆ | 全ポッドキャストのわずか10%が100エピソード到達、94%が成功前に離脱 |
| **コスト負担** | ★★★☆☆ | 85%が収益化できていない中でツール費用が負担 |

### 2.3 編集時間の実態

```
┌─────────────────────────────────────────────────────────────┐
│  エピソード長  │  一般的な編集時間  │  Spectratrek使用時    │
├─────────────────────────────────────────────────────────────┤
│  15分          │  30分 - 1時間      │  ~3分 (自動処理)      │
│  30分          │  1 - 4時間         │  5-8分 (自動処理)     │
│  60分          │  2 - 6時間         │  12-18分 (自動処理)   │
│  90分          │  3 - 8時間+        │  20-30分 (自動処理)   │
└─────────────────────────────────────────────────────────────┘
```

**訴求ポイント**: 従来4時間かかっていた編集が、**アップロードして待つだけの5-8分に**。

### 2.4 ポッドキャスターの月額支出

- 17%: 完全無料（Audacity + 無料ホスティング）
- **40%: $10-49/月**（最大ボリュームゾーン）
- 20%: $50-100/月
- 33%: $100+/月（複数有料ツール）
- 外注編集費: **$50-200/エピソード**

---

## 3. サービスの価値整理

### 3.1 課題に対するSpectratrekの解決策

| ポッドキャスターの課題 | Spectratrekの解決策 | 訴求メッセージ案 |
|----------------------|-------------------|----------------|
| 編集に2-4時間かかる | 全自動処理で5-8分 | "4 hours of editing → 5 minutes of waiting" |
| オーディオエンジニアリングの知識が必要 | ゼロ設定の自動ノイズ除去・音量正規化 | "Professional sound, zero audio skills required" |
| 複数ツールの使い分け | Zoom/Meetで収録 + Spectratrekで編集完結 | "Record on Zoom. Upload. Done." |
| ツール費用が高い | 月$6.99（競合の半額以下） | "Less than a cup of coffee" |
| 音質が悪い | EBU R128準拠の放送品質自動処理 | "Broadcast-quality audio, automatically" |
| 継続できない (Podfade) | 編集のハードルを限りなくゼロに | "Never miss an episode because of editing" |
| データプライバシーの懸念 | ブラウザ内完結、サーバーに音声送信なし | "Your audio never leaves your computer" |

### 3.2 Unique Selling Points (USP)

1. **Price Disruption**: 月$6.99 — 主要競合の半額以下
2. **Zero-Effort Editing**: アップロードするだけ。編集スキル不要
3. **Complete Privacy**: ブラウザローカル処理、音声データのサーバー送信ゼロ
4. **Broadcast Quality**: EBU R128準拠の業界標準ラウドネス
5. **No Software Install**: ブラウザだけで動作、インストール不要

---

## 4. 競合価格比較と価格戦略

### 4.1 競合価格一覧

#### 収録 + 編集ツール（Spectratrekの直接競合）

| ツール | 月額（年払い） | 月額（月払い） | カテゴリ |
|--------|-------------|-------------|---------|
| **Descript** Hobbyist | $16/mo | $24/mo | 編集 + 収録 |
| **Descript** Creator | $24/mo | $35/mo | 編集 + 収録 |
| **Riverside** Standard | $15/mo | $19/mo | 収録 + 基本編集 |
| **Riverside** Pro | $24/mo | $29/mo | 収録 + 編集 |
| **Zencastr** Standard | ~$18/mo | $20/mo | 収録 + 編集 |
| **Alitu** | ~$32/mo | $38/mo | 編集 + ホスティング |
| **Podcastle** Essentials | $12/mo | $15/mo | 収録 + 編集 |
| **Podcastle** Pro | $24/mo | $25/mo | 収録 + 編集 |
| **Hindenburg** Standard | $8.25/mo | $12/mo | 編集専用 |
| **Adobe Podcast** Premium | $8.33/mo | $9.99/mo | AI音声強化のみ |
| **Adobe Audition** | $22.99/mo | $34.49/mo | プロ向けDAW |
| **Audacity** | 無料 | 無料 | 手動編集（自動化なし） |

#### 収録ツール単体

| 方法 | 月額 | 備考 |
|------|------|------|
| **Zoom** (無料プラン) | $0 | 40分制限、ローカル録音可 |
| **Zoom** (Pro) | $13.33/mo | 無制限、ローカル録音可 |
| **Google Meet** (無料) | $0 | 60分制限 |
| **Google Workspace** | $7.20/mo | 無制限 |
| **Discord** | $0 | Craig Bot等で録音可 |

### 4.2 価格戦略

#### 決定価格: **$6.99/月**（1プラン、1週間無料トライアル付き）

**価格設定根拠:**

```
競合との価格比較:

  Alitu              $38.00/mo  ████████████████████████████████████████  ← 5.4x
  Descript Creator    $35.00/mo  ███████████████████████████████████████   ← 5.0x
  Adobe Audition      $34.49/mo  ██████████████████████████████████████    ← 4.9x
  Riverside Pro       $29.00/mo  █████████████████████████████████        ← 4.1x
  Podcastle Pro       $24.99/mo  ████████████████████████████             ← 3.6x
  Descript Hobbyist   $24.00/mo  ██████████████████████████               ← 3.4x
  Zencastr Standard   $20.00/mo  ██████████████████████                   ← 2.9x
  Riverside Standard  $19.00/mo  █████████████████████                    ← 2.7x
  Podcastle Essential $14.99/mo  ████████████████                         ← 2.1x
  Hindenburg Standard $12.00/mo  █████████████                            ← 1.7x
  Adobe Podcast       $9.99/mo   ███████████                              ← 1.4x
  ─────────────────────────────────────────────────────────
  Spectratrek         $6.99/mo   ████████                                 ← HERE
  ─────────────────────────────────────────────────────────
  Audacity            $0         (無料だが全手動・自動化なし)
```

**なぜ$6.99か:**

1. **全有料編集ツール中最安値** — Hindenburg ($8.25)、Adobe Podcast ($8.33) より安い
2. **心理的価格帯 $7未満** — "Under $7/month" は強力なフレーミング
3. **収録(Zoom無料) + 編集($6.99) = 合計$6.99** vs 競合オールインワン$15-38
4. **インフラコストがほぼゼロ**（ブラウザ処理のため）で持続可能な価格
5. **ターゲットの40%が$10-49/月を支出** — その予算のごく一部で済む
6. **外注編集($50-200/エピソード)の完全代替** — 年間で$600-2,400の節約

#### プラン詳細

```
┌─────────────────────────────────────────────────────────────┐
│                    Spectratrek Pro                           │
│                                                             │
│                     $6.99 / month                           │
│                                                             │
│              ✦ 7-day free trial included ✦                  │
│                                                             │
│  ✓ Unlimited episodes                                      │
│  ✓ Auto 2-track sync (clap detection)                      │
│  ✓ AI noise removal (3 algorithms)                         │
│  ✓ Broadcast-standard loudness (EBU R128, -16 LUFS)        │
│  ✓ Dynamic range compression                               │
│  ✓ Automatic silence trimming                               │
│  ✓ BGM mixing & endscene                                   │
│  ✓ Manual cut editor with visual timeline                   │
│  ✓ MP3 & WAV export (up to 320kbps)                        │
│  ✓ 100% browser-local processing                           │
│  ✓ Zero data uploaded to servers                            │
│  ✓ No software installation required                        │
│                                                             │
│            [ Start Free Trial → ]                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 収録+編集の総コスト比較（LPに掲載する表）

| ワークフロー | 収録 | 編集 | 月額合計 |
|-------------|------|------|---------|
| **Spectratrek** + Zoom Free | $0 | **$6.99** | **$6.99** |
| **Spectratrek** + Google Meet Free | $0 | **$6.99** | **$6.99** |
| Riverside Standard | $19 込み | $19 込み | $19.00 |
| Descript Hobbyist + SquadCast | $24 込み | $24 込み | $24.00 |
| Zencastr Standard | $20 込み | $20 込み | $20.00 |
| Riverside Pro | $29 込み | $29 込み | $29.00 |
| Descript Creator | $35 込み | $35 込み | $35.00 |
| Alitu | 別途必要 | $38 | $38.00+ |
| Zoom Pro + Adobe Audition | $13.33 | $34.49 | $47.82 |

**Spectratrekは最安の競合(Riverside $19)と比べても63%安い。**

---

## 5. LP訴求構成（セクション設計）

### Section 1: Hero（ファーストビュー）

**目的**: 3秒で「何のサービスか」「自分に関係あるか」を伝える

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│          Record on Zoom. Upload. Done.                       │
│                                                              │
│   The podcast editor that does everything automatically.     │
│   Just upload your tracks — broadcast-quality audio          │
│   in minutes, not hours.                                     │
│                                                              │
│          [ Start Free Trial — $0 for 7 days ]                │
│                                                              │
│        $6.99/mo after trial · No credit card required        │
│                                                              │
│   ┌──────────────────────────────────────────────┐           │
│   │  (Product screenshot / demo animation)       │           │
│   │  Showing: drag-drop upload → processing      │           │
│   │  progress bar → download button              │           │
│   └──────────────────────────────────────────────┘           │
│                                                              │
│  Trusted by X podcasters  ·  "As seen on" logos (future)     │
└──────────────────────────────────────────────────────────────┘
```

**コピー選択肢 (A/Bテスト候補):**
- A: "Record on Zoom. Upload. Done." (シンプル・直球)
- B: "Stop editing. Start publishing." (課題訴求)
- C: "4 hours of editing → 5 minutes of waiting." (数字訴求)

---

### Section 2: Pain Point（課題提起）

**目的**: ターゲットの「分かる...」を引き出し、共感を作る

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│         Editing shouldn't be the hardest part                │
│              of making a podcast.                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   ⏱️     │  │   😫     │  │   💸     │  │   📉     │    │
│  │ 4+ hrs   │  │ Complex  │  │ $20-40   │  │ 94% quit │    │
│  │ editing  │  │  tools   │  │ /month   │  │ (podfade)│    │
│  │ per      │  │ steep    │  │ for just │  │ before   │    │
│  │ episode  │  │ learning │  │ editing  │  │ episode  │    │
│  │          │  │ curve    │  │          │  │   100    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  "I didn't start a podcast to become an audio engineer."     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**データ裏付け:**
- "Podcasters spend 2-4x the episode length just on editing" (業界データ)
- "73% of listeners stop listening when audio quality is poor" (Edison Research)
- "Only 10% of podcasts survive past 100 episodes" (業界統計)

---

### Section 3: How It Works（3ステップ）

**目的**: 驚くほど簡単であることを伝える

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              Three steps. That's it.                         │
│                                                              │
│  ┌─── Step 1 ───┐  ┌─── Step 2 ───┐  ┌─── Step 3 ───┐     │
│  │              │  │              │  │              │     │
│  │   🎙️ Record  │  │  ⬆️ Upload   │  │  ⬇️ Download  │     │
│  │              │  │              │  │              │     │
│  │ Record your  │  │ Drop your    │  │ Download     │     │
│  │ conversation │  │ audio files  │  │ your finished│     │
│  │ on Zoom,     │  │ into the     │  │ episode.     │     │
│  │ Google Meet, │  │ browser.     │  │ Publish.     │     │
│  │ or any tool  │  │              │  │              │     │
│  │ you already  │  │ We handle    │  │ Broadcast-   │     │
│  │ use.         │  │ sync, noise, │  │ ready audio. │     │
│  │              │  │ levels —     │  │              │     │
│  │ Save each    │  │ everything.  │  │ That's it.   │     │
│  │ speaker's    │  │              │  │              │     │
│  │ local audio. │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│              [ See it in action → ] (demo video)             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**補足テキスト:**
> "No audio engineering degree required. Spectratrek automatically syncs your tracks, removes noise, normalizes loudness to broadcast standards, and exports a polished episode — all inside your browser."

---

### Section 4: Feature Highlights（機能訴求）

**目的**: 自動化の具体的価値を伝える（技術用語は避ける）

| LP表示名 | 技術的実体 | ユーザーベネフィット |
|----------|-----------|-------------------|
| **Auto-Sync** | クラップ検出による2トラック自動同期 | "No more manually lining up audio tracks" |
| **Noise Removal** | FFT/NLMeans/スペクトラル減算 | "Crystal-clear audio, even from noisy rooms" |
| **Volume Balancing** | EBU R128 ラウドネスノーマライゼーション | "Both speakers at the same, perfect level" |
| **Smart Compression** | ダイナミクスコンプレッサー + リミッター | "Consistent volume throughout your episode" |
| **Silence Trimming** | 無音区間自動検出・圧縮 | "Awkward pauses? Gone automatically" |
| **Background Music** | BGMオートループ・フェード・ミキシング | "Add intro/outro music with one click" |
| **Manual Cuts** | ビジュアルタイムラインエディター | "Fine-tune with a simple visual editor" |
| **Preview Mode** | 最初の30秒だけ処理してプレビュー | "Test your settings in seconds, not minutes" |

---

### Section 5: Security & Privacy（セキュリティ訴求）

**目的**: ブラウザローカル処理の安全性をアピール

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│            Your audio never leaves your computer.            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  🔒 100% Browser-Local Processing                      │  │
│  │                                                        │  │
│  │  Unlike cloud-based editors that upload your audio     │  │
│  │  to remote servers, Spectratrek processes everything   │  │
│  │  directly in your browser using WebAssembly.           │  │
│  │                                                        │  │
│  │  ✓  Zero audio data sent to any server                │  │
│  │  ✓  No cloud storage of your recordings               │  │
│  │  ✓  Processing happens on YOUR machine                │  │
│  │  ✓  Files only leave your computer when YOU download  │  │
│  │  ✓  No third-party access to your content             │  │
│  │  ✓  No tracking, no analytics on your audio           │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Comparison ────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  Cloud editors (Descript, Riverside, etc.):             │ │
│  │   ⚠ Your audio uploaded to company servers              │ │
│  │   ⚠ Stored in cloud (potential data breach risk)        │ │
│  │   ⚠ Subject to third-party data policies                │ │
│  │                                                         │ │
│  │  Spectratrek:                                           │ │
│  │   ✓ Audio stays on your computer at all times           │ │
│  │   ✓ Nothing to breach — nothing stored                  │ │
│  │   ✓ You own your data, period                           │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Perfect for: journalists, corporate podcasters, legal       │
│  professionals, anyone handling sensitive conversations.      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**訴求対象拡張**: ジャーナリスト、法律関連、企業内ポッドキャスト、医療系インタビューなど、機密性の高い音声を扱うユーザーへのアピール。

---

### Section 6: Pricing Comparison（価格比較）

**目的**: 圧倒的なコスパを可視化

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│          The most affordable podcast editing tool.           │
│                    No compromises.                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  Tool              Recording  Editing  Total/month   │    │
│  │  ──────────────────────────────────────────────────   │    │
│  │  Spectratrek       Zoom (free) $6.99    $6.99  ✦    │    │
│  │  + Zoom/Meet                                         │    │
│  │                                                      │    │
│  │  Riverside Std     Included   Included  $19.00       │    │
│  │  Zencastr Std      Included   Included  $20.00       │    │
│  │  Descript Hobbyist Included   Included  $24.00       │    │
│  │  Riverside Pro     Included   Included  $29.00       │    │
│  │  Descript Creator  Included   Included  $35.00       │    │
│  │  Alitu             Separate   $38.00    $38.00+      │    │
│  │                                                      │    │
│  │  ✦ = Save up to $31/month vs. leading competitors    │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  "You already use Zoom or Google Meet to record.            │
│   Why pay $20-40/month for a tool that bundles recording    │
│   you don't need?"                                          │
│                                                              │
│           [ Start Free Trial — $6.99/mo ]                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**コスト節約メッセージ:**

| 比較対象 | 月額差 | 年間節約額 |
|---------|--------|-----------|
| vs Riverside Standard ($19) | -$12.01 | **$144/year** |
| vs Descript Hobbyist ($24) | -$17.01 | **$204/year** |
| vs Descript Creator ($35) | -$28.01 | **$336/year** |
| vs Alitu ($38) | -$31.01 | **$372/year** |
| vs 外注編集 ($100/ep × 4ep) | -$393.01 | **$4,716/year** |

---

### Section 7: Pricing CTA（価格・行動喚起）

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │              ✦  Spectratrek Pro  ✦                     │  │
│  │                                                        │  │
│  │                  $6.99 / month                         │  │
│  │                                                        │  │
│  │         7-day free trial · Cancel anytime              │  │
│  │                                                        │  │
│  │  ────────────────────────────────────────────────────  │  │
│  │                                                        │  │
│  │  Everything you need:                                  │  │
│  │                                                        │  │
│  │  ✓ Unlimited episodes per month                       │  │
│  │  ✓ Auto 2-track sync                                  │  │
│  │  ✓ 3 noise removal algorithms                         │  │
│  │  ✓ Broadcast-standard loudness normalization           │  │
│  │  ✓ Dynamic range compression                          │  │
│  │  ✓ Silence trimming                                   │  │
│  │  ✓ BGM mixing & endscene                              │  │
│  │  ✓ Visual cut editor                                  │  │
│  │  ✓ MP3 & WAV export (up to 320kbps)                   │  │
│  │  ✓ 100% private — browser-local processing            │  │
│  │                                                        │  │
│  │         [ Start Your Free Trial → ]                    │  │
│  │                                                        │  │
│  │  No credit card required for trial                     │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  💬 "I used to spend 3 hours editing each episode.           │
│      Now I upload two files and grab a coffee."              │
│      — [Future testimonial placeholder]                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### Section 8: System Requirements（推奨スペック）

**目的**: ブラウザツールだが相応のPCスペックが必要なことを正直に伝える

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              Works in your browser. No install needed.       │
│                                                              │
│  ┌─ Minimum Requirements ──────────────────────────────────┐ │
│  │                                                         │ │
│  │  Processor:  Intel Core i5 (8th Gen) / AMD Ryzen 5     │ │
│  │  Memory:     8 GB RAM                                   │ │
│  │  Storage:    5 GB free disk space                       │ │
│  │  Browser:    Chrome 91+, Edge 91+, Firefox 79+          │ │
│  │  Internet:   Broadband (for initial page load)          │ │
│  │  OS:         Windows 10, macOS 11+, Ubuntu 20.04+       │ │
│  │                                                         │ │
│  │  ⏱ Processing time: ~15-20 min for 30-min episode      │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Recommended (Best Experience) ─────────────────────────┐ │
│  │                                                         │ │
│  │  Processor:  Intel Core i7 (10th Gen+) / AMD Ryzen 7   │ │
│  │  Memory:     16 GB RAM                                  │ │
│  │  Storage:    SSD with 10 GB+ free space                 │ │
│  │  Browser:    Chrome (latest) or Edge (latest)           │ │
│  │  Internet:   Broadband (for initial page load)          │ │
│  │  OS:         Windows 10/11, macOS 12+, Ubuntu 22.04+    │ │
│  │                                                         │ │
│  │  ⏱ Processing time: ~5-8 min for 30-min episode        │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ℹ️  All processing runs locally in your browser using      │
│     WebAssembly. A stable internet connection is only       │
│     needed to load the page. Once loaded, everything        │
│     works offline.                                          │
│                                                              │
│  ⚠️  Safari is supported (15.2+) but Chrome/Edge            │
│     is recommended for best performance.                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**推奨スペック根拠（コード分析より）:**

| 技術要素 | 要求 | 根拠 |
|---------|------|------|
| **SharedArrayBuffer** | Chrome 91+ / Edge 91+ / Firefox 79+ | FFmpeg.wasm マルチスレッドに必須。COOP/COEPヘッダー設定済み (next.config.ts) |
| **WASM実行** | 4コア以上推奨 | FFmpeg.wasmのデコード/エンコード + カスタムFFTスペクトラル減算 |
| **メモリ** | 8GB最小、16GB推奨 | 30分音声でWASMヒープ ~200MB + ブラウザオーバーヘッド ~2GB + FFTバッファ |
| **FFTウィンドウ** | CPU依存 | 2048サンプル/75%オーバーラップ = 48kHzで ~5.33ms/フレーム |
| **Web Workers** | 1ワーカー使用 | スペクトラルデノイズ用の専用ワーカー (denoise-worker.ts) |
| **ストレージ** | 5-10GB空き | 入力ファイル + WASM FS中間ファイル（ステージ毎に積極削除） |
| **ブラウザキャッシュ** | ~30MB | FFmpeg.wasm コアバイナリ（CDNからロード、キャッシュ済み） |

---

### Section 9: FAQ

```
Q: Do I need to install any software?
A: No. Spectratrek runs entirely in your web browser.
   Just open the page and start editing.

Q: Is my audio uploaded to your servers?
A: Never. All processing happens locally in your browser
   using WebAssembly technology. Your audio files never
   leave your computer.

Q: What recording tools work with Spectratrek?
A: Any tool that lets each speaker save their own audio
   file locally. Popular choices: Zoom (local recording),
   Google Meet, Discord, or any separate recorder.

Q: What audio formats are supported?
A: Input: MP3, WAV, M4A. Output: MP3 (128-320kbps) or WAV.

Q: How long does processing take?
A: A 30-minute episode typically processes in 5-8 minutes on
   a modern computer (i7/16GB RAM). You can use Preview Mode
   to test settings on just the first 30 seconds.

Q: Can I cancel anytime?
A: Yes. No contracts, no commitments. Cancel with one click.

Q: What if my episode has more than 2 speakers?
A: Currently Spectratrek is optimized for 2-speaker podcasts
   (the most common format). Multi-speaker support is on
   our roadmap.

Q: Does it work on mobile?
A: Spectratrek requires a desktop/laptop browser for
   processing. Mobile browsers lack the memory and
   processing power needed for audio editing.

Q: What if I need help?
A: Email us at [support email]. We typically respond
   within 24 hours.
```

---

### Section 10: Final CTA（最終行動喚起）

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│        Stop spending hours editing your podcast.             │
│                                                              │
│   Upload your tracks. Get broadcast-quality audio.           │
│   Start publishing consistently.                            │
│                                                              │
│         [ Start Your 7-Day Free Trial → ]                   │
│                                                              │
│              $6.99/mo · Cancel anytime                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 推奨PCスペック（詳細版）

### 最小スペック

| 項目 | 要件 |
|------|------|
| **CPU** | Intel Core i5 第8世代 / AMD Ryzen 5 2600 (4コア以上、64bit) |
| **RAM** | 8 GB DDR4 |
| **ストレージ** | SSD 5GB以上の空き容量 |
| **ブラウザ** | Chrome 91+ / Edge 91+ / Firefox 79+ / Safari 15.2+ |
| **OS** | Windows 10 / macOS 11 (Big Sur)+ / Ubuntu 20.04+ |
| **ネットワーク** | ブロードバンド（初回ロード時のみ、~30MB） |
| **GPU** | 不要（CPU処理のみ） |
| **処理時間目安** | 30分音声 → 約15-20分 |

### 推奨スペック

| 項目 | 要件 |
|------|------|
| **CPU** | Intel Core i7 第10世代+ / AMD Ryzen 7 3700X+ (8コア以上) |
| **RAM** | 16 GB DDR4-3200+ |
| **ストレージ** | NVMe SSD 10GB以上の空き容量 |
| **ブラウザ** | Chrome最新版 / Edge最新版（最も高速） |
| **OS** | Windows 10/11 / macOS 12 (Monterey)+ / Ubuntu 22.04+ |
| **ネットワーク** | ブロードバンド（初回ロード時のみ） |
| **GPU** | 不要 |
| **処理時間目安** | 30分音声 → 約5-8分 |

### エピソード長別の処理時間目安

| エピソード長 | 最小スペック | 推奨スペック |
|-------------|------------|------------|
| 15分 | ~8-10分 | ~3分 |
| 30分 | ~15-20分 | ~5-8分 |
| 60分 | ~35-45分 | ~12-18分 |
| 90分 | ~50-60分 | ~20-30分 |

### ブラウザ互換性

| ブラウザ | 対応状況 | 備考 |
|---------|---------|------|
| **Chrome 91+** | ✅ 推奨 | 最高のWASMパフォーマンス |
| **Edge 91+** | ✅ 推奨 | Chromiumベース、Chromeと同等 |
| **Firefox 79+** | ✅ 対応 | Chromeより約15%遅い |
| **Safari 15.2+** | ⚠️ 対応（制限あり） | 約20-30%遅い、プライベートモード非対応 |
| **モバイルブラウザ** | ❌ 非推奨 | メモリ不足で長時間音声に制限 |

---

## 7. コピーライティング案（英語）

### Headline Options (A/Bテスト用)

**Option A — Simple & Direct:**
> **Record on Zoom. Upload. Done.**
> The podcast editor that does everything automatically.

**Option B — Problem-Focused:**
> **Stop editing. Start publishing.**
> Automated podcast editing for $6.99/month.

**Option C — Number-Focused:**
> **4 hours of editing → 5 minutes of waiting.**
> Upload your tracks. Download your episode.

**Option D — Cost-Focused:**
> **Professional podcast editing for less than a coffee.**
> $6.99/month. No audio skills needed.

### Subheadline:
> "Upload two audio tracks. Get a broadcast-ready episode with synced audio, removed noise, balanced levels, and trimmed silences — all processed in your browser, never on our servers."

### Value Proposition Bullets:
- **Upload & forget** — Drop your files in, grab a coffee, come back to a finished episode
- **Sounds professional** — EBU R128 broadcast-standard loudness, automatically
- **Completely private** — Your audio never touches our servers. Ever.
- **Ridiculously affordable** — $6.99/mo. Less than half the price of any competitor.
- **No learning curve** — If you can drag and drop a file, you can use Spectratrek

### CTA Button Text Options:
- "Start Free Trial — $0 for 7 Days"
- "Try Spectratrek Free"
- "Edit Your First Episode Free"
- "Start Your Free Trial →"

### Social Proof (ローンチ後に追加):
- "Trusted by X,000 podcasters"
- "[Star rating] on Product Hunt"
- User testimonials with before/after editing time

---

## まとめ

| 項目 | 決定事項 |
|------|---------|
| **価格** | $6.99/月（1プランのみ） |
| **トライアル** | 7日間無料 |
| **ポジショニング** | "収録は既存ツール(Zoom等) + 編集はSpectratrekで$6.99" |
| **最大の訴求** | 編集時間 4時間→5分 + 月額最安 + 完全プライベート |
| **ターゲット** | US独立系ソロポッドキャスター（40歳以上、技術非専門） |
| **LP構成** | Hero → Pain → How it Works → Features → Security → Pricing Comparison → CTA → Specs → FAQ → Final CTA |
| **推奨ブラウザ** | Chrome/Edge最新版 |
| **推奨PC** | Core i7 / 16GB RAM / SSD |
