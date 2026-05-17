import { MAX_INTENT_SETS, MAX_PREVENTION_INTENTS } from "../constants";
import type { IntentSetDraft, SetupValidationError, SetupValidationErrors } from "../types";

export const normalizeIntentText = (value: string) => value.replace(/\s+/g, " ").trim();

export const validateSituationIntent = (value: string) => {
  const normalizedValue = normalizeIntentText(value);

  if (!normalizedValue) {
    return "请填写“当……就……”的情境性执行意图。";
  }

  if (!normalizedValue.includes("当") || !normalizedValue.includes("就")) {
    return "需要同时包含“当”和“就”。";
  }

  const situationMarkerIndex = normalizedValue.indexOf("当");
  const actionMarkerIndex = normalizedValue.indexOf("就", situationMarkerIndex + 1);

  if (actionMarkerIndex === -1) {
    return "“当”需要写在“就”之前。";
  }

  const situationText = normalizedValue.slice(situationMarkerIndex + 1, actionMarkerIndex).trim();
  const actionText = normalizedValue.slice(actionMarkerIndex + 1).trim();

  if (!situationText) {
    return "请在“当”和“就”之间写清楚触发情境。";
  }

  if (!actionText) {
    return "请在“就”之后写清楚第一步行动。";
  }

  return "";
};

export const validatePreventionIntent = (value: string) => {
  const normalizedValue = normalizeIntentText(value);

  if (!normalizedValue) {
    return "";
  }

  if (!normalizedValue.includes("如果") || !normalizedValue.includes("那么")) {
    return "填写后需要同时包含“如果”和“那么”。";
  }

  const riskMarkerIndex = normalizedValue.indexOf("如果");
  const responseMarkerIndex = normalizedValue.indexOf("那么", riskMarkerIndex + 2);

  if (responseMarkerIndex === -1) {
    return "“如果”需要写在“那么”之前。";
  }

  const riskText = normalizedValue.slice(riskMarkerIndex + 2, responseMarkerIndex).trim();
  const responseText = normalizedValue.slice(responseMarkerIndex + 2).trim();

  if (!riskText) {
    return "请在“如果”和“那么”之间写清楚可能出现的阻碍。";
  }

  if (!responseText) {
    return "请在“那么”之后写清楚替代动作。";
  }

  return "";
};

export const validateIntentDrafts = (drafts: IntentSetDraft[]) => {
  const errors: SetupValidationErrors = {};

  if (drafts.length < 1 || drafts.length > MAX_INTENT_SETS) {
    errors.form = [{ message: `请创建 1-${MAX_INTENT_SETS} 套执行意图。` }];
  }

  drafts.forEach((draft, draftIndex) => {
    const draftErrors: SetupValidationError[] = [];
    const situationError = validateSituationIntent(draft.situationIntent);

    if (situationError) {
      draftErrors.push({
        field: "situationIntent",
        message: `第 ${draftIndex + 1} 套情境性执行意图：${situationError}`,
      });
    }

    if (draft.preventionIntents.length > MAX_PREVENTION_INTENTS) {
      draftErrors.push({
        field: "preventionIntent",
        message: `第 ${draftIndex + 1} 套预防性执行意图最多 ${MAX_PREVENTION_INTENTS} 条。`,
      });
    }

    draft.preventionIntents.forEach((preventionIntent, preventionIndex) => {
      const preventionError = validatePreventionIntent(preventionIntent);

      if (preventionError) {
        draftErrors.push({
          field: "preventionIntent",
          message: `第 ${draftIndex + 1} 套第 ${preventionIndex + 1} 条预防性执行意图：${preventionError}`,
          preventionIndex,
        });
      }
    });

    if (draft.incenseCount < 1 || draft.incenseCount > 3) {
      draftErrors.push({
        field: "incenseCount",
        message: `第 ${draftIndex + 1} 套香数只能选择 1-3 炷。`,
      });
    }

    if (draftErrors.length > 0) {
      errors[draft.id] = draftErrors;
    }
  });

  return errors;
};

export const hasValidationErrors = (errors: SetupValidationErrors) =>
  Object.values(errors).some((messages) => messages.length > 0);
