(() => {
  const parser = globalThis.TritonCalParser;
  const ics = globalThis.TritonCalIcs;
  const offline = globalThis.TritonCalOffline;
  const colors = [
    ["#e4eff8", "#4a83ad"], ["#e8edf9", "#6a7fb1"], ["#e5f2ee", "#5a998b"],
    ["#f5ecdf", "#ae8a5c"], ["#f3e8ee", "#a57995"], ["#e9f0df", "#879d65"]
  ];

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

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function courseColor(event) {
    const name = event.code || event.name;
    let hash = 0;
    for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return colors[hash % colors.length];
  }

  function dayLabel(date) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC", weekday: "short", month: "numeric", day: "numeric"
    }).format(new Date(`${date}T12:00:00Z`));
  }

  function downloadFile(body, type, name) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const anchor = element("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadCalendar(events) {
    downloadFile(ics.generateCalendar(events), "text/calendar;charset=utf-8", "tritoncal-courses.ics");
  }

  function downloadOffline(events) {
    downloadFile(offline.generateOfflineHtml(events), "text/html;charset=utf-8", "tritoncal-offline.html");
  }

  function create() {
    const host = element("div");
    host.id = "tritoncal-week-root";
    host.style.display = "none";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = element("style", `
      :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; color: #26384a; font: 14px/1.4 system-ui, sans-serif; }
      * { box-sizing: border-box; } button { font: inherit; cursor: pointer; }
      .backdrop { position: absolute; inset: 0; background: #17233490; }
      .shell { position: absolute; inset: 24px; display: flex; flex-direction: column; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px #101c3650; }
      header { padding: 18px 22px 14px; border-bottom: 1px solid #e6ebf0; background: #fff; }
      .heading, .controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      h1 { font-size: 22px; letter-spacing: -.02em; margin: 0; } .range { color: #637486; margin: 3px 0 0; font-size: 13px; }
      .controls { margin-top: 15px; justify-content: flex-start; } .controls button, .close { border: 1px solid #d7e0e8; background: white; color: #2b455f; border-radius: 8px; padding: 7px 10px; }
      .controls button:hover, .close:hover { background: #f3f7fa; } .close { font-size: 20px; line-height: 1; width: 36px; height: 36px; }
      .controls .selected { background: #e7f1f8; border-color: #a8c8df; color: #145c8c; }
      .note { color: #65788a; font-size: 12px; margin: 10px 0 0; }
      .scroll { overflow: auto; flex: 1; background: #fff; }
      .grid { display: grid; }
      .corner, .day-title { position: sticky; top: 0; z-index: 3; background: #fff; border-bottom: 1px solid #e6ebf0; height: 44px; }
      .day-title { padding: 11px 10px; text-align: center; font-weight: 650; border-left: 1px solid #edf0f3; }
      .hours, .day { position: relative; }
      .hours { background: #fff; } .hour-label { position: absolute; right: 8px; transform: translateY(-8px); color: #91a0ad; font-size: 11px; }
      .day { border-left: 1px solid #edf0f3; }
      .rule { position: absolute; left: 0; right: 0; border-top: 1px solid #edf0f3; }
      .event { position: absolute; overflow: hidden; padding: 5px 6px; border-left: 3px solid; border-radius: 6px; font-size: 10px; line-height: 1.2; overflow-wrap: anywhere; }
      .event strong, .event span { display: block; white-space: normal; }
      .event strong { font-size: 11px; } .event span { margin-top: 2px; }
      @media (max-width: 650px) { .shell { inset: 0; border-radius: 0; } header { padding: 14px; } h1 { font-size: 19px; } .controls { gap: 6px; } .controls button { padding: 6px 8px; } }
    `);
    shadow.append(style);
    document.body.append(host);
    let events = [];
    let weekStart = parser.mondayOf(parser.todayInTimezone());
    let colorMode = "course";

    function close() { host.style.display = "none"; shadow.replaceChildren(style); }
    function render(focusLabel = null, pixelsPerMinute = 1.7) {
      const plan = planWeek(events, weekStart);
      shadow.replaceChildren(style);
      const backdrop = element("div", null, "backdrop");
      backdrop.addEventListener("click", close);
      shadow.append(backdrop);
      const shell = element("div", null, "shell");
      shell.setAttribute("role", "dialog");
      shell.setAttribute("aria-modal", "true");
      shell.setAttribute("aria-label", "TritonCal 周课表");
      shadow.append(shell);
      const header = element("header");
      const heading = element("div", null, "heading");
      const title = element("div");
      title.append(element("h1", "周课表"), element("p", `${plan.weekStart} — ${plan.weekEnd} · ${plan.count} 条课程事件`, "range"));
      const closeButton = element("button", "×", "close");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "关闭周课表");
      closeButton.addEventListener("click", close);
      heading.append(title, closeButton);
      header.append(heading);
      const controls = element("div", null, "controls");
      for (const [label, delta] of [["← 上周", -7], ["本周", 0], ["下周 →", 7]]) {
        const button = element("button", label);
        button.type = "button";
        button.addEventListener("click", () => {
          weekStart = delta ? parser.addDays(weekStart, delta) : parser.mondayOf(parser.todayInTimezone());
          render(label);
        });
        controls.append(button);
      }
      for (const [label, mode] of [["按课上色", "course"], ["单色", "mono"]]) {
        const button = element("button", label, colorMode === mode ? "selected" : "");
        button.type = "button";
        button.setAttribute("aria-pressed", String(colorMode === mode));
        button.addEventListener("click", () => { colorMode = mode; render(label); });
        controls.append(button);
      }
      const exportButton = element("button", `导出已读取课程 (.ics · ${events.length} 条)`);
      exportButton.type = "button";
      exportButton.disabled = events.length === 0;
      exportButton.addEventListener("click", () => downloadCalendar(events));
      controls.append(exportButton);
      const offlineButton = element("button", "下载手机离线课表 (.html)");
      offlineButton.type = "button";
      offlineButton.disabled = events.length === 0;
      offlineButton.addEventListener("click", () => downloadOffline(events));
      controls.append(offlineButton);
      const dates = events.map(event => event.date).sort();
      const coverage = dates.length ? `；已读取范围 ${dates[0]}—${dates.at(-1)}` : "";
      header.append(controls, element("p", `数据来自当前 TSS 标签页${coverage}；空教室不会用校园名代替。`, "note"));
      shell.append(header);

      const scroll = element("div", null, "scroll");
      const grid = element("div", null, "grid");
      grid.style.gridTemplateColumns = `58px repeat(${plan.days.length}, minmax(150px, 1fr))`;
      grid.style.minWidth = `${58 + plan.days.length * 150}px`;
      grid.append(element("div", null, "corner"));
      for (const day of plan.days) grid.append(element("div", dayLabel(day.date), "day-title"));
      const height = (plan.endHour - plan.startHour) * 60 * pixelsPerMinute;
      const timeInset = 12;
      const hours = element("div", null, "hours");
      hours.style.height = `${height + timeInset * 2}px`;
      for (let hour = plan.startHour; hour <= plan.endHour; hour++) {
        const label = element("span", `${String(hour).padStart(2, "0")}:00`, "hour-label");
        label.style.top = `${timeInset + (hour - plan.startHour) * 60 * pixelsPerMinute}px`;
        hours.append(label);
      }
      grid.append(hours);
      const cards = [];
      for (const day of plan.days) {
        const column = element("div", null, "day");
        column.style.height = `${height + timeInset * 2}px`;
        for (let hour = plan.startHour; hour <= plan.endHour; hour++) {
          const rule = element("div", null, "rule");
          rule.style.top = `${timeInset + (hour - plan.startHour) * 60 * pixelsPerMinute}px`;
          column.append(rule);
        }
        for (const item of day.events) {
          const card = element("div", null, "event");
          const [background, border] = colorMode === "mono"
            ? ["#f1f4f6", "#7893a9"]
            : item.event.isExam ? ["#fff0df", "#b97831"] : courseColor(item.event);
          card.style.background = background;
          card.style.borderColor = border;
          card.style.top = `${timeInset + (item.start - plan.startHour * 60) * pixelsPerMinute + 2}px`;
          card.style.height = `${(item.end - item.start) * pixelsPerMinute - 4}px`;
          card.style.left = `calc(${item.column * 100 / item.columns}% + 2px)`;
          card.style.width = `calc(${100 / item.columns}% - 4px)`;
          card.title = `${item.event.name} · ${item.event.title || "课名待确认"} · ${item.event.start}–${item.event.end} · ${item.event.room || "教室待确认"}`;
          card.append(element("strong", `${item.event.code || item.event.name}${item.event.isExam ? " · 考试" : item.event.type ? ` · ${item.event.type}` : ""}`));
          card.append(element("span", item.event.title || "课名待确认"));
          card.append(element("span", `${item.event.start}–${item.event.end}`));
          card.append(element("span", item.event.room || "教室待确认"));
          column.append(card);
          cards.push(card);
        }
        grid.append(column);
      }
      scroll.append(grid);
      shell.append(scroll);
      // 按实际折行高度拉开时间轴，保证代码、课名、时间、教室都完整可见。
      const overflow = Math.max(1, ...cards.map(card => card.scrollHeight / Math.max(1, card.clientHeight)));
      if (overflow > 1.02 && pixelsPerMinute < 8) {
        render(focusLabel, Math.min(8, pixelsPerMinute * overflow + 0.1));
        return;
      }
      const focusedControl = Array.from(controls.children).find(button => button.textContent === focusLabel);
      (focusedControl || closeButton).focus();
    }

    window.addEventListener("keydown", event => {
      if (event.key === "Escape" && host.style.display !== "none") close();
    });
    return {
      open(nextEvents, date) {
        events = nextEvents;
        weekStart = date;
        host.style.display = "block";
        render();
      },
      update(nextEvents) {
        events = nextEvents;
        if (host.style.display !== "none") render();
      }
    };
  }

  globalThis.TritonCalWeekView = { planWeek, create };
})();
