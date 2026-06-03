import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WORKFLOW,
  getWorkflowStages,
  getStage,
  getStagesFrom,
  PipelineContextManager,
  checkPreconditions,
  checkPostconditions,
  classifyFailure,
  shouldRetry,
  getRetryDelay,
  PipelineExecutor,
} from '../../../src/core/pipeline/index.js';
import type { PipelineContext, StageHandler } from '../../../src/core/pipeline/index.js';

describe('默认工作流', () => {
  it('包含 7 个阶段', () => {
    expect(DEFAULT_WORKFLOW).toHaveLength(7);
  });

  it('阶段顺序正确', () => {
    const ids = DEFAULT_WORKFLOW.map((s) => s.id);
    expect(ids).toEqual([
      'brainstorm',
      'generate-spec',
      'validate-spec',
      'write-plan',
      'implement',
      'verify',
      'archive',
    ]);
  });

  it('brainstorm 是可选阶段', () => {
    const brainstorm = DEFAULT_WORKFLOW.find((s) => s.id === 'brainstorm');
    expect(brainstorm?.required).toBe(false);
  });

  it('其余阶段均为必需', () => {
    const required = DEFAULT_WORKFLOW.filter((s) => s.required);
    expect(required).toHaveLength(6);
  });
});

describe('getStage', () => {
  it('按 id 查找阶段', () => {
    const stage = getStage('validate-spec');
    expect(stage).toBeDefined();
    expect(stage?.name).toBe('校验 Spec');
  });

  it('不存在的 id 返回 undefined', () => {
    // @ts-expect-error 测试无效 id
    expect(getStage('nonexistent')).toBeUndefined();
  });
});

describe('getStagesFrom', () => {
  it('从指定阶段开始到末尾', () => {
    const stages = getStagesFrom('write-plan');
    expect(stages.map((s) => s.id)).toEqual(['write-plan', 'implement', 'verify', 'archive']);
  });

  it('从第一个阶段开始返回全部', () => {
    const stages = getStagesFrom('brainstorm');
    expect(stages).toHaveLength(7);
  });

  it('从最后一个阶段开始返回单个', () => {
    const stages = getStagesFrom('archive');
    expect(stages).toHaveLength(1);
    expect(stages[0].id).toBe('archive');
  });

  it('不存在的阶段返回空数组', () => {
    // @ts-expect-error 测试无效 id
    expect(getStagesFrom('nonexistent')).toEqual([]);
  });
});

describe('PipelineContextManager', () => {
  it('使用默认值创建', () => {
    const ctx = new PipelineContextManager();
    expect(ctx.get('retryCount')).toBe(0);
    expect(ctx.get('metadata')).toEqual({});
  });

  it('使用初始值创建', () => {
    const ctx = new PipelineContextManager({ specPath: '/path/to/spec.md', retryCount: 2 });
    expect(ctx.get('specPath')).toBe('/path/to/spec.md');
    expect(ctx.get('retryCount')).toBe(2);
  });

  it('读写字段', () => {
    const ctx = new PipelineContextManager();
    ctx.set('specPath', '/new/path.md');
    expect(ctx.get('specPath')).toBe('/new/path.md');
  });

  it('has 检查字段存在', () => {
    const ctx = new PipelineContextManager({ specPath: '/path' });
    expect(ctx.has('specPath')).toBe(true);
    expect(ctx.has('planPath')).toBe(false);
  });

  it('toJSON 导出纯对象', () => {
    const ctx = new PipelineContextManager({ specPath: '/path' });
    const json = ctx.toJSON();
    expect(json.specPath).toBe('/path');
    expect(json.retryCount).toBe(0);
  });

  it('fromJSON 还原管理器', () => {
    const original = new PipelineContextManager({ specPath: '/path', retryCount: 1 });
    const json = JSON.stringify(original.toJSON());
    const restored = PipelineContextManager.fromJSON(json);
    expect(restored.get('specPath')).toBe('/path');
    expect(restored.get('retryCount')).toBe(1);
  });
});

describe('checkPreconditions', () => {
  it('brainstorm 无前置条件', () => {
    const ctx: PipelineContext = { retryCount: 0, metadata: {} };
    expect(checkPreconditions('brainstorm', ctx).satisfied).toBe(true);
  });

  it('generate-spec 缺少 brainstorm 输出时不满足', () => {
    const ctx: PipelineContext = { retryCount: 0, metadata: {} };
    const result = checkPreconditions('generate-spec', ctx);
    expect(result.satisfied).toBe(false);
    expect(result.reason).toContain('brainstorm');
  });

  it('generate-spec 有 brainstorm 输出时满足', () => {
    const ctx: PipelineContext = { retryCount: 0, metadata: { brainstormOutput: '需求内容' } };
    expect(checkPreconditions('generate-spec', ctx).satisfied).toBe(true);
  });

  it('validate-spec 缺少 specPath 时不满足', () => {
    const ctx: PipelineContext = { retryCount: 0, metadata: {} };
    const result = checkPreconditions('validate-spec', ctx);
    expect(result.satisfied).toBe(false);
    expect(result.reason).toContain('spec');
  });

  it('write-plan 缺少校验报告时不满足', () => {
    const ctx: PipelineContext = { specPath: '/path', retryCount: 0, metadata: {} };
    const result = checkPreconditions('write-plan', ctx);
    expect(result.satisfied).toBe(false);
    expect(result.reason).toContain('校验');
  });

  it('write-plan 校验通过时满足', () => {
    const ctx: PipelineContext = {
      specPath: '/path',
      validationReport: { valid: true, issues: [] },
      retryCount: 0,
      metadata: {},
    };
    expect(checkPreconditions('write-plan', ctx).satisfied).toBe(true);
  });
});

