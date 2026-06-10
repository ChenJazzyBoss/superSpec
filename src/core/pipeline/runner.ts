/**
 * 技能协作管道 - 运行时管理器
 * @module pipeline/runner
 *
 * 将 PipelineExecutor 与 CLI 集成，提供持久化执行记录、
 * 自动化阶段处理和跨 CLI 调用的状态恢复。
 *
 * 设计原则：
 * - 可程序化阶段（validate-spec, archive）自动执行
 * - AI 阶段（brainstorm, generate-spec 等）输出操作指引，等待 AI 完成后恢复
 * - 执行记录持久化到 .superspec/pipeline/<exec-id>.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { PipelineExecutor, type StageHandler } from './executor.js';
import { PipelineContextManager } from './context.js';
import { DEFAULT_WORKFLOW } from './workflow.js';
import type { StageId, PipelineExecution, PipelineContext } from './types.js';

/** 执行记录在磁盘上的序列化格式 */
interface ExecutionRecord {
  id: string;
  specName: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  stages: Array<{
    id: StageId;
    status: string;
    duration: number;
    error?: string;
    context?: PipelineContext;
  }>;
}

/** AI 阶段的操作指引 */
interface StageGuidance {
  stageId: StageId;
  skillName: string;
  description: string;
  nextCommand: string;
}

/** 需要外部处理的 AI 阶段列表 */
const AI_STAGES: StageId[] = ['brainstorm', 'generate-spec', 'write-plan', 'implement', 'verify'];

/** AI 阶段对应的操作指引信息 */
const STAGE_GUIDANCE_MAP: Record<StageId, StageGuidance> = {
  brainstorm: {
    stageId: 'brainstorm',
    skillName: 'brainstorm',
    description: '需求收集阶段 — 通过提问收集用户需求，评估复杂度，路由到合适的路径',
    nextCommand: '完成需求收集后，使用 /generate-spec 生成 spec',
  },
  'generate-spec': {
    stageId: 'generate-spec',
    skillName: 'generate-spec',
    description: '生成 Spec 阶段 — 基于需求生成结构化 spec 文件',
    nextCommand: 'spec 生成后，运行 superspec pipeline run <name> --from validate-spec 继续管道',
  },
  'write-plan': {
    stageId: 'write-plan',
    skillName: 'write-plan',
    description: '生成实施计划 — 将 spec 分解为可执行的任务列表',
    nextCommand: '计划生成后，运行 superspec pipeline run <name> --from implement 继续管道',
  },
  implement: {
    stageId: 'implement',
    skillName: 'tdd 或 subagent-dev',
    description: '实施阶段 — 按计划编写代码，遵循 TDD 或子代理开发流程',
    nextCommand: '实现完成后，运行 superspec pipeline run <name> --from verify 继续管道',
  },
  verify: {
    stageId: 'verify',
    skillName: 'verify',
    description: '验证阶段 — 运行所有测试，确认实现符合 spec',
    nextCommand: '验证通过后，运行 superspec pipeline run <name> --from archive 继续管道',
  },
  'validate-spec': {
    stageId: 'validate-spec',
    skillName: '',
    description: '',
    nextCommand: '',
  },
  archive: {
    stageId: 'archive',
    skillName: '',
    description: '',
    nextCommand: '',
  },
  debug: {
    stageId: 'debug',
    skillName: 'debug',
    description: '排障阶段',
    nextCommand: '',
  },
  'generate-test': {
    stageId: 'generate-test',
    skillName: 'generate-test',
    description: '测试代码生成',
    nextCommand: '',
  },
};

/**
 * PipelineRunner
 *
 * 将 PipelineExecutor 包装为 CLI 可用的运行时管理器：
 * 1. 持久化执行记录到 .superspec/pipeline/
 * 2. 为可程序化阶段注册自动 handler
 * 3. AI 阶段输出操作指引
 * 4. 支持状态查询和历史记录
 */
