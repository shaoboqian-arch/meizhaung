import type { Ingredient, Product } from "../types";

export const ingredients: Ingredient[] = [
  {
    id: "hyaluronic-acid",
    name: "透明质酸",
    aliases: ["玻尿酸", "Sodium Hyaluronate"],
    tags: ["保湿修护"],
    plainEffect: "抓水保湿，适合和多数活性成分搭配。"
  },
  {
    id: "ceramide",
    name: "神经酰胺",
    aliases: ["Ceramide NP", "Ceramide AP"],
    tags: ["屏障修护", "保湿修护"],
    plainEffect: "神经酰胺+胆固醇+脂肪酸(摩尔比约1:1:1)最优修复屏障。能缓冲酸类和视黄醇带来的干燥。"
  },
  {
    id: "niacinamide",
    name: "烟酰胺",
    aliases: ["Niacinamide"],
    tags: ["美白淡斑", "屏障修护"],
    plainEffect: "2-5%提亮肤色、稳屏障，5-10%控油收敛。和保湿修护类搭配好，pH 5-7最稳定。"
  },
  {
    id: "vitamin-c",
    name: "维生素C",
    aliases: ["抗坏血酸", "Ascorbic Acid"],
    tags: ["抗氧化", "美白淡斑"],
    plainEffect: "L-AA型(10-20%)抗氧化提亮最有效但偏酸(pH<3.5)；衍生物更温和。白天搭防晒更有意义。",
    caution: "敏感皮先低频使用。"
  },
  {
    id: "retinol",
    name: "视黄醇",
    aliases: ["Retinol", "A醇", "视黄醛"],
    tags: ["视黄醇"],
    plainEffect: "0.1-1%抗光老化、促胶原、细嫩肤质。需建立耐受(2-4周低频起步)，容易干燥脱皮。",
    caution: "不建议和强酸同晚叠加。"
  },
  {
    id: "salicylic-acid",
    name: "水杨酸",
    aliases: ["BHA", "Salicylic Acid"],
    tags: ["酸类焕肤", "控油"],
    plainEffect: "BHA脂溶性疏通毛孔、控油(pH 3-4最佳)。对闭口痘肌更常见，浓度0.5-2%。",
    caution: "和视黄醇、果酸同晚叠加容易过度刺激。"
  },
  {
    id: "glycolic-acid",
    name: "果酸",
    aliases: ["AHA", "Glycolic Acid", "Lactic Acid", "乳酸"],
    tags: ["酸类焕肤"],
    plainEffect: "AHA水溶性促角质代谢(5-10%日常，>20%为焕肤)。分子最小渗透最深，容易增加干燥感和光敏。",
    caution: "敏感皮和屏障弱时先停。"
  },
  {
    id: "peptide",
    name: "胜肽",
    aliases: ["Peptide", "棕榈酰五肽"],
    tags: ["保湿修护"],
    plainEffect: "信号肽/载体肽促胶原、舒缓纹路，温和不易刺激。避免与强酸(pH<3.5)或高浓度VC同步骤使用以防降解。"
  },
  {
    id: "centella",
    name: "积雪草",
    aliases: ["Centella Asiatica", "羟基积雪草苷"],
    tags: ["舒缓", "屏障修护"],
    plainEffect: "舒缓泛红，适合搭配刺激性活性成分。"
  },
  {
    id: "micellar",
    name: "胶束清洁剂",
    aliases: ["Micellar", "PEG-6 辛酸/癸酸甘油酯类"],
    tags: ["清洁卸除"],
    plainEffect: "负责卸除彩妆和防晒，不是留肤保养成分。"
  },
  {
    id: "sunscreen-filter",
    name: "防晒剂",
    aliases: ["氧化锌", "二氧化钛", "Avobenzone", "Uvinul", "Tinosorb"],
    tags: ["防晒"],
    plainEffect: "抵御紫外线，白天最后一步使用。"
  },
  {
    id: "panthenol",
    name: "泛醇",
    aliases: ["Panthenol", "维生素B5"],
    tags: ["舒缓", "保湿修护"],
    plainEffect: "缓解干燥紧绷，适合夹在刺激型活性后面。"
  },
  {
    id: "squalane",
    name: "角鲨烷",
    aliases: ["Squalane"],
    tags: ["封闭锁水", "保湿修护"],
    plainEffect: "补油锁水，适合干皮或屏障不稳时使用。"
  },
  {
    id: "zinc-pca",
    name: "锌 PCA",
    aliases: ["Zinc PCA"],
    tags: ["控油", "舒缓"],
    plainEffect: "偏控油和舒缓，常见于油皮护理。"
  },
  {
    id: "azelaic-acid",
    name: "壬二酸",
    aliases: ["Azelaic Acid", "杜鹃花酸"],
    tags: ["祛痘", "控油", "美白淡斑", "抗炎"],
    plainEffect: "10-20%兼顾痘痘、玫瑰痤疮泛红和PIH色沉。需4-8周见效，初期可能干痒刺。",
    caution: "和强酸、A醇同晚叠加要谨慎。"
  },
  {
    id: "tranexamic-acid",
    name: "传明酸",
    aliases: ["Tranexamic Acid", "凝血酸"],
    tags: ["美白淡斑", "舒缓"],
    plainEffect: "偏淡斑和均匀肤色，刺激性通常低于强酸。"
  },
  {
    id: "arbutin",
    name: "熊果苷",
    aliases: ["Alpha-Arbutin", "Arbutin"],
    tags: ["美白淡斑"],
    plainEffect: "辅助淡化色沉，适合和烟酰胺、传明酸搭配。"
  },
  {
    id: "kojic-acid",
    name: "曲酸",
    aliases: ["Kojic Acid"],
    tags: ["美白淡斑", "风险刺激"],
    plainEffect: "淡斑力较强，但敏感皮更容易刺激。"
  },
  {
    id: "licorice",
    name: "甘草酸二钾",
    aliases: ["Dipotassium Glycyrrhizate", "甘草提取物"],
    tags: ["舒缓", "抗炎", "美白淡斑"],
    plainEffect: "舒缓泛红，辅助提亮，适合搭配多数活性。"
  },
  {
    id: "allantoin",
    name: "尿囊素",
    aliases: ["Allantoin"],
    tags: ["舒缓", "保湿修护"],
    plainEffect: "降低干痒紧绷感，常用于修护类产品。"
  },
  {
    id: "bisabolol",
    name: "红没药醇",
    aliases: ["Bisabolol"],
    tags: ["舒缓", "抗炎"],
    plainEffect: "舒缓刺激和泛红，适合搭配酸类或A醇后的修护。"
  },
  {
    id: "madecassoside",
    name: "羟基积雪草苷",
    aliases: ["Madecassoside"],
    tags: ["舒缓", "屏障修护"],
    plainEffect: "偏屏障修护和舒缓，适合敏感期。"
  },
  {
    id: "beta-glucan",
    name: "β-葡聚糖",
    aliases: ["Beta-Glucan"],
    tags: ["舒缓", "保湿修护"],
    plainEffect: "提升保湿和舒缓感，适合干敏皮。"
  },
  {
    id: "glycerin",
    name: "甘油",
    aliases: ["Glycerin"],
    tags: ["保湿修护"],
    plainEffect: "基础吸湿保湿，和几乎所有成分兼容。"
  },
  {
    id: "urea",
    name: "尿素",
    aliases: ["Urea"],
    tags: ["保湿修护", "角质调理"],
    plainEffect: "低浓度保湿，高浓度软化角质。",
    caution: "屏障受损时高浓度可能刺痛。"
  },
  {
    id: "cholesterol",
    name: "胆固醇",
    aliases: ["Cholesterol"],
    tags: ["屏障修护", "封闭锁水"],
    plainEffect: "和神经酰胺、脂肪酸一起补皮脂膜。"
  },
  {
    id: "fatty-acid",
    name: "脂肪酸",
    aliases: ["Linoleic Acid", "Stearic Acid", "Fatty Acid"],
    tags: ["屏障修护", "封闭锁水"],
    plainEffect: "配合神经酰胺和胆固醇修护屏障。"
  },
  {
    id: "petrolatum",
    name: "凡士林",
    aliases: ["Petrolatum"],
    tags: ["封闭锁水", "屏障修护"],
    plainEffect: "强封闭锁水，适合干裂修护，不适合所有油痘肌大面积厚涂。"
  },
  {
    id: "dimethicone",
    name: "聚二甲基硅氧烷",
    aliases: ["Dimethicone"],
    tags: ["封闭锁水", "保湿修护"],
    plainEffect: "形成顺滑保护膜，减少水分流失。"
  },
  {
    id: "bakuchiol",
    name: "补骨脂酚",
    aliases: ["Bakuchiol"],
    tags: ["视黄醇", "抗氧化"],
    plainEffect: "类A醇思路的温和抗老成分，但仍建议循序渐进。"
  },
  {
    id: "retinal",
    name: "视黄醛",
    aliases: ["Retinal", "Retinaldehyde"],
    tags: ["视黄醇", "风险刺激"],
    plainEffect: "比普通A醇更强，抗老效率高但刺激风险也更高。",
    caution: "不建议和强酸、过氧化苯甲酰同晚叠加。"
  },
  {
    id: "pha",
    name: "PHA",
    aliases: ["Gluconolactone", "Lactobionic Acid"],
    tags: ["酸类焕肤", "去角质", "保湿修护"],
    plainEffect: "比AHA更温和的酸类，适合轻度角质调理。"
  },
  {
    id: "lactic-acid",
    name: "乳酸",
    aliases: ["Lactic Acid"],
    tags: ["酸类焕肤", "去角质", "保湿修护"],
    plainEffect: "兼具焕肤和保湿，比高浓度果酸更柔和。"
  },
  {
    id: "mandelic-acid",
    name: "杏仁酸",
    aliases: ["Mandelic Acid"],
    tags: ["酸类焕肤", "祛痘", "油脂调理"],
    plainEffect: "分子较大，常用于痘肌和毛孔护理。"
  },
  {
    id: "benzoyl-peroxide",
    name: "过氧化苯甲酰",
    aliases: ["Benzoyl Peroxide", "BPO"],
    tags: ["祛痘", "风险刺激"],
    plainEffect: "针对痘痘的强力成分，容易干燥脱皮。",
    caution: "不建议和A醇、强酸同晚叠加。"
  },
  {
    id: "sulfur",
    name: "硫磺",
    aliases: ["Sulfur"],
    tags: ["祛痘", "控油"],
    plainEffect: "偏控油祛痘，可能带来干燥。"
  },
  {
    id: "tea-tree",
    name: "茶树精油",
    aliases: ["Tea Tree Oil"],
    tags: ["祛痘", "风险刺激"],
    plainEffect: "部分产品用于痘痘护理，但精油类对敏感皮风险更高。",
    caution: "敏感皮不要和酸类、A醇同晚叠加。"
  },
  {
    id: "green-tea",
    name: "绿茶提取物",
    aliases: ["Green Tea", "EGCG"],
    tags: ["抗氧化", "舒缓", "控油"],
    plainEffect: "抗氧化、舒缓，适合油皮和泛红人群。"
  },
  {
    id: "resveratrol",
    name: "白藜芦醇",
    aliases: ["Resveratrol"],
    tags: ["抗氧化", "抗糖化"],
    plainEffect: "抗氧化辅助，适合和防晒、维C思路一起用。"
  },
  {
    id: "ferulic-acid",
    name: "阿魏酸",
    aliases: ["Ferulic Acid"],
    tags: ["抗氧化"],
    plainEffect: "常和维C、维E搭配，增强抗氧化稳定性。"
  },
  {
    id: "vitamin-e",
    name: "维生素E",
    aliases: ["Tocopherol", "Vitamin E"],
    tags: ["抗氧化", "封闭锁水"],
    plainEffect: "抗氧化和滋润辅助，常和维C搭配。"
  },
  {
    id: "coq10",
    name: "辅酶Q10",
    aliases: ["Coenzyme Q10", "Ubiquinone"],
    tags: ["抗氧化", "抗糖化"],
    plainEffect: "抗氧化辅助，偏温和。"
  },
  {
    id: "caffeine",
    name: "咖啡因",
    aliases: ["Caffeine"],
    tags: ["抗氧化", "油脂调理"],
    plainEffect: "常用于眼部和消肿类产品，刺激性通常不高。"
  },
  {
    id: "kaolin",
    name: "高岭土",
    aliases: ["Kaolin"],
    tags: ["控油", "清洁卸除"],
    plainEffect: "吸附油脂，常见于清洁面膜。"
  },
  {
    id: "charcoal",
    name: "炭粉",
    aliases: ["Charcoal Powder"],
    tags: ["控油", "清洁卸除"],
    plainEffect: "偏吸附清洁，不能替代留肤修护。"
  },
  {
    id: "menthol",
    name: "薄荷醇",
    aliases: ["Menthol"],
    tags: ["风险刺激"],
    plainEffect: "带来清凉感，但对敏感皮可能刺激。"
  },
  {
    id: "fragrance",
    name: "香精",
    aliases: ["Fragrance", "Parfum"],
    tags: ["风险刺激"],
    plainEffect: "主要改善气味，不承担护肤功效，敏感皮要留意。"
  },
  {
    id: "alcohol-denat",
    name: "变性酒精",
    aliases: ["Alcohol Denat", "SD Alcohol"],
    tags: ["风险刺激", "油脂调理"],
    plainEffect: "提升清爽肤感和挥发速度，但可能加重干燥。"
  },
  {
    id: "sodium-pca",
    name: "PCA钠",
    aliases: ["Sodium PCA", "PCA-Na"],
    tags: ["保湿修护"],
    plainEffect: "天然保湿因子成员，抓水能力温和，适合干燥、屏障弱时补基础保湿。"
  },
  {
    id: "betaine",
    name: "甜菜碱",
    aliases: ["Betaine", "Trimethylglycine"],
    tags: ["保湿修护", "舒缓"],
    plainEffect: "降低干燥紧绷感，也能缓冲清洁或活性成分带来的刺激。"
  },
  {
    id: "trehalose",
    name: "海藻糖",
    aliases: ["Trehalose"],
    tags: ["保湿修护", "抗氧化"],
    plainEffect: "保水和抗干燥压力，常作为温和保湿辅助。"
  },
  {
    id: "ectoin",
    name: "依克多因",
    aliases: ["Ectoin"],
    tags: ["屏障修护", "舒缓", "保湿修护"],
    plainEffect: "偏屏障保护和舒缓，适合敏感、泛红、换季不稳的搭配里做兜底。"
  },
  {
    id: "polyglutamic-acid",
    name: "聚谷氨酸",
    aliases: ["Polyglutamic Acid", "PGA"],
    tags: ["保湿修护"],
    plainEffect: "成膜保湿，和透明质酸、甘油属于补水链路，不和活性成分冲突。"
  },
  {
    id: "saccharide-isomerate",
    name: "糖类同分异构体",
    aliases: ["Saccharide Isomerate"],
    tags: ["保湿修护"],
    plainEffect: "长效保湿型糖类成分，适合干皮和清洁后紧绷。"
  },
  {
    id: "amino-acids",
    name: "氨基酸复合物",
    aliases: ["Amino Acids", "Serine", "Arginine", "Proline"],
    tags: ["保湿修护", "屏障修护"],
    plainEffect: "天然保湿因子的一部分，负责基础保湿和肤感修护。"
  },
  {
    id: "collagen",
    name: "胶原蛋白",
    aliases: ["Collagen", "Hydrolyzed Collagen"],
    tags: ["保湿修护"],
    plainEffect: "外用主要是成膜保湿和肤感改善，不等于直接补进真皮胶原。"
  },
  {
    id: "elastin",
    name: "弹性蛋白",
    aliases: ["Elastin", "Hydrolyzed Elastin"],
    tags: ["保湿修护"],
    plainEffect: "偏成膜和柔滑肤感，抗老作用通常弱于A醇、胜肽、抗氧化链路。"
  },
  {
    id: "ceramide-eop",
    name: "神经酰胺EOP",
    aliases: ["Ceramide EOP"],
    tags: ["屏障修护", "保湿修护"],
    plainEffect: "屏障脂质成员，适合和胆固醇、脂肪酸一起看作修护组合。"
  },
  {
    id: "ceramide-ap",
    name: "神经酰胺AP",
    aliases: ["Ceramide AP"],
    tags: ["屏障修护", "保湿修护"],
    plainEffect: "屏障脂质成员，偏修护干燥和脱皮。"
  },
  {
    id: "linoleic-acid",
    name: "亚油酸",
    aliases: ["Linoleic Acid"],
    tags: ["屏障修护", "封闭锁水"],
    plainEffect: "皮脂膜相关脂肪酸，适合干燥和屏障弱护理。"
  },
  {
    id: "caprylic-triglyceride",
    name: "辛酸/癸酸甘油三酯",
    aliases: ["Caprylic/Capric Triglyceride"],
    tags: ["封闭锁水", "保湿修护"],
    plainEffect: "轻润油脂，负责柔润和减少水分流失。"
  },
  {
    id: "ethyl-ascorbic-acid",
    name: "3-O-乙基抗坏血酸",
    aliases: ["3-O-Ethyl Ascorbic Acid", "Ethyl Ascorbic Acid"],
    tags: ["抗氧化", "美白淡斑"],
    plainEffect: "维C衍生物，比纯VC更温和稳定，偏提亮和抗氧化。"
  },
  {
    id: "ascorbyl-glucoside",
    name: "抗坏血酸葡糖苷",
    aliases: ["Ascorbyl Glucoside", "AA2G"],
    tags: ["抗氧化", "美白淡斑"],
    plainEffect: "水溶性维C衍生物，刺激通常低于L-抗坏血酸。"
  },
  {
    id: "magnesium-ascorbyl-phosphate",
    name: "抗坏血酸磷酸酯镁",
    aliases: ["Magnesium Ascorbyl Phosphate", "MAP"],
    tags: ["抗氧化", "美白淡斑"],
    plainEffect: "温和型维C衍生物，适合敏感皮做提亮辅助。"
  },
  {
    id: "tetrahexyldecyl-ascorbate",
    name: "四己基癸醇抗坏血酸酯",
    aliases: ["Tetrahexyldecyl Ascorbate", "THD Ascorbate"],
    tags: ["抗氧化", "美白淡斑"],
    plainEffect: "油溶性维C衍生物，偏稳定和温和，常见于抗氧化精华。"
  },
  {
    id: "retinyl-palmitate",
    name: "视黄醇棕榈酸酯",
    aliases: ["Retinyl Palmitate"],
    tags: ["视黄醇"],
    plainEffect: "温和维A酯，刺激低但转化链路长，抗老强度弱于视黄醇/视黄醛。"
  },
  {
    id: "hydroxypinacolone-retinoate",
    name: "羟基频哪酮视黄酸酯",
    aliases: ["Hydroxypinacolone Retinoate", "HPR", "Granactive Retinoid"],
    tags: ["视黄醇"],
    plainEffect: "新型维A类，常被设计成低刺激抗老，但仍应避免和强酸同晚叠加。"
  },
  {
    id: "gluconolactone",
    name: "葡糖酸内酯",
    aliases: ["Gluconolactone"],
    tags: ["酸类焕肤", "保湿修护"],
    plainEffect: "PHA温和酸，兼顾角质调理和保湿，适合酸类新手。"
  },
  {
    id: "lactobionic-acid",
    name: "乳糖酸",
    aliases: ["Lactobionic Acid"],
    tags: ["酸类焕肤", "保湿修护"],
    plainEffect: "PHA类，分子较大更温和，适合敏感和干燥皮低频调理。"
  },
  {
    id: "malic-acid",
    name: "苹果酸",
    aliases: ["Malic Acid"],
    tags: ["酸类焕肤", "角质调理"],
    plainEffect: "AHA成员，常作为复合酸辅助，过量叠加仍会增加刺激。"
  },
  {
    id: "citric-acid",
    name: "柠檬酸",
    aliases: ["Citric Acid"],
    tags: ["酸类焕肤", "角质调理"],
    plainEffect: "常用于调pH和复合酸体系，单独作为高强度焕肤不常见。"
  },
  {
    id: "tartaric-acid",
    name: "酒石酸",
    aliases: ["Tartaric Acid"],
    tags: ["酸类焕肤", "角质调理"],
    plainEffect: "AHA成员，常在复合酸里辅助角质代谢。"
  },
  {
    id: "hexylresorcinol",
    name: "己基间苯二酚",
    aliases: ["Hexylresorcinol", "4-Hexylresorcinol"],
    tags: ["美白淡斑", "抗氧化"],
    plainEffect: "偏淡斑和抗氧化，常与烟酰胺、传明酸组成提亮链路。"
  },
  {
    id: "phenylethyl-resorcinol",
    name: "苯乙基间苯二酚",
    aliases: ["Phenylethyl Resorcinol", "SymWhite 377"],
    tags: ["美白淡斑", "抗氧化"],
    plainEffect: "强提亮思路成分，敏感皮需关注配方刺激度。"
  },
  {
    id: "n-acetyl-glucosamine",
    name: "乙酰壳糖胺",
    aliases: ["N-Acetyl Glucosamine", "NAG"],
    tags: ["美白淡斑", "保湿修护"],
    plainEffect: "常和烟酰胺搭配，兼顾提亮和保湿。"
  },
  {
    id: "glutathione",
    name: "谷胱甘肽",
    aliases: ["Glutathione"],
    tags: ["抗氧化", "美白淡斑"],
    plainEffect: "抗氧化和提亮辅助，通常适合与VC衍生物、烟酰胺搭配。"
  },
  {
    id: "cysteamine",
    name: "半胱胺",
    aliases: ["Cysteamine"],
    tags: ["美白淡斑", "风险刺激"],
    plainEffect: "偏强力淡斑思路，气味和刺激感更需要关注，敏感皮不宜乱叠。"
  },
  {
    id: "pionin",
    name: "季铵盐-73",
    aliases: ["Quaternium-73", "Pionin"],
    tags: ["祛痘", "控油"],
    plainEffect: "常见于祛痘控油产品，用量低也能作为痘肌辅助。"
  },
  {
    id: "o-cymen-5-ol",
    name: "异丙基甲基苯酚",
    aliases: ["o-Cymen-5-ol", "Isopropyl Methylphenol", "IPMP"],
    tags: ["祛痘", "油脂调理"],
    plainEffect: "偏抑菌控痘思路，适合局部或油痘护理，不建议和强刺激叠太满。"
  },
  {
    id: "succinic-acid",
    name: "琥珀酸",
    aliases: ["Succinic Acid"],
    tags: ["祛痘", "角质调理"],
    plainEffect: "新型痘肌调理成分，常用于温和祛痘和减少粗糙。"
  },
  {
    id: "carnitine",
    name: "左旋肉碱",
    aliases: ["Carnitine", "L-Carnitine"],
    tags: ["控油", "油脂调理"],
    plainEffect: "偏油脂调理，适合油皮产品做清爽控油辅助。"
  },
  {
    id: "sebum-regulating-complex",
    name: "控油复合物",
    aliases: ["Sebum Regulating Complex", "Seboregulator"],
    tags: ["控油", "油脂调理"],
    plainEffect: "用于归类品牌自称的控油组合，具体强弱取决于实际成分表。"
  },
  {
    id: "mugwort",
    name: "艾草提取物",
    aliases: ["Artemisia Extract", "Mugwort Extract"],
    tags: ["舒缓", "抗炎"],
    plainEffect: "偏舒缓泛红和痘肌不适，适合搭配酸类或祛痘后修护。"
  },
  {
    id: "oat",
    name: "燕麦提取物",
    aliases: ["Avena Sativa", "Colloidal Oatmeal", "Oat Extract"],
    tags: ["舒缓", "屏障修护"],
    plainEffect: "适合干痒、泛红、屏障弱，偏温和修护。"
  },
  {
    id: "calendula",
    name: "金盏花提取物",
    aliases: ["Calendula Officinalis Extract"],
    tags: ["舒缓", "抗炎"],
    plainEffect: "舒缓调理向植物提取物，适合轻度泛红和油皮水类产品。"
  },
  {
    id: "chamomile",
    name: "洋甘菊提取物",
    aliases: ["Chamomile Extract", "Anthemis Nobilis"],
    tags: ["舒缓", "抗炎"],
    plainEffect: "舒缓泛红和不适，常与红没药醇、泛醇同向。"
  },
  {
    id: "madecassic-acid",
    name: "羟基积雪草酸",
    aliases: ["Madecassic Acid"],
    tags: ["舒缓", "屏障修护"],
    plainEffect: "积雪草活性组分之一，偏舒缓和修护。"
  },
  {
    id: "asiaticoside",
    name: "积雪草苷",
    aliases: ["Asiaticoside"],
    tags: ["舒缓", "屏障修护"],
    plainEffect: "积雪草活性组分之一，适合泛红和屏障护理。"
  },
  {
    id: "zinc-oxide",
    name: "氧化锌",
    aliases: ["Zinc Oxide"],
    tags: ["防晒", "舒缓"],
    plainEffect: "物理防晒滤剂，也有一定舒缓和吸附感，白天最后一步。"
  },
  {
    id: "titanium-dioxide",
    name: "二氧化钛",
    aliases: ["Titanium Dioxide"],
    tags: ["防晒"],
    plainEffect: "物理防晒滤剂，覆盖UVB和部分UVA，常用于敏感皮防晒。"
  },
  {
    id: "avobenzone",
    name: "阿伏苯宗",
    aliases: ["Avobenzone", "Butyl Methoxydibenzoylmethane"],
    tags: ["防晒"],
    plainEffect: "UVA化学防晒滤剂，需要稳定体系支持。"
  },
  {
    id: "octocrylene",
    name: "奥克立林",
    aliases: ["Octocrylene"],
    tags: ["防晒"],
    plainEffect: "常用于防晒体系，帮助提高稳定性和防晒覆盖。"
  },
  {
    id: "uvinul-a-plus",
    name: "Uvinul A Plus",
    aliases: ["Diethylamino Hydroxybenzoyl Hexyl Benzoate", "DHHB"],
    tags: ["防晒"],
    plainEffect: "稳定UVA滤剂，适合现代化学防晒体系。"
  },
  {
    id: "uvinul-t150",
    name: "Uvinul T 150",
    aliases: ["Ethylhexyl Triazone"],
    tags: ["防晒"],
    plainEffect: "高效UVB滤剂，常用于高倍防晒。"
  },
  {
    id: "tinosorb-s",
    name: "Tinosorb S",
    aliases: ["Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine", "BEMT"],
    tags: ["防晒"],
    plainEffect: "广谱稳定防晒滤剂，覆盖UVA和UVB。"
  },
  {
    id: "tinosorb-m",
    name: "Tinosorb M",
    aliases: ["Methylene Bis-Benzotriazolyl Tetramethylbutylphenol", "MBBT"],
    tags: ["防晒"],
    plainEffect: "广谱颗粒型防晒滤剂，常带来一定泛白和膜感。"
  },
  {
    id: "sodium-cocoyl-glycinate",
    name: "椰油酰甘氨酸钠",
    aliases: ["Sodium Cocoyl Glycinate"],
    tags: ["清洁卸除"],
    plainEffect: "氨基酸表活，清洁力温和，适合洁面类产品。"
  },
  {
    id: "sodium-lauroyl-glutamate",
    name: "月桂酰谷氨酸钠",
    aliases: ["Sodium Lauroyl Glutamate"],
    tags: ["清洁卸除"],
    plainEffect: "氨基酸表活，常用于温和洁面。"
  },
  {
    id: "coco-betaine",
    name: "椰油酰胺丙基甜菜碱",
    aliases: ["Cocamidopropyl Betaine", "Coco-Betaine"],
    tags: ["清洁卸除"],
    plainEffect: "两性表活，常用于降低清洁刺激和改善泡沫。"
  },
  {
    id: "sodium-laureth-sulfate",
    name: "月桂醇聚醚硫酸酯钠",
    aliases: ["Sodium Laureth Sulfate", "SLES"],
    tags: ["清洁卸除", "风险刺激"],
    plainEffect: "清洁力较强，干敏皮可能觉得紧绷。"
  },
  {
    id: "methylparaben",
    name: "羟苯甲酯",
    aliases: ["Methylparaben"],
    tags: ["风险刺激"],
    plainEffect: "常见防腐剂，本身不是护肤功效成分；敏感皮关注个人耐受。"
  },
  {
    id: "phenoxyethanol",
    name: "苯氧乙醇",
    aliases: ["Phenoxyethanol"],
    tags: ["风险刺激"],
    plainEffect: "常见防腐剂，通常用于控制微生物风险，不承担护肤功效。"
  },
  {
    id: "ethylhexylglycerin",
    name: "乙基己基甘油",
    aliases: ["Ethylhexylglycerin"],
    tags: ["保湿修护"],
    plainEffect: "常作防腐助剂和轻保湿，刺激性通常较低。"
  },
  {
    id: "tocopherol-acetate",
    name: "生育酚乙酸酯",
    aliases: ["Tocopheryl Acetate"],
    tags: ["抗氧化", "封闭锁水"],
    plainEffect: "维E衍生物，偏抗氧化和柔润，强度通常低于纯生育酚。"
  },
  {
    id: "rice-bran-oil",
    name: "米糠油",
    aliases: ["Rice Bran Oil", "Oryza Sativa Bran Oil"],
    tags: ["封闭锁水", "抗氧化"],
    plainEffect: "植物油脂，偏柔润锁水，油痘皮需看配方厚重度。"
  },
  {
    id: "jojoba-oil",
    name: "霍霍巴籽油",
    aliases: ["Jojoba Oil", "Simmondsia Chinensis Seed Oil"],
    tags: ["封闭锁水"],
    plainEffect: "轻润植物油，负责柔润和减少水分流失。"
  },
  {
    id: "shea-butter",
    name: "乳木果脂",
    aliases: ["Shea Butter", "Butyrospermum Parkii Butter"],
    tags: ["封闭锁水", "保湿修护"],
    plainEffect: "厚润型油脂，适合干皮和身体护理，油皮面部需控制用量。"
  },
  {
    id: "mineral-oil",
    name: "矿油",
    aliases: ["Mineral Oil", "Paraffinum Liquidum"],
    tags: ["封闭锁水"],
    plainEffect: "稳定封闭保湿，主要减少水分流失，不提供活性功效。"
  },
  {
    id: "adenosine",
    name: "腺苷",
    aliases: ["Adenosine"],
    tags: ["抗氧化", "保湿修护"],
    plainEffect: "常见于淡纹和修护产品，温和度较高，适合与胜肽、烟酰胺搭配。"
  },
  {
    id: "copper-tripeptide-1",
    name: "蓝铜胜肽",
    aliases: ["Copper Tripeptide-1", "GHK-Cu"],
    tags: ["保湿修护", "抗氧化"],
    plainEffect: "胜肽类修护成分，适合抗老修护；不建议和强酸同一步硬叠。"
  },
  {
    id: "palmitoyl-tripeptide-5",
    name: "棕榈酰三肽-5",
    aliases: ["Palmitoyl Tripeptide-5"],
    tags: ["保湿修护"],
    plainEffect: "信号肽，偏淡纹和弹润肤感，适合夜间修护链路。"
  }
];

