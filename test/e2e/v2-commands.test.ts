import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const superspecRoot = process.cwd();
const CLI = join(superspecRoot, 'bin/superspec.js');

/** 有效的 spec 内容 */
const VALID_SPEC = `# 批量导出

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
Then 显示错误提示
`;

/** 初始化测试环境并写入 spec */
function setupWithSpec(testDir: string, specName = 'batch-export') {
  execSync(`node ${CLI} init`, { cwd: testDir });
  const specDir = join(testDir, '.superspec', 'specs', specName);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'spec.md'), VALID_SPEC);
  return specDir;
}

describe('端到端: v2 命令', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `superspec-e2e-v2-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('update 命令', () => {
    it('从文件读取 Delta JSON 并更新 spec', () => {
      setupWithSpec(testDir);

      // 创建 Delta JSON：新增一个 requirement
      const delta = {
        specName: 'batch-export',
        changes: [
          {
            type: 'ADDED',
            section: 'requirement',
            target: '批量处理',
            content: '系统 SHALL 支持批量处理多个导出任务。'
          },
          {
            type: 'ADDED',
            section: 'scenario',
            target: '批量提交',
            parent: '批量处理',
            content: 'Given 用户有多个导出任务\nWhen 批量提交\nThen 所有任务开始执行'
          },
          {
            type: 'ADDED',
            section: 'scenario',
            target: '批量取消',
            parent: '批量处理',
            content: 'Given 用户有进行中的批量任务\nWhen 批量取消\nThen 所有任务被取消'
          }
        ]
      };

      const deltaPath = join(testDir, 'delta.json');
      writeFileSync(deltaPath, JSON.stringify(delta, null, 2));

      // 执行 update
      const result = execSync(
        `node ${CLI} update batch-export --file ${deltaPath}`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      expect(result).toContain('已更新');
      expect(result).toContain('需求');

      // 验证 spec 文件被更新
      const specPath = join(testDir, '.superspec', 'specs', 'batch-export', 'spec.md');
      const updated = readFileSync(specPath, 'utf-8');
      expect(updated).toContain('批量处理');
    });

    it('Delta 格式错误时报错', () => {
      setupWithSpec(testDir);

      const deltaPath = join(testDir, 'bad-delta.json');
      writeFileSync(deltaPath, JSON.stringify({ invalid: true }));

      try {
        execSync(
          `node ${CLI} update batch-export --file ${deltaPath}`,
          { cwd: testDir, encoding: 'utf-8' }
        );
        expect.fail('应该抛出异常');
      } catch (err: any) {
        expect(err.status).not.toBe(0);
      }
    });
  });

  describe('generate 命令', () => {
    it('生成 TypeScript 测试代码', () => {
      setupWithSpec(testDir);

      const result = execSync(
        `node ${CLI} generate batch-export --lang typescript`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      expect(result).toContain("import { describe, it, expect } from 'vitest'");
      expect(result).toContain("describe(");
      expect(result).toContain("it(");
    });

    it('生成 Python 测试代码', () => {
      setupWithSpec(testDir);

      const result = execSync(
        `node ${CLI} generate batch-export --lang python`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      expect(result).toContain('import pytest');
      expect(result).toContain('class Test');
      expect(result).toContain('def test_');
    });

    it('生成代码并写入文件', () => {
      setupWithSpec(testDir);

      const outputPath = join(testDir, 'test', 'batch-export.test.ts');
      execSync(
        `node ${CLI} generate batch-export --lang typescript --output ${outputPath}`,
        { cwd: testDir }
      );

      expect(existsSync(outputPath)).toBe(true);
      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain("import { describe, it, expect } from 'vitest'");
    });

    it('不支持的语言报错', () => {
      setupWithSpec(testDir);

      try {
        execSync(
          `node ${CLI} generate batch-export --lang rust`,
          { cwd: testDir, encoding: 'utf-8' }
        );
        expect.fail('应该抛出异常');
      } catch (err: any) {
        expect(err.status).not.toBe(0);
      }
    });
  });

  describe('ci 命令', () => {
    it('校验所有 spec 并输出结果', () => {
      setupWithSpec(testDir, 'spec-a');
      setupWithSpec(testDir, 'spec-b');

      const result = execSync(
        `node ${CLI} ci`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      expect(result).toContain('spec-a');
      expect(result).toContain('spec-b');
    });

    it('校验失败时退出码为 1', () => {
      execSync(`node ${CLI} init`, { cwd: testDir });

      // 写入无效 spec
      const specDir = join(testDir, '.superspec', 'specs', 'bad-spec');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(join(specDir, 'spec.md'), '# Bad\n\n## Purpose\n\n太短。\n');

      try {
        execSync(`node ${CLI} ci`, { cwd: testDir, encoding: 'utf-8' });
        expect.fail('应该抛出异常');
      } catch (err: any) {
        expect(err.status).toBe(1);
      }
    });

    it('支持 JSON 输出', () => {
      setupWithSpec(testDir);

      const result = execSync(
        `node ${CLI} ci --json`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      const json = JSON.parse(result);
      expect(json).toHaveProperty('total');
      expect(json).toHaveProperty('valid');
    });
  });

  describe('history 命令', () => {
    it('无快照时输出提示', () => {
      setupWithSpec(testDir);

      const result = execSync(
        `node ${CLI} history batch-export`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      expect(result).toContain('暂无历史版本');
    });
  });

  describe('uninstall 命令', () => {
    it('移除 superSpec 文件', () => {
      setupWithSpec(testDir);

      // 确认 .superspec 存在
      expect(existsSync(join(testDir, '.superspec'))).toBe(true);

      // 执行 uninstall（跳过确认）
      execSync(`node ${CLI} uninstall -y`, { cwd: testDir });

      // 验证 .superspec 被移除
      expect(existsSync(join(testDir, '.superspec'))).toBe(false);
    });
  });
});
