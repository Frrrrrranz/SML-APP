---
description: 桌面端正式发布流程（打包 + Tag 触发 CI）
---

# /release-desktop

适用于非 OTA 的正式发版（`v*` tag）。

## 强制规则（非 OTA）

必须同步更新并保持一致：
- `package.json` 的 `version`
- `constants/app-version.ts` 的 `APP_VERSION`
- `android/app/build.gradle` 的 `versionName`
- Git Tag：`v<version>`

必须重置：
- `ANDROID_WEB_VERSION = '<version>.0'`
- `DESKTOP_WEB_VERSION = '<version>.0'`

必须递增：
- `android/app/build.gradle` 的 `versionCode`

## 步骤

1. 确定新版本号 `<version>`（例如 `1.0.10`）。
2. 更新 `package.json`：`"version": "<version>"`。
3. 更新 `constants/app-version.ts`：
- `APP_VERSION = '<version>'`
- `ANDROID_WEB_VERSION = '<version>.0'`
- `DESKTOP_WEB_VERSION = '<version>.0'`
4. 更新 `android/app/build.gradle`：
- `versionName "<version>"`
- `versionCode` +1
5. 如有前端改动，执行 `/run`（build + sync）。
6. 提交并推送版本变更。
7. 创建并推送 tag：
```bash
git tag -a v<version> -m "Release v<version>"
git push origin v<version>
```

## 说明

- 推送 `v*` tag 会触发 `.github/workflows/release.yml`
- CI 包含版本一致性校验，不一致会失败
- OTA 更新不走本流程，Android 用 `/android-web-ota`，桌面 Web 用 `/desktop-web-ota`
