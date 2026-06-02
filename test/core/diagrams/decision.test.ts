import { describe, it, expect } from 'vitest';
import { generateDecisionDiagram } from '../../../src/core/diagrams/decision.js';

describe('generateDecisionDiagram', () => {
  /** 基本生成 — 包含 flowchart TD */
  it('应生成以 flowchart TD 开头的 Mermaid 图', () => {
    const result = generateDecisionDiagram();
    expect(result).toMatch(/^flowchart TD/);
  });

  /** 包含 "开始校验" 起始节点 */
  it('应包含"开始校验"起始节点', () => {
    const result = generateDecisionDiagram();
    expect(result).toContain('开始校验');
  });

  /** 包含 "Schema 校验" 决策点 */
  it('应包含"Schema 校验"决策点', () => {
    const result = generateDecisionDiagram();
    expect(result).toContain('SchemaCheck{"Schema 校验');
  });

  /** 包含 "规则引擎校验" 步骤 */
  it('应包含"规则引擎校验"步骤', () => {
    const result = generateDecisionDiagram();
    expect(result).toContain('规则引擎校验');
  });

  /** 包含 "strictMode" 决策点 */
  it('应包含"strictMode"决策点', () => {
    const result = generateDecisionDiagram();
    expect(result).toContain('StrictCheck{"strictMode');
  });

  /** 包含 "校验通过" 结果 */
  it('应包含"校验通过"结果节点', () => {
    const result = generateDecisionDiagram();
    expect(result).toContain('校验通过');
  });

  /** strictMode=true 时标签包含 strictMode */
  it('strictMode=true 时应包含 strictMode 相关标签', () => {
    const result = generateDecisionDiagram({ strictMode: true });
    expect(result).toContain('strictMode');
    expect(result).toContain('flowchart TD');
  });

  /** 包含所有结束路径 */
  it('应包含所有结束路径汇聚到 End 节点', () => {
    const result = generateDecisionDiagram();

    // 所有结果节点都应连接到 End
    expect(result).toContain('SchemaFail --> End');
    expect(result).toContain('ErrorResult --> End');
    expect(result).toContain('StrictFail --> End');
    expect(result).toContain('WarnResult --> End');
    expect(result).toContain('Pass --> End');

    // End 节点存在
    expect(result).toContain('End["结束"]');
  });

  /** 默认参数生成完整图 */
  it('无参数调用应生成完整图', () => {
    const result = generateDecisionDiagram();
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(10);
  });
});
