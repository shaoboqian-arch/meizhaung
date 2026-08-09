import assert from "node:assert/strict";
import {
  clearRoutineDraftAfterReadback,
  createRoutineDraftJournal,
  persistRoutineDraftJournal,
  readRoutineDraftJournal,
  rebaseRoutineDraftJournal,
  routineDraftJournalKey,
  type RoutineDraftStorage
} from "../src/data/routineDraftJournal";
import { classifyRoutineSyncFailure } from "../src/data/routineSyncFailure";
import type { RoutineSnapshot } from "../src/data/routineMerge";

class MemoryStorage implements RoutineDraftStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const snapshot = (selectedIds: string[]): RoutineSnapshot => ({
  selectedIds,
  skinConcerns: [],
  localProducts: []
});

const storage = new MemoryStorage();
const code = "R9KHHE";
const base = snapshot(["base-product"]);
const local = snapshot(["base-product", "local-draft"]);
const remote = snapshot(["base-product", "remote-device"]);

const journal = createRoutineDraftJournal(
  { code, version: 1, snapshot: base },
  local,
  "2026-08-10T00:00:00.000Z"
);
assert.ok(persistRoutineDraftJournal(journal, storage), "Dirty journal was not persisted before sync");
const restored = readRoutineDraftJournal(code, storage);
assert.equal(restored.kind, "ready", "Offline refresh did not restore the dirty journal");
if (restored.kind !== "ready") throw new Error("Expected a ready draft journal");
assert.deepEqual(restored.journal.desiredSnapshot, local, "Restored draft changed before merge");

const rebased = rebaseRoutineDraftJournal(restored.journal, { code, version: 2, snapshot: remote });
assert.deepEqual(
  new Set(rebased.mergedSnapshot.selectedIds),
  new Set(["base-product", "local-draft", "remote-device"]),
  "Three-way merge lost either local or remote edits"
);
assert.equal(rebased.journal.baseVersion, 2, "Conflict rebase did not advance the journal base version");
assert.ok(persistRoutineDraftJournal(rebased.journal, storage), "Rebased conflict journal was not persisted");

assert.equal(
  clearRoutineDraftAfterReadback(code, remote, storage),
  false,
  "A non-equivalent remote snapshot cleared the original draft"
);
assert.equal(readRoutineDraftJournal(code, storage).kind, "ready", "Non-equivalent readback removed the journal");
assert.equal(
  clearRoutineDraftAfterReadback(code, rebased.mergedSnapshot, storage),
  true,
  "Equivalent server readback did not clear the acknowledged journal"
);
assert.equal(readRoutineDraftJournal(code, storage).kind, "missing", "Acknowledged journal still exists");

const corruptKey = routineDraftJournalKey(code);
storage.setItem(corruptKey, "{");
assert.equal(readRoutineDraftJournal(code, storage).kind, "corrupt", "Corrupt journal was mistaken for an empty draft");
assert.equal(clearRoutineDraftAfterReadback(code, local, storage), false, "Corrupt journal was deleted without user confirmation");
assert.equal(storage.getItem(corruptKey), "{", "Corrupt journal bytes were silently replaced");

assert.equal(classifyRoutineSyncFailure(404), "not-found", "Missing routine was not classified separately");
assert.equal(classifyRoutineSyncFailure(403), "permission", "Permission failure was not classified separately");
assert.equal(classifyRoutineSyncFailure(0), "transient", "Network failure was not classified separately");
assert.equal(classifyRoutineSyncFailure(400), "invalid-request", "Invalid request was not classified separately");

console.log("Routine draft safety passed.");
