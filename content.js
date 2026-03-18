// メッセージリスナー
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "getSelection") {
    const selection = window.getSelection();
    const word = selection.toString().trim();
    if (!word) return Promise.resolve(null);

    const context = getContextSentence(selection);
    const lang =
      document.documentElement.lang?.split("-")[0]?.toLowerCase() || "en";

    return Promise.resolve({ word, context, sourceLang: lang });
  }

  if (message.action === "showLoading") {
    showLoadingIndicator();
  }

  if (message.action === "showModal") {
    showConfirmationModal(message.data);
  }

  if (message.action === "showError") {
    showNotification(message.message, true);
  }
});

// 選択テキストの前後の文を取得
function getContextSentence(selection) {
  if (!selection.rangeCount) return "";

  const range = selection.getRangeAt(0);
  let container = range.startContainer;

  // テキストノードの場合は親要素を取得
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement;
  }

  // ブロック要素まで遡って文脈を取得
  const blockElements = [
    "P",
    "DIV",
    "LI",
    "TD",
    "TH",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "BLOCKQUOTE",
    "ARTICLE",
    "SECTION",
  ];

  let contextEl = container;
  while (
    contextEl.parentElement &&
    !blockElements.includes(contextEl.tagName)
  ) {
    contextEl = contextEl.parentElement;
  }

  const fullText = contextEl.textContent || "";
  const selectedText = selection.toString().trim();

  // 選択テキストを含む文を抽出
  const sentences = fullText.split(/(?<=[.!?。！？\n])\s*/);
  for (const sentence of sentences) {
    if (sentence.includes(selectedText)) {
      return sentence.trim();
    }
  }

  // 文の分割で見つからない場合、段落全体を返す（長すぎる場合は切り詰め）
  const trimmed = fullText.trim();
  return trimmed.length > 200
    ? trimmed.substring(0, 200) + "..."
    : trimmed;
}

// ローディングインジケータを表示
function showLoadingIndicator() {
  // 既存のインジケータを削除
  const existing = document.getElementById("anki-word-adder-loading");
  if (existing) existing.remove();

  const loadingDiv = document.createElement("div");
  loadingDiv.id = "anki-word-adder-loading";
  loadingDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483646;
    background: white;
    padding: 24px 32px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 20px;
    height: 20px;
    border: 3px solid #e0e0e0;
    border-top-color: #4a90d9;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  `;

  const text = document.createElement("span");
  text.textContent = "読み込み中...";

  loadingDiv.appendChild(spinner);
  loadingDiv.appendChild(text);
  document.body.appendChild(loadingDiv);

  // アニメーション用のスタイルを追加
  if (!document.getElementById("anki-word-adder-loading-style")) {
    const style = document.createElement("style");
    style.id = "anki-word-adder-loading-style";
    style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }
}

