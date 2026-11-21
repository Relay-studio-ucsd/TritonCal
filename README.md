# TritonCal — UCSD TSS schedule viewer

English | [简体中文](README.zh-CN.md)

TritonCal is a desktop browser extension for Chrome and Arc. It takes the classes the UCSD TSS home page has already loaded and shows them as a typical week and a finals view, with full course codes, titles, times and rooms. It can export a calendar file (.ics) or a standalone offline HTML timetable. TritonCal is an independent student project, not affiliated with or endorsed by UC San Diego.

Current version: **0.7.0**. Downloads are published on [GitHub Releases](https://github.com/Relay-studio-ucsd/TritonCal/releases); the first release is still being prepared. Chrome Web Store publication is deferred because developer registration requires a fee, so the extension is loaded manually.

## Install

You don't need Node.js, the developer tools or any copied TSS responses.

1. Download `tritoncal-extension-preview-<version>.zip` from [Releases](https://github.com/Relay-studio-ucsd/TritonCal/releases) and extract it to get the `extension` folder.
2. Type `chrome://extensions` into the browser's address bar (Arc: `arc://extensions`) and press Enter.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the extracted `extension` folder. That folder must directly contain `manifest.json`.
5. Sign in to [TSS](https://tss.ucsd.edu/fiori/) yourself, go to the home page and **fully reload it once** (`⌘R` on Mac, `Ctrl+R` on Windows).
6. Click **Schedule** at the bottom right of the page, then **Open week view**. The TritonCal toolbar icon also opens the week view.

The interface starts in Chinese; click **English** to switch. The browser will mention that this local extension can run on `tss.ucsd.edu`; it needs that to read the schedule TSS has already loaded.

## Features

- **Typical week** groups recurring class slots. **Final** shows the loaded events in the supported UCSD finals periods.
- Colour by course or by one colour (seven presets or any custom colour). Every card shows the full course title, time and room.
- Switch between English and Simplified Chinese from the timetable, the schedule panel or the toolbar popup. The choice is saved and shared across the extension's views, independently of the browser language. Dates and weekdays follow it. The extension's name on the browser's extensions page is managed by the browser.
- **Export loaded events (.ics)** exports every class date the TSS tab has actually received; the button shows how many. ICS files use fixed English labels such as Lecture and Exam and keep course titles and room names exactly as TSS supplies them.
- **Download offline schedule (.html)** creates a standalone timetable (see below).

## Offline timetable on your phone (experimental)

In the desktop week view, click **Download offline schedule (.html)** to get `tritoncal-offline.html`. It contains only what the timetable needs to display, with no TSS event numbers and no raw responses. It keeps the language used at download and works without the extension or an internet connection, and you can move between real calendar weeks.

Send the file to your own phone and open it in a browser that supports local HTML. Some file previewers don't run scripts; if you see only the title and no classes, report your phone model and how you opened the file. The file is a snapshot and does not update, so download it again after your courses change. It contains your personal schedule, so don't share it as if it were the extension. Phone use has not been checked on real devices yet.

## Troubleshooting

- **Can't find the extensions page:** type `chrome://extensions` into the address bar and press Enter, not into a web page's search box.
- **No "Load unpacked" button:** turn on **Developer mode** on the extensions page first.
- **"Manifest file is missing":** extract the ZIP first, then select the folder that directly contains `manifest.json`.
- **Installed, but no button on TSS:** check that the extension is enabled, then fully reload the TSS home page.
- **The button says "Waiting for TSS to load your schedule":** make sure TSS's own course area has loaded. The extension relies on the schedule the page receives itself and cannot request it for TSS.
- **The typical week is empty:** let TSS load the whole term. Only slots that meet the frequency threshold appear.
- **Final is empty:** finals dates may not be loaded yet, or the term is outside the supported calendar and TSS has no exam flag. Check Final Examination in the TSS course details. Loading no events does not mean you have no courses.

If it still doesn't work, report the browser name and the text the button shows.

## Update and uninstall

- **Update:** replace the contents of your `extension` folder with the new version, click the reload button for TritonCal on the extensions page, then refresh TSS. Don't move or delete the folder while you use the extension.
- **Uninstall:** find TritonCal on the extensions page, click **Remove**, then refresh or close the TSS tab. Delete any downloaded `.ics` and `.html` files yourself.

## Sharing and testing

When letting someone try it, share **only** the release ZIP or the `extension` folder, never a project's `input/` folder, which may contain personal schedules and student IDs. Each person signs in to TSS with their own account and loads the extension in their own browser.

What to check (desktop first; calendar import is optional):

- Does **Schedule** appear at the bottom right?
- Does each regular slot appear once in the typical week? Does Final include the finals confirmed in TSS, with unflagged items labelled "Finals-period event"?
- Are the time, course title and room of any two courses correct and fully visible?
- Do **By course** and **Single color** switch, and do the presets and custom colour apply immediately and survive a reload?

Feedback format: `Browser: ____; Schedule button: yes/no; Typical week and Final: correct/problem; Times and rooms: correct/problem; Description: ____.`

Never send account names, passwords, student IDs or raw TSS responses. If you choose to send a screenshot, crop it to the extension's area.

## Data and limitations

The extension only observes schedule responses TSS has already received. It never starts, replays or polls TSS requests, never automates the page, and never handles login details. It has no server, analytics or online translation. Schedule data stays in page memory. Only the single-colour choice (in TSS's local storage) and the language choice (in the extension's own storage) are saved. Exported files contain your timetable, so keep them private. Details: [privacy policy (Chinese)](extension/PRIVACY.md).

- Rooms appear only when TSS fills in `Room`. The `Location` field can be just the campus name, so it is never shown as a room.
- If TSS loads incomplete data, the timetable is incomplete too. A slot appears in the typical week only if it occurs in at least half of the loaded weeks, rounded up. Slots are grouped by course code, type, section, weekday, start and end time, and room. Exams are left out. There is no term filter yet.
- Final covers Fall 2026, Winter 2027 and Spring 2027 using the [official UCSD calendar](https://blink.ucsd.edu/instructors/resources/academic/calendars/2026.html). In those terms, midterms are not shown. Events without an exam flag are labelled "Finals-period event", so confirm them against Final Examination in the course details. For other terms, only explicitly flagged exams appear, and these may include midterms. An empty Final view does not mean you have no exams.
- After installing, reload the TSS home page so it loads the schedule again. The extension never requests it.
- The extension is built for desktop. Windows appearance and phone compatibility have not yet been tested on real devices. Exported files are snapshots and do not update.

## Development

```sh
git clone https://github.com/Relay-studio-ucsd/TritonCal.git
cd TritonCal
npm test
npm run package
```

Requires Node.js 20 or newer, with no npm dependencies. `npm test` runs `tests/`. `npm run package` regenerates the bundled translations and writes preview and store-candidate ZIPs to `out/` from an explicit file allowlist. The optional `scripts/check-ui.cjs` browser check uses a separately installed Playwright and Chrome with fake data; it never opens TSS.

All technical documentation (TSS interfaces, data model, architecture, decisions, versioning, release status and history) is in [MAINDOC.md](MAINDOC.md). AI agents start from [AGENTS.md](AGENTS.md). Keep personal captures in the ignored `input/` folder and build output in the ignored `out/` folder.
