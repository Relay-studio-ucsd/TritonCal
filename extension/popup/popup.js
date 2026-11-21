(() => {
  const { t, locale, ready, onChange, toggleLanguage } = globalThis.TritonCalI18n;
  const status = document.querySelector("#status");
  const openButton = document.querySelector("#open-week");
  let tabId = null;
  let statusKey = "loadingTab";
  const languageButton = document.querySelector("#language-switch");
  function render() {
    document.documentElement.lang = locale();
    status.textContent = t(statusKey);
    openButton.textContent = t("openWeek");
    languageButton.textContent = t("switchLanguage");
    languageButton.lang = locale() === "en-US" ? "zh-CN" : "en";
  }
  function setStatus(key) { statusKey = key; render(); }
  languageButton.addEventListener("click", toggleLanguage);
  onChange(render);

  // 工具栏只负责打开当前 TSS 标签页内的课表，避免重复显示课程列表。
  async function load() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || new URL(tab.url).origin !== "https://tss.ucsd.edu") {
        setStatus("openTss");
        return;
      }
      tabId = tab.id;
      setStatus("popupHint");
      openButton.hidden = false;
    } catch {
      setStatus("tabError");
    }
  }

  openButton.addEventListener("click", async () => {
    openButton.disabled = true;
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: "tritoncal:open-week-view" });
      if (response?.opened) window.close();
      else setStatus("waitingRetry");
    } catch {
      setStatus("openError");
    } finally {
      openButton.disabled = false;
    }
  });

  ready.then(() => { render(); load(); });
})();
