---
description: 非 OTA 正式发布前的版本号同步工作流
---

# /version - 同步正式版本号

用于非 OTA 的正式发布准备。目标是让 Android、桌面端与 tag 版本完全一致。

## 强制规则（非 OTA）
- 以下字段必须与目标版本 `<version>` 一致：
- `package.json` -> `version`
- `constants/app-version.ts` -> `APP_VERSION`
- `android/app/build.gradle` -> `versionName`
- `constants/app-version.ts` 的 `WEB_VERSION` 必须为 `<version>.0`。
- `android/app/build.gradle` 的 `versionCode` 必须递增。

## 步骤
1. 确定 `<version>`（如 `1.0.10`）。
2. 更新 `package.json` 的 `version`。
3. 更新 `constants/app-version.ts`：
- `APP_VERSION = '<version>'`
- `WEB_VERSION = '<version>.0'`
4. 更新 `android/app/build.gradle`：
- `versionName "<version>"`
- `versionCode` +1
5. 执行 `/run`（如有 Web 变更）。
6. 执行 `/push`。
7. 创建并推送 `v<version>` tag 触发发布 CI。

## 版本规则
- 非 OTA 正式发版：第四位固定重置为 `.0`。
- OTA 热更新：只递增 `WEB_VERSION` 第四位，不改大版本。
