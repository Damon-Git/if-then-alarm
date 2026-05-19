import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadTextFile, readTextFile } from "./fileTransferAdapter";

describe("file transfer adapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads text from a file", async () => {
    const file = new File(["hello"], "fixture.txt", { type: "text/plain" });

    await expect(readTextFile(file)).resolves.toBe("hello");
  });

  it("downloads text files through a temporary link", () => {
    const click = vi.fn();
    const remove = vi.fn();
    const link = document.createElement("a");
    Object.defineProperty(link, "click", { value: click });
    Object.defineProperty(link, "remove", { value: remove });

    const appendSpy = vi.spyOn(document.body, "append");
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(link);
    const createObjectUrlSpy = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:test-url");
    const revokeObjectUrlSpy = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => undefined);

    downloadTextFile("history.json", "{}", "application/json");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(createObjectUrlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(link.href).toBe("blob:test-url");
    expect(link.download).toBe("history.json");
    expect(appendSpy).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:test-url");
  });
});
