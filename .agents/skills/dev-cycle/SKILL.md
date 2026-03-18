---
name: dev-cycle
description: SML-APP 完整开发周期：从需求到部署的标准流程
---

# SML-APP 开发周期 (Dev Cycle)

每当用户提出新功能、Bug 修复或改动需求时，按以下标准流程执行。

## 第一阶段：规划

1. **理解需求** — 研究相关代码文件，理解现有架构
2. **制定实现计划** — 创建 `implementation_plan.md`，包含：
   - 问题描述与背景
   - 需要修改的文件清单（按组件分组）
   - 验证方案
3. **用户确认** — 通过 `notify_user` 提交计划，等待用户审批
   - 用户可能提出修改意见，需更新计划后再次提交
   - **计划未被确认前，不得开始编码**

## 第二阶段：实施

4. **分步编码** — 按计划逐文件实施，维护 `task.md` 跟踪进度
5. **构建测试** — 执行 `/run`（build + sync），确保编译通过
6. **用户确认** — 请用户在设备上验证功能是否正常

## 第三阶段：部署

7. **判断部署方式** — 根据改动内容决策：

### 路径 A：OTA 热更新（仅 Web 改动）

适用条件：
- 只修改了前端代码（HTML/CSS/JS/TS/TSX）
- 没有安装新的 Capacitor 原生插件
- 没有修改 `capacitor.config.ts`

执行：**`/android-web-ota`**（已包含版本递增 + 构建 + 打包 + GitHub Release + Git 推送）

### 路径 B：APK 大版本更新（涉及原生改动）

适用条件：
- 新增了原生插件（`npm install @capacitor/xxx`）
- 修改了 `capacitor.config.ts`
- 修改了 Android 原生代码

执行步骤：
1. 执行 **`/version`**（已包含版本更新 + build + sync + Git 推送）
2. 提醒用户在 **Android Studio** 中打包签名 APK
3. 提醒用户通过 **GitHub Release** 发布新 APK

## 决策流程图

```
用户需求
  │
  ├─ 规划：implementation_plan.md → 用户确认
  │
  ├─ 实施：分步编码 → /run → 用户设备确认
  │
  └─ 部署：判断改动类型
       │
       ├─ 纯 Web 改动 ──→ /android-web-ota（完整 OTA 流程）
       │
       └─ 涉及原生 ────→ /version → Android Studio 打包
```

## 注意事项

- `/android-web-ota` 已内置 build + push，不需要再单独执行 `/run` 和 `/push`
- `/version` 已内置 `/run` + `/push`，同理
- commit message 始终使用**中文**，格式：`<type>: <描述>`
- 所有代码注释、文档使用简体中文
