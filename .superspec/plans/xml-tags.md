# XML 标签约束系统实现计划

## 优先级
**P0** — XML 标签是 Anti-Rationalization 的核心基础设施，HARD-GATE、CHECKLIST 等标签的解析和执行是反合理化机制的前提。同时 XML 标签也是所有 SKILL.md 文件的约束基础。

## 任务分解

| 序号 | 任务名 | 涉及文件 | 预估工作量 | 前置依赖 |
|------|--------|----------|------------|----------|
| 1 | 定义标签类型枚举和标签数据结构 | `src/xml-tags/types.ts` | 1h | 无 |
| 2 | 实现 XML 标签解析器（识别 HARD-GATE、EXTREMELY-IMPORTANT、SUBAGENT-STOP、CHECKLIST） | `src/xml-tags/parser.ts` | 4h | 任务 1 |
| 3 | 实现标签格式验证器（闭合标签、命名规范、非空内容、禁止嵌套） | `src/xml-tags/format-validator.ts` | 3h | 任务 2 |
| 4 | 实现未知标签检测（WARNING 报告） | `src/xml-tags/parser.ts` | 1h | 任务 2 |
| 5 | 实现代码块内标签排除逻辑 | `src/xml-tags/parser.ts` | 2h | 任务 2 |
| 6 | 实现 HARD-GATE 行为约束引擎（条件阻断） | `src/xml-tags/engines/hard-gate.ts` | 4h | 任务 2, 3 |
| 7 | 实现 EXTREMELY-IMPORTANT 行为约束引擎（强化提示） | `src/xml-tags/engines/extremely-important.ts` | 2h | 任务 2, 3 |
| 8 | 实现 SUBAGENT-STOP 行为约束引擎（子代理跳过） | `src/xml-tags/engines/subagent-stop.ts` | 2h | 任务 2, 3 |
| 9 | 实现 CHECKLIST 行为约束引擎（逐项检查） | `src/xml-tags/engines/checklist.ts` | 4h | 任务 2, 3 |
| 10 | 实现 validate-skill 命令（标签校验集成，JSON 输出） | `src/commands/validate-skill.ts` | 3h | 任务 2, 3 |
| 11 | 确保与纯 Markdown SKILL.md 的兼容性（无标签时正常工作） | `src/xml-tags/parser.ts`, `src/engine/skill-executor.ts` | 2h | 任务 2 |
| 12 | 编写单元测试 | `tests/xml-tags/*.test.ts` | 4h | 全部任务 |
| 13 | 编写集成测试（validate-skill 命令端到端） | `tests/integration/xml-tags.test.ts` | 2h | 全部任务 |

## 验收标准

1. **标签识别**：解析器正确识别 `<HARD-GATE>内容</HARD-GATE>` 格式的标签，提取类型和内容。
2. **未知标签**：遇到 `<UNKNOWN-TAG>` 时报告 WARNING 级别问题，继续解析其他已知标签。
3. **空内容标签**：`<HARD-GATE></HARD-GATE>` 报告 ERROR 级别问题。
4. **缺少闭合标签**：`<HARD-GATE>内容` 报告 ERROR 并提供行号。
5. **同类型嵌套**：`<HARD-GATE>外层 <HARD-GATE>内层</HARD-GATE></HARD-GATE>` 报告 ERROR。
6. **HARD-GATE 阻断**：条件不满足时阻止后续操作，直到校验结果为 valid: true。
7. **SUBAGENT-STOP**：子代理加载含该标签的技能时跳过执行，直接执行分配的任务。
8. **CHECKLIST 部分完成**：5 项只完成 3 项时阻止完成声明，列出剩余 2 项。
9. **Markdown 兼容**：含标签的 SKILL.md 在 Markdown 渲染器中正常显示。
10. **无标签兼容**：不含标签的 SKILL.md 正常解析执行，不报错。
11. **代码块排除**：代码块内的 `<HARD-GATE>` 不被识别为真正标签约束。
12. **validate-skill 命令**：合法标签输出 `{"valid": true, "tags": 3, "issues": []}`；非法标签输出具体错误信息并以非零退出码退出。

## 风险点

1. **正则表达式复杂度**：XML 标签解析需要处理嵌套、代码块排除等边界情况，正则表达式可能过于复杂导致维护困难。建议使用状态机解析器。
2. **与 Markdown 渲染的冲突**：XML 标签在某些 Markdown 渲染器中可能被当作 HTML 处理，需要测试主流渲染器的兼容性。
3. **标签语义歧义**：HARD-GATE 和 EXTREMELY-IMPORTANT 的边界可能不够清晰，需要在文档中明确定义区别。
4. **CHECKLIST 与 Anti-Rationalization 的 CHECKLIST 功能重叠**：需要明确两者的职责边界，避免重复实现。
5. **性能**：大量标签的解析和验证可能影响 SKILL.md 的加载速度，需要考虑缓存机制。
