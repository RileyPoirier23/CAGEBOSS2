// CAGE BOSS II's icon, drawn as 32x32 pixel art and scaled up: a gold "II" over a blood-red
// slash, on the warehouse's dark purple, with a chain-link cage behind it. Writes
// build/icon-sequel.png (256), build/icon-sequel-1024.png and build/icon-sequel.ico (PNG inside).
//   node tools/make-sequel-icon.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const N = 32;
const BG = [0x14, 0x10, 0x1a], EDGE = [0x3a, 0x2a, 0x40], CAGE = [0x2a, 0x22, 0x30], BLOOD = [0xc4, 0x20, 0x2c], BLOOD2 = [0x8a, 0x14, 0x1c];
const GOLD = [0xe8, 0xc0, 0x40], GOLD2 = [0xa8, 0x80, 0x24], INK = [0x08, 0x06, 0x0a];
const px = Array.from({ length: N * N }, () => null);
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c; };

// a rounded square
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const cx = Math.min(x, N - 1 - x), cy = Math.min(y, N - 1 - y);
  if (cx + cy < 3) continue;
  const edge = cx === 0 || cy === 0 || cx + cy === 3;
  set(x, y, edge ? EDGE : (x + y) % 4 === 0 || (x - y + 64) % 4 === 0 ? CAGE : BG);
}
// the slash, bottom left to top right
for (let k = -2; k < 34; k++) for (let w = -3; w <= 3; w++) {
  const x = k + w, y = N - 1 - k;
  if (px[y * N + x]) set(x, y, Math.abs(w) === 3 ? BLOOD2 : BLOOD);
}
// "II": two bars with serifs, outlined
const bar = (x0) => {
  for (let y = 6; y < 26; y++) for (let x = x0 - 1; x < x0 + 5; x++) set(x, y, INK);
  for (let y = 5; y < 27; y++) for (let x = x0 - 3; x < x0 + 7; x++) if (y < 8 || y > 23) set(x, y, INK);
  for (let y = 7; y < 25; y++) for (let x = x0; x < x0 + 4; x++) set(x, y, x === x0 + 3 ? GOLD2 : GOLD);
  for (let y = 6; y < 26; y++) for (let x = x0 - 2; x < x0 + 6; x++) if (y < 8 || y > 23) set(x, y, y === 25 ? GOLD2 : GOLD);
};
bar(8);
bar(20);

function png(size) {
  const s = size / N;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const c = px[Math.floor(y / s) * N + Math.floor(x / s)];
      const o = y * (size * 4 + 1) + 1 + x * 4;
      if (c) { raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255; }
    }
  }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const p256 = png(256);
writeFileSync('build/icon-sequel.png', p256);
writeFileSync('build/icon-sequel-1024.png', png(1024));
// an .ico with one 256x256 PNG entry (Windows Vista and later read these)
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
const dir = Buffer.alloc(16);
dir[0] = 0; dir[1] = 0; dir[2] = 0; dir[3] = 0; dir.writeUInt16LE(1, 4); dir.writeUInt16LE(32, 6); dir.writeUInt32LE(p256.length, 8); dir.writeUInt32LE(22, 12);
writeFileSync('build/icon-sequel.ico', Buffer.concat([head, dir, p256]));
console.log('wrote build/icon-sequel.png, build/icon-sequel-1024.png, build/icon-sequel.ico');
