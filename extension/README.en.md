# TritonCal 0.5.5 — installation guide

[简体中文](README.md)

TritonCal displays a typical week and finals-period events from the schedule already loaded by UCSD TSS. This is an independent student project, not an official UC San Diego extension. It is a desktop preview, not yet available in an extension store.

## Load the extension

1. Extract `tritoncal-extension-preview-0.5.5.zip` and keep the resulting folder.
2. Open `chrome://extensions` in Chrome or `arc://extensions` in Arc.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the `extension` folder. The selected folder must directly contain `manifest.json`.
5. Sign in to [TSS](https://tss.ucsd.edu/fiori/) yourself. Refresh the home page once so it loads your schedule normally.
6. Click **Schedule** at the bottom right, then **Open week view**. The toolbar icon also opens the week view.

No Node.js installation or developer-console commands are needed. If the browser reports a missing manifest, extract the ZIP first and select the inner folder containing `manifest.json`.

## Language and views

Click **English / 中文** in the top-right corner of the timetable, the schedule panel or the toolbar popup. The UI changes immediately and remembers your selection across extension views and restarts. It is independent of browser language and defaults to Chinese on first use. Dates and weekdays follow your selection. The name on the browser extensions page remains browser-managed. Course names and rooms remain as supplied by TSS.

**Typical week** groups recurring slots from loaded dates. A slot must occur in at least half the loaded span of weeks, rounded up. **Final** shows events in the official Fall 2026, Winter 2027 and Spring 2027 finals periods. Some TSS exams have no exam flag; these appear as **Finals-period event**. Confirm them in the course's **Final Examination** details. Outside the supported calendar, only explicitly flagged exams appear and can include midterms. An empty view does not mean there are no exams.

Choose **By course** or **Single color**. The single-color preference is saved locally. Downloaded ICS files use English labels such as Exam and Lecture. Offline HTML preserves the language at download, runs independently of the extension, and lets you navigate actual weeks. It does not update automatically. Phone file viewers may not run HTML scripts; phone compatibility remains unverified.

## Updates, removal and privacy

Replace the extension folder with the new version, click **Reload** on the browser's extensions page, then refresh TSS yourself. Do not move or delete the folder while using the extension. To uninstall, choose **Remove** on the extensions page and close or refresh TSS.

The extension only observes schedule data the page has already loaded. It does not request more TSS data, automate TSS interactions or handle passwords. It has no server, analytics or remote translations. Schedule data remains in page memory; the single-color value is saved in TSS local storage, and the language preference is saved in extension-local storage. No schedule data is persisted. Exported files contain your personal schedule, but omit raw TSS event/module IDs. Share only the installation ZIP, not your exported timetable or personal captures. Full [privacy policy (Chinese)](PRIVACY.md).

If no schedule appears, check that the extension is enabled and refresh the TSS home page yourself. Let the page load the complete term. Report browser name, visible message and expected behavior; do not send passwords, student IDs or raw responses.
