import type { IngredientRelation } from "../types";

export const ingredientRelations: IngredientRelation[] = [
  {
    id: "cleanser-leave-on",
    type: "互相抵消",
    leftTags: ["清洁卸除"],
    rightTags: ["保湿修护", "屏障修护", "抗氧化", "美白淡斑", "视黄醇", "酸类焕肤", "防晒"],
    title: "清洁类会洗掉留肤类效果",
    detail: "卸妆水、洁面、清洁面膜负责带走油脂和彩妆；精华、面霜、防晒负责留在皮肤上。两类不要当成同一步叠加。",
    priority: 100
  },
  {
    id: "retinoid-acid",
    type: "互相克制",
    leftTags: ["视黄醇"],
    rightTags: ["酸类焕肤"],
    title: "A醇和酸类同晚叠加刺激高",
    detail: "A醇和酸类都在推动角质更新，同晚叠加容易干、红、刺痛。更稳的是分晚使用，中间穿插修护。",
    priority: 95
  },
  {
    id: "retinoid-bpo",
    type: "互相克制",
    leftTags: ["视黄醇"],
    rightIngredientIds: ["benzoyl-peroxide"],
    title: "A醇不适合同晚叠过氧化苯甲酰",
    detail: "两者都容易带来干燥脱皮，同时用会显著抬高刺激风险。痘痘护理和抗老护理分开夜晚更稳。",
    priority: 92
  },
  {
    id: "multi-acid",
    type: "互相克制",
    leftTags: ["酸类焕肤"],
    rightTags: ["酸类焕肤"],
    title: "酸类重复叠加不是效果翻倍",
    detail: "多个酸类产品叠加更容易造成过度去角质。选一个主力酸类，再接保湿修护即可。",
    priority: 90
  },
  {
    id: "acid-irritant",
    type: "互相克制",
    leftTags: ["酸类焕肤"],
    rightTags: ["风险刺激"],
    title: "酸类叠刺激源容易翻车",
    detail: "酸类本身会降低耐受，再叠香精、薄荷醇、高浓度酒精或强祛痘成分，更容易刺痛泛红。",
    priority: 86
  },
  {
    id: "retinoid-irritant",
    type: "互相克制",
    leftTags: ["视黄醇"],
    rightTags: ["风险刺激"],
    title: "A醇期要减少额外刺激",
    detail: "A醇建立耐受期间，香精、薄荷醇、高酒精感产品会增加不适。优先搭修护和锁水。",
    priority: 84
  },
  {
    id: "vitc-sunscreen",
    type: "互相配合",
    leftTags: ["抗氧化"],
    rightTags: ["防晒"],
    title: "抗氧化和防晒适合白天组合",
    detail: "抗氧化负责应对氧化压力，防晒负责减少紫外线伤害。白天组合比单独用抗氧化更有意义。",
    priority: 80
  },
  {
    id: "vitc-ferulic-e",
    type: "互相配合",
    leftIngredientIds: ["vitamin-c"],
    rightIngredientIds: ["ferulic-acid", "vitamin-e"],
    title: "维C搭阿魏酸/维E更完整",
    detail: "维C、阿魏酸、维E常见于抗氧化组合，思路是提高稳定性并补足抗氧化链路。",
    priority: 78
  },
  {
    id: "active-repair",
    type: "互相配合",
    leftTags: ["酸类焕肤", "视黄醇", "祛痘"],
    rightTags: ["屏障修护", "舒缓", "保湿修护"],
    title: "高活性后接修护更稳",
    detail: "酸类、A醇、祛痘成分负责推进效果，修护保湿负责兜底，能降低干燥、刺痛和脱皮。",
    priority: 76
  },
  {
    id: "ceramide-lipid",
    type: "互相配合",
    leftIngredientIds: ["ceramide"],
    rightIngredientIds: ["cholesterol", "fatty-acid"],
    title: "神经酰胺搭胆固醇/脂肪酸更像皮脂膜",
    detail: "屏障修护不是单靠一个成分，神经酰胺、胆固醇、脂肪酸一起更接近皮肤自己的脂质结构。",
    priority: 75
  },
  {
    id: "niacinamide-brightening",
    type: "互相配合",
    leftIngredientIds: ["niacinamide"],
    rightIngredientIds: ["tranexamic-acid", "arbutin", "licorice"],
    title: "烟酰胺可和淡斑舒缓成分组队",
    detail: "烟酰胺、传明酸、熊果苷、甘草类不是互相抵消，搭配目标都是提亮和均匀肤色。",
    priority: 70
  },
  {
    id: "azelaic-repair",
    type: "互相配合",
    leftIngredientIds: ["azelaic-acid"],
    rightTags: ["舒缓", "屏障修护"],
    title: "壬二酸后接舒缓更舒服",
    detail: "壬二酸兼顾痘痘和色沉，但容易干痒。后面接积雪草、泛醇、神经酰胺更稳。",
    priority: 68
  },
  {
    id: "oil-control-repair",
    type: "互相配合",
    leftTags: ["控油", "祛痘"],
    rightTags: ["保湿修护"],
    title: "控油祛痘也需要保湿",
    detail: "只控油不保湿会让皮肤更紧绷。油皮也需要轻薄保湿，避免越控越干。",
    priority: 62
  },
  {
    id: "occlusive-sunscreen",
    type: "互相克制",
    leftIngredientIds: ["petrolatum"],
    rightTags: ["防晒"],
    title: "厚重油膏不要盖在防晒前",
    detail: "厚重封闭类产品可能影响防晒成膜。白天防晒前用轻薄保湿，厚封闭留到晚上更合适。",
    priority: 60
  },
  {
    id: "clay-leave-on",
    type: "互相抵消",
    leftIngredientIds: ["kaolin", "charcoal"],
    rightTags: ["保湿修护", "屏障修护", "美白淡斑"],
    title: "吸附清洁面膜会削弱留肤护理",
    detail: "高岭土、炭粉类主要吸附油脂，适合短时清洁。不要和精华面霜当同一步混合。",
    priority: 58
  },
  {
    id: "hydration-occlusive",
    type: "互相配合",
    leftTags: ["保湿修护"],
    rightTags: ["封闭锁水"],
    title: "先补水再锁水更完整",
    detail: "透明质酸、甘油这类负责抓水，角鲨烷、硅油、凡士林这类负责减少流失，顺序上更适合先水后油。",
    priority: 56
  },
  {
    id: "niacinamide-retinoid",
    type: "互相配合",
    leftIngredientIds: ["niacinamide"],
    rightTags: ["视黄醇"],
    title: "烟酰胺能辅助A醇耐受",
    detail: "烟酰胺有屏障和提亮思路，和A醇不是互相抵消。耐受差时仍要控制频率。",
    priority: 55
  },
  {
    id: "bpo-irritant",
    type: "互相克制",
    leftIngredientIds: ["benzoyl-peroxide"],
    rightTags: ["风险刺激"],
    title: "强祛痘成分不要再叠刺激源",
    detail: "过氧化苯甲酰已经容易干燥脱皮，再叠香精、薄荷醇、高酒精感产品会更不稳。",
    priority: 54
  },
  {
    id: "azelaic-brightening",
    type: "互相配合",
    leftIngredientIds: ["azelaic-acid"],
    rightIngredientIds: ["niacinamide", "tranexamic-acid", "licorice"],
    title: "壬二酸可和提亮舒缓成分搭配",
    detail: "壬二酸负责痘痘、泛红和色沉，烟酰胺、传明酸、甘草类能补提亮和舒缓。",
    priority: 53
  },
  {
    id: "fragrance-sensitive",
    type: "互相克制",
    leftIngredientIds: ["fragrance", "menthol"],
    rightTags: ["酸类焕肤", "视黄醇", "祛痘"],
    title: "活性护理期少碰香精薄荷",
    detail: "酸类、A醇、祛痘成分已经在拉高刺激阈值，香精和薄荷醇只提供肤感，收益低于风险。",
    priority: 52
  },
  {
    id: "alcohol-barrier",
    type: "互相克制",
    leftIngredientIds: ["alcohol-denat"],
    rightTags: ["屏障修护"],
    title: "高酒精感和屏障修护目标相反",
    detail: "变性酒精带来清爽快干，但屏障弱时可能更干。修护期优先低刺激保湿。",
    priority: 50
  },
  {
    id: "green-tea-oil-control",
    type: "互相配合",
    leftIngredientIds: ["green-tea"],
    rightTags: ["控油", "祛痘"],
    title: "绿茶适合油痘护理里做舒缓抗氧",
    detail: "绿茶提取物偏抗氧化和舒缓，能给控油祛痘链路增加温和支撑。",
    priority: 48
  },
  {
    id: "pha-repair",
    type: "互相配合",
    leftIngredientIds: ["pha", "lactic-acid"],
    rightTags: ["保湿修护", "舒缓"],
    title: "温和酸类也要接保湿",
    detail: "PHA、乳酸比强果酸温和，但仍属于角质调理。后续保湿能减少干燥紧绷。",
    priority: 46
  },
  {
    id: "vitc-niacinamide",
    type: "互相配合",
    leftIngredientIds: ["vitamin-c"],
    rightIngredientIds: ["niacinamide"],
    title: "维C和烟酰胺不是必然打架",
    detail: "稳定配方里维C和烟酰胺可以同一套提亮思路。真正要注意的是皮肤耐受和产品刺激感。",
    priority: 44
  },
  {
    id: "sunscreen-cleanser",
    type: "互相抵消",
    leftTags: ["防晒"],
    rightTags: ["清洁卸除"],
    title: "防晒后再接清洁会破坏成膜",
    detail: "防晒需要留在皮肤表面成膜。白天防晒后不要再用卸妆/洁面步骤，除非准备重新护肤和补防晒。",
    priority: 42
  },
  {
    id: "peptide-acid-ph",
    type: "互相克制",
    leftTags: ["酸类焕肤"],
    rightIngredientIds: ["peptide"],
    title: "强酸低pH可能降解部分多肽",
    detail: "果酸/水杨酸产品通常pH 3-4，部分信号肽在此pH下可能水解失效。建议酸类后等待5-10分钟再用胜肽产品，或分早晚。",
    priority: 72
  },
  {
    id: "niacinamide-transient-flush",
    type: "互相克制",
    leftIngredientIds: ["niacinamide"],
    rightTags: ["酸类焕肤"],
    title: "烟酰胺+酸类可能因pH骤变引发短暂泛红",
    detail: "烟酰胺在低pH下可能微量水解为烟酸引起一过性潮红(非过敏)。若刺痛持续超过5分钟应分开使用。",
    priority: 64
  },
  {
    id: "antioxidant-layering",
    type: "互相配合",
    leftTags: ["抗氧化"],
    rightTags: ["抗氧化"],
    title: "多种抗氧化剂分层使用可覆盖更宽氧化通路",
    detail: "VC(水相)+VE(脂相)+阿魏酸是经典组合。不同抗氧化剂覆盖不同ROS通路，分层比单一高浓度更均衡。",
    priority: 66
  },

];

export const routineAdjustmentRules = [
  {
    id: "cleanser-standalone",
    action: "standalone-categories",
    categories: ["卸妆水", "洁面"],
    advantage: "保留你选过的清洁/卸妆类别，但推荐该类别更稳的最优产品，并把它作为单独清洁步骤。"
  },
  {
    id: "separate-acid-retinoid",
    action: "remove-tag-products",
    triggerTags: ["酸类焕肤", "视黄醇"],
    removeTag: "酸类焕肤",
    keepIfAllRemoved: true,
    advantage: "当前组合优先保留A醇，已移除酸类，避免叠加刺激。"
  },
  {
    id: "single-acid",
    action: "keep-first-tag-product",
    repeatedTag: "酸类焕肤",
    advantage: "酸类只保留一个主力，避免重复去角质。"
  }
] as const;
