# spec-optimizer

## Purpose

基于实际使用反馈优化 superSpec。当前校验只做格式检查（有没有 SHALL、场景数够不够），不做逻辑检查；图表功能承诺了但没实现；spec 和代码之间没有同步机制。需要从格式检查器升级为真正的设计辅助工具。

<!-- DIAGRAM:flowchart -->

```mermaid
flowchart TD
    A["用户写 spec"] --> B{"需要深度检查?"}
    B -- --deep --> C["逻辑一致性分析"]
    B -- 默认 --> D["格式校验"]
    C --> E["输出报告 + Mermaid 图表"]
    D --> E
    E --> F{"spec 关联了源码?"}
    F -- 是 --> G["检测代码变更，提醒 spec 是否过时"]
    F -- 否 --> H["跳过同步检查"]
```

## Requirements

### Requirement: 校验引擎 SHALL 支持逻辑一致性检查
校验引擎 SHALL 提供可选的逻辑一致性分析，检查场景之间是否存在矛盾、需求的场景是否真正覆盖了需求描述中的约束。此功能为可选，通过 --deep 标志启用。

#### Scenario: 检测场景间的逻辑矛盾
Given 一个需求有两个场景，场景 A 说"系统 SHALL 拒绝超过 100 条的导出请求"，场景 B 说"用户选择 200 条数据后系统成功导出"
When 校验引擎以 --deep 模式检查逻辑一致性
Then MUST 报告 WARNING：两个场景存在逻辑矛盾

#### Scenario: 检测场景未覆盖需求约束
Given 需求描述说"系统 SHALL 支持 CSV、XLSX、PDF 三种格式"，但三个场景全部只测试 CSV
When 校验引擎以 --deep 模式检查覆盖度
Then MUST 报告 WARNING：场景未覆盖需求中提到的所有格式

#### Scenario: 未指定 --deep 时跳过逻辑检查
Given 用户未指定 --deep 标志
When 运行校验
Then MUST 仅执行格式校验，不执行逻辑一致性检查

#### Scenario: 逻辑检查结果不阻断校验
Given 逻辑一致性检查发现了矛盾
When 校验引擎生成报告
Then 矛盾 MUST 以 WARNING 级别报告，不以 ERROR 级别阻断（因为逻辑判断可能有误）

### Requirement: 校验引擎 SHALL 自动生成 Mermaid 图表
当 spec 中包含 `<!-- DIAGRAM:flowchart -->` 或 `<!-- DIAGRAM:state -->` 等标记时，校验引擎 SHALL 根据 spec 内容自动生成对应的 Mermaid 图表代码并嵌入 spec 文件。

#### Scenario: 从需求场景生成流程图
Given spec 中包含 `<!-- DIAGRAM:flowchart -->` 标记，且 spec 有 3 个需求、6 个场景
When 校验引擎处理该 spec
Then MUST 在标记位置生成 Mermaid flowchart 代码，节点代表需求，连线代表场景中的 Given-When-Then 流程

#### Scenario: 从需求场景生成状态图
Given spec 中包含 `<!-- DIAGRAM:state -->` 标记，且需求描述了状态转换（如"从草稿到审核"）
When 校验引擎处理该 spec
Then MUST 在标记位置生成 Mermaid stateDiagram 代码，状态和转换从场景的 Given/Then 中提取

#### Scenario: 图表生成失败时不阻断校验
Given 图表生成过程中解析场景内容失败
When 校验引擎继续处理
Then MUST 在图表标记位置插入注释说明生成失败原因，不影响其他校验结果

#### Scenario: 已有图表标记时更新而非重复插入
Given spec 中已有 Mermaid 图表代码块
When 重新运行校验
Then MUST 替换现有图表代码，不创建重复的图表

### Requirement: 校验引擎 SHALL 支持 spec-code 关联追踪
spec 文件 SHALL 能够声明关联的源码文件，校验引擎 SHALL 检测源码文件的修改时间，当源码比 spec 更新时提醒用户 spec 可能需要更新。

#### Scenario: spec 声明关联源码文件
Given spec 文件中包含 `<!-- source: src/core/validator.ts, src/core/rules/engine.ts -->` 标记
When 校验引擎解析该 spec
Then MUST 记录关联的源码文件列表

#### Scenario: 源码比 spec 更新时提醒
Given spec 关联了 src/core/validator.ts，该文件最后修改时间为 2026-06-04，spec 最后修改时间为 2026-06-01
When 校验引擎检查关联关系
Then MUST 报告 INFO：源码 validator.ts 比 spec 更新，spec 可能需要同步更新

#### Scenario: 源码文件不存在时提示
Given spec 关联了 src/core/old-module.ts，但该文件已删除
When 校验引擎检查关联关系
Then MUST 报告 WARNING：关联的源码文件不存在，spec 可能已过时

### Requirement: 规则引擎 SHALL 按场景类型识别并分类
校验规则 SHALL 根据场景的 Given/When/Then 内容自动判断场景类型（正常流程、异常处理、边界条件），并在校验报告中标注每个场景的类型。

#### Scenario: 自动识别异常处理场景
Given 场景的 When 部分包含"发生错误"、"失败"、"超时"等关键词
When 校验引擎分析场景类型
Then MUST 将该场景标记为"异常处理"类型

#### Scenario: 自动识别边界条件场景
Given 场景的 Given 或 When 部分包含"为空"、"超出上限"、"恰好达到"、"最大值"等关键词
When 校验引擎分析场景类型
Then MUST 将该场景标记为"边界条件"类型

#### Scenario: 默认标记为正常流程
Given 场景的 Given/When/Then 不包含异常或边界关键词
When 校验引擎分析场景类型
Then MUST 将该场景标记为"正常流程"类型

#### Scenario: 缺少异常处理场景时给出提示
Given 一个需求有 3 个场景，全部被识别为正常流程
When 校验引擎检查场景类型分布
Then MUST 报告 WARNING：该需求缺少异常处理场景
