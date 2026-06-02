---
name: superspec:brainstorm
description: 通过提问收集需求，生成结构化 spec
---

# superSpec: Brainstorm

通过提问收集用户需求，最终生成结构化 spec。

## 使用时机

当用户提出一个新功能或需求时，使用此技能收集需求。

## 强制清单

<EXTREMELY-IMPORTANT>
你必须按顺序完成以下步骤，不可跳过。
</EXTREMELY-IMPORTANT>

1. **探索项目上下文**：查看相关文件、文档、最近提交，了解项目现状
2. **提出澄清问题**：一次一个问题，优先使用多选题
3. **提出方案**：基于用户回答，提出 2-3 个方案及权衡分析
4. **用户选择**：让用户选择方案
5. **生成 spec**：基于用户回答，生成结构化 spec 到 `.superspec/specs/<name>/spec.md`
6. **校验**：运行 `node .superspec/scripts/validate.js .superspec/specs/<name>/spec.md`
7. **修正**：校验失败则修正，直到通过
8. **审查**：用户审查通过后的 spec
9. **下一步**：提供下一步选项（write-plan 或手动实现）

## HARD-GATE 门禁

<HARD-GATE>
在用户确认需求之前，禁止生成 spec。
在 spec 校验通过之前，禁止声明完成。
</HARD-GATE>

## 提问规则

<EXTREMELY-IMPORTANT>
你必须遵守以下提问规则：
</EXTREMELY-IMPORTANT>

- **一次一个问题**：不要一次问多个问题
- **优先多选**：使用多选题，而非开放题
- **动态调整**：根据用户回答调整下一个问题
- **不要假设**：不要假设用户没说的需求

## 借口表

| 借口 | 反驳 |
|------|------|
| "这个太简单了，不需要问" | 简单需求也有边界条件 |
| "我已经有思路了" | 有思路不等于需求已确认 |
| "用户很着急" | 仓促生成的 spec 只会返工 |
| "直接生成 spec 更快" | 没有确认的 spec 是猜测 |

## spec 格式要求

生成的 spec 必须包含：

```markdown
# <功能名称>

## Purpose

<功能描述，至少 50 个字符>

## Requirements

### Requirement: <需求名称>
<需求描述，必须包含 SHALL 或 MUST>

#### Scenario: <场景名称>
Given <前置条件>
When <触发动作>
Then <预期结果>

#### Scenario: <另一个场景>
Given <前置条件>
When <触发动作>
Then <预期结果>
```

## 校验命令

生成 spec 后，必须运行：

```bash
node .superspec/scripts/validate.js .superspec/specs/<name>/spec.md
```

如果校验失败，必须修正后重新校验，直到通过。
