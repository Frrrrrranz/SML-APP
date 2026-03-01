---
description: 构建 Web 并同步到 Android 原生项目
---

# /run — 构建并同步

每次修改 Web 代码后，执行以下步骤将变更同步到 Android 项目：

// turbo-all

1. 构建 Web 产物

```bash
npm run build
```

2. 同步到 Android 原生项目

```bash
npx cap sync
```

完成后即可在 Android Studio 中构建 APK 部署到手机。

## 注意事项
- 如果只修改了前端代码（HTML/CSS/JS/TS/TSX），只需要执行以上两步 + Android Studio Run
- 如果修改了 Capacitor 插件或 `capacitor.config.ts`，sync 会自动处理
- 如果新增了原生插件（如 `npm install @capacitor/xxx`），需要在 Android Studio 中重新 Sync Gradle
