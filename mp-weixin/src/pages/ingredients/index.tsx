import Taro from "@tarojs/taro";
import { Button, Image, Input, Text, View } from "@tarojs/components";
import { useState } from "react";
import { ingredients } from "@shared/data/catalog";
import { enrichIngredientRisk } from "@shared/data/ingredientRisk";
import type { IngredientTag } from "@shared/types";
import { detailUrl, pageItems } from "../../shared/product-view";
import "../../shared/page.css";
import heroIngredients from "../../assets/illustrations/hero-ingredients.png";

const enriched = ingredients.map(enrichIngredientRisk);
const tags = Array.from(new Set(enriched.flatMap((i) => i.tags)));
export default function IngredientsPage() {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<IngredientTag | "全部">("全部");
  const [page, setPage] = useState(1);
  const keyword = search.normalize("NFKC").trim().toLowerCase();
  const filtered = enriched.filter((i) => (tag === "全部" || i.tags.includes(tag)) &&
    (!keyword || [i.name, ...i.aliases, ...i.tags, i.plainEffect, i.caution ?? "", ...(i.riskNotes ?? [])].join(" ").normalize("NFKC").toLowerCase().includes(keyword)));
  const visible = pageItems(filtered, page);
  return <View className="page">
    <View className="top illustrated"><View><Text className="eyebrow">Ingredient Library</Text><Text className="title">成分库</Text></View>
      <Image className="top-art-image" src={heroIngredients} mode="aspectFit" /><Text className="count-pill">{filtered.length}/{enriched.length}</Text></View>
    <View className="panel"><View className="section-title"><Text>快速查找</Text><Text>{tag}</Text></View>
      <Input className="search-input" value={search} placeholder="搜索成分、英文名、功效或风险"
        onInput={(e) => { setSearch(String(e.detail.value)); setPage(1); }} />
      <View className="ingredient-filter-row">{(["全部", ...tags] as Array<IngredientTag | "全部">).map((t) =>
        <Button key={t} className={tag === t ? "ingredient-filter active" : "ingredient-filter"} onClick={() => { setTag(t); setPage(1); }}>{t}</Button>)}</View>
      <Text className="muted">显示 {visible.length} / {filtered.length} 项</Text>
    </View>
    <View className="ingredient-compact-list">{visible.map((i) =>
      <Button className="ingredient-row" key={i.id} onClick={() => Taro.navigateTo({ url: detailUrl("ingredient", i.id) })}>
        <View><Text className="ingredient-row-title">{i.name}</Text><Text className="ingredient-row-meta">{i.aliases.slice(0, 2).join(" / ") || "成分"} · 风险{i.riskLevel ?? "低"}</Text></View>
        <Text className="ingredient-row-tag">{i.tags[0]}</Text></Button>)}
      {!filtered.length && <Text className="muted empty-text">没有匹配成分</Text>}
    </View>
    {visible.length < filtered.length && <Button className="primary-btn" onClick={() => setPage((p) => p + 1)}>继续加载</Button>}
  </View>;
}
