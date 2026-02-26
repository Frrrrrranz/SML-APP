---
description: 构建并部署 Android APK 到手机
---

# 构建 Android APK

每次修改前端代码后，按以下步骤将更新部署到手机：

// turbo-all

1. 构建前端资源
```bash
npm run build
```

2. 同步到 Android 项目
```bash
npx cap sync android
```

3. 打开 Android Studio，点击 ▶️ Run 按钮安装到手机

## 注意事项
- 如果只修改了前端代码（HTML/CSS/JS/TS/TSX），只需要执行步骤 1-3
- 如果修改了 Capacitor 插件或 `capacitor.config.ts`，需要先执行 `npx cap sync android`
- 如果新增了原生插件（如 `npm install @capacitor/xxx`），需要在 Android Studio 中重新 Sync Gradle
