import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const expectedAssets = [
  { durationSeconds: 1.3, filename: "incense-finished.wav", maxBytes: 140_000 },
  { durationSeconds: 1.65, filename: "rest-finished.wav", maxBytes: 170_000 },
  { durationSeconds: 2.45, filename: "ritual-completed.wav", maxBytes: 250_000 },
];

const passes = [];
const failures = [];

const assert = (condition, message) => {
  if (condition) {
    passes.push(message);
    return;
  }

  failures.push(message);
};

const readWavMetadata = async (relativePath) => {
  const buffer = await readFile(path.join(projectRoot, relativePath));
  const channelCount = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataSize = buffer.readUInt32LE(40);
  const bytesPerSample = bitsPerSample / 8;
  let peak = 0;

  for (let offset = 44; offset < 44 + dataSize; offset += bytesPerSample) {
    peak = Math.max(peak, Math.abs(buffer.readInt16LE(offset)));
  }

  return {
    bitsPerSample,
    byteLength: buffer.byteLength,
    channelCount,
    durationSeconds: dataSize / (sampleRate * channelCount * bytesPerSample),
    format: `${buffer.toString("ascii", 0, 4)}/${buffer.toString("ascii", 8, 12)}`,
    peakRatio: peak / 0x7fff,
    sampleRate,
  };
};

for (const asset of expectedAssets) {
  const relativePath = `src/assets/sounds/${asset.filename}`;
  const metadata = await readWavMetadata(relativePath);

  assert(metadata.format === "RIFF/WAVE", `${relativePath} is a RIFF/WAVE file`);
  assert(metadata.channelCount === 1, `${relativePath} is mono`);
  assert(metadata.sampleRate === 48_000, `${relativePath} uses a 48 kHz sample rate`);
  assert(metadata.bitsPerSample === 16, `${relativePath} uses 16-bit PCM`);
  assert(
    Math.abs(metadata.durationSeconds - asset.durationSeconds) < 0.001,
    `${relativePath} duration is ${asset.durationSeconds.toFixed(2)} seconds`,
  );
  assert(metadata.byteLength <= asset.maxBytes, `${relativePath} stays below ${asset.maxBytes} bytes`);
  assert(metadata.peakRatio >= 0.5 && metadata.peakRatio <= 0.53, `${relativePath} peak level stays restrained`);
}

if (failures.length > 0) {
  console.error("Sound asset check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Sound asset check passed:");
for (const pass of passes) {
  console.log(`- ${pass}`);
}
