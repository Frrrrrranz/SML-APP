---
description: 构建并发布 Android Web OTA 到 GitHub Releases
---

# /android-web-ota

将当前 Web 代码构建并打包为 zip，通过 GitHub CLI 发布到 Releases，供已安装的 Android App 检测并下载 OTA 更新。

## 步骤

1. 更新 [constants/app-version.ts](../../constants/app-version.ts) 中的 `ANDROID_WEB_VERSION`，仅递增第 4 位。
2. 执行构建：
```bash
npm run build
```
3. 使用 Capgo CLI 打包 `dist/`（不要使用 `Compress-Archive`）：
```bash
npx -y @capgo/cli bundle zip dist
Rename-Item dist_<version>.zip web-bundle-android.zip
```
4. 创建 GitHub Release 并上传 zip：
```bash
gh release create web-android-v<ANDROID_WEB_VERSION> web-bundle-android.zip --title "Android Web Update v<ANDROID_WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```
5. 如需清理临时文件：
```bash
Remove-Item web-bundle-android.zip
```
6. 执行 `/push`，将版本号变更提交并推送到远端。

## 强制规则

- 所有 OTA Release（Android/桌面）必须是 `pre-release`
- 所有 OTA Release 必须附加 `--latest=false`

## 注意事项

- 发布前确认已完成 `gh auth login`
- Android OTA tag 必须为 `web-android-v<ANDROID_WEB_VERSION>`
- 打包必须使用 `npx -y @capgo/cli bundle zip dist`
- 涉及原生插件或安装包变化时，不走 OTA，改走正式发版流程
