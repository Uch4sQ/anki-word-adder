// コンテキストメニュー作成
browser.contextMenus.create({
  id: "add-to-anki",
  title: "Ankiに追加",
  contexts: ["selection"],
});

// コンテキストメニュークリック処理
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "add-to-anki") return;

  try {
    // コンテンツスクリプトから選択テキスト+文脈を取得
    const selectionData = await browser.tabs.sendMessage(tab.id, {
      action: "getSelection",
    });

    if (!selectionData || !selectionData.word) return;

    // 翻訳を取得
    const translation = await fetchTranslation(
      selectionData.word,
      selectionData.sourceLang
    );

    // デッキ一覧とノートタイプ一覧を並行取得
    const [decks, models] = await Promise.all([fetchDecks(), fetchModels()]);

    // コンテンツスクリプトにモーダル表示を指示
    browser.tabs.sendMessage(tab.id, {
      action: "showModal",
      data: {
        word: selectionData.word,
        context: selectionData.context,
        translation: translation,
        url: info.pageUrl,
        decks: decks,
        models: models,
      },
    });
  } catch (err) {
    console.error("Anki Word Adder:", err);
    browser.tabs.sendMessage(tab.id, {
      action: "showError",
      message: "エラーが発生しました: " + err.message,
    });
  }
});

// 翻訳API (MyMemory - 無料、APIキー不要)
async function fetchTranslation(text, sourceLang) {
  try {
    // ソース言語が日本語なら英語へ、それ以外は日本語へ翻訳
    const targetLang = sourceLang === "ja" ? "en" : "ja";
    const langPair = `${sourceLang || "en"}|${targetLang}`;

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
    return "";
  } catch (e) {
    console.error("Translation error:", e);
    return "";
  }
}

// AnkiConnectからデッキ一覧を取得
async function fetchDecks() {
  try {
    const response = await fetch("http://localhost:8765", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deckNames", version: 6 }),
    });
    const data = await response.json();
    return data.result || ["Default"];
  } catch (e) {
    return ["Default"];
  }
}

// AnkiConnectからノートタイプ一覧を取得
async function fetchModels() {
  try {
    const response = await fetch("http://localhost:8765", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "modelNames", version: 6 }),
    });
    const data = await response.json();
    return data.result || [];
  } catch (e) {
    return [];
  }
}

// AnkiConnectからノートタイプのフィールド名を取得
async function fetchModelFields(modelName) {
  try {
    const response = await fetch("http://localhost:8765", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "modelFieldNames",
        version: 6,
        params: { modelName },
      }),
    });
    const data = await response.json();
    return data.result || [];
  } catch (e) {
    return [];
  }
}

// AnkiConnectにノート追加
async function addToAnki(noteData) {
  // フィールド名を動的に取得
  const fields = await fetchModelFields(noteData.model);

  if (fields.length < 2) {
    throw new Error("ノートタイプにフィールドが2つ以上必要です");
  }

  // 第1フィールド = 単語、第2フィールド = 翻訳+文脈+出典
  const backContent = [
    noteData.translation,
    noteData.context ? `\n\n<hr>\n<small>文脈: ${noteData.context}</small>` : "",
    noteData.url ? `\n<small>出典: ${noteData.url}</small>` : "",
  ].join("");

  const noteFields = {};
  noteFields[fields[0]] = noteData.word;
  noteFields[fields[1]] = backContent;

  const response = await fetch("http://localhost:8765", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addNote",
      version: 6,
      params: {
        note: {
          deckName: noteData.deck || "Default",
          modelName: noteData.model,
          fields: noteFields,
          options: {
            allowDuplicate: false,
          },
          tags: ["web-import"],
        },
      },
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

// コンテンツスクリプトからのメッセージ処理
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "addToAnki") {
    return addToAnki(message.data);
  }
  if (message.action === "fetchDecks") {
    return fetchDecks().then((decks) => ({ decks }));
  }
});
