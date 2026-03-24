# SML-APP

<p align="center">
  <img src="public/logo.png" alt="SML Logo" width="120" />
</p>

<p align="center">
  <strong>Sheet Music Library</strong><br />
  一个以乐谱与录音管理为核心的应用，支持 Windows 桌面端与 Android。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-GPL_v3-blue.svg?style=for-the-badge" alt="License: GPL v3" /></a>
</p>

## 项目状态

本项目功能已基本完整，当前 README 作为最终版说明文档保留。

## 核心功能

- 按作曲家、作品、录音进行整理，集中管理个人乐谱资料库
- 支持上传 PDF 乐谱，也支持上传多张乐谱图片并自动合成为可下载 PDF
- 乐谱图片支持追加、排序后再合成，方便整理扫描页顺序
- 支持更个人化的录音资料管理，可上传练习录音文件，也可保存自己喜欢的演奏版本
- 录音文件支持常见格式，如 `mp3`、`mp4`、`flac`、`wav`、`m4a`、`aac`
- 支持本地离线使用，桌面端使用本地数据库与本地文件存储
- 支持云端资源浏览与同步，适合本地收藏与在线资料并行管理
- 桌面端内置自动更新能力，Android 支持 Web OTA 更新

## 适用平台

- Windows 桌面端
- Android

## 下载

发布版本见 GitHub Releases：

- 仓库地址：<https://github.com/Frrrrrranz/SML-APP>
- Releases：<https://github.com/Frrrrrranz/SML-APP/releases>

常见安装包：

- Windows：`.exe`
- Android：`.apk`

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS、Framer Motion
- 桌面端：Electron、better-sqlite3、electron-updater
- Android：Capacitor 8
- 云服务：Supabase
- 文件处理：pdf-lib

## 开发

环境要求：

- Node.js 22+
- npm 10+

本地启动：

```bash
npm install
npm run dev
```

桌面端开发：

```bash
npm run dev:electron
```

桌面端构建：

```bash
npm run build:electron
```

Android 相关：

```bash
npm run build
npx cap sync android
npx cap open android
```

## 项目结构

```text
SML-APP/
|- components/
|- screens/
|- contexts/
|- services/
|- utils/
|- electron/
|- android/
|- supabase/
`- README.md
```

## 相关仓库

- 主应用仓库：<https://github.com/Frrrrrranz/SML-APP>
- 展示站仓库：<https://github.com/Frrrrrranz/SML-SheetMusicLibrary>

## 协议

本项目基于 [GPL-3.0](LICENSE) 开源。
