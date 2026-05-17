import { MAX_INTENT_SETS, MAX_PREVENTION_INTENTS } from "../constants";
import type { IntentSetDraft, SetupValidationErrors } from "../types";

export const validateSituationIntent = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "请填写情境性执行意图。";
  }

  if (!trimmedValue.includes("当") || !trimmedValue.includes("就")) {
    return "情境性执行意图必须同时包含“当”和“就”。";
  }

  return "";
};

export const validatePreventionIntent = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (!trimmedValue.includes("如果") || !trimmedValue.includes("那么")) {
    return "预防性执行意图填写后必须同时包含“如果”和“那么”。";
  }

  return "";
};

export const validateIntentDrafts = (drafts: IntentSetDraft[]) => {
  const errors: SetupValidationErrors = {};

  if (drafts.length < 1 || drafts.length > MAX_INTENT_SETS) {
    errors.form = [`请创建 1-${MAX_INTENT_SETS} 套执行意图。`];
  }

  drafts.forEach((draft, draftIndex) => {
    const draftErrors: string[] = [];
    const situationError = validateSituationIntent(draft.situationIntent);

    if (situationError) {
      draftErrors.push(`第 ${draftIndex + 1} 套：${situationError}`);
    }

    if (draft.preventionIntents.length > MAX_PREVENTION_INTENTS) {
      draftErrors.push(`第 ${draftIndex + 1} 套：预防性执行意图最多 ${MAX_PREVENTION_INTENTS} 条。`);
    }

    draft.preventionIntents.forEach((preventionIntent, preventionIndex) => {
      const preventionError = validatePreventionIntent(preventionIntent);

      if (preventionError) {
        draftErrors.push(`第 ${draftIndex + 1} 套第 ${preventionIndex + 1} 条：${preventionError}`);
      }
    });

    if (draft.incenseCount < 1 || draft.incenseCount > 3) {
      draftErrors.push(`第 ${draftIndex + 1} 套：香数只能选择 1-3 炷。`);
    }

    if (draftErrors.length > 0) {
      errors[draft.id] = draftErrors;
    }
  });

  return errors;
};

export const hasValidationErrors = (errors: SetupValidationErrors) =>
  Object.values(errors).some((messages) => messages.length > 0);
