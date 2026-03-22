# SML-APP Codex Rules

## Communication

- 与用户交流、说明问题、总结结果时，默认使用简体中文。
- Git commit message 默认使用中文，除非用户明确要求英文。
- 代码标识符保持英文，不使用拼音命名。
- 错误信息、日志、第三方接口字段可以保留英文。

## Project Identity

- 本仓库 `SML-APP` 是主项目仓库，用于 Android、Electron、Web 相关主线开发。
- 仓库 `SML` / `SML-SheetMusicLibrary` 是展示站，不要与本仓库混淆。
- 修改前先确认当前任务属于主应用、展示站、发布流程还是工具链配置。
- 本仓库同时包含安卓端与桌面端两套实现；当前阶段以桌面端开发为主。
- 任何桌面端改动都必须默认以“不影响安卓端现有行为”为前提。

## Source Of Truth

- 业务代码优先看 `components`、`screens`、`services`、`contexts`、`utils`、`electron`、`android`、`supabase`。
- 工程配置优先看 `package.json`、`vite.config.ts`、`capacitor.config.ts`、`electron-builder.yml`。
- 项目级协作规则优先看 `.agents/skills` 与 `.agents/workflows`。
- `.antigravity` 目录主要视为工具配置或运行痕迹，不默认当作业务源码。
- `.vscode`、`.antigravity` 相关文件优先视为工具配置或运行痕迹，不作为产品逻辑依据。

## Skills And Workflows

- 新建项目专属 skill 时，存放到 `.agents/skills/<skill-name>/SKILL.md`。
- 新建项目专属 workflow 时，存放到 `.agents/workflows/<name>.md`。
- 涉及运行、推送、版本、OTA、桌面发布时，优先参考 `.agents/workflows/run.md`、`.agents/workflows/push.md`、`.agents/workflows/version.md`、`.agents/workflows/android-web-ota.md`、`.agents/workflows/release-desktop.md`。

## Code Style

- 前端默认使用 React + TypeScript，并延续现有项目结构与写法。
- 优先使用函数组件，不使用 class component。
- 变量与函数使用 `camelCase`，组件与类型使用 `PascalCase`，常量使用 `UPPER_SNAKE_CASE`。
- 新增文件命名遵循项目现有风格：组件文件优先 `PascalCase.tsx`，普通文档优先 `kebab-case.md`。
- 注释只解释“为什么这样做”或边界条件，避免无意义注释。
- 非必要不要引入 `any`；如果必须使用，要尽量缩小范围。

## Working Style

- 先阅读相关文件，再开始修改，不要基于猜测直接改动。
- 默认做最小必要改动，不主动做大范围重构。
- 不要随意清理或删除 `.agents`、`.github/workflows`、`electron`、`android` 中的文件。
- 如果发现历史遗留代码、旧方案或重复实现，先判断是否仍被主流程使用，再决定是否调整。
- 对简单任务直接执行；对影响较大的任务，先给出简短计划再实施。

## Command Execution

- 当前环境 shell 为 PowerShell。
- 不要在命令里使用 `&&`，应拆成分行命令或分别执行。
- 涉及 Git 提交时，优先精确暂存目标文件，不要默认使用 `git add .`。
- 推送前先检查是否存在未确认的临时文件或工具产物，避免误提交。

## Desktop-First Boundary

- 当前任务若面向桌面端，优先将改动限制在 `electron`、桌面端专用桥接、桌面端条件分支及明确的桌面端 UI 范围内。
- 不要为了桌面端需求直接修改安卓端专用逻辑、Capacitor 行为或 Android 工程文件，除非用户明确要求。
- 若某项改动可能同时影响 Android 与桌面端，先选择平台隔离方案，例如平台判断、桌面端专用入口、桌面端专用配置或桌面端专用组件。
- 如果无法在不影响安卓端的前提下完成桌面端需求，必须先明确指出风险，再等待用户确认。
- 提交结果时要说明本次改动是否触及安卓端路径；若未触及，应明确说明“未修改安卓端逻辑”。

## Safety

- 不要硬编码密钥、Token、数据库凭据或发布凭据。
- 涉及认证、存储、Supabase RLS、Electron IPC、Capacitor 原生能力时，优先保守处理。
- 不要擅自修改版本号、发布 Tag、OTA 流程或 GitHub Actions，除非任务明确要求。
- 不要执行破坏性 Git 操作，例如 `reset --hard`、强制覆盖或回退用户已有改动。

## Frontend Expectations

- 优先保持现有视觉语言，不要无故替换成熟页面风格。
- 使用 Tailwind 时避免重复堆砌过长的 `className`；重复样式优先抽组件或复用已有模式。
- 响应式默认采用 mobile-first。
- 涉及动画时，优先复用项目现有模式与工具，避免引入无必要的新动画体系。

## Delivery

- 完成任务后，说明改了什么、为什么这样改、是否做了验证。
- 如果没能验证构建、运行或测试，要明确说明原因。
- 引用文件时优先给出明确路径，方便快速定位。
