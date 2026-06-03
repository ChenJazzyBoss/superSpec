---
name: archive
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
4. **合并 delta 到 specs/**：执行 delta → specs 合并，将变更内容写入能力 spec
5. **校验合并结果**：运行 `superspec validate` 确保 specs/ 仍然通过 strict 校验
6. **执行归档**：运行 `superspec archive <name>`
7. **验证**：确认归档成功，spec 校验通过

<HARD-GATE>
如果 delta 合并导致 specs/ 校验失败，不得继续归档。必须先修复合并结果。
</HARD-GATE>

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

## delta → specs 合并

归档时，delta 的变更内容会自动合并到 `.superspec/specs/` 中对应的能力 spec：

- **ADDED**：在目标章节后追加新内容
- **MODIFIED**：替换目标章节的内容
- **REMOVED**：删除目标章节及其子章节
- **RENAMED**：重命名章节标题

合并后会自动运行 strict 校验，确保 specs/ 的完整性不受影响。

## 跳步红线

| 跳步借口 | 现实 |
|----------|------|
| "先归档后面再验证" | 不校验就归档，specs/ 会被破坏 |
| "这个变更很小不需要归档" | 小变更也需要审计记录 |
| "直接改 spec 更快" | 跳过归档会丢失历史 |
| "delta 合并太麻烦，手动改 specs" | 手动改无法追溯变更来源 |
| "校验失败了但内容没问题，先归档" | 校验失败说明格式或结构有问题 |

## 完成检查清单

- [ ] 所有任务已完成并通过审查
- [ ] delta.json 格式正确，包含所有变更操作
- [ ] delta 已合并到 specs/ 中对应的能力 spec
- [ ] 合并后 specs/ 通过 strict 校验（0 errors, 0 warnings）
- [ ] 归档命令执行成功
- [ ] changes/ 目录中该变更已移除或标记为已归档
