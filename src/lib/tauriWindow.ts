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
