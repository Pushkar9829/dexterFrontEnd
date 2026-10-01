// Writes public/icon-192.png, icon-512.png and apple-touch-icon.png with Node only (no image libraries).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size) {
  const teal = [15, 76, 92];
  const mint = [13, 115, 119];
  const white = [255, 255, 255];
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const inRect = (x, y, x0, y0, x1, y1, r) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = Math.max(x0 + r, Math.min(x, x1 - r));
    const cy = Math.max(y0 + r, Math.min(y, y1 - r));
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let c = teal;
      if (inRect(u, v, 0.24, 0.2, 0.76, 0.8, 0.06)) c = white;
      if (inRect(u, v, 0.31, 0.28, 0.69, 0.46, 0.02)) c = mint;
      if (inRect(u, v, 0.31, 0.56, 0.69, 0.6, 0.02)) c = teal;
      for (const [kx, ky] of [[0.36, 0.67], [0.46, 0.67], [0.56, 0.67]]) if (inRect(u, v, kx, ky, kx + 0.07, ky + 0.06, 0.01)) c = mint;
      raw.set([...c, 255], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const out = path.join(__dirname, "..", "public");
fs.mkdirSync(out, { recursive: true });
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) fs.writeFileSync(path.join(out, name), png(size));
console.log("icons written to", out);
