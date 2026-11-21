# TritonCal — UCSD TSS schedule viewer

English | [简体中文](README.zh-CN.md)

TritonCal is a desktop browser extension for Chrome and Arc. It takes the classes the UCSD TSS home page has already loaded and shows them as a typical week and a finals view, with full course codes, titles, times and rooms. It can export a calendar file (.ics) or a standalone offline HTML timetable. TritonCal is an independent student project, not affiliated with or endorsed by UC San Diego.

Current version: **0.7.0**. Downloads are published on [GitHub Releases](https://github.com/Relay-studio-ucsd/TritonCal/releases); the first release is still being prepared. Chrome Web Store publication is deferred because developer registration requires a fee.

## Install

No programming tools are needed. Full guide: [extension/README.en.md](extension/README.en.md) (中文：[extension/README.md](extension/README.md)).

1. Download `tritoncal-extension-preview-<version>.zip` from [Releases](https://github.com/Relay-studio-ucsd/TritonCal/releases) and extract it to get the `extension` folder.
2. Open `chrome://extensions` (Arc: `arc://extensions`), enable **Developer mode**, choose **Load unpacked**, and select the `extension` folder. It must directly contain `manifest.json`.
3. Sign in to TSS yourself and fully reload its home page.
4. Click **Schedule** at the bottom right, then **Open week view**. The interface starts in Chinese; click **English** to switch.

## Features

- **Typical week** groups recurring class slots. **Final** shows the loaded events in the supported UCSD finals periods.
- Colour by course or by one colour of your choice. Every card shows the full course title, time and room.
- Switch between English and Simplified Chinese from the timetable, the schedule panel or the toolbar popup. The choice is saved and shared across the extension's views, independently of the browser language. Dates and weekdays follow it.
- Offline HTML keeps the language used at download and works without the extension or an internet connection.
- ICS files use fixed English labels such as Lecture and Exam, and keep course titles and room names exactly as TSS supplies them.

## Data and limitations

The extension only observes schedule responses TSS has already received. It never starts, replays or polls TSS requests, never automates the page, and never handles login details. It has no server, analytics or online translation. Schedule data stays in page memory; only your colour and language preferences are saved locally. Exported files contain your timetable, so keep them private. Details: [privacy policy (Chinese)](extension/PRIVACY.md).

If TSS loads incomplete data, the timetable is incomplete too. A slot appears in the typical week only if it occurs in at least half of the loaded weeks, rounded up. Final covers Fall 2026, Winter 2027 and Spring 2027 using the [official UCSD calendar](https://blink.ucsd.edu/instructors/resources/academic/calendars/2026.html). Events in those periods without an exam flag are labelled "Finals-period event", so confirm them against Final Examination in the course details. For other terms, only explicitly flagged exams appear, and these may include midterms. An empty Final view does not mean you have no exams.

The extension is built for desktop. Windows appearance and phone compatibility have not yet been tested on real devices. Exported files are snapshots and do not update.

## Development

```sh
git clone https://github.com/Relay-studio-ucsd/TritonCal.git
cd TritonCal
npm test
npm run package
```

Requires Node.js 20 or newer, with no npm dependencies. `npm test` runs `tests/`. `npm run package` regenerates the bundled translations and writes preview and store-candidate ZIPs to `out/` from an explicit file allowlist. The optional `scripts/check-ui.cjs` browser check uses a separately installed Playwright and Chrome with fake data; it never opens TSS.

All technical documentation (TSS interfaces, data model, architecture, decisions, versioning, release status and history) is in [MAINDOC.md](MAINDOC.md). AI agents start from [AGENTS.md](AGENTS.md). Keep personal captures in the ignored `input/` folder and build output in the ignored `out/` folder.
