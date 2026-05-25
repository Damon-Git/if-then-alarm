import packageJson from "../../package.json";
import { DESKTOP_PERSISTENCE_FILENAME, DESKTOP_PERSISTENCE_VERSION } from "./desktopPersistenceSchema";

export const APP_NAME = "急急如律令";
export const APP_IDENTIFIER = "com.damon.jijirululing";
export const APP_VERSION = packageJson.version;
export const APP_BUILD_CHANNEL = "internal-self-use";
export const APP_BUILD_LABEL = "内部自用版";

export const APP_METADATA = {
  buildChannel: APP_BUILD_CHANNEL,
  buildLabel: APP_BUILD_LABEL,
  dataFilename: DESKTOP_PERSISTENCE_FILENAME,
  dataSchemaVersion: DESKTOP_PERSISTENCE_VERSION,
  identifier: APP_IDENTIFIER,
  name: APP_NAME,
  version: APP_VERSION,
} as const;
