(() => {
  const timezone = "America/Los_Angeles";

  // SAP 日期代表 UTC 零点的日历日期，直接取 ISO 日期避免美西前一天的问题。
  function parseDate(raw) {
    const match = /^\/Date\((-?\d+)(?:[+-]\d+)?\)\/$/.exec(String(raw ?? ""));
    if (!match) return null;
    const date = new Date(Number(match[1]));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  // SAP Edm.Time 的 PT11H00M00S 转成本地 11:00。
  function parseTime(raw) {
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(raw ?? ""));
    if (!match || (!match[1] && !match[2] && !match[3])) return null;
    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  // 只保留显示周课表需要的字段；原始响应不持久化。
  function parseTimetable(body) {
    const document = JSON.parse(body);
    const rows = document?.d?.results;
    if (!Array.isArray(rows)) throw new Error("响应不是 OData v2 的 d.results 列表");
    const seen = new Set();
    const events = [];
    for (const row of rows) {
      const date = parseDate(row.EventDate);
      const start = parseTime(row.StartTime);
      const end = parseTime(row.EndTime);
      // TSS 也会给假期等全天标记返回相同的起止时间；它们不是课程时段。
      if (!date || !start || !end || end <= start || !row.EventId) continue;
      const key = `${row.EventId}|${date}|${start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const name = String(row.EventName ?? row.CourseName ?? "未命名课程");
      const identity = /^(.+)-([A-Z]{2})\s+\(([^)]+)\)$/.exec(name);
      events.push({
        id: String(row.EventId),
        moduleId: String(row.ModuleId ?? ""),
        date,
        start,
        end,
        name,
        code: identity?.[1] ?? null,
        type: identity?.[2] ?? null,
        section: identity?.[3] ?? null,
        title: String(row.CourseName ?? ""),
        room: String(row.Room ?? "").trim() || null,
        isExam: row.EventIsExam === true
      });
    }
    events.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
    return { totalRows: rows.length, events };
  }

  function todayInTimezone(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now);
    const get = type => parts.find(part => part.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function addDays(ymd, days) {
    const date = new Date(`${ymd}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function mondayOf(ymd) {
    const day = new Date(`${ymd}T00:00:00Z`).getUTCDay();
    return addDays(ymd, -((day + 6) % 7));
  }

  globalThis.TritonCalParser = { parseDate, parseTime, parseTimetable, todayInTimezone, addDays, mondayOf };
})();
