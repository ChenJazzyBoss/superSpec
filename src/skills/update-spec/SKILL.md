---
name: update-spec
description: 当用户需要修改已有的 spec 文件时使用，生成增量变更描述并应用
---

# 更新规格说明书（Update Spec）

## 概述

根据用户的需求变更，生成 Markdown Delta Spec，写入变更目录。

**核心原则：** 不要直接修改主 spec，只描述变化的部分，写到变更目录。

## 何时使用

**始终使用：**
- 用户要求修改已有的 spec
- 需求变更（增加/删除/修改功能）
- 调整场景或需求描述

## Delta Spec Markdown 格式

Delta spec 使用 Markdown 格式，包含 ADDED/MODIFIED/REMOVED/RENAMED 四种操作：

```markdown
## MODIFIED Requirements

### Requirement: 导出格式支持
系统 SHALL 支持 CSV、XLSX 和 PDF 三种导出格式。

#### Scenario: PDF 导出
- **WHEN** 用户选择 PDF 格式并点击导出
- **THEN** 系统生成并下载 PDF 文件

## ADDED Requirements

### Requirement: 批量导出
系统 SHALL 支持批量选择多个记录进行导出。

## REMOVED Requirements

### Requirement: 旧版导出
- **Reason**: 已被新导出系统替代
- **Migration**: 使用新导出端点 /api/v2/export

## RENAMED Requirements

### Requirement: 数据导出
- **FROM**: 导出数据
- **TO**: 数据导出
```

### 变更类型

| 类型 | 说明 | 格式 |
|------|------|------|
| ADDED | 新增需求/场景 | 完整的 Requirement + Scenario 内容 |
| MODIFIED | 修改需求 | 完整的修改后内容（不是差异补丁） |
| REMOVED | 删除需求 | 必须包含 Reason 和 Migration |
| RENAMED | 重命名需求 | 必须包含 FROM 和 TO |

<EXTREMELY-IMPORTANT>
你在修改 spec 时，必须生成 Markdown Delta Spec 并写入变更目录。不要直接编辑主 spec 文件。

步骤：
1. 检查 `.superspec/changes/<name>/` 是否存在（不存在则先创建）
2. 读取现有主 spec：`.superspec/specs/<capability>/spec.md`
3. 分析用户需求变更
4. 生成 Markdown Delta Spec
5. 写入 `.superspec/changes/<name>/specs/<capability>/spec.md`
6. 执行 `superspec change apply <name> --dry-run` 确认合并结果通过

这不可协商。
</EXTREMELY-IMPORTANT>

## 工作流程

### 步骤 1：检查变更目录

```bash
superspec change status <name>
```

如果变更不存在，先创建：
```bash
superspec change create <name> --why "需求变更原因"
```

### 步骤 2：读取现有主 spec

```bash
cat .superspec/specs/<capability>/spec.md
```

### 步骤 3：分析变更

对比用户需求和现有 spec，确定需要哪些变更：
- 新增了什么功能？→ `## ADDED Requirements`
- 修改了什么描述？→ `## MODIFIED Requirements`（包含完整修改后内容）
- 删除了什么功能？→ `## REMOVED Requirements`（包含 Reason 和 Migration）
- 重命名了什么？→ `## RENAMED Requirements`（包含 FROM 和 TO）

### 步骤 4：生成 Delta Spec

在变更目录下创建 Markdown delta spec：

```
.superspec/changes/<name>/specs/<capability>/spec.md
```

### 步骤 5：Dry-run 校验

```bash
superspec change apply <name> --dry-run
```

检查合并结果是否正确。如果失败，根据错误信息修正 delta spec。

## 借口表

| AI 的借口 | 反驳 |
|-----------|------|
| "改动很小，直接编辑文件更快" | Delta 保证变更可追溯、可回滚。用它。 |
| "我不确定要生成什么 Delta" | 先读 spec，再对比用户需求，差异就是 Delta。 |
| "Delta 太复杂了" | 照着模板格式写就行：ADDED/MODIFIED/REMOVED/RENAMED。 |
| "校验失败了，跳过吧" | 校验保证质量。修正 Delta，重新运行。 |
| "直接改主 spec 更快" | 主 spec 是稳定基线，只能通过 archive apply 更新。 |

## 下一步

delta spec 生成并通过校验后，推荐：
- **使用 `validate-spec`** 对合并结果进行完整校验（推荐）
- **使用 `write-plan`** 更新实现计划
- 使用 `superspec change status <name>` 查看变更状态
- 使用 `pipeline next validate-spec` 查看推荐路径
