import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const devUrl = "http://127.0.0.1:5173/";

const isCurrentAppServer = async () => {
  try {
    const response = await fetch(devUrl, { cache: "no-store" });

    if (!response.ok) {
      return false;
    }

    const html = await response.text();

    return html.includes("<title>急急如律令</title>") && html.includes("/src/main.tsx");
  } catch {
    return false;
  }
};

if (await isCurrentAppServer()) {
  console.log(`Reusing existing frontend dev server at ${devUrl}`);
  process.exit(0);
}

const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
let output = "";

const child = spawn(
  process.execPath,
  [viteBin, "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
  {
    stdio: ["ignore", "pipe", "pipe"],
  },
);

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stdout.write(text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stderr.write(text);
});

const forwardSignal = (signal) => {
  child.kill(signal);
};

process.on("SIGINT", forwardSignal);
process.on("SIGTERM", forwardSignal);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (code !== 0 && /Port 5173 is already in use|EADDRINUSE/.test(output)) {
    console.warn(`Port 5173 is already in use. Reusing existing frontend dev server at ${devUrl}`);
    process.exit(0);
  }

  process.exit(code ?? 0);
});
