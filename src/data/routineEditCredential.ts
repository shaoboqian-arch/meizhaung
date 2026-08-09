const EDIT_CREDENTIAL_SCHEMA_VERSION = 1;
const EDIT_CREDENTIAL_PREFIX = "beauty-routine-edit-credential-v1:";
const ROUTINE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export interface RoutineEditCredentialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredRoutineEditCredential {
  schemaVersion: number;
  routineCode: string;
  credential: string;
  savedAt: string;
}

const getBrowserStorage = (): RoutineEditCredentialStorage | null =>
  typeof localStorage === "undefined" ? null : localStorage;

const normalizeCode = (code: string) => code.trim().toUpperCase();

const credentialKey = (code: string) => `${EDIT_CREDENTIAL_PREFIX}${normalizeCode(code)}`;

export const readRoutineEditCredential = (
  code: string,
  storage: RoutineEditCredentialStorage | null = getBrowserStorage()
) => {
  if (!storage) return null;
  const routineCode = normalizeCode(code);
  if (!ROUTINE_CODE_PATTERN.test(routineCode)) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(credentialKey(routineCode)) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    const stored = parsed as Partial<StoredRoutineEditCredential>;
    if (
      stored.schemaVersion !== EDIT_CREDENTIAL_SCHEMA_VERSION
      || stored.routineCode !== routineCode
      || typeof stored.credential !== "string"
      || stored.credential.length < 32
    ) return null;
    return stored.credential;
  } catch {
    return null;
  }
};

export const persistRoutineEditCredential = (
  code: string,
  credential: string,
  storage: RoutineEditCredentialStorage | null = getBrowserStorage()
) => {
  const routineCode = normalizeCode(code);
  if (!storage || !ROUTINE_CODE_PATTERN.test(routineCode) || credential.length < 32) return false;
  try {
    const stored: StoredRoutineEditCredential = {
      schemaVersion: EDIT_CREDENTIAL_SCHEMA_VERSION,
      routineCode,
      credential,
      savedAt: new Date().toISOString()
    };
    storage.setItem(credentialKey(routineCode), JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

export const clearRoutineEditCredential = (
  code: string,
  storage: RoutineEditCredentialStorage | null = getBrowserStorage()
) => {
  if (!storage) return false;
  try {
    storage.removeItem(credentialKey(code));
    return true;
  } catch {
    return false;
  }
};
