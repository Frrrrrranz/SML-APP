---
description: 无 AI 协助时的手动发布与 Git 操作总手册（更新、推送、OTA、Tag 触发 CI）
---

# 手动操作总手册（SML-APP）

适用仓库：`SML-APP`（主应用）  
目标：在没有 AI 协助时，按本文即可完成日常更新、推送、Android OTA、桌面 OTA、打 Tag 触发 CI。

## 0. 先决定你要走哪条流程

1. 只提交代码到远端：走“流程 A：普通更新与推送”
2. 发布 Android Web OTA：走“流程 B：Android OTA”
3. 发布桌面端 Web OTA：走“流程 C：Desktop Web OTA”
4. 发布正式版本并触发 CI 打包：走“流程 D：正式发版 + Tag”

## 1. 通用前置检查（所有流程都先做）

```powershell
git status --short
git diff --stat
```

检查点：
- 确认本次要提交的文件范围正确
- 确认没有误带 `.kiro/`、临时文件、构建产物
- 不要默认 `git add .`

## 2. 版本文件规则（一定要清楚）

- `package.json` 的 `version`：正式版本号（如 `1.0.10`）
- `constants/app-version.ts`：
  - `APP_VERSION`：正式版本号（如 `1.0.10`）
  - `WEB_VERSION`：Web 热更新版本号（如 `1.0.10.1`）

规则：
1. 正式发版（非 OTA）：`WEB_VERSION` 必须重置为 `<version>.0`
2. OTA 热更新：只增加 `WEB_VERSION` 第 4 位（如 `1.0.10.1 -> 1.0.10.2`）

## 3. 流程 A：普通更新与推送（不发版）

1. （可选）先本地构建验证

```powershell
npm run build
```

2. 精确暂存文件

```powershell
git add <file1> <file2> <file3>
```

3. 提交

```powershell
git commit -m "feat/fix/docs: <你的说明>"
```

4. 推送

```powershell
git push
```

## 4. 流程 B：Android OTA（Web 资源热更新）

### B1. 改版本

编辑 `constants/app-version.ts`，只递增 `WEB_VERSION` 第 4 位。

### B2. 构建与打包

```powershell
npm run build
npx -y @capgo/cli bundle zip dist
```

把生成的 `dist_*.zip` 重命名为 `web-bundle-android.zip`：

```powershell
$zip = Get-ChildItem -File -Filter "dist_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Rename-Item $zip.FullName "web-bundle-android.zip"
```

### B3. 发布 GitHub Release（OTA）

```powershell
gh release create web-android-v<WEB_VERSION> web-bundle-android.zip --title "Android Web Update v<WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```

示例：

```powershell
gh release create web-android-v1.0.10.2 web-bundle-android.zip --title "Android Web Update v1.0.10.2" --notes "fix: xxx" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```

### B4. 提交版本变更并推送

```powershell
git add constants/app-version.ts
git commit -m "chore: bump android web ota to v<WEB_VERSION>"
git push
```

## 5. 流程 C：Desktop Web OTA（桌面端 Web 热更新）

### C1. 改版本

编辑 `constants/app-version.ts`，只递增 `WEB_VERSION` 第 4 位。

### C2. 构建与打包

```powershell
npm run build
npx -y @capgo/cli bundle zip dist
```

把生成的 `dist_*.zip` 重命名为 `web-bundle-desktop.zip`：

```powershell
$zip = Get-ChildItem -File -Filter "dist_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Rename-Item $zip.FullName "web-bundle-desktop.zip"
```

### C3. 发布 GitHub Release（OTA）

```powershell
gh release create web-desktop-v<WEB_VERSION> web-bundle-desktop.zip --title "Desktop Web OTA v<WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```

示例：

```powershell
gh release create web-desktop-v1.0.10.2 web-bundle-desktop.zip --title "Desktop Web OTA v1.0.10.2" --notes "fix: xxx" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```

### C4. 提交版本变更并推送

```powershell
git add constants/app-version.ts
git commit -m "chore: bump desktop web ota to v<WEB_VERSION>"
git push
```

## 6. 流程 D：正式发版 + Tag 触发 CI

适用：需要触发 `.github/workflows/release.yml`，发布正式安装包。

### D1. 同步版本

1. 更新 `package.json` -> `version = <version>`
2. 更新 `constants/app-version.ts`：
   - `APP_VERSION = '<version>'`
   - `WEB_VERSION = '<version>.0'`
3. 更新 `android/app/build.gradle`：
   - `versionName "<version>"`
   - `versionCode` 递增

### D2. 构建验证

```powershell
npm run build
```

如涉及 Capacitor 变更再执行：

```powershell
npx cap sync android
```

### D3. 提交并推送版本改动

```powershell
git add package.json package-lock.json constants/app-version.ts android/app/build.gradle
git commit -m "chore(release): v<version>"
git push
```

### D4. 打 Tag 触发 CI

```powershell
git tag -a v<version> -m "Release v<version>"
git push origin v<version>
```

示例：

```powershell
git tag -a v1.0.10 -m "Release v1.0.10"
git push origin v1.0.10
```

## 7. 发布后检查（建议）

1. 看最近工作流

```powershell
gh run list --limit 5 --repo Frrrrrranz/SML-APP
```

2. 查看某次 run 详情

```powershell
gh run view <run_id> --repo Frrrrrranz/SML-APP
```

3. 查看 OTA Release 是否正确

```powershell
gh release view <tag> --repo Frrrrrranz/SML-APP
```

## 8. 常见错误避免

1. OTA 不要用 `Compress-Archive`，必须用 `npx -y @capgo/cli bundle zip dist`
2. OTA Release 必须 `--prerelease --latest=false`
3. Android OTA Tag 必须 `web-android-v<WEB_VERSION>`
4. Desktop OTA Tag 必须 `web-desktop-v<WEB_VERSION>`
5. 不要用 `git add .`
6. PowerShell 命令不要写 `&&`，分行执行
