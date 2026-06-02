import { describe, it, expect } from 'vitest';
import { embedDiagram, embedAllDiagrams } from '../../../src/core/diagrams/diagram-integration.js';
import type { Spec } from '../../../src/core/spec-schema.js';
import type { ValidationReport } from '../../../src/core/validator.js';

/** 创建测试用 Spec 数据 */
function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    name: 'test-spec',
    overview: '测试概述内容'.repeat(20),
    requirements: [
      {
        name: '登录功能',
        text: '系统 SHALL 支持用户登录',
        scenarios: [
          { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确密码 Then 登录成功' },
          { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
        ],
      },
    ],
    metadata: { version: '1.0.0', format: 'superspec' },
    ...overrides,
  };
}

/** 创建测试用 ValidationReport 数据 */
function makeReport(overrides: Partial<ValidationReport> = {}): ValidationReport {
  return {
    valid: true,
    issues: [],
    summary: { errors: 0, warnings: 0, info: 0 },
    ...overrides,
  };
}

describe('embedDiagram', () => {
  it('替换匹配类型的占位符', () => {
    const content = '# 标题\n\n<!-- DIAGRAM:flowchart -->\n\n正文内容';
    const mermaidCode = 'flowchart TB\n  A --> B';

    const result = embedDiagram(content, 'flowchart', mermaidCode);

    expect(result).toContain('## 📊 任务分解图');
    expect(result).toContain('```mermaid');
    expect(result).toContain('flowchart TB');
    expect(result).not.toContain('<!-- DIAGRAM:flowchart -->');
    // 标题应该保留在原位
    expect(result).toContain('# 标题');
    expect(result).toContain('正文内容');
  });

  it('无占位符时追加到内容开头', () => {
    const content = '# 标题\n\n正文内容';
    const mermaidCode = 'flowchart TB\n  A --> B';

    const result = embedDiagram(content, 'flowchart', mermaidCode);

    // 图表区块应在第一个 # 标题之前
    const diagramIdx = result.indexOf('## 📊 任务分解图');
    const headingIdx = result.indexOf('# 标题');
    expect(diagramIdx).toBeLessThan(headingIdx);
    expect(diagramIdx).toBe(0);
    expect(result).toContain('```mermaid');
    expect(result).toContain('flowchart TB');
    expect(result).toContain('正文内容');
  });

  it('多个占位符只替换匹配的类型', () => {
    const content = '<!-- DIAGRAM:flowchart -->\n\n<!-- DIAGRAM:state -->\n\n正文';
    const mermaidCode = 'flowchart TB\n  A --> B';

    const result = embedDiagram(content, 'flowchart', mermaidCode);

    // flowchart 占位符被替换
    expect(result).not.toContain('<!-- DIAGRAM:flowchart -->');
    expect(result).toContain('## 📊 任务分解图');

    // state 占位符保持不变
    expect(result).toContain('<!-- DIAGRAM:state -->');
  });
});

describe('embedAllDiagrams', () => {
  it('包含 flowchart 和 decision 图表', () => {
    const content = '# 标题\n\n正文内容';
    const spec = makeSpec();

    const result = embedAllDiagrams(content, spec);

    expect(result).toContain('## 📊 任务分解图');
    expect(result).toContain('## 📊 校验决策流程');
    expect(result).toContain('```mermaid');
  });

  it('提供 report 时包含 state 图表', () => {
    const content = '# 标题\n\n正文内容';
    const spec = makeSpec();
    const report = makeReport({
      valid: false,
      issues: [{ level: 'ERROR', path: 'spec.name', message: '名称无效' }],
      summary: { errors: 1, warnings: 0, info: 0 },
    });

    const result = embedAllDiagrams(content, spec, report);

    expect(result).toContain('## 📊 任务分解图');
    expect(result).toContain('## 📊 状态流转图');
    expect(result).toContain('## 📊 校验决策流程');
  });

  it('未提供 report 时不包含 state 图表', () => {
    const content = '# 标题\n\n正文内容';
    const spec = makeSpec();

    const result = embedAllDiagrams(content, spec);

    expect(result).toContain('## 📊 任务分解图');
    expect(result).toContain('## 📊 校验决策流程');
    expect(result).not.toContain('## 📊 状态流转图');
  });

  it('输出包含 mermaid 代码块', () => {
    const content = '# 标题\n\n正文内容';
    const spec = makeSpec();

    const result = embedAllDiagrams(content, spec);

    // 至少有两个 mermaid 代码块（flowchart + decision）
    const mermaidBlocks = result.match(/```mermaid/g);
    expect(mermaidBlocks).not.toBeNull();
    expect(mermaidBlocks!.length).toBeGreaterThanOrEqual(2);
  });
});
