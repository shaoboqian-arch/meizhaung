export default defineAppConfig({
  lazyCodeLoading: "requiredComponents",
  pages: [
    "pages/conditions/index",
    "pages/products/index",
    "pages/ingredients/index",
    "pages/analysis/index"
  ],
  usingComponents: {
    "custom-wrapper": "./custom-wrapper"
  },
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#ffffff",
    navigationBarTitleText: "成分搭配助手",
    navigationBarTextStyle: "black"
  },
  tabBar: {
    color: "#9a7a6d",
    selectedColor: "#e86f5c",
    backgroundColor: "#fffdf9",
    borderStyle: "white",
    list: [
      { pagePath: "pages/conditions/index", text: "情况" },
      { pagePath: "pages/products/index", text: "产品库" },
      { pagePath: "pages/ingredients/index", text: "成分库" },
      { pagePath: "pages/analysis/index", text: "分析" }
    ]
  }
});
