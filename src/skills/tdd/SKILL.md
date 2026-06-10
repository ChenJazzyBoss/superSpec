---
name: tdd
description: spec 感知的测试驱动开发流程
---

# superSpec: TDD

spec 感知的测试驱动开发。测试骨架从 spec 生成，然后红-绿-重构。

## 使用时机

当你需要为 spec 中的需求编写实现时，使用此技能。

## TDD 流程

<EXTREMELY-IMPORTANT>
你必须按顺序完成以下步骤：
</EXTREMELY-IMPORTANT>

1. **读取 spec**：理解需求和场景
2. **生成测试骨架**：运行 `superspec generate <name> --lang <语言>`
3. **红**：为第一个场景编写失败测试
4. **绿**：编写最少代码使测试通过
5. **重构**：改善代码质量，保持测试通过
6. **重复**：为下一个场景编写失败测试
7. **校验**：所有场景完成后，运行 `superspec validate` 确认 spec 合规

## HARD-GATE

<HARD-GATE>
没有失败测试 = 不允许写实现代码
测试通过 = 必须重构后再继续
</HARD-GATE>

## 禁止行为

<EXTREMELY-IMPORTANT>
禁止以下行为：
</EXTREMELY-IMPORTANT>

- 禁止在没有失败测试的情况下写实现代码
- 禁止跳过重构步骤
- 禁止一次写多个测试
- 禁止在测试失败时修改测试而非修复代码
- 禁止跳过 spec 中定义的场景

## 借口表

| 借口 | 反驳 |
|------|------|
| "这个场景太简单不需要测试" | 每个 spec 场景都必须有测试 |
| "我先写实现再补测试" | 违反 TDD，必须先红后绿 |
| "重构会影响进度" | 重构是 TDD 的一部分，不是可选的 |
| "测试已经通过了不需要重构" | 代码质量是持续的过程 |

## 测试骨架示例

```typescript
import { describe, it, expect } from 'vitest';

describe('需求名称', () => {
  it('场景名称', () => {
    // Arrange - 准备
    // Act - 执行
    // Assert - 断言
  });
});
```

## 下一步

TDD 流程完成后，推荐：
- **使用 `verify`** 证据驱动验证实现是否符合 spec（推荐）
- 使用 `debug` 调试遇到的问题
- 使用 `pipeline next implement` 查看推荐路径
