---
description: 非 OTA 正式发布前的版本号同步工作流
---

# /version

用于非 OTA 正式发布准备，目标是让 Android、桌面端与 Git Tag 版本一致，并重置两端 OTA 版本基线。

## 强制规则（非 OTA）

以下字段必须与目标版本 `<version>` 一致：
- `package.json` -> `version`
- `constants/app-version.ts` -> `APP_VERSION`
- `android/app/build.gradle` -> `versionName`

以下字段必须重置为 `<version>.0`：
- `constants/app-version.ts` -> `ANDROID_WEB_VERSION`
- `constants/app-version.ts` -> `DESKTOP_WEB_VERSION`

`android/app/build.gradle` 的 `versionCode` 必须递增。

## 步骤

1. 确定 `<version>`（例如 `1.0.10`）。
2. 更新 `package.json` 的 `version`。
3. 更新 `constants/app-version.ts`：
- `APP_VERSION = '<version>'`
- `ANDROID_WEB_VERSION = '<version>.0'`
- `DESKTOP_WEB_VERSION = '<version>.0'`
4. 更新 `android/app/build.gradle`：
- `versionName "<version>"`
- `versionCode` +1
5. 如有 Web 改动，执行 `/run`。
6. 执行 `/push`。
7. 创建并推送 `v<version>` tag 触发发布 CI。

## 版本规则

- 非 OTA 正式发版：两端 OTA 版本第 4 位都重置为 `.0`
- Android OTA 热更新：只递增 `ANDROID_WEB_VERSION` 第 4 位
- Desktop OTA 热更新：只递增 `DESKTOP_WEB_VERSION` 第 4 位
