# Delta Spec 模型实现计划

## 优先级
**P1** — Delta Spec 是变更工作流（Change Workflow）的基础能力，支撑增量变更描述、冲突检测和合并算法。Change Workflow 的 sync 命令依赖 Delta Spec 的合并能力。在 CI/CD 建立之后优先实现。

## 任务分解

| 序号 | 任务名 | 涉及文件 | 预估工作量 | 前置依赖 |
|------|--------|----------|------------|----------|
| 1 | 定义 Delta Spec TypeScript 类型（DeltaOperation, DeltaEntry, DeltaSpec） | `src/types/delta.ts` | 2h | 无 |
| 2 | 定义 Delta Spec JSON Schema | `.superspec/schemas/delta-spec.json` | 2h | 任务 1 |
| 3 | 实现 Delta 格式校验器（operation 字段、path 格式、必需字段） | `src/delta/validator.ts` | 3h | 任务 1, 2 |
| 4 | 实现语义校验（ADDED 目标不存在、MODIFIED 目标存在等） | `src/delta/semantic-validator.ts` | 3h | 任务 3 |
| 5 | 实现冲突检测（矛盾操作、依赖冲突、路径冲突） | `src/delta/conflict-detector.ts` | 4h | 任务 1 |
| 6 | 实现 Delta 合并算法（顺序应用、冲突暂停、回滚支持） | `src/delta/merger.ts` | 5h | 任务 5 |
| 7 | 实现 Delta 解析器集成到 spec-parser | `src/parser/delta-parser.ts` | 3h | 任务 1, 3 |
| 8 | 实现 Delta 验证 API 集成 | `src/api/delta-api.ts` | 2h | 任务 3, 4, 7 |
| 9 | 实现 Delta 合并 API 集成 | `src/api/delta-merge-api.ts` | 2h | 任务 6, 7 |
| 10 | 编写单元测试 | `tests/delta/*.test.ts` | 4h | 全部任务 |
| 11 | 编写集成测试（端到端 Delta 解析-校验-合并） | `tests/integration/delta.test.ts` | 3h | 全部任务 |

## 验收标准

1. **ADDED 操作格式**：包含 operation、path、content、metadata 字段，path 格式正确。
2. **MODIFIED 操作格式**：包含 operation、path、before、after、metadata 字段。
3. **REMOVED 操作格式**：包含 operation、path、content（快照）、metadata 字段。
4. **RENAMED 操作格式**：包含 operation、oldPath、newPath、metadata 字段。
5. **顺序合并**：按 Delta 顺序依次应用，每个 Delta 应用前验证兼容性，生成完整 Spec。
6. **合并冲突处理**：检测到同一字段的矛盾修改时暂停合并，提供冲突详情，要求用户解决。
7. **合并回滚**：保留基准 Spec 快照，支持撤销最近一次合并，恢复完整状态。
8. **矛盾操作检测**：同一 requirement 的 ADDED + REMOVED 标记为 error 并阻止应用。
9. **依赖冲突检测**：REMOVED 被依赖元素时标记为 warning 并列出受影响项。
10. **格式校验**：验证 JSON Schema、必需字段、操作类型枚举、路径格式。
11. **语义校验**：ADDED 目标不存在、MODIFIED 目标存在、REMOVED 目标存在、RENAMED 新路径不存在。
12. **与 spec-parser 集成**：自动识别 Delta 格式、专用解析器、接口一致性。

## 风险点

1. **路径表达式设计**：Spec 的嵌套结构较深，路径表达式需要支持多级嵌套（如 `requirements.auth.login.scenarios[0]`），设计不当会导致解析困难。
2. **合并算法复杂度**：多层嵌套对象的深度合并容易出现边界情况，特别是 RENAMED 操作与其他操作的交互。
3. **before 快照管理**：MODIFIED 和 REMOVED 操作需要保存修改前的快照，快照的存储和版本管理需要额外设计。
4. **与现有 spec-parser 的兼容性**：新增 Delta 解析路径不能破坏现有的全量 Spec 解析逻辑。
5. **性能**：大量 Delta 的顺序合并可能导致性能问题，需要考虑增量合并优化。
