import { invoke } from "@tauri-apps/api/core";
import {
  createDefaultDesktopPersistenceJson,
  createDesktopPersistenceJsonFromSnapshot,
  createSnapshotFromDesktopPersistenceJson,
  DESKTOP_PERSISTENCE_VERSION,
  normalizeDesktopPersistenceJson,
  updateDesktopPersistenceJsonFromSnapshot,
  type DesktopPersistenceJson,
} from "./desktopPersistenceSchema";
import {
  createMemoryPersistenceAdapter,
  createPersistenceSnapshot,
  setPersistenceAdapter,
  webPersistenceAdapter,
  type PersistenceAdapter,
} from "./persistenceAdapter";

export type DesktopPersistenceFileClient = {
  backupCorruptTextFile: () => Promise<string | null>;
  readTextFile: () => Promise<string | null>;
  writeTextFile: (contents: string) => Promise<void>;
};

export type DesktopPersistenceAdapter = PersistenceAdapter & {
  flush: () => Promise<void>;
};

type InitializeDesktopPersistenceOptions = {
  fileClient?: DesktopPersistenceFileClient;
  force?: boolean;
  now?: string;
};

export type DesktopPersistenceInitializationResult =
  | {
      enabled: false;
      reason: "not-tauri" | "error";
    }
  | {
      corruptBackupPath?: string;
      enabled: true;
      manifest: DesktopPersistenceJson;
      source: "desktop-json" | "empty" | "localStorage";
    };

const isTauriRuntime = () =>
  typeof window !== "undefined" && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

const createDesktopPersistenceFileClient = (): DesktopPersistenceFileClient => ({
  backupCorruptTextFile: () => invoke<string | null>("backup_corrupt_desktop_persistence_file"),
  readTextFile: () => invoke<string | null>("read_desktop_persistence_file"),
  writeTextFile: (contents) => invoke<void>("write_desktop_persistence_file", { contents }),
});

const stringifyDesktopPersistenceJson = (manifest: DesktopPersistenceJson) => `${JSON.stringify(manifest, null, 2)}\n`;

const hasSnapshotValues = (snapshot: Record<string, string | undefined>) => Object.keys(snapshot).length > 0;

const createManifestFromWebStorage = (now: string) => {
  const webSnapshot = createPersistenceSnapshot(webPersistenceAdapter);

  if (!hasSnapshotValues(webSnapshot)) {
    return {
      manifest: createDefaultDesktopPersistenceJson({ now }),
      source: "empty" as const,
    };
  }

  return {
    manifest: createDesktopPersistenceJsonFromSnapshot(webSnapshot, {
      migratedAt: now,
      migrationSource: "localStorage",
      now,
    }),
    source: "localStorage" as const,
  };
};

const parseDesktopPersistenceFile = (rawValue: string, now: string) => {
  const parsedValue = JSON.parse(rawValue) as unknown;

  if (
    !parsedValue ||
    typeof parsedValue !== "object" ||
    (parsedValue as Partial<DesktopPersistenceJson>).version !== DESKTOP_PERSISTENCE_VERSION
  ) {
    throw new Error("INVALID_DESKTOP_PERSISTENCE_FILE");
  }

  return normalizeDesktopPersistenceJson(parsedValue, {
    migrationSource: "desktop-json",
    now,
  });
};

export const createDesktopPersistenceAdapter = ({
  cacheAdapter,
  fileClient,
  initialManifest,
  now = () => new Date().toISOString(),
}: {
  cacheAdapter: PersistenceAdapter;
  fileClient: DesktopPersistenceFileClient;
  initialManifest: DesktopPersistenceJson;
  now?: () => string;
}): DesktopPersistenceAdapter => {
  let manifest = initialManifest;
  let writeQueue = Promise.resolve();
  let latestWrite = Promise.resolve();

  const persist = () => {
    manifest = updateDesktopPersistenceJsonFromSnapshot(manifest, createPersistenceSnapshot(cacheAdapter), {
      now: now(),
    });

    const contents = stringifyDesktopPersistenceJson(manifest);
    const currentWrite = writeQueue.then(() => fileClient.writeTextFile(contents));

    latestWrite = currentWrite;
    writeQueue = currentWrite.catch((error) => {
      console.error("Failed to persist desktop data.", error);
    });
  };

  return {
    flush: () => latestWrite,
    getItem: (key) => cacheAdapter.getItem(key),
    removeItem: (key) => {
      cacheAdapter.removeItem(key);
      persist();
    },
    setItem: (key, value) => {
      cacheAdapter.setItem(key, value);
      persist();
    },
  };
};

export const initializeDesktopPersistence = async ({
  fileClient = createDesktopPersistenceFileClient(),
  force = false,
  now = new Date().toISOString(),
}: InitializeDesktopPersistenceOptions = {}): Promise<DesktopPersistenceInitializationResult> => {
  if (!force && !isTauriRuntime()) {
    return {
      enabled: false,
      reason: "not-tauri",
    };
  }

  try {
    const rawPersistenceFile = await fileClient.readTextFile();
    let corruptBackupPath: string | undefined;
    let manifest: DesktopPersistenceJson;
    let source: "desktop-json" | "empty" | "localStorage";

    if (rawPersistenceFile) {
      try {
        manifest = parseDesktopPersistenceFile(rawPersistenceFile, now);
        source = "desktop-json";
      } catch {
        corruptBackupPath = (await fileClient.backupCorruptTextFile()) ?? undefined;
        const recovered = createManifestFromWebStorage(now);
        manifest = recovered.manifest;
        source = recovered.source;
        await fileClient.writeTextFile(stringifyDesktopPersistenceJson(manifest));
      }
    } else {
      const initial = createManifestFromWebStorage(now);
      manifest = initial.manifest;
      source = initial.source;
      await fileClient.writeTextFile(stringifyDesktopPersistenceJson(manifest));
    }

    const cacheAdapter = createMemoryPersistenceAdapter(createSnapshotFromDesktopPersistenceJson(manifest));
    const desktopAdapter = createDesktopPersistenceAdapter({
      cacheAdapter,
      fileClient,
      initialManifest: manifest,
    });

    setPersistenceAdapter(desktopAdapter);

    return {
      corruptBackupPath,
      enabled: true,
      manifest,
      source,
    };
  } catch (error) {
    console.error("Failed to initialize desktop persistence.", error);

    return {
      enabled: false,
      reason: "error",
    };
  }
};
