# Anki Word Adder - Firefox Extension

> 🇯🇵 日本語版は [README.ja.md](README.ja.md) をご覧ください

A Firefox extension that lets you add words to Anki flashcards directly from web pages with just a right-click.

Includes automatic translation and the ability to review/edit before adding.

## Demo

1. Select a word → Right-click → **"Add to Anki"**
2. Review/edit translation in modal → Click **"Add"**

## Features

### Core Features
- **Right-click menu** - Add to Anki instantly
- **Keyboard shortcut** - `Ctrl+Shift+A` for quick access
- **Auto context extraction** - Automatically captures the sentence containing the word
- **Auto translation** - Uses MyMemory API (free, no API key required)
- **Fully editable** - Modify word, context, and translation before adding
- **Deck selection** - Choose from your existing Anki decks
- **Auto language detection** - Detects page language for Japanese ⇔ English translation

### Advanced Features
- **Dictionary API integration** - Automatically fetches pronunciation, part of speech, definitions, and examples for English words (Free Dictionary API)
- **Screenshot capture** - Auto-attach screenshots of the page (optional, configurable)
- **Text-to-speech** - Hear word pronunciation
- **Context highlighting** - Bold words in Anki cards for emphasis

### UX Enhancements
- **Loading indicators** - Spinner animations during data fetch
- **Success animations** - Checkmark effect when cards are added
- **Detailed error messages** - Clear explanations of issues and solutions
- **Input validation** - Auto-check required fields

## Setup

### 1. Install AnkiConnect

