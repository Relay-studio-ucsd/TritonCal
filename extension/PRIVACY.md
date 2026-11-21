# TritonCal Privacy Policy

Applies to the 0.7.0 preview. Last updated: 2026-11-21.

TritonCal is an independent student project. It is not affiliated with or endorsed by UC San Diego.

## Where it runs

The extension runs automatically only on `https://tss.ucsd.edu/*` pages. You sign in to TSS yourself; the extension does not read login forms, passwords, cookies or browsing history.

## What information it processes

The extension passively observes the schedule responses the current page receives on its own. From them it parses dates, start and end times, course codes and names, teaching types, rooms, exam flags, and the event and module numbers that identify each course.

If the schedule arrives together with other responses in an OData batch response, the extension temporarily inspects that response within the current page, passes on only the schedule records and discards the rest. The extension never makes its own requests to TSS, and never replays or polls TSS endpoints.

## Storage and transfer

The extension has no server, analytics, advertising or remote code, and never sends your schedule to the developers or any third party. The parsed schedule is kept only in the current page's memory; after the page is refreshed or closed, the TSS page has to load it again. The extension has no background sync and no persistent schedule storage.

Your colour preference is stored locally: the chosen single colour is saved in the `localStorage` of the `tss.ucsd.edu` site (key `tritoncal:mono-color`), so it survives a refresh. It contains no schedule or identity information. Clearing that site's local data deletes this preference; removing the extension does not clear it automatically.

The English and Chinese translations are bundled with the extension; no online translation service is used. The extension saves the language you choose (`en` or `zh_CN`) in its own `chrome.storage.local`, under the key `tritoncal:language`. This contains no course or identity information and does not use cloud sync. Removing the extension deletes this language preference. Offline HTML files contain the translations and language setting from the time of download, and need no network access when opened.

When you click export, the browser downloads a file locally. ICS files contain course dates, times, names and rooms. Offline HTML files also contain the information needed to display the timetable, such as course types, but not raw responses or TSS event or module numbers. Downloaded files stay on your device until you delete them. If you send a file to someone or import it into an external calendar, that service handles the schedule information in the file under its own rules.

## Browser permissions

- Site match `https://tss.ucsd.edu/*`: lets the page scripts observe the schedule TSS has received and show the weekly timetable.
- `storage`: saves only the language preference, so the popup and the in-page timetable share the same choice.
- `activeTab`: when you click the extension icon, checks whether the current tab is TSS and sends that tab the message to open the week view.

## Removal and feedback

To stop the extension, remove TritonCal on the browser's extensions page, then refresh or close the TSS tab. Delete any downloaded files yourself.

Feedback from testers goes to whoever distributed this version to you. Reporting the install result, your browser name and a description of the problem is enough; you never need to send account names, passwords, student IDs or raw TSS responses.
