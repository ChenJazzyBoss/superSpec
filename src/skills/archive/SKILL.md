---
name: superspec:archive
description: 归档完成的变更，合并到主 spec
---

# superSpec: Archive

将完成的变更归档到主 spec，保留审计记录。

## 使用时机

当一个变更（delta）已经实现并验证完成时，使用此技能归档。

## 归档流程

<EXTREMELY-IMPORTANT>
你必须按顺序完成以下步骤：
</EXTREMELY-IMPORTANT>

1. **确认变更完成**：变更的所有任务都已完成并通过审查
2. **创建变更目录**：如果还没有，创建 `.superspec/changes/<name>/`
3. **生成 delta.json**：根据变更内容生成 Delta JSON
4. **执行归档**：运行 `superspec archive <name>`
5. **验证**：确认归档成功，spec 校验通过

## delta.json 格式

```json
{
  "specName": "<spec 名称>",
  "changes": [
    {
      "type": "ADDED",
      "section": "requirement",
      "target": "<需求名称>",
      "content": "<需求描述>"
    },
    {
      "type": "MODIFIED",
      "section": "requirement",
      "target": "<需求名称>",
      "field": "text",
      "newValue": "<新内容>"
    },
    {
      "type": "REMOVED",
      "section": "scenario",
      "target": "<场景名称>",
      "parent": "<需求名称>"
    }
  ]
}
```

## 变更类型

- **ADDED**：新增需求/场景
- **REMOVED**：删除需求/场景
- **MODIFIED**：修改需求/场景内容
- **RENAMED**：重命名需求

## 归档命令

```bash
# 从文件归档
superspec archive <name>

# 列出进行中的变更
superspec changes
```

## 冲突处理

如果两个变更修改了同一个 requirement：

1. 检查冲突内容
2. 与用户讨论解决方案
3. 合并或拆分变更
4. 重新归档

## 借口表

| 借口 | 反驳 |
|------|------|
| "先归档后面再验证" | 归档前必须验证完成 |
| "这个变更很小不需要归档" | 小变更也需要审计记录 |
| "直接改 spec 更快" | 跳过归档会丢失历史 |
