---
description: 更新 APK 大版本号（如 1.0.2 → 1.0.3）
---

# /version — 更新版本号

当发布新 APK 时，更新 Web 版本号以与 APK 版本保持同步。

## 步骤

1. 用户提供新的 APK 版本号（如 `1.0.3`）

2. 更新 `constants/app-version.ts` 中的 `WEB_VERSION` 为 `<新版本号>.0`
   - 例如：APK 版本 `1.0.3` → `WEB_VERSION = '1.0.3.0'`

3. 更新 `android/app/build.gradle` 中的 `versionCode`（递增 1）和 `versionName`（改为新版本号）

4. 执行 `/run`（build + sync）

5. 执行 `/push`

## 版本号规则
- 前三位（`1.0.3`）与 APK 版本保持一致
- 第四位（`.0`）用于 OTA 热更新递增，每次 `/ota` 会自动 +1
- 发布新 APK 时第四位重置为 `.0`
