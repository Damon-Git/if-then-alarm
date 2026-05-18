import { beforeEach, describe, expect, it } from "vitest";
import {
  clearHistoryRecords,
  createHistoryExportPayload,
  importHistoryExportPayload,
  loadHistoryRecords,
  saveHistoryRecord,
} from "./storage";
import type { HistoryRecord } from "../types";

const createRecord = (id: string, createdAt: string): HistoryRecord => ({
  createdAt,
  id,
  intentSets: [
    {
      incenseCount: 1,
      preventionIntents: [],
      situationIntent: "当我坐下，就开始写作。",
    },
  ],
  result: "completed",
  reviewText: "完成了一轮。",
  timerMode: "dev",
});

describe("history storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and clears history records", () => {
    const record = createRecord("record-1", "2026-05-19T10:00:00.000Z");

    expect(saveHistoryRecord(record)).toEqual([record]);
    expect(loadHistoryRecords()).toEqual([record]);
    expect(clearHistoryRecords()).toEqual([]);
    expect(loadHistoryRecords()).toEqual([]);
  });

  it("creates export payloads", () => {
    const records = [createRecord("record-1", "2026-05-19T10:00:00.000Z")];
    const payload = createHistoryExportPayload(records);

    expect(payload.version).toBe(1);
    expect(payload.records).toEqual(records);
    expect(typeof payload.exportedAt).toBe("string");
  });

  it("imports valid payloads and skips duplicates", () => {
    const existingRecord = createRecord("record-1", "2026-05-19T10:00:00.000Z");
    const importedRecord = createRecord("record-2", "2026-05-19T11:00:00.000Z");
    saveHistoryRecord(existingRecord);

    const result = importHistoryExportPayload(
      JSON.stringify({
        exportedAt: "2026-05-19T12:00:00.000Z",
        records: [existingRecord, importedRecord],
        version: 1,
      }),
    );

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.records.map((record) => record.id)).toEqual(["record-2", "record-1"]);
  });

  it("throws on invalid JSON or invalid payloads", () => {
    expect(() => importHistoryExportPayload("{")).toThrow();
    expect(() => importHistoryExportPayload(JSON.stringify({ version: 1, records: [] }))).toThrow(
      "INVALID_HISTORY_EXPORT",
    );
  });
});
