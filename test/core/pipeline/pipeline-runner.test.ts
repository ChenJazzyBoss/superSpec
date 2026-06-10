import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  PipelineRunner,
  formatExecutionStatus,
  formatExecutionList,
  getStageGuidanceMap,
} from '../../../src/core/pipeline/runner.js';
import type { ExecutionRecord } from '../../../src/core/pipeline/runner.js';

describe('PipelineRunner', () => {
  let testDir: string;
  let runner: PipelineRunner;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'superspec-runner-'));
    runner = new PipelineRunner(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  /** 创建一个合法的 spec 文件用于测试 */
  function createTestSpec(name: string): string {
    const specDir = join(testDir, '.superspec', 'specs', name);
    const specPath = join(specDir, 'spec.md');

    if (!existsSync(specDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(specDir, { recursive: true });
    }

    const content = `# ${name}

## Purpose

This is a test spec for pipeline runner validation. It should be long enough to pass the 50 character minimum requirement for the purpose field.

## Requirements

### Requirement: Basic Feature
The system SHALL provide basic functionality for testing pipeline execution.

#### Scenario: Normal operation
Given the system is running
When user performs an action
Then the system responds correctly

#### Scenario: Error handling
Given the system is running
When an error occurs
Then the system handles it gracefully
`;

    writeFileSync(specPath, content, 'utf-8');
    return specPath;
  }

  describe('run', () => {
    it('should create execution record when spec exists', async () => {
      createTestSpec('test-spec');

      const record = await runner.run('test-spec');

      expect(record.id).toContain('test-spec');
      expect(record.specName).toBe('test-spec');
      expect(record.status).toBeDefined();
      expect(record.startedAt).toBeDefined();
      expect(record.stages.length).toBeGreaterThan(0);

      // 持久化文件应存在
      const pipelineDir = join(testDir, '.superspec', 'pipeline');
      expect(existsSync(pipelineDir)).toBe(true);
    });

    it('should throw error when spec does not exist', async () => {
      await expect(runner.run('nonexistent')).rejects.toThrow('spec 文件不存在');
    });

    it('should auto-execute validate-spec stage', async () => {
      createTestSpec('validate-test');

      const record = await runner.run('validate-test');

      const validateStage = record.stages.find((s) => s.id === 'validate-spec');
      expect(validateStage).toBeDefined();
      // validate-spec 应该完成（spec 合法）或失败（如果 spec 格式问题）
      expect(['completed', 'failed']).toContain(validateStage!.status);
    });

    it('should save execution record to disk', async () => {
      createTestSpec('persist-test');

      const record = await runner.run('persist-test');

      const recordPath = join(testDir, '.superspec', 'pipeline', `${record.id}.json`);
      expect(existsSync(recordPath)).toBe(true);

      const saved = JSON.parse(readFileSync(recordPath, 'utf-8'));
      expect(saved.id).toBe(record.id);
      expect(saved.specName).toBe('persist-test');
    });

    it('should run from specified stage', async () => {
      createTestSpec('from-stage-test');

      const record = await runner.run('from-stage-test', { fromStage: 'validate-spec' });

      // validate-spec 之前的阶段应被 skipped
      const brainstormStage = record.stages.find((s) => s.id === 'brainstorm');
      expect(brainstormStage?.status).toBe('skipped');

      const validateStage = record.stages.find((s) => s.id === 'validate-spec');
      expect(validateStage).toBeDefined();
      expect(validateStage!.status).not.toBe('skipped');
    });
  });

  describe('getStatus', () => {
    it('should return null when no executions exist', () => {
      expect(runner.getStatus()).toBeNull();
      expect(runner.getStatus('test-spec')).toBeNull();
    });

    it('should return latest execution by spec name', async () => {
      createTestSpec('status-test');

      const record = await runner.run('status-test');
      const found = runner.getStatus('status-test');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(record.id);
    });

    it('should return execution by exec id', async () => {
      createTestSpec('exec-id-test');

      const record = await runner.run('exec-id-test');
      const found = runner.getStatus(undefined, record.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(record.id);
    });
  });

  describe('listExecutions', () => {
    it('should return empty array when no executions', () => {
      expect(runner.listExecutions()).toEqual([]);
    });

    it('should list all executions sorted by time desc', async () => {
      createTestSpec('list-test-1');
      createTestSpec('list-test-2');

      await runner.run('list-test-1');
      await runner.run('list-test-2');

      const list = runner.listExecutions();
      expect(list.length).toBe(2);
      // 最新的在前
      expect(list[0].specName).toBe('list-test-2');
      expect(list[1].specName).toBe('list-test-1');
    });
  });

  describe('resume', () => {
    it('should throw error when execution not found', async () => {
      await expect(runner.resume('nonexistent-id')).rejects.toThrow('执行记录不存在');
    });

    it('should throw error when pipeline already completed', async () => {
      createTestSpec('resume-test');

      const record = await runner.run('resume-test');

      // 手动标记为 completed
      record.status = 'completed';
      writeFileSync(
        join(testDir, '.superspec', 'pipeline', `${record.id}.json`),
        JSON.stringify(record, null, 2),
        'utf-8',
      );

      await expect(runner.resume(record.id)).rejects.toThrow('已完成');
    });
  });

  describe('getStageGuidance', () => {
    it('should return guidance for AI stages', () => {
      const guidanceMap = getStageGuidanceMap();

      expect(guidanceMap['brainstorm'].skillName).toBe('brainstorm');
      expect(guidanceMap['generate-spec'].skillName).toBe('generate-spec');
      expect(guidanceMap['write-plan'].skillName).toBe('write-plan');
      expect(guidanceMap['implement'].skillName).toBe('tdd 或 subagent-dev');
      expect(guidanceMap['verify'].skillName).toBe('verify');
    });

    it('should return empty guidance for auto stages', () => {
      const guidanceMap = getStageGuidanceMap();

      expect(guidanceMap['validate-spec'].skillName).toBe('');
      expect(guidanceMap['archive'].skillName).toBe('');
    });
  });
});

describe('formatExecutionStatus', () => {
  it('should format completed execution', () => {
    const record: ExecutionRecord = {
      id: 'test-20260610',
      specName: 'batch-export',
      status: 'completed',
      startedAt: '2026-06-10T10:00:00.000Z',
      completedAt: '2026-06-10T10:05:00.000Z',
      stages: [
        { id: 'brainstorm', status: 'skipped', duration: 0 },
        { id: 'validate-spec', status: 'completed', duration: 150 },
        { id: 'write-plan', status: 'pending', duration: 0 },
      ],
    };

    const output = formatExecutionStatus(record);
    expect(output).toContain('test-20260610');
    expect(output).toContain('batch-export');
    expect(output).toContain('completed');
    expect(output).toContain('validate-spec');
  });

  it('should format failed execution with error', () => {
    const record: ExecutionRecord = {
      id: 'test-failed',
      specName: 'broken-spec',
      status: 'failed',
      startedAt: '2026-06-10T10:00:00.000Z',
      stages: [
        { id: 'validate-spec', status: 'failed', duration: 50, error: 'spec 校验未通过' },
      ],
    };

    const output = formatExecutionStatus(record);
    expect(output).toContain('failed');
    expect(output).toContain('spec 校验未通过');
  });
});

describe('formatExecutionList', () => {
  it('should format empty list', () => {
    expect(formatExecutionList([])).toContain('暂无');
  });

  it('should format execution list', () => {
    const records: ExecutionRecord[] = [
      {
        id: 'test-1',
        specName: 'spec-a',
        status: 'completed',
        startedAt: '2026-06-10T10:00:00.000Z',
        stages: [
          { id: 'validate-spec', status: 'completed', duration: 100 },
          { id: 'write-plan', status: 'completed', duration: 200 },
        ],
      },
      {
        id: 'test-2',
        specName: 'spec-b',
        status: 'failed',
        startedAt: '2026-06-10T11:00:00.000Z',
        stages: [
          { id: 'validate-spec', status: 'failed', duration: 50, error: '校验失败' },
        ],
      },
    ];

    const output = formatExecutionList(records);
    expect(output).toContain('test-1');
    expect(output).toContain('test-2');
    expect(output).toContain('spec-a');
    expect(output).toContain('spec-b');
    expect(output).toContain('2/7'); // completedCount/totalCount
  });
});
