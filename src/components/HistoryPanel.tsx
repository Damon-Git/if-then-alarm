import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { FOCUS_MINUTES_PER_INCENSE } from "../constants";
import type { HistoryRecord, ReviewResult, TimerMode } from "../types";
import HistoryAnalysisPanel from "./HistoryAnalysisPanel";

type HistoryPanelProps = {
  records: HistoryRecord[];
  onClearRecords: () => void;
  onDeleteRecord: (recordId: string) => void;
  onExportRecords: () => void;
  onImportRecords: (file?: File) => void;
  useNativeFileDialog: boolean;
};

type ResultFilter = "all" | ReviewResult;
type RangeFilter = "all" | "last7" | "last30";

const resultLabels: Record<HistoryRecord["result"], string> = {
  completed: "完成",
  partial: "部分完成",
  failed: "未完成",
};

const resultFilterOptions: {
  label: string;
  value: ResultFilter;
}[] = [
  { label: "全部", value: "all" },
  { label: "完成", value: "completed" },
  { label: "部分完成", value: "partial" },
  { label: "未完成", value: "failed" },
];

const rangeFilterOptions: {
  label: string;
  value: RangeFilter;
}[] = [
  { label: "全部时间", value: "all" },
  { label: "近 7 天", value: "last7" },
  { label: "近 30 天", value: "last30" },
];

const timerModeLabels: Record<TimerMode, string> = {
  dev: "开发模式",
  prod: "正式模式",
};

const getResultClassName = (result: ReviewResult) => `result-badge result-badge--${result}`;

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getHistorySummary = (record: HistoryRecord) => {
  const intentSetCount = record.intentSets.length;
  const totalIncenseCount = record.intentSets.reduce((total, intentSet) => total + intentSet.incenseCount, 0);
  const totalFocusMinutes = totalIncenseCount * FOCUS_MINUTES_PER_INCENSE;
  const preventionIntentCount = record.intentSets.reduce(
    (total, intentSet) => total + intentSet.preventionIntents.length,
    0,
  );

  return {
    intentSetCount,
    preventionIntentCount,
    totalFocusMinutes,
    totalIncenseCount,
  };
};

const getRecordSearchText = (record: HistoryRecord) =>
  [
    record.reviewText,
    record.obstacleText,
    record.nextAdjustmentText,
    record.result,
    record.timerMode,
    ...record.intentSets.flatMap((intentSet) => [
      intentSet.situationIntent,
      ...intentSet.preventionIntents,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const isRecordInRange = (record: HistoryRecord, rangeFilter: RangeFilter) => {
  if (rangeFilter === "all") {
    return true;
  }

  const createdAtTime = new Date(record.createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return false;
  }

  const rangeDays = rangeFilter === "last7" ? 7 : 30;
  const cutoffTime = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  return createdAtTime >= cutoffTime;
};

const HistoryPanel = ({
  records,
  onClearRecords,
  onDeleteRecord,
  onExportRecords,
  onImportRecords,
  useNativeFileDialog,
}: HistoryPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesResult = resultFilter === "all" || record.result === resultFilter;
      const matchesRange = isRecordInRange(record, rangeFilter);
      const matchesQuery = !normalizedQuery || getRecordSearchText(record).includes(normalizedQuery);

      return matchesResult && matchesRange && matchesQuery;
    });
  }, [query, rangeFilter, records, resultFilter]);

  const selectImportFile = () => {
    if (useNativeFileDialog) {
      onImportRecords();
      return;
    }

    fileInputRef.current?.click();
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      onImportRecords(file);
    }

    event.target.value = "";
  };

  return (
    <section className="panel history-panel" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">History</p>
          <h2 id="history-title">历史记录</h2>
        </div>
        <div className="history-actions">
          <button className="ghost-button" type="button" onClick={selectImportFile}>
            导入历史
          </button>
          {useNativeFileDialog ? null : (
            <input
              accept="application/json,.json"
              className="hidden-file-input"
              onChange={importFile}
              ref={fileInputRef}
              type="file"
            />
          )}
          {records.length > 0 ? (
            <>
              <button className="ghost-button" type="button" onClick={onExportRecords}>
                导出历史
              </button>
              <button className="ghost-button" type="button" onClick={onClearRecords}>
                清空历史
              </button>
            </>
          ) : null}
        </div>
      </div>

      {records.length === 0 ? (
        <p className="muted-text">暂无历史记录。完成一次复盘后，这里会显示本轮行动承诺、总香数和复盘结论。</p>
      ) : (
        <>
          <div className="history-filter-bar" aria-label="历史筛选">
            <label className="history-search">
              <span>搜索</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索执行意图、阻碍、复盘"
                type="search"
              />
            </label>

            <label className="history-filter">
              <span>完成度</span>
              <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value as ResultFilter)}>
                {resultFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="history-filter">
              <span>时间范围</span>
              <select value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}>
                {rangeFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredRecords.length === 0 ? (
            <p className="muted-text">没有匹配当前筛选条件的历史记录。</p>
          ) : (
            <>
              <HistoryAnalysisPanel records={filteredRecords} />

              <div className="history-list">
                {filteredRecords.map((record) => {
                  const summary = getHistorySummary(record);

                  return (
                    <article className="history-record" key={record.id}>
                      <div className="history-record__header">
                        <details className="history-record__details">
                          <summary className="history-summary">
                            <span className="history-summary__main">
                              <span className="history-summary__date">{formatDateTime(record.createdAt)}</span>
                              <strong className={getResultClassName(record.result)}>{resultLabels[record.result]}</strong>
                            </span>
                            <span className="history-summary__metrics">
                              <span>{summary.intentSetCount} 项任务</span>
                              <span>{summary.totalIncenseCount} 炷香</span>
                              <span>约 {summary.totalFocusMinutes} 分钟</span>
                            </span>
                            <span className="history-summary__review">“{record.reviewText}”</span>
                          </summary>

                          <div className="history-metrics" aria-label="历史记录摘要">
                            {record.timerMode ? <span>{timerModeLabels[record.timerMode]}</span> : null}
                            <span>目标性符箓 {summary.intentSetCount} 张</span>
                            <span>预防性符箓 {summary.preventionIntentCount} 张</span>
                          </div>

                          {record.obstacleText || record.nextAdjustmentText ? (
                            <div className="history-reflection">
                              {record.obstacleText ? (
                                <p>
                                  <span>阻碍</span>
                                  {record.obstacleText}
                                </p>
                              ) : null}
                              {record.nextAdjustmentText ? (
                                <p>
                                  <span>下次</span>
                                  {record.nextAdjustmentText}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="history-record__intents">
                            {record.intentSets.map((intentSet, index) => (
                              <div className="history-intent" key={`${record.id}-${index}`}>
                                <span>第 {index + 1} 项 · {intentSet.incenseCount} 炷</span>
                                <strong>{intentSet.situationIntent}</strong>
                                {intentSet.preventionIntents.length > 0 ? (
                                  <ul>
                                    {intentSet.preventionIntents.map((preventionIntent, preventionIndex) => (
                                      <li key={`${record.id}-${index}-${preventionIndex}`}>{preventionIntent}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="muted-text">暂无预防性符箓</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>

                        <button className="icon-text-button" type="button" onClick={() => onDeleteRecord(record.id)}>
                          删除
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
};

export default HistoryPanel;
