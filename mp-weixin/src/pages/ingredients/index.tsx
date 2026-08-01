import { Button, Image, Input, Text, View } from "@tarojs/components";
import { useState } from "react";
import { ingredients } from "@shared/data/catalog";
import { enrichIngredientRisk } from "@shared/data/ingredientRisk";
import type { IngredientTag } from "@shared/types";
import "../../shared/page.css";
import heroIngredients from "../../assets/illustrations/hero-ingredients.png";

export default function IngredientsPage() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<IngredientTag | "全部">("全部");
  const [activeId, setActiveId] = useState(ingredients[0]?.id ?? "");
  const ingredientsWithRisk = ingredients.map(enrichIngredientRisk);
  const tagOptions = Array.from(new Set(ingredientsWithRisk.flatMap((ingredient) => ingredient.tags)));
  const keyword = search.trim().toLowerCase();
  const filteredIngredients = ingredientsWithRisk.filter((ingredient) => {
    const matchesTag = selectedTag === "全部" || ingredient.tags.includes(selectedTag);
    if (!matchesTag) return false;
    if (!keyword) return true;

    return `${ingredient.name} ${ingredient.aliases.join(" ")} ${ingredient.tags.join(" ")} ${ingredient.plainEffect} ${ingredient.caution ?? ""} ${ingredient.riskLevel ?? ""} ${(ingredient.riskNotes ?? []).join(" ")} ${(ingredient.avoidFor ?? []).join(" ")} ${(ingredient.routineTips ?? []).join(" ")}`
      .toLowerCase()
      .includes(keyword);
  });
  const activeIngredient =
    filteredIngredients.find((ingredient) => ingredient.id === activeId) ??
    filteredIngredients[0] ??
    ingredientsWithRisk[0];

  return (
    <View className="page">
      <View className="top illustrated">
        <View>
          <Text className="eyebrow">Ingredient Library</Text>
          <Text className="title">成分库</Text>
        </View>
        <Image className="top-art-image" src={heroIngredients} mode="aspectFit" />
        <Text className="count-pill">{filteredIngredients.length}/{ingredientsWithRisk.length}</Text>
      </View>

      <View className="panel">
        <View className="section-title">
          <Text>快速查找</Text>
          <Text>{selectedTag}</Text>
        </View>
        <Input
          className="search-input"
          value={search}
          placeholder="搜索成分、英文名、功效或风险"
          onInput={(event) => setSearch(String(event.detail.value))}
        />
        <View className="ingredient-filter-row">
          {(["全部", ...tagOptions] as Array<IngredientTag | "全部">).map((tag) => (
            <Button
              className={selectedTag === tag ? "ingredient-filter active" : "ingredient-filter"}
              key={tag}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </View>
      </View>

      {activeIngredient && (
        <View className="ingredient-detail-card">
          <View className="card-head">
            <View>
              <Text className="card-title">{activeIngredient.name}</Text>
              <Text className="card-meta detail-alias">{activeIngredient.aliases.join(" / ") || "暂无别名"}</Text>
            </View>
            <Text className="tag primary">{activeIngredient.tags[0]}</Text>
          </View>
          <View className="tag-row">
            {activeIngredient.tags.map((tag) => <Text className="tag" key={tag}>{tag}</Text>)}
            {activeIngredient.riskLevel && <Text className={`tag risk-${activeIngredient.riskLevel}`}>风险{activeIngredient.riskLevel}</Text>}
          </View>
          <Text className="muted">{activeIngredient.plainEffect}</Text>
          {activeIngredient.caution && <Text className="ingredient-caution">{activeIngredient.caution}</Text>}
          {activeIngredient.riskNotes?.map((note) => <Text className="ingredient-risk-note" key={note}>{note}</Text>)}
          {Boolean(activeIngredient.avoidFor?.length) && <Text className="ingredient-risk-avoid">慎用情况：{activeIngredient.avoidFor?.join("、")}</Text>}
          {Boolean(activeIngredient.routineTips?.length) && <Text className="ingredient-risk-tip">使用建议：{activeIngredient.routineTips?.join("；")}</Text>}
        </View>
      )}

      <View className="ingredient-compact-list">
        {filteredIngredients.map((ingredient) => (
          <Button
            className={activeIngredient?.id === ingredient.id ? "ingredient-row active" : "ingredient-row"}
            key={ingredient.id}
            onClick={() => setActiveId(ingredient.id)}
          >
            <View>
              <Text className="ingredient-row-title">{ingredient.name}</Text>
              <Text className="ingredient-row-meta">{ingredient.aliases.slice(0, 2).join(" / ") || "成分"} · 风险{ingredient.riskLevel ?? "低"}</Text>
            </View>
            <Text className="ingredient-row-tag">{ingredient.tags[0]}</Text>
          </Button>
        ))}
        {!filteredIngredients.length && <Text className="muted empty-text">没有匹配成分</Text>}
      </View>
    </View>
  );
}
