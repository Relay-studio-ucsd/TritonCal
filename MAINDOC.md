# TritonCal — Main Documentation

All technical documentation for TritonCal lives in this file (rule: [AGENTS.md](AGENTS.md)). The only other Markdown files are `AGENTS.md` (the single entry point for every AI agent; tool-specific files such as `CLAUDE.md` are not allowed), the READMEs and `extension/PRIVACY.md`. The READMEs and PRIVACY.md are kept separate from this file but are updated whenever what they say changes. Open questions belong in [GitHub Issues](https://github.com/Relay-studio-ucsd/TritonCal/issues), not here.

**Authorship.** Work is credited to the git name that committed or submitted it; see §11 for how the history was attributed. This file was consolidated on 2026-11-21, at Nya~'s request, from the former `docs/01`–`docs/07`, `CLAUDE.md` and `fixtures/README.md` (last versions at commit `65ce62a`). The text was written by Claude Opus 5.5 and checked against the code and `git log`.

## Contents

1. [Project overview and rules](#1-project-overview-and-rules)
2. [TSS background and interfaces](#2-tss-background-and-interfaces)
3. [Data capture](#3-data-capture)
4. [Data model](#4-data-model)
5. [Extension architecture](#5-extension-architecture)
6. [Technical decisions](#6-technical-decisions)
7. [Internationalization](#7-internationalization)
8. [Fixtures and tests](#8-fixtures-and-tests)
9. [Versioning](#9-versioning)
10. [Release status](#10-release-status)
11. [History](#11-history)

---

## 1. Project overview and rules

### 1.1 Goal

TritonCal is a Chrome Manifest V3 browser extension (used in Chrome and Arc on desktop). It passively reads the courses a UCSD student has booked in **TSS** (Triton Student System, `tss.ucsd.edu`), shows them as a weekly timetable inside the TSS page, and exports an ICS calendar file or a standalone offline HTML timetable. It is an independent student project, not affiliated with or endorsed by UC San Diego.

Current state: version **0.7.0** on `main`. No GitHub Release has been published yet (§10).

### 1.2 Planned scope

Decided by Nya~ on 2026-11-21:

- **More sites.** The extension will also run on Canvas, podcast and other UCSD pages. TSS is the first site; §5 describes the layout that supports more.
- **Backend integration** is planned.

The backend plan reverses a non-goal from the original roadmap: "no backend, no accounts, no storing anyone's data on a server" (2026-10-02). Before any backend code is written, `extension/PRIVACY.md` (which currently says there is no server), the manifest guards in `tests/manifest.test.cjs` and the list of data that may leave the browser all need an explicit decision. See §5.7.

### 1.3 Hard rules (non-negotiable)

- **Passive capture only.** Read only data the TSS page has already loaded. Never send requests to `tss.ucsd.edu`, never replay or poll, never automate clicks, never touch login or passwords. Seen from the server, a TritonCal user's traffic must be identical to any other student's.
- **Privacy.** Real captures go in `input/`, which is git-ignored because they contain student IDs and booking GUIDs. Never commit them, and never paste raw responses into docs or code comments. Use the fake data in `fixtures/` for examples.
- **Zero dependencies.** Use Node ≥ 20 built-ins and plain static files. No frameworks, bundlers or npm dependencies. (The optional UI check `scripts/check-ui.cjs` uses an externally installed Playwright; nothing is added to `package.json`.)
- **Real data over guesses.** Trust only fields marked verified in §2. Anything else must be confirmed against a real captured response before parsing code is written for it.
- **Ask about look and feel; don't guess.** UI direction is settled with the maintainers first; decisions so far are in §6.2.

### 1.4 Working conventions (for people and AI assistants)

- Move one change at a time and show the result before starting the next.
- When someone has to act in the browser (for example, capturing a response), give exact, followable steps, then wait.
- Extension code consists of classic scripts. Each file is one IIFE that publishes a single `globalThis.TritonCal*` object, because content scripts cannot use ES module imports (§5.4). Node scripts and tests are CommonJS `.cjs`. Write modern JavaScript (`const`, template literals) and give key functions a one-line comment in Chinese, the existing convention in the code.
- Run tests with `node --test`, using inputs from `fixtures/`. Every pure function has a test.
- Verify exports by using them, not by reading the generated text. For example, import an ICS file into a real calendar and check the holidays and the times after daylight saving ends.

---

## 2. TSS background and interfaces

The initial research is dated 2026-10-02 (Daniel Chen, `a06d3b7`); it was updated after a real capture on 2026-10-19. **Verified** means the field was seen in a real TSS response. Entries dated 2026-08 come from the TritonPlan project's verification records.

### 2.1 What TSS is

- TSS launched in July 2026, replacing My TritonLink, ISIS and WebReg. From Fall 2026 on, all course enrollment (TSS calls it *booking*) happens there.
- The entry point `https://sis.ucsd.edu` redirects to `https://tss.ucsd.edu/fiori`. Schedule of Classes is `https://tss.ucsd.edu/fiori#YSchedule-view`.
- TSS runs on SAP Student Lifecycle Management (SLcM) with a SAPUI5 / Fiori front end, implemented by invenioLSI with minimal customization.
- Official help mentions two places to see a schedule: Student Overview → **Upcoming Events** (orange = class, blue = holiday) and **Schedule of Classes**. There is no export, print, ICS or calendar sync, and Upcoming Events does not show rooms. That gap is what TritonCal fills.

### 2.2 How schedule data reaches the browser

SAPUI5 pages contain no data. After loading, the page requests **OData** (a REST/JSON protocol) responses and renders them, so the student's own browser already holds the full timetable as JSON (visible in DevTools → Network, filter `odata`). TritonCal copies responses the browser has already received and never issues its own.

SAP often bundles several requests into one `POST …/$batch` with a multipart response that embeds several JSON documents. The same data can arrive as a standalone response or inside a `$batch`, and both cases are handled.

TSS re-requests the home-page data only on a **full page reload**; navigation inside the app does not trigger it again.

### 2.3 Known OData endpoints

All URLs are prefixed with `https://tss.ucsd.edu`.

**Home page**

| Endpoint | Format | Content | Status | Used? |
|---|---|---|---|---|
| `GET /sap/opu/odata/ited/EVENT_TIMETABLE_SRV/EventListSet?$filter=(EventDate ge datetime'…' and EventDate le datetime'…')` | OData v2 `{"d":{"results":[…]}}` | One row per class meeting, already expanded by date: `EventId`, `ModuleId`, `EventDate` (`/Date(ms)/`), `EventName`, `CourseName`, `TeachingMethod`, `EventIsExam`, `StartTime` / `EndTime` (`PT11H00M00S`), `Room`, `Location`, `Building`, `StartDate` / `EndDate`. This is the data behind Upcoming Events. | Verified 2026-10-19 in a real response after a normal login and full reload | **Yes, the only source** |
| `GET /sap/opu/odata/ited/BC_OVP_BOOKED_MODULES_SRV/ModuleSet` | OData v2 | Booked courses, one row per course: `SmShort` ("CSE-101"), `SmStext` (title), `SmObjid` (zero-padded module id), `AcademicYear` ("2026"), `AcademicSession` ("002"), `Credits`. Booked courses only: no waitlist, no status field. | Verified 2026-08-11 / 08-21 (TritonPlan) | No |

Limits seen in the 2026-10-19 capture (156 rows):

- `Room` is sometimes empty.
- `Location` may contain only the campus name, so it cannot be used as a room.
- `Building` was empty in every row.
- `EventIsExam = false` does not rule out a final. On 2026-10-20, two real finals listed in Schedule of Classes had `false` in `EventListSet`.

**My Courses page**

| Endpoint | Format | Content | Status | Used? |
|---|---|---|---|---|
| `POST /sap/opu/odata/ITUS/PR_MY_MODULES_V2_SRV/$batch` → `ModuleHeaderSet` | OData v2 inside `$batch` | Each course plus the booked package: `EventPackageAbbr` ("P-001-001"), `SmStatusText` ("Booked" / "Waitlisted"), `WaitlistBooking` | Verified 2026-08-19 / 08-21 (TritonPlan) | No |

**Schedule of Classes** (public; could fill in missing rooms, instructors and final exam times)

| Endpoint | Format | Content | Status | Used? |
|---|---|---|---|---|
| Course search `YUCSD_CON_MODULE` | OData v4 `{"@odata.context":…,"value":[…]}` | `CourseAbbr`, `CourseTitle`, `ModuleID`, `CreditsDisplay`, `DepartmentText` | Verified (TritonPlan) | No |
| A course's `_sections` navigation | OData v4 | One row per Event × EventPackage: `EventAbbr` ("001-000-LE"), `TeachingMethod` ("LE"), `InstructorName`, `EventPkgText` ("CSE-008A (P-001-001)"), `BeginDate` / `EndDate`, and `Sched`, a preformatted multi-line string | Verified (TritonPlan) | No |

`Sched` examples:

```
M, W, F 1:00 PM - 1:50 PM In Person @ Center Hall 115
Tu, Th 11:00 AM - 12:20 PM In Person @ Galbraith Hall Room 242
Final Examination 12/08/2026 11:30 AM - 2:29 PM In Person @ York Hall Room 2622
Midterm Examination 10/31/2026 10:00 AM - 11:50 AM In Person
Schedule Not Defined
```

Day codes are `M Tu W Th F Sa Su`, comma-separated, with 12-hour times. `@ location` is optional (online classes have none), and the text after `" Room "` is the room number, though some locations omit the word "Room". A course's lecture and discussion are separate Events with separate `Sched` lines. **The extension has no `Sched` parser.** Filling rooms from Schedule of Classes is an idea, not a feature.

**Other endpoints** (not useful here): `ysd_appttimes` holds enrollment time windows and contains PII, so never store it. `YUCSD_I_PREREQ_TREE` is the prerequisite tree.

### 2.4 2026–27 academic calendar

Source: [UCSD Academic and Administrative Calendar 2026–2027](https://blink.ucsd.edu/instructors/resources/academic/calendars/2026.html).

| Quarter | Quarter begins | Instruction begins | Instruction ends | Finals | Holidays (no classes) |
|---|---|---|---|---|---|
| Fall 2026 | 2026-09-21 (Mon) | 2026-09-24 (Thu) | 2026-12-04 (Fri) | 12-05 – 12-12 | 11-11 Veterans Day; 11-26 – 11-27 Thanksgiving |
| Winter 2027 | 2027-01-04 | 2027-01-04 (Mon) | 2027-03-12 (Fri) | 03-13 – 03-20 | 01-18 MLK Day; 02-15 Presidents' Day |
| Spring 2027 | 2027-03-24 | 2027-03-29 (Mon) | 2027-06-04 (Fri) | 06-05 – 06-11 | 03-26 Farmworkers Day (before instruction); 05-31 Memorial Day |

The `terms` table in `extension/sites/tss/plan.js` stores, for each quarter, the begin date, the first day of finals and the last day of finals.

US daylight saving time ends on **2026-11-01** (PDT → PST). Calendar times must therefore carry `TZID=America/Los_Angeles`; a fixed UTC offset would shift every class after November by an hour.

### 2.5 Related projects and removed references

| Project | Relation |
|---|---|
| [TritonPlan](https://github.com/hfjddjksaj/tritonplan) (MIT) | Course planner for TSS; source of the verified endpoint fields above and a reference for passive interception and `Sched` parsing. It plans future courses and does not export ICS. |
| [Schtoics](https://github.com/isaiahtx/Schtoics) (GPL) | Old WebReg → ICS in Python; ideas for academic-calendar scraping and holiday gaps. |
| Calendarize WebReg / WebReg2Cal | Chrome extensions for the old WebReg, now obsolete; evidence that the need is long-standing. |
| [CapMorningStar/ucsd-schedule](https://github.com/CapMorningStar/ucsd-schedule) | Manual Fall 2026 scheduler with ICS export in a single HTML page. |

Removed with `docs/` on 2026-11-21 and recoverable with `git show 65ce62a:<path>`:

- `docs/reference/tritonplan/`: a verbatim 2026-10-02 snapshot of five TritonPlan files (`interceptor.ts`, `extract-odata.ts`, `tss-types.ts`, `parse-sched.ts`, `time.ts`) with its MIT notice. TritonCal's code is its own; if TritonPlan code is ever copied verbatim, include its MIT copyright notice.
- `docs/reference/screenshots/apple-calendar-fall2026.jpg`: macOS Calendar, first week of Fall 2026. Titles use the TSS `EventName` format "CSE-101-LE (001-000)" and show no rooms. Source of `fixtures/fall2026-sample.json`. How those courses got into Apple Calendar was never established.
- `docs/reference/screenshots/old-webreg-spring2026.png`: the old WebReg timetable (Spring 2026), with per-course colors, times, titles, types and rooms.

Sources: [TSS Login and Navigation](https://students.ucsd.edu/my-tritonlink/tools/tool-help/tss-login-nav.html) · [TSS Project (ESR)](https://esr.ucsd.edu/projects/student/ecosystem/core-sis.html) · [UCSD Guardian, 2026-05-11](https://ucsdguardian.org/2026/05/11/new-student-system-to-replace-my-tritonlink-by-july/) · [Student Tools](https://students.ucsd.edu/my-tritonlink/tools/) · [TritonPlan source](https://github.com/hfjddjksaj/tritonplan)

---

## 3. Data capture

### 3.1 In the extension (normal path)

`extension/sites/tss/capture.js` runs in the page's **MAIN world** at `document_start` and wraps `window.fetch` and `XMLHttpRequest.prototype.open` / `send`. Original requests pass through untouched, and the script never sends a request of its own.

- It only looks at same-origin responses whose path ends in `/EVENT_TIMETABLE_SRV/EventListSet` (kind `direct`) or matches `/sap/opu/odata/<namespace>/<service>/$batch` (kind `batch`), and only successful ones (`response.ok` for fetch, 2xx for XHR).
- From a `$batch` body it cuts out every `{"d": …}` document with a quote- and escape-aware brace matcher. It keeps only rows whose `__metadata.type` ends with `EVENT_TIMETABLE_SRV.EventList`, so other personal data in the same batch never leaves the MAIN world.
- It forwards the result with `window.postMessage(…, location.origin)` (§5.3).

After installing the extension, the user must **fully reload** the TSS home page so TSS requests the timetable again.

### 3.2 DevTools (debugging and field checks)

1. Open `https://tss.ucsd.edu/fiori` in Chrome and sign in yourself (no tool or AI takes part in login).
2. Open DevTools (`F12`, or `Cmd+Option+I` on Mac) → **Network**, filter `odata`, and enable **Preserve log**.
3. Fully reload the page (`Cmd+R` / `F5`).
4. Find `EventListSet?$filter=(EventDate …`. It may be its own row or inside a `$batch` row.
5. Open it → **Response**, and save the text as `input/timetable.json`. A `$batch` response is multipart text; save it whole.
6. Alternatively, right-click the request list → **Save all as HAR with content** → `input/tss.har`. HAR is JSON, with each response body in `content.text`.

Everything under `input/` (and any `*.har`) is git-ignored. Re-check field names against a fresh capture before relying on them, since TSS may change.

`$batch` response shape:

```
--BATCH_xxx
Content-Type: application/http
Content-Transfer-Encoding: binary

HTTP/1.1 200 OK
Content-Type: application/json

{"d":{"results":[{"__metadata":{"type":"ITED_EVENT_TIMETABLE_SRV.EventList"},"EventId":"00001078",...}]}}
--BATCH_xxx--
```

To parse it, find each `{"d":`, brace-match the complete JSON, call `JSON.parse`, and identify the endpoint by `__metadata.type`: `EVENT_TIMETABLE_SRV.EventList`, `BC_OVP_BOOKED_MODULES_SRV.Module` or `PR_MY_MODULES_V2_SRV.ModuleHeader`.

**SAP formats**

- `"EventDate": "/Date(1790208000000)/"` is milliseconds since the epoch at **UTC midnight** of that calendar day, so `new Date(ms).toISOString().slice(0, 10)` gives `"2026-09-24"`. Do not convert to local time; in California that would move the date back a day.
- `"StartTime": "PT13H00M00S"` is an ISO 8601 duration (OData v2 `Edm.Time`) and means 13:00.

### 3.3 Hand-written data

For tests and UI work, write events directly in the event format of §4.1; `fixtures/term-events.json` is the example (§8.1).

---

## 4. Data model

### 4.1 Event (produced by `sites/tss/parser.js`)

`TritonCalParser.parseTimetable(body)` takes an `EventListSet` JSON string and returns `{ totalRows, events }`. Each event looks like this:

```js
{
  id: "00001078",                    // EventId (string)
  moduleId: "00012345",              // ModuleId, or ""
  date: "2026-09-24",                // EventDate as its UTC calendar date
  start: "13:00", end: "13:50",      // StartTime / EndTime, Los Angeles wall-clock time
  name: "CSE-101-LE (001-000)",      // EventName (falls back to CourseName)
  code: "CSE-101",                   // parsed from name; null if the format is unknown
  type: "LE",                        // parsed from name; null if unknown (TeachingMethod is not used)
  section: "001-000",                // parsed from name; null if unknown
  title: "Design and Analysis of Algorithms", // CourseName, or ""
  room: "Center Hall 115",           // trimmed Room, or null; Location and Building are ignored
  isExam: false                      // EventIsExam === true
}
```

Parsing rules:

- A row is dropped if it lacks `EventId`, a date or a time, or if `end <= start`. TSS sends holidays and other all-day markers as zero-length rows.
- Rows repeating the same `EventId|date|start` are dropped as duplicates.
- Events are sorted by date, start time and name.
- `code`, `type` and `section` come from the pattern `^(.+)-([A-Z]{2})\s+\(([^)]+)\)$`. Unrecognized names are kept as they are, with those three fields set to `null`; the parser never guesses.
- Events live only in the page's memory. The raw response is never stored.

The shared modules (`ics.js`, `offline.js`) and the TSS planning and rendering code all consume this shape. **A parser for a new site should emit the same shape** so it can reuse them.

### 4.2 Derived views (`sites/tss/plan.js`)

- `planWeek(events, weekStart)` lays out one natural week. It shows Monday–Friday, adding Saturday and Sunday only if they have events. Overlapping events sit side by side in columns. The hour range runs from one hour before the earliest event to one hour after the latest; an empty week defaults to 08:00–18:00.
- `planTypicalWeek(events)` and `planFinal(events)` follow the rules in §6.3.

### 4.3 The original `schedule.json` design (not implemented)

The 2026-10-02 plan defined a `schedule.json` contract (a term with holidays, courses → components → meetings, exams, and optional occurrences) for a static-HTML and command-line pipeline. The project switched to the extension on 2026-10-19 and never built that pipeline. Only `fixtures/fall2026-sample.json` uses the format. The full design can be read with `git show 65ce62a:docs/03-data-model.md`.

---

## 5. Extension architecture

Introduced in 0.7.0 (`f7445c9`), when the extension was split into shared and site-specific code for the multi-site plan in §1.2.

### 5.1 Layout

```
extension/
├── manifest.json            MV3 manifest; the source of truth for the version (§9)
├── _locales/en, zh_CN/      Translation sources (§7)
├── icons/                   Toolbar and store icons
├── shared/                  Site-independent; works on the event model (§4.1)
│   ├── locales.js           Generated from _locales by scripts/build-locales.cjs; do not edit
│   ├── i18n.js              Language state, translation and date formatting
│   ├── ics.js               ICS generator
│   └── offline.js           Standalone offline HTML generator
├── sites/
│   └── tss/                 Everything that knows about TSS
│       ├── capture.js       MAIN world: passive fetch/XHR observer
│       ├── parser.js        EventListSet → events; date helpers
│       ├── plan.js          UCSD term calendar; typical week, Final and week layout
│       ├── week-view.js     Full-screen timetable dialog
│       └── content.js       Bottom-right panel, message handling, wiring
├── popup/                   Toolbar popup (popup.html, popup.js)
├── README.md, README.en.md  Installation guide shipped in the ZIP
└── PRIVACY.md               Privacy policy shipped in the ZIP
```

Outside `extension/`: `scripts/` (locale build, packaging, optional UI check), `tests/`, `fixtures/`, `input/` (ignored) and `out/` (ignored build output).

### 5.2 Modules

| File | Runs in | Publishes | Needs at load time | Calls later |
|---|---|---|---|---|
| `sites/tss/capture.js` | TSS page, MAIN world | none (sets `window.__tritonCalCaptureInstalled`) | none | none |
| `shared/locales.js` | isolated world, popup | `TritonCalMessages` | none | none |
| `shared/i18n.js` | isolated world, popup | `TritonCalI18n` | `TritonCalMessages`, `chrome.storage` | none |
| `sites/tss/parser.js` | isolated world | `TritonCalParser` | none | none |
| `sites/tss/plan.js` | isolated world | `TritonCalPlan` (`planWeek`, `planTypicalWeek`, `planFinal`) | `TritonCalParser` | none |
| `shared/ics.js` | isolated world | `TritonCalIcs` | none | none |
| `shared/offline.js` | isolated world | `TritonCalOffline` | none | `TritonCalI18n` |
| `sites/tss/week-view.js` | isolated world | `TritonCalWeekView` (`create`) | `TritonCalI18n`, `TritonCalPlan`, `TritonCalIcs`, `TritonCalOffline` | none |
| `sites/tss/content.js` | isolated world | none | `TritonCalI18n` | `TritonCalParser`, `TritonCalPlan`, `TritonCalWeekView` |
| `popup/popup.js` | popup page | none | `TritonCalI18n` | `chrome.tabs` |

### 5.3 Runtime flow

1. **Capture → content script.** `capture.js` posts `{ channel: "tritoncal:timetable:v1", url, kind: "direct" | "batch", body }` to `location.origin`. `content.js` accepts the message only if `event.source === window`, the origin matches, the channel matches, and the URL path is again an `EventListSet` or a `$batch`. It then calls `parseTimetable` and keeps `{ totalRows, events, capturedAt }` in memory.
2. **Panel.** `content.js` mounts a "Schedule" button and panel at the bottom right (closed shadow DOM, host `#tritoncal-extension-root`), showing the typical-week slots.
3. **Week view.** `week-view.js` renders a full-screen dialog (closed shadow DOM, host `#tritoncal-week-root`) with Typical week / Final, colour controls, the language switch and the two export buttons. It re-renders when new data arrives while open, and Escape closes it.
4. **Popup.** `popup.js` checks that the active tab's origin is `https://tss.ucsd.edu`, then sends `{ type: "tritoncal:open-week-view" }` with `chrome.tabs.sendMessage`. The content script replies `{ opened: true }` or `{ waiting: true }`. The shortcut is `Ctrl+Shift+K` (`Cmd+Shift+K` on Mac). `content.js` also answers `{ type: "tritoncal:get-timetable" }`, but no current code sends that message; it is left over from the popup before `c5dbb59`.
5. **Language.** `i18n.js` stores the choice in `chrome.storage.local` and listens to `storage.onChanged`, so the popup, panel and week view switch together.

### 5.4 Why globals, and why load order matters

All scripts listed in one `content_scripts` entry run as classic scripts in the same isolated world, and content scripts cannot `import`. Each file therefore publishes one global, and several files read other globals **when they load** (`plan.js` reads `TritonCalParser`, and `week-view.js` destructures `TritonCalPlan`). The order in `manifest.json` is part of the contract:

`shared/locales.js` → `shared/i18n.js` → `sites/tss/parser.js` → `sites/tss/plan.js` → `shared/ics.js` → `shared/offline.js` → `sites/tss/week-view.js` → `sites/tss/content.js`

`tests/modules.test.cjs` loads the isolated-world scripts in manifest order and fails if any `globalThis.TritonCal*.member` referenced in any extension file does not exist.

`capture.js` must run in the MAIN world, because only there can it see the page's own `fetch` and XHR. The MAIN and isolated worlds share nothing except `window.postMessage`.

### 5.5 Shared versus site code

- `shared/` knows nothing about any particular site and works only on the event model.
- `sites/<site>/` holds everything site-specific: how to observe the site, how to parse it, and its UI.
- `plan.js` and `week-view.js` stay in `sites/tss/` for now, because they embed the UCSD term calendar and TSS-specific UI. Move them, or the parts a second site needs, into `shared/` when that site exists, not before.

### 5.6 Adding a site (checklist)

1. Create `extension/sites/<site>/` with its own capture, parser and content script. Capture must stay passive (§1.3), and the parser should emit the §4.1 event shape.
2. Add `content_scripts` entries for the site's `matches`, listing the shared files the site needs. Each entry is injected independently.
3. Widen `tests/manifest.test.cjs` deliberately. It currently asserts that every content script matches only `https://tss.ucsd.edu/*`, as a privacy guard. Update `extension/PRIVACY.md` (where the extension runs) and both extension READMEs in the same change.
4. Add the new files to the allowlist in `scripts/package.cjs` and the file count in `tests/package.test.cjs`.
5. Extend `tests/modules.test.cjs`, which today checks only the first isolated-world entry, to load every entry.
6. Add tests for the new parser, using fixtures.

### 5.7 Backend (planned, not built)

There is no `background/` folder or service worker yet; an empty placeholder would be dead code. A backend will need:

- a `background.service_worker` entry in the manifest;
- probably `host_permissions` for the backend origin;
- changes to `tests/manifest.test.cjs`, which asserts that `background` and `host_permissions` are absent;
- a rewrite of `extension/PRIVACY.md`;
- a decision on exactly what data leaves the browser (§1.2).

### 5.8 Guards enforced by tests

- `manifest.test.cjs`: permissions are exactly `["activeTab", "storage"]`; there are no `host_permissions`, no `background` and no `externally_connectable`; every content script matches only `https://tss.ucsd.edu/*`.
- `capture.test.cjs`: only `EventListSet` rows are forwarded, other rows in a `$batch` are dropped, failed responses and other origins are ignored, and the page's request passes through unchanged.
- `package.test.cjs`: the ZIPs contain exactly the 22 allowlisted files and nothing private (`input/`, `.DS_Store`, stray files).
- `offline.test.cjs`: offline HTML holds no TSS ids and cannot be broken out of with `</script>`.
- `modules.test.cjs`: cross-module references resolve (§5.4).

---

## 6. Technical decisions

Who decided what and when is recorded in §11. Entries here state the current rule.

### 6.1 Stack

- Node.js ≥ 20, plain JavaScript, zero npm dependencies. Tests use the built-in `node --test` and load extension files into `vm` contexts.
- The extension is Chrome MV3 with no build step; `scripts/build-locales.cjs` is the only generator.
- ICS and ZIP files are written by hand-rolled code: `shared/ics.js`, and `scripts/package.cjs` (uncompressed ZIP with CRC32 and fixed 1980-01-01 timestamps, so the same sources produce the same ZIP).

### 6.2 User interface

- Clean, Apple-Calendar-like layout with generous whitespace.
- Colour by course, or a single colour. Single colour offers seven presets (mist, ocean, lavender, sage, olive, sand, rose) and a native custom picker. The choice is stored in TSS-origin `localStorage` under `tritoncal:mono-color`; if storage is unavailable, the choice lasts for the session.
- Every card shows the course code and type, title, time and room in full. The time axis stretches (up to 8 px per minute) until no card's text is clipped.
- The time grid has a 12 px inset at top and bottom so the first and last hour labels are visible (`53f195a`).
- The panel's scrollbars stay inside its rounded corners (`dfbb573`).
- The toolbar popup only shows a hint and an "Open week view" button (`c5dbb59`).
- Desktop comes first. Phone layout exists (narrow screens get a full-screen dialog) but has not been checked on a real device.

### 6.3 Typical week and Final

**Typical week** (`planTypicalWeek`)

- Groups events by (code, or name if there is no code; type; section; weekday; start; end; room) and counts **distinct dates** per group.
- `weeks` is the number of natural weeks from the earliest to the latest loaded event. A group is kept if it occurs on at least `ceil(weeks / 2)` dates. The UI shows both numbers and asks the user to let TSS load the whole term.
- Excludes events with `isExam === true` and any event inside a known finals period.
- The grid shows weekdays only; internally it uses the fixed anchor week of 2026-01-05.

**Final** (`planFinal`)

- **Known terms** (Fall 2026 – Spring 2027, per §2.4): every loaded event from the first day of finals to the end of finals is shown, whatever its `isExam` value. Unflagged events are labelled "Finals-period event", and the UI counts them. Midterms in known terms are not shown.
- **Other terms**: only events with `isExam === true` are shown (these may include midterms), with a note asking the user to check.
- Exams are never inferred from duration or from previous years' dates. An empty Final view does not mean there are no exams.
- Why: on 2026-10-20, two real finals were found with `EventIsExam = false`. The 0.5.2 rule, which required `isExam === true`, was replaced in 0.5.3.

ICS and offline HTML exports contain **all** loaded events on their real dates and are not affected by these filters.

### 6.4 ICS export (`shared/ics.js`)

- One `VEVENT` per loaded occurrence, with no `RRULE` and no `EXDATE`. Holidays are simply absent, because TSS sends no meeting for them; its zero-length markers are dropped by the parser.
- Header: `PRODID:-//TritonCal//TSS Course Calendar//EN`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`, `X-WR-CALNAME:TritonCal Courses`, `X-WR-TIMEZONE:America/Los_Angeles`.
- A `VTIMEZONE` for America/Los_Angeles (DST from the second Sunday of March to the first Sunday of November). `DTSTART` and `DTEND` use `TZID=America/Los_Angeles:YYYYMMDDTHHMMSS`, never a `Z` suffix.
- `UID` is `tritoncal-<two 32-bit hashes of EventId|date|start>@local`. It stays the same across re-exports, so re-importing updates rather than duplicates, and it does not expose TSS ids. Events with duplicate UIDs are skipped.
- `SUMMARY` is `<code> · <kind> · <title>`. The kind is "Exam" if `isExam`, otherwise Lecture / Discussion / Laboratory / Seminar for LE / DI / LA / SE, otherwise the raw type or "Course".
- `DESCRIPTION` is the `EventName` plus `Section: …`. `LOCATION` is written only when a room is known.
- Escaping follows RFC 5545 for `\`, `;`, `,` and newlines. Lines are folded at 75 UTF-8 bytes without splitting a character, and every line ends with CRLF.
- Labels are English in both UI languages; course titles and rooms are kept as TSS supplies them.
- Real-world check: on 2026-10-20, a 0.4.0 export was imported into a temporary Google Calendar. All 111/111 events imported with correct times before and after DST ended, and there were no classes on 11/11 or 11/26–27. The temporary calendar was then deleted. Apple Calendar import was not tested.

The original plan (one VEVENT per weekly meeting with `RRULE` and holiday `EXDATE`s, UIDs like `<code>-<type>-<section>-<days>-<start>@kebiao`) was never implemented.

### 6.5 Offline HTML (`shared/offline.js`)

- Embeds only `date`, `start`, `end`, `code`, `type`, `name`, `title`, `room` and `isExam`: no `EventId`, no `ModuleId`, no raw response.
- Embeds the translations and language active at download, so the file runs without the extension or a network connection.
- Data and translations are serialized with `<`, `>` and `&` escaped, so course text cannot end the script block.
- It navigates real calendar weeks. The file is a snapshot, does not update, and contains the user's personal schedule.

### 6.6 Distribution: GitHub Releases, not the Chrome Web Store

Decided on 2026-10-23. The Chrome Web Store needs a paid developer registration (US$5 in Google's 2020 announcement; the dashboard shows the actual amount). Public, unlisted and private listings all need registration and review, so the fee was not paid and nothing was submitted. GitHub Releases is the official download.

If the extension is listed later, prepare:

- A public privacy URL (`extension/PRIVACY.md` on GitHub) and GitHub Issues as the support contact.
- At least one 1280×800 screenshot of the real UI using fixture data, never a personal schedule. The 440×280 promo tile does not replace it.
- The single-purpose statement: "Shows the user's already-loaded TSS schedule and offers local export." Permission justifications: `activeTab` (find the current tab when the toolbar icon is clicked), the `tss.ucsd.edu` match (passively read the loaded schedule) and `storage` (the language choice only). Tick "no remote code".
- Expect review to take days, sometimes weeks; contact support after three weeks. New publishers can initially publish two extensions.

### 6.7 Permissions

| Permission | Why |
|---|---|
| Content scripts on `https://tss.ucsd.edu/*` | Observe the schedule TSS has loaded and show the timetable |
| `activeTab` | When the toolbar icon is clicked, check that the tab is TSS and message it |
| `storage` | Store only the language choice (`tritoncal:language`) so all views share it |

There are no host permissions, no background worker and no external messaging (§5.8).

---

## 7. Internationalization

- Two languages, English (`en`) and Simplified Chinese (`zh_CN`). The user switches with the **English / 中文** button in the week view, panel or popup. The choice is independent of the browser language, is stored in `chrome.storage.local` under `tritoncal:language`, and defaults to Chinese on first use. Dates and weekdays follow the chosen language through `Intl.DateTimeFormat`.
- **Translation source**: `extension/_locales/en/messages.json` and `extension/_locales/zh_CN/messages.json`. Each key's `description` names the files that use it. Run `npm run build:locales` after editing them to regenerate `extension/shared/locales.js`, which is bundled so no translation is fetched online. Chrome itself still uses `_locales` for the manifest name and description on the extensions page.
- The language button shows the target language: "中文" in English mode, "English" in Chinese mode. Apart from that button, the English UI contains no Chinese characters (tested).
- Course titles and rooms are never translated. ICS labels are always English. Offline HTML embeds the language active at download.
- When adding a key, add it to both catalogs. `tests/i18n.test.cjs` checks that the keys and placeholders match and that `locales.js` is up to date.

The old per-key string table (`docs/07-i18n-strings.md`) duplicated the two catalogs and was removed; the catalogs are the reference.

---

## 8. Fixtures and tests

### 8.1 Fixtures (`fixtures/`, safe to commit)

| File | Format | Used by | Content |
|---|---|---|---|
| `term-events.json` | §4.1 events (128) | `week.test.cjs`, `scripts/check-ui.cjs` | Expanded sample term with 13 regular slots and 2 finals, including one invented exam |
| `tss-anonymized.json` | raw `EventListSet` | `integration.test.cjs` | Anonymized response with fake ids and values, 3 rows (2 valid) |
| `fall2026-sample.json` | original `schedule.json` (§4.3) | nothing | Copied by hand from the Apple Calendar screenshot. Meeting days and times match the screenshot; course titles, credits, final times and "Center Hall 115" are invented. |

Anonymize any real response before it becomes a fixture: replace GUIDs, student IDs and `ModregId` values with fake ones and keep only the structure.

### 8.2 Tests (`tests/`, run with `npm test`)

| File | Covers |
|---|---|
| `capture.test.cjs` | Passive observation, `$batch` filtering, origin checks |
| `parser.test.cjs` | Date and time parsing, dropped rows, unknown names, Los Angeles week boundaries |
| `week.test.cjs` | `planWeek`, `planTypicalWeek`, `planFinal` |
| `ics.test.cjs` | DST, holidays, UID stability, escaping, folding |
| `offline.test.cjs` | Field minimization, injection safety |
| `i18n.test.cjs` | Catalogs, persistence, sync, race conditions, generated file |
| `integration.test.cjs` | Anonymized response → parse → plan → ICS |
| `manifest.test.cjs` | Permission and scope guards |
| `package.test.cjs` | ZIP allowlist and contents |
| `modules.test.cjs` | Load order and cross-module references |

At 0.7.0: **41 tests, all passing.**

`scripts/check-ui.cjs` is an optional browser regression run. It uses a separately installed Playwright and local Chrome (path override: `TRITONCAL_CHROME`) to serve the extension files with fixture data and check both languages: panel scrolling, labels, full card text, the two views, colours, persistence, popup states and offline HTML. Screenshots go to `out/i18n/`. It never opens TSS. It is not part of `npm test`, and its results on macOS Chrome do not count as Windows or real-TSS acceptance.

---

## 9. Versioning

Adopted on 2026-11-21 at Nya~'s request. Earlier versions did not follow written rules (see the history table).

### 9.1 Scheme

Versions follow semantic versioning, `MAJOR.MINOR.PATCH`. While the project is at 0.x:

- **MINOR** (0.x.0): new user-visible features, or changes to structure, packaging or permissions. Examples: 0.6.0 (Issue #3 features), 0.7.0 (file layout).
- **PATCH** (0.x.y): fixes and small adjustments that change no structure, permissions or packaging.
- **1.0.0**: not defined yet; the maintainers decide it when the extension leaves preview.
- Changes to documentation only do not bump the version.

### 9.2 Where the version appears

Update all of these together in one commit:

- `extension/manifest.json` → `version`. This is authoritative; `scripts/package.cjs` names the ZIPs from it.
- `package.json` → `version`.
- `extension/PRIVACY.md`, first line (version and date).
- `extension/README.md` and `extension/README.en.md` (title and ZIP names).
- The root `README.md` and `README.zh-CN.md`.

Tag releases as `vX.Y.Z`.

### 9.3 Version history

| Version | Date | In git? | Summary | Tests |
|---|---|---|---|---|
| 0.2.0 | 2026-10-20 | no (local only) | `$batch` extraction, in-page week switching; on the real TSS site in Arc: 12 events this week, 11 next week | 6 |
| 0.3.0 | 2026-10-20 | no | Time-grid week view, side-by-side overlaps, colour toggle, horizontal scroll on phones | 9 |
| 0.4.0 | 2026-10-20 | no | Local ICS export; Google Calendar import 111/111 | 14 |
| 0.5.0 | 2026-10-20 | no | Offline HTML export; a classmate ran it on a second account | 22 |
| 0.5.1 | 2026-10-20 | yes: `7567c2b`, PR #4 | Icons, privacy policy, install troubleshooting, packaging allowlist | 22 |
| 0.5.2 | 2026-10-20 | no | Issue #3 items 1–5; Final strictly required the exam flag | 28 |
| 0.5.3 | 2026-10-20 | no | Final uses the official finals periods | 31 |
| 0.5.4 | 2026-10-20 | no | Bilingual UI following the browser language | 36 |
| 0.5.5 | 2026-10-20 | no | In-extension language switch, default Chinese, `storage` permission | 40 |
| 0.6.0 | 2026-10-25 | yes: `01ae4a5`, PR #6 → `65ce62a` | The 0.5.2–0.5.5 work rebuilt as six Issue #3 commits | 40 |
| 0.7.0 | 2026-11-21 | yes: `f7445c9` | Multi-site layout (§5); no behaviour change | 41 |

Versions marked "no" were local iterations recorded in the project log. Their work reached git through the 0.5.1 upload or the six 0.6.0 commits. The log mentions a local backup branch `codex/backup-local-0.5.5-2026-10-25` (`6886304`); it is not on `origin`.

---

## 10. Release status

As of 2026-11-21:

- 0.6.0 was merged to `main` through PR #6 (`65ce62a`, 2026-10-26) but **never released**. There is no GitHub Release or tag.
- Decided by Nya~ on 2026-11-21: v0.6.0 will not be released. The next release is **v0.7.0** from `main`. It has the same features as 0.6.0; only the file layout changed and one test was added.

Release procedure:

1. On the commit being released, run `npm test` (all pass), then `npm run package`. This writes `out/tritoncal-extension-preview-<version>.zip` (files under an `extension/` folder) and `out/tritoncal-store-candidate-<version>.zip` (manifest at the root), each with 22 allowlisted files.
2. Create tag `v<version>` and release title `TritonCal <version>`. Attach **only** the preview ZIP. The release notes contain the changes, the four-step install and the privacy link.
3. Check the tag, the attachment, and the links in both READMEs. Update this section.

Manual acceptance still open (TSS was unreachable as of 2026-10-25; TritonCal does not probe it):

- Install from the release ZIP in a fresh browser profile and reload TSS.
- Switch languages inside TSS with the installed extension.
- Check the native scrollbars on Windows.
- Check on a real phone (not a desktop release requirement).

Store listing draft, kept for later (Chinese):

> 名称：TritonCal — TSS 周课表
>
> 简短说明：在 UCSD TSS 中查看清晰的周课表、课程时间和教室，可切换颜色与中英双语并导出日历。
>
> TritonCal 在 TSS 页面右下角提供“课表”入口，把页面已加载的课程整理成典型周和 Final 视图，完整显示课程代码、名称、时间和教室。支持按课上色、单色预设及自定义颜色，并可下载 ICS 日历或离线 HTML。
>
> 插件只被动观察 TSS 页面已有数据，不主动请求课表，不参与登录，也不上传课表。安装后请自行刷新 TSS 首页，显示与导出范围以页面实际加载的数据为准。这是独立学生项目，不代表 UC San Diego 官方。手机离线网页仍属实验功能。

---

## 11. History

**How work is attributed.** Each entry names the git name that committed or submitted the work (GitHub user `dan9574` is Daniel Chen). Entries from 2026-10-19 to 2026-10-25 come from the project log in the former `CLAUDE.md` and docs, which refer to "the user". That work was committed and submitted (PR #4, PR #6) by **IpoKlay**, so it is credited to IpoKlay. The log does not name anyone else, except an unnamed classmate who tested on a second account.

| Date | Who | What | Evidence |
|---|---|---|---|
| 2026-10-02 | Daniel Chen | Project started (then named "kebiao"): TSS research, data-capture options, the `schedule.json` design, the M0–M4 roadmap, reference screenshots, TritonPlan excerpts, `fixtures/fall2026-sample.json`. The log notes the docs were drafted with Claude Code. | `a06d3b7` |
| 2026-10-19 | IpoKlay | Priority changed: build a read-only extension on real TSS data first, with calendar export second. First real `EventListSet` capture: 156 rows, of which 111 are timed and 45 are zero-length markers; valid classes ran 2026-09-24 to 2026-12-10, with none on 11/11 or 11/26–27. `StartTime`, `EndTime` and `Room` verified. | project log; `7567c2b` |
| 2026-10-20 | IpoKlay | 0.2.0–0.5.1 built and tested on the real TSS site in Arc. UI direction confirmed (§6.2). ICS imported into Google Calendar (§6.4). A classmate reported it "works" on a second account, without itemized checks. Phone testing deferred. | project log; `7567c2b`; PR #4 |
| 2026-10-20 | Daniel Chen | Merged PR #4 (extension 0.5.1). | `c1faf07` |
| 2026-10-20 | IpoKlay | 0.5.2–0.5.5: Issue #3 changes; found from Schedule of Classes that two finals had `EventIsExam = false` (→ 0.5.3); bilingual UI, then in-extension switching (0.5.4 → 0.5.5). | project log |
| 2026-10-23 | IpoKlay | Decided against paying for the Chrome Web Store; GitHub Releases is the download. | `b58195b` |
| 2026-10-25 | IpoKlay | 0.6.0: Issue #3 as six commits (`53f195a` hour labels, `dfbb573` rounded panel, `c5dbb59` popup, `07670d5` colours, `18c801b` typical week / Final, `0a11a53` bilingual), version bump `01ae4a5`, release docs `bf6b4d7` / `4df3ae0`. Opened PR #6. | PR #6 |
| 2026-10-26 | Daniel Chen | Merged PR #6. | `65ce62a` |
| 2026-11-21 | Nya~ | Decided that the extension will expand to other sites (Canvas, podcast and others) and integrate a backend. Asked for a multi-site layout, a written versioning scheme, all docs in one English MAINDOC with git-name attribution, an English AGENTS.md as the only agent entry point (CLAUDE.md removed), and English-first READMEs. Chose to skip v0.6.0 and release v0.7.0 next. Code and docs written by Claude Opus 5.5. | `f7445c9`, `103d569` and the follow-up commit removing `CLAUDE.md` |
