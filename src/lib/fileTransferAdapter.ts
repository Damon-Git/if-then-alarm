import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

export type FileTransferResult =
  | {
      status: "completed";
    }
  | {
      status: "cancelled";
    };

const isTauriRuntime = () => typeof window !== "undefined" && Boolean((window as TauriWindow).__TAURI_INTERNALS__);

const jsonDialogFilters = [
  {
    extensions: ["json"],
    name: "JSON",
  },
];

export const downloadTextFile = async (
  filename: string,
  content: string,
  mimeType = "text/plain",
): Promise<FileTransferResult> => {
  if (isTauriRuntime()) {
    const selectedPath = await save({
      defaultPath: filename,
      filters: jsonDialogFilters,
      title: "导出历史记录",
    });

    if (!selectedPath) {
      return { status: "cancelled" };
    }

    await invoke<void>("write_user_text_file", {
      contents: content,
      path: selectedPath,
    });

    return { status: "completed" };
  }

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { status: "completed" };
};

export const readTextFile = (file: File) => file.text();

export const selectAndReadTextFile = async (): Promise<
  | {
      content: string;
      status: "completed";
    }
  | {
      status: "cancelled";
    }
> => {
  const selectedPath = await open({
    filters: jsonDialogFilters,
    multiple: false,
    title: "导入历史记录",
  });

  if (!selectedPath || Array.isArray(selectedPath)) {
    return { status: "cancelled" };
  }

  return {
    content: await invoke<string>("read_user_text_file", {
      path: selectedPath,
    }),
    status: "completed",
  };
};

export const shouldUseDesktopFileDialog = isTauriRuntime;