[AnkiConnect](https://ankiweb.net/shared/info/2055492159) is an Anki add-on that provides a REST API.

1. Open Anki
2. **Tools → Add-ons → Get Add-ons**
3. Enter code `2055492159` and install
4. Restart Anki

### 2. Install the Firefox Extension

#### For Development (Temporary)

1. Open `about:debugging#/runtime/this-firefox` in Firefox
2. Click **"Load Temporary Add-on"**
3. Select `manifest.json` from this repository

> Temporary add-ons are removed when Firefox restarts.

#### For Permanent Use

Download the latest signed `.xpi` file from [Releases](https://github.com/Uch4sQ/anki-word-adder/releases) and drag it into Firefox.

Alternatively, sign it yourself using [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/):

```bash
npm install -g web-ext
cd anki-word-adder
web-ext sign --api-key=YOUR_KEY --api-secret=YOUR_SECRET --channel=unlisted
```

## Usage

### Basic Usage

1. **Start Anki** (AnkiConnect runs on `localhost:8765`)
2. Select a word on any web page
3. Right-click → **"Add to Anki"** or press `Ctrl+Shift+A`
4. A modal will appear showing:
   - **Word** - Selected text (editable)
   - **Dictionary info** - For English words: pronunciation, definitions, examples (click to copy to translation field)
   - **Context** - Sentence containing the word (auto-extracted, editable)
   - **Translation/Meaning** - Auto-translated (editable, focused by default)
   - **Screenshot** - Page capture (if enabled in settings)
   - **Note Type** - Select from your Anki note types
   - **Deck** - Select from your Anki decks
5. Review/edit the translation and click **"Add"**

### Keyboard Shortcuts

- `Ctrl+Shift+A` - Add selected text to Anki
- `Enter` - Submit from within modal
- `Esc` - Close modal

## Settings

Click the extension icon → **Settings** to customize:

- **Default Deck** - Deck name for new cards
- **Default Note Type** - Note type to use
- **Auto Translation** - Automatically fetch translations
- **Auto Speech on Modal** - Read word aloud when modal opens
- **Highlight Word in Context** - Bold the word in Anki cards
- **Use Dictionary API** - Fetch dictionary data for English words
- **Auto Screenshot Capture** - Automatically attach page screenshots

## Anki Card Structure

| Side | Content |
|---|---|
| Front | Selected word |
| Back | Translation + Context + Screenshot + Source URL |

Cards are automatically tagged with `web-import`.

## Translation

- Uses [MyMemory Translation API](https://mymemory.translated.net/) (free)
- Auto-detects page language from `lang` attribute
- Japanese pages → Translate to English
- Other languages → Translate to Japanese
- Always review translations before adding

## Troubleshooting

### ❌ Cannot connect to AnkiConnect

**Causes:**
- Anki is not running
- AnkiConnect add-on is not installed
- AnkiConnect is running on a different port

**Solutions:**
1. Start Anki
2. Verify AnkiConnect add-on (code: `2055492159`) is installed
3. Restart Anki
4. Check browser console (F12) for errors

### ⚠️ Translation fetch failed

**Causes:**
- Internet connection issues
- MyMemory API rate limit (1000 requests/day)

**Solutions:**
1. Check internet connection
2. Disable "Auto Translation" in settings and enter translations manually
3. Wait and retry later

### 📋 Decks not showing

**Causes:**
- AnkiConnect connection error
- No decks exist in Anki

**Solutions:**
1. Create a deck in Anki
2. Check AnkiConnect settings (Tools → Add-ons → AnkiConnect → Config)
3. Verify `webCorsOriginList` includes `"http://localhost"`

### 🔁 Duplicate error

**Causes:**
- Word already exists in deck

**Solutions:**
1. Search for and edit existing card in Anki
2. To allow duplicates: Anki → Tools → Add-ons → AnkiConnect → Config → `allowDuplicate: true`

### ⏱️ Timeout error

**Causes:**
- Slow network connection
- AnkiConnect slow to respond

**Solutions:**
1. Check network connection
2. Restart Anki
3. Shorten word or reduce context

## FAQ

### Can I use it offline?

Partially:
- ✅ Add cards to Anki (Anki runs locally)
- ❌ Auto translation (requires internet for MyMemory API)
- ❌ Dictionary API (requires internet for Free Dictionary API)

For offline use, disable "Auto Translation" and "Dictionary API" in settings and enter translations manually.

### Does it support other languages?

Current support:
- **Auto Translation**: Japanese ⇔ English only (MyMemory API supports more, but this extension is limited to these two)
- **Dictionary API**: English only

Multilingual support is planned for the future.

### Can I use it on Chrome?

Currently Firefox-only (Manifest V2). Chrome support (Manifest V3) requires separate implementation.

### Does it work on mobile?

May work on Firefox for Android, but with limitations:
- AnkiConnect requires Anki on a PC (not mobile Anki)
- Mobile and PC must be on the same network with AnkiConnect host configured

Recommended: Use on PC Firefox

### Screenshots are too large

Screenshots are Base64-encoded PNG images, typically 500KB-2MB each.

**Recommendations:**
- Disable "Auto Screenshot Capture" in settings and add screenshots manually when needed
- Periodically clean up Anki's media folder

### Can I use custom note types?

This extension uses the **first 2 fields** of your note type:
- Field 1: Word
- Field 2: Translation + Context + Screenshot + Source

Custom note types must have at least 2 fields. Specify your note type in "Default Note Type" setting.

## File Structure

```
anki-word-adder/
├── manifest.json      # Extension manifest (Manifest V2)
├── background.js      # Background script (API communication)
├── content.js         # Content script (UI, text extraction)
├── options.html       # Settings page UI
├── options.js         # Settings page logic
├── icons/
│   └── icon.svg       # Extension icon
├── README.md          # English documentation
├── README.ja.md       # Japanese documentation
└── CONTRIBUTING.md    # Contribution guide
```

## Development

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Uch4sQ/anki-word-adder.git
   cd anki-word-adder
   ```

2. Open `about:debugging#/runtime/this-firefox` in Firefox

3. Click **"Load Temporary Add-on"** → Select `manifest.json`

4. Edit code and reload extension (Reload button or `Ctrl+R`)

### Debugging

#### Console Logs

- **Background script**: `about:debugging` → Extension "Inspect" button
- **Content script**: Open page → `F12` → Console tab
- **Settings page**: Open settings → `F12` → Console tab

#### Common Debug Steps

1. Check browser console for error messages
2. Use `console.log()` to trace data flow
3. Check AnkiConnect responses (`about:debugging` → Extension console)

### Testing

Currently manual testing only.

**Test Checklist:**

- [ ] Select English word → Dictionary info appears
- [ ] Select Japanese text → Translation only appears
- [ ] Enable screenshot → Preview shows
- [ ] Anki not running → Error message displays
- [ ] Duplicate word → Duplicate error displays
- [ ] `Ctrl+Shift+A` → Modal opens
- [ ] Change settings → Settings persist
- [ ] Add word → Saves correctly in Anki

### Release

1. Update version number in `manifest.json`

2. Build:
   ```bash
   npm install -g web-ext
   web-ext build
   ```

3. Submit generated `.zip` to [Firefox Add-ons](https://addons.mozilla.org/)

### Contributing

Bug reports, feature requests, and pull requests are welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT
