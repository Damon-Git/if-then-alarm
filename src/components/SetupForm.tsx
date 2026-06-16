import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MAX_INTENT_SETS } from "../constants";
import { hasUnsavedSetupDraft } from "../lib/sessionGuards";
import { hasValidationErrors, normalizeIntentText, validateIntentDrafts } from "../lib/validation";
import type { IntentSet, IntentSetDraft, SetupValidationErrors } from "../types";
import IntentSetForm from "./IntentSetForm";

type SetupFormProps = {
  onDraftStateChange?: (hasUnsavedDraft: boolean) => void;
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

const SetupForm = ({ onDraftStateChange, onSubmit }: SetupFormProps) => {
  const [drafts, setDrafts] = useState<IntentSetDraft[]>(() => [createEmptyDraft()]);
  const [errors, setErrors] = useState<SetupValidationErrors>({});

  const hasUnsavedDraft = useMemo(() => hasUnsavedSetupDraft(drafts), [drafts]);

  useEffect(() => {
    if (!hasUnsavedDraft) {
      return;
    }

    // Web-only protection. Tauri desktop close handling is coordinated by App.
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedDraft]);

  useEffect(() => {
    onDraftStateChange?.(hasUnsavedDraft);

    return () => onDraftStateChange?.(false);
  }, [hasUnsavedDraft, onDraftStateChange]);

  const updateDraft = (updatedDraft: IntentSetDraft) => {
    const nextDrafts = drafts.map((draft) => (draft.id === updatedDraft.id ? updatedDraft : draft));

    setDrafts(nextDrafts);

    if (hasValidationErrors(errors)) {
      setErrors(validateIntentDrafts(nextDrafts));
    }
  };

  const addDraft = () => {
    if (drafts.length >= MAX_INTENT_SETS) {
      return;
    }

    setDrafts((currentDrafts) => [...currentDrafts, createEmptyDraft()]);
  };

  const removeDraft = (draftId: string) => {
    if (drafts.length <= 1) {
      return;
    }

    const nextDrafts = drafts.filter((draft) => draft.id !== draftId);

    setDrafts(nextDrafts);

    if (hasValidationErrors(errors)) {
      setErrors(validateIntentDrafts(nextDrafts));
    }
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
      situationIntent: normalizeIntentText(draft.situationIntent),
      preventionIntents: draft.preventionIntents.map(normalizeIntentText).filter(Boolean),
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
          <h2 id="setup-title">积土成山，积水成渊</h2>
        </div>
        {drafts.length < MAX_INTENT_SETS ? (
          <button className="ghost-button setup-add-button" type="button" onClick={addDraft}>
            创建任务
          </button>
        ) : null}
      </div>

      <form className="setup-form" onSubmit={submitForm}>
        {errors.form ? (
          <ul className="error-list">
            {errors.form.map((error) => (
              <li key={error.message}>{error.message}</li>
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
            开始创造
          </button>
        </div>
      </form>
    </section>
  );
};

export default SetupForm;
