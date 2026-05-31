import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const visualAssetsPath = path.join(projectRoot, "src/lib/visualAssets.ts");
const visualAssetManifestPath = path.join(projectRoot, "src/lib/visualAssetManifest.ts");
const srcLibDirectory = path.join(projectRoot, "src/lib");

const failures = [];

const fail = (message) => {
  failures.push(message);
};

const assert = (condition, message) => {
  if (!condition) {
    fail(message);
  }
};

const readProjectText = (relativePath) => readFile(path.join(projectRoot, relativePath), "utf8");

const splitTopLevelEntries = (source) => {
  const entries = [];
  let depth = 0;
  let entryStart = 0;
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const previousChar = source[index - 1];

    if (quote) {
      if (char === quote && previousChar !== "\\") {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }

    if (char === "}" || char === "]") {
      depth -= 1;
      continue;
    }

    if (char === "," && depth === 0) {
      const entry = source.slice(entryStart, index).trim();
      if (entry) {
        entries.push(entry);
      }
      entryStart = index + 1;
    }
  }

  const finalEntry = source.slice(entryStart).trim();
  if (finalEntry) {
    entries.push(finalEntry);
  }

  return entries;
};

const findObjectLiteralBody = (source, exportName) => {
  const assignmentIndex = source.indexOf(`export const ${exportName} =`);

  if (assignmentIndex === -1) {
    throw new Error(`Cannot find ${exportName}.`);
  }

  const start = source.indexOf("{", assignmentIndex);
  let depth = 0;
  let quote = null;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const previousChar = source[index - 1];

    if (quote) {
      if (char === quote && previousChar !== "\\") {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start + 1, index);
      }
    }
  }

  throw new Error(`Cannot parse ${exportName}.`);
};

