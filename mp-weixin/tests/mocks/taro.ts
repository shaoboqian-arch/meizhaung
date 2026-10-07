import { useEffect } from "react";
const memory = new Map<string, unknown>();
export const useDidShow = (fn: () => void) => useEffect(fn, []);
export const useRouter = () => ({ params: Object.fromEntries(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search)) });
let navigator: ((url: string) => void) | undefined;
export const setTestNavigator = (fn: (url: string) => void) => { navigator = fn; };
const Taro = {
  getStorageSync: (key: string) => memory.has(key) ? memory.get(key) : "",
  setStorageSync: (key: string, value: unknown) => memory.set(key, JSON.parse(JSON.stringify(value))),
  getAccountInfoSync: () => ({ miniProgram: { appId: "test-appid" } }),
  showToast: () => {}, showModal: async () => ({ confirm: true }),
  navigateTo: async ({ url }: { url: string }) => { navigator?.(url); },
  navigateBack: async () => { navigator?.("back"); },
  login: async () => ({ code: "synthetic-offline-code" }),
  chooseMedia: async () => ({ tempFiles: [] }), saveFile: async () => ({ savedFilePath: "test-local-path" })
};
export default Taro;
