---
description: 构建并发布 Android Web OTA 到 GitHub Releases
---

# /ota

将当前 Web 代码构建并打包为 zip，通过 GitHub CLI 发布到 Releases，供已安装的 Android APP 检测并下载 OTA 更新。

## 步骤

1. 读取 [constants/app-version.ts](../../constants/app-version.ts) 中的 `WEB_VERSION`，将最后一位递增后写回文件。
2. 执行 `npm run build`。
3. 使用 Capgo CLI 打包 `dist/` 为 zip，不要使用 PowerShell `Compress-Archive`：

```bash
npx -y @capgo/cli bundle zip dist
Rename-Item dist_<version>.zip web-bundle-android.zip
```

4. 使用 GitHub CLI 创建 Release 并上传 zip：

```bash
gh release create web-android-v<WEB_VERSION> web-bundle-android.zip --title "Android Web Update v<WEB_VERSION>" --notes "<更新说明>" --prerelease --latest=false --repo Frrrrrranz/SML-APP
```

5. 如需清理临时文件，可执行：

```bash
Remove-Item web-bundle-android.zip
```

6. 执行 `/push` workflow，将版本号变更提交到 Git。

## 强制规则

- 所有 OTA release，不论 Android 还是桌面端，一律必须是 `pre-release`
- 所有 OTA release 一律不能作为 GitHub 的 Latest release

## 注意事项

- 发布前确保已完成 `gh auth login`
- Android OTA tag 必须使用 `web-android-v<WEB_VERSION>` 前缀
- 打包必须使用 `npx -y @capgo/cli bundle zip dist`
- 如果涉及原生插件或安装包变更，应改走正式构建 / 发包流程，而不是 OTA
