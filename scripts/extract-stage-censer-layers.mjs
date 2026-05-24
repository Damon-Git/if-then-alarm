import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const [, , inputPath, outputDirectory] = process.argv;

if (!inputPath || !outputDirectory) {
  console.error("Usage: node scripts/extract-stage-censer-layers.mjs <source.png> <output-directory>");
  process.exit(1);
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

const paeth = (left, up, upLeft) => {
  const predictor = left + up - upLeft;
  const leftDistance = Math.abs(predictor - left);
  const upDistance = Math.abs(predictor - up);
  const upLeftDistance = Math.abs(predictor - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
};

const decodePng = (buffer) => {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  if (!buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error("Input is not a PNG file.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = buffer.subarray(offset, offset + length);
    offset += length + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }

    if (type === "IDAT") {
      idatChunks.push(data);
    }

    if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const rowStride = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const output = Buffer.alloc(width * height * 4);
  let inputOffset = 0;
  let previousRow = Buffer.alloc(rowStride);

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const scanline = Buffer.from(inflated.subarray(inputOffset, inputOffset + rowStride));
    inputOffset += rowStride;
    const reconstructed = Buffer.alloc(rowStride);

    for (let x = 0; x < rowStride; x += 1) {
      const left = x >= channels ? reconstructed[x - channels] : 0;
      const up = previousRow[x] ?? 0;
      const upLeft = x >= channels ? previousRow[x - channels] : 0;
      let value = scanline[x];

      if (filterType === 1) {
        value = (value + left) & 0xff;
      } else if (filterType === 2) {
        value = (value + up) & 0xff;
      } else if (filterType === 3) {
        value = (value + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        value = (value + paeth(left, up, upLeft)) & 0xff;
      } else if (filterType !== 0) {
        throw new Error(`Unsupported PNG filter: ${filterType}`);
      }

      reconstructed[x] = value;
    }

    previousRow = reconstructed;

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * channels;
      const outputIndex = (y * width + x) * 4;

      output[outputIndex] = reconstructed[sourceIndex];
      output[outputIndex + 1] = reconstructed[sourceIndex + 1];
      output[outputIndex + 2] = reconstructed[sourceIndex + 2];
      output[outputIndex + 3] = channels === 4 ? reconstructed[sourceIndex + 3] : 255;
    }
  }

  return { data: output, height, width };
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

const getChromaKeyAlpha = (red, green, blue, alpha) => {
  if (alpha === 0) {
    return 0;
  }

  const dominance = green - Math.max(red, blue);

  if (green > 210 && dominance > 90) {
    return 0;
  }

  if (green > 160 && dominance > 55) {
    return Math.max(0, Math.min(255, Math.round((90 - dominance) * 7)));
  }

  return 255;
};

const isConnectedBackgroundPixel = (red, green, blue, alpha) => {
  if (alpha < 250) {
    return true;
  }

  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const greenDominance = green - Math.max(red, blue);
  const isGreenScreenColor = green >= red * 1.08 && green >= blue * 1.08 && (greenDominance > 8 || maxChannel - minChannel > 22);
  const isDarkGreenShadow = green > red && green > blue && red < 72 && green < 116 && blue < 84;

  return isGreenScreenColor || isDarkGreenShadow;
};

const isResidualGreenScreenShadow = (red, green, blue, alpha) =>
  alpha > 0 &&
  red < 82 &&
  green < 118 &&
  blue < 90 &&
  green > red * 1.12 &&
  green >= blue * 1.03;

const clearResidualChromaPixels = (rgba) => {
  for (let index = 0; index < rgba.length; index += 4) {
    const red = rgba[index];
    const green = rgba[index + 1];
    const blue = rgba[index + 2];
    const alpha = rgba[index + 3];
    const isSoftGreenEdge = alpha < 150 && green > red * 1.12 && green > blue * 1.04;

    if (isResidualGreenScreenShadow(red, green, blue, alpha) || isSoftGreenEdge) {
      rgba[index + 3] = 0;
    }
  }
};

const clearEdgeConnectedBackground = (png) => {
  const visited = new Uint8Array(png.width * png.height);
  const stack = [];

  const enqueue = (x, y) => {
    if (x < 0 || x >= png.width || y < 0 || y >= png.height) {
      return;
    }

    const pixelIndex = y * png.width + x;

    if (visited[pixelIndex]) {
      return;
    }

    const dataIndex = pixelIndex * 4;

    if (
      !isConnectedBackgroundPixel(
        png.data[dataIndex],
        png.data[dataIndex + 1],
        png.data[dataIndex + 2],
        png.data[dataIndex + 3],
      )
    ) {
      return;
    }

    visited[pixelIndex] = 1;
    stack.push([x, y]);
  };

  for (let x = 0; x < png.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, png.height - 1);
  }

  for (let y = 0; y < png.height; y += 1) {
    enqueue(0, y);
    enqueue(png.width - 1, y);
  }

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const dataIndex = (y * png.width + x) * 4;

    png.data[dataIndex + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
};

const resizeBilinear = (source, sourceWidth, sourceHeight, targetWidth, targetHeight) => {
  const output = Buffer.alloc(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y += 1) {
    const gy = targetHeight === 1 ? 0 : (y * (sourceHeight - 1)) / (targetHeight - 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const wy = gy - y0;

    for (let x = 0; x < targetWidth; x += 1) {
      const gx = targetWidth === 1 ? 0 : (x * (sourceWidth - 1)) / (targetWidth - 1);
      const x0 = Math.floor(gx);
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const wx = gx - x0;
      const outputIndex = (y * targetWidth + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = source[(y0 * sourceWidth + x0) * 4 + channel];
        const topRight = source[(y0 * sourceWidth + x1) * 4 + channel];
        const bottomLeft = source[(y1 * sourceWidth + x0) * 4 + channel];
        const bottomRight = source[(y1 * sourceWidth + x1) * 4 + channel];

        output[outputIndex + channel] = Math.round(
          topLeft * (1 - wx) * (1 - wy) +
            topRight * wx * (1 - wy) +
            bottomLeft * (1 - wx) * wy +
            bottomRight * wx * wy,
        );
      }
    }
  }

  return output;
};

const png = decodePng(await readFile(inputPath));

for (let index = 0; index < png.data.length; index += 4) {
  const alpha = getChromaKeyAlpha(png.data[index], png.data[index + 1], png.data[index + 2], png.data[index + 3]);
  png.data[index + 3] = alpha;

  if (alpha < 255) {
    const greenCap = Math.max(png.data[index], png.data[index + 2]);
    png.data[index + 1] = Math.min(png.data[index + 1], greenCap);
  }
}

clearEdgeConnectedBackground(png);

clearResidualChromaPixels(png.data);

let minX = png.width;
let minY = png.height;
let maxX = -1;
let maxY = -1;

for (let y = 0; y < png.height; y += 1) {
  for (let x = 0; x < png.width; x += 1) {
    if (png.data[(y * png.width + x) * 4 + 3] > 20) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}

const padding = 16;
minX = Math.max(0, minX - padding);
minY = Math.max(0, minY - padding);
maxX = Math.min(png.width - 1, maxX + padding);
maxY = Math.min(png.height - 1, maxY + padding);

const cropWidth = maxX - minX + 1;
const cropHeight = maxY - minY + 1;
const crop = Buffer.alloc(cropWidth * cropHeight * 4);

for (let y = 0; y < cropHeight; y += 1) {
  for (let x = 0; x < cropWidth; x += 1) {
    const sourceIndex = ((y + minY) * png.width + x + minX) * 4;
    const targetIndex = (y * cropWidth + x) * 4;
    png.data.copy(crop, targetIndex, sourceIndex, sourceIndex + 4);
  }
}

const canvasSize = 320;
const targetWidth = 292;
const targetHeight = Math.round(cropHeight * (targetWidth / cropWidth));
const scaled = resizeBilinear(crop, cropWidth, cropHeight, targetWidth, targetHeight);
const normalized = Buffer.alloc(canvasSize * canvasSize * 4);
const offsetX = Math.round((canvasSize - targetWidth) / 2);
const offsetY = Math.round((canvasSize - targetHeight) / 2) + 8;

for (let y = 0; y < targetHeight; y += 1) {
  for (let x = 0; x < targetWidth; x += 1) {
    const sourceIndex = (y * targetWidth + x) * 4;
    const targetX = x + offsetX;
    const targetY = y + offsetY;

    if (targetX >= 0 && targetX < canvasSize && targetY >= 0 && targetY < canvasSize) {
      const targetIndex = (targetY * canvasSize + targetX) * 4;
      scaled.copy(normalized, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
}

clearResidualChromaPixels(normalized);

const layerRanges = {
  // The lid is the full domed cover and top knob, matching the future open-lid animation target.
  lid: [0.0, 0.39],
  // The mouth is only the lower rim/neck area below the lid.
  mouth: [0.32, 0.47],
  ash: [0.39, 0.51],
  body: [0.45, 0.84],
  feet: [0.78, 1.0],
};

const isInsideRange = (value, [start, end]) => value >= start && value < end;
const isInsideHorizontalBand = (x, start, end) => {
  const ratio = x / canvasSize;

  return ratio >= start && ratio <= end;
};

const shouldCopyPixelToLayer = (layer, x, relativeY) => {
  const centralLidBand = isInsideHorizontalBand(x, 0.19, 0.81);
  const centralMouthBand = isInsideHorizontalBand(x, 0.14, 0.86);
  const isSideHandleArea = !centralMouthBand && relativeY >= 0.22 && relativeY < 0.76;

  if (layer === "lid") {
    return isInsideRange(relativeY, layerRanges.lid) && centralLidBand;
  }

  if (layer === "mouth") {
    return isInsideRange(relativeY, layerRanges.mouth) && centralMouthBand;
  }

  if (layer === "ash") {
    return isInsideRange(relativeY, layerRanges.ash) && isInsideHorizontalBand(x, 0.2, 0.8);
  }

  if (layer === "body") {
    return isInsideRange(relativeY, layerRanges.body) || isSideHandleArea;
  }

  return isInsideRange(relativeY, layerRanges.feet);
};

await mkdir(outputDirectory, { recursive: true });

for (const layer of Object.keys(layerRanges)) {
  const layerPixels = Buffer.alloc(normalized.length);

  for (let y = Math.max(0, offsetY); y < Math.min(canvasSize, offsetY + targetHeight); y += 1) {
    const relativeY = (y - offsetY) / targetHeight;

    for (let x = 0; x < canvasSize; x += 1) {
      if (!shouldCopyPixelToLayer(layer, x, relativeY)) {
        continue;
      }

      const sourceIndex = (y * canvasSize + x) * 4;
      const targetIndex = sourceIndex;

      normalized.copy(layerPixels, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }

  await writeFile(path.join(outputDirectory, `${layer}.png`), encodePng(canvasSize, canvasSize, layerPixels));
}

console.log(`Wrote stage censer layers to ${outputDirectory}`);
