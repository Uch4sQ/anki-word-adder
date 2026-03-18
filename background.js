// タイムアウト付きfetch (10秒)
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    if (err.name === "AbortError") {
      throw new Error("リクエストがタイムアウトしました (10秒)");
    }
    throw err;
  }
}

// AnkiConnect接続チェック
async function checkAnkiConnect() {
  try {
    const response = await fetchWithTimeout("http://localhost:8765", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "version", version: 6 }),
    });
    const data = await response.json();

    if (data.result) {
      return { connected: true, version: data.result };
    }
    return { connected: false, error: "version_check_failed" };
  } catch (err) {
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      return { connected: false, error: "connection_refused" };
    }
    if (err.message.includes("タイムアウト")) {
      return { connected: false, error: "timeout" };
    }
    return { connected: false, error: "unknown", details: err.message };
  }
}

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
    // ローディング表示
    browser.tabs.sendMessage(tab.id, { action: "showLoading" });

    // 設定を読み込む
    const result = await browser.storage.local.get("settings");
    const settings = result.settings || {};

    // コンテンツスクリプトから選択テキスト+文脈を取得
    const selectionData = await browser.tabs.sendMessage(tab.id, {
      action: "getSelection",
    });

    if (!selectionData || !selectionData.word) return;

    // 翻訳、辞書データ、デッキ一覧、ノートタイプ一覧を並行取得
    const promises = [];

    // 翻訳（自動翻訳が有効な場合のみ）
    if (settings.autoTranslate !== false) {
      promises.push(fetchTranslation(selectionData.word, selectionData.sourceLang));
    } else {
      promises.push(Promise.resolve(""));
    }

    // 辞書データ（設定で有効、かつ英単語の場合のみ）
    if (settings.useDictionary !== false && selectionData.sourceLang === "en") {
      promises.push(fetchDictionaryData(selectionData.word));
    } else {
      promises.push(Promise.resolve(null));
    }

    // スクリーンショット（設定で有効な場合のみ）
    if (settings.captureScreenshot === true) {
      promises.push(captureScreenshot(tab.id));
    } else {
      promises.push(Promise.resolve(null));
    }

    // デッキとモデル
    promises.push(fetchDecks());
    promises.push(fetchModels());

    const [translation, dictionaryData, screenshot, decks, models] = await Promise.all(promises);

    // デフォルトデッキとモデルを設定から取得
    const defaultDeck = settings.defaultDeck || "Default";
    const defaultModel = settings.defaultModel || (models.length > 0 ? models[0] : "Basic");

    // コンテンツスクリプトにモーダル表示を指示
    browser.tabs.sendMessage(tab.id, {
      action: "showModal",
      data: {
        word: selectionData.word,
        context: selectionData.context,
        translation: translation,
        dictionaryData: dictionaryData,
        screenshot: screenshot,
        url: info.pageUrl,
        decks: decks,
        models: models,
        sourceLang: selectionData.sourceLang,
        defaultDeck: defaultDeck,
        defaultModel: defaultModel,
        settings: settings,
      },
    });
  } catch (err) {
    console.error("Anki Word Adder:", err);

    let errorMessage = "エラーが発生しました";

    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      errorMessage = "❌ AnkiConnectに接続できません。\n\nAnkiが起動していること、AnkiConnectアドオンがインストールされていることを確認してください。";
    } else if (err.message.includes("CORS")) {
      errorMessage = "❌ CORS エラー\n\nAnkiConnectの設定でwebCorsOriginAllowを確認してください。";
    } else if (err.message.includes("タイムアウト")) {
      errorMessage = "⚠️ リクエストがタイムアウトしました。\n\nネットワーク接続を確認してください。";
    } else {
      errorMessage = "❌ " + err.message;
    }

    browser.tabs.sendMessage(tab.id, {
      action: "showError",
      message: errorMessage,
    });
  }
});

// スクリーンショットをキャプチャ
async function captureScreenshot(tabId) {
  try {
    const dataUrl = await browser.tabs.captureVisibleTab(null, { format: "png" });
    return dataUrl;
  } catch (err) {
    console.error("Screenshot capture error:", err);
    return null;
  }
}

// 辞書API (Free Dictionary API - 英単語のみ)
async function fetchDictionaryData(word) {
  try {
    // 英単語のみ対象（スペースなし、30文字以下）
    if (!word || word.includes(" ") || word.length > 30 || !/^[a-zA-Z-]+$/.test(word)) {
      return null;
    }

    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
    const response = await fetchWithTimeout(url, {}, 5000); // 5秒タイムアウト

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const entry = data[0];
    const result = {
      word: entry.word,
      phonetic: entry.phonetic || "",
      phonetics: entry.phonetics || [],
      meanings: [],
    };

    // 品詞ごとに定義を整理
    for (const meaning of entry.meanings || []) {
      const meaningData = {
        partOfSpeech: meaning.partOfSpeech,
        definitions: [],
      };

      for (const def of (meaning.definitions || []).slice(0, 3)) {
        meaningData.definitions.push({
          definition: def.definition,
          example: def.example || "",
        });
      }

      if (meaningData.definitions.length > 0) {
        result.meanings.push(meaningData);
      }
    }

    return result.meanings.length > 0 ? result : null;
  } catch (err) {
    console.error("Dictionary API error:", err);
    return null;
  }
}

