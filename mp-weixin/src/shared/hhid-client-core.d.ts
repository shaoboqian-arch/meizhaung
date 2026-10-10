type SessionView = { phase: 'connected' | 'save-pending' | 'unbound'; uid?: string; recoveryCode?: string; message: string };
export type HhidClient = {
  refresh(): Promise<SessionView>; create(password: string): Promise<SessionView>;
  login(uid: string, password: string): Promise<SessionView>;
  recover(uid: string, recoveryCode: string, newPassword: string): Promise<SessionView>;
  logout(): Promise<SessionView>; invalidate(): void; acknowledgeRecovery(): void;
  credential(): Promise<{owner: string; uid: string; token: string}>;
};
export function createHhidClient(ports: {
  appId: 'meizhaung' | 'xunji';
  storage: {get(key: string): unknown; set(key: string, value: unknown): void; remove(key: string): void};
  request(options: {url: string; method: 'POST'; timeout: number; header: Record<string, string>; data: Record<string, unknown>}): Promise<{statusCode: number; data: unknown}>;
  getProviderOwner(): string;
  getProviderProof(): Promise<{owner: string; token: string}>;
}): HhidClient;
