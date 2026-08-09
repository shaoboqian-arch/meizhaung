import { normalizeRoutineSnapshot, snapshotSignature, type RoutineSnapshot } from "./routineMerge";
import { classifyRoutineSyncFailure, type RoutineSyncFailureKind } from "./routineSyncFailure";
export { mergeRoutineSnapshots, snapshotSignature, type RoutineSnapshot } from "./routineMerge";
export { classifyRoutineSyncFailure, type RoutineSyncFailureKind } from "./routineSyncFailure";

const syncApiBase = (import.meta.env?.VITE_ROUTINE_SYNC_API || "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync").replace(/\/$/, "");

export interface RoutineCombination {
  code: string;
  name: string;
  version: number;
  updatedAt: string;
  snapshot: RoutineSnapshot;
  access: RoutineAccess;
}

export interface RoutineAccess {
  canEdit: boolean;
  mode: "editor" | "viewer" | "legacy-read-only" | "expired" | "revoked";
  editCredentialExpiresAt?: string;
  revokedAt?: string;
}

export interface CreatedRoutineCombination {
  combination: RoutineCombination;
  editCredential: string;
}

export interface RecentRoutineCombination {
  code: string;
  name: string;
}

export class RoutineSyncError extends Error {
  status: number;
  combination?: RoutineCombination;
  kind: RoutineSyncFailureKind;

  constructor(
    message: string,
    status: number,
    combination?: RoutineCombination,
    kind = classifyRoutineSyncFailure(status)
  ) {
    super(message);
    this.name = "RoutineSyncError";
    this.status = status;
    this.combination = combination;
    this.kind = kind;
  }
}

const readOnlyAccess: RoutineAccess = { canEdit: false, mode: "legacy-read-only" };

const normalizeCombination = (value: RoutineCombination): RoutineCombination => ({
  ...value,
  snapshot: normalizeRoutineSnapshot(value.snapshot),
  access: value.access?.canEdit === true
    ? { ...value.access, mode: "editor" }
    : value.access?.mode
      ? value.access
      : readOnlyAccess
});

const request = async <T>(path: string, init?: RequestInit, editCredential?: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (editCredential) headers.set("X-Routine-Edit-Credential", editCredential);
    const response = await fetch(`${syncApiBase}${path}`, {
      ...init,
      signal: controller.signal,
      headers
    });
    const body = await response.json().catch(() => ({})) as {
      error?: string;
      combination?: RoutineCombination;
    };
    if (!response.ok) {
      throw new RoutineSyncError(
        body.error || "同步服务暂时不可用。",
        response.status,
        body.combination ? normalizeCombination(body.combination) : undefined
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof RoutineSyncError) throw error;
    throw new RoutineSyncError(error instanceof DOMException && error.name === "AbortError" ? "同步超时，请检查网络。" : "无法连接同步服务。", 0);
  } finally {
    window.clearTimeout(timeout);
  }
};

export const createRoutineCombination = async (name: string, snapshot: RoutineSnapshot) => {
  const result = await request<CreatedRoutineCombination>("/combinations", {
    method: "POST",
    body: JSON.stringify({ name, snapshot: normalizeRoutineSnapshot(snapshot) })
  });
  return { ...result, combination: normalizeCombination(result.combination) };
};

export const loadRoutineCombination = async (code: string, editCredential?: string | null) => {
  const normalizedCode = code.trim().toUpperCase();
  const result = await request<{ combination: RoutineCombination }>(
    `/combinations/${encodeURIComponent(normalizedCode)}`,
    undefined,
    editCredential || undefined
  );
  return normalizeCombination(result.combination);
};

export const saveRoutineCombination = async (
  combination: RoutineCombination,
  snapshot: RoutineSnapshot,
  editCredential?: string | null
) => {
  if (!editCredential) {
    throw new RoutineSyncError("此设备没有编辑凭证，组合保持只读，本机原稿已保留。", 403, undefined, "permission");
  }
  const result = await request<{ combination: RoutineCombination }>(`/combinations/${encodeURIComponent(combination.code)}`, {
    method: "PUT",
    body: JSON.stringify({
      name: combination.name,
      baseVersion: combination.version,
      snapshot: normalizeRoutineSnapshot(snapshot)
    })
  }, editCredential);
  return normalizeCombination(result.combination);
};
