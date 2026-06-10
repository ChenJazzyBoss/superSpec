---
name: brainstorm
description: 通过提问收集需求，生成结构化 spec
---

# superSpec: Brainstorm（中央路由器）

通过提问收集用户需求，评估复杂度，路由到合适的路径深度。

## 使用时机

当用户提出一个新功能、需求变更、Bug 报告或测试失败时，使用此技能。

## 强制清单

<EXTREMELY-IMPORTANT>
你必须按顺序完成以下步骤，不可跳过。
</EXTREMELY-IMPORTANT>

1. **探索项目上下文**：查看相关文件、文档、最近提交，了解项目现状
2. **提出澄清问题**：一次一个问题，优先使用多选题
3. **评估意图并路由**：使用 `superspec route "<用户输入>"` 评估复杂度，选择路径
4. **展示路由决策**：向用户展示推荐路径和判断依据，获得确认
5. **提出方案**：基于用户回答，提出 2-3 个方案及权衡分析
6. **用户选择**：让用户选择方案
7. **执行路由**：根据路径选择执行不同操作
8. **下一步**：根据路由结果引导到对应技能

## 自适应路由决策树

<HARD-GATE>
在路由之前，必须完成至少 2 个澄清问题。
在创建变更目录之前，必须获得用户确认。
</HARD-GATE>

```
用户意图
  │
  ├── 🚀 轻量路径（简单新功能）
  │   条件：1-2 个 requirement，单 capability，不涉及已有 spec
  │   → 直接使用 generate-spec 写入 specs/
  │   → 不创建 change 目录
  │   → archive 时直接记录（不需要 apply delta）
  │
  ├── 📦 完整路径（复杂新功能 / 需求变更）
  │   条件：多个 capability，超过 2 个 requirement，或涉及已有 spec 的修改
  │   → 创建 change 目录 + proposal.md
  │   → 生成 delta spec 到 change/specs/
  │   → archive 时 apply delta 到主 spec
  │
  └── 🔧 排障路径（Bug 修复）
      条件：Bug 报告、测试失败、异常行为
      → 不创建 change 目录
      → 直接路由到 debug
```

### 路由判断标准

| 意图类型 | 判断依据 | 推荐路径 |
|---------|---------|---------|
| 简单新功能 | "新增 X"，1-2 个 requirement | 🚀 轻量路径 |
| 复杂新功能 | 多个 capability，>2 个 requirement | 📦 完整路径 |
| 需求变更 | "修改 X"、"删掉 Y" | 📦 完整路径（强制） |
| Bug 修复 | "X 出错了"、"测试失败了" | 🔧 排障路径 |

### 路由评估命令

```bash
# 评估用户意图
superspec route "新增导出按钮"
# → 🚀 轻量路径

superspec route "实现完整的用户认证系统" -c 3
# → 📦 完整路径

superspec route "修改导出格式为PDF"
# → 📦 完整路径

superspec route "导出功能报错了"
# → 🔧 排障路径
```

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

## 下一步

路由完成后，根据路径推荐：

### 🚀 轻量路径
- **使用 `generate-spec`** 直接生成 spec 到 specs/ 目录
- 使用 `pipeline next generate-spec` 查看后续步骤

### 📦 完整路径
- **使用 `generate-spec`** 生成 delta spec 到 change/specs/（新功能 → ADDED）
- **使用 `update-spec`** 生成增量 delta spec 到 change/specs/（需求变更 → MODIFIED/REMOVED）
- 使用 `superspec change status <name>` 查看变更状态
- 使用 `pipeline show` 查看完整工作流

### 🔧 排障路径
- **使用 `debug`** 直接进入排障流程
