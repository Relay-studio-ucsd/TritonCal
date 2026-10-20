(() => {
  const parser = globalThis.TritonCalParser;
  const status = document.querySelector("#status");
  const days = document.querySelector("#days");
  const range = document.querySelector("#range");
  let weekStart = parser.mondayOf(parser.todayInTimezone());
  let events = [];
  let ready = false;

  function line(className, text) {
    const element = document.createElement("div");
    element.className = className;
    element.textContent = text;
    return element;
  }

  function dayLabel(ymd) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC", weekday: "long", month: "numeric", day: "numeric"
    }).format(new Date(`${ymd}T12:00:00Z`));
  }

  // 按本地星期展示从 TSS 实际响应读取的逐日事件。
  function render() {
    const weekEnd = parser.addDays(weekStart, 6);
    range.textContent = `${weekStart} — ${weekEnd}`;
    days.replaceChildren();
    if (!ready) return;
    const current = events.filter(event => event.date >= weekStart && event.date <= weekEnd);
    if (!current.length) {
      days.append(line("empty", "这一周没有已读取的课程。"));
      return;
    }
    for (let offset = 0; offset < 7; offset++) {
      const date = parser.addDays(weekStart, offset);
      const daily = current.filter(event => event.date === date);
      if (!daily.length) continue;
      const section = document.createElement("section");
      const heading = document.createElement("h2");
      heading.textContent = dayLabel(date);
      section.append(heading);
      for (const event of daily) {
        const card = document.createElement("article");
        card.className = `event${event.isExam ? " exam" : ""}`;
        card.append(line("name", event.name));
        card.append(line("detail", `${event.start}–${event.end} · ${event.room || "教室待确认"}`));
        if (event.title && event.title !== event.name) card.append(line("detail", event.title));
        section.append(card);
      }
      days.append(section);
    }
  }

  document.querySelector("#previous").addEventListener("click", () => {
    weekStart = parser.addDays(weekStart, -7);
    render();
  });
  document.querySelector("#next").addEventListener("click", () => {
    weekStart = parser.addDays(weekStart, 7);
    render();
  });
  document.querySelector("#today").addEventListener("click", () => {
    weekStart = parser.mondayOf(parser.todayInTimezone());
    render();
  });

  async function load() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url?.startsWith("https://tss.ucsd.edu/")) {
        status.textContent = "请先打开 TSS 官网，再点击插件图标。";
        return;
      }
      const response = await chrome.tabs.sendMessage(tab.id, { type: "tritoncal:get-timetable" });
      if (response?.waiting || !Array.isArray(response?.events)) {
        status.textContent = "尚未收到课表。保持插件启用，刷新 TSS 首页后重试。";
        return;
      }
      events = response.events;
      ready = true;
      status.textContent = `收到 ${response.totalRows} 条记录，识别 ${response.events.length} 次有效课程 · 数据只保存在此标签页的内存中`;
      render();
    } catch {
      status.textContent = "无法读取此标签页。请在 TSS 首页刷新后重试。";
    }
  }

  render();
  load();
})();
