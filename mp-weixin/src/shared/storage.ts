import Taro from "@tarojs/taro";
import { ingredients as seedIngredients, products as seedProducts } from "@shared/data/catalog";
import type { Product, SkinConcern } from "@shared/types";
import { defaultSelectedIds } from "./constants";
import { matchIngredientText } from "@shared/data/ingredientMatcher";
import { createProductDraftStore, type ProductDraft } from "./product-draft";
import { createLocalRepository, createSyncCoordinator, productSignature, type Snapshot, type SyncTransport } from "./sync-model";
import { createSyncActionRunner } from "./sync-actions";
import { createReferencePhotoStore } from "./reference-photo";
import { readReferencePaths } from "./reference-paths";

const initial: Snapshot = { localProducts: [], selectedIds: [...defaultSelectedIds], skinConcerns: [] };
const repo = createLocalRepository({
  get: (key) => Taro.getStorageSync(key), set: (key, value) => Taro.setStorageSync(key, value)
}, initial);
// SDK is loaded only by a synchronization action, never by local getters / the first screen.
const transport: SyncTransport = {
  identity: async () => (await import("./cloud")).syncTransport.identity(),
  read: async (owner) => (await import("./cloud")).syncTransport.read(owner),
  putProducts: async (owner, products) => (await import("./cloud")).syncTransport.putProducts(owner, products),
  removeProduct: async (owner, id) => (await import("./cloud")).syncTransport.removeProduct(owner, id),
  putProfile: async (owner, snapshot) => (await import("./cloud")).syncTransport.putProfile(owner, snapshot)
};
const coordinator = createSyncCoordinator(repo, transport, initial);
export const getLocalScope = () => repo.scope();
const photos = createReferencePhotoStore({ get: key => Taro.getStorageSync(key), set: (key,value) => Taro.setStorageSync(key,value) }, getLocalScope, {
  fileInfo: async path => { const result=await Taro.getFileInfo({filePath:path}); if (!('size' in result)) throw new Error('照片大小暂不可读取，已停止保存'); return {size:result.size}; },
  imageInfo: path => Taro.getImageInfo({ src: path }),
  compress: async (path,width,height) => (await Taro.compressImage({ src:path,quality:80,compressedWidth:width,compressedHeight:height })).tempFilePath,
  savedFiles: async () => (await Taro.getSavedFileList()).fileList,
  save: async path => { const result=await Taro.saveFile({tempFilePath:path}); if (!('savedFilePath' in result) || !result.savedFilePath) throw new Error('照片保存未确认，填写内容保留'); return result.savedFilePath; },
  remove: async path => {await Taro.removeSavedFile({filePath:path});}
},()=>readReferencePaths({get:key=>Taro.getStorageSync(key),set:()=>{throw new Error('照片引用核对禁止写入');}},Taro.getStorageInfoSync().keys));
export const prepareReferencePhoto = (path: string, draft: ProductDraft) => photos.prepare(path,draft);
export const attachReferencePhoto = (draft: ProductDraft, path: string, previous: string) => photos.attach(draft,path,previous);
export const getReferencePhotoInventory = () => photos.inventory();
export const proposeReferencePhotoRemoval = (path:string) => photos.proposeRemoval(path);
export const removeConfirmedReferencePhoto = (token:string) => photos.removeConfirmed(token);
export const getLocalProducts = () => repo.read().desiredSnapshot.localProducts;
export const getSelectedIds = () => repo.read().desiredSnapshot.selectedIds;
export const getSkinConcerns = () => repo.read().desiredSnapshot.skinConcerns;
export const setLocalProducts = (localProducts: Product[]) => repo.change((s) => ({ ...s, localProducts }));
export const setSelectedIds = (selectedIds: string[]) => repo.change((s) => ({ ...s, selectedIds: [...new Set(selectedIds)] }));
export const setSkinConcerns = (skinConcerns: SkinConcern[]) => repo.change((s) => ({ ...s, skinConcerns }));
export const getAllProducts = () => [...seedProducts, ...getLocalProducts()];
export const toggleStoredId = (id: string) => repo.change((s) => ({ ...s,
  selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((v) => v !== id) : [...s.selectedIds, id]
})).selectedIds;
export const addStoredProduct = (product: Product) => repo.change((s) => ({ ...s,
  localProducts: [...s.localProducts, product], selectedIds: [...new Set([...s.selectedIds, product.id])]
}));
export const deleteStoredProduct = (id: string) => repo.change((s) => ({ ...s,
  localProducts: s.localProducts.filter((p) => p.id !== id), selectedIds: s.selectedIds.filter((v) => v !== id)
}));
export const ingredientNames = (product: Product) => product.ingredientIds
  .map((id) => seedIngredients.find((i) => i.id === id)?.name).filter(Boolean).join(" / ");
