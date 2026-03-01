---
description: 构建并发布 OTA 热更新到 GitHub Releases
---

# /ota — 发布 OTA 热更新

将当前 Web 代码构建、打包为 zip，并通过 GitHub CLI 发布到 Releases，供已安装的 APP 自动检测并下载更新。

// turbo-all

## 步骤

1. 构建 Web 产物

```bash
npm run build
```

2. 读取当前 `constants/app-version.ts` 中的 `WEB_VERSION`，将最后一位递增，更新文件并告知用户新版本号

3. 将 `dist/` 目录打包为 `web-bundle.zip`

```bash
Compress-Archive -Path dist\* -DestinationPath web-bundle.zip -Force
```

4. 使用 GitHub CLI 创建 Release 并上传 zip

```bash
gh release create web-v<新版本号> web-bundle.zip --title "Web Update v<新版本号>" --notes "OTA web update" --repo Frrrrrranz/SML-APP
```

5. 清理临时文件

```bash
Remove-Item web-bundle.zip
```

6. 执行 `/push` workflow 将版本号变更提交到 Git

## 注意事项
- 发布前确保 `gh auth login` 已完成（首次使用需要登录）
- tag 格式必须为 `web-v<版本号>`，APP 通过此前缀识别 OTA 更新
- 如果是大版本更新（涉及原生插件变更），应该走 `/build-android` 流程发布新 APK
