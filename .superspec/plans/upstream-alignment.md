# 上游对齐检测实现计划

## 优先级
**P2** — 上游对齐检测是长期维护质量的保障机制，防止规范漂移。不影响核心功能使用，但对项目可持续性至关重要。可在核心功能稳定后实现。

## 任务分解

| 序号 | 任务名 | 涉及文件 | 预估工作量 | 前置依赖 |
|------|--------|----------|------------|----------|
| 1 | 定义上游源配置数据结构（upstream.json Schema） | `src/upstream/types.ts`, `.superspec/schemas/upstream.json` | 2h | 无 |
| 2 | 实现 upstream.json 解析与验证器 | `src/upstream/config-loader.ts` | 2h | 任务 1 |
| 3 | 实现上游源注册命令（`superspec upstream register`） | `src/commands/upstream-register.ts` | 2h | 任务 2 |
| 4 | 实现 git/HTTP 文件获取器 | `src/upstream/fetcher.ts` | 4h | 无 |
| 5 | 实现本地缓存管理（`.upstream-cache/<source>/.meta.json`，TTL 控制） | `src/upstream/cache.ts` | 3h | 任务 4 |
| 6 | 实现 `superspec upstream fetch` 命令（首次获取、缓存跳过、强制刷新、部分失败处理） | `src/commands/upstream-fetch.ts` | 3h | 任务 4, 5 |
| 7 | 实现校验规则漂移检测器（新增、删除、逻辑变更） | `src/upstream/drift-detectors/validation-rule.ts` | 4h | 任务 5 |
| 8 | 实现技能 frontmatter 漂移检测器（必填字段变化） | `src/upstream/drift-detectors/skill-frontmatter.ts` | 3h | 任务 5 |
| 9 | 实现 Hook 脚本漂移检测器（签名/行为变更） | `src/upstream/drift-detectors/hook-script.ts` | 3h | 任务 5 |
| 10 | 定义差异报告数据结构（upstream-report.json Schema） | `src/upstream/report-types.ts`, `.superspec/schemas/upstream-report.json` | 2h | 无 |
| 11 | 实现差异报告生成器（分类：故意偏离/需要同步/待评估） | `src/upstream/report-generator.ts` | 4h | 任务 7, 8, 9, 10 |
| 12 | 实现 upstream-overrides.json 解析与校验（category 有效值检查） | `src/upstream/overrides.ts` | 2h | 任务 11 |
| 13 | 实现 `superspec upstream diff` 命令（--type、--report、--format json） | `src/commands/upstream-diff.ts` | 3h | 任务 11, 12 |
| 14 | 实现 `superspec upstream ci-check` 命令（非零退出码、漂移计数环境变量、离线缓存降级） | `src/commands/upstream-ci-check.ts` | 3h | 任务 13 |
| 15 | 编写单元测试 | `tests/upstream/*.test.ts` | 4h | 全部任务 |
| 16 | 编写集成测试（注册 -> 获取 -> diff -> ci-check 端到端） | `tests/integration/upstream.test.ts` | 3h | 全部任务 |

## 验收标准

1. **注册多个上游源**：upstream.json 包含两个上游源时，验证通过并输出摘要。
2. **upstream.json 格式错误**：JSON 语法错误时输出具体位置并以非零退出码终止。
3. **仓库地址不可达**：连接失败时输出错误信息，继续处理其他可达源，最终标记失败源。
4. **首次获取成功**：下载文件到 `.upstream-cache/openspec/`，记录 commit hash 和时间戳。
5. **缓存未过期跳过**：TTL 内重复 fetch 时跳过下载，提示使用 `--force` 强制刷新。
6. **网络中断部分失败**：三个源中一个中断时，成功缓存两个，输出超时错误，部分成功状态，非零退出码。
7. **校验规则新增检测**：检测到上游新增规则时标记为"上游新增，待评估"并附带原始内容。
8. **frontmatter 必填字段变更**：检测到新增必填字段时列出所有受影响的本地技能文件。
9. **Hook 脚本无变化**：commit hash 相同时输出"hook 脚本无变化"，差异报告为空。
10. **完整差异报告**：排除已标记故意偏离的项，每项包含类型、路径、差异内容和建议操作。
11. **JSON 格式报告**：输出符合 upstream-report.json schema 的 JSON，包含 reportDate、sourceSummaries、diffItems。
12. **overrides 配置错误**：category 为无效值时输出校验错误，继续处理其他有效条目。
13. **CI 检测到漂移**：未处理差异时非零退出码，输出适合 PR 评论的摘要，设置 `SUPERSPEC_UPSTREAM_DRIFT_COUNT` 环境变量。
14. **CI 无漂移**：所有差异已标记时零退出码，输出"上游对齐检查通过"。
15. **CI 网络不可用**：有本地缓存时使用缓存并输出警告；无缓存时非零退出码。

## 风险点

1. **上游仓库 API 限制**：频繁 fetch 可能触发 GitHub API 速率限制，需要实现请求节流和 token 认证支持。
2. **差异检测的准确性**：校验规则的逻辑变更（而非格式变更）难以自动检测，可能需要人工审核。
3. **缓存一致性**：本地缓存可能与上游实际状态不一致（如 force push），需要实现缓存失效机制。
4. **大型上游仓库**：上游仓库文件较多时，fetch 和 diff 的性能可能较差，需要考虑增量获取和差异比较优化。
5. **overrides 管理**：upstream-overrides.json 可能随时间变得庞大，需要提供清理和审计工具。
6. **CI 环境的网络策略**：部分 CI 环境禁止外部网络访问，需要完善的离线模式支持。
