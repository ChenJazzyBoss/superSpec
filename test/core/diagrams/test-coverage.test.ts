import { describe, it, expect } from 'vitest';
import { generateTestCoverageDiagram } from '../../../src/core/diagrams/test-coverage.js';
import type { Spec } from '../../../src/core/spec-schema.js';

function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    name: 'test-spec',
    overview: '测试概述'.repeat(20),
    requirements: [
      {
        name: '登录功能',
        text: '系统 SHALL 支持用户登录，并且 MUST 验证密码',
        scenarios: [
          { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确密码 Then 登录成功' },
          { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
          { name: '边界-空密码', rawText: 'Given 用户在登录页面 When 密码为空 Then 提示输入密码' },
        ],
      },
    ],
    metadata: { version: '1.0.0', format: 'superspec' },
    ...overrides,
  };
}

describe('generateTestCoverageDiagram', () => {
  it('基本生成包含 quadrantChart', () => {
    const spec = makeSpec();
    const result = generateTestCoverageDiagram(spec);
    expect(result).toMatch(/^quadrantChart/);
  });

  it('包含标题 "需求测试覆盖矩阵"', () => {
    const spec = makeSpec();
    const result = generateTestCoverageDiagram(spec);
    expect(result).toContain('title 需求测试覆盖矩阵');
  });

  it('包含所有需求名称', () => {
    const spec = makeSpec({
      requirements: [
        {
          name: '登录功能',
          text: '系统 SHALL 支持登录',
          scenarios: [
            { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确密码 Then 登录成功' },
            { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
          ],
        },
        {
          name: '数据导入',
          text: '系统 MUST 支持数据导入功能',
          scenarios: [
            { name: '导入成功', rawText: 'Given 用户选择文件 When 点击导入 Then 数据导入成功' },
            { name: '格式错误', rawText: 'Given 用户选择错误格式文件 When 点击导入 Then 显示错误' },
          ],
        },
      ],
    });
    const result = generateTestCoverageDiagram(spec);
    expect(result).toContain('"登录功能"');
    expect(result).toContain('"数据导入"');
  });

  it('单需求时 complexity 和 scenarioCount 为合理值', () => {
    const spec = makeSpec({
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
    });
    const result = generateTestCoverageDiagram(spec);

    // 提取坐标: "登录功能": [x, y]
    const match = result.match(/"登录功能": \[([0-9.]+), ([0-9.]+)\]/);
    expect(match).not.toBeNull();

    const x = parseFloat(match![1]);
    const y = parseFloat(match![2]);

    // complexity 和 scenarioCount 都应在 0-1 范围内
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(1);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(1);

    // 单需求时归一化场景数应为 1（唯一的最大值）
    expect(y).toBe(1);
  });

  it('多需求时坐标在 0-1 范围内', () => {
    const spec = makeSpec({
      requirements: [
        {
          name: '登录功能',
          text: '系统 SHALL 支持用户登录，并且 MUST 验证密码，如果密码错误 SHOULD 提示重试',
          scenarios: [
            { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确密码 Then 登录成功' },
            { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
            { name: '边界-空密码', rawText: 'Given 用户在登录页面 When 密码为空 Then 提示输入密码' },
          ],
        },
        {
          name: '数据导入',
          text: '系统 MUST 支持数据导入',
          scenarios: [
            { name: '导入成功', rawText: 'Given 用户选择文件 When 点击导入 Then 数据导入成功' },
          ],
        },
      ],
    });
    const result = generateTestCoverageDiagram(spec);

    // 提取所有坐标
    const coordRegex = /"([^"]+)": \[([0-9.]+), ([0-9.]+)\]/g;
    let match: RegExpExecArray | null;
    const coords: Array<{ name: string; x: number; y: number }> = [];

    while ((match = coordRegex.exec(result)) !== null) {
      coords.push({
        name: match[1],
        x: parseFloat(match[2]),
        y: parseFloat(match[3]),
      });
    }

    expect(coords.length).toBe(2);

    for (const coord of coords) {
      expect(coord.x).toBeGreaterThanOrEqual(0);
      expect(coord.x).toBeLessThanOrEqual(1);
      expect(coord.y).toBeGreaterThanOrEqual(0);
      expect(coord.y).toBeLessThanOrEqual(1);
    }
  });

  it('空需求列表不崩溃', () => {
    const spec = makeSpec({ requirements: [] });
    const result = generateTestCoverageDiagram(spec);

    expect(result).toContain('quadrantChart');
    expect(result).toContain('title 需求测试覆盖矩阵');
    expect(result).not.toContain('": [');
  });

  it('高复杂度需求的 x 坐标大于低复杂度需求', () => {
    const spec = makeSpec({
      requirements: [
        {
          name: '简单需求',
          text: '系统 SHALL 登录',
          scenarios: [
            { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确密码 Then 登录成功' },
            { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
          ],
        },
        {
          name: '复杂需求',
          text: '系统 SHALL 支持用户登录，并且 MUST 验证密码，如果密码错误 SHOULD 提示重试，或者 MAY 提供忘记密码功能，当用户连续失败 MUST 锁定账户',
          scenarios: [
            { name: '正常登录', rawText: 'Given 用户在登录页面 When 输入正确密码 Then 登录成功' },
            { name: '密码错误', rawText: 'Given 用户在登录页面 When 输入错误密码 Then 显示错误' },
            { name: '忘记密码', rawText: 'Given 用户忘记密码 When 点击忘记密码 Then 跳转找回页面' },
            { name: '账户锁定', rawText: 'Given 用户连续失败 When 超过次数 Then 账户锁定' },
          ],
        },
      ],
    });
    const result = generateTestCoverageDiagram(spec);

    const simpleMatch = result.match(/"简单需求": \[([0-9.]+),/);
    const complexMatch = result.match(/"复杂需求": \[([0-9.]+),/);

    expect(simpleMatch).not.toBeNull();
    expect(complexMatch).not.toBeNull();

    const simpleX = parseFloat(simpleMatch![1]);
    const complexX = parseFloat(complexMatch![1]);

    expect(complexX).toBeGreaterThan(simpleX);
  });
});
