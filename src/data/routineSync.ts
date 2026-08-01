import type { RoutineSnapshot } from "./routineMerge";
export { mergeRoutineSnapshots, type RoutineSnapshot } from "./routineMerge";

const syncApiBase = (import.meta.env?.VITE_ROUTINE_SYNC_API || "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync").replace(/\/$/, "");

export interface RoutineCombination {
  code: string;
  name: string;
  version: number;
  updatedAt: string;
  snapshot: RoutineSnapshot;
}

export interface RecentRoutineCombination {
  code: string;
  name: string;
}

export class RoutineSyncError extends Error {
  status: number;
  combination?: RoutineCombination;

  constructor(message: string, status: number, combination?: RoutineCombination) {
    super(message);
    this.name = "RoutineSyncError";
    this.status = status;
    this.combination = combination;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${syncApiBase}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
    });
    const body = await response.json().catch(() => ({})) as {
      error?: string;
      combination?: RoutineCombination;
    };
    if (!response.ok) throw new RoutineSyncError(body.error || "同步服务暂时不可用。", response.status, body.combination);
    return body as T;
  } catch (error) {
    if (error instanceof RoutineSyncError) throw error;
    throw new RoutineSyncError(error instanceof DOMException && error.name === "AbortError" ? "同步超时，请检查网络。" : "无法连接同步服务。", 0);
  } finally {
    window.clearTimeout(timeout);
  }
};

export const createRoutineCombination = async (name: string, snapshot: RoutineSnapshot) => {
  const result = await request<{ combination: RoutineCombination }>("/combinations", {
    method: "POST",
    body: JSON.stringify({ name, snapshot })
  });
  return result.combination;
};

export const loadRoutineCombination = async (code: string) => {
  const normalizedCode = code.trim().toUpperCase();
  const result = await request<{ combination: RoutineCombination }>(`/combinations/${encodeURIComponent(normalizedCode)}`);
  return result.combination;
};

export const saveRoutineCombination = async (combination: RoutineCombination, snapshot: RoutineSnapshot) => {
  const result = await request<{ combination: RoutineCombination }>(`/combinations/${encodeURIComponent(combination.code)}`, {
    method: "PUT",
    body: JSON.stringify({ name: combination.name, baseVersion: combination.version, snapshot })
  });
  return result.combination;
};

export const snapshotSignature = (snapshot: RoutineSnapshot) => JSON.stringify({
  selectedIds: [...snapshot.selectedIds].sort(),
  skinConcerns: [...snapshot.skinConcerns].sort(),
  localProducts: snapshot.localProducts
    .map(({ image: _image, ...product }) => product)
    .sort((left, right) => left.id.localeCompare(right.id))
});