describe('checkPostconditions', () => {
  it('validate-spec 校验通过时后置条件满足', () => {
    const ctx: PipelineContext = {
      validationReport: { valid: true, issues: [] },
      retryCount: 0,
      metadata: {},
    };
    expect(checkPostconditions('validate-spec', ctx).satisfied).toBe(true);
  });

  it('validate-spec 校验未通过时后置条件不满足', () => {
    const ctx: PipelineContext = {
      validationReport: { valid: false, issues: ['issue1'] },
      retryCount: 0,
      metadata: {},
    };
    const result = checkPostconditions('validate-spec', ctx);
    expect(result.satisfied).toBe(false);
    expect(result.reason).toContain('校验未通过');
  });

  it('verify 未标记通过时后置条件不满足', () => {
    const ctx: PipelineContext = { retryCount: 0, metadata: {} };
    const result = checkPostconditions('verify', ctx);
    expect(result.satisfied).toBe(false);
    expect(result.reason).toContain('验证未通过');
  });
});

describe('classifyFailure', () => {
  it('超时错误归类为 transient', () => {
    expect(classifyFailure('执行超时 timeout')).toBe('transient');
  });

  it('文件不存在归类为 data', () => {
    expect(classifyFailure('文件不存在')).toBe('data');
  });

  it('JSON 解析错误归类为 data', () => {
    expect(classifyFailure('JSON parse error')).toBe('data');
  });

  it('逻辑错误归类为 logic', () => {
    expect(classifyFailure('需求矛盾')).toBe('logic');
  });

  it('未知错误默认归类为 logic', () => {
    expect(classifyFailure('something went wrong')).toBe('logic');
  });
});

describe('shouldRetry', () => {
  it('未达最大重试次数时允许重试', () => {
    expect(shouldRetry('verify', 0, 3)).toBe(true);
    expect(shouldRetry('verify', 2, 3)).toBe(true);
  });

  it('达到最大重试次数时不允许重试', () => {
    expect(shouldRetry('verify', 3, 3)).toBe(false);
  });

  it('超过最大重试次数时不允许重试', () => {
    expect(shouldRetry('verify', 5, 3)).toBe(false);
  });
});

describe('getRetryDelay', () => {
  it('第 1 次重试为基础延迟', () => {
    expect(getRetryDelay(1, 2000)).toBe(2000);
  });

  it('第 2 次重试为 2 倍延迟', () => {
    expect(getRetryDelay(2, 2000)).toBe(4000);
  });

  it('第 3 次重试为 4 倍延迟', () => {
    expect(getRetryDelay(3, 2000)).toBe(8000);
  });
});

