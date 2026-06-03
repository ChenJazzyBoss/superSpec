# CI/CD Pipeline 实现计划

## 优先级
**P0** — CI/CD 是项目质量保障的基础设施，所有后续功能开发都依赖自动化的测试和发布流程。没有 CI/CD，代码质量无法保证，发布流程容易出错。

## 任务分解

| 序号 | 任务名 | 涉及文件 | 预估工作量 | 前置依赖 |
|------|--------|----------|------------|----------|
| 1 | 定义 PR 验证工作流 | `.github/workflows/pr-check.yml` | 2h | 无 |
| 2 | 定义 Main 分支发布工作流 | `.github/workflows/release.yml` | 3h | 任务 1 |
| 3 | 配置多平台测试矩阵 | `.github/workflows/pr-check.yml`, `.github/workflows/release.yml` | 1h | 任务 1 |
| 4 | 集成覆盖率报告生成与上传 | `.github/workflows/pr-check.yml`, `jest.config.ts` | 2h | 任务 1 |
| 5 | 实现构建产物完整性检查 | `.github/workflows/release.yml` | 2h | 任务 2 |
| 6 | 实现构建产物大小检查 | `.github/workflows/release.yml` | 1h | 任务 5 |
| 7 | 实现构建产物安全检查 | `.github/workflows/release.yml` | 2h | 任务 5 |
| 8 | 配置 PR 验证失败处理（评论、阻止合并） | `.github/workflows/pr-check.yml` | 1h | 任务 1 |
| 9 | 配置发布失败回滚与通知 | `.github/workflows/release.yml` | 2h | 任务 2 |
| 10 | 配置超时处理与版本号未更新跳过逻辑 | `.github/workflows/pr-check.yml`, `.github/workflows/release.yml` | 1h | 任务 1, 2 |
| 11 | 配置平台特定测试跳过机制 | `jest.config.ts`, `.github/workflows/pr-check.yml` | 1h | 任务 3 |
| 12 | 端到端验证：提交测试 PR 验证完整流程 | 无 | 2h | 全部任务 |

## 验收标准

1. **PR 触发验证**：提交 PR 到 main 分支时自动运行 `npm test`、`npm run lint`、`npm run typecheck`，结果显示在 PR 页面；失败时标记 PR 为失败并阻止合并。
2. **Main 分支发布**：合并到 main 后自动运行测试、构建、检查产物完整性，版本号更新时自动发布到 npm；发布失败时停止流程并通知维护者。
3. **多平台测试**：Ubuntu 和 Windows 并行运行测试，单平台失败时标记整体失败并显示具体平台信息。
4. **覆盖率报告**：使用 Istanbul/nyc 生成覆盖率报告，支持 text/lcov/html 格式，上传到 Codecov，检查覆盖率阈值。
5. **构建产物检查**：验证 dist 目录完整性、TypeScript 声明文件、package.json 字段指向，检查产物大小变化和安全漏洞。
6. **超时处理**：PR 验证超过 10 分钟自动取消并标记失败。
7. **版本号未更新**：跳过 npm 发布步骤，仅运行测试和构建。

## 风险点

1. **npm 发布权限**：需要配置 npm token 作为 GitHub Secret，权限管理不当可能导致发布失败或安全事故。
2. **Windows 测试兼容性**：部分测试用例可能在 Windows 上有路径分隔符等问题，需要额外调试。
3. **覆盖率阈值设置**：初始阈值设置过高可能导致所有 PR 都无法通过，需要根据当前覆盖率水平合理设定。
4. **构建产物大小波动**：第三方依赖更新可能导致产物大小突变，需要设置合理的阈值和白名单。
5. **CI 运行时间**：多平台并行 + 覆盖率 + 安全检查可能导致 CI 时间过长，需要优化缓存策略。
