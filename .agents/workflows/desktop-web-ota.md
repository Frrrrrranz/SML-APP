---
description: 桌面端 Web 资源 OTA 发布流程（适用于 v1.0.7+ 客户端）
---

# /desktop-web-ota

用于发布“仅前端资源”的桌面端热更新，不需要重新打 Electron 安装包。

## 前提

1. 用户已安装包含桌面 Web OTA 能力的客户端（`v1.0.7` 或更高）。
2. 本次变更不涉及 Electron 主进程、preload、原生依赖或安装器行为。

## 步骤

1. 更新 `constants/app-version.ts` 的 `WEB_VERSION`（仅第四位递增）。
2. 执行 `npm run build` 产出 `dist/`。
3. 使用 Capgo CLI 打包 zip（不要使用 `Compress-Archive`）：
   - `npx -y @capgo/cli bundle zip dist`
   - `Rename-Item dist_0.0.0.zip web-bundle.zip`
4. 创建 GitHub Release：
   - tag 规范：`web-v<WEB_VERSION>`（例如 `web-v1.0.7.1`）
   - 附件必须包含 `web-bundle.zip`
5. 如需保留源码记录，再提交 `WEB_VERSION` 变更并推送到主分支。

## 何时不要用本流程

1. 需要修改 Electron 主进程 / preload / 自动更新器。
2. 需要升级 Node 原生模块或打包配置。
3. 需要修改 Android 原生工程。

以上场景请走桌面正式发布（`v*` tag）或 Android 发布流程。
