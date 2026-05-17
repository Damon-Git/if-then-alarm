import { useState, type FormEvent } from "react";
import { MAX_INTENT_SETS } from "../constants";
import { hasValidationErrors, validateIntentDrafts } from "../lib/validation";
import type { IntentSet, IntentSetDraft, SetupValidationErrors } from "../types";
import IntentSetForm from "./IntentSetForm";

type SetupFormProps = {
  onSubmit: (intentSets: IntentSet[]) => void;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyDraft = (): IntentSetDraft => ({
  id: createId(),
  situationIntent: "",
  preventionIntents: [],
  incenseCount: 1,
});

const SetupForm = ({ onSubmit }: SetupFormProps) => {
  const [drafts, setDrafts] = useState<IntentSetDraft[]>(() => [createEmptyDraft()]);
  const [errors, setErrors] = useState<SetupValidationErrors>({});

  const updateDraft = (updatedDraft: IntentSetDraft) => {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft)),
    );
  };

  const addDraft = () => {
    if (drafts.length >= MAX_INTENT_SETS) {
      return;
    }

    setDrafts((currentDrafts) => [...currentDrafts, createEmptyDraft()]);
  };

  const removeDraft = (draftId: string) => {
    setDrafts((currentDrafts) => {
      if (currentDrafts.length <= 1) {
        return currentDrafts;
      }

      return currentDrafts.filter((draft) => draft.id !== draftId);
    });
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateIntentDrafts(drafts);
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    const intentSets: IntentSet[] = drafts.map((draft) => ({
      id: draft.id,
      situationIntent: draft.situationIntent.trim(),
      preventionIntents: draft.preventionIntents.map((intent) => intent.trim()).filter(Boolean),
      incenseCount: draft.incenseCount,
      currentIncenseIndex: 1,
      status: "idle",
    }));

    onSubmit(intentSets);
  };

  return (
    <section className="panel setup-panel" aria-labelledby="setup-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Setup</p>
          <h2 id="setup-title">填写执行意图</h2>
        </div>
        {drafts.length < MAX_INTENT_SETS ? (
          <button className="secondary-button" type="button" onClick={addDraft}>
            添加套组
          </button>
        ) : null}
      </div>

      <form className="setup-form" onSubmit={submitForm}>
        {errors.form ? (
          <ul className="error-list">
            {errors.form.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        {drafts.map((draft, index) => (
          <IntentSetForm
            canRemove={drafts.length > 1}
            draft={draft}
            errors={errors[draft.id] ?? []}
            index={index}
            key={draft.id}
            onChange={updateDraft}
            onRemove={() => removeDraft(draft.id)}
          />
        ))}

        <div className="form-actions">
          <button className="primary-button" type="submit">
            进入仪式台
          </button>
        </div>
      </form>
    </section>
  );
};

export default SetupForm;