export class PipelineRunner {
  private projectRoot: string;
  private pipelineDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.pipelineDir = join(projectRoot, '.superspec', 'pipeline');
  }

  /** 确保 .superspec/pipeline/ 目录存在 */
  private ensurePipelineDir(): void {
    if (!existsSync(this.pipelineDir)) {
      mkdirSync(this.pipelineDir, { recursive: true });
    }
  }

  /** 生成执行 id */
  private generateExecId(specName: string): string {
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return `${specName}-${ts}`;
  }

  /** 执行记录文件路径 */
  private recordPath(execId: string): string {
    return join(this.pipelineDir, `${execId}.json`);
  }

  /** 持久化执行记录到磁盘 */
  private saveRecord(record: ExecutionRecord): void {
    this.ensurePipelineDir();
    writeFileSync(this.recordPath(record.id), JSON.stringify(record, null, 2), 'utf-8');
  }

  /** 从磁盘读取执行记录 */
  private loadRecord(execId: string): ExecutionRecord | null {
    const path = this.recordPath(execId);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8')) as ExecutionRecord;
  }

  /** 将 PipelineExecution 转为可序列化的 ExecutionRecord */
  private executionToRecord(exec: PipelineExecution, specName: string): ExecutionRecord {
    return {
      id: this.generateExecId(specName),
      specName,
      status: exec.status,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt,
      stages: Array.from(exec.stages.entries()).map(([id, result]) => ({
        id,
        status: result.status,
        duration: result.duration,
        error: result.error,
        context: result.context,
      })),
    };
  }

  /**
   * 注册可程序化阶段的自动 handler
   */
  private registerAutoHandlers(executor: PipelineExecutor, projectRoot: string): void {
    // validate-spec: 自动调用 Validator
    executor.registerHandler('validate-spec', async (context) => {
      const specPath = context.get('specPath');
      if (!specPath || !existsSync(specPath)) {
        throw new Error(`spec 文件不存在: ${specPath}`);
      }

      const { Validator } = await import('../validator.js');
      const specName = context.get('specName') ?? 'unknown';
      const validator = new Validator();
      const report = await validator.validateSpec(specPath, specName);
      context.set('validationReport', {
        valid: report.valid,
        issues: report.issues,
      });

      return context;
    });

    // archive: 自动调用 archiveChange
    executor.registerHandler('archive', async (context) => {
      const { archiveChange } = await import('../archive.js');
      const specName = context.get('specName') ?? 'unknown';
      const result = await archiveChange(projectRoot, specName);
      context.set('metadata', {
        ...context.get('metadata'),
        archivePath: result.archivePath,
      });

      return context;
    });
  }

  /**
   * 运行管道
   *
   * @param specName - spec 名称
   * @param options.fromStage - 从指定阶段开始
   * @returns 执行记录
   */
  async run(
    specName: string,
    options?: { fromStage?: StageId },
  ): Promise<ExecutionRecord> {
    const specPath = join(this.projectRoot, '.superspec', 'specs', specName, 'spec.md');

    if (!existsSync(specPath)) {
      throw new Error(`spec 文件不存在: ${specPath}`);
    }

    const executor = new PipelineExecutor();
    this.registerAutoHandlers(executor, this.projectRoot);

    // 构建初始上下文
    const initialContext: Partial<PipelineContext> = {
      specPath,
      specName,
      retryCount: 0,
      metadata: {},
    };

    // 如果从 validate-spec 或之后开始，需要设置 brainstormOutput
    // 因为 generate-spec 依赖它，但 run 是从已有 spec 开始的
    if (options?.fromStage && options.fromStage !== 'brainstorm') {
      initialContext.metadata = { brainstormOutput: '从已有 spec 开始运行' };
    }

    const context = new PipelineContextManager(initialContext);

    // 执行管道，但在 AI 阶段暂停
    const fromStage = options?.fromStage ?? 'validate-spec';
    const execution = await executor.execute(context, { fromStage });

    // 转为持久化记录
    const record = this.executionToRecord(execution, specName);

    // 检查是否有 AI 阶段需要暂停
    const lastCompletedStage = this.findLastCompletedStage(record);
    if (lastCompletedStage && AI_STAGES.includes(lastCompletedStage.id)) {
      // AI 阶段不应该自动完成，这里标记为 pending
      // 但如果 executor 确实完成了它（因为有 handler），就正常保存
    }

    this.saveRecord(record);
    return record;
  }

  /**
   * 查找最后一个完成的阶段
   */
  private findLastCompletedStage(record: ExecutionRecord): { id: StageId } | null {
    for (let i = record.stages.length - 1; i >= 0; i--) {
      if (record.stages[i].status === 'completed') {
        return { id: record.stages[i].id };
      }
    }
    return null;
  }

  /**
   * 查看执行状态
   *
   * @param specName - spec 名称（可选，用于查找最近的执行）
   * @param execId - 执行 id（可选，精确查找）
   * @returns 执行记录或 null
   */
  getStatus(specName?: string, execId?: string): ExecutionRecord | null {
    if (execId) {
      return this.loadRecord(execId);
    }

    // 查找最近的执行记录
    if (!existsSync(this.pipelineDir)) return null;

    const files = readdirSync(this.pipelineDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    if (specName) {
      // 找匹配 spec 名称的最新记录
      for (const file of files) {
        const record = JSON.parse(readFileSync(join(this.pipelineDir, file), 'utf-8')) as ExecutionRecord;
        if (record.specName === specName) {
          return record;
        }
      }
      return null;
    }

    // 返回最新的记录
    if (files.length === 0) return null;
    return JSON.parse(readFileSync(join(this.pipelineDir, files[0]), 'utf-8')) as ExecutionRecord;
  }

  /**
   * 列出所有执行记录
   */
  listExecutions(): ExecutionRecord[] {
    if (!existsSync(this.pipelineDir)) return [];

    const files = readdirSync(this.pipelineDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    return files.map((file) => {
      return JSON.parse(readFileSync(join(this.pipelineDir, file), 'utf-8')) as ExecutionRecord;
    });
  }

  /**
   * 恢复中断的执行
   *
   * @param execId - 执行 id
   * @returns 新的执行记录
   */
  async resume(execId: string): Promise<ExecutionRecord> {
    const record = this.loadRecord(execId);
    if (!record) {
      throw new Error(`执行记录不存在: ${execId}`);
    }

    if (record.status === 'completed') {
      throw new Error('管道已完成，无需恢复');
    }

    // 找到第一个失败的阶段
    const failedStageIdx = record.stages.findIndex((s) => s.status === 'failed');
    if (failedStageIdx === -1) {
      throw new Error('没有找到失败的阶段');
    }

    const failedStage = record.stages[failedStageIdx];

    // 从失败阶段重新开始执行
    return this.run(record.specName, { fromStage: failedStage.id });
  }

  /**
   * 获取 AI 阶段的操作指引
   */
  getStageGuidance(stageId: StageId): StageGuidance | null {
    const guidance = STAGE_GUIDANCE_MAP[stageId];
    if (!guidance || !guidance.skillName) return null;
    return guidance;
  }
}

/**
 * 获取 AI 阶段的操作指引映射（导出供 CLI 使用）
 */
export function getStageGuidanceMap(): Record<StageId, StageGuidance> {
  return { ...STAGE_GUIDANCE_MAP };
}

/**
 * 格式化执行记录为可读输出
 */
export function formatExecutionStatus(record: ExecutionRecord): string {
  const lines: string[] = [];

  const statusIcon: Record<string, string> = {
    completed: '✅',
    failed: '❌',
    running: '🔄',
    pending: '⏳',
    skipped: '⏭️',
  };

  lines.push(`📋 管道执行: ${record.id}`);
  lines.push(`   Spec: ${record.specName}`);
  lines.push(`   状态: ${statusIcon[record.status] ?? ''} ${record.status}`);
  lines.push(`   开始: ${record.startedAt}`);
  if (record.completedAt) {
    lines.push(`   完成: ${record.completedAt}`);
  }
  lines.push('');
  lines.push('  阶段:');
  lines.push('  ──────────────────────────────────────────────');

  for (const stage of record.stages) {
    const icon = statusIcon[stage.status] ?? '?';
    const duration = stage.status === 'skipped' ? '' : ` (${stage.duration}ms)`;
    const error = stage.error ? ` — ${stage.error}` : '';
    lines.push(`  ${icon} ${stage.id.padEnd(16)} ${stage.status.padEnd(10)}${duration}${error}`);
  }

  return lines.join('\n');
}

/**
 * 格式化执行列表概要
 */
export function formatExecutionList(records: ExecutionRecord[]): string {
  if (records.length === 0) {
    return '暂无管道执行记录。';
  }

  const lines: string[] = [];
  const statusIcon: Record<string, string> = {
    completed: '✅',
    failed: '❌',
    running: '🔄',
  };

  lines.push(`管道执行记录 (${records.length}):\n`);

  for (const record of records) {
    const icon = statusIcon[record.status] ?? '❓';
    const completedCount = record.stages.filter((s) => s.status === 'completed').length;
    const totalCount = DEFAULT_WORKFLOW.length;
    lines.push(`  ${icon} ${record.id}`);
    lines.push(`    Spec: ${record.specName} | 进度: ${completedCount}/${totalCount} | 开始: ${record.startedAt.slice(0, 19)}`);
    lines.push('');
  }

  return lines.join('\n');
}
