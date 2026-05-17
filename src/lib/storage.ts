import type { HistoryRecord } from "../types";

const HISTORY_STORAGE_KEY = "jiji-rululing.history";

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
