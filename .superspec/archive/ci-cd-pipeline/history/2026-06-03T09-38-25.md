# CI/CD Pipeline

## Purpose

superSpec 项目需要建立完整的持续集成和持续部署流程，以确保代码质量和发布稳定性。通过 GitHub Actions 工作流，实现 PR 时自动运行测试、lint 和类型检查，push 到 main 分支时自动执行测试、构建和发布。支持多平台测试（Ubuntu 和 Windows），上传覆盖率报告，并检查构建产物。这将大幅提升开发效率，减少人为错误，确保每次代码变更都经过严格验证。

## Requirements

### Requirement: PR 触发验证

当开发者提交 Pull Request 时，系统 SHALL 自动运行完整的代码质量检查流程，包括单元测试、lint 检查和 TypeScript 类型检查，确保代码变更符合项目质量标准。

#### Scenario: 正常 PR 验证流程

Given 开发者在 feature 分支上完成代码修改并提交 PR 到 main 分支
When GitHub Actions 检测到 PR 事件
Then 系统 SHALL 自动运行以下检查：
- 执行 `npm test` 运行完整测试套件
- 执行 `npm run lint` 进行代码风格检查
- 执行 `npm run typecheck` 进行 TypeScript 类型检查
- 在 PR 页面显示所有检查结果

#### Scenario: PR 验证失败处理

Given 开发者提交的 PR 存在测试失败或 lint 错误
When GitHub Actions 运行验证流程
Then 系统 SHALL：
- 标记 PR 为失败状态
- 在 PR 评论中显示详细的错误信息
- 阻止 PR 合并直到所有检查通过

#### Scenario: PR 验证超时处理

Given GitHub Actions 运行时间超过预设阈值（如 10 分钟）
When 验证流程仍在运行
Then 系统 SHALL：
- 自动取消当前运行
- 标记 PR 为失败状态
- 提示开发者检查是否有死循环或性能问题

### Requirement: Main 分支发布流程

当代码推送到 main 分支时，系统 SHALL 自动执行完整的测试、构建和发布流程，确保 main 分支始终处于可发布状态。

#### Scenario: 正常发布流程

Given 开发者将 PR 合并到 main 分支
When GitHub Actions 检测到 main 分支的 push 事件
Then 系统 SHALL 按顺序执行：
- 运行完整测试套件
- 执行生产环境构建
- 检查构建产物完整性
- 自动发布到 npm（如果版本号已更新）

#### Scenario: 发布失败回滚

Given 发布过程中出现错误（如 npm 发布失败）
When GitHub Actions 检测到发布失败
Then 系统 SHALL：
- 立即停止发布流程
- 发送通知给项目维护者
- 在 GitHub Issues 中自动创建问题记录
- 保持 main 分支代码不变

#### Scenario: 版本号未更新处理

Given 代码推送到 main 分支但 package.json 中的版本号未更新
When GitHub Actions 运行发布流程
Then 系统 SHALL：
- 跳过 npm 发布步骤
- 仅运行测试和构建
- 在 Actions 日志中记录跳过原因

### Requirement: 多平台测试支持

系统 SHALL 在 Ubuntu 和 Windows 两个平台上并行运行测试，确保代码在不同操作系统上的兼容性。

#### Scenario: 多平台并行测试

Given PR 或 main 分支 push 触发 CI 流程
When GitHub Actions 开始执行
Then 系统 SHALL：
- 同时启动 Ubuntu 和 Windows 测试环境
- 在两个平台上并行运行完整测试套件
- 等待所有平台测试完成后汇总结果

#### Scenario: 单平台测试失败

Given 测试在 Windows 平台上失败但在 Ubuntu 上通过
When GitHub Actions 汇总测试结果
Then 系统 SHALL：
- 标记整体测试为失败
- 在 PR 页面显示具体失败的平台和测试用例
- 提供两个平台的详细日志链接

#### Scenario: 平台特定问题处理

Given 某个测试用例在特定平台上存在已知兼容性问题
When 开发者需要跳过该平台的特定测试
Then 系统 SHALL：
- 支持通过环境变量或配置文件标记平台特定测试
- 在测试报告中明确标注跳过的测试
- 提供跳过原因的文档链接

### Requirement: 覆盖率报告上传

系统 SHALL 自动生成并上传测试覆盖率报告，帮助开发者了解代码覆盖情况并持续改进测试质量。

#### Scenario: 覆盖率报告生成

Given 测试套件运行完成
When GitHub Actions 收集测试结果
Then 系统 SHALL：
- 使用 Istanbul/nyc 生成覆盖率报告
- 支持多种报告格式（text, lcov, html）
- 将报告上传到 Codecov 或 Coveralls 等服务

#### Scenario: 覆盖率阈值检查

Given 项目配置了覆盖率阈值（如 80%）
When 覆盖率报告生成后
Then 系统 SHALL：
- 检查整体覆盖率是否达到阈值
- 检查新增代码的覆盖率是否符合要求
- 如果覆盖率不足，标记 CI 为失败并提供详细报告

#### Scenario: 覆盖率趋势跟踪

Given 多次 PR 和发布积累了覆盖率数据
When 维护者查看覆盖率报告
Then 系统 SHALL：
- 显示覆盖率随时间的变化趋势
- 标记覆盖率显著下降的 PR
- 提供覆盖率改进建议

### Requirement: 构建产物检查

系统 SHALL 自动检查构建产物的完整性和正确性，确保发布到 npm 的包是可用的。

#### Scenario: 构建产物完整性检查

Given 生产环境构建完成
When GitHub Actions 检查构建产物
Then 系统 SHALL：
- 验证 dist 目录包含所有必要文件
- 检查 TypeScript 声明文件是否生成
- 验证 package.json 中的 main 和 types 字段指向正确文件
- 运行简单的导入测试验证包可用性

#### Scenario: 构建产物大小检查

Given 构建产物生成完成
When GitHub Actions 分析产物大小
Then 系统 SHALL：
- 记录构建产物的总大小
- 与历史构建大小对比
- 如果大小增长超过阈值（如 20%），发出警告

#### Scenario: 构建产物安全检查

Given 构建产物准备发布
When GitHub Actions 进行安全检查
Then 系统 SHALL：
- 扫描产物中是否包含敏感信息（如 API 密钥）
- 检查依赖包是否存在已知漏洞
- 验证产物的完整性校验和
