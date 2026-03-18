---
description: 无 AI 协助时的手动发布与 Git 操作总手册（更新、推送、Android OTA、Desktop OTA、Tag 触发 CI）
---

# 手动操作总手册（SML-APP）

适用仓库：`SML-APP`  
目标：在没有 AI 协助时，按本文即可完成更新、推送、OTA 发布与 Tag 触发 CI。

## 0. 先选流程

1. 只提交代码：流程 A
2. 发布 Android Web OTA：流程 B
3. 发布 Desktop Web OTA：流程 C
4. 正式发版并触发 CI：流程 D

## 1. 通用前置检查

```powershell
git status --short
git diff --stat
```

检查点：
- 确认只包含本次要提交的文件
- 避免误带临时文件、构建产物
- 不要默认 `git add .`

## 2. 版本字段规则

- `package.json` -> `version`：正式版本号（如 `1.0.10`）
- `constants/app-version.ts`：
  - `APP_VERSION`：正式版本号
  - `ANDROID_WEB_VERSION`：安卓 OTA 版本号
  - `DESKTOP_WEB_VERSION`：桌面 OTA 版本号

规则：
1. 正式发版（非 OTA）：`ANDROID_WEB_VERSION` 与 `DESKTOP_WEB_VERSION` 都重置为 `<version>.0`
2. Android OTA：只递增 `ANDROID_WEB_VERSION` 第 4 位
3. Desktop OTA：只递增 `DESKTOP_WEB_VERSION` 第 4 位

## 3. 流程 A：普通更新与推送（不发版）

```powershell
npm run build
git add <file1> <file2> <file3>
git commit -m "feat/fix/docs: <说明>"
git push
```

## 4. 流程 B：Android OTA

1. 修改 `constants/app-version.ts`：只递增 `ANDROID_WEB_VERSION` 第 4 位
2. 构建与打包：
```powershell
npm run build
npx -y @capgo/cli bundle zip dist
$zip = Get-ChildItem -File -Filter "dist_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Rename-Item $zip.FullName "web-bundle-android.zip"
```
3. 发布 Release：
```powershell
gh release create web-android-v<ANDROID_WEB_VERSION> web-bundle-android.zip --title "Android Web Update v<ANDROID_WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```
4. 发布成功后删除本地包：
```powershell
Remove-Item web-bundle-android.zip
```
5. 提交版本变更并推送：
```powershell
git add constants/app-version.ts
git commit -m "chore: bump android web ota to v<ANDROID_WEB_VERSION>"
git push
```

## 5. 流程 C：Desktop Web OTA

1. 修改 `constants/app-version.ts`：只递增 `DESKTOP_WEB_VERSION` 第 4 位
2. 构建与打包：
```powershell
npm run build
npx -y @capgo/cli bundle zip dist
$zip = Get-ChildItem -File -Filter "dist_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Rename-Item $zip.FullName "web-bundle-desktop.zip"
```
3. 发布 Release：
```powershell
gh release create web-desktop-v<DESKTOP_WEB_VERSION> web-bundle-desktop.zip --title "Desktop Web OTA v<DESKTOP_WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```
4. 发布成功后删除本地包：
```powershell
Remove-Item web-bundle-desktop.zip
```
5. 提交版本变更并推送：
```powershell
git add constants/app-version.ts
git commit -m "chore: bump desktop web ota to v<DESKTOP_WEB_VERSION>"
git push
```

## 6. 流程 D：正式发版 + Tag 触发 CI

1. 同步版本号：
- `package.json` -> `version = <version>`
- `constants/app-version.ts`：
  - `APP_VERSION = '<version>'`
  - `ANDROID_WEB_VERSION = '<version>.0'`
  - `DESKTOP_WEB_VERSION = '<version>.0'`
- `android/app/build.gradle`：
  - `versionName "<version>"`
  - `versionCode` +1
2. 构建验证：
```powershell
npm run build
```
3. 提交并推送：
```powershell
git add package.json package-lock.json constants/app-version.ts android/app/build.gradle
git commit -m "chore(release): v<version>"
git push
```
4. 打 Tag 触发 CI：
```powershell
git tag -a v<version> -m "Release v<version>"
git push origin v<version>
```

## 7. 发布后检查

```powershell
gh run list --limit 5 --repo Frrrrrranz/SML-APP
gh run view <run_id> --repo Frrrrrranz/SML-APP
gh release view <tag> --repo Frrrrrranz/SML-APP
```

## 8. 常见错误避免

1. OTA 打包必须用 `npx -y @capgo/cli bundle zip dist`
2. OTA Release 必须带 `--prerelease --latest=false`
3. Android OTA tag 必须是 `web-android-v<ANDROID_WEB_VERSION>`
4. Desktop OTA tag 必须是 `web-desktop-v<DESKTOP_WEB_VERSION>`
5. 不要用 `git add .`
6. PowerShell 命令不要写 `&&`
