# Anki Word Adder - Firefox Extension

Webページ上で単語を選択 → 右クリックするだけでAnkiにカードを追加できるFirefox拡張機能。

自動翻訳付きで、追加前に翻訳を確認・編集できます。

## デモ

1. 単語を選択して右クリック → **「Ankiに追加」**
2. モーダルで翻訳を確認・編集 → **「追加」**

## 機能

- **右クリックメニュー**から即座にAnkiへ追加
- **文脈の自動抽出** - 単語を含む文を自動で取得
- **自動翻訳** - MyMemory APIで翻訳を自動入力（無料・APIキー不要）
- **編集可能** - 単語・文脈・翻訳をすべて追加前に編集できる
- **デッキ選択** - Ankiの既存デッキから選んで追加
- **言語自動検出** - ページの言語を検出し、日本語⇔英語を自動判定

## セットアップ

### 1. AnkiConnect をインストール

[AnkiConnect](https://ankiweb.net/shared/info/2055492159) はAnkiにREST APIを追加するアドオンです。

1. Ankiを開く
2. **ツール → アドオン → 新たにアドオンを取得**
3. コード `2055492159` を入力してインストール
4. Ankiを再起動

### 2. 拡張機能をFirefoxにインストール

#### 開発用（一時的）

1. Firefoxで `about:debugging#/runtime/this-firefox` を開く
2. **「一時的なアドオンを読み込む」** をクリック
3. このリポジトリの `manifest.json` を選択

> 一時的なアドオンはFirefox再起動時に消えます。

#### 恒久的に使う場合

[web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) を使ってパッケージング・署名します:

```bash
npm install -g web-ext
cd anki-word-adder
web-ext build
```

生成された `.zip` を [AMO](https://addons.mozilla.org/) に提出するか、`about:config` で `xpinstall.signatures.required` を `false` にして手動インストールできます。

## 使い方

1. **Ankiを起動**しておく（AnkiConnectが `localhost:8765` で待機します）
2. Webページで覚えたい単語をドラッグして選択
3. 右クリック → **「Ankiに追加」**
4. モーダルが表示される:
   - **単語** - 選択したテキスト（編集可能）
   - **文脈** - 単語を含む文（自動抽出、編集可能）
   - **翻訳/意味** - 自動翻訳（編集可能、ここにフォーカスが当たる）
   - **デッキ** - Ankiのデッキ一覧から選択
5. 翻訳を確認・必要なら修正して **「追加」** をクリック

## Ankiカードの内容

| 面 | 内容 |
|---|---|
| Front（表面） | 選択した単語 |
| Back（裏面） | 翻訳 + 文脈 + 出典URL |

カードには `web-import` タグが自動で付与されます。

## 翻訳について

- [MyMemory Translation API](https://mymemory.translated.net/) を使用（無料）
- ページの `lang` 属性から言語を自動検出
- 日本語ページの単語 → 英語に翻訳
- それ以外 → 日本語に翻訳
- 翻訳はあくまで参考値です。追加前に必ず確認・編集してください

## ファイル構成

```
anki-word-adder/
├── manifest.json      # 拡張機能マニフェスト (Manifest V2)
├── background.js      # バックグラウンドスクリプト（API通信）
├── content.js         # コンテンツスクリプト（UI・テキスト取得）
├── icons/
│   └── icon.svg       # 拡張機能アイコン
└── README.md
```

## License

MIT
