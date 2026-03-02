# Spectratrek リリースセットアップ TODO

## 1. Clerk 認証セットアップ

- [ ] https://dashboard.clerk.com でアカウント作成
- [ ] アプリケーション作成（「Spectratrek」）
- [ ] API Keys ページからキーを取得
- [ ] Vercel ダッシュボード（Settings → Environment Variables）に以下を設定:

| 変数名 | 値 | 環境 |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Production, Preview, Development |
| `CLERK_SECRET_KEY` | `sk_live_...` | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | 全環境 |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | 全環境 |

- [ ] ローカル開発用に `.env.local` を作成（`.env.local.example` を参照）

## 2. Stripe 決済セットアップ

- [ ] https://dashboard.stripe.com でアカウント作成
- [ ] API Keys ページからキーを取得
- [ ] Pro プラン商品を作成（¥980/月のサブスクリプション）→ Price ID を控える
- [ ] Webhook エンドポイントを登録: `https://spectratrek.vercel.app/api/stripe/webhook`
  - イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Webhook の署名シークレットを控える
- [ ] Vercel ダッシュボードに以下を設定:

| 変数名 | 値 | 環境 |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production, Preview, Development |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production, Preview, Development |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | `price_...` | 全環境 |
| `NEXT_PUBLIC_APP_URL` | `https://spectratrek.vercel.app` | Production |

## 3. 法務ページのプレースホルダー差し替え

以下のファイル内のプレースホルダーを実際の情報に差し替える:

- [ ] `app/privacy/page.tsx` / `lib/i18n/translations/{en,ja}.ts`
  - `[YOUR_EMAIL]` → 問い合わせメールアドレス
- [ ] `app/terms/page.tsx` / `lib/i18n/translations/{en,ja}.ts`
  - `[YOUR_EMAIL]` → 問い合わせメールアドレス
  - `[YOUR_JURISDICTION]` → 準拠法・管轄裁判所
- [ ] `app/legal/sctl/page.tsx` / `lib/i18n/translations/{en,ja}.ts`
  - `[YOUR_COMPANY_NAME]` → 販売事業者名
  - `[YOUR_NAME]` → 代表者名
  - `[YOUR_ADDRESS]` → 所在地
  - `[YOUR_PHONE]` → 電話番号
  - `[YOUR_EMAIL]` → メールアドレス

## 4. デプロイ手順

```
1. 上記の環境変数をすべて Vercel に設定
2. 法務ページのプレースホルダーを差し替え
3. feature/release-prep → main にマージ
4. Vercel が自動デプロイ → 認証・決済が有効に
```

> **注意**: 環境変数を Vercel に**先に設定してから**マージすること。
> ブランチの実装では環境変数がない場合 ClerkProvider をスキップするフォールバックがあるため即エラーにはならないが、認証・決済機能は動作しない。
