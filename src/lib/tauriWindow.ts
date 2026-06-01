import { COMPACT_WINDOW_SIZE, FULL_WINDOW_SIZE } from "../constants";

type TauriInternalsWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

type TauriWindowSize = {
  height: number;
  width: number;
};

export type CurrentTauriWindowDragPoint = {
  x: number;
  y: number;
};

export type CurrentTauriWindowDragSession = {
  moveTo: (point: CurrentTauriWindowDragPoint) => void;
};

type TauriTitleBarStyle = "visible" | "transparent" | "overlay";

type TauriWindowShell = {
  backgroundColor: string;
  hasDecorations: boolean;
  hasShadow: boolean;
  mode: "compact" | "full";
  titleBarStyle: TauriTitleBarStyle;
};

const setDocumentWindowMode = (mode: TauriWindowShell["mode"]) => {
  document.documentElement.dataset.windowMode = mode;
};

export const isCurrentDocumentWindowCompact = () =>
  typeof document !== "undefined" && document.documentElement.dataset.windowMode === "compact";

const runCompatibleWindowAction = async (action: () => Promise<void>) => {
  try {
    await action();
  } catch {
    // Some shell APIs vary by macOS/WebView support. Size/focus remain the source of truth.
  }
};

export const isTauriRuntime = () =>
  typeof window !== "undefined" && Boolean((window as TauriInternalsWindow).__TAURI_INTERNALS__);

export const createCurrentTauriWindowDragSession = async (startPoint: CurrentTauriWindowDragPoint) => {
  if (!isTauriRuntime()) {
    return null;
  }

  const { getCurrentWindow, LogicalPosition } = await import("@tauri-apps/api/window");
  const currentWindow = getCurrentWindow();
  const scaleFactor = await currentWindow.scaleFactor();
  const startWindowPosition = (await currentWindow.outerPosition()).toLogical(scaleFactor);
  let isMoving = false;
  let queuedPoint: CurrentTauriWindowDragPoint | null = null;

  const moveQueuedPoint = async () => {
    if (isMoving || !queuedPoint) {
      return;
    }

    const point = queuedPoint;
    queuedPoint = null;
    isMoving = true;

    try {
      await currentWindow.setPosition(
        new LogicalPosition(
          startWindowPosition.x + point.x - startPoint.x,
          startWindowPosition.y + point.y - startPoint.y,
        ),
      );
    } catch {
      queuedPoint = null;
    } finally {
      isMoving = false;
      void moveQueuedPoint();
    }
  };

  return {
    moveTo: (point: CurrentTauriWindowDragPoint) => {
      queuedPoint = point;
      void moveQueuedPoint();
    },
  } satisfies CurrentTauriWindowDragSession;
};

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

const resizeAndFocusCurrentTauriWindow = async (size: TauriWindowSize, shell: TauriWindowShell) => {
  if (!isTauriRuntime()) {
    return false;
  }

  setDocumentWindowMode(shell.mode);

  const { getCurrentWindow, LogicalSize } = await import("@tauri-apps/api/window");
  const currentWindow = getCurrentWindow();

  await runCompatibleWindowAction(() => currentWindow.setBackgroundColor(shell.backgroundColor));
  await runCompatibleWindowAction(() => currentWindow.setTitleBarStyle(shell.titleBarStyle));
  await runCompatibleWindowAction(() => currentWindow.setDecorations(shell.hasDecorations));
  await runCompatibleWindowAction(() => currentWindow.setShadow(shell.hasShadow));
  await currentWindow.setSize(new LogicalSize(size.width, size.height));
  await currentWindow.center();
  await currentWindow.show();
  await currentWindow.setFocus();
  return true;
};

export const expandCurrentTauriWindow = async () =>
  resizeAndFocusCurrentTauriWindow(FULL_WINDOW_SIZE, {
    backgroundColor: "#f4f0ea",
    hasDecorations: true,
    hasShadow: true,
    mode: "full",
    titleBarStyle: "visible",
  });

export const compactCurrentTauriWindow = async () =>
  resizeAndFocusCurrentTauriWindow(COMPACT_WINDOW_SIZE, {
    backgroundColor: "#00000000",
    hasDecorations: false,
    hasShadow: false,
    mode: "compact",
    titleBarStyle: "overlay",
  });

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
