import { useRouter } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { ingredients } from "@shared/data/catalog";
import { enrichIngredientRisk } from "@shared/data/ingredientRisk";
import "../../shared/page.css";

const riskClassMap: Record<string, string> = { 高: "high", 中: "mid", 低: "low" };
export default function IngredientDetailPage() {
  const id = useRouter().params.id;
  const source = ingredients.find((i) => i.id === id);
  const i = source ? enrichIngredientRisk(source) : undefined;
  return <View className="page">{!i ? <Text className="muted">成分不存在，请返回重新查找</Text> : <View className="ingredient-detail-card">
    <Text className="title">{i.name}</Text><Text className="card-meta detail-alias">{i.aliases.join(" / ") || "暂无别名"}</Text>
    <View className="tag-row">{i.tags.map((t) => <Text className="tag" key={t}>{t}</Text>)}
      <Text className={`tag risk-${riskClassMap[i.riskLevel ?? "低"] ?? "unknown"}`}>风险{i.riskLevel ?? "低"}</Text></View>
    <Text className="muted">{i.plainEffect}</Text>
    {i.caution && <Text className="ingredient-caution">{i.caution}</Text>}
    {i.riskNotes?.map((n) => <Text className="ingredient-risk-note" key={n}>{n}</Text>)}
    {!!i.avoidFor?.length && <Text className="ingredient-risk-avoid">慎用情况：{i.avoidFor.join("、")}</Text>}
    {!!i.routineTips?.length && <Text className="ingredient-risk-tip">使用建议：{i.routineTips.join("；")}</Text>}
  </View>}</View>;
}
