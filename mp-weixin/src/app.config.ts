export default defineAppConfig({
  lazyCodeLoading: "requiredComponents",
  pages: [
    "pages/analysis/index",
    "pages/products/index",
    "pages/ingredients/index",
    "pages/conditions/index",
    "pages/product-add/index",
    "pages/product-detail/index",
    "pages/ingredient-detail/index"
  ],
  /**
   * 不要在这里声明 custom-wrapper。
   * Taro 4.x 把 custom-wrapper 作为内建运行时组件，编译期会自行注入；
   * 手工声明会指向 fix 脚本生成的壳文件，而壳文件又import base.wxml，
   * base.wxml 里有 45 处 <custom-wrapper> —— 形成循环引用，页面渲染失败（白屏）。
   */
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
      { pagePath: "pages/analysis/index", text: "搭配" },
      { pagePath: "pages/products/index", text: "产品" },
      { pagePath: "pages/ingredients/index", text: "成分" },
      { pagePath: "pages/conditions/index", text: "我的" }
    ]
  }
});
