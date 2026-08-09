export type RoutineSyncFailureKind = "not-found" | "permission" | "transient" | "invalid-request" | "conflict";

export const classifyRoutineSyncFailure = (status: number): RoutineSyncFailureKind => {
  if (status === 404) return "not-found";
  if (status === 401 || status === 403) return "permission";
  if (status === 400 || status === 422) return "invalid-request";
  if (status === 409) return "conflict";
  return "transient";
};
