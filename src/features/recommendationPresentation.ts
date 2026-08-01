import type { AnalysisResult, ConcernCoverage, Product } from "../types";

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

export const shouldCollapseRecommendationReason = (productId: string, selectedIds: string[]) =>
  selectedIds.includes(productId);

export const shouldCollapseCoverageReason = (coverage: ConcernCoverage) => coverage.status === "已有覆盖";

export const shouldCollapseAnalysisDetail = (item: AnalysisResult) => item.type === "互相配合";
