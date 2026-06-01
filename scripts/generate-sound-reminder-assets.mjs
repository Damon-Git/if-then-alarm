import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "src/assets/sounds");
const sampleRate = 48_000;
const targetPeak = 0.52;

const soundSpecs = [
  {
    filename: "incense-finished.wav",
    durationSeconds: 1.3,
    strikes: [{ frequency: 349.23, gain: 0.9, offsetSeconds: 0 }],
  },
  {
    filename: "rest-finished.wav",
    durationSeconds: 1.65,
    strikes: [
      { frequency: 329.63, gain: 0.62, offsetSeconds: 0 },
      { frequency: 392, gain: 0.72, offsetSeconds: 0.34 },
    ],
  },
  {
    filename: "ritual-completed.wav",
    durationSeconds: 2.45,
    strikes: [
      { frequency: 293.66, gain: 0.52, offsetSeconds: 0 },
      { frequency: 349.23, gain: 0.6, offsetSeconds: 0.44 },
      { frequency: 392, gain: 0.74, offsetSeconds: 0.98 },
    ],
  },
];

const createSeededNoise = () => {
  let seed = 0x20260516;

  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0xffffffff - 0.5;
  };
};

const createStrikeSample = (elapsedSeconds, frequency, randomNoise) => {
  if (elapsedSeconds < 0) {
    return 0;
  }

  const attack = Math.min(1, elapsedSeconds / 0.008);
  const partials = [
    { amplitude: 0.74, decay: 1.15, ratio: 1 },
    { amplitude: 0.23, decay: 0.72, ratio: 2.03 },
    { amplitude: 0.15, decay: 0.52, ratio: 2.71 },
    { amplitude: 0.08, decay: 0.34, ratio: 4.18 },
  ];
  const resonance = partials.reduce(
    (sum, partial) =>
      sum +
      partial.amplitude *
        Math.exp(-elapsedSeconds / partial.decay) *
        Math.sin(2 * Math.PI * frequency * partial.ratio * elapsedSeconds),
    0,
  );
  const softenedMallet = randomNoise() * 0.08 * Math.exp(-elapsedSeconds / 0.045);

  return attack * (resonance + softenedMallet);
};

const createPcmSamples = ({ durationSeconds, strikes }) => {
  const sampleCount = Math.round(durationSeconds * sampleRate);
  const floatSamples = new Float64Array(sampleCount);
  const randomNoise = createSeededNoise();

  for (let index = 0; index < sampleCount; index += 1) {
    const currentSeconds = index / sampleRate;

    floatSamples[index] = strikes.reduce(
      (sum, strike) =>
        sum + strike.gain * createStrikeSample(currentSeconds - strike.offsetSeconds, strike.frequency, randomNoise),
      0,
    );
  }

  const peak = floatSamples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
  const pcmSamples = new Int16Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    pcmSamples[index] = Math.round((floatSamples[index] / peak) * targetPeak * 0x7fff);
  }

  return pcmSamples;
};

const createWavBuffer = (pcmSamples) => {
  const bitsPerSample = 16;
  const channelCount = 1;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = pcmSamples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < pcmSamples.length; index += 1) {
    buffer.writeInt16LE(pcmSamples[index], 44 + index * bytesPerSample);
  }

  return buffer;
};

await mkdir(outputDirectory, { recursive: true });

for (const spec of soundSpecs) {
  const buffer = createWavBuffer(createPcmSamples(spec));
  const outputPath = path.join(outputDirectory, spec.filename);

  await writeFile(outputPath, buffer);
  console.log(`Generated ${path.relative(projectRoot, outputPath)} (${buffer.byteLength} bytes)`);
}
