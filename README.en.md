# TritonCal — UCSD TSS schedule viewer

[简体中文](README.md)

TritonCal is an independent student project, not affiliated with or endorsed by UC San Diego. It displays classes already loaded by the TSS home page in a weekly timetable and exports calendar (.ics) or standalone offline HTML files.

Local preview version: **0.5.5**. These changes have not yet been merged into GitHub or published to an extension store.

## Install

No programming tools are needed. See the [English installation guide](extension/README.en.md). Extract the preview ZIP, open your browser's extensions page, enable Developer mode, and load the `extension` folder containing `manifest.json`. Sign in to TSS yourself and refresh its home page.

## Features and language

- Typical week groups recurring class slots; Final shows loaded events in supported UCSD finals periods.
- Course colors or a custom single color, with complete course titles, times and rooms.
- Switch English / Simplified Chinese directly using the button in the timetable header, schedule panel or toolbar popup. The choice is saved locally and shared across extension views, independently of the browser language. First use defaults to Chinese; click English to change it. Dates and weekdays follow your selection.
- Offline HTML embeds the language used at download and works without the extension or an internet connection. It retains navigation through actual calendar weeks.
- ICS uses fixed English labels such as Lecture and Exam. School-provided course titles and room names are preserved.

## Data and limitations

The extension passively observes schedule responses already received by TSS. It never initiates, replays or polls TSS requests, automates page interactions, or handles login credentials. It has no server, analytics or remote translation service. Schedule data stays in page memory; only color and language preferences are saved locally. Downloads contain your timetable, so keep them private. Full details: [privacy policy in Chinese](extension/PRIVACY.md).

Incomplete TSS data means an incomplete timetable. Typical-week slots must occur in at least half the loaded span of weeks, rounded up. Final covers Fall 2026, Winter 2027 and Spring 2027 using the [official UCSD calendar](https://blink.ucsd.edu/instructors/resources/academic/calendars/2026.html). Events without an exam flag are labelled “Finals-period event”; confirm them against Final Examination in the course details. For unsupported terms, only explicitly flagged exams appear and may include midterms. An empty Final view does not mean you have no exams.

Desktop use is the current focus. Windows appearance and phone compatibility still need device testing. Exported files are snapshots, not automatic updates.

## Development

Use Node.js 20 or newer. `npm test` runs the root tests; `npm run package` creates preview and store-candidate ZIPs using an explicit allowlist. There are no runtime npm dependencies. The optional `scripts/check-ui.cjs` regression harness uses an externally installed Playwright and Chrome with synthetic data in both languages; it never opens TSS.

Read [CLAUDE.md](CLAUDE.md) before editing. Keep personal captures under ignored `input/`, and generated artifacts under ignored `out/`. Localization keys and source strings are listed in [docs/07-i18n-strings.md](docs/07-i18n-strings.md).
