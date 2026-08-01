import type { ProductCategory, SkinConcern } from "@shared/types";

export const categories: ProductCategory[] = [
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
  "祛痘护理",
  "颈部护理"
];

export const skinConcernOptions: SkinConcern[] = [
  "痘多",
  "干燥",
  "敏感",
  "泛红",
  "出油多",
  "毛孔粗",
  "黑头",
  "暗沉",
  "色斑",
  "屏障弱",
  "颈纹",
  "松弛",
  "纹路"
];

export const concernMarks: Record<SkinConcern, string> = {
  痘多: "痘",
  干燥: "干",
  敏感: "敏",
  泛红: "红",
  出油多: "油",
  毛孔粗: "孔",
  黑头: "黑",
  暗沉: "暗",
  色斑: "斑",
  屏障弱: "障",
  颈纹: "颈",
  松弛: "松",
  纹路: "纹"
};

export const defaultSelectedIds = ["skinceuticals-ce", "elta-md"];
