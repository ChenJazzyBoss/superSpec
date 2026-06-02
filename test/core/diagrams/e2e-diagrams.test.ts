/**
 * 图表生成管线端到端测试
 *
 * 测试从 Spec 数据 -> 图表生成 -> 集成嵌入的完整流程。
 * 覆盖 8 个场景：完整管线、变更更新、校验报告影响、
 * 占位符替换、追加模式、有效 Mermaid 输出、空 Spec 处理、strictMode 影响。
 */

import { describe, it, expect } from 'vitest';
import { generateFlowchart } from '../../../src/core/diagrams/flowchart.js';
import { generateStateDiagram } from '../../../src/core/diagrams/state.js';
import { generateDecisionDiagram } from '../../../src/core/diagrams/decision.js';
import { generateTestCoverageDiagram } from '../../../src/core/diagrams/test-coverage.js';
import { embedDiagram, embedAllDiagrams } from '../../../src/core/diagrams/diagram-integration.js';
import type { Spec } from '../../../src/core/spec-schema.js';
import type { ValidationReport } from '../../../src/core/validator.js';

/**
 * 创建测试用 Spec 数据
 *
 * @param overrides - 可选的部分覆盖字段
 * @returns 完整的 Spec 对象
 */
function makeSpec(overrides?: Partial<Spec>): Spec {
  return {
    name: 'test-feature',
    overview: '这是一个测试功能的概述，用于验证图表生成器的端到端流程。'.repeat(3),
    requirements: [
      {
        name: '用户登录',
        text: '系统 SHALL 支持用户通过用户名和密码登录系统',
        scenarios: [
          { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确凭证 Then 登录成功' },
          { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
          { name: '空输入', rawText: 'Given 用户在登录页面 When 不输入任何内容 Then 提示必填' },
        ],
      },
    ],
    metadata: { version: '1.0.0', format: 'superspec' },
    ...overrides,
  };
}

/**
 * 创建测试用 ValidationReport 数据
 *
 * @param overrides - 可选的部分覆盖字段
 * @returns 完整的 ValidationReport 对象
 */
function makeReport(overrides?: Partial<ValidationReport>): ValidationReport {
  return {
    valid: true,
    issues: [],
    summary: { errors: 0, warnings: 0, info: 0 },
    ...overrides,
  };
}

describe('图表生成管线 E2E', () => {
  it('完整管线 - 生成并嵌入所有图表', () => {
    /** 创建包含 2 个需求、各 3 个场景的 Spec */
    const spec = makeSpec({
      requirements: [
        {
          name: '用户登录',
          text: '系统 SHALL 支持用户通过用户名和密码登录系统',
          scenarios: [
            { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确凭证 Then 登录成功' },
            { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
            { name: '空输入', rawText: 'Given 用户在登录页面 When 不输入任何内容 Then 提示必填' },
          ],
        },
        {
          name: '数据导出',
          text: '系统 SHALL 支持将数据导出为 CSV 格式',
          scenarios: [
            { name: '正常导出', rawText: 'Given 用户选择数据 When 点击导出 Then 生成 CSV 文件' },
            { name: '无数据导出', rawText: 'Given 数据为空 When 点击导出 Then 提示无数据' },
            { name: '大数据导出', rawText: 'Given 数据量超过限制 When 点击导出 Then 分批导出' },
          ],
        },
      ],
    });

    const report = makeReport({ valid: true });
    const content = '# 测试文档\n\n正文内容';
    const result = embedAllDiagrams(content, spec, report);

    // 应包含所有三个图表的标题
    expect(result).toContain('## 📊 任务分解图');
    expect(result).toContain('## 📊 状态流转图');
    expect(result).toContain('## 📊 校验决策流程');

    // 应包含对应的 Mermaid 代码块
    const mermaidBlocks = result.match(/```mermaid/g);
    expect(mermaidBlocks).not.toBeNull();
    expect(mermaidBlocks!.length).toBeGreaterThanOrEqual(3);

    // flowchart 应包含两个需求名称
    expect(result).toContain('用户登录');
    expect(result).toContain('数据导出');
  });

  it('Spec 变更后图表更新', () => {
    /** 初始 Spec：单个需求 */
    const spec1 = makeSpec();
    const flowchart1 = generateFlowchart(spec1);

    // 初始应只包含用户登录
    expect(flowchart1).toContain('用户登录');

    /** 修改 Spec：增加一个需求 */
    const spec2 = makeSpec({
      requirements: [
        ...spec1.requirements,
        {
          name: '消息通知',
          text: '系统 SHALL 支持站内消息通知',
          scenarios: [
            { name: '发送通知', rawText: 'Given 触发事件 When 满足条件 Then 发送通知' },
          ],
        },
      ],
    });
    const flowchart2 = generateFlowchart(spec2);

    // 变更后应包含新需求
    expect(flowchart2).toContain('用户登录');
    expect(flowchart2).toContain('消息通知');

    // 图表内容应不同
    expect(flowchart2).not.toBe(flowchart1);
  });

  it('校验报告影响状态图', () => {
    const spec = makeSpec();
    const content = '# 测试文档\n\n正文内容';

    /** 通过的报告 */
    const passReport = makeReport({ valid: true });
    const passResult = embedAllDiagrams(content, spec, passReport);

    /** 失败的报告 */
    const failReport = makeReport({
      valid: false,
      issues: [{ level: 'ERROR', path: 'spec.name', message: '名称无效' }],
      summary: { errors: 1, warnings: 0, info: 0 },
    });
    const failResult = embedAllDiagrams(content, spec, failReport);

    // 两者都包含状态图
    expect(passResult).toContain('## 📊 状态流转图');
    expect(failResult).toContain('## 📊 状态流转图');

    // 通过报告的状态图应包含"通过"，不应包含"有错误"
    const passStateMatch = passResult.match(/```mermaid\n(stateDiagram-v2[\s\S]*?)```/);
    expect(passStateMatch).not.toBeNull();
    expect(passStateMatch![1]).toContain('通过');
    expect(passStateMatch![1]).not.toContain('有错误');

    // 失败报告的状态图应包含"有错误"
    const failStateMatch = failResult.match(/```mermaid\n(stateDiagram-v2[\s\S]*?)```/);
    expect(failStateMatch).not.toBeNull();
    expect(failStateMatch![1]).toContain('有错误');
  });

  it('占位符替换模式', () => {
    const content = '# 标题\n\n<!-- DIAGRAM:flowchart -->\n\n正文内容';
    const mermaidCode = 'flowchart TB\n  A --> B';

    const result = embedDiagram(content, 'flowchart', mermaidCode);

    // 占位符应被替换
    expect(result).not.toContain('<!-- DIAGRAM:flowchart -->');

    // 应包含图表区块
    expect(result).toContain('## 📊 任务分解图');
    expect(result).toContain('```mermaid');
    expect(result).toContain('flowchart TB');

    // 原始内容应保留
    expect(result).toContain('# 标题');
    expect(result).toContain('正文内容');
  });

  it('追加模式', () => {
    const content = '# 标题\n\n正文内容';
    const mermaidCode = 'flowchart TB\n  A --> B';

    const result = embedDiagram(content, 'flowchart', mermaidCode);

    // 图表应追加到内容开头（第一个 # 标题之前）
    const diagramIdx = result.indexOf('## 📊 任务分解图');
    const headingIdx = result.indexOf('# 标题');
    expect(diagramIdx).toBeLessThan(headingIdx);
    expect(diagramIdx).toBe(0);

    // 应包含 Mermaid 代码和原始内容
    expect(result).toContain('```mermaid');
    expect(result).toContain('flowchart TB');
    expect(result).toContain('正文内容');
  });

  it('所有图表生成器返回有效 Mermaid', () => {
    const spec = makeSpec();
    const report = makeReport();

    /** flowchart 应包含 flowchart TB */
    const flowchart = generateFlowchart(spec);
    expect(flowchart).toMatch(/^flowchart TB/);

    /** state 应包含 stateDiagram-v2 */
    const state = generateStateDiagram(report);
    expect(state).toMatch(/^stateDiagram-v2/m);

    /** decision 应包含 flowchart TD */
    const decision = generateDecisionDiagram();
    expect(decision).toMatch(/^flowchart TD/);

    /** test-coverage 应包含 quadrantChart */
    const coverage = generateTestCoverageDiagram(spec);
    expect(coverage).toMatch(/^quadrantChart/);
  });

  it('空 Spec 处理', () => {
    /** 只有 1 个需求、0 个场景的 Spec */
    const spec = makeSpec({
      requirements: [
        {
          name: '空需求',
          text: '系统 SHALL 支持空需求测试',
          scenarios: [],
        },
      ],
    });

    /** 不应崩溃，且返回有效 Mermaid */
    expect(() => generateFlowchart(spec)).not.toThrow();
    expect(() => generateTestCoverageDiagram(spec)).not.toThrow();

    const flowchart = generateFlowchart(spec);
    expect(flowchart).toContain('flowchart TB');
    expect(flowchart).toContain('空需求');

    const coverage = generateTestCoverageDiagram(spec);
    expect(coverage).toContain('quadrantChart');
  });

  it('strictMode 影响', () => {
    /** strictMode=true + warnings 的 report */
    const report = makeReport({
      valid: false,
      issues: [{ level: 'WARNING', path: 'spec.overview', message: '概述过短' }],
      summary: { errors: 0, warnings: 1, info: 0 },
    });

    const stateDiagram = generateStateDiagram(report, true);

    // 应包含 strictMode失败 状态
    expect(stateDiagram).toContain('strictMode失败');
    expect(stateDiagram).toContain('有警告 --> strictMode失败');
    expect(stateDiagram).toContain('strictMode失败 --> [*]');
  });
});
