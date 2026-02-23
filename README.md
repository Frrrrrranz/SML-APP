# SML - Sheet Music Library 🎼

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>

一个简洁、高效的乐谱与练习录音管理应用，为用户提供便捷的学习资源整理方案。

---

## 🌟 核心功能

- **🎼 乐谱管理**：快速上传 PDF 格式曲谱，打造私人数字曲库。
- **🎙️ 练习录音**：便捷记录与上传练习音频，见证演奏水平的点滴进步。
- **🗂️ 分类整理**：按作曲家和作品系统化管理您的音乐资产。
- **🤖 AI 音乐助手**：内置 AI 聊天功能，随时解答作曲家、乐理、音乐史等相关问题。

## 🛠️ 技术实现

### 前端生态
- **UI 框架**: React 19 + TypeScript
- **构建工具**: Vite
- **动画库**: Framer Motion
- **图标库**: Lucide React
- **路由管理**: React Router

### 后端与 AI
- **后端服务**: Supabase (Database & Storage)
- **AI 能力**: 通义千问 (DashScope API)，通过 Supabase Edge Functions 调用

## 🚀 快速启动

1. **安装依赖**
   ```bash
   npm install
   ```
2. **配置环境**
   在 `.env` 中设置您的 Supabase 凭据。
3. **运行项目**
   ```bash
   npm run dev
   ```

---

## 📄 致谢

本项目的 UI 组件和动画设计灵感部分源自 [ShipSwift](https://github.com/signerlabs/ShipSwift.git)，由 [SignerLabs](https://github.com/signerlabs) 开发。特别感谢其对移动端体验和 AI 交互动画的探索，为本项目的前端优化提供了宝贵参考。


