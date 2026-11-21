(() => {
  if (window.__tritonCalCaptureInstalled) return;
  window.__tritonCalCaptureInstalled = true;

  const channel = "tritoncal:timetable:v1";

  // 只辨认 TSS 页面自己请求的 OData 响应，不主动发请求。
  function responseKind(url) {
    try {
      const parsed = new URL(url, location.href);
      if (parsed.origin !== location.origin) return null;
      if (/\/EVENT_TIMETABLE_SRV\/EventListSet$/i.test(parsed.pathname)) return "direct";
      if (/\/sap\/opu\/odata\/[^/]+\/[^/]+\/\$batch$/i.test(parsed.pathname)) return "batch";
      return null;
    } catch {
      return null;
    }
  }

  // 从 multipart $batch 中只挑出 EventListSet 的 JSON，其他个人信息不转交给插件。
  function timetableParts(body) {
    const timetableRows = [];
    const envelope = /\{\s*"d"\s*:/g;
    for (let match = envelope.exec(body); match; match = envelope.exec(body)) {
      let depth = 0;
      let quoted = false;
      let escaped = false;
      let end = -1;
      for (let i = match.index; i < body.length; i++) {
        const character = body[i];
        if (quoted) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === '"') quoted = false;
        } else if (character === '"') quoted = true;
        else if (character === "{") depth++;
        else if (character === "}" && --depth === 0) { end = i + 1; break; }
      }
      if (end < 0) break;
      try {
        const document = JSON.parse(body.slice(match.index, end));
        const rows = document?.d?.results;
        if (Array.isArray(rows)) {
          timetableRows.push(...rows.filter(row =>
            /EVENT_TIMETABLE_SRV\.EventList$/i.test(String(row?.__metadata?.type ?? ""))
          ));
        }
      } catch { /* 忽略不完整的 batch 部分 */ }
      envelope.lastIndex = end;
    }
    return timetableRows.length ? [JSON.stringify({ d: { results: timetableRows } })] : [];
  }

  function observe(url, body) {
    const kind = responseKind(url);
    if (!kind || typeof body !== "string" || !body) return;
    const payloads = kind === "direct" ? [body] : timetableParts(body);
    for (const payload of payloads) {
      window.postMessage({ channel, url, kind, body: payload }, location.origin);
    }
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function (...args) {
      const request = Reflect.apply(originalFetch, this, args);
      request.then(response => {
        if (!response.ok || !responseKind(response.url)) return;
        response.clone().text().then(body => observe(response.url, body)).catch(() => {});
      }).catch(() => {});
      return request;
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__tritonCalUrl = String(url);
    return Reflect.apply(originalOpen, this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (responseKind(this.__tritonCalUrl)) {
      this.addEventListener("load", () => {
        try {
          if (this.status >= 200 && this.status < 300) {
            observe(this.responseURL || this.__tritonCalUrl, this.responseText);
          }
        }
        catch { /* 不影响 TSS 页面 */ }
      }, { once: true });
    }
    return Reflect.apply(originalSend, this, args);
  };
})();