export const matchIngredients = (text: string) => matchIngredientText(text, seedIngredients);
export const matchIngredientIds = (text: string) => matchIngredients(text).matches.map((m) => m.ingredientId);
const formStore = createProductDraftStore({ get: (key) => Taro.getStorageSync(key), set: (key, v) => Taro.setStorageSync(key, v) });
export const readProductDraft = () => formStore.read(repo.scope());
export const saveProductDraft = (draft: ProductDraft) => formStore.save(draft, repo.scope());
export const commitProductDraft = (draft: ProductDraft) => {
  if (draft.scope !== repo.scope()) throw new Error("账号已变化，原账号草稿保留");
  if (!draft.brand.trim() || !draft.model.trim()) throw new Error("先填写品牌和型号");
  const product: Product = { id: draft.id, brand: draft.brand.trim(), model: draft.model.trim(),
    category: draft.category, ingredientIds: matchIngredientIds(draft.ingredientText),
    notes: draft.ingredientText.trim() || "手工添加，成分未知，仅作本地参考。", image: draft.image || undefined };
  const existing = getLocalProducts().find((p) => p.id === product.id);
  if (existing && (productSignature(existing) !== productSignature(product) || existing.image !== product.image)) {
    throw new Error("该草稿已入库且内容不同，原稿保留，请先核对产品详情");
  }
  if (!existing) addStoredProduct(product);
  // Failure to reset the form cannot duplicate a successfully journaled product: ID stays stable.
  let draftReset = true;
  try { formStore.finish(draft, repo.scope()); } catch { draftReset = false; }
  return { product, draftReset };
};
export const getSyncHint = () => {
  const state = repo.read();
  if (state.scope === "guest") return "本机草稿，未上传";
  return state.journalId ? "有待同步改动，本机原稿已保存" :
    (state.lastReadAt ? "账号数据已读取" : "账号缓存，尚未读取云端");
};
export const needsCloudPull = () => repo.scope() !== "guest" && Date.now() - repo.read().lastReadAt > 5 * 60 * 1000;
export const pullFromCloud = () => coordinator.pull();
export const pushToCloud = () => coordinator.push();
// Mutations are already journaled atomically; both paths use the SAME preflight / merge / readback gate.
export const pushProductToCloud = (_product: Product) => coordinator.push();
export const removeProductFromCloud = (_id: string) => coordinator.push();
export const useGuestDraft = () => { repo.activate("guest"); return { ok: true, message: "已切回本机草稿，未上传" }; };
export const importGuestDraft = async () => {
  const owner = repo.scope();
  const pulled = await coordinator.pull();
  if (!pulled.ok) return pulled;
  if (repo.scope() !== owner) return { ok: false, message: "微信账号已变化，原稿保留且未导入" };
  const guest = repo.read("guest").desiredSnapshot;
  const account = repo.read().desiredSnapshot;
  const collision = guest.localProducts.some((p) => {
    const existing = account.localProducts.find((a) => a.id === p.id);
    return existing && productSignature(existing) !== productSignature(p);
  });
  if (collision) return { ok: false, message: "同编号产品内容不同，原稿保留且未导入" };
  repo.change((s) => ({ ...s,
    localProducts: [...s.localProducts, ...guest.localProducts.filter((p) => !s.localProducts.some((a) => a.id === p.id))],
    selectedIds: [...new Set([...s.selectedIds, ...guest.selectedIds])],
    skinConcerns: [...new Set([...s.skinConcerns, ...guest.skinConcerns])]
  }));
  return { ok: true, message: "本机草稿已导入当前账号缓存，尚未上传；原草稿保留" };
};
export const signInAndSync = async () => {
  const signedIn = await (await import("./cloud")).signInWithWechat();
  if (!signedIn.ok) return signedIn;
  const pulled = await coordinator.pull(); // LOGIN NEVER WRITES.
  return pulled.ok ? { ok: true, message: "已登录并读取；旧本机草稿保留，可手动导入" } : pulled;
};

export const runUserSyncAction = createSyncActionRunner({
  scope: repo.scope,
  guestHasChanges: () => repo.read("guest").journalId !== null,
  identity: transport.identity,
  loginAndRead: signInAndSync,
  pull: pullFromCloud,
  push: pushToCloud,
  importGuest: importGuestDraft,
  restoreScope: repo.activate,
  confirmGuest: async (action) => {
    const result = await Taro.showModal({
      title: "合并本机内容？",
      content: action === "save"
        ? "将本机未上传内容合并到当前微信账号，再保存到云端。原稿保留；请确认这些内容属于你。"
        : "读取云端后，将本机未上传内容合并到当前微信账号的本机缓存，不上传。原稿保留；请确认这些内容属于你。",
      confirmText: "合并并继续", cancelText: "取消"
    });
    return result.confirm;
  }
});
