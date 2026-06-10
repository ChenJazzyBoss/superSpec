import { describe, it, expect } from 'vitest';
import { PipelineGuardRunner } from '../../../src/core/pipeline/guard-runner.js';
import { PipelineContextManager } from '../../../src/core/pipeline/context.js';
import type { StageId } from '../../../src/core/pipeline/types.js';

/**
 * 构造一个带红线表的有效技能内容
 * 注意：必须用"跳步借口"和"现实"作为表头（与 red-flag-loader.ts 解析逻辑一致）
 */
const VALID_SKILL = `# Test Skill

## 跳步红线

| 跳步借口 | 现实 |
|----------|------|
| "这个太简单了" | 简单也有边界条件 |
`;

/**
 * 构造一个缺少红线表的无效技能内容
 */
const INVALID_SKILL = `# Test Skill

没有红线表的技能。
`;

/** 构建全部有效的技能内容映射 */
function allValid(): Record<StageId, string> {
  const stages: StageId[] = [
    'brainstorm', 'generate-spec', 'validate-spec', 'write-plan',
    'implement', 'verify', 'archive', 'debug', 'generate-test',
  ];
  const result = {} as Record<StageId, string>;
  for (const s of stages) result[s] = VALID_SKILL;
  return result;
}

/** 构建指定阶段无效、其余有效的技能内容映射 */
function withInvalid(stageId: StageId): Record<StageId, string> {
  const contents = allValid();
  contents[stageId] = INVALID_SKILL;
  return contents;
}

/**
 * 注册完整工作流的所有 handler
 */
function registerAllHandlers(runner: PipelineGuardRunner): void {
  runner.registerHandler('brainstorm', async (ctx) => {
    ctx.set('metadata', { ...ctx.get('metadata'), brainstormOutput: '需求已收集' });
    return ctx;
  });
  runner.registerHandler('generate-spec', async (ctx) => {
    ctx.set('specPath', '.superspec/specs/test/spec.md');
    return ctx;
  });
  runner.registerHandler('validate-spec', async (ctx) => {
    ctx.set('validationReport', { valid: true, issues: [] });
    return ctx;
  });
  runner.registerHandler('write-plan', async (ctx) => {
    ctx.set('planPath', '.superspec/plans/test.md');
    return ctx;
  });
  runner.registerHandler('implement', async (ctx) => {
    ctx.set('metadata', { ...ctx.get('metadata'), implementCompleted: true });
    return ctx;
  });
  runner.registerHandler('verify', async (ctx) => {
    ctx.set('metadata', { ...ctx.get('metadata'), verifyPassed: true });
    return ctx;
  });
  runner.registerHandler('archive', async (ctx) => {
    ctx.set('metadata', { ...ctx.get('metadata'), archivePath: '.superspec/archive/test' });
    return ctx;
  });
}

