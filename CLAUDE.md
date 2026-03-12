# CNC G-code 3D Simulator

## プロジェクト概要
CNCルーター用のGコード3Dシミュレーター。Gコードファイルを読み込み、ツールヘッドの移動経路を3D空間で確認できるWebアプリ。

## 技術スタック
- Next.js 14.2.35 + React + TypeScript
- @react-three/fiber + @react-three/drei（3Dレンダリング）
- Tailwind CSS（UI）
- vitest（テスト）

## デプロイ情報
- **Vercel URL**: https://cnc-gcode-simulator-seven.vercel.app
- **GitHub**: https://github.com/karamiso2025-afk/cnc-gcode-simulator
- **ブランチ**: master
- masterへのpushで自動デプロイ（Vercel連携済み）

## 主要ファイル構成
```
src/
  app/page.tsx              — メインページ（状態管理、UI統合）
  components/
    viewer3-d.tsx           — 3Dビューアー（R3F Canvas、パス描画、素材板）
    control-panel.tsx       — 操作パネル（ファイル読込、再生、表示切替）
    info-panel.tsx          — 統計情報パネル
    elapsed-time-display.tsx — 加工時間・行番号・進捗表示
    file-drop-zone.tsx      — ドラッグ&ドロップオーバーレイ
  gcode-parser.ts           — Gコードパーサー
  gcode-analyzer.ts         — 統計分析
  path-generator.ts         — パス生成（GCodeCommand[] → PathSegment[]）
  shared-types.ts           — 共有型定義
```

## 視覚表現ルール
| 移動タイプ | 線種 | 色 |
|-----------|------|-----|
| G0（早送り） | 破線 | 赤 #ff0000 |
| G1（直線補間） | 実線 | 青 #3366ff |
| G2/G3（円弧） | 実線 | 緑 #33cc33 |
| 加工軌跡（素材板上） | — | オレンジ #ff8800 |
| 貫通部分 | — | 白 #ffffff |

## デフォルト表示設定
- グリッド: OFF
- 工具表示: OFF
- 早送り表示: ON
- 軸表示: ON

## 重要な技術判断

### 加工軌跡の描画方式
Canvas2Dテクスチャ方式を採用（3D ShaderMaterialクアッド方式は廃止）。
- `strokeSegmentOnCanvas`: 太いstroke + lineCap='round'で滑らかな軌跡描画
- `strokeThroughOnCanvas`: Z < -thickness部分を白で貫通表示
- PPM=2（2 pixels per mm）でテクスチャ解像度確保
- ToolSweptPath関数は`return null`（デッドコードは削除済み）

### 背景色
- `#09090b`（ほぼ黒）

## 開発メモ
- NobeeD Super AIエンジンで初期生成、その後手動調整
- 生成元: `engine/output/cnc-gcode-simulator/assembled/`
- ワークツリーパスとローカルパスの不一致に注意（過去に編集先ミスあり）