// 翻訳API (MyMemory - 無料、APIキー不要)
async function fetchTranslation(text, sourceLang) {
  try {
    // ソース言語が日本語なら英語へ、それ以外は日本語へ翻訳
    const targetLang = sourceLang === "ja" ? "en" : "ja";
    const langPair = `${sourceLang || "en"}|${targetLang}`;

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
    const response = await fetchWithTimeout(url);
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
    const response = await fetchWithTimeout("http://localhost:8765", {
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
    const response = await fetchWithTimeout("http://localhost:8765", {
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
    const response = await fetchWithTimeout("http://localhost:8765", {
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
  // 入力検証
  if (!noteData.word || !noteData.word.trim()) {
    throw new Error("単語が入力されていません");
  }
  if (!noteData.deck || !noteData.deck.trim()) {
    throw new Error("デッキが選択されていません");
  }
  if (!noteData.model || !noteData.model.trim()) {
    throw new Error("ノートタイプが選択されていません");
  }

  // フィールド名を動的に取得
  const fields = await fetchModelFields(noteData.model);

  if (fields.length < 2) {
    throw new Error("ノートタイプにフィールドが2つ以上必要です");
  }

  // 第1フィールド = 単語、第2フィールド = 翻訳+文脈+スクリーンショット+出典
  const parts = [noteData.translation];

  if (noteData.context) {
    parts.push(`\n\n<hr>\n<small>文脈: ${noteData.context}</small>`);
  }

  if (noteData.screenshot) {
    parts.push(`\n\n<img src="${noteData.screenshot}" style="max-width: 100%; border-radius: 4px; margin-top: 8px;">`);
  }

  if (noteData.url) {
    parts.push(`\n<small>出典: ${noteData.url}</small>`);
  }

  const backContent = parts.join("");

  const noteFields = {};
  noteFields[fields[0]] = noteData.word;
  noteFields[fields[1]] = backContent;

  const response = await fetchWithTimeout("http://localhost:8765", {
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
    // 重複エラーの検出
    const errorLower = data.error.toLowerCase();
    if (errorLower.includes("duplicate") || errorLower.includes("cannot create note")) {
      throw new Error("この単語は既にデッキに存在します");
    }
    throw new Error(data.error);
  }
  return data;
}

// キーボードショートカット処理
browser.commands.onCommand.addListener(async (command) => {
  if (command === "add-to-anki-shortcut") {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) return;

      const tab = tabs[0];

      // コンテンツスクリプトから選択テキストを取得
      const selectionData = await browser.tabs.sendMessage(tab.id, {
        action: "getSelection",
      });

      if (!selectionData || !selectionData.word) {
        // 選択テキストがない場合は通知
        browser.tabs.sendMessage(tab.id, {
          action: "showError",
          message: "⚠️ テキストを選択してください",
        });
        return;
      }

      // コンテキストメニューと同じ処理を実行
      const result = await browser.storage.local.get("settings");
      const settings = result.settings || {};

      browser.tabs.sendMessage(tab.id, { action: "showLoading" });

      // 翻訳、辞書データ、デッキ一覧、ノートタイプ一覧を並行取得
      const promises = [];

      if (settings.autoTranslate !== false) {
        promises.push(fetchTranslation(selectionData.word, selectionData.sourceLang));
      } else {
        promises.push(Promise.resolve(""));
      }

      if (settings.useDictionary !== false && selectionData.sourceLang === "en") {
        promises.push(fetchDictionaryData(selectionData.word));
      } else {
        promises.push(Promise.resolve(null));
      }

      if (settings.captureScreenshot === true) {
        promises.push(captureScreenshot(tab.id));
      } else {
        promises.push(Promise.resolve(null));
      }

      promises.push(fetchDecks());
      promises.push(fetchModels());

      const [translation, dictionaryData, screenshot, decks, models] = await Promise.all(promises);

      const defaultDeck = settings.defaultDeck || "Default";
      const defaultModel = settings.defaultModel || (models.length > 0 ? models[0] : "Basic");

      browser.tabs.sendMessage(tab.id, {
        action: "showModal",
        data: {
          word: selectionData.word,
          context: selectionData.context,
          translation: translation,
          dictionaryData: dictionaryData,
          screenshot: screenshot,
          url: tab.url,
          decks: decks,
          models: models,
          sourceLang: selectionData.sourceLang,
          defaultDeck: defaultDeck,
          defaultModel: defaultModel,
          settings: settings,
        },
      });
    } catch (err) {
      console.error("Keyboard shortcut error:", err);
    }
  }
});

// コンテンツスクリプトからのメッセージ処理
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "addToAnki") {
    return addToAnki(message.data);
  }
  if (message.action === "fetchDecks") {
    return fetchDecks().then((decks) => ({ decks }));
  }
});
