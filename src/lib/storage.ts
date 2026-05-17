import type { HistoryExportPayload, HistoryImportResult, HistoryRecord, ReviewResult } from "../types";

const HISTORY_STORAGE_KEY = "jiji-rululing.history";

const isReviewResult = (value: unknown): value is ReviewResult =>
  value === "completed" || value === "partial" || value === "failed";

const isHistoryRecord = (value: unknown): value is HistoryRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<HistoryRecord>;

  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    Array.isArray(record.intentSets) &&
    record.intentSets.every(
      (intentSet) =>
        intentSet &&
        typeof intentSet === "object" &&
        typeof intentSet.situationIntent === "string" &&
        Array.isArray(intentSet.preventionIntents) &&
        intentSet.preventionIntents.every((preventionIntent) => typeof preventionIntent === "string") &&
        typeof intentSet.incenseCount === "number",
    ) &&
    isReviewResult(record.result) &&
    typeof record.reviewText === "string" &&
    (record.obstacleText === undefined || typeof record.obstacleText === "string") &&
    (record.nextAdjustmentText === undefined || typeof record.nextAdjustmentText === "string")
  );
};

const parseHistoryExportPayload = (value: unknown): HistoryExportPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<HistoryExportPayload>;

  if (payload.version !== 1 || typeof payload.exportedAt !== "string" || !Array.isArray(payload.records)) {
    return null;
  }

  if (!payload.records.every(isHistoryRecord)) {
    return null;
  }

  return payload as HistoryExportPayload;
};

export const loadHistoryRecords = (): HistoryRecord[] => {
  try {
    const rawValue = window.localStorage.getItem(HISTORY_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue as HistoryRecord[];
  } catch {
    return [];
  }
};

export const saveHistoryRecord = (record: HistoryRecord) => {
  const records = loadHistoryRecords();
  const nextRecords = [record, ...records];
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
};

export const deleteHistoryRecord = (recordId: string) => {
  const nextRecords = loadHistoryRecords().filter((record) => record.id !== recordId);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
};

export const clearHistoryRecords = () => {
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  return [];
};

export const createHistoryExportPayload = (records: HistoryRecord[]): HistoryExportPayload => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  records,
});

export const importHistoryExportPayload = (rawValue: string): HistoryImportResult => {
  const parsedValue = JSON.parse(rawValue);
  const payload = parseHistoryExportPayload(parsedValue);

  if (!payload) {
    throw new Error("INVALID_HISTORY_EXPORT");
  }

  const existingRecords = loadHistoryRecords();
  const knownIds = new Set(existingRecords.map((record) => record.id));
  const importedRecords: HistoryRecord[] = [];

  payload.records.forEach((record) => {
    if (knownIds.has(record.id)) {
      return;
    }

    knownIds.add(record.id);
    importedRecords.push(record);
  });
  const nextRecords = [...importedRecords, ...existingRecords].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );

  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextRecords));

  return {
    importedCount: importedRecords.length,
    records: nextRecords,
    skippedCount: payload.records.length - importedRecords.length,
  };
};
