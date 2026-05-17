import { useState, type FormEvent } from "react";
import type { IntentSet, ReviewResult } from "../types";

type ReviewPanelProps = {
  intentSets: IntentSet[];
  onSave: (result: ReviewResult, reviewText: string) => void;
  onRequestAbandon: () => void;
};

const ReviewPanel = ({ intentSets, onSave, onRequestAbandon }: ReviewPanelProps) => {
  const [result, setResult] = useState<ReviewResult>("completed");
  const [reviewText, setReviewText] = useState("");
  const [error, setError] = useState("");

  const saveReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reviewText.trim()) {
      setError("请填写一句复盘。");
      return;
    }

    setError("");
    onSave(result, reviewText.trim());
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

      <div className="review-summary">
        {intentSets.map((intentSet) => (
          <div className="summary-row" key={intentSet.id}>
            <span>{intentSet.situationIntent}</span>
            <strong>{intentSet.incenseCount} 炷</strong>
          </div>
        ))}
      </div>

      <form className="review-form" onSubmit={saveReview}>
        <fieldset className="result-options">
          <legend>本次是否完成</legend>
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
              checked={result === "failed"}
              name="review-result"
              onChange={() => setResult("failed")}
              type="radio"
            />
            未完成
          </label>
        </fieldset>

        <label className="field">
          <span>一句复盘</span>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="写下这轮行动里最值得记住的一句话。"
            rows={3}
          />
        </label>

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
