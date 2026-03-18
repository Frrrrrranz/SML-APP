---
description: 精确暂存、提交并推送本次确认过的代码到远程仓库
---

# /push - Git 提交并推送

将当前已经确认的改动提交到 Git，并推送到远程仓库。

## 步骤

1. 先查看本次变更范围

```powershell
git status --short
git diff --stat
```

2. 根据变更内容生成 commit message，并先发送给用户确认

3. 只暂存本次确认要提交的文件

```powershell
git add <file1> <file2> ...
```

4. 提交

```powershell
git commit -m "<确认后的 commit message>"
```

5. 推送到远程

```powershell
git push
```

## 注意事项

- commit message 必须先让用户确认，不可自动决定后直接提交
- 不要默认使用 `git add .`
- 如果工作区存在临时文件、工具缓存或其他未确认文件，必须避免一并提交
- 代码、配置、构建链路改动时，推送前应先完成必要验证
- 纯文档改动可不执行 `/run`
- 如果推送失败，先阅读远端报错，再选择最小修复方案，不要直接强推
- 当前 shell 是 PowerShell，命令中不要使用 `&&`，应分行执行或拆成多个独立命令
