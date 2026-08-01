import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { useState } from "react";
import { products as seedProducts } from "@shared/data/catalog";
import type { Product, ProductCategory } from "@shared/types";
import { categories } from "../../shared/constants";
import {
  getAllProducts,
  getLocalProducts,
  getSelectedIds,
  ingredientNames,
  matchIngredientIds,
  setLocalProducts,
  setSelectedIds
} from "../../shared/storage";
import "../../shared/page.css";
import "./index.css";
import heroProducts from "../../assets/illustrations/hero-products.png";
import uploadPackage from "../../assets/illustrations/upload-package.png";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("精华");
  const [productSearch, setProductSearch] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualCategory, setManualCategory] = useState<ProductCategory>("精华");
  const [manualIngredientText, setManualIngredientText] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [failedImageIds, setFailedImageIds] = useState<string[]>([]);

  const updateSelectedIds = (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    setSelectedIds(uniqueIds);
    setSelectedIdsState(uniqueIds);
    return uniqueIds;
  };

  const refresh = () => {
    setProducts(getAllProducts());
    updateSelectedIds(getSelectedIds());
  };

  useDidShow(refresh);

  const productSearchKeyword = productSearch.trim().toLowerCase();
  const categoryProducts = products
    .filter((product) => {
      if (product.category !== selectedCategory) return false;
      if (!productSearchKeyword) return true;
      return `${product.brand} ${product.model} ${product.category} ${ingredientNames(product)} ${product.notes ?? ""}`
        .toLowerCase()
        .includes(productSearchKeyword);
    })
    .slice(0, 24);
  const getSelectedCountByCategory = (category: ProductCategory) =>
    products.filter((product) => product.category === category && selectedIds.includes(product.id)).length;

  const toggleSelected = (productId: string) => {
    const currentIds = Array.from(new Set(getSelectedIds()));
    updateSelectedIds(
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId]
    );
  };

  const chooseImage = async () => {
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"]
      });
      const file = result.tempFiles[0];
      if (!file?.tempFilePath) return;

      try {
        const saved = await Taro.saveFile({ tempFilePath: file.tempFilePath });
        if (!saved.savedFilePath) throw new Error("Missing saved file path");
        setManualImage(saved.savedFilePath);
      } catch {
        Taro.showToast({ title: "图片保存失败，请重试", icon: "none" });
      }
    } catch {
      Taro.showToast({ title: "图片选择失败", icon: "none" });
    }
  };

  const addManualProduct = () => {
    const brand = manualBrand.trim();
    const model = manualModel.trim();
    if (!brand || !model) {
      Taro.showToast({ title: "先填写品牌和型号", icon: "none" });
      return;
    }

    const nextProduct: Product = {
      id: `manual-${Date.now()}`,
      brand,
      model,
      category: manualCategory,
      ingredientIds: matchIngredientIds(manualIngredientText),
      notes: manualIngredientText.trim() || "手工添加，成分仅作本地参考。",
      image: manualImage || undefined
    };
    const nextLocalProducts = [...getLocalProducts(), nextProduct];
    setLocalProducts(nextLocalProducts);
    updateSelectedIds([...getSelectedIds(), nextProduct.id]);
    setManualBrand("");
    setManualModel("");
    setManualIngredientText("");
    setManualImage("");
    setProducts([...seedProducts, ...nextLocalProducts]);
    Taro.showToast({ title: "已添加", icon: "success" });
  };

  const removeLocalProduct = (productId: string) => {
    const nextLocalProducts = getLocalProducts().filter((product) => product.id !== productId);
    const nextSelectedIds = getSelectedIds().filter((id) => id !== productId);
    setLocalProducts(nextLocalProducts);
    updateSelectedIds(nextSelectedIds);
    setProducts([...seedProducts, ...nextLocalProducts]);
    setFailedImageIds((ids) => ids.filter((id) => id !== productId));
  };

  return (
    <View className="page">
      <View className="top illustrated">
        <View>
          <Text className="eyebrow">Product Library</Text>
          <Text className="title">产品库</Text>
        </View>
        <Image className="top-art-image" src={heroProducts} mode="aspectFit" />
        <Text className="count-pill">{products.length} 个</Text>
      </View>

      <View className="panel">
        <View className="section-title">
          <Text>分类查找</Text>
          <Text>{selectedCategory}</Text>
        </View>
        <Input
          className="product-search-input"
          value={productSearch}
          placeholder="搜索当前分类内的品牌、产品或成分"
          onInput={(event) => setProductSearch(String(event.detail.value))}
        />
        <View className="grid-tabs">
          {categories.map((category) => {
            const selectedCount = getSelectedCountByCategory(category);
            return (
              <Button
                className={category === selectedCategory ? "tab-chip active" : "tab-chip"}
                key={category}
                onClick={() => setSelectedCategory(category)}
              >
                <Text>{category}</Text>
                {selectedCount > 0 && <Text className="tab-badge">{selectedCount}</Text>}
              </Button>
            );
          })}
        </View>
        {categoryProducts.map((product) => (
          <View className={selectedIds.includes(product.id) ? "product-card selected" : "product-card"} key={product.id}>
            <Button
              className={selectedIds.includes(product.id) ? "select-corner active" : "select-corner"}
              onClick={() => toggleSelected(product.id)}
            >
              {selectedIds.includes(product.id) ? "✓" : "+"}
            </Button>
            <View className="card-head">
              <Text className="card-title">{product.brand} {product.model}</Text>
              <Text className="card-meta">{product.category}</Text>
            </View>
            {product.id.startsWith("manual-") && product.image && (
              failedImageIds.includes(product.id) ? (
                <View className="product-image-fallback">图片已失效</View>
              ) : (
                <Image
                  className="product-image"
                  src={product.image}
                  mode="aspectFill"
                  onError={() => setFailedImageIds((ids) => ids.includes(product.id) ? ids : [...ids, product.id])}
                />
              )
            )}
            <Text className="muted">{ingredientNames(product) || "未命中已知成分库"}</Text>
            <View className="product-actions">
              {product.id.startsWith("manual-") && <Button className="danger-btn" onClick={() => removeLocalProduct(product.id)}>删除</Button>}
            </View>
          </View>
        ))}
      </View>

      <View className="panel">
        <View className="section-title">
          <Text>拍照/手工添加</Text>
          <Text>仅本地保存</Text>
        </View>
        <Button className="upload-card" onClick={chooseImage}>
          {manualImage ? (
            <Image className="upload-image" src={manualImage} mode="aspectFill" />
          ) : (
            <View className="upload-empty">
              <Image className="upload-empty-image" src={uploadPackage} mode="aspectFit" />
              <Text>拍照或上传外包装/成分表</Text>
            </View>
          )}
        </Button>
        <Input className="form-input" value={manualBrand} placeholder="品牌" onInput={(event) => setManualBrand(String(event.detail.value))} />
        <Input className="form-input" value={manualModel} placeholder="型号/产品名" onInput={(event) => setManualModel(String(event.detail.value))} />
        <Picker
          mode="selector"
          range={categories}
          value={categories.indexOf(manualCategory)}
          onChange={(event) => setManualCategory(categories[Number(event.detail.value)])}
        >
          <View className="picker-field">{manualCategory}</View>
        </Picker>
        <Textarea
          className="form-textarea"
          value={manualIngredientText}
          placeholder="粘贴或手输成分表，例如：Niacinamide, Retinol, Ceramide NP"
          onInput={(event) => setManualIngredientText(String(event.detail.value))}
        />
        <Button className="primary-btn" onClick={addManualProduct}>添加到产品库</Button>
        <Text className="muted compliance">上传图片只保存在本机小程序缓存，不上传服务器；成分分析仅作护肤搭配参考，非医疗建议。</Text>
      </View>
    </View>
  );
}
