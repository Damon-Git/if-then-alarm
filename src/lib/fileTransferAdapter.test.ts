import { afterEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { downloadTextFile, readTextFile, selectAndReadTextFile, shouldUseDesktopFileDialog } from "./fileTransferAdapter";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

const setTauriRuntime = (enabled: boolean) => {
  if (enabled) {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {},
    });
    return;
  }

  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
};

describe("file transfer adapter", () => {
  afterEach(() => {
    setTauriRuntime(false);
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("reads text from a file", async () => {
    const file = new File(["hello"], "fixture.txt", { type: "text/plain" });

    await expect(readTextFile(file)).resolves.toBe("hello");
  });

  it("downloads text files through a temporary link in web runtime", async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const link = document.createElement("a");
    Object.defineProperty(link, "click", { value: click });
    Object.defineProperty(link, "remove", { value: remove });

    const appendSpy = vi.spyOn(document.body, "append");
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);
    const createObjectUrlSpy = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:test-url");
    const revokeObjectUrlSpy = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => undefined);

    await expect(downloadTextFile("history.json", "{}", "application/json")).resolves.toEqual({
      status: "completed",
    });

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(createObjectUrlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(link.href).toBe("blob:test-url");
    expect(link.download).toBe("history.json");
    expect(appendSpy).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:test-url");
  });

  it("exports text files through the Tauri save dialog", async () => {
    setTauriRuntime(true);
    vi.mocked(save).mockResolvedValue("/tmp/history.json");
    vi.mocked(invoke).mockResolvedValue(undefined);

    await expect(downloadTextFile("history.json", "{}", "application/json")).resolves.toEqual({
      status: "completed",
    });

    expect(save).toHaveBeenCalledWith({
      defaultPath: "history.json",
      filters: [{ extensions: ["json"], name: "JSON" }],
      title: "导出历史记录",
    });
    expect(invoke).toHaveBeenCalledWith("write_user_text_file", {
      contents: "{}",
      path: "/tmp/history.json",
    });
  });

  it("allows a custom Tauri save dialog title", async () => {
    setTauriRuntime(true);
    vi.mocked(save).mockResolvedValue("/tmp/full-backup.json");
    vi.mocked(invoke).mockResolvedValue(undefined);

    await expect(
      downloadTextFile("full-backup.json", "{}", "application/json", {
        dialogTitle: "导出完整备份",
      }),
    ).resolves.toEqual({
      status: "completed",
    });

    expect(save).toHaveBeenCalledWith({
      defaultPath: "full-backup.json",
      filters: [{ extensions: ["json"], name: "JSON" }],
      title: "导出完整备份",
    });
  });

  it("does not export when the Tauri save dialog is cancelled", async () => {
    setTauriRuntime(true);
    vi.mocked(save).mockResolvedValue(null);

    await expect(downloadTextFile("history.json", "{}", "application/json")).resolves.toEqual({
      status: "cancelled",
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("imports text through the Tauri open dialog", async () => {
    setTauriRuntime(true);
    vi.mocked(open).mockResolvedValue("/tmp/history.json");
    vi.mocked(invoke).mockResolvedValue('{"version":1}');

    await expect(selectAndReadTextFile()).resolves.toEqual({
      content: '{"version":1}',
      status: "completed",
    });
    expect(open).toHaveBeenCalledWith({
      filters: [{ extensions: ["json"], name: "JSON" }],
      multiple: false,
      title: "导入历史记录",
    });
    expect(invoke).toHaveBeenCalledWith("read_user_text_file", {
      path: "/tmp/history.json",
    });
  });

  it("allows a custom Tauri open dialog title", async () => {
    setTauriRuntime(true);
    vi.mocked(open).mockResolvedValue("/tmp/full-backup.json");
    vi.mocked(invoke).mockResolvedValue('{"version":1}');

    await expect(selectAndReadTextFile({ dialogTitle: "导入完整备份" })).resolves.toEqual({
      content: '{"version":1}',
      status: "completed",
    });

    expect(open).toHaveBeenCalledWith({
      filters: [{ extensions: ["json"], name: "JSON" }],
      multiple: false,
      title: "导入完整备份",
    });
  });

  it("does not import when the Tauri open dialog is cancelled", async () => {
    vi.mocked(open).mockResolvedValue(null);

    await expect(selectAndReadTextFile()).resolves.toEqual({
      status: "cancelled",
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("detects the desktop file dialog runtime", () => {
    expect(shouldUseDesktopFileDialog()).toBe(false);

    setTauriRuntime(true);

    expect(shouldUseDesktopFileDialog()).toBe(true);
  });
});
