// デフォルト設定
const DEFAULT_SETTINGS = {
  defaultDeck: "Default",
  defaultModel: "Basic",
  autoTranslate: true,
  autoSpeak: false,
  highlightWord: true,
  darkMode: false,
};

// 設定を読み込む
async function loadSettings() {
  try {
    const result = await browser.storage.local.get("settings");
    const settings = result.settings || DEFAULT_SETTINGS;

    document.getElementById("defaultDeck").value = settings.defaultDeck || "";
    document.getElementById("defaultModel").value = settings.defaultModel || "";
    document.getElementById("autoTranslate").checked = settings.autoTranslate !== false;
    document.getElementById("autoSpeak").checked = settings.autoSpeak === true;
    document.getElementById("highlightWord").checked = settings.highlightWord !== false;
    document.getElementById("darkMode").checked = settings.darkMode === true;
  } catch (err) {
    console.error("設定の読み込みに失敗:", err);
  }
}

// 設定を保存する
async function saveSettings() {
  const settings = {
    defaultDeck: document.getElementById("defaultDeck").value.trim() || "Default",
    defaultModel: document.getElementById("defaultModel").value.trim() || "Basic",
    autoTranslate: document.getElementById("autoTranslate").checked,
    autoSpeak: document.getElementById("autoSpeak").checked,
    highlightWord: document.getElementById("highlightWord").checked,
    darkMode: document.getElementById("darkMode").checked,
  };

  try {
    await browser.storage.local.set({ settings });

    const statusEl = document.getElementById("status");
    statusEl.className = "status success";
    statusEl.textContent = "設定を保存しました！";

    setTimeout(() => {
      statusEl.className = "status";
    }, 3000);
  } catch (err) {
    const statusEl = document.getElementById("status");
    statusEl.className = "status error";
    statusEl.textContent = "保存に失敗しました: " + err.message;
  }
}

// イベントリスナー
document.addEventListener("DOMContentLoaded", loadSettings);
document.getElementById("saveBtn").addEventListener("click", saveSettings);

// Enterキーで保存
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    saveSettings();
  }
});
