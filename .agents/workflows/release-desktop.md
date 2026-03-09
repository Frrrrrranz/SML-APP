---
description: 桌面端版本发布与自动热更新 (打包 + Tag触发)
---

# /release-desktop — 发布桌面端新版本

当仅仅修复了桌面端 (Electron) 相关的 bug，或希望向用户正式发布桌面端的新版本包时，执行本工作流。

这将会：更新包版本号 -> 提交到 Git 代码库 -> 打上新版本的 Tag 从而激活 GitHub Actions 的发布流水线。

## 步骤

1. 用户提供新的桌面端应用版本号（例如 `1.0.5`），或者询问用户期望的下一版本号。

2. 更新根目录下 `package.json` 中的 `"version"` 字段：
   - 找到 `"version": "旧版本"`，修改为 `<新版本号>` (例如: `"version": "1.0.5"`)。
   - `electron-builder` 依赖此字段来决定最终安装包（.exe）的版本。

3. （如果之前有前端修改）执行 `/run` 工作流的构建及同步步骤，保证 `Android` / `Web` 的资产也处于最新状态。

4. 提交版本号变更到 Git
// turbo-all
```bash
git add package.json
git commit -m "chore(release): bump desktop version to v<新版本号>"
git push
```

5. 创建新版本的 Git Tag 并推送到远程。这会**直接激活** `.github/workflows/release.yml` 的执行。
// turbo-all
```bash
git tag -a v<新版本号> -m "Release v<新版本号>"
git push origin v<新版本号>
```

## 注意事项

- 前缀：推送给 GitHub 的 Tags 必须以小写 **`v` 开头**（即 `v1.0.5` 而不是 `1.0.5`），否则 `release.yml` 里的 `v*` 规则将无法被触发！
- 后续流程：流水线跑完后，会在 GitHub 的 Releases 页面生成一个带 `.exe`、`.zip` 等产物的 Draft（草稿）。由仓库管理员（您）检查无误后点击 Publish。
- Electron 更新提示：Publish Release 后，旧版存活的桌面端轮询到存在新版本时会自动向用户推送更新提示窗口。
