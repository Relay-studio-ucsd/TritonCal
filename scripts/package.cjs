// 仅打包 extension 内的发行文件，使用 Node 原生能力写入无压缩 ZIP。
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const extension = path.join(root, "extension");
const version = JSON.parse(fs.readFileSync(path.join(extension, "manifest.json"), "utf8")).version;
const names = [
  "locales.js", "i18n.js", "_locales/en/messages.json", "_locales/zh_CN/messages.json", "README.en.md",
  "manifest.json", "capture.js", "parser.js", "ics.js", "offline.js", "week-view.js",
  "content.js", "popup.html", "popup.js", "README.md", "PRIVACY.md",
  "icons/icon.svg", "icons/icon-16.png", "icons/icon-32.png", "icons/icon-48.png", "icons/icon-128.png"
];

// ZIP 使用 CRC32 校验内容；无需安装压缩工具或 npm 依赖。
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function archive(prefix) {
  const entries = [];
  const directory = [];
  let offset = 0;
  for (const name of names) {
    const data = fs.readFileSync(path.join(extension, name));
    const filename = Buffer.from(prefix + name);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(33, 12); // 固定为 1980-01-01，确保相同源码生成相同 ZIP。
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    entries.push(local, filename, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, filename);
    offset += local.length + filename.length + data.length;
  }
  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...entries, central, end]);
}

const output = path.join(root, "out");
fs.mkdirSync(output, { recursive: true });
for (const [kind, prefix] of [["extension-preview", "extension/"], ["store-candidate", ""]]) {
  const name = `tritoncal-${kind}-${version}.zip`;
  fs.writeFileSync(path.join(output, name), archive(prefix));
  console.log(`Created out/${name} (${names.length} files)`);
}
