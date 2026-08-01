import {
  Cloud,
  Copy,
  FlaskConical,
  Layers,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeRoutine } from "./data/analyzer";
import { ingredients as seedIngredients, products as seedProducts } from "./data/catalog";
import { searchOpenBeautyFactsProducts } from "./data/externalProductSource";
import { findIngredientIdsInText, getIngredientSearchText, matchIngredientText, type IngredientTextMatch } from "./data/ingredientMatcher";
import { enrichIngredientRisk } from "./data/ingredientRisk";
import { buildRoutineRecommendation } from "./data/recommender";
import { isSupportedOcrImage, recognizeIngredientImage } from "./features/localOcr";
import {
  getUngroupedAnalysisForDisplay,
  groupAnalysisForDisplay,
  shouldCollapseAnalysisDetail,
  shouldCollapseCoverageReason,
  shouldCollapseRecommendationReason,
  sortConcernCoverageForDisplay,
  sortRecommendedProductsForDisplay
} from "./features/recommendationPresentation";
import {
  createRoutineCombination,
  loadRoutineCombination,
  mergeRoutineSnapshots,
  RoutineSyncError,
  saveRoutineCombination,
  snapshotSignature,
  type RecentRoutineCombination,
  type RoutineCombination,
  type RoutineSnapshot
} from "./data/routineSync";
import type { IngredientTag, Product, ProductCategory, SkinConcern } from "./types";
import heroCare from "../mp-weixin/src/assets/illustrations/hero-care.png";
import heroProducts from "../mp-weixin/src/assets/illustrations/hero-products.png";
import heroIngredients from "../mp-weixin/src/assets/illustrations/hero-ingredients.png";
import heroAnalysis from "../mp-weixin/src/assets/illustrations/hero-analysis.png";
import uploadPackage from "../mp-weixin/src/assets/illustrations/upload-package.png";
import conditionAcne from "../mp-weixin/src/assets/illustrations/condition-acne.png";
import conditionDry from "../mp-weixin/src/assets/illustrations/condition-dry.png";
import conditionSensitive from "../mp-weixin/src/assets/illustrations/condition-sensitive.png";
import conditionRedness from "../mp-weixin/src/assets/illustrations/condition-redness.png";
import conditionOil from "../mp-weixin/src/assets/illustrations/condition-oil.png";
import conditionPore from "../mp-weixin/src/assets/illustrations/condition-pore.png";
import conditionBlackhead from "../mp-weixin/src/assets/illustrations/condition-blackhead.png";
import conditionDull from "../mp-weixin/src/assets/illustrations/condition-dull.png";
import conditionSpot from "../mp-weixin/src/assets/illustrations/condition-spot.png";
import conditionBarrier from "../mp-weixin/src/assets/illustrations/condition-barrier.png";
import conditionNeck from "../mp-weixin/src/assets/illustrations/condition-neck.png";
import conditionSagging from "../mp-weixin/src/assets/illustrations/condition-sagging.png";
import conditionFineLines from "../mp-weixin/src/assets/illustrations/condition-fine-lines.png";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const resizeUploadedImage = async (file: File, maxSize = 900, quality = 0.78) => {
  const dataUrl = await readFileAsDataUrl(file);

  return new Promise<string>((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
};

const categories: ProductCategory[] = [
  "卸妆水",
  "洁面",
  "爽肤水",
  "精华",
  "面霜",
  "面膜",
  "防晒",
  "眼霜",
  "乳液",
  "喷雾",
  "唇部护理",
  "身体乳",
  "颈部护理",
  "祛痘护理"
];

const localProductsKey = "beauty-products";
const selectedIdsKey = "beauty-selected-ids";
const skinConcernsKey = "beauty-skin-concerns";
const recentRoutinesKey = "beauty-recent-routines";
const activeRoutineKey = "beauty-active-routine";
type OcrReviewPhase = "idle" | "loading" | "recognizing" | "completed" | "partial" | "failed";
interface OcrReviewState {
  phase: OcrReviewPhase;
  progress: number;
  message: string;
}
const idleOcrReview: OcrReviewState = { phase: "idle", progress: 0, message: "" };
const skinConcernOptions: SkinConcern[] = ["痘多", "干燥", "敏感", "泛红", "出油多", "毛孔粗", "黑头", "暗沉", "色斑", "屏障弱", "颈纹", "松弛", "纹路"];
const skinConcernImageMap: Record<SkinConcern, string> = {
  痘多: conditionAcne,
  干燥: conditionDry,
  敏感: conditionSensitive,
  泛红: conditionRedness,
  出油多: conditionOil,
  毛孔粗: conditionPore,
  黑头: conditionBlackhead,
  暗沉: conditionDull,
  色斑: conditionSpot,
  屏障弱: conditionBarrier,
  颈纹: conditionNeck,
  松弛: conditionSagging,
  纹路: conditionFineLines
};
const panelHeroMap = {
  conditions: { eyebrow: "Beauty Ingredient", title: "情况", image: heroCare },
  products: { eyebrow: "Product Library", title: "产品库", image: heroProducts },
  ingredients: { eyebrow: "Ingredient Library", title: "成分库", image: heroIngredients },
  analysis: { eyebrow: "Routine Assistant", title: "搭配助手", image: heroAnalysis }
} as const;
const concernDescriptions: Record<SkinConcern, string> = {
  痘多: "易长痘、闭口、粉刺",
  干燥: "紧绷起皮、缺水",
  敏感: "刺痛、灼热、易泛红",
  泛红: "脸颊/鼻周泛红",
  出油多: "T区出油旺盛",
  毛孔粗: "毛孔粗大、肤质不平",
  黑头: "黑头粉刺明显",
  暗沉: "肤色不均、气色不佳",
  色斑: "色斑、晒斑、肤色不匀",
  屏障弱: "易泛红、脱皮、换季不适",
  颈纹: "颈部横纹、皮肤松弛下垂",
  松弛: "面部轮廓松垮、缺乏弹性",
  纹路: "法令纹、抬头纹、眼角细纹"
};


function loadLocalProducts(): Product[] {
  try {
    const saved = localStorage.getItem(localProductsKey);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadStringArray<T extends string>(key: string, fallback: T[], allowedValues?: readonly T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return fallback;

    const allowed = allowedValues ? new Set<string>(allowedValues) : null;
    return Array.from(
      new Set(parsed.filter((item): item is T => typeof item === "string" && (!allowed || allowed.has(item))))
    );
  } catch {
    return fallback;
  }
}

function loadRecentRoutines(): RecentRoutineCombination[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(recentRoutinesKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentRoutineCombination => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<RecentRoutineCombination>;
      return typeof candidate.name === "string"
        && typeof candidate.code === "string"
        && /^[A-HJ-NP-Z2-9]{6}$/.test(candidate.code);
    }).slice(0, 8);
  } catch {
    return [];
  }
}

function App() {
  const [activePanel, setActivePanel] = useState<"conditions" | "products" | "ingredients" | "analysis">("conditions");
  const [localProducts, setLocalProducts] = useState<Product[]>(loadLocalProducts);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    loadStringArray(selectedIdsKey, ["skinceuticals-ce", "elta-md"])
  );
  const [skinConcerns, setSkinConcerns] = useState<SkinConcern[]>(() =>
    loadStringArray(skinConcernsKey, [], skinConcernOptions)
  );
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("精华");
  const [productSearch, setProductSearch] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualCategory, setManualCategory] = useState<ProductCategory>("精华");
  const [manualIngredientText, setManualIngredientText] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [ocrImageFile, setOcrImageFile] = useState<File | null>(null);
  const [ocrReview, setOcrReview] = useState<OcrReviewState>(idleOcrReview);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrMatches, setOcrMatches] = useState<IngredientTextMatch[]>([]);
  const [ocrUnmatchedFragments, setOcrUnmatchedFragments] = useState<string[]>([]);
  const [externalSearch, setExternalSearch] = useState("");
  const [externalProducts, setExternalProducts] = useState<Product[]>([]);
  const [externalStatus, setExternalStatus] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [externalLoading, setExternalLoading] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [selectedIngredientTag, setSelectedIngredientTag] = useState<IngredientTag | "全部">("全部");
  const [activeIngredientId, setActiveIngredientId] = useState(seedIngredients[0]?.id ?? "");
  const [activeRoutine, setActiveRoutine] = useState<RoutineCombination | null>(null);
  const [recentRoutines, setRecentRoutines] = useState<RecentRoutineCombination[]>(loadRecentRoutines);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [routineCode, setRoutineCode] = useState("");
  const [inheritCurrentRoutine, setInheritCurrentRoutine] = useState(true);
  const [routineBusy, setRoutineBusy] = useState(false);
  const [routineStatus, setRoutineStatus] = useState("请先新建或打开一个用户组合");
  const activeRoutineRef = useRef<RoutineCombination | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  const skinConcernsRef = useRef(skinConcerns);
  const localProductsRef = useRef(localProducts);
  const lastSyncedSnapshotRef = useRef<RoutineSnapshot | null>(null);
  const lastSyncedSignatureRef = useRef("");
  const pendingSnapshotRef = useRef<RoutineSnapshot | null>(null);
  const saveInFlightRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const flushPendingSaveRef = useRef<() => Promise<void>>(async () => undefined);

  const getCurrentRoutineSnapshot = useCallback((): RoutineSnapshot => ({
    selectedIds: selectedIdsRef.current,
    skinConcerns: skinConcernsRef.current,
    localProducts: localProductsRef.current
  }), []);

  const rememberRoutine = useCallback((routine: RoutineCombination) => {
    setRecentRoutines((current) => {
      const next = [
        { code: routine.code, name: routine.name },
        ...current.filter((item) => item.code !== routine.code)
      ].slice(0, 8);
      localStorage.setItem(recentRoutinesKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const applyRoutineSnapshot = useCallback((snapshot: RoutineSnapshot) => {
    const localImages = new Map(
      localProductsRef.current
        .filter((product) => product.image)
        .map((product) => [product.id, product.image])
    );
    const hydratedProducts = snapshot.localProducts.map((product) => ({
      ...product,
      image: product.image || localImages.get(product.id)
    }));

    selectedIdsRef.current = snapshot.selectedIds;
    skinConcernsRef.current = snapshot.skinConcerns;
    localProductsRef.current = hydratedProducts;
    setSelectedIds(snapshot.selectedIds);
    setSkinConcerns(snapshot.skinConcerns);
    setLocalProducts(hydratedProducts);
    localStorage.setItem(selectedIdsKey, JSON.stringify(snapshot.selectedIds));
    localStorage.setItem(skinConcernsKey, JSON.stringify(snapshot.skinConcerns));
    localStorage.setItem(localProductsKey, JSON.stringify(hydratedProducts));
  }, []);

  const updateRoutineMetadata = useCallback((routine: RoutineCombination, status: string) => {
    activeRoutineRef.current = routine;
    lastSyncedSnapshotRef.current = routine.snapshot;
    lastSyncedSignatureRef.current = snapshotSignature(routine.snapshot);
    setActiveRoutine(routine);
    setRoutineStatus(status);
    localStorage.setItem(activeRoutineKey, routine.code);
    rememberRoutine(routine);
  }, [rememberRoutine]);

  const acceptRoutine = useCallback((routine: RoutineCombination, status: string) => {
    applyRoutineSnapshot(routine.snapshot);
    updateRoutineMetadata(routine, status);
    setRoutineCode("");
  }, [applyRoutineSnapshot, updateRoutineMetadata]);

  const flushPendingSave = useCallback(async () => {
    if (saveInFlightRef.current || !activeRoutineRef.current) return;
    saveInFlightRef.current = true;
    let retryLater = false;

    try {
      while (pendingSnapshotRef.current && activeRoutineRef.current) {
        const desiredSnapshot = pendingSnapshotRef.current;
        pendingSnapshotRef.current = null;
        const routineAtStart = activeRoutineRef.current as RoutineCombination;
        const baseSnapshot = lastSyncedSnapshotRef.current || routineAtStart.snapshot;
        setRoutineStatus("正在保存...");

        try {
          const saved = await saveRoutineCombination(routineAtStart, desiredSnapshot);
          if (activeRoutineRef.current?.code !== routineAtStart.code) return;
          updateRoutineMetadata(saved, `已保存 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
        } catch (error) {
          if (error instanceof RoutineSyncError && error.status === 409 && error.combination) {
            const latestLocalSnapshot = pendingSnapshotRef.current || desiredSnapshot;
            pendingSnapshotRef.current = null;
            const mergedSnapshot = mergeRoutineSnapshots(baseSnapshot, latestLocalSnapshot, error.combination.snapshot);
            updateRoutineMetadata(error.combination, "检测到另一设备更新，正在合并...");
            applyRoutineSnapshot(mergedSnapshot);
            pendingSnapshotRef.current = mergedSnapshot;
            continue;
          }

          pendingSnapshotRef.current = pendingSnapshotRef.current || desiredSnapshot;
          setRoutineStatus(error instanceof Error ? error.message : "自动保存失败，正在重试");
          retryLater = true;
          if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => void flushPendingSaveRef.current(), 3_000);
          break;
        }
      }
    } finally {
      saveInFlightRef.current = false;
      if (pendingSnapshotRef.current && !retryLater) queueMicrotask(() => void flushPendingSaveRef.current());
    }
  }, [applyRoutineSnapshot, updateRoutineMetadata]);

  flushPendingSaveRef.current = flushPendingSave;

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    skinConcernsRef.current = skinConcerns;
    localProductsRef.current = localProducts;
  }, [selectedIds, skinConcerns, localProducts]);

  useEffect(() => {
    const savedCode = localStorage.getItem(activeRoutineKey)?.trim().toUpperCase();
    if (!savedCode || !/^[A-HJ-NP-Z2-9]{6}$/.test(savedCode)) return;

    let cancelled = false;
    setRoutineBusy(true);
    setRoutineStatus("正在恢复上次组合...");
    loadRoutineCombination(savedCode)
      .then((routine) => {
        if (!cancelled) acceptRoutine(routine, "已恢复上次组合");
      })
      .catch((error) => {
        if (cancelled) return;
        localStorage.removeItem(activeRoutineKey);
        setRoutineStatus(error instanceof Error ? error.message : "无法恢复上次组合");
      })
      .finally(() => {
        if (!cancelled) setRoutineBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [acceptRoutine]);

  useEffect(() => {
    if (!activeRoutine) return;
    const snapshot: RoutineSnapshot = { selectedIds, skinConcerns, localProducts };
    if (snapshotSignature(snapshot) === lastSyncedSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      pendingSnapshotRef.current = snapshot;
      void flushPendingSaveRef.current();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeRoutine?.code, selectedIds, skinConcerns, localProducts]);

  useEffect(() => {
    if (!activeRoutine?.code) return;
    let cancelled = false;
    let polling = false;

    const poll = async () => {
      if (polling || saveInFlightRef.current || pendingSnapshotRef.current) return;
      if (snapshotSignature(getCurrentRoutineSnapshot()) !== lastSyncedSignatureRef.current) return;
      polling = true;
      try {
        const remoteRoutine = await loadRoutineCombination(activeRoutine.code);
        if (!cancelled && remoteRoutine.version > (activeRoutineRef.current?.version || 0)) {
          acceptRoutine(remoteRoutine, "已接收另一设备的更新");
        }
      } catch (error) {
        if (!cancelled) setRoutineStatus(error instanceof Error ? error.message : "同步暂时中断");
      } finally {
        polling = false;
      }
    };

    const timer = window.setInterval(() => void poll(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeRoutine?.code, acceptRoutine, getCurrentRoutineSnapshot]);

  useEffect(() => () => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activePanel]);

  useEffect(() => {
    try {
      localStorage.setItem(selectedIdsKey, JSON.stringify(selectedIds));
    } catch {
      setProductStatus("保存失败：浏览器本地存储不可用或空间不足。");
    }
  }, [selectedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(skinConcernsKey, JSON.stringify(skinConcerns));
    } catch {
      setProductStatus("保存失败：浏览器本地存储不可用或空间不足。");
    }
  }, [skinConcerns]);

  const allProducts = useMemo(() => [...seedProducts, ...localProducts], [localProducts]);
  const ingredientsWithRisk = useMemo(() => seedIngredients.map(enrichIngredientRisk), []);
  const selectedProducts = allProducts.filter((product) => selectedIds.includes(product.id));
  const productSearchKeyword = productSearch.trim().toLowerCase();
  const categoryProducts = allProducts.filter((product) => {
    if (product.category !== selectedCategory) return false;
    if (!productSearchKeyword) return true;
    const ingredientText = product.ingredientIds
      .map((id) => {
        const ingredient = ingredientsWithRisk.find((item) => item.id === id);
        return ingredient ? getIngredientSearchText(ingredient) : id;
      })
      .join(" ");
    return `${product.brand} ${product.model} ${product.category} ${ingredientText} ${product.notes ?? ""}`
      .toLowerCase()
      .includes(productSearchKeyword);
  });
  const activeHero = panelHeroMap[activePanel];
  const recommendation = useMemo(
    () => buildRoutineRecommendation(selectedProducts, allProducts, ingredientsWithRisk, skinConcerns),
    [selectedProducts, allProducts, ingredientsWithRisk, skinConcerns]
  );
  const recommendedIdSet = useMemo(() => new Set(recommendation?.productIds ?? []), [recommendation]);
  const standaloneRecommendedIdSet = useMemo(
    () => new Set(recommendation?.standaloneProductIds ?? []),
    [recommendation]
  );
  const ingredientTagOptions = useMemo(
    () => Array.from(new Set(ingredientsWithRisk.flatMap((ingredient) => ingredient.tags))),
    [ingredientsWithRisk]
  );
  const ingredientSearchKeyword = ingredientSearch.trim().toLowerCase();
  const filteredIngredients = ingredientsWithRisk.filter((ingredient) => {
    const matchesTag = selectedIngredientTag === "全部" || ingredient.tags.includes(selectedIngredientTag);
    if (!matchesTag) return false;
    if (!ingredientSearchKeyword) return true;

    return `${ingredient.name} ${ingredient.aliases.join(" ")} ${ingredient.tags.join(" ")} ${ingredient.plainEffect} ${ingredient.caution ?? ""} ${ingredient.riskLevel ?? ""} ${(ingredient.riskNotes ?? []).join(" ")} ${(ingredient.avoidFor ?? []).join(" ")} ${(ingredient.routineTips ?? []).join(" ")}`
      .toLowerCase()
      .includes(ingredientSearchKeyword);
  });
  const activeIngredient =
    filteredIngredients.find((ingredient) => ingredient.id === activeIngredientId) ??
    filteredIngredients[0] ??
    ingredientsWithRisk[0];
  const recommendedProducts = sortRecommendedProductsForDisplay((recommendation?.productIds ?? [])
    .map((id) => allProducts.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product)), selectedIds);
  const analysis = analyzeRoutine(selectedProducts, ingredientsWithRisk, recommendation?.standaloneProductIds ?? [], skinConcerns);
  const analysisGroups = groupAnalysisForDisplay(analysis);
  const ungroupedAnalysis = getUngroupedAnalysisForDisplay(analysis);
  const sortedConcernCoverage = sortConcernCoverageForDisplay(recommendation?.concernCoverage ?? []);
  const getSelectedCountByCategory = (category: ProductCategory) =>
    allProducts.filter((product) => product.category === category && selectedIds.includes(product.id)).length;

  const createUserRoutine = async () => {
    const name = newRoutineName.trim();
    if (!name || routineBusy) {
      if (!name) setRoutineStatus("请先填写用户组合名称");
      return;
    }

    setRoutineBusy(true);
    setRoutineStatus("正在创建组合...");
    try {
      const snapshot = inheritCurrentRoutine
        ? getCurrentRoutineSnapshot()
        : { selectedIds: [], skinConcerns: [], localProducts: [] };
      const routine = await createRoutineCombination(name, snapshot);
      acceptRoutine(routine, "组合已创建，后续勾选将自动保存");
      setNewRoutineName("");
    } catch (error) {
      setRoutineStatus(error instanceof Error ? error.message : "创建组合失败");
    } finally {
      setRoutineBusy(false);
    }
  };

  const openUserRoutine = async (code = routineCode) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalizedCode) || routineBusy) {
      if (!routineBusy) setRoutineStatus("请输入 6 位同步码");
      return;
    }

    setRoutineBusy(true);
    setRoutineStatus("正在读取组合...");
    try {
      const routine = await loadRoutineCombination(normalizedCode);
      acceptRoutine(routine, "组合已打开，正在保持同步");
    } catch (error) {
      setRoutineStatus(error instanceof Error ? error.message : "读取组合失败");
    } finally {
      setRoutineBusy(false);
    }
  };

  const switchUserRoutine = () => {
    activeRoutineRef.current = null;
    lastSyncedSnapshotRef.current = null;
    lastSyncedSignatureRef.current = "";
    pendingSnapshotRef.current = null;
    setActiveRoutine(null);
    setRoutineStatus("请选择另一个组合，当前内容不会丢失");
    localStorage.removeItem(activeRoutineKey);
  };

  const copyRoutineCode = async () => {
    if (!activeRoutine) return;
    try {
      await navigator.clipboard.writeText(activeRoutine.code);
      setRoutineStatus("同步码已复制，可在另一台设备打开");
    } catch {
      setRoutineStatus(`同步码：${activeRoutine.code}`);
    }
  };

  const ensureActiveRoutine = () => {
    if (activeRoutineRef.current) return true;
    setRoutineStatus("请先新建或打开一个用户组合");
    return false;
  };

  const saveLocalProducts = (nextProducts: Product[]) => {
    try {
      localStorage.setItem(localProductsKey, JSON.stringify(nextProducts));
      setLocalProducts(nextProducts);
      setProductStatus("");
      return true;
    } catch {
      setProductStatus("保存失败：浏览器本地存储不可用或空间不足，产品库未更改。");
      return false;
    }
  };

  const toggleSelected = (productId: string) => {
    if (!ensureActiveRoutine()) return;
    setSelectedIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  };

  const toggleSkinConcern = (concern: SkinConcern) => {
    if (!ensureActiveRoutine()) return;
    setSkinConcerns((current) =>
      current.includes(concern) ? current.filter((item) => item !== concern) : [...current, concern]
    );
  };

  const clearOcrReview = () => {
    setManualIngredientText("");
    setOcrConfidence(null);
    setOcrMatches([]);
    setOcrUnmatchedFragments([]);
    setOcrReview(idleOcrReview);
  };

  const refreshOcrMatches = (text: string) => {
    const review = matchIngredientText(text, seedIngredients);
    setOcrMatches(review.matches);
    setOcrUnmatchedFragments(review.unmatchedFragments);
    return review;
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    if (!isSupportedOcrImage(file)) {
      setProductStatus("仅支持 PNG/JPG/WebP 图片，请更换后重试。");
      return;
    }

    clearOcrReview();
    setProductStatus("");
    setOcrImageFile(file);
    setManualImage(await resizeUploadedImage(file));
  };

  const startOcrRecognition = async () => {
    if (!ocrImageFile || ocrReview.phase === "loading" || ocrReview.phase === "recognizing") return;

    setManualIngredientText("");
    setOcrConfidence(null);
    setOcrMatches([]);
    setOcrUnmatchedFragments([]);
    setOcrReview({ phase: "loading", progress: 0, message: "准备本地文字识别" });

    try {
      const result = await recognizeIngredientImage(ocrImageFile, (update) => {
        setOcrReview({ phase: update.phase, progress: update.progress, message: update.message });
      });
      const review = refreshOcrMatches(result.text);
      setManualIngredientText(result.text);
      setOcrConfidence(result.confidence);
      setOcrReview({
        phase: review.unmatchedFragments.length ? "partial" : "completed",
        progress: 1,
        message: review.unmatchedFragments.length ? "部分命中，请人工核对未识别片段。" : "识别完成，请核对后再入库。"
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const message = code === "OCR_UNSUPPORTED_FORMAT"
        ? "仅支持 PNG/JPG/WebP 图片。"
        : code === "OCR_NO_TEXT"
          ? "未识别到文字，请换一张更清晰的成分表图片后重新识别。"
          : "本地识别未完成，请检查首次模型加载网络后重新识别。";
      setOcrReview({ phase: "failed", progress: 0, message });
    }
  };

  const handleManualIngredientTextChange = (text: string) => {
    setManualIngredientText(text);
    if (ocrReview.phase === "completed" || ocrReview.phase === "partial") {
      const review = refreshOcrMatches(text);
      setOcrReview((current) => ({
        ...current,
        phase: review.unmatchedFragments.length ? "partial" : "completed",
        message: review.unmatchedFragments.length ? "部分命中，请人工核对未识别片段。" : "已根据修正更新匹配，请核对后再入库。"
      }));
    }
  };

  const addManualProduct = () => {
    if (!ensureActiveRoutine()) return;
    const brand = manualBrand.trim();
    const model = manualModel.trim();
    if (!brand || !model) {
      setProductStatus("请填写品牌和型号/产品名。");
      return;
    }

    const ingredientIds = findIngredientIdsInText(manualIngredientText, seedIngredients);

    const nextProduct: Product = {
      id: `manual-${Date.now()}`,
      brand,
      model,
      category: manualCategory,
      ingredientIds: Array.from(new Set(ingredientIds)),
      notes: manualIngredientText.trim() || "手工添加，待补全成分。",
      image: manualImage || undefined
    };

    const nextProducts = [...localProducts, nextProduct];
    if (!saveLocalProducts(nextProducts)) return;
    setSelectedIds((current) => [...current, nextProduct.id]);
    setManualBrand("");
    setManualModel("");
    setManualIngredientText("");
    setManualImage("");
    setOcrImageFile(null);
    setOcrConfidence(null);
    setOcrMatches([]);
    setOcrUnmatchedFragments([]);
    setOcrReview(idleOcrReview);
  };

  const addExternalProduct = (product: Product) => {
    if (!ensureActiveRoutine()) return;
    const exists = allProducts.some((item) => item.id === product.id);
    if (!exists) {
      if (!saveLocalProducts([...localProducts, product])) return;
    }
    setSelectedIds((current) => (current.includes(product.id) ? current : [...current, product.id]));
    setSelectedCategory(product.category);
  };

  const searchExternalProducts = async () => {
    const keyword = externalSearch.trim();
    if (!keyword || externalLoading) return;

    setExternalLoading(true);
    setExternalStatus("查询中");
    try {
      const results = await searchOpenBeautyFactsProducts(keyword, seedIngredients);
      setExternalProducts(results);
      setExternalStatus(results.length ? `找到 ${results.length} 个外部产品` : "未找到可导入产品");
    } catch {
      setExternalProducts([]);
      setExternalStatus("外部查询失败");
    } finally {
      setExternalLoading(false);
    }
  };

  const removeLocalProduct = (productId: string) => {
    if (!ensureActiveRoutine()) return;
    if (!saveLocalProducts(localProducts.filter((product) => product.id !== productId))) return;
    setSelectedIds((current) => current.filter((id) => id !== productId));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">BI</div>
        <button className={activePanel === "conditions" ? "nav-item active" : "nav-item"} onClick={() => setActivePanel("conditions")} title="情况">
          <SlidersHorizontal />
          <span>情况</span>
        </button>
        <button className={activePanel === "products" ? "nav-item active" : "nav-item"} onClick={() => setActivePanel("products")} title="产品库">
          <Search />
          <span>产品库</span>
        </button>
        <button className={activePanel === "ingredients" ? "nav-item active" : "nav-item"} onClick={() => setActivePanel("ingredients")} title="成分库">
          <FlaskConical />
          <span>成分库</span>
        </button>
        <button className={activePanel === "analysis" ? "nav-item active" : "nav-item"} onClick={() => setActivePanel("analysis")} title="搭配分析">
          <Layers />
          <span>分析</span>
        </button>
      </aside>

      <section className="workspace">
        <header className={`topbar illustrated ${activePanel}-hero`}>
          <div className="topbar-copy">
            <p className="eyebrow">{activeHero.eyebrow}</p>
            <h1>{activeHero.title}</h1>
          </div>
          <img className="topbar-art-image" src={activeHero.image} alt="" />
          {activePanel !== "conditions" && (
            <div className="routine-count">{activeRoutine ? `${selectedProducts.length} 个产品已选` : "未选用户组合"}</div>
          )}
        </header>

        <section className={activeRoutine ? "routine-profile-bar connected" : "routine-profile-bar setup"}>
          {activeRoutine ? (
            <>
              <button className="routine-name-button" onClick={copyRoutineCode} title="复制同步码">
                <Users />
                <span>
                  <strong>{activeRoutine.name}</strong>
                  <small>同步码 {activeRoutine.code}</small>
                </span>
                <Copy />
              </button>
              <div className="routine-sync-state" aria-live="polite">
                <i />
                <span>{routineStatus}</span>
              </div>
              <button className="routine-switch-button" onClick={switchUserRoutine}>
                <RefreshCw />
                切换组合
              </button>
            </>
          ) : (
            <>
              <div className="routine-setup-intro">
                <Cloud />
                <span>
                  <strong>先选择用户组合</strong>
                  <small>手机和电脑使用同一同步码，即可接着编辑</small>
                </span>
              </div>
              <div className="routine-setup-actions">
                <div className="routine-create-group">
                  <input
                    value={newRoutineName}
                    maxLength={20}
                    onChange={(event) => setNewRoutineName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void createUserRoutine();
                    }}
                    placeholder="输入名称，如：日常护理"
                  />
                  <label className="routine-inherit-toggle">
                    <input
                      type="checkbox"
                      checked={inheritCurrentRoutine}
                      onChange={(event) => setInheritCurrentRoutine(event.target.checked)}
                    />
                    带入本机现有选择
                  </label>
                  <button className="primary-btn compact" onClick={() => void createUserRoutine()} disabled={routineBusy}>
                    <Plus />
                    新建组合
                  </button>
                </div>
                <span className="routine-divider">或</span>
                <div className="routine-open-group">
                  <input
                    value={routineCode}
                    maxLength={6}
                    onChange={(event) => setRoutineCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void openUserRoutine();
                    }}
                    placeholder="6 位同步码"
                  />
                  <button className="routine-open-button" onClick={() => void openUserRoutine()} disabled={routineBusy}>
                    <RefreshCw />
                    打开组合
                  </button>
                </div>
              </div>
              {recentRoutines.length > 0 && (
                <div className="routine-recents">
                  <span>本机最近</span>
                  {recentRoutines.map((routine) => (
                    <button key={routine.code} onClick={() => void openUserRoutine(routine.code)} disabled={routineBusy}>
                      {routine.name}<small>{routine.code}</small>
                    </button>
                  ))}
                </div>
              )}
              <p className="routine-setup-status" aria-live="polite">{routineStatus}</p>
            </>
          )}
        </section>

        {!activeRoutine && activePanel !== "ingredients" && (
          <section className="routine-lock-panel">
            <Users />
            <h2>选择用户组合后开始</h2>
            <p>情况与产品勾选会实时保存到当前组合，避免不同设备各存一份。</p>
          </section>
        )}

        {activeRoutine && activePanel === "conditions" && (
          <section className="panel full">
            <div className="condition-block standalone">
              <div className="section-title">
                <h2>情况</h2>
              </div>
              <div className="condition-switches">
                {skinConcernOptions.map((concern) => {
                  const active = skinConcerns.includes(concern);
                  return (
                    <button className={active ? "condition-switch active" : "condition-switch"} key={concern} onClick={() => toggleSkinConcern(concern)}>
                      <span className="condition-icon">
                        <img src={skinConcernImageMap[concern]} alt="" />
                      </span>
                      <div className="condition-copy">
                        <strong>{concern}</strong>
                        <span className="condition-desc">{concernDescriptions[concern]}</span>
                      </div>
                      <span className="toggle-track"><span className="toggle-thumb" /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {activeRoutine && activePanel === "products" && (
          <div className="grid two-col">
            <section className="panel">
              <div className="section-title">
                <h2>分类查找</h2>
                <span>{selectedCategory}</span>
              </div>
              <div className="search-box category-search">
                <Search />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="搜索当前分类内的品牌、产品或成分"
                />
              </div>
              <div className="category-tabs">
                {categories.map((category) => (
                  <button
                    className={selectedCategory === category ? "active" : ""}
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span>{category}</span>
                    {getSelectedCountByCategory(category) > 0 && <b>{getSelectedCountByCategory(category)}</b>}
                  </button>
                ))}
              </div>
              <div className="product-list">
                {categoryProducts.map((product) => {
                  const productIngredients = product.ingredientIds
                    .map((id) => seedIngredients.find((ingredient) => ingredient.id === id)?.name)
                    .filter(Boolean);
                  const selected = selectedIds.includes(product.id);
                  const isLocal = product.id.startsWith("manual-");
                  return (
                    <article className={selected ? "product-card selected" : "product-card"} key={product.id}>
                      {product.image ? <img src={product.image} alt="" /> : <div className="product-avatar">{product.brand.slice(0, 1)}</div>}
                      <div className="product-main">
                        <div className="product-head">
                          <strong>{product.brand} {product.model}</strong>
                          <span>{product.category}</span>
                        </div>
                        <p>{productIngredients.length ? productIngredients.join(" / ") : "未命中已知成分库"}</p>
                      </div>
                      <button className={selected ? "select-pill active" : "select-pill"} onClick={() => toggleSelected(product.id)} title={selected ? "移出分析" : "加入分析"}>
                        {selected ? "✓" : "+"}
                      </button>
                      {isLocal && (
                        <button className="icon-btn danger" onClick={() => removeLocalProduct(product.id)} title="删除手工产品">
                          <Trash2 />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="section-title">
                <h2>手工添加</h2>
                <span>库外产品</span>
              </div>
              {productStatus && <p className="product-status" role="alert">{productStatus}</p>}
              <div className="external-import">
                <div className="search-box external-search">
                  <Search />
                  <input
                    value={externalSearch}
                    onChange={(event) => setExternalSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") searchExternalProducts();
                    }}
                    placeholder="从 Open Beauty Facts 查询产品"
                  />
                </div>
                <button className="primary-btn compact" onClick={searchExternalProducts} disabled={externalLoading}>
                  <Search />
                  {externalLoading ? "查询中" : "查询"}
                </button>
                {externalStatus && <p className="external-status">{externalStatus}</p>}
                {externalProducts.length > 0 && (
                  <div className="external-results">
                    {externalProducts.map((product) => {
                      const productIngredients = product.ingredientIds
                        .map((id) => seedIngredients.find((ingredient) => ingredient.id === id)?.name)
                        .filter(Boolean);
                      const saved = allProducts.some((item) => item.id === product.id);
                      return (
                        <article className="product-card external-card" key={product.id}>
                          {product.image ? <img src={product.image} alt="" /> : <div className="product-avatar">{product.brand.slice(0, 1)}</div>}
                          <div className="product-main">
                            <div className="product-head">
                              <strong>{product.brand} {product.model}</strong>
                              <span>{product.category}</span>
                            </div>
                            <p>{productIngredients.length ? productIngredients.join(" / ") : "外部产品，未命中已知成分库"}</p>
                          </div>
                          <button className={saved ? "select-pill active" : "select-pill"} onClick={() => addExternalProduct(product)} title={saved ? "加入分析" : "导入并加入分析"}>
                            {saved ? "✓" : "+"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
              <label className="upload-box">
                {manualImage ? (
                  <img src={manualImage} alt="" />
                ) : (
                  <span className="upload-empty">
                    <img src={uploadPackage} alt="" />
                    <span>拍照或上传外包装/成分表</span>
                  </span>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
                {manualImage && <span>已上传图片</span>}
              </label>
              <div className="ocr-controls">
                <p>图片只在浏览器内识别；首次加载中英模型需要网络，图片不会上传。</p>
                <button
                  className="secondary-btn compact"
                  disabled={!ocrImageFile || ocrReview.phase === "loading" || ocrReview.phase === "recognizing"}
                  onClick={() => void startOcrRecognition()}
                >
                  {ocrReview.phase === "failed" ? "重新识别" : "识别图片文字"}
                </button>
              </div>
              {ocrReview.phase !== "idle" && (
                <div className={`ocr-status ${ocrReview.phase}`} role="status">
                  <span>{ocrReview.message}</span>
                  {(ocrReview.phase === "loading" || ocrReview.phase === "recognizing") && (
                    <progress value={ocrReview.progress} max={1}>{Math.round(ocrReview.progress * 100)}%</progress>
                  )}
                  {ocrConfidence !== null && <small>识别置信度 {Math.round(ocrConfidence)}%</small>}
                </div>
              )}
              {(ocrMatches.length > 0 || ocrUnmatchedFragments.length > 0) && (
                <div className="ocr-review">
                  {ocrMatches.length > 0 && (
                    <div>
                      <strong>已匹配成分</strong>
                      <ul>
                        {ocrMatches.map((match) => (
                          <li key={match.ingredientId}>{match.ingredientName} · {match.basis} · {match.matchedAlias}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ocrUnmatchedFragments.length > 0 && (
                    <div className="ocr-unmatched">
                      <strong>未识别片段</strong>
                      <ul>{ocrUnmatchedFragments.map((fragment) => <li key={fragment}>{fragment}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
              <div className="form-stack">
                <input value={manualBrand} onChange={(event) => setManualBrand(event.target.value)} placeholder="品牌" />
                <input value={manualModel} onChange={(event) => setManualModel(event.target.value)} placeholder="型号/产品名" />
                <select value={manualCategory} onChange={(event) => setManualCategory(event.target.value as ProductCategory)}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <textarea
                  value={manualIngredientText}
                  onChange={(event) => handleManualIngredientTextChange(event.target.value)}
                  placeholder="粘贴或手输成分表，例如：Niacinamide, Retinol, Ceramide NP"
                />
                <button className="primary-btn" onClick={addManualProduct}>
                  <Upload />
                  添加到产品库
                </button>
              </div>
            </section>
          </div>
        )}

        {activePanel === "ingredients" && (
          <section className="panel full">
            <div className="section-title">
              <h2>成分库</h2>
              <span>{filteredIngredients.length} / {seedIngredients.length} 个</span>
            </div>
            <div className="ingredient-library">
              <div className="ingredient-tools">
                <div className="search-box ingredient-search">
                  <Search />
                  <input
                    value={ingredientSearch}
                    onChange={(event) => setIngredientSearch(event.target.value)}
                    placeholder="搜索成分、英文名、功效或风险"
                  />
                </div>
                <div className="ingredient-filter-row">
                  {(["全部", ...ingredientTagOptions] as Array<IngredientTag | "全部">).map((tag) => (
                    <button
                      className={selectedIngredientTag === tag ? "active" : ""}
                      key={tag}
                      onClick={() => setSelectedIngredientTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ingredient-browser">
                {activeIngredient && (
                  <article className="ingredient-detail">
                    <div className="ingredient-detail-head">
                      <div>
                        <p className="eyebrow">Ingredient Detail</p>
                        <h2>{activeIngredient.name}</h2>
                        <span>{activeIngredient.aliases.join(" / ") || "暂无别名"}</span>
                      </div>
                      <b>{activeIngredient.tags[0]}</b>
                    </div>
                    <div className="tag-row">
                      {activeIngredient.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      {activeIngredient.riskLevel && <span className={`risk-${activeIngredient.riskLevel}`}>风险{activeIngredient.riskLevel}</span>}
                    </div>
                    <p>{activeIngredient.plainEffect}</p>
                    {activeIngredient.caution && <em>{activeIngredient.caution}</em>}
                    {activeIngredient.riskNotes?.length && (
                      <div className="risk-note-list">
                        {activeIngredient.riskNotes.map((note) => <span key={note}>{note}</span>)}
                      </div>
                    )}
                    {activeIngredient.avoidFor?.length && <small className="risk-avoid">慎用情况：{activeIngredient.avoidFor.join("、")}</small>}
                    {activeIngredient.routineTips?.length && <small className="risk-tip">使用建议：{activeIngredient.routineTips.join("；")}</small>}
                  </article>
                )}

                <div className="ingredient-list">
                  {filteredIngredients.map((ingredient) => (
                    <button
                      className={activeIngredient?.id === ingredient.id ? "ingredient-row active" : "ingredient-row"}
                      key={ingredient.id}
                      onClick={() => setActiveIngredientId(ingredient.id)}
                    >
                      <span>
                        <strong>{ingredient.name}</strong>
                        <small>{ingredient.aliases.slice(0, 2).join(" / ") || "成分"} · 风险{ingredient.riskLevel ?? "低"}</small>
                      </span>
                      <b>{ingredient.tags[0]}</b>
                    </button>
                  ))}
                  {!filteredIngredients.length && <p className="ingredient-empty">没有匹配成分</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeRoutine && activePanel === "analysis" && (
          <div className="grid two-col">
            <section className="panel">
              <div className="section-title">
                <h2>当前组合</h2>
                <span>{selectedProducts.length} 个</span>
              </div>
              <div className="selected-list">
                {selectedProducts.map((product) => {
                  const overlapsRecommendation = recommendedIdSet.has(product.id);
                  return (
                    <button className={overlapsRecommendation ? "overlap" : ""} key={product.id} onClick={() => toggleSelected(product.id)}>
                      <span>{product.brand} {product.model}</span>
                      <small>
                        {product.category}
                        {overlapsRecommendation && <b>推荐重合</b>}
                      </small>
                    </button>
                  );
                })}
              </div>

              {recommendation && (
                <div className="recommendation-block">
                  <div className="section-title compact">
                    <h2>推荐组合</h2>
                  </div>
                  <div className="selected-list">
                    {recommendedProducts.map((product) => {
                      const alreadySelected = selectedIds.includes(product.id);
                      const standalone = standaloneRecommendedIdSet.has(product.id);
                      const usagePlan = recommendation.usagePlans[product.id];
                      return (
                        <article className={alreadySelected ? "recommend-card overlap" : "recommend-card"} key={product.id}>
                          <button onClick={() => toggleSelected(product.id)}>
                            <span>{product.brand} {product.model}</span>
                            <small>
                              {product.category}
                              {standalone && <b>单独步骤</b>}
                              {alreadySelected && <b>当前已有</b>}
                            </small>
                          </button>
                          {usagePlan && (
                            <div className="routine-tags">
                              <b>{usagePlan.step}</b>
                              {usagePlan.timing.map((tag) => <span key={`${product.id}-time-${tag}`}>{tag}</span>)}
                              {usagePlan.placement.map((tag) => <span key={`${product.id}-place-${tag}`}>{tag}</span>)}
                            </div>
                          )}
                          {shouldCollapseRecommendationReason(product.id, selectedIds) ? (
                            <details className="explanation-details">
                              <summary>查看推荐依据</summary>
                              <p>{recommendation.reasons[product.id]}</p>
                            </details>
                          ) : <p>{recommendation.reasons[product.id]}</p>}
                        </article>
                      );
                    })}
                  </div>
                  <div className="recommend-advantages">
                    <div className="section-title compact">
                      <h2>针对情况的推荐</h2>
                      <span>{sortedConcernCoverage.length} 项情况</span>
                    </div>
                    {sortedConcernCoverage.length > 0 && (
                      <div className="concern-coverage-list">
                        {sortedConcernCoverage.map((coverage) => (
                          <article className={`concern-coverage-card ${coverage.status}`} key={coverage.concern}>
                            <div>
                              <strong>{coverage.concern}</strong>
                              <span>{coverage.status}</span>
                              <small>{coverage.candidateCount} 个合格候选</small>
                            </div>
                            {shouldCollapseCoverageReason(coverage) ? (
                              <details className="explanation-details">
                                <summary>查看覆盖依据</summary>
                                <p>{coverage.reason}</p>
                              </details>
                            ) : <p>{coverage.reason}</p>}
                          </article>
                        ))}
                      </div>
                    )}
                    {recommendation.advantages.length > 0 && (
                      <>
                        <div className="section-title compact support-title">
                          <h2>组合安全补充</h2>
                          <span>{recommendation.advantages.length} 条</span>
                        </div>
                        <div className="advantage-list compact-list">
                          {recommendation.advantages.map((advantage) => <p key={advantage}>{advantage}</p>)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="section-title">
                <h2>白话分析</h2>
                <span>{analysis.length} 条结果</span>
              </div>
              <div className="analysis-list">
                {analysisGroups.map((group) => (
                  <article className={`analysis-card analysis-group ${group.id}`} key={group.id}>
                    <span>{group.label}</span>
                    <ul className="analysis-group-list">
                      {group.items.map((item) => <li key={`${item.type}-${item.title}`}>{item.title}</li>)}
                    </ul>
                    <details className="explanation-details">
                      <summary>查看分析说明</summary>
                      <div className="analysis-detail-list">
                        {group.items.map((item) => (
                          <p key={`${item.type}-${item.title}`}><strong>{item.title}</strong>{item.detail}</p>
                        ))}
                      </div>
                    </details>
                  </article>
                ))}
                {ungroupedAnalysis.map((item) => (
                  <article className={`analysis-card ${item.type}`} key={`${item.type}-${item.title}`}>
                    <span>{item.type}</span>
                    <h3>{item.title}</h3>
                    {shouldCollapseAnalysisDetail(item) ? (
                      <details className="explanation-details">
                        <summary>查看分析说明</summary>
                        <p>{item.detail}</p>
                      </details>
                    ) : <p>{item.detail}</p>}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
