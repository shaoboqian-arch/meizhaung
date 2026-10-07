import type { Outcome, SyncResult } from "./sync-model";

export type SyncAction = "save" | "read";
export interface SyncActionPort {
  scope(): string;
  guestHasChanges(): boolean;
  identity(): Promise<Outcome<string>>;
  loginAndRead(): Promise<SyncResult>;
  pull(): Promise<SyncResult>;
  push(): Promise<SyncResult>;
  importGuest(): Promise<SyncResult>;
  restoreScope(scope: string): void;
  confirmGuest(action: SyncAction): Promise<boolean>;
}

/** UI intent only. Merge, ownership, journal and readback remain in the existing coordinator. */
export const createSyncActionRunner = (port: SyncActionPort) => {
  let running = false;
  return async (action: SyncAction): Promise<SyncResult> => {
    if (running) return { ok: false, message: "正在处理，请稍候；本机内容已保留" };
    running = true;
    let originalScope: string | undefined;
    let succeeded = false;
    try {
      originalScope = port.scope();
      const guest = originalScope === "guest";
      const hasDraft = guest && port.guestHasChanges();
      const identity = await port.identity();
      if (!identity.ok && identity.kind !== "unauthenticated") return identity;
      if (action === "save" && !guest && identity.ok && identity.data !== originalScope) {
        return { ok: false, message: "微信账号已变化，请先点读取；原账号内容保留" };
      }
      if (hasDraft && !(await port.confirmGuest(action))) {
        return { ok: false, message: "已取消，本机内容保留" };
      }
      // Only unauthenticated triggers login; permission / network / malformed results never do.
      let read: SyncResult | undefined;
      if (!identity.ok) read = await port.loginAndRead();
      else if (guest || action === "read") read = await port.pull();
      if (read && !read.ok) return read;
      if (read && identity.ok && port.scope() !== identity.data) {
        return { ok: false, message: "微信账号已变化，已停止操作；本机内容保留" };
      }
      if (action === "save" && !guest && port.scope() !== originalScope) {
        return { ok: false, message: "微信账号已变化，请先点读取；原账号内容保留" };
      }
      if (hasDraft) {
        const imported = await port.importGuest();
        if (!imported.ok) return imported;
      }
      const result = action === "save" ? await port.push() :
        hasDraft ? { ok: true, message: "已读取并合并本机内容，尚未上传" } : read!;
      succeeded = result.ok;
      return result;
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "操作失败，本机内容保留" };
    } finally {
      try {
        // Failed login/read/import must not hide the user's original working draft.
        if (!succeeded && originalScope !== undefined && port.scope() !== originalScope) port.restoreScope(originalScope);
      } finally { running = false; }
    }
  };
};
