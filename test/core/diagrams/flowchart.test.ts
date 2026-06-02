import { describe, it, expect } from 'vitest';
import { generateFlowchart } from '../../../src/core/diagrams/flowchart.js';
import type { Spec } from '../../../src/core/spec-schema.js';

function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    name: 'test-spec',
    overview: '测试概述'.repeat(20),
    requirements: [
      {
        name: '登录功能',
        text: '系统 SHALL 支持登录',
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

describe('generateFlowchart', () => {
  it('基本生成包含 flowchart TB', () => {
    const spec = makeSpec();
    const result = generateFlowchart(spec);
    expect(result).toMatch(/^flowchart TB/);
  });

  it('包含 spec 名称', () => {
    const spec = makeSpec({ name: 'my-awesome-spec' });
    const result = generateFlowchart(spec);
    expect(result).toContain('📋 my-awesome-spec');
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
          name: '注册功能',
          text: '系统 SHALL 支持注册',
          scenarios: [
            { name: '正常注册', rawText: 'Given 用户在注册页面 When 填写正确信息 Then 注册成功' },
            { name: '注册失败', rawText: 'Given 用户在注册页面 When 用户名已存在 Then 注册失败' },
          ],
        },
      ],
    });
    const result = generateFlowchart(spec);
    expect(result).toContain('🔑 登录功能');
    expect(result).toContain('🔑 注册功能');
  });

  it('包含所有场景名称', () => {
    const spec = makeSpec();
    const result = generateFlowchart(spec);
    expect(result).toContain('正常登录');
    expect(result).toContain('密码错误');
    expect(result).toContain('边界-空密码');
  });

  it('happy-path 场景使用 ✅ 和 happy 样式', () => {
    const spec = makeSpec();
    const result = generateFlowchart(spec);
    // 正常登录 -> happy-path -> ✅
    expect(result).toContain('✅ 正常登录');
    expect(result).toContain('class R0S0 happy');
    expect(result).toContain('classDef happy fill:#d4edda,stroke:#28a745,color:#155724');
  });

  it('error-case 场景使用 ❌ 和 error 样式', () => {
    const spec = makeSpec();
    const result = generateFlowchart(spec);
    // 密码错误 -> error-case -> ❌
    expect(result).toContain('❌ 密码错误');
    expect(result).toContain('class R0S1 error');
    expect(result).toContain('classDef error fill:#f8d7da,stroke:#dc3545,color:#721c24');
  });

  it('edge-case 场景使用 ⚠️ 和 edge 样式', () => {
    const spec = makeSpec();
    const result = generateFlowchart(spec);
    // 边界-空密码 -> edge-case -> ⚠️
    expect(result).toContain('⚠️ 边界-空密码');
    expect(result).toContain('class R0S2 edge');
    expect(result).toContain('classDef edge fill:#fff3cd,stroke:#ffc107,color:#856404');
  });

  it('多需求多场景正确生成', () => {
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
          name: '注册功能',
          text: '系统 SHALL 支持注册',
          scenarios: [
            { name: '成功注册', rawText: 'Given 用户在注册页面 When 填写正确信息 Then 注册成功' },
            { name: '注册失败', rawText: 'Given 用户在注册页面 When 用户名已存在 Then 注册失败' },
            { name: '边界-超长用户名', rawText: 'Given 用户在注册页面 When 用户名超长 Then 提示过长' },
          ],
        },
      ],
    });
    const result = generateFlowchart(spec);

    // 验证节点 ID 格式
    expect(result).toContain('R0S0');
    expect(result).toContain('R0S1');
    expect(result).toContain('R1S0');
    expect(result).toContain('R1S1');
    expect(result).toContain('R1S2');

    // 验证子图
    expect(result).toContain('subgraph req0["🔑 登录功能"]');
    expect(result).toContain('subgraph req1["🔑 注册功能"]');

    // 验证样式分配
    expect(result).toContain('class R0S0 happy');   // 正常登录
    expect(result).toContain('class R0S1 error');    // 密码错误
    expect(result).toContain('class R1S0 happy');    // 成功注册
    expect(result).toContain('class R1S1 error');    // 注册失败
    expect(result).toContain('class R1S2 edge');     // 边界-超长用户名
  });

  it('空场景列表处理不应崩溃', () => {
    const spec = makeSpec({
      requirements: [
        {
          name: '空需求',
          text: '系统 SHALL 支持空需求',
          scenarios: [],
        },
      ],
    });
    const result = generateFlowchart(spec);

    expect(result).toContain('flowchart TB');
    expect(result).toContain('📋 test-spec');
    expect(result).toContain('🔑 空需求');
    expect(result).toContain('subgraph req0["🔑 空需求"]');
  });
});