// 確認モーダルを表示
function showConfirmationModal(data) {
  // ローディングインジケータを削除
  const loadingIndicator = document.getElementById("anki-word-adder-loading");
  if (loadingIndicator) loadingIndicator.remove();

  // 既存のモーダルを削除
  const existing = document.getElementById("anki-word-adder-host");
  if (existing) existing.remove();

  // Shadow DOMホスト作成（ページのCSSから隔離）
  const host = document.createElement("div");
  host.id = "anki-word-adder-host";
  host.style.cssText =
    "all:initial; position:fixed; top:0; left:0; width:100%; height:100%; z-index:2147483647;";

  const shadow = host.attachShadow({ mode: "closed" });

  // スタイル要素を作成
  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5); display: flex;
      align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px; color: #333;
    }
    .modal {
      background: #fff; border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      width: 420px; max-width: 90vw; max-height: 90vh;
      overflow-y: auto; padding: 24px;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .title {
      font-size: 18px; font-weight: 700; margin-bottom: 20px;
      color: #1a1a1a; display: flex; align-items: center; gap: 8px;
    }
    .title::before {
      content: "A"; display: inline-flex; align-items: center;
      justify-content: center; width: 28px; height: 28px;
      background: #4a90d9; color: white; border-radius: 6px;
      font-size: 14px; font-weight: 800;
    }
    .field { margin-bottom: 16px; position: relative; }
    .field-with-button { display: flex; gap: 8px; align-items: center; }
    label {
      display: block; font-size: 12px; font-weight: 600;
      color: #666; margin-bottom: 4px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .speak-btn {
      flex-shrink: 0; width: 40px; height: 40px;
      background: #f0f0f0; border: none; border-radius: 8px;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; font-size: 18px;
      transition: background 0.15s, transform 0.1s;
    }
    .speak-btn:hover { background: #e0e0e0; }
    .speak-btn:active { transform: scale(0.95); }
    .speak-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    input, textarea, select {
      width: 100%; padding: 10px 12px; border: 1.5px solid #ddd;
      border-radius: 8px; font-size: 14px; font-family: inherit;
      color: #333; background: #fafafa;
      transition: border-color 0.15s, box-shadow 0.15s; outline: none;
    }
    input:focus, textarea:focus, select:focus {
      border-color: #4a90d9;
      box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15);
      background: #fff;
    }
    textarea { resize: vertical; min-height: 60px; }
    .buttons { display: flex; gap: 10px; margin-top: 20px; }
    button {
      flex: 1; padding: 10px 16px; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }
    button:active { transform: scale(0.98); }
    .btn-cancel { background: #f0f0f0; color: #666; }
    .btn-cancel:hover { background: #e0e0e0; }
    .btn-add { background: #4a90d9; color: #fff; }
    .btn-add:hover { background: #3a7bc8; }
    .btn-add:disabled { background: #a0c4e8; cursor: not-allowed; }
    .status {
      margin-top: 12px; padding: 10px; border-radius: 8px;
      font-size: 13px; display: none;
    }
    .status.success { display: block; background: #e8f5e9; color: #2e7d32; }
    .status.error {
      display: block;
      background: #fce4ec;
      color: #c62828;
      white-space: pre-line;
      line-height: 1.5;
    }
    .loading { pointer-events: none; opacity: 0.6; }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .shake {
      animation: shake 0.5s ease-in-out;
    }
    .loading-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes successPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes checkmark {
      0% { stroke-dashoffset: 50; }
      100% { stroke-dashoffset: 0; }
    }
    .success-checkmark {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .success-checkmark path {
      stroke: #2e7d32;
      stroke-width: 3;
      fill: none;
      stroke-dasharray: 50;
      stroke-dashoffset: 50;
      animation: checkmark 0.3s ease-out forwards;
    }
    .dictionary-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .dictionary-section .phonetic {
      color: #4a90d9;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .dictionary-section .meaning {
      margin-bottom: 12px;
    }
    .dictionary-section .meaning:last-child {
      margin-bottom: 0;
    }
    .dictionary-section .part-of-speech {
      font-weight: 700;
      color: #666;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .dictionary-section .definition {
      padding: 6px 10px;
      background: white;
      border-radius: 6px;
      margin-bottom: 4px;
      cursor: pointer;
      transition: background 0.15s;
      border-left: 3px solid #4a90d9;
    }
    .dictionary-section .definition:hover {
      background: #e3f2fd;
    }
    .dictionary-section .definition-text {
      color: #333;
      line-height: 1.4;
    }
    .dictionary-section .example {
      color: #888;
      font-style: italic;
      margin-top: 4px;
      font-size: 12px;
    }
    .screenshot-section {
      margin-bottom: 16px;
    }
    .screenshot-preview {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #e0e0e0;
      background: #f5f5f5;
    }
    .screenshot-preview img {
      display: block;
      width: 100%;
      height: 200px;
      object-fit: cover;
      cursor: pointer;
    }
    .screenshot-preview img:hover {
      opacity: 0.9;
    }
    .remove-screenshot-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #c62828;
      cursor: pointer;
      transition: background 0.15s;
    }
    .remove-screenshot-btn:hover {
      background: white;
    }
  `;
  shadow.appendChild(style);

  // DOM要素を構築
  function createField(labelText, child) {
    const field = document.createElement("div");
    field.className = "field";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    field.appendChild(lbl);
    field.appendChild(child);
    return field;
  }

  function createSelect(id, items, selectedValue) {
    const sel = document.createElement("select");
    sel.id = id;
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      if (item === selectedValue) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const modalDiv = document.createElement("div");
  modalDiv.className = "modal";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "Ankiに追加";
  modalDiv.appendChild(title);

  const wordEl = document.createElement("input");
  wordEl.type = "text";
  wordEl.id = "word";
  wordEl.value = data.word || "";

  const speakBtn = document.createElement("button");
  speakBtn.type = "button";
  speakBtn.className = "speak-btn";
  speakBtn.textContent = "🔊";
  speakBtn.title = "発音を聞く";

  const wordContainer = document.createElement("div");
  wordContainer.className = "field-with-button";
  wordContainer.appendChild(wordEl);
  wordContainer.appendChild(speakBtn);

  modalDiv.appendChild(createField("単語", wordContainer));

  const contextEl = document.createElement("textarea");
  contextEl.id = "context";
  contextEl.rows = 2;
  contextEl.textContent = data.context || "";
  modalDiv.appendChild(createField("文脈", contextEl));

  // 辞書情報セクション（データがある場合のみ）
  if (data.dictionaryData) {
    const dictSection = document.createElement("div");
    dictSection.className = "dictionary-section";

    // 発音
    if (data.dictionaryData.phonetic) {
      const phoneticDiv = document.createElement("div");
      phoneticDiv.className = "phonetic";
      phoneticDiv.textContent = `🔊 ${data.dictionaryData.phonetic}`;
      dictSection.appendChild(phoneticDiv);
    }

    // 品詞ごとの定義
    for (const meaning of data.dictionaryData.meanings) {
      const meaningDiv = document.createElement("div");
      meaningDiv.className = "meaning";

      const posDiv = document.createElement("div");
      posDiv.className = "part-of-speech";
      posDiv.textContent = meaning.partOfSpeech;
      meaningDiv.appendChild(posDiv);

      for (const def of meaning.definitions) {
        const defDiv = document.createElement("div");
        defDiv.className = "definition";
        defDiv.title = "クリックして翻訳フィールドに反映";

        const defText = document.createElement("div");
        defText.className = "definition-text";
        defText.textContent = def.definition;
        defDiv.appendChild(defText);

        if (def.example) {
          const exampleDiv = document.createElement("div");
          exampleDiv.className = "example";
          exampleDiv.textContent = `例: ${def.example}`;
          defDiv.appendChild(exampleDiv);
        }

        // クリックで翻訳フィールドに反映
        defDiv.addEventListener("click", () => {
          const translationInput = shadow.getElementById("translation");
          if (translationInput) {
            translationInput.value = def.definition;
            translationInput.focus();
          }
        });

        meaningDiv.appendChild(defDiv);
      }

      dictSection.appendChild(meaningDiv);
    }

    modalDiv.appendChild(dictSection);
  }

  const translationEl = document.createElement("input");
  translationEl.type = "text";
  translationEl.id = "translation";
  translationEl.value = data.translation || "";
  modalDiv.appendChild(createField("翻訳 / 意味", translationEl));

  // スクリーンショットプレビュー（データがある場合のみ）
  let screenshotDataUrl = data.screenshot;
  if (screenshotDataUrl) {
    const screenshotSection = document.createElement("div");
    screenshotSection.className = "screenshot-section";

    const screenshotLabel = document.createElement("label");
    screenshotLabel.textContent = "スクリーンショット";
    screenshotSection.appendChild(screenshotLabel);

    const previewContainer = document.createElement("div");
    previewContainer.className = "screenshot-preview";
    previewContainer.id = "screenshot-preview";

    const img = document.createElement("img");
    img.src = screenshotDataUrl;
    img.alt = "Screenshot";
    img.title = "クリックして新しいタブで開く";
    img.addEventListener("click", () => {
      window.open(screenshotDataUrl, "_blank");
    });
    previewContainer.appendChild(img);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-screenshot-btn";
    removeBtn.textContent = "✕ 画像を削除";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      screenshotDataUrl = null;
      previewContainer.remove();
    });
    previewContainer.appendChild(removeBtn);

    screenshotSection.appendChild(previewContainer);
    modalDiv.appendChild(screenshotSection);
  }

  const modelSelectEl = createSelect("model", data.models || [], data.defaultModel || null);
  modalDiv.appendChild(createField("ノートタイプ", modelSelectEl));

  const deckSelectEl = createSelect("deck", data.decks || ["Default"], data.defaultDeck || "Default");
  modalDiv.appendChild(createField("デッキ", deckSelectEl));

  const buttons = document.createElement("div");
  buttons.className = "buttons";

  const cancelButton = document.createElement("button");
  cancelButton.className = "btn-cancel";
  cancelButton.id = "cancel";
  cancelButton.textContent = "キャンセル";
  buttons.appendChild(cancelButton);

  const addButton = document.createElement("button");
  addButton.className = "btn-add";
  addButton.id = "add";
  addButton.innerHTML = '追加<span class="loading-spinner" style="display: none;"></span>';
  buttons.appendChild(addButton);

  modalDiv.appendChild(buttons);

  const statusDiv = document.createElement("div");
  statusDiv.className = "status";
  statusDiv.id = "status";
  modalDiv.appendChild(statusDiv);

  overlay.appendChild(modalDiv);
  shadow.appendChild(overlay);

  const wordInput = wordEl;
  const contextInput = contextEl;
  const translationInput = translationEl;
  const modelSelect = modelSelectEl;
  const deckSelect = deckSelectEl;
  const addBtn = addButton;
  const cancelBtn = cancelButton;
  const statusEl = statusDiv;
  const modal = modalDiv;

  // Escキーで閉じる、Enterキーで追加
  const onKeydown = (e) => {
    if (e.key === "Escape") {
      cleanup();
    }
    if (e.key === "Enter" && !e.shiftKey && !addBtn.disabled) {
      e.preventDefault();
      addBtn.click();
    }
  };
  document.addEventListener("keydown", onKeydown);

  // オーバーレイクリックで閉じる
  shadow.querySelector(".overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      cleanup();
    }
  });

  function cleanup() {
    document.removeEventListener("keydown", onKeydown);
    host.remove();
  }

  // 発音
  speakBtn.addEventListener("click", () => {
    const word = wordInput.value.trim();
    if (!word) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);

      // 言語を自動検出（ページの言語 or data.sourceLang）
      const lang = data.sourceLang || "en";
      utterance.lang = lang === "ja" ? "ja-JP" : "en-US";
      utterance.rate = 0.9;

      window.speechSynthesis.speak(utterance);
    }
  });

  // キャンセル
  cancelBtn.addEventListener("click", cleanup);

  // 追加
  addBtn.addEventListener("click", async () => {
    const word = wordInput.value.trim();
    if (!word) {
      statusEl.className = "status error";
      statusEl.textContent = "❌ 単語を入力してください";
      wordInput.classList.add("shake");
      setTimeout(() => wordInput.classList.remove("shake"), 500);
      wordInput.focus();
      return;
    }

    addBtn.disabled = true;
    const spinner = addBtn.querySelector(".loading-spinner");
    if (spinner) spinner.style.display = "inline-block";
    addBtn.childNodes[0].textContent = "追加中";
    modal.classList.add("loading");

    try {
      // 文脈内の単語をハイライト（設定で有効な場合）
      const context = contextInput.value.trim();
      const shouldHighlight = !data.settings || data.settings.highlightWord !== false;
      const highlightedContext = shouldHighlight ? highlightWordInContext(context, word) : context;

      await browser.runtime.sendMessage({
        action: "addToAnki",
        data: {
          word: word,
          context: highlightedContext,
          translation: translationInput.value.trim(),
          screenshot: screenshotDataUrl,
          model: modelSelect.value,
          deck: deckSelect.value,
          url: data.url || "",
        },
      });

      const spinner = addBtn.querySelector(".loading-spinner");
      if (spinner) spinner.style.display = "none";

      statusEl.className = "status success";
      statusEl.innerHTML = '✅ 追加しました！<svg class="success-checkmark" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
      statusEl.style.animation = "successPulse 0.5s ease-out";
      addBtn.childNodes[0].textContent = "完了";

      // 1.5秒後に自動で閉じる
      setTimeout(cleanup, 1500);
    } catch (err) {
      modal.classList.remove("loading");
      addBtn.disabled = false;
      const spinner = addBtn.querySelector(".loading-spinner");
      if (spinner) spinner.style.display = "none";
      addBtn.childNodes[0].textContent = "追加";
      statusEl.className = "status error";

      // エラーメッセージを詳細に表示
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        statusEl.innerHTML = "❌ <strong>AnkiConnectに接続できません</strong><br><br>Ankiが起動していること、AnkiConnectアドオンがインストールされていることを確認してください。";
      } else if (err.message.includes("重複") || err.message.includes("duplicate")) {
        statusEl.innerHTML = "⚠️ <strong>この単語は既に存在します</strong><br><br>重複を許可する場合はAnkiの設定を変更してください。";
      } else if (err.message.includes("タイムアウト")) {
        statusEl.innerHTML = "⏱️ <strong>タイムアウト</strong><br><br>ネットワーク接続を確認してください。";
      } else if (err.message.includes("単語が入力") || err.message.includes("デッキが選択") || err.message.includes("ノートタイプが選択")) {
        statusEl.innerHTML = "❌ " + err.message;
      } else {
        statusEl.innerHTML = "❌ <strong>エラー</strong><br><br>" + err.message;
      }
    }
  });

  // 翻訳フィールドにフォーカス（編集しやすいように）
  document.body.appendChild(host);
  translationInput.focus();
  translationInput.select();

  // 自動発音（設定で有効な場合）
  if (data.settings && data.settings.autoSpeak && wordInput.value.trim()) {
    setTimeout(() => speakBtn.click(), 300);
  }
}

// 通知を表示（簡易版）
function showNotification(message, isError) {
  const existing = document.getElementById("anki-word-adder-notification");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "anki-word-adder-notification";
  el.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 2147483647;
    padding: 12px 20px; border-radius: 8px; font-size: 14px;
    font-family: -apple-system, sans-serif; color: white;
    background: ${isError ? "#c62828" : "#2e7d32"};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.2s ease-out;
  `;
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 3000);
}

// 文脈内の単語をハイライト
function highlightWordInContext(context, word) {
  if (!context || !word) return context;

  // 大文字小文字を区別せずに単語を検索してハイライト
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedWord})`, "gi");

  return context.replace(regex, "<b>$1</b>");
}

// HTMLエスケープ
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
