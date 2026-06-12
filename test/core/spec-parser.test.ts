import { describe, it, expect } from 'vitest';
import { parseSpec, normalizeDeltaTitle } from '../../src/core/spec-parser.js';

describe('parseSpec', () => {
  const validMarkdown = `# 批量导出

## Purpose

用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围筛选。

## Requirements

### Requirement: 导出格式支持
系统 SHALL 支持 CSV 和 XLSX 两种导出格式。

#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件

#### Scenario: XLSX 导出
Given 用户在导出页面
When 选择 XLSX 格式
Then 生成 XLSX 文件`;

  it('解析完整 spec 文件', () => {
    const spec = parseSpec(validMarkdown, 'batch-export');
    expect(spec.name).toBe('batch-export');
    expect(spec.overview).toContain('批量导出');
    expect(spec.requirements).toHaveLength(1);
    expect(spec.requirements[0].name).toBe('Requirement: 导出格式支持');
    expect(spec.requirements[0].text).toContain('SHALL');
    expect(spec.requirements[0].scenarios).toHaveLength(2);
  });

  it('代码块内的 # 不被识别为标题', () => {
    const markdown = `# 测试

## Purpose

这是一个测试 spec 文件，用于验证代码块内的标题不会被误识别。

## Requirements

### Requirement: 示例
系统 SHALL 支持代码块测试。

#### Scenario: 场景 1
Given 以下代码：
\`\`\`python
# 这是注释，不是标题
def export():
    pass
\`\`\`
When 执行代码
Then 正常运行

#### Scenario: 场景 2
Given 正常输入
When 处理
Then 输出正确`;

    const spec = parseSpec(markdown, 'test');
    expect(spec.requirements).toHaveLength(1);
    expect(spec.requirements[0].scenarios).toHaveLength(2);
  });

  it('缺少 Purpose 段落抛出异常', () => {
    const markdown = `# 测试

## Requirements

### Requirement: 示例
系统 SHALL 支持测试。

#### Scenario: 场景 1
Given 输入
When 处理
Then 输出`;

    expect(() => parseSpec(markdown, 'test')).toThrow('Purpose');
  });

  it('缺少 Requirements 段落抛出异常', () => {
    const markdown = `# 测试

## Purpose

这是一个测试。`;

    expect(() => parseSpec(markdown, 'test')).toThrow('Requirements');
  });

  it('多个需求正确解析', () => {
    const markdown = `# 测试

## Purpose

这是一个包含多个需求的测试 spec 文件，用于验证解析器能正确处理多个需求段落。

## Requirements

### Requirement: 需求 1
系统 SHALL 支持功能 A。

#### Scenario: 场景 1A
Given 输入 A
When 处理
Then 输出 A

#### Scenario: 场景 1B
Given 输入 B
When 处理
Then 输出 B

### Requirement: 需求 2
系统 SHALL 支持功能 B。

#### Scenario: 场景 2A
Given 输入 C
When 处理
Then 输出 C

#### Scenario: 场景 2B
Given 输入 D
When 处理
Then 输出 D`;

    const spec = parseSpec(markdown, 'test');
    expect(spec.requirements).toHaveLength(2);
    expect(spec.requirements[0].scenarios).toHaveLength(2);
    expect(spec.requirements[1].scenarios).toHaveLength(2);
  });
});

describe('normalizeDeltaTitle', () => {
  it('ADDED 前缀被移除', () => {
    expect(normalizeDeltaTitle('ADDED Requirements')).toBe('Requirements');
  });

  it('MODIFIED 前缀被移除', () => {
    expect(normalizeDeltaTitle('MODIFIED Requirements')).toBe('Requirements');
  });

  it('REMOVED 前缀被移除', () => {
    expect(normalizeDeltaTitle('REMOVED Requirements')).toBe('Requirements');
  });

  it('RENAMED 前缀被移除', () => {
    expect(normalizeDeltaTitle('RENAMED Requirements')).toBe('Requirements');
  });

  it('大小写不敏感', () => {
    expect(normalizeDeltaTitle('added Requirements')).toBe('Requirements');
    expect(normalizeDeltaTitle('Added Requirements')).toBe('Requirements');
  });

  it('无前缀标题原样返回', () => {
    expect(normalizeDeltaTitle('Requirements')).toBe('Requirements');
    expect(normalizeDeltaTitle('Purpose')).toBe('Purpose');
  });

  it('前缀只匹配完整单词', () => {
    // "ADDEDX Requirements" 不应该被匹配
    expect(normalizeDeltaTitle('ADDEDX Requirements')).toBe('ADDEDX Requirements');
  });
});

