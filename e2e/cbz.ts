// Builds a tiny CBZ on the fly, so the smoke tests need no binary file in the repository.
import { crc32 } from 'node:zlib';
import { createCanvas } from '@napi-rs/canvas';

/** A tall portrait PNG of one flat colour, taller than the window so that a page needs scrolling. */
function pagePng(index: number): Buffer {
  const canvas = createCanvas(800, 1200);
  const context = canvas.getContext('2d');
  context.fillStyle = `hsl(${(index * 70) % 360} 60% 45%)`;
  context.fillRect(0, 0, 800, 1200);
  context.fillStyle = '#fff';
  context.font = '200px sans-serif';
  context.fillText(String(index + 1), 330, 650);
  return canvas.toBuffer('image/png');
}

/** A ZIP archive holding `files`, uncompressed (PNG is already compressed). */
function zip(files: { name: string; data: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of files) {
    const fileName = Buffer.from(name);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(fileName.length, 26);
    chunks.push(local, fileName, data);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4); // version made by
    entry.writeUInt16LE(20, 6); // version needed
    entry.writeUInt32LE(checksum, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(fileName.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, fileName);
    offset += local.length + fileName.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}

/** The bytes of a CBZ with `pageCount` pages named `page-01.png`, `page-02.png`… */
export function buildCbz(pageCount: number): Buffer {
  return zip(
    Array.from({ length: pageCount }, (_, index) => ({
      name: `page-${String(index + 1).padStart(2, '0')}.png`,
      data: pagePng(index),
    })),
  );
}