describe('PipelineGuardRunner', () => {
  describe('正常流程', () => {
    it('注册全部 handler 并执行完整管道', async () => {
      const runner = new PipelineGuardRunner(allValid());
      const context = new PipelineContextManager();
      registerAllHandlers(runner);

      const execution = await runner.execute(context);

      expect(execution.status).toBe('completed');
      expect(execution.stages.get('brainstorm')?.status).toBe('completed');
      expect(execution.stages.get('generate-spec')?.status).toBe('completed');
      expect(execution.stages.get('validate-spec')?.status).toBe('completed');
      expect(execution.stages.get('write-plan')?.status).toBe('completed');
      expect(execution.stages.get('implement')?.status).toBe('completed');
      expect(execution.stages.get('verify')?.status).toBe('completed');
      expect(execution.stages.get('archive')?.status).toBe('completed');
    });

    it('阶段间的 context 正确传递', async () => {
      const runner = new PipelineGuardRunner(allValid());
      const context = new PipelineContextManager();

      let receivedBrainstormOutput: unknown;

      runner.registerHandler('brainstorm', async (ctx) => {
        ctx.set('metadata', { ...ctx.get('metadata'), brainstormOutput: '需求已收集' });
        return ctx;
      });
      runner.registerHandler('generate-spec', async (ctx) => {
        receivedBrainstormOutput = ctx.get('metadata').brainstormOutput;
        ctx.set('specPath', '.superspec/specs/test/spec.md');
        return ctx;
      });
      runner.registerHandler('validate-spec', async (ctx) => {
        ctx.set('validationReport', { valid: true, issues: [] });
        return ctx;
      });
      runner.registerHandler('write-plan', async (ctx) => {
        ctx.set('planPath', '.superspec/plans/test.md');
        return ctx;
      });
      runner.registerHandler('implement', async (ctx) => {
        ctx.set('metadata', { ...ctx.get('metadata'), implementCompleted: true });
        return ctx;
      });
      runner.registerHandler('verify', async (ctx) => {
        ctx.set('metadata', { ...ctx.get('metadata'), verifyPassed: true });
        return ctx;
      });
      runner.registerHandler('archive', async (ctx) => {
        ctx.set('metadata', { ...ctx.get('metadata'), archivePath: '.superspec/archive/test' });
        return ctx;
      });

      const execution = await runner.execute(context);
      expect(execution.status).toBe('completed');
      expect(receivedBrainstormOutput).toBe('需求已收集');
    });

    it('SkillGuard 检查通过时阶段正常执行无错误', async () => {
      const runner = new PipelineGuardRunner(allValid());
      const context = new PipelineContextManager();
      registerAllHandlers(runner);

      const execution = await runner.execute(context);

      expect(execution.status).toBe('completed');
      const brainstormResult = execution.stages.get('brainstorm');
      expect(brainstormResult?.status).toBe('completed');
      expect(brainstormResult?.error).toBeUndefined();
    });
  });

  describe('异常场景', () => {
    it('技能文件缺少红线表时阶段被拒绝', async () => {
      const runner = new PipelineGuardRunner(withInvalid('brainstorm'));
      const context = new PipelineContextManager();
      registerAllHandlers(runner);

      const execution = await runner.execute(context);

      expect(execution.status).toBe('failed');
      const brainstormResult = execution.stages.get('brainstorm');
      expect(brainstormResult?.status).toBe('failed');
      expect(brainstormResult?.error).toContain('红线表');
    });

    it('SkillGuard 检查失败时管道中断，后续阶段不执行', async () => {
      const runner = new PipelineGuardRunner(withInvalid('generate-spec'));
      const context = new PipelineContextManager();
      registerAllHandlers(runner);

      const execution = await runner.execute(context);

      // brainstorm 成功
      expect(execution.stages.get('brainstorm')?.status).toBe('completed');
      // generate-spec 失败（缺少红线表）
      expect(execution.stages.get('generate-spec')?.status).toBe('failed');
      expect(execution.stages.get('generate-spec')?.error).toContain('红线表');
      // 管道整体失败
      expect(execution.status).toBe('failed');
      // 后续阶段未执行
      expect(execution.stages.get('validate-spec')?.status).toBeUndefined();
    });
  });

  describe('边界条件', () => {
    it('从指定阶段开始执行，前置阶段标记为 skipped', async () => {
      const runner = new PipelineGuardRunner(allValid());
      const context = new PipelineContextManager({
        specPath: '.superspec/specs/test/spec.md',
        validationReport: { valid: true, issues: [] },
        retryCount: 0,
        metadata: {},
      });

      runner.registerHandler('write-plan', async (ctx) => {
        ctx.set('planPath', '.superspec/plans/test.md');
        return ctx;
      });
      runner.registerHandler('implement', async (ctx) => {
        ctx.set('metadata', { ...ctx.get('metadata'), implementCompleted: true });
        return ctx;
      });
      runner.registerHandler('verify', async (ctx) => {
        ctx.set('metadata', { ...ctx.get('metadata'), verifyPassed: true });
        return ctx;
      });
      runner.registerHandler('archive', async (ctx) => {
        ctx.set('metadata', { ...ctx.get('metadata'), archivePath: '.superspec/archive/test' });
        return ctx;
      });

      const execution = await runner.execute(context, { fromStage: 'validate-spec' });

      expect(execution.status).toBe('completed');
      expect(execution.stages.get('brainstorm')?.status).toBe('skipped');
      expect(execution.stages.get('generate-spec')?.status).toBe('skipped');
      expect(execution.stages.get('validate-spec')?.status).toBe('completed');
    });

    it('未注册 handler 的可选阶段自动跳过', async () => {
      const runner = new PipelineGuardRunner(allValid());
      const context = new PipelineContextManager();

      const execution = await runner.execute(context);
      expect(execution.stages.get('brainstorm')?.status).toBe('skipped');
    });
  });
});
