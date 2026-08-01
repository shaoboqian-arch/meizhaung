# iOS 个人试用装机

## 当前状态
- 已接入 Capacitor iOS。
- iOS 工程目录：`ios/App/App.xcworkspace`。
- Windows 已完成 Web 构建和 iOS 资源同步。
- Bundle Identifier：`com.shaobo.beautyingredient`。
- Web/iOS 已接入柔和字体资源；微信小程序未内嵌该字体，避免 WXSS 体积暴涨。
- 真机安装必须在 macOS + Xcode 上完成。

## Mac 准备
1. 安装 Xcode，并首次打开完成组件安装。
2. 安装 Node.js 20 LTS。
3. 安装 CocoaPods：

```bash
sudo gem install cocoapods
```

4. Xcode 登录 Apple ID：Settings -> Accounts。
5. iPhone 连接 Mac，并在手机上信任电脑。
6. iOS 16 以上打开开发者模式：设置 -> 隐私与安全性 -> 开发者模式。

## 最快装机步骤
```bash
cd 美妆项目
npm install --legacy-peer-deps
npm run ios:sync
npm run ios:open
```

## Xcode 操作
1. 打开 `ios/App/App.xcworkspace`，不要打开 `xcodeproj`。
2. 选择 `App` target。
3. Signing & Capabilities 里选择你的 Team。
4. 如果 Bundle Identifier 被占用，改成唯一值，例如 `com.shaobo.beautyingredient.dev`。
5. 顶部设备选择你的 iPhone。
6. 点击 Run。

## 手机侧
首次运行如果提示未信任开发者：

设置 -> 通用 -> VPN与设备管理 -> 信任你的 Apple ID 开发者证书。

免费 Apple ID 的个人试用包通常 7 天失效，到期后回 Xcode 重新 Run。

## 后续更新
```bash
npm run ios:sync
```

然后回 Xcode 再点 Run。

## 常见错误
- 找不到 Pods：在 `ios/App` 目录执行 `pod install`。
- 签名失败：换唯一 Bundle Identifier，并确认 Team 已选择。
- 真机不可选：确认手机已信任电脑，且开发者模式已开启。
