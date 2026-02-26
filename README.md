# SML-APP 🎼

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>

一个简洁、高效的乐谱与练习录音管理 Android 应用，为音乐学习者提供便捷的资源整理方案。

---

## 🌟 核心功能

- **🎼 乐谱管理**：上传 PDF 格式曲谱，打造私人数字曲库
- **🎙️ 练习录音**：记录与管理练习音频，见证演奏进步
- **🗂️ 分类整理**：按作曲家和作品系统化管理音乐资产
- **🤖 AI 音乐助手**：内置 AI 聊天，随时解答乐理、音乐史等问题
- **📱 离线使用**：本地存储，无需网络即可管理乐谱
- **☁️ 云端同步**：可选的 Supabase 云端数据同步

## 🛠️ 技术实现

### 客户端
- **框架**: React 19 + TypeScript
- **原生层**: Capacitor (Android)
- **构建工具**: Vite
- **动画**: Framer Motion
- **图标**: Lucide React
- **路由**: React Router

### 后端与 AI
- **云端服务**: Supabase (Database & Storage)
- **本地存储**: Capacitor Preferences + Filesystem
- **AI 能力**: 通义千问 (DashScope API)

## 🚀 快速启动

```bash
# 安装依赖
npm install

# 开发模式（浏览器）
npm run dev

# 构建并同步到 Android
npm run build
npx cap sync android

# 在 Android Studio 中打开
npx cap open android
```

---

## 📄 相关仓库

| 仓库 | 说明 |
|------|------|
| [SML-APP](https://github.com/Frrrrrranz/SML-APP) | Android 客户端（本仓库，主力开发） |
| [SML](https://github.com/Frrrrrranz/SML-SheetMusicLibrary) | Web 管理后台（维护模式） |

## 📄 致谢

本项目的 UI 组件和动画设计灵感部分源自 [ShipSwift](https://github.com/signerlabs/ShipSwift.git)，由 [SignerLabs](https://github.com/signerlabs) 开发。特别感谢其对移动端体验和 AI 交互动画的探索，为本项目的前端优化提供了宝贵参考。
