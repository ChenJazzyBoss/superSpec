---
name: update-spec
description: 当用户需要修改已有的 spec 文件时使用，生成增量变更描述并应用
---

# 更新规格说明书（Update Spec）

## 概述

根据用户的需求变更，生成 Delta（增量变更描述），然后应用到现有 spec 文件。

**核心原则：** 不要重写整个 spec，只描述变化的部分。

## 何时使用

**始终使用：**
- 用户要求修改已有的 spec
- 需求变更（增加/删除/修改功能）
- 调整场景或需求描述

## Delta 格式

Delta 是一个 JSON 对象，包含 spec 名称和变更列表：

```json
{
  "specName": "batch-export",
  "changes": [
    { "type": "ADDED", "section": "requirement", "target": "PDF 导出", "content": "系统 SHALL 支持 PDF 格式导出" },
    { "type": "MODIFIED", "section": "requirement", "target": "导出格式支持", "field": "text", "newValue": "系统 SHALL 支持 CSV、XLSX 和 PDF 三种导出格式" },
    { "type": "REMOVED", "section": "scenario", "target": "CSV 导出", "parent": "导出格式支持" },
    { "type": "RENAMED", "section": "requirement", "target": "导出格式", "newValue": "导出格式支持" }
  ]
}
```

### 变更类型

| 类型 | 说明 | 必填字段 |
|------|------|---------|
| ADDED | 新增 | target, content |
| REMOVED | 删除 | target |
| MODIFIED | 修改 | target, newValue |
| RENAMED | 重命名 | target, newValue |

### 变更目标

| 分组 | 说明 | 备注 |
|------|------|------|
| overview | 概述 | 只支持 MODIFIED |
| requirement | 需求 | 支持所有类型 |
| scenario | 场景 | 必须指定 parent（父级需求名称） |

<EXTREMELY-IMPORTANT>
你在修改 spec 时，必须生成 Delta JSON 并通过 update 命令应用。不要手动编辑 spec 文件。

步骤：
1. 读取现有 spec 文件
2. 分析用户需求变更
3. 生成 Delta JSON
4. 执行 `echo '<delta-json>' | node bin/superspec.js update <spec-name>`
5. 确认校验通过

这不可协商。
</EXTREMELY-IMPORTANT>

## 工作流程

### 步骤 1：读取现有 spec

```bash
cat .superspec/specs/<name>/spec.md
```

### 步骤 2：分析变更

对比用户需求和现有 spec，确定需要哪些变更：
- 新增了什么功能？→ ADDED requirement/scenario
- 删除了什么功能？→ REMOVED requirement/scenario
- 修改了什么描述？→ MODIFIED requirement/overview
- 重命名了什么？→ RENAMED requirement/scenario

### 步骤 3：生成 Delta JSON

构建合法的 Delta JSON，注意：
- ADDED 必须有 content
- MODIFIED/RENAMED 必须有 newValue
- scenario 变更必须有 parent

### 步骤 4：应用 Delta

```bash
# 从文件
node bin/superspec.js update <name> --file delta.json

# 从 stdin
echo '{"specName":"<name>","changes":[...]}' | node bin/superspec.js update <name>
```

### 步骤 5：确认结果

检查校验输出，确保 valid: true。如果失败，根据错误信息修正 Delta。

## 借口表

| AI 的借口 | 反驳 |
|-----------|------|
| "改动很小，直接编辑文件更快" | Delta 保证变更可追溯、可回滚。用它。 |
| "我不确定要生成什么 Delta" | 先读 spec，再对比用户需求，差异就是 Delta。 |
| "Delta JSON 太复杂了" | 每个变更只有 4-5 个字段。照着格式填就行。 |
| "校验失败了，跳过吧" | 校验保证质量。修正 Delta，重新运行。 |

## 下一步

spec 修改完成后，推荐：
- **使用 `validate-spec`** 重新校验修改后的 spec（推荐）
- 使用 `write-plan` 更新实现计划
- 使用 `pipeline next validate-spec` 查看推荐路径
