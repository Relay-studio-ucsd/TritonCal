(() => {
  const catalogs = globalThis.TritonCalMessages;
  const storageKey = "tritoncal:language";
  let language = "zh_CN";
  let revision = 0;
  const listeners = new Set();
  const valid = value => value === "en" || value === "zh_CN";
  // 用户选择独立于浏览器语言，默认中文；只持久化语言值。
  function applyLanguage(value) {
    if (!valid(value) || value === language) return;
    language = value;
    listeners.forEach(listener => listener());
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[storageKey]) return;
    revision++;
    applyLanguage(valid(changes[storageKey].newValue) ? changes[storageKey].newValue : "zh_CN");
  });
  const ready = (async () => {
    const initialRevision = revision;
    try {
      const saved = await chrome.storage.local.get(storageKey);
      if (revision === initialRevision) applyLanguage(saved[storageKey]);
    } catch { /* 存储不可用时仍能在当前界面切换。 */ }
  })();
  async function setLanguage(value) {
    if (!valid(value)) return;
    revision++;
    applyLanguage(value);
    try { await chrome.storage.local.set({ [storageKey]: value }); }
    catch { /* 本次选择仍然生效。 */ }
  }
  function onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function t(key, ...values) {
    return (catalogs[language][key] ?? catalogs.en[key] ?? "")
      .replace(/\$([1-9])/g, (_, index) => String(values[Number(index) - 1] ?? ""));
  }
  function locale() { return language === "en" ? "en-US" : "zh-CN"; }
  function toggleLanguage() { return setLanguage(language === "en" ? "zh_CN" : "en"); }
  function date(ymd, options = { year: "numeric", month: "numeric", day: "numeric" }) {
    return new Intl.DateTimeFormat(locale(), { timeZone: "UTC", ...options })
      .format(new Date(`${ymd}T12:00:00Z`));
  }
  globalThis.TritonCalI18n = { t, locale, date, ready, setLanguage, toggleLanguage, onChange };
})();
