const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../extension/capture.js"), "utf8");
const origin = "https://tss.ucsd.edu";

function runCapture({ url, body, ok = true }) {
  const messages = [];
  const requests = [];
  class FakeXHR {
    constructor() { this.listeners = {}; this.status = ok ? 200 : 403; this.responseText = body; this.responseURL = url; }
    open(_method, requestedUrl) { this.requestedUrl = requestedUrl; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    send() { this.listeners.load?.(); }
  }
  const window = {
    fetch: async (...args) => {
      requests.push(args);
      return { ok, url, clone: () => ({ text: async () => body }) };
    },
    postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin })
  };
  vm.runInNewContext(source, {
    window, XMLHttpRequest: FakeXHR, URL, Reflect, String, JSON,
    location: { origin, href: `${origin}/fiori/` }
  });
  return { window, FakeXHR, messages, requests };
}

test("单独的 EventListSet XHR 被动复制，失败响应不复制", () => {
  const url = `${origin}/sap/opu/odata/ited/EVENT_TIMETABLE_SRV/EventListSet?$filter=test`;
  const body = JSON.stringify({ d: { results: [{ EventId: "0001" }] } });
  const capture = runCapture({ url, body });
  const request = new capture.FakeXHR();
  request.open("GET", url);
  request.send();
  assert.equal(capture.messages.length, 1);
  assert.equal(capture.messages[0].message.body, body);
  assert.equal(capture.messages[0].targetOrigin, origin);

  const failed = runCapture({ url, body, ok: false });
  const failedRequest = new failed.FakeXHR();
  failedRequest.open("GET", url);
  failedRequest.send();
  assert.equal(failed.messages.length, 0);
});

test("$batch 只转交课表行，丢弃同批次的其他个人数据", async () => {
  const url = `${origin}/sap/opu/odata/ited/EVENT_TIMETABLE_SRV/$batch?sap-client=500`;
  const privatePart = JSON.stringify({ d: { results: [{ __metadata: { type: "OTHER_SRV.Person" }, Secret: "never-send" }] } });
  const timetablePart = JSON.stringify({ d: { results: [
    { __metadata: { type: "ITED_EVENT_TIMETABLE_SRV.EventList" }, EventId: "0001", EventName: "TEST {LE}" },
    { __metadata: { type: "ITED_EVENT_TIMETABLE_SRV.EventList" }, EventId: "0002" }
  ] } });
  const capture = runCapture({ url, body: `--batch\r\n${privatePart}\r\n--batch\r\n${timetablePart}\r\n--batch--` });
  await capture.window.fetch(url);
  await new Promise(setImmediate);
  assert.equal(capture.messages.length, 1);
  const copied = JSON.parse(capture.messages[0].message.body);
  assert.equal(copied.d.results.length, 2);
  assert.equal(copied.d.results[0].EventId, "0001");
  assert.equal(capture.messages[0].message.body.includes("never-send"), false);
  assert.equal(capture.requests.length, 1);
  assert.equal(capture.requests[0][0], url);
});

test("其他站点的同名接口不会被插件复制", async () => {
  const url = "https://other.example/sap/opu/odata/ited/EVENT_TIMETABLE_SRV/EventListSet";
  const capture = runCapture({ url, body: JSON.stringify({ d: { results: [{ EventId: "private" }] } }) });
  await capture.window.fetch(url);
  await new Promise(setImmediate);
  assert.equal(capture.requests.length, 1);
  assert.equal(capture.messages.length, 0);
});
