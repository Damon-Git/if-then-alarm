import { FOCUS_MINUTES_PER_INCENSE } from "../constants";
import type { HistoryRecord, ReviewResult } from "../types";

type HistoryAnalysisPanelProps = {
  records: HistoryRecord[];
};

const resultLabels: Record<ReviewResult, string> = {
  completed: "完成",
  partial: "部分完成",
  failed: "未完成",
};

const splitObstacleText = (value: string) =>
  value
    .split(/[，,、；;。\.\s\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const getHistoryAnalysis = (records: HistoryRecord[]) => {
  const resultCounts: Record<ReviewResult, number> = {
    completed: 0,
    partial: 0,
    failed: 0,
  };
  const obstacleCounts = new Map<string, number>();

  const totalIncenseCount = records.reduce((total, record) => {
    resultCounts[record.result] += 1;

    if (record.obstacleText) {
      splitObstacleText(record.obstacleText).forEach((keyword) => {
        obstacleCounts.set(keyword, (obstacleCounts.get(keyword) ?? 0) + 1);
      });
    }

    return total + record.intentSets.reduce((recordTotal, intentSet) => recordTotal + intentSet.incenseCount, 0);
  }, 0);

  const topObstacles = [...obstacleCounts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "zh-CN"))
    .slice(0, 5);
  const recentAdjustments = records
    .filter((record) => Boolean(record.nextAdjustmentText?.trim()))
    .slice(0, 3)
    .map((record) => record.nextAdjustmentText?.trim() ?? "");

  return {
    averageIncenseCount: records.length > 0 ? totalIncenseCount / records.length : 0,
    recentAdjustments,
    resultCounts,
    topObstacles,
    totalFocusMinutes: totalIncenseCount * FOCUS_MINUTES_PER_INCENSE,
    totalIncenseCount,
    totalRecords: records.length,
  };
};

const HistoryAnalysisPanel = ({ records }: HistoryAnalysisPanelProps) => {
  const analysis = getHistoryAnalysis(records);

  if (records.length === 0) {
    return null;
  }

  return (
    <section className="history-analysis" aria-labelledby="history-analysis-title">
      <div className="history-analysis__header">
        <div>
          <p className="eyebrow">Analysis</p>
          <h3 id="history-analysis-title">历史分析</h3>
        </div>
      </div>

      <div className="analysis-stat-grid">
        <div className="analysis-stat">
          <span>总轮次</span>
          <strong>{analysis.totalRecords}</strong>
        </div>
        <div className="analysis-stat">
          <span>总香数</span>
          <strong>{analysis.totalIncenseCount}</strong>
        </div>
        <div className="analysis-stat">
          <span>累计专注</span>
          <strong>{analysis.totalFocusMinutes} 分钟</strong>
        </div>
        <div className="analysis-stat">
          <span>平均香数</span>
          <strong>{analysis.averageIncenseCount.toFixed(1)}</strong>
        </div>
      </div>

      <div className="analysis-columns">
        <div className="analysis-block">
          <h4>完成度</h4>
          <div className="analysis-tags">
            {Object.entries(analysis.resultCounts).map(([result, count]) => (
              <span key={result}>
                {resultLabels[result as ReviewResult]} {count}
              </span>
            ))}
          </div>
        </div>

        <div className="analysis-block">
          <h4>主要阻碍 Top 5</h4>
          {analysis.topObstacles.length > 0 ? (
            <ol className="analysis-list">
              {analysis.topObstacles.map(([keyword, count]) => (
                <li key={keyword}>
                  <span>{keyword}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted-text">暂无阻碍记录</p>
          )}
        </div>

        <div className="analysis-block">
          <h4>最近下次调整</h4>
          {analysis.recentAdjustments.length > 0 ? (
            <ol className="analysis-list">
              {analysis.recentAdjustments.map((adjustment, index) => (
                <li key={`${adjustment}-${index}`}>
                  <span>{adjustment}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted-text">暂无下次调整</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default HistoryAnalysisPanel;
