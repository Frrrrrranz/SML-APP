# SML-APP

<p align="center">
  <img src="public/logo.png" alt="SML Logo" width="120" />
</p>

<p align="center">
  <strong>Sheet Music Library - 乐谱与录音管理应用</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-GPL_v3-blue.svg?style=for-the-badge" alt="License: GPL v3" /></a>
</p>

<p align="center">
  一个简洁、高效的乐谱与练习录音管理应用，<br/>
  支持 <b>Android</b> 与 <b>Windows 桌面端</b>，为音乐学习者提供便捷的资源整理方案。
</p>

---

## 核心功能

- 乐谱管理：上传 PDF 乐谱，建立个人数字曲库
- 练习录音：记录和管理练习音频，追踪进步
- 分类整理：按作曲家与作品系统化管理音乐资源
- AI 音乐助手：内置 AI 问答，支持乐理、音乐史等问题
- 离线使用：本地 SQLite 存储，无网络也可使用
- 云端资源：浏览云端共享的乐谱与录音资源

---

## 下载与安装

### Android

1. 前往 [GitHub Releases](https://github.com/Frrrrrranz/SML-APP/releases)
2. 找到最新的 `SML Release vX.X.X`
3. 下载对应的 `.apk` 文件并安装

### Windows 桌面端

1. 前往 [GitHub Releases](https://github.com/Frrrrrranz/SML-APP/releases)
2. 找到最新的 `SML Release vX.X.X`
3. 下载 `.exe` 安装包并安装
4. 应用内置自动更新，后续版本会自动提示

---

## 项目结构

```text
SML-APP/
|- App.tsx
|- screens/
|- components/
|- contexts/
|- services/
|- utils/
|- electron/
|  |- src/main.ts
|  |- src/preload.ts
|  `- src/auto-updater.ts
|- android/
|- supabase/
|- .agents/
|  |- skills/
|  `- workflows/
`- electron-builder.yml
```

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 19, TypeScript, Vite, Framer Motion, Tailwind CSS |
| Android | Capacitor 8, SQLite |
| Windows 桌面端 | Electron, better-sqlite3, electron-updater |
| 云服务 | Supabase |
| AI | 通义千问（DashScope API） |
| CI/CD | GitHub Actions, electron-builder |

### 跨平台策略

- 使用单一代码库同时支持 Android 与 Windows
- 通过平台判断切换 Android 与 Electron 的本地能力实现
- Android 使用 Capacitor 原生层
- Windows 桌面端使用 Electron 主进程 + preload + IPC

---

## 开发指引

### 环境要求

- Node.js >= 22
- npm >= 10

### 快速启动

```bash
npm install
npm run dev
```

### Android 开发

```bash
npm run build
npx cap sync android
npx cap open android
```

### Windows 桌面端开发

```bash
npm run dev:electron
npm run build:electron
```

---

## 更新与发布机制

本项目目前有两条更新链路：

### 1. 小更新：Android / Web OTA

- 用于不涉及原生层变更的前端资源更新
- 版本号来自 `constants/app-version.ts`：
  - Android OTA 使用 `ANDROID_WEB_VERSION`
  - Desktop OTA 使用 `DESKTOP_WEB_VERSION`
- 发布格式分平台：
  - Android：`web-android-v<ANDROID_WEB_VERSION>` + `web-bundle-android.zip`
  - Desktop：`web-desktop-v<DESKTOP_WEB_VERSION>` + `web-bundle-desktop.zip`
- Android 端通过 `@capgo/capacitor-updater` 检查并应用 OTA 更新

参考：
- `.agents/workflows/android-web-ota.md`
- `services/ota-update.ts`

### 2. 大更新：双端正式发布

- 用于需要发布新安装包的新版本
- 推送 `v<版本号>` Git tag 后触发 GitHub Actions
- GitHub Actions 同时构建：
  - Windows 安装包
  - Android APK
- 最终自动创建 Draft Release，等待人工确认发布
- Windows 桌面端通过 `electron-updater` 从 GitHub Releases 检查新版本

参考：
- `.agents/workflows/release-desktop.md`
- `.github/workflows/release.yml`
- `electron/src/auto-updater.ts`

### 发布示例

```bash
# OTA 小更新
# 参考 .agents/workflows/android-web-ota.md

# 大版本发布（同时构建 Windows + Android）
git tag v1.0.1
git push origin v1.0.1
```

---

## 相关仓库

| 仓库 | 说明 |
|---|---|
| [SML-APP](https://github.com/Frrrrrranz/SML-APP) | 主项目仓库 |
| [SML](https://github.com/Frrrrrranz/SML-SheetMusicLibrary) | 展示站仓库 |

---

## 协议

本项目基于 [GPL-3.0](LICENSE) 开源。

## 致谢

本项目部分 UI 与动画设计灵感参考自 [ShipSwift](https://github.com/signerlabs/ShipSwift.git)。
