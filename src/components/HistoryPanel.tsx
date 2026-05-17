import type { HistoryRecord } from "../types";

type HistoryPanelProps = {
  records: HistoryRecord[];
};

const resultLabels: Record<HistoryRecord["result"], string> = {
  completed: "完成",
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

const HistoryPanel = ({ records }: HistoryPanelProps) => {
  return (
    <section className="panel history-panel" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">History</p>
          <h2 id="history-title">历史记录</h2>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="muted-text">暂无历史记录</p>
      ) : (
        <div className="history-list">
          {records.map((record) => (
            <article className="history-record" key={record.id}>
              <div className="history-record__header">
                <span>{formatDateTime(record.createdAt)}</span>
                <strong>{resultLabels[record.result]}</strong>
              </div>
              <p>{record.reviewText}</p>
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
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default HistoryPanel;
