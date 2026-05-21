import { COMPACT_WINDOW_SIZE, FULL_WINDOW_SIZE } from "../constants";

type TauriInternalsWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

type TauriWindowSize = {
  height: number;
  width: number;
};

export const isTauriRuntime = () =>
  typeof window !== "undefined" && Boolean((window as TauriInternalsWindow).__TAURI_INTERNALS__);

export const listenForTauriCloseRequest = async (onCloseRequested: () => boolean) => {
  if (!isTauriRuntime()) {
    return () => {};
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");

  return getCurrentWindow().onCloseRequested((event) => {
    if (onCloseRequested()) {
      event.preventDefault();
    }
  });
};

export const closeCurrentTauriWindow = async () => {
  if (!isTauriRuntime()) {
    return false;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().destroy();
  return true;
};

export const hideCurrentTauriWindow = async () => {
  if (!isTauriRuntime()) {
    return false;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().hide();
  return true;
};

const resizeAndFocusCurrentTauriWindow = async (size: TauriWindowSize) => {
  if (!isTauriRuntime()) {
    return false;
  }

  const { getCurrentWindow, LogicalSize } = await import("@tauri-apps/api/window");
  const currentWindow = getCurrentWindow();

  await currentWindow.setSize(new LogicalSize(size.width, size.height));
  await currentWindow.center();
  await currentWindow.show();
  await currentWindow.setFocus();
  return true;
};

export const expandCurrentTauriWindow = async () => resizeAndFocusCurrentTauriWindow(FULL_WINDOW_SIZE);

export const compactCurrentTauriWindow = async () => resizeAndFocusCurrentTauriWindow(COMPACT_WINDOW_SIZE);

export const setCurrentTauriWindowAlwaysOnTop = async (isAlwaysOnTop: boolean) => {
  if (!isTauriRuntime()) {
    return false;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setAlwaysOnTop(isAlwaysOnTop);
  return true;
};

export const setTauriDockVisibility = async (isDockVisible: boolean) => {
  if (!isTauriRuntime()) {
    return false;
  }

  const { setDockVisibility } = await import("@tauri-apps/api/app");
  await setDockVisibility(isDockVisible);
  return true;
};
