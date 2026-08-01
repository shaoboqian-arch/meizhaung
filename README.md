# Beauty Ingredient App

美妆成分搭配助手：用于选择皮肤情况、管理护肤品库、查看成分说明，并分析当前护肤组合的搭配风险与推荐补充项。

## 内容

- `src/`：React + Vite Web 应用源码。
- `src/data/`：成分库、产品库、搭配规则、推荐逻辑。
- `public/`：Web 公共静态资源。
- `mp-weixin/`：Taro 微信小程序源码与配置。
- `ios/`：Capacitor iOS 项目外壳，不包含生成的 Web 构建产物和 Xcode 用户状态。
- `IOS_PERSONAL_INSTALL.md`：iOS 本机安装说明。

## 运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

微信小程序构建：

```bash
npm run mp:build
```
