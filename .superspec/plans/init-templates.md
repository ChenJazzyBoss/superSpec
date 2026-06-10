# Init Template 增强 实现计划

> 生成时间：2026-06-10
> 来源 spec：.superspec/specs/init-templates/spec.md

## 文件结构

| 文件 | 职责 |
|------|------|
| templates/init-templates/general.md | 通用项目模板（从现有 init-spec-template.md 重构） |
| templates/init-templates/web-api.md | Web API 项目模板 |
| templates/init-templates/cli.md | CLI 工具项目模板 |
| templates/init-templates/library.md | 库/SDK 项目模板 |
| src/core/init-templates.ts | 模板注册表 + 模板加载逻辑 |
| src/core/init.ts | 修改：集成模板选择到 init 流程 |
| src/cli/index.ts | 修改：添加 --template 和 --list-templates 参数 |
| test/core/init-templates.test.ts | 模板注册表单元测试 |
| test/e2e/init-template-cli.test.ts | E2E CLI 测试 |

## 任务列表

### 任务 1：创建模板注册表和模板定义

**文件**：src/core/init-templates.ts, templates/init-templates/*.md

**步骤**：

1. 创建 `templates/init-templates/` 目录
2. 将现有 `templates/init-spec-template.md` 重构为 `general.md`（内容基本不变）
3. 创建 `web-api.md`、`cli.md`、`library.md` 三种模板
4. 创建 `src/core/init-templates.ts`，定义模板注册表和加载函数
5. 运行测试确认无回归

### 任务 2：修改 init.ts 集成模板选择

**文件**：src/core/init.ts

**步骤**：

1. 在 `InitOptions` 接口添加 `template` 字段
2. 修改 `FILE_COPIES` 中的模板复制逻辑，根据 template 类型选择不同模板文件
3. 修改 `collectInteractiveOptions()` 添加模板类型选择提示
4. 添加 `listTemplates()` 函数
5. 运行测试确认无回归

### 任务 3：修改 CLI 添加 --template 和 --list-templates

**文件**：src/cli/index.ts

**步骤**：

1. 为 `init` 命令添加 `--template <type>` 选项
2. 为 `init` 命令添加 `--list-templates` 选项
3. 在 init action 中传递 template 到 initProject
4. 运行测试确认无回归

### 任务 4：编写测试

**文件**：test/core/init-templates.test.ts, test/e2e/init-template-cli.test.ts

**步骤**：

1. 编写模板注册表单元测试（模板列表、模板加载、无效模板处理）
2. 编写 E2E CLI 测试（--template、--list-templates）
3. 运行全部测试确认通过
