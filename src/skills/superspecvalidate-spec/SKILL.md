---
name: superspec:validate-spec
description: 在修改 spec 文件后使用，确保 spec 质量符合标准
---

# 校验规格说明书（Validate Spec）

## 概述

对 spec 文件运行程序化校验，确保结构完整、内容合规。

**核心原则：** 校验不是可选的，是每次修改 spec 后的必经步骤。

## 何时使用

**始终使用：**
- 修改 spec 文件后
- 生成新 spec 后
- 合并 spec 变更后

<SUBAGENT-STOP>
如果你是作为子智能体被分派来执行特定任务的，跳过此技能。
</SUBAGENT-STOP>

## 校验命令

```bash
node .superspec/scripts/validate.js <spec-file-path>
```

例如：
```bash
node .superspec/scripts/validate.js .superspec/specs/batch-export/spec.md
```

## 输出格式

校验工具输出 JSON 格式：

```json
{
  "valid": true,
  "issues": [],
  "summary": { "errors": 0, "warnings": 0, "info": 0 }
}
```

## 如何处理校验结果

### valid: true
校验通过。spec 质量合格。

### valid: false
校验失败。查看 issues 数组中的错误：

| level | 含义 | 处理方式 |
|-------|------|---------|
| ERROR | 必须修正 | 根据 message 修正 spec，重新校验 |
| WARNING | 建议修正 | 评估是否需要修正 |
| INFO | 仅供参考 | 了解即可 |

## 常见错误及修正方法

| 错误信息 | 原因 | 修正方法 |
|---------|------|---------|
| "概述内容至少需要 50 个字符" | Purpose 太短 | 补充功能的目的和价值描述 |
| "需求文本必须包含 SHALL 或 MUST" | 缺少强制性关键词 | 在需求描述中加入 SHALL 或 MUST |
| "每条需求至少需要关联 2 个场景" | 场景数不足 | 补充异常/边界场景 |
| "场景原始文本至少需要 10 个字符" | 场景描述太短 | 补充 Given/When/Then 的具体内容 |
| "规格中至少需要包含 1 条需求" | 没有需求 | 添加至少一条 Requirement |

<EXTREMELY-IMPORTANT>
校验失败时，你必须修正 spec 并重新校验。不要跳过校验，不要忽略错误。
</EXTREMELY-IMPORTANT>
