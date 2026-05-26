import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const outputDirectory = process.argv[2] ?? "src/assets/visuals/incense/stage";
const baseCanvasSize = 240;
const canvasSize = Number.parseInt(process.argv[3] ?? `${baseCanvasSize}`, 10);
const assetFamilyLabel = process.argv[4] ?? (outputDirectory.includes("/compact") ? "compact" : "stage");

if (!Number.isInteger(canvasSize) || canvasSize <= 0) {
  throw new Error(`Canvas size must be a positive integer. Received: ${process.argv[3]}`);
}

const makeCrcTable = () => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
};

const crcTable = makeCrcTable();

const crc32 = (buffers) => {
  let checksum = 0xffffffff;

  for (const buffer of buffers) {
    for (const byte of buffer) {
      checksum = crcTable[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
    }
  }

  return (checksum ^ 0xffffffff) >>> 0;
};

const createChunk = (type, data = Buffer.alloc(0)) => {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);

  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32([typeBuffer, data]), 8 + data.length);

  return chunk;
};

const encodePng = (width, height, rgba) => {
  const rowStride = width * 4;
  const raw = Buffer.alloc((rowStride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (rowStride + 1);

    raw[rowOffset] = 0;
    rgba.copy(raw, rowOffset + 1, y * rowStride, (y + 1) * rowStride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createChunk("IHDR", ihdr),
    createChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    createChunk("IEND"),
  ]);
};

const createCanvas = () => Buffer.alloc(canvasSize * canvasSize * 4);

const scaleValue = (value) => (value / baseCanvasSize) * canvasSize;

const hexToRgba = (hex, alpha = 255) => {
  const value = hex.replace("#", "");

  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    alpha,
  ];
};

const blendPixel = (canvas, x, y, color) => {
  if (x < 0 || x >= canvasSize || y < 0 || y >= canvasSize) {
    return;
  }

  const index = (Math.round(y) * canvasSize + Math.round(x)) * 4;
  const sourceAlpha = color[3] / 255;
  const targetAlpha = canvas[index + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outputAlpha === 0) {
    return;
  }

  canvas[index] = Math.round((color[0] * sourceAlpha + canvas[index] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
  canvas[index + 1] = Math.round(
    (color[1] * sourceAlpha + canvas[index + 1] * targetAlpha * (1 - sourceAlpha)) / outputAlpha,
  );
  canvas[index + 2] = Math.round(
    (color[2] * sourceAlpha + canvas[index + 2] * targetAlpha * (1 - sourceAlpha)) / outputAlpha,
  );
  canvas[index + 3] = Math.round(outputAlpha * 255);
};

const drawCapsule = (canvas, centerX, top, bottom, width, color) => {
  const scaledCenterX = scaleValue(centerX);
  const scaledTop = scaleValue(top);
  const scaledBottom = scaleValue(bottom);
  const scaledWidth = scaleValue(width);
  const radius = scaledWidth / 2;
  const left = scaledCenterX - radius;
  const right = scaledCenterX + radius;

  for (let y = Math.floor(scaledTop - radius); y <= Math.ceil(scaledBottom + radius); y += 1) {
    for (let x = Math.floor(left); x <= Math.ceil(right); x += 1) {
      const insideBody = y >= scaledTop && y <= scaledBottom && x >= left && x <= right;
      const topDistance = Math.hypot(x - scaledCenterX, y - scaledTop);
      const bottomDistance = Math.hypot(x - scaledCenterX, y - scaledBottom);

      if (insideBody || topDistance <= radius || bottomDistance <= radius) {
        blendPixel(canvas, x, y, color);
      }
    }
  }
};

const drawCircle = (canvas, centerX, centerY, radius, color) => {
  const scaledCenterX = scaleValue(centerX);
  const scaledCenterY = scaleValue(centerY);
  const scaledRadius = scaleValue(radius);

  for (let y = Math.floor(scaledCenterY - scaledRadius); y <= Math.ceil(scaledCenterY + scaledRadius); y += 1) {
    for (let x = Math.floor(scaledCenterX - scaledRadius); x <= Math.ceil(scaledCenterX + scaledRadius); x += 1) {
      if (Math.hypot(x - scaledCenterX, y - scaledCenterY) <= scaledRadius) {
        blendPixel(canvas, x, y, color);
      }
    }
  }
};

const drawSmokeStroke = (canvas, centerX, top, height, amplitude, color) => {
  for (let step = 0; step < height; step += 1) {
    const progress = step / height;
    const x = centerX + Math.sin(progress * Math.PI * 1.6) * amplitude;
    const y = top + step;
    const alpha = Math.round(color[3] * (1 - progress));

    drawCircle(canvas, x, y, 4 - progress * 2.8, [color[0], color[1], color[2], alpha]);
  }
};

const assets = {
  ash: () => {
    const canvas = createCanvas();

    drawCapsule(canvas, 120, 16, 224, 62, hexToRgba("#d8d4ce", 245));
    drawCapsule(canvas, 103, 24, 214, 16, hexToRgba("#f0ece6", 138));
    drawCapsule(canvas, 137, 28, 220, 12, hexToRgba("#aaa39c", 92));

    return canvas;
  },
  ember: () => {
    const canvas = createCanvas();

    drawCircle(canvas, 120, 120, 84, hexToRgba("#c34b32", 64));
    drawCircle(canvas, 120, 120, 58, hexToRgba("#d76737", 188));
    drawCircle(canvas, 120, 120, 30, hexToRgba("#f2b65d", 238));

    return canvas;
  },
  smoke: () => {
    const canvas = createCanvas();

    drawSmokeStroke(canvas, 112, 22, 190, 26, hexToRgba("#d8d1c8", 112));
    drawSmokeStroke(canvas, 128, 34, 170, -22, hexToRgba("#eee9e2", 82));

    return canvas;
  },
  stick: () => {
    const canvas = createCanvas();

    drawCapsule(canvas, 120, 14, 226, 70, hexToRgba("#6f3f2e", 255));
    drawCapsule(canvas, 102, 20, 220, 14, hexToRgba("#9a6348", 130));
    drawCapsule(canvas, 139, 20, 220, 10, hexToRgba("#4f2f25", 102));

    return canvas;
  },
};

await mkdir(outputDirectory, { recursive: true });

for (const [assetName, render] of Object.entries(assets)) {
  await writeFile(path.join(outputDirectory, `${assetName}.png`), encodePng(canvasSize, canvasSize, render()));
}

console.log(`Wrote ${assetFamilyLabel} incense assets to ${outputDirectory} at ${canvasSize}px`);
