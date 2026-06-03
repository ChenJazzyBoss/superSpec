# Anti-Rationalization 实现计划

## 优先级
**P0** — 反合理化是 superSpec 所有技能文件的质量保障基础。AI 跳步行为会直接导致 spec 质量不可控，所有其他功能（Delta Spec、Change Workflow 等）的技能文件都需要反合理化机制保护。

## 任务分解

| 序号 | 任务名 | 涉及文件 | 预估工作量 | 前置依赖 |
|------|--------|----------|------------|----------|
| 1 | 定义红线表数据结构和配置格式 | `src/anti-rationalization/types.ts` | 2h | 无 |
| 2 | 实现红线表加载器（从 SKILL.md 中解析红线表） | `src/anti-rationalization/red-flag-loader.ts` | 3h | 任务 1 |
| 3 | 实现红线表实时检测引擎（模式匹配与拦截） | `src/anti-rationalization/red-flag-detector.ts` | 4h | 任务 2 |
| 4 | 定义检查清单数据结构 | `src/anti-rationalization/types.ts` | 1h | 无 |
| 5 | 实现检查清单解析器（从 SKILL.md 中解析 CHECKLIST 标签） | `src/anti-rationalization/checklist-parser.ts` | 3h | 任务 4 |
| 6 | 实现检查清单强制执行引擎（逐项验证、顺序锁定） | `src/anti-rationalization/checklist-enforcer.ts` | 4h | 任务 5 |
| 7 | 实现完成声明证据化验证器（证据新鲜度检查、证据完整性验证） | `src/anti-rationalization/evidence-verifier.ts` | 4h | 无 |
| 8 | 建立反跳步模式库初始条目 | `.superspec/patterns/anti-skip-patterns.json` | 3h | 无 |
| 9 | 实现模式库加载与匹配引擎 | `src/anti-rationalization/pattern-matcher.ts` | 3h | 任务 8 |
| 10 | 将反合理化机制集成到技能执行引擎 | `src/engine/skill-executor.ts` | 4h | 任务 2, 5, 7, 9 |
| 11 | 为现有技能（generate-spec、validate-spec 等）添加红线表 | `.superspec/skills/*/SKILL.md` | 4h | 任务 1 |
| 12 | 编写单元测试 | `tests/anti-rationalization/*.test.ts` | 4h | 全部任务 |

## 验收标准

1. **红线表检测**：AI 试图跳过 Purpose 编写时，系统匹配红线表条目并拦截操作，强制回到正确步骤。
2. **红线表配置缺失**：技能配置文件无红线表时，系统报错并拒绝执行。
3. **红线表动态更新**：更新红线表后下次执行自动加载，无需重启。
4. **检查清单逐项完成**：完成一项后解锁下一项，未通过则要求重新执行。
5. **检查清单跳过拦截**：尝试跳过未完成条目时系统阻止并记录跳步尝试。
6. **检查清单模糊条目**：完成标准不明确时要求提供具体证据。
7. **HARD-GATE 阻断**：标记为 HARD-GATE 的步骤不可跳过，直到条件满足。
8. **完成声明带证据**：附带校验工具完整输出的完成声明被接受。
9. **无证据完成声明拒绝**：未提供验证证据的完成声明被拒绝。
10. **过期证据检测**：证据时间戳早于最后一次 spec 修改时判定为过期。
11. **反跳步模式库**：新模式可入库，后续自动应用检测规则。
12. **直接编码拦截**：检测到缺少 spec 文件时拦截编码操作。
13. **声称完成不运行校验**：检测到校验步骤缺失时拒绝完成声明。

## 风险点

1. **红线表维护成本**：每新增一个技能都需要编写红线表，维护成本随技能数量线性增长。需要考虑模板化和自动生成方案。
2. **模式匹配误判**：过于宽松的模式匹配可能漏检跳步行为，过于严格可能误判正常操作为跳步。需要持续调优匹配规则。
3. **证据验证的时效性**：如何准确定义"新鲜"的证据，以及如何处理 spec 修改和证据生成之间的时间窗口。
4. **检查清单灵活性**：过于严格的检查清单可能降低 AI 的执行效率，需要在约束和效率之间找到平衡。
5. **AI 绕过机制**：随着 AI 能力提升，可能出现新的绕过反合理化机制的方式，需要持续更新模式库。
