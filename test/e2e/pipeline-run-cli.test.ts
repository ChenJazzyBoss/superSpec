import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = `node "${join(process.cwd(), 'bin/superspec.js')}"`;

describe('E2E: pipeline run/status/list/resume', () => {
  let testDir: string;
  const specName = 'pipeline-e2e-test';
  const specContent = `# Pipeline E2E Test Spec

## Purpose

This is a test spec for pipeline run E2E testing. It needs to be at least 50 chars long for validation.

## Requirements

### Requirement: Test Feature
The system SHALL provide test functionality for pipeline execution validation.

#### Scenario: Normal flow
Given the system is running
When user performs an action
Then the system responds correctly

#### Scenario: Error handling
Given the system is running
When an error occurs
Then the system handles it gracefully
`;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'superspec-e2e-'));
    const specDir = join(testDir, '.superspec', 'specs', specName);
    mkdirSync(specDir, { recursive: true });
    writeFileSync(join(specDir, 'spec.md'), specContent, 'utf-8');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should run pipeline and create execution record', () => {
    const output = execSync(`${CLI} pipeline run ${specName}`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    expect(output).toContain(specName);
    expect(output).toContain('validate-spec');

    // 执行记录文件应存在
    const pipelineDir = join(testDir, '.superspec', 'pipeline');
    expect(existsSync(pipelineDir)).toBe(true);
  });

  it('should show pipeline status', () => {
    // 先运行一次
    execSync(`${CLI} pipeline run ${specName}`, { cwd: testDir });

    // 再查看状态
    const output = execSync(`${CLI} pipeline status ${specName}`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    expect(output).toContain(specName);
    expect(output).toContain('validate-spec');
  });

  it('should list all executions', () => {
    // 运行一次
    execSync(`${CLI} pipeline run ${specName}`, { cwd: testDir });

    const output = execSync(`${CLI} pipeline list`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    expect(output).toContain(specName);
    expect(output).toContain('执行记录');
  });

  it('should show error when spec does not exist', () => {
    let errorMsg = '';
    try {
      execSync(`${CLI} pipeline run nonexistent`, { cwd: testDir, encoding: 'utf-8' });
    } catch (err: any) {
      errorMsg = err.stdout || err.stderr || '';
    }

    expect(errorMsg).toContain('错误');
  });

  it('should show no executions message when empty', () => {
    const output = execSync(`${CLI} pipeline list`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    expect(output).toContain('暂无');
  });

  it('should show no record found when status with no executions', () => {
    const output = execSync(`${CLI} pipeline status nonexistent`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    expect(output).toContain('未找到');
  });

  it('should run from specified stage', () => {
    const output = execSync(`${CLI} pipeline run ${specName} --from validate-spec`, {
      encoding: 'utf-8',
      cwd: testDir,
    });

    expect(output).toContain(specName);
    expect(output).toContain('skipped');
  });
});
