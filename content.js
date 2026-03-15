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

// 確認モーダルを表示
function showConfirmationModal(data) {
  // 既存のモーダルを削除
  const existing = document.getElementById("anki-word-adder-host");
  if (existing) existing.remove();

  // Shadow DOMホスト作成（ページのCSSから隔離）
  const host = document.createElement("div");
  host.id = "anki-word-adder-host";
  host.style.cssText =
    "all:initial; position:fixed; top:0; left:0; width:100%; height:100%; z-index:2147483647;";

  const shadow = host.attachShadow({ mode: "closed" });

  // デッキ選択肢のHTML生成
  const deckOptions = (data.decks || ["Default"])
    .map(
      (d) =>
        `<option value="${escapeHtml(d)}" ${d === "Default" ? "selected" : ""}>${escapeHtml(d)}</option>`
    )
    .join("");

  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }

      .overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        color: #333;
      }

      .modal {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        width: 420px;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        padding: 24px;
        animation: slideIn 0.2s ease-out;
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 20px;
        color: #1a1a1a;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .title::before {
        content: "A";
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px; height: 28px;
        background: #4a90d9;
        color: white;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 800;
      }

      .field {
        margin-bottom: 16px;
      }

      label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #666;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      input, textarea, select {
        width: 100%;
        padding: 10px 12px;
        border: 1.5px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        color: #333;
        background: #fafafa;
        transition: border-color 0.15s, box-shadow 0.15s;
        outline: none;
      }

      input:focus, textarea:focus, select:focus {
        border-color: #4a90d9;
        box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15);
        background: #fff;
      }

      textarea {
        resize: vertical;
        min-height: 60px;
      }

      .buttons {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      button {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
      }

      button:active {
        transform: scale(0.98);
      }

      .btn-cancel {
        background: #f0f0f0;
        color: #666;
      }

      .btn-cancel:hover {
        background: #e0e0e0;
      }

      .btn-add {
        background: #4a90d9;
        color: #fff;
      }

      .btn-add:hover {
        background: #3a7bc8;
      }

      .btn-add:disabled {
        background: #a0c4e8;
        cursor: not-allowed;
      }

      .status {
        margin-top: 12px;
        padding: 10px;
        border-radius: 8px;
        font-size: 13px;
        display: none;
      }

      .status.success {
        display: block;
        background: #e8f5e9;
        color: #2e7d32;
      }

      .status.error {
        display: block;
        background: #fce4ec;
        color: #c62828;
      }

      .loading {
        pointer-events: none;
        opacity: 0.6;
      }
    </style>

    <div class="overlay">
      <div class="modal">
        <div class="title">Ankiに追加</div>

        <div class="field">
          <label>単語</label>
          <input type="text" id="word" value="${escapeHtml(data.word)}" />
        </div>

        <div class="field">
          <label>文脈</label>
          <textarea id="context" rows="2">${escapeHtml(data.context)}</textarea>
        </div>

        <div class="field">
          <label>翻訳 / 意味</label>
          <input type="text" id="translation" value="${escapeHtml(data.translation)}" />
        </div>

        <div class="field">
          <label>デッキ</label>
          <select id="deck">${deckOptions}</select>
        </div>

        <div class="buttons">
          <button class="btn-cancel" id="cancel">キャンセル</button>
          <button class="btn-add" id="add">追加</button>
        </div>

        <div class="status" id="status"></div>
      </div>
    </div>
  `;

  const wordInput = shadow.getElementById("word");
  const contextInput = shadow.getElementById("context");
  const translationInput = shadow.getElementById("translation");
  const deckSelect = shadow.getElementById("deck");
  const addBtn = shadow.getElementById("add");
  const cancelBtn = shadow.getElementById("cancel");
  const statusEl = shadow.getElementById("status");
  const modal = shadow.querySelector(".modal");

  // Escキーで閉じる
  const onKeydown = (e) => {
    if (e.key === "Escape") {
      cleanup();
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

  // キャンセル
  cancelBtn.addEventListener("click", cleanup);

  // 追加
  addBtn.addEventListener("click", async () => {
    const word = wordInput.value.trim();
    if (!word) {
      statusEl.className = "status error";
      statusEl.textContent = "単語を入力してください";
      return;
    }

    addBtn.disabled = true;
    addBtn.textContent = "追加中...";
    modal.classList.add("loading");

    try {
      await browser.runtime.sendMessage({
        action: "addToAnki",
        data: {
          word: word,
          context: contextInput.value.trim(),
          translation: translationInput.value.trim(),
          deck: deckSelect.value,
          url: data.url || "",
        },
      });

      statusEl.className = "status success";
      statusEl.textContent = "追加しました！";
      addBtn.textContent = "完了";

      // 1.5秒後に自動で閉じる
      setTimeout(cleanup, 1500);
    } catch (err) {
      modal.classList.remove("loading");
      addBtn.disabled = false;
      addBtn.textContent = "追加";
      statusEl.className = "status error";

      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        statusEl.textContent =
          "AnkiConnectに接続できません。Ankiが起動しているか確認してください。";
      } else {
        statusEl.textContent = "エラー: " + err.message;
      }
    }
  });

  // 翻訳フィールドにフォーカス（編集しやすいように）
  document.body.appendChild(host);
  translationInput.focus();
  translationInput.select();
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

// HTMLエスケープ
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
