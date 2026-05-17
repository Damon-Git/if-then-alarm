import { useRef, type ChangeEvent } from "react";
import { FOCUS_MINUTES_PER_INCENSE } from "../constants";
import type { HistoryRecord } from "../types";
import HistoryAnalysisPanel from "./HistoryAnalysisPanel";

type HistoryPanelProps = {
  importStatus: {
    type: "success" | "error";
    message: string;
  } | null;
  records: HistoryRecord[];
  onClearRecords: () => void;
  onDeleteRecord: (recordId: string) => void;
  onExportRecords: () => void;
  onImportRecords: (file: File) => void;
};

const resultLabels: Record<HistoryRecord["result"], string> = {
  completed: "完成",
  partial: "部分完成",
  failed: "未完成",
};

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

const HistoryPanel = ({
  importStatus,
  records,
  onClearRecords,
  onDeleteRecord,
  onExportRecords,
  onImportRecords,
}: HistoryPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectImportFile = () => {
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
          <input
            accept="application/json,.json"
            className="hidden-file-input"
            onChange={importFile}
            ref={fileInputRef}
            type="file"
          />
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

      {importStatus ? (
        <p className={`history-notice history-notice--${importStatus.type}`}>{importStatus.message}</p>
      ) : null}

      {records.length === 0 ? (
        <p className="muted-text">暂无历史记录。完成一次复盘后，这里会显示本轮行动承诺、总香数和复盘结论。</p>
      ) : (
        <>
          <HistoryAnalysisPanel records={records} />

          <div className="history-list">
            {records.map((record) => {
              const summary = getHistorySummary(record);

              return (
                <article className="history-record" key={record.id}>
                  <div className="history-record__header">
                    <details className="history-record__details">
                      <summary className="history-summary">
                        <span className="history-summary__date">{formatDateTime(record.createdAt)}</span>
                        <strong>{resultLabels[record.result]}</strong>
                        <span>{summary.intentSetCount} 套</span>
                        <span>{summary.totalIncenseCount} 炷香</span>
                        <span>约 {summary.totalFocusMinutes} 分钟</span>
                        <span className="history-summary__review">复盘：{record.reviewText}</span>
                        {record.obstacleText ? (
                          <span className="history-summary__review">阻碍：{record.obstacleText}</span>
                        ) : null}
                        {record.nextAdjustmentText ? (
                          <span className="history-summary__review">下次：{record.nextAdjustmentText}</span>
                        ) : null}
                      </summary>

                      <div className="history-metrics" aria-label="历史记录摘要">
                        <span>情境性符箓 {summary.intentSetCount} 张</span>
                        <span>预防性符箓 {summary.preventionIntentCount} 张</span>
                      </div>

                      <div className="history-record__intents">
                        {record.intentSets.map((intentSet, index) => (
                          <div className="history-intent" key={`${record.id}-${index}`}>
                            <span>第 {index + 1} 套 · {intentSet.incenseCount} 炷</span>
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
    </section>
  );
};

export default HistoryPanel;
