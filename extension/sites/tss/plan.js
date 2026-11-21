(() => {
  const parser = globalThis.TritonCalParser;
  // UCSD 官方校历，2026-10-20 核对；仅用于划定日期，不修改 TSS 的考试标记。
  // https://blink.ucsd.edu/instructors/resources/academic/calendars/2026.html
  const terms = [
    { start: "2026-09-21", finalsStart: "2026-12-05", end: "2026-12-12" },
    { start: "2027-01-04", finalsStart: "2027-03-13", end: "2027-03-20" },
    { start: "2027-03-24", finalsStart: "2027-06-05", end: "2027-06-11" }
  ];

  function finalSource(event) {
    const term = terms.find(term => event.date >= term.start && event.date <= term.end);
    if (term) return event.date >= term.finalsStart ? "calendar" : null;
    // 未覆盖的学期不猜考试周，仅保留 TSS 明确标记的考试。
    return event.isExam === true ? "exam-flag" : null;
  }

  function minutes(time) {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
  }

  // 重叠课程放进同一组，再给每条课程分配并排的列。
  function placeDay(events) {
    const sorted = events.map(event => ({ event, start: minutes(event.start), end: minutes(event.end) }))
      .filter(item => item.end > item.start)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const groups = [];
    for (const item of sorted) {
      const group = groups.at(-1);
      if (group && item.start < group.end) {
        group.items.push(item);
        group.end = Math.max(group.end, item.end);
      } else groups.push({ items: [item], end: item.end });
    }
    return groups.flatMap(group => {
      const ends = [];
      const placed = group.items.map(item => {
        let column = ends.findIndex(end => end <= item.start);
        if (column < 0) column = ends.length;
        ends[column] = item.end;
        return { ...item, column };
      });
      return placed.map(item => ({ ...item, columns: ends.length }));
    });
  }

  // 只从已经捕获的事件计算自然周布局，不推测课程或假期。
  function planWeek(events, weekStart) {
    const weekEnd = parser.addDays(weekStart, 6);
    const selected = events.filter(event => event.date >= weekStart && event.date <= weekEnd);
    const showWeekend = selected.some(event => event.date === parser.addDays(weekStart, 5) || event.date === weekEnd);
    const dates = Array.from({ length: showWeekend ? 7 : 5 }, (_, offset) => parser.addDays(weekStart, offset));
    const placed = dates.map(date => ({ date, events: placeDay(selected.filter(event => event.date === date)) }));
    const valid = placed.flatMap(day => day.events);
    const first = valid.length ? Math.min(...valid.map(item => item.start)) : 9 * 60;
    const last = valid.length ? Math.max(...valid.map(item => item.end)) : 17 * 60;
    const startHour = Math.max(0, Math.floor(first / 60) - 1);
    const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(last / 60) + 1));
    return { weekStart, weekEnd, days: placed, count: selected.length, startHour, endHour };
  }

  // 以已读取日期覆盖的自然周估算学期长度，每个固定时段按不同日期计数。
  function planTypicalWeek(events) {
    const valid = events.filter(event => minutes(event.end) > minutes(event.start));
    const dates = valid.map(event => event.date).sort();
    const weeks = dates.length
      ? Math.round((Date.parse(parser.mondayOf(dates.at(-1))) - Date.parse(parser.mondayOf(dates[0]))) / 604800000) + 1
      : 0;
    const threshold = Math.ceil(weeks / 2);
    const groups = new Map();
    for (const event of valid) {
      if (event.isExam === true || finalSource(event) === "calendar") continue;
      const weekday = (new Date(`${event.date}T00:00:00Z`).getUTCDay() + 6) % 7;
      const key = JSON.stringify([event.code || event.name, event.type, event.section, weekday, event.start, event.end, event.room]);
      if (!groups.has(key)) groups.set(key, { event, weekday, dates: new Set() });
      groups.get(key).dates.add(event.date);
    }
    const regular = [...groups.values()].filter(group => group.dates.size >= threshold);
    // 用内部锚点复用时间布局；典型周界面只显示星期，不展示锚点日期。
    const anchor = "2026-01-05";
    const plan = planWeek(regular.map(({ event, weekday }) => ({ ...event, date: parser.addDays(anchor, weekday) })), anchor);
    return { ...plan, mode: "typical", weeks, threshold };
  }

  // 已知学期按官方期末周读取安排，避免 TSS 错误的 false 标记隐藏期末。
  function planFinal(events) {
    const exams = events.filter(event => finalSource(event) && minutes(event.end) > minutes(event.start));
    const unmarkedCount = exams.filter(event => event.isExam !== true).length;
    const unknownTermCount = exams.filter(event => finalSource(event) === "exam-flag").length;
    const dates = exams.map(event => event.date).sort();
    const firstDate = dates[0] || null;
    const lastDate = dates.at(-1) || null;
    const days = [];
    if (firstDate) {
      for (let date = firstDate; date <= lastDate; date = parser.addDays(date, 1)) {
        days.push({ date, events: placeDay(exams.filter(event => event.date === date)) });
      }
    }
    const times = days.flatMap(day => day.events);
    const startHour = times.length ? Math.max(0, Math.floor(Math.min(...times.map(item => item.start)) / 60) - 1) : 8;
    const endHour = times.length ? Math.min(24, Math.ceil(Math.max(...times.map(item => item.end)) / 60) + 1) : 18;
    return { mode: "final", days, count: exams.length, unmarkedCount, unknownTermCount, firstDate, lastDate, startHour, endHour };
  }

  globalThis.TritonCalPlan = { planWeek, planTypicalWeek, planFinal };
})();
