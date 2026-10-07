import type { AnalysisResult, ConcernCoverage } from "@shared/types";
export const analysisItemKey = (item: AnalysisResult) => JSON.stringify([
  item.type, item.title, item.detail, [...item.productIds].sort()
]);

export const sortCoverage = (items: ConcernCoverage[]) => {
  const priority = { 推荐补入: 0, 暂未覆盖: 1, 已有覆盖: 2 };
  return [...items].sort((a, b) => priority[a.status] - priority[b.status]);
};
export const groupAnalysis = (items: AnalysisResult[]) => {
  const unique = items.filter((item, index) => items.findIndex((other) => analysisItemKey(other) === analysisItemKey(item)) === index);
  return {
    caution: unique.filter((i) => i.type === "互相克制" || i.type === "互相抵消"),
    cooperation: unique.filter((i) => i.type === "互相配合"),
    unknown: unique.filter((i) => i.type === "信息不足")
  };
};
