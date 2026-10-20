(() => {
  const timezone = "America/Los_Angeles";
  const encoder = new TextEncoder();

  function escapeText(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\r|\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }

  // RFC 5545 的 75 字节折行不能切断 UTF-8 字符。
  function foldLine(line) {
    let result = "";
    let width = 0;
    for (const character of line) {
      const bytes = encoder.encode(character).length;
      if (width + bytes > 75) {
        result += "\r\n ";
        width = 1;
      }
      result += character;
      width += bytes;
    }
    return result;
  }

  function localDateTime(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
  }

  function stamp(now) {
    return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  // 同一次课重导出时沿用同一 UID，不在文件里暴露 TSS 的原始事件编号。
  function uid(event) {
    const key = `${event.id}|${event.date}|${event.start}`;
    let first = 2166136261;
    let second = 0x9e3779b9;
    for (const character of key) {
      const code = character.codePointAt(0);
      first = Math.imul(first ^ code, 16777619) >>> 0;
      second = Math.imul(second ^ code, 2246822519) >>> 0;
    }
    return `tritoncal-${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}@local`;
  }

  function timezoneLines() {
    return [
      "BEGIN:VTIMEZONE",
      `TZID:${timezone}`,
      "BEGIN:DAYLIGHT",
      "DTSTART:20070311T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
      "TZOFFSETFROM:-0800",
      "TZOFFSETTO:-0700",
      "TZNAME:PDT",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "DTSTART:20071104T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
      "TZOFFSETFROM:-0700",
      "TZOFFSETTO:-0800",
      "TZNAME:PST",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];
  }

  // 用 TSS 已给出的每次上课日期逐条导出，假期自然保持空白。
  function generateCalendar(events, options = {}) {
    const now = options.now ?? new Date();
    const calendarName = options.calendarName ?? "TritonCal 课程";
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TritonCal//TSS Course Calendar//ZH",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeText(calendarName)}`,
      `X-WR-TIMEZONE:${timezone}`,
      ...timezoneLines()
    ];
    const seen = new Set();
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
    for (const event of sorted) {
      const start = localDateTime(event.date, event.start);
      const end = localDateTime(event.date, event.end);
      if (!start || !end || end <= start) continue;
      const eventUid = uid(event);
      if (seen.has(eventUid)) continue;
      seen.add(eventUid);
      const code = event.code || event.name;
      const kind = event.isExam ? "考试" : event.type || "课程";
      const summary = `${code} · ${kind}${event.title ? ` · ${event.title}` : ""}`;
      const description = [event.name, event.section ? `Section: ${event.section}` : null].filter(Boolean).join("\n");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${eventUid}`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART;TZID=${timezone}:${start}`,
        `DTEND;TZID=${timezone}:${end}`,
        `SUMMARY:${escapeText(summary)}`,
        `DESCRIPTION:${escapeText(description)}`
      );
      if (event.room) lines.push(`LOCATION:${escapeText(event.room)}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.map(foldLine).join("\r\n") + "\r\n";
  }

  globalThis.TritonCalIcs = { escapeText, foldLine, generateCalendar };
})();