export const products: Product[] = [
  { id: "laroche-b5", brand: "理肤泉", model: "B5多效修复霜", category: "面霜", ingredientIds: ["ceramide", "centella", "hyaluronic-acid", "cholesterol", "fatty-acid"], notes: "屏障修护、舒缓干燥。" },
  { id: "olay-light", brand: "OLAY", model: "小白瓶精华", category: "精华", ingredientIds: ["niacinamide", "peptide", "licorice", "panthenol", "coq10"], notes: "提亮和修护向。" },
  { id: "skinceuticals-ce", brand: "修丽可", model: "CE复合精华", category: "精华", ingredientIds: ["vitamin-c", "hyaluronic-acid", "ferulic-acid", "vitamin-e", "licorice"], notes: "抗氧化提亮。" },
  { id: "ordinary-retinol", brand: "The Ordinary", model: "Retinol 0.5% in Squalane", category: "精华", ingredientIds: ["retinol", "squalane", "niacinamide", "ceramide", "panthenol"], notes: "视黄醇抗老。" },
  { id: "paula-bha", brand: "宝拉珍选", model: "2%水杨酸精华液", category: "精华", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "酸类疏通毛孔。" },
  { id: "bioderma-h2o", brand: "贝德玛", model: "舒妍洁肤液", category: "卸妆水", ingredientIds: ["micellar", "glycerin", "squalane", "panthenol"], notes: "日常卸妆清洁。" },
  { id: "elta-md", brand: "EltaMD", model: "UV Clear SPF46", category: "防晒", ingredientIds: ["sunscreen-filter", "niacinamide", "vitamin-e", "dimethicone", "licorice"], notes: "白天防晒。" },
  { id: "kiehls-mask", brand: "科颜氏", model: "亚马逊白泥净肤面膜", category: "面膜", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "清洁控油面膜。" },
  { id: "cerave-cleanser", brand: "CeraVe", model: "适乐肤水合洁面乳", category: "洁面", ingredientIds: ["ceramide", "hyaluronic-acid", "cholesterol", "fatty-acid", "glycerin"], notes: "温和洁面。" },
  { id: "cerave-cream", brand: "CeraVe", model: "适乐肤修护保湿霜", category: "面霜", ingredientIds: ["ceramide", "hyaluronic-acid", "cholesterol", "fatty-acid", "glycerin"], notes: "基础保湿修护。" },
  { id: "lancome-genifique", brand: "兰蔻", model: "小黑瓶精华", category: "精华", ingredientIds: ["hyaluronic-acid", "peptide", "glycerin", "beta-glucan", "coq10"], notes: "保湿修护型精华。" },
  { id: "esteelauder-anr", brand: "雅诗兰黛", model: "小棕瓶精华", category: "精华", ingredientIds: ["hyaluronic-acid", "peptide", "glycerin", "beta-glucan", "coq10"], notes: "修护保湿。" },
  { id: "shiseido-ultimune", brand: "资生堂", model: "红腰子精华", category: "精华", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "madecassoside"], notes: "保湿舒缓。" },
  { id: "sk2-essence", brand: "SK-II", model: "神仙水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "licorice"], notes: "轻保湿调理。" },
  { id: "fresh-rose-toner", brand: "Fresh", model: "玫瑰保湿花瓣水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "madecassoside"], notes: "保湿舒缓。" },
  { id: "avene-spray", brand: "雅漾", model: "舒护活泉喷雾", category: "喷雾", ingredientIds: ["centella", "madecassoside", "bisabolol", "glycerin", "panthenol"], notes: "舒缓喷雾。" },
  { id: "laroche-spray", brand: "理肤泉", model: "舒缓喷雾", category: "喷雾", ingredientIds: ["centella", "madecassoside", "bisabolol", "glycerin", "panthenol"], notes: "临时舒缓。" },
  { id: "vichy-89", brand: "薇姿", model: "89火山能量瓶", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "补水保湿。" },
  { id: "minon-lotion", brand: "MINON", model: "氨基酸保湿乳液", category: "乳液", ingredientIds: ["hyaluronic-acid", "ceramide", "glycerin", "beta-glucan", "cholesterol"], notes: "温和保湿乳液。" },
  { id: "clinique-gel", brand: "倩碧", model: "黄油无油乳液", category: "乳液", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "dimethicone", "panthenol"], notes: "轻薄保湿。" },
  { id: "clinique-lotion", brand: "倩碧", model: "黄油有油乳液", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "偏滋润保湿。" },
  { id: "ipsa-toner", brand: "IPSA", model: "流金水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "niacinamide", "glycerin", "beta-glucan", "licorice"], notes: "保湿调理。" },
  { id: "haba-squalane", brand: "HABA", model: "鲨烷美容油", category: "精华", ingredientIds: ["squalane", "vitamin-e", "dimethicone", "glycerin", "panthenol"], notes: "锁水补油。" },
  { id: "drwu-mandelic", brand: "DR.WU", model: "杏仁酸温和焕肤精华", category: "精华", ingredientIds: ["glycolic-acid", "lactic-acid", "panthenol", "allantoin", "glycerin"], notes: "酸类焕肤。" },
  { id: "ren-aha", brand: "REN", model: "果酸焕肤亮采面膜", category: "面膜", ingredientIds: ["glycolic-acid", "lactic-acid", "panthenol", "allantoin", "glycerin"], notes: "焕肤面膜。" },
  { id: "ordinary-glycolic", brand: "The Ordinary", model: "Glycolic Acid 7% Toning Solution", category: "爽肤水", ingredientIds: ["glycolic-acid", "lactic-acid", "panthenol", "allantoin", "glycerin"], notes: "果酸爽肤水。" },
  { id: "ordinary-niacinamide", brand: "The Ordinary", model: "Niacinamide 10% + Zinc 1%", category: "精华", ingredientIds: ["niacinamide", "zinc-pca", "licorice", "panthenol", "glycerin"], notes: "提亮控油。" },
  { id: "ordinary-aha-bha", brand: "The Ordinary", model: "AHA 30% + BHA 2% Peeling Solution", category: "面膜", ingredientIds: ["glycolic-acid", "salicylic-acid", "lactic-acid", "panthenol", "allantoin"], notes: "高强度酸类面膜。" },
  { id: "cosrx-bha", brand: "COSRX", model: "BHA黑头清洁液", category: "祛痘护理", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "licorice"], notes: "毛孔护理。" },
  { id: "cosrx-snail", brand: "COSRX", model: "蜗牛修护精华", category: "精华", ingredientIds: ["hyaluronic-acid", "panthenol", "glycerin", "beta-glucan"], notes: "保湿修护。" },
  { id: "inbeauty-retinol", brand: "露得清", model: "维A醇晚霜", category: "面霜", ingredientIds: ["retinol", "hyaluronic-acid", "niacinamide", "ceramide", "panthenol"], notes: "A醇晚间护理。" },
  { id: "roc-retinol", brand: "RoC", model: "视黄醇深层抗皱晚霜", category: "面霜", ingredientIds: ["retinol", "niacinamide", "ceramide", "panthenol", "glycerin"], notes: "A醇抗老。" },
  { id: "murad-retinol", brand: "Murad", model: "视黄醇青春精华", category: "精华", ingredientIds: ["retinol", "hyaluronic-acid", "niacinamide", "ceramide", "panthenol"], notes: "A醇精华。" },
  { id: "cerave-retinol", brand: "CeraVe", model: "修护A醇精华", category: "精华", ingredientIds: ["retinol", "ceramide", "niacinamide", "panthenol", "cholesterol"], notes: "A醇加修护。" },
  { id: "skinmedica-retinol", brand: "SkinMedica", model: "Retinol Complex 0.5", category: "精华", ingredientIds: ["retinol", "niacinamide", "ceramide", "panthenol", "glycerin"], notes: "A醇护理。" },
  { id: "la-mer-cream", brand: "海蓝之谜", model: "经典精华面霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "滋润修护。" },
  { id: "lamer-lotion", brand: "海蓝之谜", model: "精华乳液", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "轻滋润。" },
  { id: "sisley-emulsion", brand: "希思黎", model: "全能乳液", category: "乳液", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "madecassoside"], notes: "保湿舒缓。" },
  { id: "origins-mask", brand: "悦木之源", model: "一饮而尽保湿面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "补水面膜。" },
  { id: "drjart-ceramide", brand: "蒂佳婷", model: "神经酰胺保湿霜", category: "面霜", ingredientIds: ["ceramide", "panthenol", "cholesterol", "fatty-acid", "glycerin"], notes: "屏障修护。" },
  { id: "drjart-mask", brand: "蒂佳婷", model: "蓝丸保湿面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "madecassoside"], notes: "补水舒缓。" },
  { id: "medicube-zero", brand: "Medicube", model: "Zero毛孔爽肤水", category: "爽肤水", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "控油毛孔护理。" },
  { id: "eucerin-spot", brand: "优色林", model: "淡斑精华", category: "精华", ingredientIds: ["niacinamide", "licorice", "panthenol", "glycerin", "beta-glucan"], notes: "提亮淡斑。" },
  { id: "eucerin-cream", brand: "优色林", model: "修护保湿霜", category: "面霜", ingredientIds: ["ceramide", "hyaluronic-acid", "cholesterol", "fatty-acid", "glycerin"], notes: "基础修护。" },
  { id: "aveeno-body", brand: "Aveeno", model: "燕麦身体乳", category: "身体乳", ingredientIds: ["panthenol", "hyaluronic-acid", "glycerin", "beta-glucan", "dimethicone"], notes: "身体保湿舒缓。" },
  { id: "vaseline-body", brand: "凡士林", model: "倍护身体乳", category: "身体乳", ingredientIds: ["squalane", "vitamin-e", "dimethicone", "glycerin", "petrolatum"], notes: "身体锁水。" },
  { id: "nivea-body", brand: "妮维雅", model: "深层润肤身体乳", category: "身体乳", ingredientIds: ["squalane", "hyaluronic-acid", "vitamin-e", "dimethicone", "glycerin"], notes: "滋润身体乳。" },
  { id: "kiehls-body", brand: "科颜氏", model: "身体滋润乳", category: "身体乳", ingredientIds: ["squalane", "hyaluronic-acid", "vitamin-e", "dimethicone", "glycerin"], notes: "身体滋润。" },
  { id: "lip-laneige", brand: "兰芝", model: "夜间修护唇膜", category: "唇部护理", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "唇部锁水。" },
  { id: "lip-dhc", brand: "DHC", model: "橄榄润唇膏", category: "唇部护理", ingredientIds: ["squalane", "vitamin-e", "dimethicone", "petrolatum", "panthenol"], notes: "润唇护理。" },
  { id: "lip-bioderma", brand: "贝德玛", model: "润唇膏", category: "唇部护理", ingredientIds: ["squalane", "panthenol", "vitamin-e", "dimethicone", "petrolatum"], notes: "唇部舒缓。" },
  { id: "lip-laroche", brand: "理肤泉", model: "B5修护润唇膏", category: "唇部护理", ingredientIds: ["panthenol", "petrolatum", "dimethicone", "vitamin-e"], notes: "唇部修护。" },
  { id: "biore-sunscreen", brand: "碧柔", model: "水感防晒乳", category: "防晒", ingredientIds: ["sunscreen-filter", "hyaluronic-acid", "vitamin-e", "dimethicone", "glycerin"], notes: "轻薄防晒。" },
  { id: "anessa-gold", brand: "安热沙", model: "小金瓶防晒乳", category: "防晒", ingredientIds: ["sunscreen-filter", "vitamin-e", "dimethicone", "glycerin", "panthenol"], notes: "户外防晒。" },
  { id: "laroche-anthelios", brand: "理肤泉", model: "大哥大防晒", category: "防晒", ingredientIds: ["sunscreen-filter", "vitamin-e", "dimethicone", "glycerin", "panthenol"], notes: "高防护防晒。" },
  { id: "isdin-sunscreen", brand: "ISDIN", model: "怡思丁水感防晒", category: "防晒", ingredientIds: ["sunscreen-filter", "hyaluronic-acid", "vitamin-e", "dimethicone", "glycerin"], notes: "水感防晒。" },
  { id: "supergoop-unseen", brand: "Supergoop!", model: "Unseen Sunscreen", category: "防晒", ingredientIds: ["sunscreen-filter", "vitamin-e", "dimethicone", "glycerin", "panthenol"], notes: "妆前防晒。" },
  { id: "cpb-sunscreen", brand: "CPB", model: "肌肤之钥防晒隔离乳", category: "防晒", ingredientIds: ["sunscreen-filter", "hyaluronic-acid", "vitamin-e", "dimethicone", "glycerin"], notes: "防晒隔离。" },
  { id: "loreal-vitc", brand: "欧莱雅", model: "注白瓶精华", category: "精华", ingredientIds: ["vitamin-c", "niacinamide", "ferulic-acid", "vitamin-e", "licorice"], notes: "提亮抗氧化。" },
  { id: "loreal-retinol", brand: "欧莱雅", model: "复颜视黄醇精华", category: "精华", ingredientIds: ["retinol", "hyaluronic-acid", "niacinamide", "ceramide", "panthenol"], notes: "A醇抗老。" },
  { id: "loreal-cream", brand: "欧莱雅", model: "复颜抗皱紧致面霜", category: "面霜", ingredientIds: ["retinol", "hyaluronic-acid", "niacinamide", "ceramide", "panthenol"], notes: "抗老面霜。" },
  { id: "olay-retinol", brand: "OLAY", model: "超A瓶精华", category: "精华", ingredientIds: ["retinol", "niacinamide", "ceramide", "panthenol", "licorice"], notes: "A醇加烟酰胺。" },
  { id: "olay-cream", brand: "OLAY", model: "空气霜", category: "面霜", ingredientIds: ["niacinamide", "hyaluronic-acid", "licorice", "panthenol", "glycerin"], notes: "轻盈保湿。" },
  { id: "proya-ruby", brand: "珀莱雅", model: "红宝石精华", category: "精华", ingredientIds: ["peptide", "retinol", "coq10", "glycerin", "niacinamide"], notes: "抗老精华。" },
  { id: "proya-energy", brand: "珀莱雅", model: "双抗精华", category: "精华", ingredientIds: ["vitamin-c", "niacinamide", "ferulic-acid", "vitamin-e", "licorice"], notes: "抗氧化提亮。" },
  { id: "proya-mask", brand: "珀莱雅", model: "双抗面膜", category: "面膜", ingredientIds: ["vitamin-c", "hyaluronic-acid", "ferulic-acid", "vitamin-e", "licorice"], notes: "抗氧保湿面膜。" },
  { id: "winona-repair", brand: "薇诺娜", model: "舒敏保湿特护霜", category: "面霜", ingredientIds: ["centella", "ceramide", "madecassoside", "bisabolol", "cholesterol"], notes: "敏感肌修护。" },
  { id: "winona-mask", brand: "薇诺娜", model: "舒敏保湿面膜", category: "面膜", ingredientIds: ["centella", "hyaluronic-acid", "madecassoside", "bisabolol", "glycerin"], notes: "舒缓补水。" },
  { id: "winona-sunscreen", brand: "薇诺娜", model: "清透防晒乳", category: "防晒", ingredientIds: ["sunscreen-filter", "centella", "vitamin-e", "dimethicone", "madecassoside"], notes: "舒缓防晒。" },
  { id: "herborist-toner", brand: "佰草集", model: "新七白爽肤水", category: "爽肤水", ingredientIds: ["niacinamide", "hyaluronic-acid", "licorice", "panthenol", "glycerin"], notes: "提亮保湿。" },
  { id: "herborist-cream", brand: "佰草集", model: "太极面霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "滋润面霜。" },
  { id: "chando-mask", brand: "自然堂", model: "喜马拉雅补水面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "补水面膜。" },
  { id: "chando-cream", brand: "自然堂", model: "凝时鲜颜面霜", category: "面霜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "抗老保湿。" },
  { id: "pechoin-cream", brand: "百雀羚", model: "帧颜霜", category: "面霜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "滋润修护。" },
  { id: "pechoin-mask", brand: "百雀羚", model: "小雀幸面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "补水面膜。" },
  { id: "perfectdiary-cleanser", brand: "完美日记", model: "氨基酸洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "温和洁面。" },
  { id: "freeplus-cleanser", brand: "芙丽芳丝", model: "净润洗面霜", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "温和洁面。" },
  { id: "senka-cleanser", brand: "珊珂", model: "绵润泡沫洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "清洁洁面。" },
  { id: "dove-cleanser", brand: "多芬", model: "润泽洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "保湿洁面。" },
  { id: "fancl-cleansing", brand: "FANCL", model: "净化卸妆油", category: "卸妆水", ingredientIds: ["micellar", "squalane", "vitamin-e", "dimethicone", "glycerin"], notes: "卸妆清洁。" },
  { id: "shu-cleansing", brand: "植村秀", model: "琥珀卸妆油", category: "卸妆水", ingredientIds: ["micellar", "squalane", "vitamin-e", "dimethicone", "glycerin"], notes: "卸妆清洁。" },
  { id: "dhc-cleansing", brand: "DHC", model: "橄榄卸妆油", category: "卸妆水", ingredientIds: ["micellar", "squalane", "vitamin-e", "dimethicone", "glycerin"], notes: "卸妆清洁。" },
  { id: "evelom-cleanser", brand: "Eve Lom", model: "经典洁颜霜", category: "卸妆水", ingredientIds: ["micellar", "squalane", "vitamin-e", "dimethicone", "glycerin"], notes: "卸妆清洁。" },
  { id: "nars-cleanser", brand: "NARS", model: "亮采洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "洁面护理。" },
  { id: "lauramercier-mask", brand: "Laura Mercier", model: "保湿修护面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "panthenol", "glycerin", "beta-glucan", "allantoin"], notes: "保湿修护。" },
  { id: "topicals-faded", brand: "Topicals", model: "Faded淡斑精华", category: "精华", ingredientIds: ["niacinamide", "licorice", "panthenol", "glycerin", "beta-glucan"], notes: "淡斑提亮。" },
  { id: "drunk-babyfacial", brand: "Drunk Elephant", model: "Babyfacial果酸面膜", category: "面膜", ingredientIds: ["glycolic-acid", "salicylic-acid", "lactic-acid", "panthenol", "allantoin"], notes: "强酸面膜。" },
  { id: "drunk-protini", brand: "Drunk Elephant", model: "Protini胜肽面霜", category: "面霜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "胜肽保湿。" },
  { id: "tatcha-cream", brand: "Tatcha", model: "The Dewy Skin Cream", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "滋润保湿。" },
  { id: "tatcha-watercream", brand: "Tatcha", model: "The Water Cream", category: "面霜", ingredientIds: ["hyaluronic-acid", "niacinamide", "glycerin", "beta-glucan", "licorice"], notes: "轻润面霜。" },
  { id: "glossier-superpure", brand: "Glossier", model: "Super Pure精华", category: "精华", ingredientIds: ["niacinamide", "zinc-pca", "licorice", "panthenol", "glycerin"], notes: "控油提亮。" },
  { id: "glossier-balm", brand: "Glossier", model: "Balm Dotcom润唇膏", category: "唇部护理", ingredientIds: ["squalane", "vitamin-e", "dimethicone", "petrolatum", "panthenol"], notes: "唇部锁水。" },
  { id: "firstaid-cream", brand: "First Aid Beauty", model: "Ultra Repair Cream", category: "面霜", ingredientIds: ["ceramide", "panthenol", "cholesterol", "fatty-acid", "glycerin"], notes: "修护保湿。" },
  { id: "firstaid-pads", brand: "First Aid Beauty", model: "Facial Radiance Pads", category: "祛痘护理", ingredientIds: ["glycolic-acid", "lactic-acid", "panthenol", "allantoin", "zinc-pca"], notes: "温和焕肤。" },
  { id: "youth-superfood", brand: "Youth To The People", model: "Superfood Cleanser", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "洁面。" },
  { id: "innisfree-green-tea", brand: "悦诗风吟", model: "绿茶籽精华", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "补水精华。" },
  { id: "innisfree-clay", brand: "悦诗风吟", model: "火山泥清洁面膜", category: "面膜", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "清洁控油。" },
  { id: "laneige-cream", brand: "兰芝", model: "水库凝肌面霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "保湿面霜。" },
  { id: "laneige-mask", brand: "兰芝", model: "夜间修护睡眠面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "睡眠面膜。" },
  { id: "ahc-eye", brand: "AHC", model: "第十代眼霜", category: "眼霜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "眼周保湿。" },
  { id: "esteelauder-anr-eye", brand: "雅诗兰黛", model: "小棕瓶眼霜", category: "眼霜", ingredientIds: ["peptide", "hyaluronic-acid", "caffeine", "vitamin-e", "glycerin"], notes: "眼周修护保湿，适合熬夜和初老护理。" },
  { id: "lancome-genifique-eye", brand: "兰蔻", model: "小黑瓶发光眼霜", category: "眼霜", ingredientIds: ["hyaluronic-acid", "peptide", "caffeine", "glycerin", "beta-glucan"], notes: "眼周保湿、修护和细纹护理。" },
  { id: "shiseido-benefiance-eye", brand: "资生堂", model: "盼丽风姿智感抚痕眼霜", category: "眼霜", ingredientIds: ["retinol", "peptide", "hyaluronic-acid", "glycerin", "vitamin-e"], notes: "偏抗老淡纹，夜间使用更稳。" },
  { id: "skinceuticals-age-eye", brand: "修丽可", model: "AGE紧致眼霜", category: "眼霜", ingredientIds: ["peptide", "hyaluronic-acid", "caffeine", "vitamin-e", "glycerin"], notes: "眼周干纹、松弛和暗沉护理。" },
  { id: "laroche-toleriane-eye", brand: "理肤泉", model: "特安舒缓眼霜", category: "眼霜", ingredientIds: ["hyaluronic-acid", "panthenol", "glycerin", "allantoin", "dimethicone"], notes: "敏感眼周保湿舒缓。" },
  { id: "cerave-eye-repair", brand: "CeraVe", model: "修护眼霜", category: "眼霜", ingredientIds: ["ceramide", "hyaluronic-acid", "niacinamide", "glycerin", "panthenol"], notes: "屏障修护型眼霜，适合干燥眼周。" },
  { id: "kiehls-avocado-eye", brand: "科颜氏", model: "牛油果眼霜", category: "眼霜", ingredientIds: ["squalane", "hyaluronic-acid", "glycerin", "vitamin-e", "dimethicone"], notes: "滋润保湿，适合干纹明显的眼周。" },
  { id: "clinique-all-about-eyes", brand: "倩碧", model: "全效眼霜", category: "眼霜", ingredientIds: ["caffeine", "hyaluronic-acid", "glycerin", "green-tea", "panthenol"], notes: "清爽保湿，兼顾浮肿和干纹。" },
  { id: "olay-retinol-eye", brand: "OLAY", model: "超A眼霜", category: "眼霜", ingredientIds: ["retinol", "niacinamide", "peptide", "panthenol", "glycerin"], notes: "A醇淡纹眼霜，需注意频率和防晒。" },
  { id: "roc-retinol-eye", brand: "RoC", model: "Retinol Correxion眼霜", category: "眼霜", ingredientIds: ["retinol", "hyaluronic-acid", "glycerin", "panthenol", "vitamin-e"], notes: "经典A醇眼周抗皱护理。" },
  { id: "paula-resist-eye", brand: "宝拉珍选", model: "岁月屏障眼霜", category: "眼霜", ingredientIds: ["peptide", "ceramide", "niacinamide", "hyaluronic-acid", "glycerin"], notes: "修护淡纹，适合干燥和初老眼周。" },
  { id: "drunk-ceramighty-eye", brand: "Drunk Elephant", model: "Ceramighty眼霜", category: "眼霜", ingredientIds: ["ceramide", "peptide", "hyaluronic-acid", "squalane", "glycerin"], notes: "屏障修护和弹润型眼霜。" },
  { id: "proya-ruby-eye", brand: "珀莱雅", model: "红宝石眼霜", category: "眼霜", ingredientIds: ["peptide", "retinol", "coq10", "glycerin", "niacinamide"], notes: "胜肽+A醇淡纹眼霜，适合夜间抗老。" },
  { id: "marubi-eye", brand: "丸美", model: "弹力蛋白眼霜", category: "眼霜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "国货眼霜，偏弹润淡纹。" },
  { id: "hbn-eye", brand: "HBN", model: "双A醇眼霜", category: "眼霜", ingredientIds: ["retinol", "retinal", "ceramide", "panthenol", "glycerin"], notes: "进阶A类眼霜，敏感眼周慎用。" },
  { id: "lancome-clarifique", brand: "兰蔻", model: "极光水", category: "爽肤水", ingredientIds: ["glycolic-acid", "glycerin", "panthenol", "licorice", "allantoin"], notes: "轻焕肤调理，适合和修护产品错峰搭配。" },
  { id: "esteelauder-micro", brand: "雅诗兰黛", model: "微精华原生液", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "licorice"], notes: "保湿打底和肤感调理。" },
  { id: "skinceuticals-ha", brand: "修丽可", model: "HA紫米精华", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "补水保湿，适合叠在活性护理前后。" },
  { id: "skinceuticals-b5", brand: "修丽可", model: "B5保湿凝胶", category: "精华", ingredientIds: ["hyaluronic-acid", "panthenol", "glycerin", "beta-glucan"], notes: "保湿舒缓打底。" },
  { id: "paula-azelaic", brand: "宝拉珍选", model: "10%壬二酸精华", category: "精华", ingredientIds: ["azelaic-acid", "niacinamide", "licorice", "panthenol"], notes: "痘印、泛红和暗沉护理。" },
  { id: "paula-retinol", brand: "宝拉珍选", model: "1%视黄醇精华", category: "精华", ingredientIds: ["retinol", "ceramide", "niacinamide", "panthenol"], notes: "夜间抗老护理，需防晒和修护兜底。" },
  { id: "ordinary-azelaic", brand: "The Ordinary", model: "Azelaic Acid 10%", category: "精华", ingredientIds: ["azelaic-acid", "dimethicone", "panthenol", "licorice"], notes: "壬二酸提亮和油痘护理。" },
  { id: "ordinary-caffeine", brand: "The Ordinary", model: "Caffeine Solution 5% + EGCG", category: "眼霜", ingredientIds: ["caffeine", "green-tea", "glycerin", "panthenol"], notes: "眼周清爽护理。" },
  { id: "cerave-pm", brand: "CeraVe", model: "PM夜间修护乳", category: "乳液", ingredientIds: ["ceramide", "niacinamide", "hyaluronic-acid", "cholesterol", "fatty-acid"], notes: "夜间屏障修护乳。" },
  { id: "cerave-sa-cleanser", brand: "CeraVe", model: "水杨酸洁面", category: "洁面", ingredientIds: ["salicylic-acid", "ceramide", "niacinamide", "glycerin", "allantoin"], notes: "油皮毛孔清洁。" },
  { id: "laroche-effaclar", brand: "理肤泉", model: "K+乳", category: "祛痘护理", ingredientIds: ["salicylic-acid", "zinc-pca", "panthenol", "green-tea"], notes: "油痘和毛孔护理。" },
  { id: "laroche-anthelios-uvmune", brand: "理肤泉", model: "UVMune 400防晒", category: "防晒", ingredientIds: ["sunscreen-filter", "glycerin", "dimethicone", "vitamin-e"], notes: "高防护防晒。" },
  { id: "avene-cicalfate", brand: "雅漾", model: "修复霜", category: "面霜", ingredientIds: ["panthenol", "allantoin", "glycerin", "dimethicone"], notes: "屏障受损期修护。" },
  { id: "bioderma-sebium", brand: "贝德玛", model: "净妍毛孔细致精华", category: "祛痘护理", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin"], notes: "控油和毛孔护理。" },
  { id: "kiehls-calendula", brand: "科颜氏", model: "金盏花爽肤水", category: "爽肤水", ingredientIds: ["licorice", "allantoin", "glycerin", "panthenol"], notes: "舒缓调理爽肤水。" },
  { id: "kiehls-ultra-cream", brand: "科颜氏", model: "高保湿面霜", category: "面霜", ingredientIds: ["squalane", "glycerin", "dimethicone", "panthenol"], notes: "基础保湿锁水。" },
  { id: "fresh-black-tea-mask", brand: "Fresh", model: "红茶紧致睡眠面膜", category: "面膜", ingredientIds: ["peptide", "hyaluronic-acid", "glycerin", "coq10"], notes: "睡前修护面膜。" },
  { id: "nivea-lip", brand: "妮维雅", model: "深层修护润唇膏", category: "唇部护理", ingredientIds: ["petrolatum", "squalane", "vitamin-e", "panthenol"], notes: "唇部封闭保湿。" },
  { id: "neutrogena-body", brand: "露得清", model: "深层滋润身体乳", category: "身体乳", ingredientIds: ["glycerin", "dimethicone", "panthenol", "petrolatum"], notes: "沐浴后身体保湿。" },
  { id: "isdin-kox", brand: "ISDIN", model: "K-Ox Eyes眼霜", category: "眼霜", ingredientIds: ["caffeine", "hyaluronic-acid", "vitamin-e", "panthenol"], notes: "眼周保湿和清爽护理。" },
  { id: "skinceuticals-discoloration", brand: "修丽可", model: "发光瓶淡斑精华", category: "精华", ingredientIds: ["tranexamic-acid", "niacinamide", "kojic-acid", "glycerin", "licorice"], notes: "淡斑提亮，敏感期注意频率。" },
  { id: "ordinary-arbutin", brand: "The Ordinary", model: "Alpha Arbutin 2% + HA", category: "精华", ingredientIds: ["arbutin", "hyaluronic-acid", "glycerin", "panthenol"], notes: "熊果苷提亮精华。" },
  { id: "eucerin-urea", brand: "优色林", model: "5%尿素修护乳", category: "乳液", ingredientIds: ["urea", "glycerin", "ceramide", "panthenol"], notes: "干燥粗糙和角质调理。" },
  { id: "herbivore-bakuchiol", brand: "Herbivore", model: "Bakuchiol抗老精华", category: "精华", ingredientIds: ["bakuchiol", "squalane", "niacinamide", "panthenol"], notes: "温和类A醇思路。" },
  { id: "medik8-retinal", brand: "Medik8", model: "Crystal Retinal 3", category: "精华", ingredientIds: ["retinal", "ceramide", "panthenol", "glycerin"], notes: "进阶A醛夜间护理。" },
  { id: "neostrata-pha", brand: "NeoStrata", model: "PHA焕肤乳", category: "乳液", ingredientIds: ["pha", "lactic-acid", "glycerin", "panthenol"], notes: "温和酸类角质调理。" },
  { id: "bywishtrend-mandelic", brand: "By Wishtrend", model: "5%杏仁酸水", category: "爽肤水", ingredientIds: ["mandelic-acid", "panthenol", "allantoin", "green-tea"], notes: "痘肌和毛孔温和焕肤。" },
  { id: "benzac-ac", brand: "Benzac", model: "过氧化苯甲酰祛痘凝胶", category: "祛痘护理", ingredientIds: ["benzoyl-peroxide", "allantoin", "glycerin", "panthenol"], notes: "强祛痘点涂，注意干燥脱皮。" },
  { id: "de-la-cruz-sulfur", brand: "De La Cruz", model: "硫磺祛痘面膜", category: "面膜", ingredientIds: ["sulfur", "zinc-pca", "allantoin", "glycerin"], notes: "控油祛痘周护理。" },
  { id: "bodyshop-teatree", brand: "The Body Shop", model: "茶树祛痘精华", category: "祛痘护理", ingredientIds: ["tea-tree", "salicylic-acid", "allantoin", "glycerin"], notes: "茶树油痘护理，敏感肌慎用。" },
  { id: "ordinary-resveratrol", brand: "The Ordinary", model: "Resveratrol 3% + Ferulic Acid 3%", category: "精华", ingredientIds: ["resveratrol", "ferulic-acid", "vitamin-e", "glycerin"], notes: "抗氧化辅助精华。" },
  { id: "kiehls-rare-earth", brand: "科颜氏", model: "白泥清洁面膜", category: "面膜", ingredientIds: ["kaolin", "charcoal", "allantoin", "glycerin"], notes: "吸附清洁控油，短时使用。" },
  { id: "clinique-clarifying-2", brand: "倩碧", model: "明肌净透水2号", category: "爽肤水", ingredientIds: ["alcohol-denat", "menthol", "fragrance", "salicylic-acid"], notes: "清爽角质调理，敏感和屏障弱慎用。" },
  { id: "proya-dual-anti", brand: "珀莱雅", model: "双抗精华", category: "精华", ingredientIds: ["vitamin-c", "niacinamide", "ferulic-acid", "vitamin-e", "licorice"], notes: "抗氧提亮，早C思路。" },
  { id: "proya-ruby-cream", brand: "珀莱雅", model: "红宝石面霜", category: "面霜", ingredientIds: ["peptide", "retinol", "coq10", "glycerin", "niacinamide"], notes: "胜肽+A醇抗老。" },
  { id: "winona-special-cream", brand: "薇诺娜", model: "舒敏保湿特护霜", category: "面霜", ingredientIds: ["centella", "ceramide", "madecassoside", "bisabolol", "cholesterol"], notes: "敏感肌修护。" },
  { id: "pechoin-frame-cream", brand: "百雀羚", model: "帧颜淡纹霜", category: "面霜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "胜肽淡纹滋润。" },
  { id: "chando-purple-serum", brand: "自然堂", model: "小紫瓶精华", category: "精华", ingredientIds: ["niacinamide", "hyaluronic-acid", "licorice", "panthenol", "glycerin"], notes: "提亮保湿。" },
  { id: "perfectdiary-aa-cleanser", brand: "完美日记", model: "氨基酸洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "温和洁面。" },
  { id: "florasis-oil", brand: "花西子", model: "卸妆油", category: "卸妆水", ingredientIds: ["micellar", "squalane", "vitamin-e", "dimethicone", "glycerin"], notes: "温和卸妆。" },
  { id: "inoherb-rhodiola", brand: "相宜本草", model: "红景天精华", category: "精华", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "madecassoside"], notes: "保湿舒缓。" },
  { id: "kans-red-capsule", brand: "韩束", model: "红胶囊水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "niacinamide", "glycerin", "beta-glucan", "licorice"], notes: "保湿提亮爽肤水。" },
  { id: "marubi-japan-essence", brand: "丸美", model: "日本花精华", category: "精华", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "胜肽抗老保湿。" },
  { id: "dryu-barrier-cream", brand: "玉泽", model: "皮肤屏障修护霜", category: "面霜", ingredientIds: ["ceramide", "panthenol", "cholesterol", "fatty-acid", "glycerin"], notes: "屏障修护主力。" },
  { id: "runbaiyan-ha-serum", brand: "润百颜", model: "玻尿酸次抛精华", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "补水保湿次抛。" },
  { id: "quadri-5d-ha", brand: "夸迪", model: "5D玻尿酸精华", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "多重玻尿酸补水。" },
  { id: "ximuyuan-camellia", brand: "溪木源", model: "山茶花洁面", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "温和洁面。" },
  { id: "zhiben-gentle-cleanser", brand: "至本", model: "舒颜修护洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "敏感肌温和洁面。" },
  { id: "zhiben-barrier-cream", brand: "至本", model: "特安修护霜", category: "面霜", ingredientIds: ["ceramide", "panthenol", "cholesterol", "fatty-acid", "glycerin"], notes: "屏障修护。" },
  { id: "purid-no2", brand: "PURID", model: "2号精华", category: "精华", ingredientIds: ["niacinamide", "licorice", "panthenol", "glycerin", "allantoin"], notes: "提亮舒缓。" },
  { id: "johnjeff-azelaic", brand: "John Jeff", model: "壬二酸精华", category: "精华", ingredientIds: ["azelaic-acid", "niacinamide", "licorice", "panthenol"], notes: "痘肌色沉护理。" },
  { id: "johnjeff-txa", brand: "John Jeff", model: "传明酸精华", category: "精华", ingredientIds: ["tranexamic-acid", "niacinamide", "licorice", "panthenol", "glycerin"], notes: "淡斑提亮。" },
  { id: "petersons-bha-mask", brand: "毕生之研", model: "水杨酸冻膜", category: "面膜", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "控油疏通毛孔。" },
  { id: "uniskin-black-serum", brand: "优时颜", model: "黑引力精华", category: "精华", ingredientIds: ["peptide", "retinol", "coq10", "glycerin", "niacinamide"], notes: "胜肽A醇抗老。" },
  { id: "hbn-retinol-lotion", brand: "HBN", model: "视黄醇精华乳", category: "乳液", ingredientIds: ["retinol", "hyaluronic-acid", "niacinamide", "ceramide", "panthenol"], notes: "A醇抗老精华乳。" },
  { id: "hbn-arbutin-toner", brand: "HBN", model: "α-熊果苷精华水", category: "爽肤水", ingredientIds: ["arbutin", "hyaluronic-acid", "niacinamide", "licorice", "glycerin"], notes: "提亮保湿精华水。" },
  { id: "dralva-cleanser", brand: "瑷尔博士", model: "洁颜蜜", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "温和洁面蜜。" },
  { id: "dralva-probiotics-mask", brand: "瑷尔博士", model: "益生菌面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "补水修护面膜。" },
  { id: "guyu-licorice-serum", brand: "谷雨", model: "光甘草精华", category: "精华", ingredientIds: ["licorice", "niacinamide", "panthenol", "glycerin", "hyaluronic-acid"], notes: "甘草提亮舒缓。" },
  { id: "guyu-cactus-lotion", brand: "谷雨", model: "仙人掌水乳", category: "乳液", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "基础保湿水乳。" },
  { id: "rookie-turmeric", brand: "菜鸟和配方师", model: "姜黄素精华", category: "精华", ingredientIds: ["centella", "licorice", "allantoin", "glycerin", "panthenol"], notes: "舒缓抗炎。" },
  { id: "shangshui-bha", brand: "上水和肌", model: "水杨酸精华液", category: "精华", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "控油疏通毛孔。" },
  { id: "shangshui-barrier", brand: "上水和肌", model: "屏障修护霜", category: "面霜", ingredientIds: ["ceramide", "panthenol", "cholesterol", "fatty-acid", "glycerin"], notes: "屏障修护。" },
  { id: "osmun-pearl-serum", brand: "欧诗漫", model: "珍珠白精华", category: "精华", ingredientIds: ["niacinamide", "licorice", "panthenol", "glycerin", "beta-glucan"], notes: "美白提亮。" },
  { id: "oneleaf-olive", brand: "一叶子", model: "橄榄精华", category: "精华", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "滋润保湿。" },
  { id: "maskfamily-clay", brand: "膜法世家", model: "绿豆清洁泥膜", category: "面膜", ingredientIds: ["kaolin", "charcoal", "allantoin", "glycerin"], notes: "吸附清洁。" },
  { id: "herborist-bright-mask", brand: "佰草集", model: "新七白面膜", category: "面膜", ingredientIds: ["niacinamide", "hyaluronic-acid", "licorice", "panthenol", "glycerin"], notes: "提亮保湿面膜。" },
  { id: "banmu-cleanser", brand: "半亩花田", model: "氨基酸洁面", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "温和洁面。" },
  { id: "dralva-micro-water", brand: "瑷尔博士", model: "微晶水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "niacinamide", "glycerin", "beta-glucan", "licorice"], notes: "保湿提亮爽肤水。" },
  { id: "mystery-doctor-retinol", brand: "神秘博士", model: "视黄醇精华", category: "精华", ingredientIds: ["retinol", "ceramide", "niacinamide", "panthenol", "glycerin"], notes: "A醇抗老。" },
  { id: "skinfuture-377", brand: "肌肤未来", model: "377精华", category: "精华", ingredientIds: ["niacinamide", "licorice", "panthenol", "glycerin", "arbutin"], notes: "美白提亮。" },
  { id: "xiwuji-matsutake", brand: "稀物集", model: "松茸精华水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "madecassoside"], notes: "舒缓保湿精华水。" },
  { id: "yilian-ha-spray", brand: "颐莲", model: "玻尿酸补水喷雾", category: "喷雾", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "panthenol"], notes: "补水舒缓喷雾。" },
  { id: "yilian-ha-serum", brand: "颐莲", model: "玻尿酸精华", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "深层补水精华。" },
  { id: "drwu-mandelic-essence", brand: "达尔肤", model: "杏仁酸精华", category: "精华", ingredientIds: ["mandelic-acid", "panthenol", "allantoin", "green-tea"], notes: "温和酸类痘肌护理。" },
  { id: "spring-letter-vc", brand: "春日来信", model: "VC精华", category: "精华", ingredientIds: ["vitamin-c", "ferulic-acid", "vitamin-e", "hyaluronic-acid", "licorice"], notes: "早C抗氧提亮。" },
  { id: "comfy-collagen-mask", brand: "可复美", model: "类人胶原蛋白面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "centella", "glycerin", "beta-glucan", "panthenol"], notes: "医美后修护面膜。" },
  { id: "fuerjia-ha-mask", brand: "敷尔佳", model: "透明质酸钠面膜", category: "面膜", ingredientIds: ["hyaluronic-acid", "panthenol", "glycerin", "beta-glucan", "allantoin"], notes: "补水修护面膜。" },
  { id: "fuqing-acne-serum", brand: "芙清", model: "祛痘精华", category: "祛痘护理", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "控油祛痘精华。" },
  { id: "medrepair-ha-serum", brand: "米蓓尔", model: "玻尿酸精华", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "医研补水精华。" },
  { id: "sanshi-cica-serum", brand: "三式", model: "解忧精华", category: "精华", ingredientIds: ["centella", "ceramide", "madecassoside", "bisabolol", "cholesterol"], notes: "舒缓修护精华。" },
  { id: "yifuquan-txa", brand: "伊肤泉", model: "传明酸精华", category: "精华", ingredientIds: ["tranexamic-acid", "niacinamide", "licorice", "panthenol", "glycerin"], notes: "淡斑提亮精华。" },
  { id: "zhanmeiya-multi-ha", brand: "绽媄娅", model: "多重玻尿酸精华", category: "精华", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "医研多重补水。" },
  { id: "loreal-men-hydra-cleanser", brand: "欧莱雅男士", model: "水能保湿洁面膏", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "男士保湿洁面。" },
  { id: "loreal-men-hydra-lotion", brand: "欧莱雅男士", model: "水能保湿爽肤水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "男士基础补水爽肤水。" },
  { id: "loreal-men-hydra-cream", brand: "欧莱雅男士", model: "水能保湿滋润乳", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "男士保湿乳液。" },
  { id: "loreal-men-energy-cleanser", brand: "欧莱雅男士", model: "劲能醒肤洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "caffeine", "panthenol", "allantoin"], notes: "男士醒肤洁面。" },
  { id: "loreal-men-energy-cream", brand: "欧莱雅男士", model: "劲能醒肤露", category: "面霜", ingredientIds: ["caffeine", "hyaluronic-acid", "glycerin", "beta-glucan", "vitamin-e"], notes: "男士醒肤保湿面霜。" },
  { id: "loreal-men-oil-control-cleanser", brand: "欧莱雅男士", model: "控油洁面膏", category: "洁面", ingredientIds: ["salicylic-acid", "zinc-pca", "kaolin", "allantoin", "glycerin"], notes: "男士控油洁面。" },
  { id: "loreal-men-oil-control-lotion", brand: "欧莱雅男士", model: "控油爽肤水", category: "爽肤水", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "男士控油爽肤水。" },
  { id: "nivea-men-deep-cleanser", brand: "妮维雅男士", model: "深层洁净洁面乳", category: "洁面", ingredientIds: ["kaolin", "charcoal", "glycerin", "allantoin", "panthenol"], notes: "男士深层清洁。" },
  { id: "nivea-men-hydra-cream", brand: "妮维雅男士", model: "水活保湿霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "glycerin", "dimethicone", "panthenol", "vitamin-e"], notes: "男士基础保湿。" },
  { id: "nivea-men-oil-control-cleanser", brand: "妮维雅男士", model: "控油洁面泥", category: "洁面", ingredientIds: ["kaolin", "salicylic-acid", "zinc-pca", "allantoin", "glycerin"], notes: "男士控油清洁。" },
  { id: "nivea-men-sun-lotion", brand: "妮维雅男士", model: "男士防晒乳SPF30", category: "防晒", ingredientIds: ["sunscreen-filter", "vitamin-e", "dimethicone", "glycerin", "panthenol"], notes: "男士日常防晒。" },
  { id: "nivea-men-after-shave", brand: "妮维雅男士", model: "舒安须后水", category: "爽肤水", ingredientIds: ["panthenol", "allantoin", "bisabolol", "glycerin", "licorice"], notes: "男士须后舒缓。" },
  { id: "biotherm-homme-cleanser", brand: "碧欧泉男士", model: "水动力洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "男士高端洁面。" },
  { id: "biotherm-homme-aquapower", brand: "碧欧泉男士", model: "水动力保湿乳", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "男士高端保湿。" },
  { id: "biotherm-homme-force-cream", brand: "碧欧泉男士", model: "蓝钻紧致面霜", category: "面霜", ingredientIds: ["peptide", "retinol", "coq10", "glycerin", "niacinamide"], notes: "男士抗老面霜。" },
  { id: "biotherm-homme-eye", brand: "碧欧泉男士", model: "蓝钻眼霜", category: "眼霜", ingredientIds: ["caffeine", "peptide", "hyaluronic-acid", "coq10", "glycerin"], notes: "男士眼部修护。" },
  { id: "gf-bamboo-cleanser", brand: "高夫", model: "竹炭洁面乳", category: "洁面", ingredientIds: ["charcoal", "kaolin", "glycerin", "allantoin", "panthenol"], notes: "国货男士竹炭洁面。" },
  { id: "gf-bamboo-lotion", brand: "高夫", model: "竹炭爽肤水", category: "爽肤水", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "国货男士控油爽肤水。" },
  { id: "gf-energy-cream", brand: "高夫", model: "恒时水润保湿露", category: "面霜", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "vitamin-e"], notes: "国货男士保湿。" },
  { id: "gf-anti-wrinkle-cream", brand: "高夫", model: "锐智多效焕肤霜", category: "面霜", ingredientIds: ["peptide", "retinol", "niacinamide", "coq10", "glycerin"], notes: "国货男士抗皱。" },
  { id: "gf-oil-control-mask", brand: "高夫", model: "控油清洁面膜", category: "面膜", ingredientIds: ["kaolin", "charcoal", "salicylic-acid", "allantoin", "glycerin"], notes: "男士控油面膜。" },
  { id: "lab-multi-cleanser", brand: "LAB SERIES", model: "多功能洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "男士专业洁面。" },
  { id: "lab-oil-control-lotion", brand: "LAB SERIES", model: "控油哑光乳液", category: "乳液", ingredientIds: ["salicylic-acid", "zinc-pca", "niacinamide", "green-tea", "glycerin"], notes: "男士控油哑光。" },
  { id: "lab-anti-age-cream", brand: "LAB SERIES", model: "锋范抗皱面霜", category: "面霜", ingredientIds: ["retinol", "peptide", "niacinamide", "ceramide", "coq10"], notes: "男士专业抗皱。" },
  { id: "lab-power-wash", brand: "LAB SERIES", model: "磨砂洁面膏", category: "洁面", ingredientIds: ["salicylic-acid", "kaolin", "glycerin", "allantoin", "panthenol"], notes: "男士深层洁面。" },
  { id: "lab-eye-treatment", brand: "LAB SERIES", model: "锋范眼霜", category: "眼霜", ingredientIds: ["caffeine", "peptide", "hyaluronic-acid", "coq10", "glycerin"], notes: "男士眼霜。" },
  { id: "shiseido-men-cleanser", brand: "资生堂男士", model: "洁面膏", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "资生堂男士洁面。" },
  { id: "shiseido-men-lotion", brand: "资生堂男士", model: "滋润乳", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "资生堂男士滋润。" },
  { id: "shiseido-men-cream", brand: "资生堂男士", model: "焕能面霜", category: "面霜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "niacinamide"], notes: "资生堂男士抗老。" },
  { id: "shiseido-men-sun", brand: "资生堂男士", model: "男士防晒乳SPF30", category: "防晒", ingredientIds: ["sunscreen-filter", "vitamin-e", "dimethicone", "glycerin", "panthenol"], notes: "资生堂男士防晒。" },
  { id: "kiehls-men-cleanser", brand: "科颜氏男士", model: "活力洁面啫喱", category: "洁面", ingredientIds: ["caffeine", "hyaluronic-acid", "glycerin", "panthenol", "allantoin"], notes: "科颜氏男士洁面。" },
  { id: "kiehls-men-lotion", brand: "科颜氏男士", model: "活力爽肤水", category: "爽肤水", ingredientIds: ["caffeine", "hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "科颜氏男士爽肤水。" },
  { id: "kiehls-men-cream", brand: "科颜氏男士", model: "活力保湿乳液", category: "乳液", ingredientIds: ["caffeine", "hyaluronic-acid", "squalane", "glycerin", "vitamin-e"], notes: "科颜氏男士保湿。" },
  { id: "clarins-men-cleanser", brand: "娇韵诗男士", model: "活力洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "娇韵诗男士洁面。" },
  { id: "clarins-men-cream", brand: "娇韵诗男士", model: "活力神采乳液", category: "乳液", ingredientIds: ["caffeine", "hyaluronic-acid", "squalane", "glycerin", "vitamin-e"], notes: "娇韵诗男士护肤。" },
  { id: "clarins-men-anti-age", brand: "娇韵诗男士", model: "双萃精华露", category: "精华", ingredientIds: ["peptide", "retinol", "niacinamide", "coq10", "glycerin"], notes: "娇韵诗男士抗老精华。" },
  { id: "liran-cleanser", brand: "理然", model: "氨基酸洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "国货新锐男士洁面。" },
  { id: "liran-toner", brand: "理然", model: "平衡爽肤水", category: "爽肤水", ingredientIds: ["niacinamide", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "国货新锐男士爽肤水。" },
  { id: "liran-cream", brand: "理然", model: "焕能修护霜", category: "面霜", ingredientIds: ["ceramide", "hyaluronic-acid", "niacinamide", "cholesterol", "glycerin"], notes: "国货新锐男士修护。" },
  { id: "liran-sun", brand: "理然", model: "清透防晒乳SPF50", category: "防晒", ingredientIds: ["sunscreen-filter", "niacinamide", "vitamin-e", "dimethicone", "glycerin"], notes: "国货男士防晒。" },
  { id: "dearboyfriend-cleanser", brand: "亲爱男友", model: "氨基酸洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "新锐国货男士洁面。" },
  { id: "dearboyfriend-lotion", brand: "亲爱男友", model: "飞行员保湿乳", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "niacinamide", "glycerin", "vitamin-e"], notes: "新锐国货男士保湿。" },
  { id: "dearboyfriend-serum", brand: "亲爱男友", model: "淡纹精华液", category: "精华", ingredientIds: ["peptide", "niacinamide", "ceramide", "coq10", "glycerin"], notes: "新锐国货男士抗皱。" },
  { id: "jiniun-cleanser", brand: "极男", model: "海盐控油洁面乳", category: "洁面", ingredientIds: ["salicylic-acid", "zinc-pca", "kaolin", "allantoin", "glycerin"], notes: "国货男士控油洁面。" },
  { id: "jiniun-cream", brand: "极男", model: "烟酰胺亮肤乳", category: "乳液", ingredientIds: ["niacinamide", "hyaluronic-acid", "licorice", "glycerin", "panthenol"], notes: "国货男士提亮乳。" },
  { id: "jiniun-mask", brand: "极男", model: "备长炭清洁面膜", category: "面膜", ingredientIds: ["charcoal", "kaolin", "salicylic-acid", "allantoin", "glycerin"], notes: "国货男士清洁面膜。" },
  { id: "zuoyanyouse-cleanser", brand: "左颜右色", model: "男士控油洁面乳", category: "洁面", ingredientIds: ["salicylic-acid", "zinc-pca", "green-tea", "allantoin", "glycerin"], notes: "国货男士控油。" },
  { id: "zuoyanyouse-cream", brand: "左颜右色", model: "男士修护面霜", category: "面霜", ingredientIds: ["ceramide", "hyaluronic-acid", "niacinamide", "panthenol", "glycerin"], notes: "国货男士修护。" },
  { id: "hefengyu-cleanser", brand: "和风雨", model: "男士氨基酸洁面", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "国货男士温和洁面。" },
  { id: "hefengyu-lotion", brand: "和风雨", model: "男士保湿露", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "niacinamide", "glycerin", "vitamin-e"], notes: "国货男士保湿。" },
  { id: "martin-cleanser", brand: "马丁", model: "古龙香氛洁面乳", category: "洁面", ingredientIds: ["charcoal", "kaolin", "glycerin", "allantoin", "panthenol"], notes: "男士古龙香洁面。" },
  { id: "martin-lotion", brand: "马丁", model: "古龙香氛保湿乳", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "男士古龙香保湿。" },
  { id: "zunlan-cleanser", brand: "尊蓝", model: "男士控油洁面膏", category: "洁面", ingredientIds: ["salicylic-acid", "zinc-pca", "charcoal", "allantoin", "glycerin"], notes: "国货男士控油。" },
  { id: "zunlan-cream", brand: "尊蓝", model: "男士保湿霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "国货男士保湿霜。" },
  { id: "jieweier-cleanser", brand: "杰威尔", model: "男士洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "salicylic-acid", "glycerin", "allantoin", "panthenol"], notes: "国货男士洁面。" },
  { id: "jieweier-lotion", brand: "杰威尔", model: "男士劲能醒肤露", category: "乳液", ingredientIds: ["caffeine", "hyaluronic-acid", "niacinamide", "glycerin", "vitamin-e"], notes: "国货男士醒肤。" },
  { id: "bulk-homme-cleanser", brand: "BULK HOMME", model: "本客洁面乳", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "日本男士极简洁面。" },
  { id: "bulk-homme-lotion", brand: "BULK HOMME", model: "本客化妆水", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "niacinamide", "glycerin", "beta-glucan", "licorice"], notes: "日本男士极简爽肤水。" },
  { id: "bulk-homme-cream", brand: "BULK HOMME", model: "本客乳液", category: "乳液", ingredientIds: ["squalane", "hyaluronic-acid", "glycerin", "beta-glucan", "vitamin-e"], notes: "日本男士极简保湿。" },
  { id: "sk2-men-lotion", brand: "SK-II男士", model: "护肤精华露", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "licorice"], notes: "SK-II男士神仙水。" },
  { id: "sk2-men-cream", brand: "SK-II男士", model: "修护面霜", category: "面霜", ingredientIds: ["peptide", "hyaluronic-acid", "niacinamide", "coq10", "glycerin"], notes: "SK-II男士修护。" },
  { id: "nihon-men-aftershave", brand: "曼秀雷敦男士", model: "冰感须后水", category: "爽肤水", ingredientIds: ["menthol", "panthenol", "allantoin", "bisabolol", "glycerin"], notes: "男士冰感须后舒缓。" },
  { id: "mentholatum-men-cleanser", brand: "曼秀雷敦男士", model: "冰爽活炭洁面乳", category: "洁面", ingredientIds: ["charcoal", "menthol", "salicylic-acid", "allantoin", "glycerin"], notes: "男士冰爽洁面。" },
  { id: "mentholatum-men-lotion", brand: "曼秀雷敦男士", model: "能量保湿露", category: "乳液", ingredientIds: ["hyaluronic-acid", "squalane", "caffeine", "glycerin", "vitamin-e"], notes: "男士能量保湿。" },

  { id: "bosideng-men-cleanser", brand: "波斯顿", model: "男士氨基酸洁面", category: "洁面", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "allantoin"], notes: "国货男士温和洁面。" },
  { id: "bosideng-men-cream", brand: "波斯顿", model: "男士矿泉保湿霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "vitamin-e"], notes: "国货男士保湿霜。" },
  { id: "pechoin-men-cleanser", brand: "百雀羚男士", model: "控油洁面乳", category: "洁面", ingredientIds: ["salicylic-acid", "zinc-pca", "charcoal", "allantoin", "glycerin"], notes: "百雀羚男士控油洁面。" },
  { id: "pechoin-men-cream", brand: "百雀羚男士", model: "保湿焕能霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "vitamin-e"], notes: "百雀羚男士保湿。" },
  { id: "pechoin-men-lotion", brand: "百雀羚男士", model: "水能保湿乳", category: "乳液", ingredientIds: ["hyaluronic-acid", "niacinamide", "glycerin", "beta-glucan", "panthenol"], notes: "百雀羚男士水乳。" },
  { id: "inoherb-men-cleanser", brand: "相宜本草男士", model: "黑茶控油洁面", category: "洁面", ingredientIds: ["charcoal", "salicylic-acid", "zinc-pca", "allantoin", "glycerin"], notes: "相宜本草男士控油洁面。" },
  { id: "inoherb-men-cream", brand: "相宜本草男士", model: "黑茶保湿霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "vitamin-e"], notes: "相宜本草男士保湿霜。" },
  { id: "mentholatum-men-sun", brand: "曼秀雷敦男士", model: "户外骄阳防晒SPF50", category: "防晒", ingredientIds: ["sunscreen-filter", "vitamin-e", "dimethicone", "glycerin", "panthenol"], notes: "男士户外防晒。" },
  { id: "loreal-men-sun", brand: "欧莱雅男士", model: "多重防护防晒乳SPF50", category: "防晒", ingredientIds: ["sunscreen-filter", "hyaluronic-acid", "vitamin-e", "dimethicone", "glycerin"], notes: "欧莱雅男士防晒。" },
  { id: "nivea-men-oil-lotion", brand: "妮维雅男士", model: "水活多效凝露", category: "乳液", ingredientIds: ["hyaluronic-acid", "niacinamide", "caffeine", "glycerin", "vitamin-e"], notes: "男士多效保湿凝露。" },
  { id: "clinique-men-cleanser", brand: "倩碧男士", model: "净彻洁面皂", category: "洁面", ingredientIds: ["salicylic-acid", "kaolin", "glycerin", "allantoin", "panthenol"], notes: "倩碧男士洁面皂。" },
  { id: "clinique-men-lotion", brand: "倩碧男士", model: "净彻控油爽肤水", category: "爽肤水", ingredientIds: ["salicylic-acid", "alcohol-denat", "zinc-pca", "allantoin", "glycerin"], notes: "倩碧男士控油爽肤水。" },
  { id: "clinique-men-cream", brand: "倩碧男士", model: "活力焕采面霜", category: "面霜", ingredientIds: ["caffeine", "hyaluronic-acid", "peptide", "coq10", "glycerin"], notes: "倩碧男士面霜。" },
  { id: "loreal-men-mask", brand: "欧莱雅男士", model: "劲能醒肤面膜", category: "面膜", ingredientIds: ["caffeine", "hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "男士醒肤面膜。" },
  { id: "nivea-men-eye", brand: "妮维雅男士", model: "焕亮眼霜", category: "眼霜", ingredientIds: ["caffeine", "hyaluronic-acid", "vitamin-e", "glycerin", "coq10"], notes: "男士眼霜。" },

  { id: "unny-astaxanthin-cleansing-oil", brand: "UNNY CLUB 悠宜", model: "虾青素原液卸妆油", category: "卸妆水", ingredientIds: ["micellar", "squalane", "vitamin-e", "glycerin", "panthenol"], notes: "官方洗卸线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-cloud-amino-cleanser", brand: "UNNY CLUB 悠宜", model: "云感氨基酸型洁面乳2.0", category: "洁面", ingredientIds: ["sodium-cocoyl-glycinate", "sodium-lauroyl-glutamate", "glycerin", "panthenol", "allantoin"], notes: "官方洗卸线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-cloud-clear-cleanser", brand: "UNNY CLUB 悠宜", model: "云净透漾洁面乳2.0", category: "洁面", ingredientIds: ["coco-betaine", "glycerin", "panthenol", "allantoin", "green-tea"], notes: "官方洗卸线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-blackhead-strip", brand: "UNNY CLUB 悠宜", model: "双效净透去黑头鼻贴组合", category: "祛痘护理", ingredientIds: ["salicylic-acid", "zinc-pca", "allantoin", "green-tea", "glycerin"], notes: "官方洗卸护肤线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-eteecy-essence-pad", brand: "UNNY CLUB 悠宜", model: "eteecy联名精华棉片", category: "爽肤水", ingredientIds: ["niacinamide", "panthenol", "allantoin", "glycerin", "beta-glucan"], notes: "官方洗卸护肤线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-sensory-primer-cream", brand: "UNNY CLUB 悠宜", model: "感官沁润妆前面霜", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "panthenol", "dimethicone"], notes: "官方底妆护理线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-greenbean-primer", brand: "UNNY CLUB 悠宜", model: "绿豆净透妆前乳", category: "乳液", ingredientIds: ["niacinamide", "green-tea", "glycerin", "panthenol", "dimethicone"], notes: "官方底妆护理线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-moisture-mist", brand: "UNNY CLUB 悠宜", model: "舒润乳液喷雾", category: "喷雾", ingredientIds: ["hyaluronic-acid", "panthenol", "glycerin", "beta-glucan", "allantoin"], notes: "官方底妆护理线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-asahi-sunscreen", brand: "UNNY CLUB 悠宜", model: "水感朝日防晒乳", category: "防晒", ingredientIds: ["sunscreen-filter", "hyaluronic-acid", "vitamin-e", "glycerin", "dimethicone"], notes: "官方防晒线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-mineral-sunscreen", brand: "UNNY CLUB 悠宜", model: "舒护清透物理防晒霜", category: "防晒", ingredientIds: ["zinc-oxide", "titanium-dioxide", "panthenol", "vitamin-e", "dimethicone"], notes: "官方防晒线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-shake-sunscreen", brand: "UNNY CLUB 悠宜", model: "光护摇摇乐防晒乳", category: "防晒", ingredientIds: ["sunscreen-filter", "vitamin-e", "glycerin", "panthenol", "dimethicone"], notes: "官方防晒线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-silky-bright-sunscreen", brand: "UNNY CLUB 悠宜", model: "丝柔美白隔离防晒霜", category: "防晒", ingredientIds: ["sunscreen-filter", "niacinamide", "vitamin-e", "glycerin", "dimethicone"], notes: "官方防晒线；代表性活性成分映射，非完整INCI。" },
  { id: "unny-clear-bright-sunscreen", brand: "UNNY CLUB 悠宜", model: "清透美白隔离防晒乳", category: "防晒", ingredientIds: ["sunscreen-filter", "niacinamide", "licorice", "vitamin-e", "glycerin"], notes: "官方防晒线；代表性活性成分映射，非完整INCI。" },

  { id: "lamer-treatment-lotion", brand: "海蓝之谜 La Mer", model: "修护精萃水 The Treatment Lotion", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "beta-glucan", "panthenol", "madecassoside"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-concentrate", brand: "海蓝之谜 La Mer", model: "浓缩修护精华露 The Concentrate", category: "精华", ingredientIds: ["centella", "panthenol", "madecassoside", "beta-glucan", "dimethicone"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-regenerating-serum", brand: "海蓝之谜 La Mer", model: "活颜焕肤精华露 The Regenerating Serum", category: "精华", ingredientIds: ["peptide", "hyaluronic-acid", "niacinamide", "coq10", "glycerin"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-lifting-contour-serum", brand: "海蓝之谜 La Mer", model: "提升塑颜精华露 The Lifting Contour Serum", category: "精华", ingredientIds: ["peptide", "niacinamide", "hyaluronic-acid", "coq10", "glycerin"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-renewal-oil", brand: "海蓝之谜 La Mer", model: "臻璨焕活精华油 The Renewal Oil", category: "精华", ingredientIds: ["squalane", "vitamin-e", "coq10", "glycerin", "panthenol"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-soft-cream", brand: "海蓝之谜 La Mer", model: "精华柔润乳霜 The Moisturizing Soft Cream", category: "面霜", ingredientIds: ["squalane", "hyaluronic-acid", "glycerin", "beta-glucan", "vitamin-e"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-fresh-cream", brand: "海蓝之谜 La Mer", model: "精华沁润乳霜 The Moisturizing Fresh Cream", category: "面霜", ingredientIds: ["hyaluronic-acid", "glycerin", "panthenol", "beta-glucan", "dimethicone"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-cool-gel-cream", brand: "海蓝之谜 La Mer", model: "精华凝霜 The Moisturizing Cool Gel Cream", category: "面霜", ingredientIds: ["hyaluronic-acid", "glycerin", "niacinamide", "panthenol", "dimethicone"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-revitalizing-mask", brand: "海蓝之谜 La Mer", model: "密集赋活精华面膜 The Intensive Revitalizing Mask", category: "面膜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "beta-glucan", "panthenol"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-eye-concentrate", brand: "海蓝之谜 La Mer", model: "浓缩修护眼霜 The Eye Concentrate", category: "眼霜", ingredientIds: ["peptide", "hyaluronic-acid", "caffeine", "panthenol", "glycerin"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-lifting-eye-serum", brand: "海蓝之谜 La Mer", model: "鎏金焕颜精华眼霜 The Lifting Eye Serum", category: "眼霜", ingredientIds: ["peptide", "caffeine", "hyaluronic-acid", "coq10", "glycerin"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-eye-balm-intense", brand: "海蓝之谜 La Mer", model: "紧致焕采眼霜 The Eye Balm Intense", category: "眼霜", ingredientIds: ["peptide", "squalane", "hyaluronic-acid", "vitamin-e", "glycerin"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-cleansing-foam", brand: "海蓝之谜 La Mer", model: "璀璨净澈洁面泡沫 The Cleansing Foam", category: "洁面", ingredientIds: ["sodium-cocoyl-glycinate", "glycerin", "panthenol", "allantoin", "beta-glucan"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-micellar-water", brand: "海蓝之谜 La Mer", model: "清透修护洁肤水 The Cleansing Micellar Water", category: "卸妆水", ingredientIds: ["micellar", "glycerin", "panthenol", "hyaluronic-acid", "allantoin"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "lamer-lip-balm", brand: "海蓝之谜 La Mer", model: "修护唇霜 The Lip Balm", category: "唇部护理", ingredientIds: ["petrolatum", "squalane", "vitamin-e", "panthenol", "dimethicone"], notes: "La Mer主线产品；代表性活性成分映射，非完整INCI。" },

  { id: "laprairie-foam-cleanser", brand: "莱珀妮 La Prairie", model: "柔和泡沫洁面膏 Foam Cleanser", category: "洁面", ingredientIds: ["sodium-cocoyl-glycinate", "glycerin", "panthenol", "allantoin", "beta-glucan"], notes: "La Prairie主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-micellar-water", brand: "莱珀妮 La Prairie", model: "晶莹亮肤洁肤水 Crystal Micellar Water", category: "卸妆水", ingredientIds: ["micellar", "glycerin", "panthenol", "hyaluronic-acid", "allantoin"], notes: "La Prairie主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-refining-lotion", brand: "莱珀妮 La Prairie", model: "活细胞净透爽肤水 Cellular Refining Lotion", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "panthenol", "beta-glucan", "allantoin"], notes: "La Prairie主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-essence", brand: "莱珀妮 La Prairie", model: "鱼子精华琼贵丰盈精华水 Essence-in-Lotion", category: "爽肤水", ingredientIds: ["peptide", "hyaluronic-acid", "glycerin", "beta-glucan", "coq10"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-white-essence", brand: "莱珀妮 La Prairie", model: "纯皙紧致珍珠囊精华水 Light Infusion Essence", category: "爽肤水", ingredientIds: ["niacinamide", "tranexamic-acid", "hyaluronic-acid", "licorice", "glycerin"], notes: "White Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-gold-essence", brand: "莱珀妮 La Prairie", model: "金颜亮采焕活精华水 Revitalising Essence", category: "爽肤水", ingredientIds: ["vitamin-c", "vitamin-e", "hyaluronic-acid", "coq10", "glycerin"], notes: "Pure Gold线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-platinum-lotion", brand: "莱珀妮 La Prairie", model: "铂金臻稀焕颜精华水 Life-Lotion", category: "爽肤水", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "adenosine", "glycerin"], notes: "Platinum Rare线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-liquid-lift", brand: "莱珀妮 La Prairie", model: "鱼子精华琼贵紧致精华液 Liquid Lift", category: "精华", ingredientIds: ["peptide", "hyaluronic-acid", "niacinamide", "coq10", "glycerin"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-harmony", brand: "莱珀妮 La Prairie", model: "鱼子精华纯皙紧致臻塑精华 Harmony L'Extrait", category: "精华", ingredientIds: ["peptide", "niacinamide", "hyaluronic-acid", "adenosine", "glycerin"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-white-pearl", brand: "莱珀妮 La Prairie", model: "纯皙紧致珍珠囊精华液 Pearl Infusion", category: "精华", ingredientIds: ["niacinamide", "tranexamic-acid", "vitamin-c", "licorice", "hyaluronic-acid"], notes: "White Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-white-concentrate", brand: "莱珀妮 La Prairie", model: "纯皙紧致焕亮精华 Light Concentrate", category: "精华", ingredientIds: ["niacinamide", "phenylethyl-resorcinol", "vitamin-c", "licorice", "glycerin"], notes: "White Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-gold-concentrate", brand: "莱珀妮 La Prairie", model: "金颜亮采焕活精华液 Radiance Concentrate", category: "精华", ingredientIds: ["vitamin-c", "vitamin-e", "coq10", "squalane", "glycerin"], notes: "Pure Gold线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-platinum-night-elixir", brand: "莱珀妮 La Prairie", model: "铂金臻稀夜间精华 Cellular Night Elixir", category: "精华", ingredientIds: ["peptide", "retinol", "coq10", "adenosine", "squalane"], notes: "Platinum Rare线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-platinum-elixir", brand: "莱珀妮 La Prairie", model: "铂金臻稀焕颜精华 Haute-Rejuvenation Elixir", category: "精华", ingredientIds: ["peptide", "niacinamide", "coq10", "adenosine", "hyaluronic-acid"], notes: "Platinum Rare线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-hydro-emulsion", brand: "莱珀妮 La Prairie", model: "鱼子精华琼贵紧致乳液 Hydro Emulsion", category: "乳液", ingredientIds: ["peptide", "hyaluronic-acid", "squalane", "glycerin", "vitamin-e"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-luxe-cream", brand: "莱珀妮 La Prairie", model: "鱼子精华琼贵紧致面霜 Luxe Cream", category: "面霜", ingredientIds: ["peptide", "squalane", "hyaluronic-acid", "coq10", "glycerin"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-white-creme", brand: "莱珀妮 La Prairie", model: "纯皙紧致滋润面霜 Crème Extraordinaire", category: "面霜", ingredientIds: ["niacinamide", "vitamin-c", "hyaluronic-acid", "licorice", "squalane"], notes: "White Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-gold-cream", brand: "莱珀妮 La Prairie", model: "金颜亮采焕活面霜 Radiance Cream", category: "面霜", ingredientIds: ["vitamin-c", "vitamin-e", "squalane", "coq10", "glycerin"], notes: "Pure Gold线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-platinum-cream", brand: "莱珀妮 La Prairie", model: "铂金臻稀焕颜面霜 Haute-Rejuvenation Cream", category: "面霜", ingredientIds: ["peptide", "retinol", "hyaluronic-acid", "coq10", "squalane"], notes: "Platinum Rare线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-eye-cream", brand: "莱珀妮 La Prairie", model: "鱼子精华琼贵紧致眼霜 Luxe Eye Cream", category: "眼霜", ingredientIds: ["peptide", "hyaluronic-acid", "caffeine", "coq10", "glycerin"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-eye-lift", brand: "莱珀妮 La Prairie", model: "鱼子精华琼贵眼部紧致精华 Eye Lift", category: "眼霜", ingredientIds: ["peptide", "caffeine", "hyaluronic-acid", "adenosine", "glycerin"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-white-eye", brand: "莱珀妮 La Prairie", model: "纯皙紧致眼霜 Eye Extraordinaire", category: "眼霜", ingredientIds: ["niacinamide", "caffeine", "vitamin-c", "hyaluronic-acid", "licorice"], notes: "White Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-gold-eye", brand: "莱珀妮 La Prairie", model: "金颜亮采焕活眼霜 Radiance Eye Cream", category: "眼霜", ingredientIds: ["caffeine", "vitamin-c", "vitamin-e", "coq10", "glycerin"], notes: "Pure Gold线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-platinum-eye", brand: "莱珀妮 La Prairie", model: "铂金臻稀焕颜眼霜 Haute-Rejuvenation Eye Cream", category: "眼霜", ingredientIds: ["peptide", "retinol", "caffeine", "coq10", "hyaluronic-acid"], notes: "Platinum Rare线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-caviar-sleep-mask", brand: "莱珀妮 La Prairie", model: "鱼子精华睡眠面膜 Skin Caviar Luxe Sleep Mask", category: "面膜", ingredientIds: ["peptide", "squalane", "hyaluronic-acid", "glycerin", "vitamin-e"], notes: "Skin Caviar线；代表性活性成分映射，非完整INCI。" },
  { id: "laprairie-platinum-mask", brand: "莱珀妮 La Prairie", model: "铂金臻稀焕颜面膜 Haute-Rejuvenation Mask", category: "面膜", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "adenosine", "glycerin"], notes: "Platinum Rare线；代表性活性成分映射，非完整INCI。" },

  { id: "valmont-fluid-falls", brand: "法尔曼 Valmont", model: "菁凝净肤洁面乳 Fluid Falls", category: "卸妆水", ingredientIds: ["micellar", "squalane", "glycerin", "panthenol", "vitamin-e"], notes: "Valmont主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-icy-falls", brand: "法尔曼 Valmont", model: "冰凝洁面乳 Icy Falls", category: "洁面", ingredientIds: ["coco-betaine", "glycerin", "panthenol", "allantoin", "beta-glucan"], notes: "Valmont主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-vital-falls", brand: "法尔曼 Valmont", model: "生命之泉润肤露 Vital Falls", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "panthenol", "beta-glucan", "allantoin"], notes: "Valmont主线产品；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-primary-veil", brand: "法尔曼 Valmont", model: "法尔曼幸福面膜前导精华 Primary Veil", category: "精华", ingredientIds: ["hyaluronic-acid", "panthenol", "glycerin", "beta-glucan", "madecassoside"], notes: "Primary线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-moisturizing-booster", brand: "法尔曼 Valmont", model: "保湿能量精华 Moisturizing Booster", category: "精华", ingredientIds: ["hyaluronic-acid", "polyglutamic-acid", "glycerin", "panthenol", "beta-glucan"], notes: "Moisturizing线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-hydra3-serum", brand: "法尔曼 Valmont", model: "臻润补水精华 Hydra3 Regenetic Serum", category: "精华", ingredientIds: ["hyaluronic-acid", "polyglutamic-acid", "glycerin", "panthenol", "ectoin"], notes: "Hydra3线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-hydra3-cream", brand: "法尔曼 Valmont", model: "臻润补水面霜 Hydra3 Regenetic Cream", category: "面霜", ingredientIds: ["hyaluronic-acid", "squalane", "glycerin", "ceramide", "vitamin-e"], notes: "Hydra3线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-prime-regenera-i", brand: "法尔曼 Valmont", model: "升效更新焕肤霜 Prime Regenera I", category: "面霜", ingredientIds: ["peptide", "hyaluronic-acid", "squalane", "coq10", "glycerin"], notes: "Prime线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-prime-regenera-ii", brand: "法尔曼 Valmont", model: "升效更新焕肤霜 Prime Regenera II", category: "面霜", ingredientIds: ["peptide", "squalane", "hyaluronic-acid", "vitamin-e", "coq10"], notes: "Prime线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-prime-renewing-pack", brand: "法尔曼 Valmont", model: "幸福面膜 Prime Renewing Pack", category: "面膜", ingredientIds: ["hyaluronic-acid", "glycerin", "panthenol", "beta-glucan", "allantoin"], notes: "Prime线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-vline-concentrate", brand: "法尔曼 Valmont", model: "V脸紧致精华 V-Line Lifting Concentrate", category: "精华", ingredientIds: ["peptide", "hyaluronic-acid", "niacinamide", "coq10", "glycerin"], notes: "V-Line线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-vfirm-cream", brand: "法尔曼 Valmont", model: "V脸紧致面霜 V-Firm Cream", category: "面霜", ingredientIds: ["peptide", "squalane", "hyaluronic-acid", "coq10", "glycerin"], notes: "V-Line线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-detox-cream", brand: "法尔曼 Valmont", model: "氧气泡泡霜 DetO2x Cream", category: "面霜", ingredientIds: ["vitamin-c", "vitamin-e", "coq10", "hyaluronic-acid", "glycerin"], notes: "DetO2x线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-lumisence", brand: "法尔曼 Valmont", model: "亮颜修护精华 LumiSence", category: "精华", ingredientIds: ["vitamin-c", "niacinamide", "tranexamic-acid", "licorice", "hyaluronic-acid"], notes: "Luminosity线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-clarifying-infusion", brand: "法尔曼 Valmont", model: "澄净亮颜精华水 Clarifying Infusion", category: "爽肤水", ingredientIds: ["niacinamide", "vitamin-c", "licorice", "glycerin", "panthenol"], notes: "Luminosity线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-eye-cream", brand: "法尔曼 Valmont", model: "眼部升效更新护理 Prime Contour", category: "眼霜", ingredientIds: ["peptide", "hyaluronic-acid", "caffeine", "coq10", "glycerin"], notes: "Valmont眼部线；代表性活性成分映射，非完整INCI。" },
  { id: "valmont-moisturizing-mask", brand: "法尔曼 Valmont", model: "臻润补水面膜 Moisturizing With A Mask", category: "面膜", ingredientIds: ["hyaluronic-acid", "glycerin", "panthenol", "beta-glucan", "squalane"], notes: "Moisturizing线；代表性活性成分映射，非完整INCI。" },

  { id: "hr-pure-ritual-foam", brand: "赫莲娜 Helena Rubinstein", model: "净澈焕颜洁面乳 Pure Ritual Care-in-Foam", category: "洁面", ingredientIds: ["sodium-cocoyl-glycinate", "glycerin", "panthenol", "allantoin", "beta-glucan"], notes: "Pure Ritual线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-pure-ritual-milk", brand: "赫莲娜 Helena Rubinstein", model: "净澈焕颜卸妆乳 Pure Ritual Care-in-Milk", category: "卸妆水", ingredientIds: ["micellar", "squalane", "glycerin", "panthenol", "vitamin-e"], notes: "Pure Ritual线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-powercell-essence", brand: "赫莲娜 Helena Rubinstein", model: "绿宝瓶精华水 Powercell Skinmunity Essence", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "glycerin", "panthenol", "beta-glucan", "centella"], notes: "Powercell线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-powercell-serum", brand: "赫莲娜 Helena Rubinstein", model: "绿宝瓶精华 Powercell Skinmunity Serum", category: "精华", ingredientIds: ["hyaluronic-acid", "centella", "madecassoside", "panthenol", "beta-glucan"], notes: "Powercell线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-powercell-cream", brand: "赫莲娜 Helena Rubinstein", model: "绿宝瓶面霜 Powercell Skinmunity Cream", category: "面霜", ingredientIds: ["ceramide", "hyaluronic-acid", "centella", "panthenol", "glycerin"], notes: "Powercell线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-powercell-emulsion", brand: "赫莲娜 Helena Rubinstein", model: "绿宝瓶乳液 Powercell Skinmunity Emulsion", category: "乳液", ingredientIds: ["hyaluronic-acid", "centella", "panthenol", "glycerin", "beta-glucan"], notes: "Powercell线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-powercell-eye", brand: "赫莲娜 Helena Rubinstein", model: "绿宝瓶眼霜 Powercell Skinmunity Eye Care", category: "眼霜", ingredientIds: ["peptide", "caffeine", "hyaluronic-acid", "panthenol", "glycerin"], notes: "Powercell线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-powercell-rehab-serum", brand: "赫莲娜 Helena Rubinstein", model: "绿宝瓶夜间修护精华 Skin Rehab Night Serum", category: "精华", ingredientIds: ["peptide", "hyaluronic-acid", "centella", "coq10", "glycerin"], notes: "Powercell线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-replasty-day", brand: "赫莲娜 Helena Rubinstein", model: "黑绷带日霜 Replasty Age Recovery Day", category: "面霜", ingredientIds: ["panthenol", "madecassoside", "hyaluronic-acid", "dimethicone", "glycerin"], notes: "Replasty线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-replasty-night", brand: "赫莲娜 Helena Rubinstein", model: "黑绷带面霜 Replasty Age Recovery Night Cream", category: "面霜", ingredientIds: ["panthenol", "madecassoside", "ceramide", "dimethicone", "glycerin"], notes: "Replasty线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-replasty-eye", brand: "赫莲娜 Helena Rubinstein", model: "黑绷带眼霜 Replasty Eye Repairing Night Care", category: "眼霜", ingredientIds: ["peptide", "panthenol", "hyaluronic-acid", "caffeine", "madecassoside"], notes: "Replasty线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-replasty-profiller", brand: "赫莲娜 Helena Rubinstein", model: "玻玻A精华 Replasty Pro Filler", category: "精华", ingredientIds: ["hyaluronic-acid", "peptide", "niacinamide", "panthenol", "glycerin"], notes: "Replasty线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-replasty-laserist", brand: "赫莲娜 Helena Rubinstein", model: "镭射光度精华 Replasty Laserist", category: "精华", ingredientIds: ["vitamin-c", "niacinamide", "tranexamic-acid", "licorice", "hyaluronic-acid"], notes: "Replasty线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-replasty-power-a-ha", brand: "赫莲娜 Helena Rubinstein", model: "Replasty Power A + H.A", category: "精华", ingredientIds: ["retinol", "hyaluronic-acid", "ceramide", "panthenol", "glycerin"], notes: "Replasty线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-cellglow-essence", brand: "赫莲娜 Helena Rubinstein", model: "至美琉光恒采精华水 Prodigy Cellglow Essence", category: "爽肤水", ingredientIds: ["hyaluronic-acid", "vitamin-c", "glycerin", "panthenol", "beta-glucan"], notes: "Prodigy Cellglow线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-cellglow-concentrate", brand: "赫莲娜 Helena Rubinstein", model: "至美琉光恒采精华 Deep Renewing Concentrate", category: "精华", ingredientIds: ["peptide", "vitamin-c", "niacinamide", "coq10", "hyaluronic-acid"], notes: "Prodigy Cellglow线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-cellglow-cream", brand: "赫莲娜 Helena Rubinstein", model: "至美琉光恒采面霜 Radiant Regenerating Cream", category: "面霜", ingredientIds: ["peptide", "squalane", "hyaluronic-acid", "coq10", "glycerin"], notes: "Prodigy Cellglow线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-cellglow-eye", brand: "赫莲娜 Helena Rubinstein", model: "至美琉光恒采眼霜 Radiant Eye Treatment", category: "眼霜", ingredientIds: ["peptide", "caffeine", "hyaluronic-acid", "coq10", "glycerin"], notes: "Prodigy Cellglow线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-cellglow-oilixir", brand: "赫莲娜 Helena Rubinstein", model: "至美琉光恒采精华油 The Ultimate Oilixir", category: "精华", ingredientIds: ["squalane", "vitamin-e", "coq10", "peptide", "glycerin"], notes: "Prodigy Cellglow线；代表性活性成分映射，非完整INCI。" },
  { id: "hr-cellglow-mask", brand: "赫莲娜 Helena Rubinstein", model: "至美琉光恒采面膜 Prodigy Cellglow Mask", category: "面膜", ingredientIds: ["hyaluronic-acid", "peptide", "vitamin-c", "glycerin", "panthenol"], notes: "Prodigy Cellglow线；代表性活性成分映射，非完整INCI。" },

  { id: "clarins-neck", brand: "娇韵诗", model: "焕颜紧致颈霜", category: "颈部护理", ingredientIds: ["peptide", "hyaluronic-acid", "squalane", "glycerin", "vitamin-e"], notes: "颈部保湿和紧致护理。" },
  { id: "strivectin-neck", brand: "StriVectin", model: "TL Advanced颈霜", category: "颈部护理", ingredientIds: ["peptide", "niacinamide", "hyaluronic-acid", "glycerin", "panthenol"], notes: "颈部纹路和弹性护理。" },
  { id: "sisley-neck", brand: "Sisley", model: "颈部紧致修护霜", category: "颈部护理", ingredientIds: ["squalane", "peptide", "vitamin-e", "glycerin", "beta-glucan"], notes: "颈部滋润修护。" },
  { id: "fresh-neck", brand: "Fresh", model: "红茶塑颜颈霜", category: "颈部护理", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "vitamin-e"], notes: "睡前颈部护理。" },
  { id: "esteelauder-neck", brand: "雅诗兰黛", model: "白金级颈霜", category: "颈部护理", ingredientIds: ["peptide", "retinol", "hyaluronic-acid", "coq10", "ceramide"], notes: "高端颈部抗老紧致。" },
  { id: "lancome-neck", brand: "兰蔻", model: "紧致颈霜", category: "颈部护理", ingredientIds: ["peptide", "hyaluronic-acid", "squalane", "glycerin", "coq10"], notes: "兰蔻紧致颈部护理。" },
  { id: "skinceuticals-neck", brand: "修丽可", model: "颈部紧致精华", category: "颈部护理", ingredientIds: ["peptide", "retinol", "niacinamide", "hyaluronic-acid", "glycerin"], notes: "颈部精华抗老。" },
  { id: "loreal-neck", brand: "欧莱雅", model: "复颜紧致颈霜", category: "颈部护理", ingredientIds: ["retinol", "hyaluronic-acid", "peptide", "glycerin", "panthenol"], notes: "平价颈部抗老。" },
  { id: "olay-neck", brand: "OLAY", model: "新生塑颜颈霜", category: "颈部护理", ingredientIds: ["niacinamide", "peptide", "hyaluronic-acid", "glycerin", "panthenol"], notes: "OLAY颈部紧致。" },
  { id: "proya-neck", brand: "珀莱雅", model: "红宝石颈霜", category: "颈部护理", ingredientIds: ["peptide", "retinol", "hyaluronic-acid", "coq10", "glycerin"], notes: "国产颈部抗老。" },
  { id: "proya-neck-mask", brand: "珀莱雅", model: "双抗颈膜", category: "颈部护理", ingredientIds: ["niacinamide", "hyaluronic-acid", "ferulic-acid", "vitamin-e", "licorice"], notes: "颈部提亮紧致颈膜。" },
  { id: "chando-neck", brand: "自然堂", model: "凝时紧致颈霜", category: "颈部护理", ingredientIds: ["peptide", "hyaluronic-acid", "coq10", "glycerin", "beta-glucan"], notes: "国货颈部紧致。" },
  { id: "pechoin-neck", brand: "百雀羚", model: "帧颜紧致颈霜", category: "颈部护理", ingredientIds: ["peptide", "hyaluronic-acid", "glycerin", "beta-glucan", "panthenol"], notes: "百雀羚颈部淡纹。" },
  { id: "loreal-men-neck", brand: "欧莱雅男士", model: "劲能紧致颈霜", category: "颈部护理", ingredientIds: ["caffeine", "peptide", "hyaluronic-acid", "glycerin", "panthenol"], notes: "男士颈部护理。" },
  { id: "nivea-neck", brand: "妮维雅", model: "Q10紧致颈霜", category: "颈部护理", ingredientIds: ["coq10", "peptide", "hyaluronic-acid", "glycerin", "vitamin-e"], notes: "平价Q10颈部护理。" },

];