describe('PipelineExecutor', () => {
  it('完整执行所有阶段（带 handler）', async () => {
    const executor = new PipelineExecutor();
    const ctx = new PipelineContextManager();

    // 注册所有阶段的 handler，模拟正常执行
    executor.registerHandler('brainstorm', async (c) => {
      c.set('metadata', { ...c.get('metadata'), brainstormOutput: '需求内容' });
      return c;
    });
    executor.registerHandler('generate-spec', async (c) => {
      c.set('specPath', '/specs/test/spec.md');
      return c;
    });
    executor.registerHandler('validate-spec', async (c) => {
      c.set('validationReport', { valid: true, issues: [] });
      return c;
    });
    executor.registerHandler('write-plan', async (c) => {
      c.set('planPath', '/plans/test/plan.md');
      return c;
    });
    executor.registerHandler('implement', async (c) => {
      c.set('metadata', { ...c.get('metadata'), implementCompleted: true });
      return c;
    });
    executor.registerHandler('verify', async (c) => {
      c.set('metadata', { ...c.get('metadata'), verifyPassed: true });
      return c;
    });
    executor.registerHandler('archive', async (c) => {
      c.set('metadata', { ...c.get('metadata'), archivePath: '/archive/test' });
      return c;
    });

    const result = await executor.execute(ctx);

    expect(result.status).toBe('completed');
    expect(result.stages.size).toBe(7);
    for (const [, stageResult] of result.stages) {
      expect(stageResult.status).toBe('completed');
    }
  });

  it('从中间阶段开始执行', async () => {
    const executor = new PipelineExecutor();
    const ctx = new PipelineContextManager({
      specPath: '/specs/test/spec.md',
      validationReport: { valid: true, issues: [] },
      retryCount: 0,
      metadata: {},
    });

    executor.registerHandler('write-plan', async (c) => {
      c.set('planPath', '/plans/test/plan.md');
      return c;
    });
    executor.registerHandler('implement', async (c) => {
      c.set('metadata', { ...c.get('metadata'), implementCompleted: true });
      return c;
    });
    executor.registerHandler('verify', async (c) => {
      c.set('metadata', { ...c.get('metadata'), verifyPassed: true });
      return c;
    });
    executor.registerHandler('archive', async (c) => {
      c.set('metadata', { ...c.get('metadata'), archivePath: '/archive/test' });
      return c;
    });

    const result = await executor.execute(ctx, { fromStage: 'write-plan' });

    expect(result.status).toBe('completed');
    // 跳过的阶段应标记为 skipped
    expect(result.stages.get('brainstorm')?.status).toBe('skipped');
    expect(result.stages.get('generate-spec')?.status).toBe('skipped');
    expect(result.stages.get('validate-spec')?.status).toBe('skipped');
    // 从 write-plan 开始的阶段应完成
    expect(result.stages.get('write-plan')?.status).toBe('completed');
    expect(result.stages.get('implement')?.status).toBe('completed');
    expect(result.stages.get('verify')?.status).toBe('completed');
    expect(result.stages.get('archive')?.status).toBe('completed');
  });

  it('可选阶段无 handler 时自动跳过', async () => {
    // 只有 brainstorm 是可选的，不注册 handler 时应跳过
    const executor = new PipelineExecutor();
    const ctx = new PipelineContextManager();

    // 不注册 brainstorm 的 handler，但注册后续阶段
    // brainstorm 跳过后 generate-spec 的前置条件检查会失败（缺少 brainstormOutput）
    // 所以这里测试的是 brainstorm 本身被跳过
    const result = await executor.execute(ctx, { fromStage: 'brainstorm' });

    // brainstorm 没有 handler 且是可选的，应该被跳过
    expect(result.stages.get('brainstorm')?.status).toBe('skipped');
    // generate-spec 前置条件不满足，执行失败
    expect(result.status).toBe('failed');
  });

  it('前置条件不满足时阶段执行失败', async () => {
    const executor = new PipelineExecutor();
    const ctx = new PipelineContextManager();

    // 从 validate-spec 开始，但没有 specPath
    const result = await executor.execute(ctx, { fromStage: 'validate-spec' });

    expect(result.status).toBe('failed');
    expect(result.stages.get('validate-spec')?.status).toBe('failed');
    expect(result.stages.get('validate-spec')?.error).toContain('前置条件不满足');
  });

  it('handler 抛出异常时阶段执行失败', async () => {
    const executor = new PipelineExecutor();
    const ctx = new PipelineContextManager({
      retryCount: 0,
      metadata: { brainstormOutput: '需求' },
    });

    executor.registerHandler('generate-spec', async () => {
      throw new Error('生成失败');
    });

    const result = await executor.execute(ctx, { fromStage: 'generate-spec' });

    expect(result.status).toBe('failed');
    expect(result.stages.get('generate-spec')?.status).toBe('failed');
    expect(result.stages.get('generate-spec')?.error).toBe('生成失败');
  });

  it('执行记录包含时间戳', async () => {
    const executor = new PipelineExecutor();
    const ctx = new PipelineContextManager();

    executor.registerHandler('brainstorm', async (c) => {
      c.set('metadata', { ...c.get('metadata'), brainstormOutput: '需求' });
      return c;
    });
    executor.registerHandler('generate-spec', async (c) => {
      c.set('specPath', '/spec.md');
      return c;
    });
    executor.registerHandler('validate-spec', async (c) => {
      c.set('validationReport', { valid: true, issues: [] });
      return c;
    });
    executor.registerHandler('write-plan', async (c) => {
      c.set('planPath', '/plan.md');
      return c;
    });
    executor.registerHandler('implement', async (c) => {
      c.set('metadata', { ...c.get('metadata'), implementCompleted: true });
      return c;
    });
    executor.registerHandler('verify', async (c) => {
      c.set('metadata', { ...c.get('metadata'), verifyPassed: true });
      return c;
    });
    executor.registerHandler('archive', async (c) => {
      c.set('metadata', { ...c.get('metadata'), archivePath: '/archive' });
      return c;
    });

    const result = await executor.execute(ctx);

    expect(result.id).toMatch(/^exec-/);
    expect(result.startedAt).toBeDefined();
    expect(result.completedAt).toBeDefined();
    expect(new Date(result.startedAt).getTime()).toBeLessThanOrEqual(
      new Date(result.completedAt!).getTime(),
    );
  });
});
