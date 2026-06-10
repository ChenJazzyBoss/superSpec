---
name: brainstorm
description: 通过提问收集需求，生成结构化 spec
---

# superSpec: Brainstorm（中央路由器）

通过提问收集用户需求，评估复杂度，路由到合适的路径。

## 使用时机

当用户提出一个新功能、需求变更、Bug 报告或测试失败时，使用此技能。

## 强制清单

<EXTREMELY-IMPORTANT>
你必须按顺序完成以下步骤，不可跳过。
</EXTREMELY-IMPORTANT>

1. **探索项目上下文**：查看相关文件、文档、最近提交，了解项目现状
2. **提出澄清问题**：一次一个问题，优先使用多选题
3. **评估意图并路由**：根据用户意图判断走哪条路径（见路由决策树）
4. **提出方案**：基于用户回答，提出 2-3 个方案及权衡分析
5. **用户选择**：让用户选择方案
6. **创建变更**：使用 `superspec change create <name>` 创建变更目录
7. **生成 proposal**：在变更目录中完善 proposal.md
8. **下一步**：根据路由结果引导到对应技能

## 路由决策树

<HARD-GATE>
在路由之前，必须完成至少 2 个澄清问题。
在创建变更目录之前，必须获得用户确认。
</HARD-GATE>

```
用户意图
  │
  ├─ 新功能 / 需求变更 / 功能修改
  │   → 统一变更路径
  │   → 创建 change 目录 + proposal.md
  │   → 下一步：generate-spec 或 update-spec（生成 delta spec 到 change/specs/）
  │
  └─ Bug 报告 / 测试失败 / 异常行为
      → 排障路径
      → 不创建 change 目录
      → 下一步：debug（直接排障）
```

### 路由判断标准

| 意图类型 | 判断依据 | 推荐路径 |
|---------|---------|---------|
| 新功能 | "我想做 X"、"添加 Y 功能" | 统一变更路径（ADDED） |
| 需求变更 | "修改 X"、"X 的行为改为 Y" | 统一变更路径（MODIFIED/REMOVED） |
| Bug 修复 | "X 出错了"、"测试失败了" | 排障路径 → debug |
| 简单修改 | 配置变更、文案修改、参数调整 | 统一变更路径（简化版） |

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

## 变更目录结构

创建变更后，目录结构如下：

```
.superspec/changes/<name>/
  ├── proposal.md       ← 为什么做、做什么、影响哪些 capability
  ├── specs/            ← Delta Spec（ADDED/MODIFIED/REMOVED/RENAMED）
  │   └── <capability>/spec.md
  └── plan.md           ← 实现计划（后续添加）
```

## 下一步

路由完成后，推荐：

### 统一变更路径
- **使用 `generate-spec`** 生成 delta spec 到 change/specs/（新功能 → ADDED）
- **使用 `update-spec`** 生成增量 delta spec 到 change/specs/（需求变更 → MODIFIED/REMOVED）
- 使用 `superspec change status <name>` 查看变更状态
- 使用 `pipeline show` 查看完整工作流

### 排障路径
- **使用 `debug`** 直接进入排障流程
