# iCal → B5 EPUB 変換アプリ

ics ファイルをアップロードし、B5判の読みやすさを意識したスタイルの EPUB を生成するシンプルな Web アプリです。

## 使い方

```bash
npm install
npm start
```

ブラウザで `http://localhost:3000` を開き、ics ファイルを選択して EPUB を生成します。

## 仕様

- iCal(ics) の `VEVENT` を開始日時順に並べ替え
- EPUB 1章にイベント一覧を出力
- B5を意識した余白・行間・フォントサイズをCSSで適用
- タイトルと本文文字サイズをフォームから調整可能
