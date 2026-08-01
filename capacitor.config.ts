import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shaobo.beautyingredient",
  appName: "成分搭配助手",
  webDir: "dist",
  ios: {
    contentInset: "automatic"
  }
};

export default config;
