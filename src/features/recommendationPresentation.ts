import type { AnalysisResult, ConcernCoverage, Product } from "../types";

export interface AnalysisDisplayGroup {
  id: "conflict" | "cooperation";
  label: "互相克制" | "互相配合";
  items: AnalysisResult[];
}

export const sortRecommendedProductsForDisplay = (products: Product[], selectedIds: string[]) => {
  const selectedIdSet = new Set(selectedIds);
  return [...products].sort(
    (left, right) => Number(selectedIdSet.has(left.id)) - Number(selectedIdSet.has(right.id))
  );
};

export const sortConcernCoverageForDisplay = (coverage: ConcernCoverage[]) =>
  [...coverage].sort(
    (left, right) => Number(left.status !== "推荐补入") - Number(right.status !== "推荐补入")
  );

export const sortAnalysisForDisplay = (items: AnalysisResult[]) =>
  [...items].sort(
    (left, right) => Number(left.type !== "互相克制") - Number(right.type !== "互相克制")
  );

const isConflictAnalysis = (item: AnalysisResult) =>
  item.type === "互相克制" || item.type === "互相抵消";

export const groupAnalysisForDisplay = (items: AnalysisResult[]): AnalysisDisplayGroup[] => {
  const sortedItems = sortAnalysisForDisplay(items);
  const conflicts = sortedItems.filter(isConflictAnalysis);
  const cooperation = sortedItems.filter((item) => item.type === "互相配合");

  return [
    ...(conflicts.length ? [{ id: "conflict" as const, label: "互相克制" as const, items: conflicts }] : []),
    ...(cooperation.length ? [{ id: "cooperation" as const, label: "互相配合" as const, items: cooperation }] : [])
  ];
};

export const getUngroupedAnalysisForDisplay = (items: AnalysisResult[]) =>
  sortAnalysisForDisplay(items).filter(
    (item) => !isConflictAnalysis(item) && item.type !== "互相配合"
  );

export const shouldCollapseRecommendationReason = (productId: string, selectedIds: string[]) =>
  selectedIds.includes(productId);

export const shouldCollapseCoverageReason = (coverage: ConcernCoverage) => coverage.status === "已有覆盖";

export const shouldCollapseAnalysisDetail = (item: AnalysisResult) =>
  isConflictAnalysis(item) || item.type === "互相配合";
