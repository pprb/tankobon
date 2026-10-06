// Renders assets/icon.svg into the icon files of the packaged app: assets/icon.png (Linux, and the
// window), assets/icon.ico (Windows) and assets/icon.icns (macOS). Run with `npm run icons`; the
// generated files are committed, so building the app doesn't need this.
import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const svg = readFileSync('assets/icon.svg');
const image = await loadImage(svg);

/** Renders the SVG as a square PNG of `size` pixels. */
function render(size) {
  const canvas = createCanvas(size, size);
  canvas.getContext('2d').drawImage(image, 0, 0, size, size);
  return canvas.toBuffer('image/png');
}

writeFileSync('assets/icon.png', render(512));

// ICO: a directory of PNG-compressed images (supported since Windows Vista).
const icoSizes = [16, 32, 48, 64, 128, 256];
const icoImages = icoSizes.map(render);
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
icoSizes.forEach((size, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size === 256 ? 0 : size, entry);
  header.writeUInt8(size === 256 ? 0 : size, entry + 1);
  header.writeUInt16LE(1, entry + 4); // color planes
  header.writeUInt16LE(32, entry + 6); // bits per pixel
  header.writeUInt32LE(icoImages[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += icoImages[i].length;
});
writeFileSync('assets/icon.ico', Buffer.concat([header, ...icoImages]));

// ICNS: PNG-compressed entries (icp4 16, icp5 32, ic07 128, ic08 256, ic09 512, ic10 1024).
const icnsTypes = [['icp4', 16], ['icp5', 32], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]];
const chunks = icnsTypes.map(([type, size]) => {
  const data = render(size);
  const head = Buffer.alloc(8);
  head.write(type, 0, 'ascii');
  head.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([head, data]);
});
const total = 8 + chunks.reduce((sum, c) => sum + c.length, 0);
const icnsHead = Buffer.alloc(8);
icnsHead.write('icns', 0, 'ascii');
icnsHead.writeUInt32BE(total, 4);
writeFileSync('assets/icon.icns', Buffer.concat([icnsHead, ...chunks]));
