import { useState, type FormEvent } from "react";
import { TIMER_MODE_CONFIG } from "../constants";
import { formatDurationLabel } from "../lib/timer";
import type { IntentSet, ReviewInput, ReviewResult, TimerMode } from "../types";

type ReviewPanelProps = {
  intentSets: IntentSet[];
  timerMode: TimerMode;
  onSave: (review: ReviewInput) => void;
  onRequestAbandon: () => void;
};

const ReviewPanel = ({ intentSets, timerMode, onSave, onRequestAbandon }: ReviewPanelProps) => {
  const timerConfig = TIMER_MODE_CONFIG[timerMode];
  const totalIncenseCount = intentSets.reduce((total, intentSet) => total + intentSet.incenseCount, 0);
  const preventionIntentCount = intentSets.reduce(
    (total, intentSet) => total + intentSet.preventionIntents.length,
    0,
  );
  const [result, setResult] = useState<ReviewResult>("completed");
  const [reviewText, setReviewText] = useState("");
  const [obstacleText, setObstacleText] = useState("");
  const [nextAdjustmentText, setNextAdjustmentText] = useState("");
  const [error, setError] = useState("");

  const saveReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reviewText.trim()) {
      setError("请填写一句复盘。");
      return;
    }

    setError("");
    onSave({
      result,
      reviewText: reviewText.trim(),
      obstacleText: obstacleText.trim() || undefined,
      nextAdjustmentText: nextAdjustmentText.trim() || undefined,
    });
  };

  return (
    <section className="panel review-panel" aria-labelledby="review-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Review</p>
          <h2 id="review-title">本次复盘</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onRequestAbandon}>
          放弃本轮
        </button>
      </div>

      <div className="review-session-detail">
        <div className="review-overview" aria-label="本轮摘要">
          <div>
            <span>执行意图</span>
            <strong>{intentSets.length} 套</strong>
          </div>
          <div>
            <span>线香</span>
            <strong>{totalIncenseCount} 炷</strong>
          </div>
          <div>
            <span>预防性符箓</span>
            <strong>{preventionIntentCount} 张</strong>
          </div>
        </div>

        <div className="review-session-meta">
          <span>{timerConfig.label}</span>
          <span>专注 {formatDurationLabel(timerConfig.focusSeconds)}</span>
          <span>休息 {formatDurationLabel(timerConfig.breakSeconds)}</span>
        </div>

        <div className="review-summary">
          {intentSets.map((intentSet, index) => (
            <details className="review-intent-detail" key={intentSet.id}>
              <summary className="summary-row">
                <span>第 {index + 1} 套：{intentSet.situationIntent}</span>
                <strong>{intentSet.incenseCount} 炷</strong>
              </summary>

              <div className="review-intent-body">
                <div>
                  <span className="detail-label">情境性执行意图</span>
                  <p>{intentSet.situationIntent}</p>
                </div>
                <div>
                  <span className="detail-label">预防性执行意图</span>
                  {intentSet.preventionIntents.length > 0 ? (
                    <ul>
                      {intentSet.preventionIntents.map((preventionIntent, preventionIndex) => (
                        <li key={`${intentSet.id}-${preventionIndex}`}>{preventionIntent}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">暂无预防性符箓</p>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>

      <form className="review-form" onSubmit={saveReview}>
        <fieldset className="result-options">
          <legend>本次完成度</legend>
          <label>
            <input
              checked={result === "completed"}
              name="review-result"
              onChange={() => setResult("completed")}
              type="radio"
            />
            完成
          </label>
          <label>
            <input
              checked={result === "partial"}
              name="review-result"
              onChange={() => setResult("partial")}
              type="radio"
            />
            部分完成
          </label>
          <label>
            <input
              checked={result === "failed"}
              name="review-result"
              onChange={() => setResult("failed")}
              type="radio"
            />
            未完成
          </label>
        </fieldset>

        <label className="field review-main-field">
          <span>一句复盘</span>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="写下这轮行动里最值得记住的一句话。"
            rows={3}
          />
        </label>

        <details className="review-optional-fields">
          <summary>补充记录</summary>

          <label className="field">
            <span>主要阻碍</span>
            <textarea
              value={obstacleText}
              onChange={(event) => setObstacleText(event.target.value)}
              placeholder="例如：启动太晚、被消息打断、任务定义不清。"
              rows={2}
            />
          </label>

          <label className="field">
            <span>下次调整</span>
            <textarea
              value={nextAdjustmentText}
              onChange={(event) => setNextAdjustmentText(event.target.value)}
              placeholder="例如：开始前先关通知，把第一步缩小到 5 分钟内。"
              rows={2}
            />
          </label>
        </details>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="form-actions">
          <button className="primary-button" type="submit">
            保存复盘
          </button>
        </div>
      </form>
    </section>
  );
};

export default ReviewPanel;