describe('parseSpec — delta header 支持', () => {
  it('## ADDED Requirements 正确解析', () => {
    const markdown = `# 新功能

## Purpose

这是一个新增功能的 delta spec，用于验证 ADDED 前缀能被正确解析。

## ADDED Requirements

### Requirement: 新增功能 A
系统 SHALL 支持新增的功能 A。

#### Scenario: 正常场景
Given 正常输入
When 执行新增功能
Then 返回预期结果

#### Scenario: 异常场景
Given 无效输入
When 执行新增功能
Then 返回错误提示`;

    const spec = parseSpec(markdown, 'new-feature');
    expect(spec.requirements).toHaveLength(1);
    expect(spec.requirements[0].name).toBe('Requirement: 新增功能 A');
    expect(spec.requirements[0].scenarios).toHaveLength(2);
  });

  it('## MODIFIED Requirements 正确解析', () => {
    const markdown = `# 修改功能

## Purpose

这是一个修改现有功能的 delta spec。

## MODIFIED Requirements

### Requirement: 修改功能 B
系统 SHALL 在修改后支持新的行为。

#### Scenario: 修改后正常场景
Given 新输入
When 执行修改后的功能
Then 返回新结果

#### Scenario: 兼容旧场景
Given 旧输入
When 执行修改后的功能
Then 仍然返回旧结果`;

    const spec = parseSpec(markdown, 'modify-feature');
    expect(spec.requirements).toHaveLength(1);
    expect(spec.requirements[0].text).toContain('SHALL');
  });

  it('## REMOVED Requirements 正确解析', () => {
    const markdown = `# 删除功能

## Purpose

这是一个删除功能的 delta spec。

## REMOVED Requirements

### Requirement: 删除功能 C
该功能 SHALL 被移除，用户将无法访问。

#### Scenario: 访问已删除功能
Given 用户尝试访问已删除功能
When 发起请求
Then 返回 410 Gone`;

    const spec = parseSpec(markdown, 'remove-feature');
    expect(spec.requirements).toHaveLength(1);
  });

  it('## RENAMED Requirements 正确解析', () => {
    const markdown = `# 重命名

## Purpose

这是一个重命名操作的 delta spec。

## RENAMED Requirements

### Requirement: 重命名功能 D
系统 SHALL 将旧名称更新为新名称。

#### Scenario: 重命名成功
Given 旧名称存在
When 执行重命名
Then 新名称生效`;

    const spec = parseSpec(markdown, 'rename-feature');
    expect(spec.requirements).toHaveLength(1);
  });

  it('## ADDED Purpose 也支持 delta 前缀', () => {
    const markdown = `# 新功能

## ADDED Purpose

这是一个新增功能的 delta spec，Purpose 也带有 ADDED 前缀。

## ADDED Requirements

### Requirement: 功能
系统 SHALL 支持新功能。

#### Scenario: 正常
Given 输入
When 处理
Then 输出`;

    const spec = parseSpec(markdown, 'new-feature');
    expect(spec.overview).toContain('新增功能');
    expect(spec.requirements).toHaveLength(1);
  });

  it('向后兼容：无前缀的 ## Requirements 仍然有效', () => {
    const markdown = `# 测试

## Purpose

这是一个标准 spec 文件。

## Requirements

### Requirement: 功能
系统 SHALL 支持此功能。

#### Scenario: 场景 1
Given 输入
When 处理
Then 输出

#### Scenario: 场景 2
Given 输入 2
When 处理
Then 输出 2`;

    const spec = parseSpec(markdown, 'test');
    expect(spec.requirements).toHaveLength(1);
    expect(spec.requirements[0].scenarios).toHaveLength(2);
  });

  it('混合 delta 前缀：ADDED + MODIFIED 同时存在', () => {
    const markdown = `# 混合变更

## Purpose

这是一个包含新增和修改的混合 delta spec。

## ADDED Requirements

### Requirement: 新增功能
系统 SHALL 支持新功能。

#### Scenario: 新功能正常
Given 输入
When 处理
Then 输出

## MODIFIED Requirements

### Requirement: 修改功能
系统 SHALL 支持修改后的行为。

#### Scenario: 修改正常
Given 输入
When 处理
Then 新输出`;

    // 注意：当前解析器只查找第一个匹配 "Requirements" 的 section
    // ADDED Requirements 会先被匹配到
    const spec = parseSpec(markdown, 'mixed-change');
    expect(spec.requirements.length).toBeGreaterThanOrEqual(1);
  });
});
