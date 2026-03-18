# Anki Word Adder - Installation Guide

> 🇯🇵 日本語版: [INSTALL.ja.md](INSTALL.ja.md)

## Requirements

1. **Firefox** (latest version recommended)
2. **Anki** (desktop version)
3. **AnkiConnect** add-on

## Setup Instructions

### 1. Install AnkiConnect

1. Open Anki
2. **Tools → Add-ons → Get Add-ons**
3. Enter code `2055492159` and install
4. Restart Anki

### 2. Install the Extension

#### Method A: Drag & Drop (Recommended)

1. Open Firefox
2. Drag the `anki-word-adder-v1.2.0.xpi` file into the Firefox window
3. Click **"Add"**
4. Done!

#### Method B: Via about:addons

1. Open `about:addons` in Firefox
2. Click the gear icon ⚙️ → **"Install Add-on From File"**
3. Select `anki-word-adder-v1.2.0.xpi`
4. Click **"Add"**

## Usage

### Basic Usage

1. **Start Anki**
2. Select a word on any web page
3. Right-click → **"Add to Anki"** or press `Ctrl+Shift+A`
4. Review translation and definitions in the modal
5. Click **"Add"**

### Features

- **Auto Translation**: Japanese ⇔ English
- **Dictionary API**: Automatic pronunciation, definitions, and examples for English words
- **Context Extraction**: Automatically captures the sentence containing the word
- **Screenshot Capture**: Optional screenshot attachment
- **Keyboard Shortcut**: `Ctrl+Shift+A`

### Settings

Click the extension icon → **Settings** to customize:

- Default deck
- Default note type
- Auto translation ON/OFF
- Dictionary API ON/OFF
- Screenshot capture ON/OFF

## Troubleshooting

### ❌ Cannot connect to AnkiConnect

- Verify Anki is running
- Verify AnkiConnect add-on (code: `2055492159`) is installed
- Restart Anki

### Translation fetch failed

- Check internet connection
- Disable "Auto Translation" in settings and enter translations manually

### Other Issues

For more details, see the "Troubleshooting" section in [README.md](README.md).

## License

MIT License

---

**Happy learning!** 🎉
