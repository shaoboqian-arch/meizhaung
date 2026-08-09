import {
  mergeRoutineSnapshots,
  normalizeRoutineSnapshot,
  snapshotSignature,
  type RoutineSnapshot
} from "./routineMerge";

const JOURNAL_SCHEMA_VERSION = 1;
const JOURNAL_PREFIX = "beauty-routine-draft-v1:";
const ROUTINE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export interface RoutineDraftJournal {
  schemaVersion: number;
  routineCode: string;
  baseVersion: number;
  baseSnapshot: RoutineSnapshot;
  desiredSnapshot: RoutineSnapshot;
  updatedAt: string;
}

export interface RoutineDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type RoutineDraftReadResult =
  | { kind: "missing" }
  | { kind: "ready"; journal: RoutineDraftJournal }
  | { kind: "corrupt" };

export interface VersionedRoutineSnapshot {
  code: string;
  version: number;
  snapshot: RoutineSnapshot;
}

const getBrowserStorage = (): RoutineDraftStorage | null =>
  typeof localStorage === "undefined" ? null : localStorage;

const normalizeCode = (code: string) => code.trim().toUpperCase();

export const routineDraftJournalKey = (code: string) => `${JOURNAL_PREFIX}${normalizeCode(code)}`;

const isSnapshot = (value: unknown): value is RoutineSnapshot => {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<RoutineSnapshot>;
  return Array.isArray(snapshot.selectedIds)
    && Array.isArray(snapshot.skinConcerns)
    && Array.isArray(snapshot.localProducts);
};

const isJournal = (value: unknown): value is RoutineDraftJournal => {
  if (!value || typeof value !== "object") return false;
  const journal = value as Partial<RoutineDraftJournal>;
  return journal.schemaVersion === JOURNAL_SCHEMA_VERSION
    && typeof journal.routineCode === "string"
    && ROUTINE_CODE_PATTERN.test(normalizeCode(journal.routineCode))
    && typeof journal.baseVersion === "number"
    && Number.isInteger(journal.baseVersion)
    && journal.baseVersion >= 1
    && typeof journal.updatedAt === "string"
    && isSnapshot(journal.baseSnapshot)
    && isSnapshot(journal.desiredSnapshot);
};

export const createRoutineDraftJournal = (
  routine: VersionedRoutineSnapshot,
  desiredSnapshot: RoutineSnapshot,
  updatedAt = new Date().toISOString()
): RoutineDraftJournal => {
  const routineCode = normalizeCode(routine.code);
  if (!ROUTINE_CODE_PATTERN.test(routineCode) || !Number.isInteger(routine.version) || routine.version < 1) {
    throw new Error("无法为当前组合创建本机原稿记录。");
  }
  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    routineCode,
    baseVersion: routine.version,
    baseSnapshot: normalizeRoutineSnapshot(routine.snapshot),
    desiredSnapshot: normalizeRoutineSnapshot(desiredSnapshot),
    updatedAt
  };
};

export const readRoutineDraftJournal = (
  code: string,
  storage: RoutineDraftStorage | null = getBrowserStorage()
): RoutineDraftReadResult => {
  if (!storage) return { kind: "missing" };
  const routineCode = normalizeCode(code);
  if (!ROUTINE_CODE_PATTERN.test(routineCode)) return { kind: "corrupt" };
  try {
    const raw = storage.getItem(routineDraftJournalKey(routineCode));
    if (!raw) return { kind: "missing" };
    const parsed: unknown = JSON.parse(raw);
    if (!isJournal(parsed) || normalizeCode(parsed.routineCode) !== routineCode) return { kind: "corrupt" };
    return {
      kind: "ready",
      journal: {
        ...parsed,
        routineCode,
        baseSnapshot: normalizeRoutineSnapshot(parsed.baseSnapshot),
        desiredSnapshot: normalizeRoutineSnapshot(parsed.desiredSnapshot)
      }
    };
  } catch {
    return { kind: "corrupt" };
  }
};

export const persistRoutineDraftJournal = (
  journal: RoutineDraftJournal,
  storage: RoutineDraftStorage | null = getBrowserStorage()
) => {
  if (!storage || !isJournal(journal)) return false;
  try {
    storage.setItem(routineDraftJournalKey(journal.routineCode), JSON.stringify(journal));
    return true;
  } catch {
    return false;
  }
};

export const rebaseRoutineDraftJournal = (
  journal: RoutineDraftJournal,
  remote: VersionedRoutineSnapshot,
  updatedAt = new Date().toISOString()
) => {
  const mergedSnapshot = mergeRoutineSnapshots(
    journal.baseSnapshot,
    journal.desiredSnapshot,
    normalizeRoutineSnapshot(remote.snapshot)
  );
  return {
    mergedSnapshot,
    journal: createRoutineDraftJournal(
      { code: remote.code, version: remote.version, snapshot: remote.snapshot },
      mergedSnapshot,
      updatedAt
    )
  };
};

export const clearRoutineDraftAfterReadback = (
  code: string,
  receiptSnapshot: RoutineSnapshot,
  storage: RoutineDraftStorage | null = getBrowserStorage()
) => {
  const read = readRoutineDraftJournal(code, storage);
  if (read.kind !== "ready" || !storage) return false;
  if (snapshotSignature(read.journal.desiredSnapshot) !== snapshotSignature(receiptSnapshot)) return false;
  try {
    storage.removeItem(routineDraftJournalKey(code));
    return true;
  } catch {
    return false;
  }
};
