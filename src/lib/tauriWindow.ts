type TauriInternalsWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
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
