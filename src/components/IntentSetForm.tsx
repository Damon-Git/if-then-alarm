import { MAX_PREVENTION_INTENTS } from "../constants";
import type { IntentSetDraft } from "../types";

type IntentSetFormProps = {
  draft: IntentSetDraft;
  index: number;
  canRemove: boolean;
  errors: string[];
  onChange: (draft: IntentSetDraft) => void;
  onRemove: () => void;
};

const incenseOptions = [1, 2, 3];

const IntentSetForm = ({
  draft,
  index,
  canRemove,
  errors,
  onChange,
  onRemove,
}: IntentSetFormProps) => {
  const updateDraft = (changes: Partial<IntentSetDraft>) => {
    onChange({
      ...draft,
      ...changes,
    });
  };

  const updatePreventionIntent = (preventionIndex: number, value: string) => {
    updateDraft({
      preventionIntents: draft.preventionIntents.map((preventionIntent, currentIndex) =>
        currentIndex === preventionIndex ? value : preventionIntent,
      ),
    });
  };

  const addPreventionIntent = () => {
    if (draft.preventionIntents.length >= MAX_PREVENTION_INTENTS) {
      return;
    }

    updateDraft({
      preventionIntents: [...draft.preventionIntents, ""],
    });
  };

  const removePreventionIntent = (preventionIndex: number) => {
    updateDraft({
      preventionIntents: draft.preventionIntents.filter((_, currentIndex) => currentIndex !== preventionIndex),
    });
  };

  return (
    <fieldset className="intent-form">
      <div className="intent-form__header">
        <legend>第 {index + 1} 套执行意图</legend>
        {canRemove ? (
          <button className="ghost-button" type="button" onClick={onRemove}>
            删除
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>情境性执行意图</span>
        <textarea
          value={draft.situationIntent}
          onChange={(event) => updateDraft({ situationIntent: event.target.value })}
          placeholder="当我打开电脑坐到书桌前，就开始写今天的第一段文稿。"
          rows={3}
        />
      </label>

      <div className="field-group">
        <div className="field-group__header">
          <span>预防性执行意图</span>
          {draft.preventionIntents.length < MAX_PREVENTION_INTENTS ? (
            <button className="ghost-button" type="button" onClick={addPreventionIntent}>
              添加
            </button>
          ) : null}
        </div>

        {draft.preventionIntents.length === 0 ? <p className="muted-text">暂无预防性执行意图</p> : null}

        {draft.preventionIntents.map((preventionIntent, preventionIndex) => (
          <div className="prevention-row" key={`${draft.id}-prevention-${preventionIndex}`}>
            <label className="field field--inline">
              <span>第 {preventionIndex + 1} 条</span>
              <textarea
                value={preventionIntent}
                onChange={(event) => updatePreventionIntent(preventionIndex, event.target.value)}
                placeholder="如果我想刷短视频，那么我就先闭眼休息 5 分钟。"
                rows={2}
              />
            </label>
            <button
              className="icon-text-button"
              type="button"
              onClick={() => removePreventionIntent(preventionIndex)}
            >
              移除
            </button>
          </div>
        ))}
      </div>

      <div className="field">
        <span>香数</span>
        <div className="segmented-control" aria-label={`第 ${index + 1} 套香数`}>
          {incenseOptions.map((option) => (
            <button
              className={draft.incenseCount === option ? "is-selected" : ""}
              key={option}
              type="button"
              onClick={() => updateDraft({ incenseCount: option })}
            >
              {option} 炷
            </button>
          ))}
        </div>
      </div>

      {errors.length > 0 ? (
        <ul className="error-list">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
};

export default IntentSetForm;
