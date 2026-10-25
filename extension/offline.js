(() => {
  // 离线文件只放显示所需字段，不包含 TSS 事件号、module id 或原始响应。
  function generateOfflineHtml(events) {
    const { t, locale } = globalThis.TritonCalI18n;
    const keys = ["offlineTitle", "offlineHeading", "previousWeek", "thisWeek", "nextWeek", "courseColors", "mono", "offlineSource", "offlineEmpty", "offlineRange", "noClasses", "exam", "titleUnknown", "roomUnknown", "unnamedCourse"];
    // 下载时将翻译嵌入文件，离线运行不依赖扩展 API。
    const strings = Object.fromEntries(keys.map(key => [key, t(key, "{1}", "{2}", "{3}")]));
    const serialize = value => JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
    const escapeHtml = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const translations = serialize({ locale: locale(), strings });
    const safeEvents = events.map(event => ({
      date: event.date,
      start: event.start,
      end: event.end,
      code: event.code,
      type: event.type,
      name: event.name,
      title: event.title,
      room: event.room,
      isExam: event.isExam
    }));
    const data = serialize(safeEvents);
    const template = `<!doctype html>
<html lang="${escapeHtml(locale())}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(t("offlineTitle"))}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f8fa;color:#26384a;font:14px/1.45 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:20px}header{background:white;border:1px solid #e3e9ee;border-radius:16px;padding:20px;margin-bottom:16px}h1{font-size:24px;margin:0}p{color:#637486;margin:6px 0 0}.controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}button{font:inherit;color:#2b455f;background:white;border:1px solid #d7e0e8;border-radius:8px;padding:7px 11px;cursor:pointer}button:hover{background:#f3f7fa}button[aria-pressed="true"]{background:#e7f1f8;border-color:#a8c8df}.week{display:grid;grid-template-columns:repeat(var(--days),minmax(0,1fr));gap:10px}.day{min-width:0;background:white;border:1px solid #e3e9ee;border-radius:12px;padding:12px}.day h2{font-size:14px;margin:0 0 12px}.event{overflow-wrap:anywhere;border-left:3px solid var(--border);background:var(--background);border-radius:7px;padding:8px;margin:8px 0;font-size:12px}.event strong,.event span{display:block}.event span{margin-top:3px}.empty{color:#8a9aa8;font-size:12px}body[data-mode="mono"] .event{--background:#f1f4f6!important;--border:#7893a9!important}@media(max-width:650px){main{padding:10px}header{padding:15px}h1{font-size:21px}.week{grid-template-columns:1fr}.day{padding:12px}.event{font-size:13px}}
</style>
</head>
<body data-mode="course">
<main>
<header><h1>${escapeHtml(t("offlineHeading"))}</h1><p id="range"></p><p id="source"></p><div class="controls"><button id="previous">${escapeHtml(t("previousWeek"))}</button><button id="today">${escapeHtml(t("thisWeek"))}</button><button id="next">${escapeHtml(t("nextWeek"))}</button><button id="color" aria-pressed="true">${escapeHtml(t("courseColors"))}</button><button id="mono" aria-pressed="false">${escapeHtml(t("mono"))}</button></div></header>
<div class="week" id="week"></div>
</main>
<script type="application/json" id="schedule-data">__TRITONCAL_DATA__</script>
<script type="application/json" id="schedule-i18n">__TRITONCAL_I18N__</script>
<script>
(() => {
  const events = JSON.parse(document.getElementById("schedule-data").textContent);
  const { locale, strings } = JSON.parse(document.getElementById("schedule-i18n").textContent);
  const t = (key,...values) => strings[key].replace(/\{([1-3])\}/g,(_,index)=>String(values[Number(index)-1]));
  const dateLabel = date => new Intl.DateTimeFormat(locale,{timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"}).format(new Date(date+"T12:00:00Z"));
  const palette = [["#e4eff8","#4a83ad"],["#e8edf9","#6a7fb1"],["#e5f2ee","#5a998b"],["#f5ecdf","#ae8a5c"],["#f3e8ee","#a57995"],["#e9f0df","#879d65"]];
  function addDays(ymd, amount){const date=new Date(ymd+"T00:00:00Z");date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10)}
  function mondayOf(ymd){const day=new Date(ymd+"T00:00:00Z").getUTCDay();return addDays(ymd,-((day+6)%7))}
  function todayLA(){const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const part=type=>parts.find(x=>x.type===type).value;return part("year")+"-"+part("month")+"-"+part("day")}
  function node(tag,value){const result=document.createElement(tag);if(value!=null)result.textContent=value;return result}
  function color(event){const name=event.code||event.name;let hash=0;for(const letter of name)hash=(hash*31+letter.charCodeAt(0))>>>0;return event.isExam?["#fff0df","#b97831"]:palette[hash%palette.length]}
  function label(date){return new Intl.DateTimeFormat(locale,{timeZone:"UTC",weekday:"short",month:"numeric",day:"numeric"}).format(new Date(date+"T12:00:00Z"))}
  const today=mondayOf(todayLA());
  let weekStart=today;
  if(events.length&&!events.some(event=>event.date>=today&&event.date<=addDays(today,6))){const nearest=[...events].sort((a,b)=>Math.abs(Date.parse(a.date)-Date.now())-Math.abs(Date.parse(b.date)-Date.now()))[0];weekStart=mondayOf(nearest.date)}
  const dates=events.map(event=>event.date).sort();
  document.getElementById("source").textContent=dates.length?t("offlineSource",events.length,dateLabel(dates[0]),dateLabel(dates.at(-1))):t("offlineEmpty");
  function render(){const end=addDays(weekStart,6);const selected=events.filter(event=>event.date>=weekStart&&event.date<=end);document.getElementById("range").textContent=t("offlineRange",dateLabel(weekStart),dateLabel(end),selected.length);const showWeekend=selected.some(event=>event.date===addDays(weekStart,5)||event.date===end);const count=showWeekend?7:5;const week=document.getElementById("week");week.style.setProperty("--days",count);week.replaceChildren();for(let i=0;i<count;i++){const date=addDays(weekStart,i);const day=node("section");day.className="day";day.append(node("h2",label(date)));const daily=selected.filter(event=>event.date===date).sort((a,b)=>a.start.localeCompare(b.start));if(!daily.length){const empty=node("p",t("noClasses"));empty.className="empty";day.append(empty)}for(const event of daily){const card=node("article");card.className="event";const [background,border]=color(event);card.style.setProperty("--background",background);card.style.setProperty("--border",border);card.append(node("strong",(event.code||event.name||t("unnamedCourse"))+(event.isExam?" · "+t("exam"):event.type?" · "+event.type:"")));card.append(node("span",event.title||t("titleUnknown")));card.append(node("span",event.start+"–"+event.end));card.append(node("span",event.room||t("roomUnknown")));day.append(card)}week.append(day)}}
  document.getElementById("previous").onclick=()=>{weekStart=addDays(weekStart,-7);render()};
  document.getElementById("next").onclick=()=>{weekStart=addDays(weekStart,7);render()};
  document.getElementById("today").onclick=()=>{weekStart=mondayOf(todayLA());render()};
  for(const mode of ["color","mono"]){document.getElementById(mode).onclick=()=>{document.body.dataset.mode=mode==="color"?"course":"mono";document.getElementById("color").setAttribute("aria-pressed",String(mode==="color"));document.getElementById("mono").setAttribute("aria-pressed",String(mode==="mono"))}}
  render();
})();
</script>
</body>
</html>`;
    return template.replace(/__TRITONCAL_(DATA|I18N)__/g, (_, key) => key === "DATA" ? data : translations);
  }

  globalThis.TritonCalOffline = { generateOfflineHtml };
})();
