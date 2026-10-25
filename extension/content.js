(() => {
  const channel = "tritoncal:timetable:v1";
  let latest = null;
  let panel = null;
  let panelBody = null;
  let toggle = null;
  let weekView = null;

  function make(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  // 用页面内的小面板展示实验结果，方便 Arc 中直接验收。
  function renderPanel() {
    if (!panelBody || !toggle) return;
    panelBody.replaceChildren();
    panelBody.append(make("h2", "课表"));
    panelBody.append(make("p", `${"典型周"} · ${"Final"}`, "muted"));
    const openWeek = make("button", "打开周视图", "open-week");
    openWeek.type = "button";
    openWeek.disabled = !latest;
    openWeek.addEventListener("click", () => weekView?.open(latest.events));
    panelBody.append(openWeek);
    if (!latest) {
      toggle.textContent = "课表";
      panelBody.append(make("p", "等待 TSS 页面加载课表…"));
      return;
    }
    const plan = globalThis.TritonCalWeekView.planTypicalWeek(latest.events);
    toggle.textContent = `课表 · ${plan.count}`;
    panelBody.append(make("p", `典型周 ${plan.count} 个时段；已读取 ${latest.events.length} 次课程。`, "muted"));
    if (!plan.count) {
      panelBody.append(make("p", "没有符合频次条件的常规课程，可打开周视图查看 Final。"));
      return;
    }
    for (const day of plan.days) {
      if (!day.events.length) continue;
      panelBody.append(make("h3", new Intl.DateTimeFormat("zh-CN", { timeZone: "UTC", weekday: "short" }).format(new Date(`${day.date}T12:00:00Z`))));
      for (const { event } of day.events) {
        const card = make("div", "", "card");
        card.append(make("strong", event.name || "未命名课程"));
        card.append(make("span", `${event.start}–${event.end} · ${event.room || "教室待确认"}`));
        panelBody.append(card);
      }
    }
  }

  function mountPanel() {
    if (!document.body || document.getElementById("tritoncal-extension-root")) return;
    const host = make("div");
    host.id = "tritoncal-extension-root";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = make("style", `
      :host { all: initial; position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; font: 14px/1.45 system-ui, sans-serif; color: #17324d; }
      button { cursor: pointer; font: inherit; }
      .toggle { background: #1468a0; border: 0; border-radius: 999px; color: white; font-weight: 700; padding: 11px 16px; box-shadow: 0 3px 14px #0003; }
      .panel { display: none; position: absolute; right: 0; bottom: 50px; width: min(360px, calc(100vw - 40px)); overflow: hidden; box-sizing: border-box; background: white; border: 1px solid #cadbe9; border-radius: 12px; box-shadow: 0 10px 32px #0003; }
      .panel-body { max-height: min(540px, calc(100vh - 102px)); overflow: auto; scrollbar-width: thin; box-sizing: border-box; padding: 16px; }
      .panel.open { display: block; }
      h2 { font-size: 18px; margin: 0 0 2px; } h3 { font-size: 13px; margin: 14px 0 5px; color: #426079; }
      p { margin: 4px 0 12px; } .muted { color: #62788a; font-size: 12px; }
      .open-week { width: 100%; background: #1468a0; border: 0; border-radius: 7px; color: white; font-weight: 650; padding: 8px; margin: 0 0 12px; } .open-week:disabled { opacity: .5; cursor: default; }
      .card { border-top: 1px solid #e4edf3; padding: 8px 0; } .card strong, .card span { display: block; }
      .card span { color: #526a7f; font-size: 12px; margin-top: 2px; }
    `);
    toggle = make("button", "课表", "toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    panel = make("div", "", "panel");
    panelBody = make("div", "", "panel-body");
    panel.append(panelBody);
    toggle.addEventListener("click", () => {
      const open = panel.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    shadow.append(style, toggle, panel);
    document.body.append(host);
    weekView = globalThis.TritonCalWeekView.create();
    renderPanel();
  }

  if (document.body) mountPanel();
  else document.addEventListener("DOMContentLoaded", mountPanel, { once: true });

  // 接收 MAIN world 被动复制的响应，只在内存中保留显示字段。
  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.channel !== channel) return;
    try {
      const url = new URL(event.data.url);
      const direct = /\/EVENT_TIMETABLE_SRV\/EventListSet$/i.test(url.pathname);
      const batch = /\/sap\/opu\/odata\/[^/]+\/[^/]+\/\$batch$/i.test(url.pathname);
      if (url.origin !== location.origin || !(direct || (batch && event.data.kind === "batch"))) return;
      latest = { ...globalThis.TritonCalParser.parseTimetable(event.data.body), capturedAt: Date.now() };
      renderPanel();
      weekView?.update(latest.events);
    } catch {
      // 忽略不符合课表结构的响应，不影响 TSS 页面。
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "tritoncal:open-week-view") {
      if (!latest || !weekView) {
        sendResponse({ waiting: true });
        return;
      }
      weekView.open(latest.events);
      sendResponse({ opened: true });
      return;
    }
    if (message?.type !== "tritoncal:get-timetable") return;
    sendResponse(latest ?? { waiting: true });
  });
})();
