import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('端到端: init → validate', () => {
  let testDir: string;
  const superspecRoot = process.cwd();

  beforeEach(() => {
    testDir = join(tmpdir(), `superspec-e2e-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('init → 校验通过 完整流程', () => {
    // 执行 init
    execSync(`node ${join(superspecRoot, 'bin/superspec.js')} init`, { cwd: testDir });

    // 验证文件创建
    expect(existsSync(join(testDir, '.superspec/scripts/validate.js'))).toBe(true);
    expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(true);

    // 写入有效的 spec
    const specContent = `# 测试功能

## Purpose

用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围筛选，导出任务异步执行并通过系统通知告知用户完成状态。

## Requirements

### Requirement: 导出格式支持
系统 SHALL 支持 CSV 和 XLSX 两种导出格式。

#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件

#### Scenario: XLSX 导出
Given 用户在导出页面
When 选择 XLSX 格式
Then 生成 XLSX 文件

#### Scenario: 无效格式处理
Given 用户在导出页面
When 选择不支持的格式
Then 显示错误提示`;

    const specDir = join(testDir, '.superspec/specs/test');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(join(specDir, 'spec.md'), specContent);

    // 执行校验
    const result = execSync(
      `node ${join(testDir, '.superspec/scripts/validate.js')} ${join(specDir, 'spec.md')}`,
      { encoding: 'utf-8' }
    );
    const report = JSON.parse(result);
    expect(report.valid).toBe(true);
  });

  it('init → 校验失败 → 修正 → 通过 完整流程', () => {
    // 执行 init
    execSync(`node ${join(superspecRoot, 'bin/superspec.js')} init`, { cwd: testDir });

    // 写入无效 spec（Purpose 太短）
    const invalidSpec = `# 测试

## Purpose

太短了。

## Requirements

### Requirement: 导出格式支持
系统 SHALL 支持 CSV 和 XLSX 两种导出格式。

#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件

#### Scenario: XLSX 导出
Given 用户在导出页面
When 选择 XLSX 格式
Then 生成 XLSX 文件`;

    const specDir = join(testDir, '.superspec/specs/test');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(join(specDir, 'spec.md'), invalidSpec);

    // 校验失败
    try {
      execSync(
        `node ${join(testDir, '.superspec/scripts/validate.js')} ${join(specDir, 'spec.md')}`,
        { encoding: 'utf-8' }
      );
      expect.fail('应该抛出异常');
    } catch (err: any) {
      const report = JSON.parse(err.stdout);
      expect(report.valid).toBe(false);
    }

    // 修正 spec
    const validSpec = `# 测试功能

## Purpose

用户需要能够将系统中的数据批量导出为 CSV 和 Excel 格式，支持按时间范围筛选，导出任务异步执行并通过系统通知告知用户完成状态。

## Requirements

### Requirement: 导出格式支持
系统 SHALL 支持 CSV 和 XLSX 两种导出格式。

#### Scenario: CSV 导出
Given 用户在导出页面
When 选择 CSV 格式
Then 生成 CSV 文件

#### Scenario: XLSX 导出
Given 用户在导出页面
When 选择 XLSX 格式
Then 生成 XLSX 文件

#### Scenario: 无效格式处理
Given 用户在导出页面
When 选择不支持的格式
Then 显示错误提示`;

    writeFileSync(join(specDir, 'spec.md'), validSpec);

    // 校验通过
    const result = execSync(
      `node ${join(testDir, '.superspec/scripts/validate.js')} ${join(specDir, 'spec.md')}`,
      { encoding: 'utf-8' }
    );
    const report = JSON.parse(result);
    expect(report.valid).toBe(true);
  });
});
