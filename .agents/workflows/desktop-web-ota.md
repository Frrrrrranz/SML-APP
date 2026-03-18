---
description: 桌面端 Web OTA 发布流程（适用于支持桌面 Web 热更新的客户端）
---

# /desktop-web-ota

用于发布“仅 Web 资源”的桌面端热更新，不需要重新打 Electron 安装包。

## 前提

1. 目标桌面客户端已具备 Web OTA 能力。
2. 本次改动不涉及 Electron 主进程、preload、原生依赖或安装包行为。

## 步骤

1. 更新 [constants/app-version.ts](../../constants/app-version.ts) 中的 `DESKTOP_WEB_VERSION`，仅递增第 4 位。
2. 执行构建：
```bash
npm run build
```
3. 使用 Capgo CLI 打包 zip（不要使用 `Compress-Archive`）：
```bash
npx -y @capgo/cli bundle zip dist
Rename-Item dist_<version>.zip web-bundle-desktop.zip
```
4. 创建 GitHub Release：
- tag 格式：`web-desktop-v<DESKTOP_WEB_VERSION>`
- 资产文件：`web-bundle-desktop.zip`
- 必须使用：`--prerelease --latest=false`
```bash
gh release create web-desktop-v<DESKTOP_WEB_VERSION> web-bundle-desktop.zip --title "Desktop Web OTA v<DESKTOP_WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```
5. 如需保留源码记录，再提交 `DESKTOP_WEB_VERSION` 变更并推送到主分支。

## 强制规则

- 所有 OTA Release（Android/桌面）必须是 `pre-release`
- 所有 OTA Release 必须附加 `--latest=false`

## 何时不要使用本流程

1. 需要修改 Electron 主进程、preload 或自动更新器
2. 需要升级 Node 原生模块或打包配置
3. 需要修改 Android 原生工程

以上场景应走正式发版流程，而不是桌面 Web OTA。
