# Frame Camera App TODO

## Phase 1: DB Schema & Migration
- [x] frames テーブルをdrizzle/schema.tsに追加（id, name, imageUrl, fileKey, createdAt）
- [x] マイグレーションSQL生成・適用

## Phase 2: Server-side API
- [x] server/db.ts にフレームCRUDヘルパーを追加
- [x] server/routers.ts にフレーム管理tRPCルーター追加（list, upload, delete）
- [x] S3アップロードエンドポイント実装（管理者のみ）
- [x] 管理者権限チェック（adminProcedure）

## Phase 3: Admin UI
- [x] /admin ページ作成（管理者ログイン必要）
- [x] フレーム一覧表示（グリッド表示）
- [x] フレームアップロードフォーム（ドラッグ＆ドロップ対応）
- [x] フレーム削除機能（確認ダイアログ付き）
- [x] App.tsx にルート追加

## Phase 4: User Camera UI
- [x] / (Home) ページをカメラアプリUIに刷新
- [x] フレーム選択UI（グリッド表示）
- [x] リアルタイムカメラ映像表示（getUserMedia）
- [x] カメラ映像にフレームをオーバーレイ表示
- [x] 撮影ボタン（Canvas合成）
- [x] ギャラリーから写真選択機能（input[type=file]）
- [x] 合成画像プレビュー表示
- [x] 合成画像ダウンロード機能
- [x] フロント/バックカメラ切り替え

## Phase 5: Polish & Testing
- [x] スマートフォン最適化CSS（safe-area-inset対応）
- [x] ローディング・エラー状態のUI
- [x] Vitestテスト追加（7テスト全パス）
- [x] チェックポイント保存

## 変更: 管理者制限を撤廃・全員開放
- [x] server/routers.ts のフレームupload/deleteをpublicProcedureに変更
- [x] /admin ページを廃止し、フレーム管理UIをホーム画面に統合
- [x] ヘッダーの設定アイコン（管理者リンク）を削除
- [x] App.tsxから/adminルートを削除
- [x] ログイン不要でフレームのアップロード・削除が可能なUIに変更
