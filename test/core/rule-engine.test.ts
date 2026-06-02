import { describe, it, expect } from 'vitest';
import { runRules } from '../../src/core/rules/engine.js';
import { builtinRules } from '../../src/core/rules/index.js';
import { requireShallRule } from '../../src/core/rules/builtin/require-shall.js';
import { minScenariosRule } from '../../src/core/rules/builtin/min-scenarios.js';
import { uniqueReqNamesRule } from '../../src/core/rules/builtin/unique-req-names.js';
import { uniqueScenarioNamesRule } from '../../src/core/rules/builtin/unique-scenario-names.js';
import { noVagueWordsRule } from '../../src/core/rules/builtin/no-vague-words.js';
import { scenarioTypesRule } from '../../src/core/rules/builtin/scenario-types.js';
import { overviewLengthRule } from '../../src/core/rules/builtin/overview-length.js';
import { testabilityRule } from '../../src/core/rules/builtin/testability.js';
import { recommendedScenariosRule } from '../../src/core/rules/builtin/recommended-scenarios.js';
import type { Spec } from '../../src/core/spec-schema.js';

function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    name: 'test-spec',
    overview: '这是一个用于测试的规格说明书，描述了系统的核心功能需求和质量验证要求。系统需要支持多种复杂业务场景，包括用户注册登录管理、数据批量导入导出处理、角色权限精细控制等核心功能模块，确保所有功能需求都可通过自动化测试框架进行完整验证。',
    requirements: [
      {
        name: '登录功能',
        text: '系统 SHALL 支持用户通过用户名和密码登录',
        scenarios: [
          { name: '正常登录', rawText: 'Given 用户在登录页面，When 输入正确的用户名和密码，Then 跳转到首页' },
          { name: '密码错误', rawText: 'Given 用户在登录页面，When 输入错误的密码，Then 显示密码错误提示' },
          { name: '用户不存在', rawText: 'Given 用户在登录页面，When 输入不存在的用户名，Then 显示用户不存在提示' },
        ],
      },
    ],
    metadata: { version: '1.0.0', format: 'superspec' },
    ...overrides,
  };
}

describe('规则引擎', () => {
  describe('runRules', () => {
    it('合格 Spec 应全部通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, builtinRules);
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空规则集应全部通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, []);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('ERROR 级别违规时 passed 为 false', () => {
      const spec = makeSpec({
        requirements: [{ name: 'bad', text: '没有关键词', scenarios: [] }],
      });
      const result = runRules(spec, [requireShallRule, minScenariosRule]);
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('require-shall 规则', () => {
    it('缺少 SHALL/MUST 时报错', () => {
      const spec = makeSpec({
        requirements: [{ name: 'test', text: '系统支持用户登录', scenarios: [{ name: 's1', rawText: '测试场景文本内容描述' }] }],
      });
      const result = runRules(spec, [requireShallRule]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('SHALL');
    });

    it('包含 SHALL 时通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, [requireShallRule]);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('min-scenarios 规则', () => {
    it('场景数不足时报错', () => {
      const spec = makeSpec({
        requirements: [{
          name: 'test',
          text: '系统 SHALL 支持功能',
          scenarios: [{ name: 's1', rawText: '测试场景文本内容描述' }],
        }],
      });
      const result = runRules(spec, [minScenariosRule]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('1 个场景');
    });

    it('场景数足够时通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, [minScenariosRule]);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('unique-req-names 规则', () => {
    it('需求名重复时报错', () => {
      const spec = makeSpec({
        requirements: [
          { name: '重复名', text: 'SHALL A', scenarios: [{ name: 's1', rawText: '测试场景文本内容描述' }] },
          { name: '重复名', text: 'SHALL B', scenarios: [{ name: 's2', rawText: '测试场景文本内容描述' }] },
        ],
      });
      const result = runRules(spec, [uniqueReqNamesRule]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('重复名');
    });
  });

  describe('unique-scenario-names 规则', () => {
    it('同需求下场景名重复时报错', () => {
      const spec = makeSpec({
        requirements: [{
          name: 'test',
          text: 'SHALL 支持功能',
          scenarios: [
            { name: '重复场景', rawText: '测试场景文本内容描述一' },
            { name: '重复场景', rawText: '测试场景文本内容描述二' },
          ],
        }],
      });
      const result = runRules(spec, [uniqueScenarioNamesRule]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('重复场景');
    });
  });

  describe('no-vague-words 规则', () => {
    it('包含模糊词时警告', () => {
      const spec = makeSpec({
        requirements: [{
          name: 'test',
          text: '系统 SHALL 尽快响应用户请求',
          scenarios: [
            { name: 's1', rawText: '测试场景文本内容描述一' },
            { name: 's2', rawText: '测试场景文本内容描述二' },
          ],
        }],
      });
      const result = runRules(spec, [noVagueWordsRule]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('尽快');
    });

    it('无模糊词时通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, [noVagueWordsRule]);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('scenario-types 规则', () => {
    it('仅有正常流程时警告', () => {
      const spec = makeSpec({
        requirements: [{
          name: 'test',
          text: 'SHALL 支持功能',
          scenarios: [
            { name: '正常操作', rawText: 'Given 用户在页面，When 点击按钮，Then 操作成功' },
            { name: '再次操作', rawText: 'Given 用户在页面，When 再次点击，Then 操作成功' },
          ],
        }],
      });
      const result = runRules(spec, [scenarioTypesRule]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('类型单一');
    });

    it('覆盖多种类型时通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, [scenarioTypesRule]);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('overview-length 规则', () => {
    it('概述过短时提示', () => {
      const spec = makeSpec({ overview: '短概述' });
      const result = runRules(spec, [overviewLengthRule]);
      expect(result.infos).toHaveLength(1);
    });

    it('概述充分时通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, [overviewLengthRule]);
      expect(result.infos).toHaveLength(0);
    });
  });

  describe('testability 规则', () => {
    it('主观性需求时提示', () => {
      const spec = makeSpec({
        requirements: [{
          name: 'test',
          text: '系统 SHALL 提供良好的用户体验',
          scenarios: [
            { name: 's1', rawText: '测试场景文本内容描述一' },
            { name: 's2', rawText: '测试场景文本内容描述二' },
          ],
        }],
      });
      const result = runRules(spec, [testabilityRule]);
      expect(result.infos).toHaveLength(1);
      expect(result.infos[0].message).toContain('主观性');
    });

    it('有量化指标时通过', () => {
      const spec = makeSpec({
        requirements: [{
          name: 'test',
          text: '系统 SHALL 在 200ms 内响应请求',
          scenarios: [
            { name: 's1', rawText: '测试场景文本内容描述一' },
            { name: 's2', rawText: '测试场景文本内容描述二' },
          ],
        }],
      });
      const result = runRules(spec, [testabilityRule]);
      expect(result.infos).toHaveLength(0);
    });
  });

  describe('recommended-scenarios 规则', () => {
    it('场景数不足推荐值时警告', () => {
      const spec = makeSpec({
        requirements: [{
          name: 'test',
          text: 'SHALL 支持功能',
          scenarios: [
            { name: 's1', rawText: '测试场景文本内容描述一' },
            { name: 's2', rawText: '测试场景文本内容描述二' },
          ],
        }],
      });
      const result = runRules(spec, [recommendedScenariosRule]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('不足推荐值');
    });

    it('场景数达到推荐值时通过', () => {
      const spec = makeSpec();
      const result = runRules(spec, [recommendedScenariosRule]);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