const parseVisualAssetDirectories = (visualAssetsSource) => {
  const body = findObjectLiteralBody(visualAssetsSource, "VISUAL_ASSET_DIRECTORIES");
  const directories = {};

  for (const entry of splitTopLevelEntries(body)) {
    const match = entry.match(/^(\w+):\s*`\$\{VISUAL_ASSET_ROOT\}\/([^`]+)`$/);

    if (match) {
      directories[match[1]] = `src/assets/visuals/${match[2]}`;
    }
  }

  return directories;
};

const parseFamilySpecs = (visualAssetsSource) => {
  const specs = {};
  const familyPattern = /(censer|incense):\s*\{([\s\S]*?)\n\s{2}\}/g;
  const source = findObjectLiteralBody(visualAssetsSource, "VISUAL_ASSET_FAMILY_SPECS");
  let familyMatch;

  while ((familyMatch = familyPattern.exec(source))) {
    const family = familyMatch[1];
    specs[family] = {};
    const familyBody = familyMatch[2];
    const sizePattern =
      /(compact|stage):\s*\{\s*renderBox:\s*\{\s*height:\s*(\d+),\s*width:\s*(\d+)\s*\},\s*sourceCanvas:\s*\{\s*height:\s*(\d+),\s*width:\s*(\d+)\s*\},\s*\}/g;
    let sizeMatch;

    while ((sizeMatch = sizePattern.exec(familyBody))) {
      specs[family][sizeMatch[1]] = {
        renderBox: { height: Number(sizeMatch[2]), width: Number(sizeMatch[3]) },
        sourceCanvas: { height: Number(sizeMatch[4]), width: Number(sizeMatch[5]) },
      };
    }
  }

  return specs;
};

const parseSourceCanvas = (block, familySpecs) => {
  const literalMatch = block.match(/sourceCanvas:\s*\{\s*height:\s*(\d+),\s*width:\s*(\d+)\s*\}/);

  if (literalMatch) {
    return { height: Number(literalMatch[1]), width: Number(literalMatch[2]) };
  }

  const referenceMatch = block.match(/sourceCanvas:\s*VISUAL_ASSET_FAMILY_SPECS\.(censer|incense)\.(compact|stage)\.sourceCanvas/);

  if (referenceMatch) {
    return familySpecs[referenceMatch[1]]?.[referenceMatch[2]]?.sourceCanvas;
  }

  return undefined;
};

const parseRegistryTargets = (visualAssetsSource) => {
  const directories = parseVisualAssetDirectories(visualAssetsSource);
  const familySpecs = parseFamilySpecs(visualAssetsSource);
  const body = findObjectLiteralBody(visualAssetsSource, "VISUAL_ASSET_REPLACEMENT_REGISTRY");
  const targets = {};

  for (const entry of splitTopLevelEntries(body)) {
    const nameMatch = entry.match(/^(\w+):\s*\{([\s\S]*)\}$/);

    if (!nameMatch) {
      continue;
    }

    const [, name, block] = nameMatch;
    const directoryReference = block.match(/directory:\s*VISUAL_ASSET_DIRECTORIES\.(\w+)/)?.[1];
    const manifestSlotsBlock = block.match(/manifestSlots:\s*\[([\s\S]*?)\]/)?.[1] ?? "";

    targets[name] = {
      dimensionPolicy: block.match(/dimensionPolicy:\s*"([^"]+)"/)?.[1],
      directory: directoryReference ? directories[directoryReference] : undefined,
      manifestSlots: [...manifestSlotsBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]),
      sourceCanvas: parseSourceCanvas(block, familySpecs),
      status: block.match(/status:\s*"([^"]+)"/)?.[1],
      transparentBackground: block.match(/transparentBackground:\s*(true|false)/)?.[1] === "true",
    };
  }

  return targets;
};

const parseManifest = (manifestSource) => {
  const imports = {};

  for (const match of manifestSource.matchAll(/import\s+(\w+)\s+from\s+"([^"]+\.png)";/g)) {
    imports[match[1]] = path.resolve(srcLibDirectory, match[2]);
  }

  const body = findObjectLiteralBody(manifestSource, "visualAssetManifest");
  const manifest = {};

  for (const entry of splitTopLevelEntries(body)) {
    const match = entry.match(/^"([^"]+)":\s*(\w+)$/);

    if (match) {
      manifest[match[1]] = {
        importName: match[2],
        path: imports[match[2]],
      };
    }
  }

  return manifest;
};

const parsePng = async (filePath) => {
  const buffer = await readFile(filePath);

  if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error("not a PNG file");
  }

  const chunks = [];
  let offset = 8;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    chunks.push({ data, type });
    offset += 12 + length;

    if (type === "IEND") {
      break;
    }
  }

  const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!ihdr) {
    throw new Error("missing IHDR chunk");
  }

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];

  return {
    bitDepth,
    colorType,
    height,
    pixels: () => decodePngPixels({ bitDepth, chunks, colorType, height, width }),
    width,
  };
};

const paethPredictor = (left, above, upperLeft) => {
  const p = left + above - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - above);
  const pc = Math.abs(p - upperLeft);

  if (pa <= pb && pa <= pc) {
    return left;
  }

  if (pb <= pc) {
    return above;
  }

  return upperLeft;
};

const decodePngPixels = ({ bitDepth, chunks, colorType, height, width }) => {
  if (bitDepth !== 8 || colorType !== 6) {
    return undefined;
  }

  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
  const raw = zlib.inflateSync(idat);
  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;
  const pixels = Buffer.alloc(rowLength * height);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * rowLength;

    for (let x = 0; x < rowLength; x += 1) {
      const byte = raw[rawOffset + x];
      const left = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[rowStart + x - rowLength] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[rowStart + x - rowLength - bytesPerPixel] : 0;

      if (filterType === 0) {
        pixels[rowStart + x] = byte;
      } else if (filterType === 1) {
        pixels[rowStart + x] = (byte + left) & 0xff;
      } else if (filterType === 2) {
        pixels[rowStart + x] = (byte + above) & 0xff;
      } else if (filterType === 3) {
        pixels[rowStart + x] = (byte + Math.floor((left + above) / 2)) & 0xff;
      } else if (filterType === 4) {
        pixels[rowStart + x] = (byte + paethPredictor(left, above, upperLeft)) & 0xff;
      } else {
        throw new Error(`unsupported PNG filter type ${filterType}`);
      }
    }

    rawOffset += rowLength;
  }

  return pixels;
};

const getAlphaAt = (pixels, width, x, y) => pixels[(y * width + x) * 4 + 3];

const assertTransparentCorners = async (filePath, slot, png) => {
  if (png.colorType !== 6) {
    fail(`${slot} must be RGBA PNG for transparency checks; color type is ${png.colorType}`);
    return;
  }

  const pixels = png.pixels();
  if (!pixels) {
    fail(`${slot} must be 8-bit RGBA PNG for transparency checks`);
    return;
  }

  const samplePoints = [
    [0, 0],
    [png.width - 1, 0],
    [0, png.height - 1],
    [png.width - 1, png.height - 1],
  ];
  const opaqueCorners = samplePoints.filter(([x, y]) => getAlphaAt(pixels, png.width, x, y) !== 0);

  if (opaqueCorners.length > 0) {
    fail(`${slot} must have transparent PNG corners; opaque corners found in ${path.relative(projectRoot, filePath)}`);
  }
};

const isOptionalManifestSlot = (slot) => slot.endsWith("/state") || slot.endsWith("/text");

const visualAssetsSource = await readFile(visualAssetsPath, "utf8");
const manifestSource = await readFile(visualAssetManifestPath, "utf8");
const registryTargets = parseRegistryTargets(visualAssetsSource);
const manifest = parseManifest(manifestSource);

for (const [targetName, target] of Object.entries(registryTargets)) {
  assert(target.directory, `${targetName} is missing a registry directory`);
  assert(target.dimensionPolicy, `${targetName} is missing dimensionPolicy`);
  assert(Array.isArray(target.manifestSlots) && target.manifestSlots.length > 0, `${targetName} has no manifest slots`);
  assert(target.status === "final", `${targetName} must stay final; got ${target.status ?? "missing status"}`);

  if (target.directory) {
    assert(existsSync(path.join(projectRoot, target.directory)), `${targetName} directory is missing: ${target.directory}`);
  }

  for (const slot of target.manifestSlots) {
    if (isOptionalManifestSlot(slot)) {
      continue;
    }

    const manifestEntry = manifest[slot];
    assert(manifestEntry, `${targetName} slot is not configured in visualAssetManifest: ${slot}`);

    if (!manifestEntry?.path) {
      continue;
    }

    assert(existsSync(manifestEntry.path), `${slot} file is missing: ${path.relative(projectRoot, manifestEntry.path)}`);
  }
}

for (const [slot, manifestEntry] of Object.entries(manifest)) {
  const filePath = manifestEntry.path;
  assert(filePath, `${slot} import is not resolved: ${manifestEntry.importName}`);

  if (!filePath || !existsSync(filePath)) {
    continue;
  }

  const fileStat = await stat(filePath);
  assert(fileStat.size > 0, `${slot} file is empty: ${path.relative(projectRoot, filePath)}`);

  let png;
  try {
    png = await parsePng(filePath);
  } catch (error) {
    fail(`${slot} is not a readable PNG: ${error.message}`);
    continue;
  }

  const registryTarget = Object.values(registryTargets).find((target) => target.manifestSlots.includes(slot));

  if (!registryTarget) {
    fail(`${slot} is configured in manifest but not present in VISUAL_ASSET_REPLACEMENT_REGISTRY`);
    continue;
  }

  if (registryTarget.dimensionPolicy === "exact-source-canvas" && registryTarget.sourceCanvas) {
    const expected = registryTarget.sourceCanvas;
    assert(
      png.width === expected.width && png.height === expected.height,
      `${slot} expected ${expected.width}x${expected.height}, got ${png.width}x${png.height}`,
    );
  }

  if (registryTarget.dimensionPolicy === "cropped-layer") {
    assert(png.width > 0 && png.height > 0, `${slot} cropped layer must have positive PNG dimensions`);
  }

  if (registryTarget.transparentBackground) {
    await assertTransparentCorners(filePath, slot, png);
  }
}

if (failures.length > 0) {
  console.error("Visual asset check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Visual asset check passed:");
console.log(`- Checked ${Object.keys(registryTargets).length} registry targets`);
console.log(`- Checked ${Object.keys(manifest).length} manifest entries`);
