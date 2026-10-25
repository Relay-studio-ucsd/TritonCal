(() => {
  const status = document.querySelector("#status");
  const openButton = document.querySelector("#open-week");
  let tabId = null;
  // 工具栏只负责打开当前 TSS 标签页内的课表，避免重复显示课程列表。
  async function load() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || new URL(tab.url).origin !== "https://tss.ucsd.edu") {
        status.textContent = "请先打开 TSS 官网，再点击插件图标。";
        return;
      }
      tabId = tab.id;
      status.textContent = "课表在 TSS 页面右下角的「课表」按钮里";
      openButton.hidden = false;
    } catch {
      status.textContent = "无法读取此标签页。请在 TSS 首页刷新后重试。";
    }
  }

  openButton.addEventListener("click", async () => {
    openButton.disabled = true;
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: "tritoncal:open-week-view" });
      if (response?.opened) window.close();
      else status.textContent = "尚未收到课表。保持插件启用，刷新 TSS 首页后重试。";
    } catch {
      status.textContent = "无法打开课表。请在 TSS 首页刷新后重试。";
    } finally {
      openButton.disabled = false;
    }
  });

  load();
})();
