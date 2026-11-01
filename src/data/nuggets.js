import catalog from "./nuggets.json";

export const nuggets = catalog;

export function nuggetById(id) {
  return nuggets.find((entry) => entry.id === id) ?? null;
}

export function nuggetsForParent(parentPromptId) {
  return nuggets.filter((entry) => entry.parentPromptId === parentPromptId);
}

export function nuggetCountFor(parentPromptId) {
  return nuggetsForParent(parentPromptId).length;
}
