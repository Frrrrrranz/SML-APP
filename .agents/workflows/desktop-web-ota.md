---
description: 桌面端 Web 资源 OTA 发布流程（适用于 v1.0.7+ 客户端）
---

# /desktop-web-ota

用于发布“仅前端 Web 资源”的桌面端热更新，不需要重新打 Electron 安装包。

## 前提

1. 用户安装的桌面客户端已具备 Web OTA 能力，版本至少为 `v1.0.7`。
2. 本次改动不涉及 Electron 主进程、`preload`、原生依赖或安装包行为。

## 步骤

1. 更新 [constants/app-version.ts](../../constants/app-version.ts) 中的 `WEB_VERSION`，仅递增第 4 位。
2. 执行 `npm run build` 生成 `dist/`。
3. 使用 Capgo CLI 打包 zip，不要使用 `Compress-Archive`：
   - `npx -y @capgo/cli bundle zip dist`
   - 将生成的 zip 重命名为 `web-bundle-desktop.zip`
4. 创建 GitHub Release：
   - tag 格式：`web-desktop-v<WEB_VERSION>`，例如 `web-desktop-v1.0.8.1`
   - 必须上传 `web-bundle-desktop.zip`
   - 必须使用 `--prerelease`
   - 必须附加 `--latest=false`，避免 OTA release 变成 Latest release
   - 推荐命令：

```bash
gh release create web-desktop-v<WEB_VERSION> web-bundle-desktop.zip --title "Desktop Web OTA v<WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```

5. 如需保留源码记录，再提交 `WEB_VERSION` 变更并推送到主分支。

## 强制规则

- 所有 OTA release，不论 Android 还是桌面端，一律必须是 `pre-release`
- 所有 OTA release 一律不能作为 GitHub 的 Latest release

## 何时不要用本流程

1. 需要修改 Electron 主进程、`preload` 或自动更新器。
2. 需要升级 Node 原生模块或打包配置。
3. 需要修改 Android 原生工程。

以上场景应走桌面正式发布（`v*` tag）或 Android 发布流程。
