---
description: 暂存、提交并推送代码到远程仓库
---

# /push — Git 提交并推送

将当前修改提交到 Git 并推送到远程仓库。

## 步骤

1. 先用 `git status` 或 `git diff --stat` 查看本次变更内容，据此生成 commit message，发送给用户确认

2. 用户确认 commit message 后，执行暂存

// turbo
```bash
git add .
```

3. 提交（使用确认后的 commit message）

```bash
git commit -m "<确认后的 commit message>"
```

4. 推送到远程

// turbo
```bash
git push
```

## 注意事项
- commit message 必须先发给用户确认，**不可自动执行**
- 推送前确保已完成 `/run`（build + sync）
