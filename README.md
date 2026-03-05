# SML-APP 🎼

<p align="center">
  <img src="public/logo.png" alt="SML Logo" width="120" />
</p>

<p align="center">
  <strong>Sheet Music Library — 乐谱·录音管理应用</strong>
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
  支持 <b>Android</b> 和 <b>Windows 桌面端</b>，为音乐学习者提供便捷的资源整理方案。
</p>

---

## 🌟 核心功能

- **🎼 乐谱管理** — 上传 PDF 格式曲谱，打造私人数字曲库
- **🎙️ 练习录音** — 记录与管理练习音频，见证演奏进步
- **🗂️ 分类整理** — 按作曲家和作品系统化管理音乐资产
- **🤖 AI 音乐助手** — 内置 AI 聊天，随时解答乐理、音乐史等问题
- **📱 离线使用** — 本地 SQLite 存储，无需网络即可管理乐谱
- **☁️ 云端曲库** — 浏览云端共享的乐谱与录音资源

---

## 📥 下载与安装

### Android

1. 前往 [GitHub Releases](https://github.com/Frrrrrranz/SML-APP/releases) 页面
2. 找到最新的 **SML-APP Release vX.X.X** 版本
3. 下载 `app-release.apk` 并安装

### Windows 桌面端

1. 前往 [GitHub Releases](https://github.com/Frrrrrranz/SML-APP/releases) 页面
2. 找到最新的 **desktop-vX.X.X** 版本
3. 下载 `.exe` 安装包，双击安装即可使用
4. 应用内置自动更新，后续版本会自动推送

---

## 🏗️ 项目架构

```
SML-APP/
├── App.tsx                  # 应用入口，平台自适应布局
├── screens/                 # 页面组件
├── components/              # 通用 UI 组件
│   ├── BottomNav.tsx        # Android 底部导航
│   └── SideNav.tsx          # Windows 侧边栏导航
├── services/
│   ├── platform.ts          # 统一平台检测
│   ├── local-database.ts    # SQLite 跨平台适配器
│   └── local-file-storage.ts# 文件系统跨平台适配器
├── contexts/                # React Context（存储、语言、认证）
├── electron/                # Electron 桌面端
│   ├── src/main.ts          # 主进程（窗口、SQLite、IPC、菜单）
│   ├── src/preload.ts       # IPC 桥接层
│   └── src/auto-updater.ts  # 桌面端自动更新
├── android/                 # Capacitor Android 原生层
└── electron-builder.yml     # 桌面端打包配置
```

---

## 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| **前端** | React 19 · TypeScript · Vite · Framer Motion · Tailwind CSS |
| **Android 原生层** | Capacitor 8 · SQLite (capacitor-community/sqlite) |
| **Windows 桌面端** | Electron · better-sqlite3 · electron-updater |
| **云端服务** | Supabase (Database & Storage) |
| **AI 能力** | 通义千问 (DashScope API) |
| **CI/CD** | GitHub Actions · electron-builder |

### 跨平台策略

项目使用 **单一代码库** 同时支持 Android 和 Windows：

- `platform.ts` 提供统一的 `isElectron()` / `isAndroid()` 检测
- 数据层通过 `dbQuery` / `dbRunSql` 适配器自动路由到正确的 SQLite 实现
- 文件操作通过 `isElectron()` 分支选择 IPC 或 Capacitor Filesystem
- UI 层根据平台切换 BottomNav ↔ SideNav、480px ↔ 全宽布局

---

## 🚀 开发指南

### 环境要求

- Node.js ≥ 22
- npm ≥ 10

### 快速启动

```bash
# 安装依赖
npm install

# 浏览器开发模式
npm run dev
```

### Android 开发

```bash
# 构建并同步到 Android
npm run build && npx cap sync android

# 在 Android Studio 中打开
npx cap open android
```

### Windows 桌面端开发

```bash
# 开发模式（含 DevTools）
npm run dev:electron

# 打包 .exe 安装包
npm run build:electron
```

### 发布

```bash
# Android OTA 热更新
# 参考 .agents/workflows/ota.md

# Windows 桌面端发布
git tag desktop-v1.0.1
git push origin desktop-v1.0.1
# GitHub Actions 自动构建并发布到 Releases
```

---

## 📄 相关仓库

| 仓库 | 说明 |
|------|------|
| [SML-APP](https://github.com/Frrrrrranz/SML-APP) | 跨平台客户端（本仓库） |
| [SML](https://github.com/Frrrrrranz/SML-SheetMusicLibrary) | Web 展示页 |

## 📄 协议

本项目基于 [GPL-3.0 协议](LICENSE) 开源。

## 🙏 致谢

本项目的 UI 组件和动画设计灵感部分源自 [ShipSwift](https://github.com/signerlabs/ShipSwift.git)，由 [SignerLabs](https://github.com/signerlabs) 开发。
