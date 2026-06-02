import { describe, it, expect } from 'vitest';
import { parseSpec } from '../../src/core/spec-parser.js';

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
