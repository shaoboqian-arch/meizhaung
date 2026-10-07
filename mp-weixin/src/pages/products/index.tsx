import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Input, Text, View } from "@tarojs/components";
import { useState } from "react";
import type { Product, ProductCategory } from "@shared/types";
import { ingredients } from "@shared/data/catalog";
import { categories } from "../../shared/constants";
import { getAllProducts, getLocalProducts, getSelectedIds, ingredientNames, getSyncHint, toggleStoredId } from "../../shared/storage";
import { filterProducts, pageItems, detailUrl } from "../../shared/product-view";
import { getProductRecommendationRestriction } from "../../shared/recommendation-policy";
import "../../shared/page.css";
import "./index.css";
import heroProducts from "../../assets/illustrations/hero-products.png";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [localIds, setLocalIds] = useState<string[]>([]);
  const [selectedIds, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState<ProductCategory | "全部">("全部");
  const [search, setSearch] = useState("");
  const [localOnly, setLocalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hint, setHint] = useState("");
  const [readError, setReadError] = useState("");
  useDidShow(() => {
    try {
      setProducts(getAllProducts()); setLocalIds(getLocalProducts().map((p) => p.id));
      setSelected(getSelectedIds()); setHint(getSyncHint()); setReadError("");
    } catch (e) { setReadError(e instanceof Error ? e.message : "本机读取失败，原稿保留"); }
  });
  const filtered = filterProducts(products, ingredients, { search, category, localOnly, localIds });
  const visible = pageItems(filtered, page);
  const toggle = (id: string) => {
    try { setSelected(toggleStoredId(id)); setHint(getSyncHint()); }
    catch { Taro.showToast({ title: "保存失败，原稿保留", icon: "none" }); }
  };
  return <View className="page">
    <View className="top illustrated"><View><Text className="eyebrow">Product Library</Text><Text className="title">产品库</Text></View>
      <Image className="top-art-image" src={heroProducts} mode="aspectFit" /><Text className="count-pill">{products.length} 个</Text></View>
    <Text className="muted">{hint}</Text>
    {readError ? <View className="panel"><Text>{readError}</Text></View> : <>
      <View className="panel">
        <View className="section-title"><Text>查找与添加</Text></View>
        <Button className="primary-btn" onClick={() => Taro.navigateTo({ url: "/pages/product-add/index" })}>添加我的产品</Button>
        <View className="browse-mode">
          <Button className={!localOnly ? "ingredient-filter active" : "ingredient-filter"} onClick={() => { setLocalOnly(false); setPage(1); }}>全部产品</Button>
          <Button className={localOnly ? "ingredient-filter active" : "ingredient-filter"} onClick={() => { setLocalOnly(true); setPage(1); }}>我的添加</Button>
        </View>
        <Input className="product-search-input" value={search} placeholder="跨分类搜索品牌、产品或成分"
          onInput={(e) => { setSearch(String(e.detail.value)); setPage(1); }} />
        {search.trim() ? <Text className="muted">搜索全部分类；清空搜索后恢复分类浏览</Text> :
          <View className="browse-categories">{(["全部", ...categories] as const).map((c) =>
            <Button key={c} className={c === category ? "ingredient-filter active" : "ingredient-filter"}
              onClick={() => { setCategory(c); setPage(1); }}>{c}</Button>)}</View>}
        <Text className="muted">显示 {visible.length} / {filtered.length} 项 · 已选 {selectedIds.length} 项</Text>
      </View>
      {visible.map((p) => <View key={p.id} className={selectedIds.includes(p.id) ? "product-card selected" : "product-card"}>
        <Button className={selectedIds.includes(p.id) ? "select-corner active" : "select-corner"} onClick={() => toggle(p.id)}>{selectedIds.includes(p.id) ? "✓" : "+"}</Button>
        <View className="card-head"><Button className="card-title product-title-link" onClick={() => Taro.navigateTo({ url: detailUrl("product", p.id) })}>{p.brand} {p.model}</Button><Text className="card-meta">{p.category}</Text></View>
        <Text className="muted">{ingredientNames(p) || "成分信息不足"}</Text>
        {getProductRecommendationRestriction(p, ingredients) && <Text className="muted">用药信息待核对 · 不参与自动推荐</Text>}
      </View>)}
      {!filtered.length && <View className="panel"><Text className="muted">没有匹配产品，可清空搜索或手工添加</Text></View>}
      {visible.length < filtered.length && <Button className="primary-btn" onClick={() => setPage((p) => p + 1)}>继续加载</Button>}
    </>}
  </View>;
}
