// Offline component simulation, NOT a WeChat renderer or a production-data session.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import Taro, { setTestNavigator } from "@tarojs/taro";
import AnalysisPage from "../src/pages/analysis";
import ConditionsPage from "../src/pages/conditions";
import ProductsPage from "../src/pages/products";
import IngredientsPage from "../src/pages/ingredients";
import ProductAddPage from "../src/pages/product-add";
import ProductDetailPage from "../src/pages/product-detail";
import IngredientDetailPage from "../src/pages/ingredient-detail";
import { products, ingredients } from "../../src/data/catalog";
import "../src/app.css";

const retinol = products.find((p) => p.ingredientIds.some((id) => ingredients.find((i) => i.id === id)?.tags.includes("视黄醇")));
const acid = products.find((p) => p.category === "精华" && p.ingredientIds.some((id) => ingredients.find((i) => i.id === id)?.tags.includes("酸类焕肤")));
const notesBasic = new URLSearchParams(window.location.search).get("fixture") === "notes-basic";
Taro.setStorageSync("beauty-selected-ids", notesBasic ? ["freeplus-cleanser", "cerave-cream", "elta-md", "laroche-b5"]
  : [retinol?.id, acid?.id, "elta-md", "vichy-89", "olay-light", "cosrx-snail"].filter(Boolean));
Taro.setStorageSync("beauty-skin-concerns", notesBasic ? [] : ["敏感", "干燥", "色斑"]);
function Preview() {
  const [page, setPage] = useState("analysis");
  setTestNavigator((url) => {
    if (url === "back") { window.history.replaceState({}, "", "/"); setPage("products"); return; }
    const target = new URL(url, window.location.origin);
    window.history.replaceState({}, "", target.search || "/");
    setPage(target.pathname.includes("product-add") ? "add" : target.pathname.includes("product-detail") ? "productDetail" : "ingredientDetail");
  });
  const tab = (name: string) => { window.history.replaceState({}, "", "/"); setPage(name); };
  return <>
    <div style={{ padding: 12, background: "#fff1ca", fontSize: 14 }}>组件交互模拟 · 非微信真机 · 合成测试数据</div>
    <div style={{ display: "flex", padding: 8 }}>
      <button onClick={() => tab("analysis")}>搭配</button><button onClick={() => tab("products")}>产品</button><button onClick={() => tab("ingredients")}>成分</button><button onClick={() => tab("conditions")}>我的</button>
    </div>
    {page === "analysis" ? <AnalysisPage /> : page === "conditions" ? <ConditionsPage /> : page === "products" ? <ProductsPage /> : page === "ingredients" ? <IngredientsPage /> : page === "add" ? <ProductAddPage /> : page === "productDetail" ? <ProductDetailPage /> : <IngredientDetailPage />}
  </>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
