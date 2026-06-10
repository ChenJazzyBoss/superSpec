import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const CLI = 'node bin/superspec.js';
const TEST_ROOT = join(process.cwd(), '.test-change-cli');

describe('E2E: change commands', () => {
  describe('superspec change create', () => {
    it('should create change directory', () => {
      const output = execSync(
        `${CLI} change create test-cli-change --why "测试" --what "测试变更"`,
        { encoding: 'utf-8', env: { ...process.env } }
      );
      expect(output).toContain('变更目录已创建');

      // 验证目录结构
      const changeDir = join('.superspec', 'changes', 'test-cli-change');
      expect(existsSync(changeDir)).toBe(true);
      expect(existsSync(join(changeDir, 'proposal.md'))).toBe(true);
      expect(existsSync(join(changeDir, 'specs'))).toBe(true);

      // 清理
      rmSync(join('.superspec', 'changes', 'test-cli-change'), { recursive: true, force: true });
    });

    it('should reject duplicate change name', () => {
      execSync(
        `${CLI} change create dup-change --why "测试"`,
        { encoding: 'utf-8' }
      );

      try {
        execSync(
          `${CLI} change create dup-change --why "测试"`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.stderr).toContain('已存在');
      }

      // 清理
      rmSync(join('.superspec', 'changes', 'dup-change'), { recursive: true, force: true });
    });
  });

  describe('superspec change status', () => {
    it('should show change status', () => {
      execSync(
        `${CLI} change create status-test --why "状态测试"`,
        { encoding: 'utf-8' }
      );

      const output = execSync(
        `${CLI} change status status-test`,
        { encoding: 'utf-8' }
      );
      expect(output).toContain('status-test');
      expect(output).toContain('proposal');

      // 清理
      rmSync(join('.superspec', 'changes', 'status-test'), { recursive: true, force: true });
    });

    it('should report non-existent change', () => {
      try {
        execSync(
          `${CLI} change status nonexistent`,
          { encoding: 'utf-8', stdio: 'pipe' }
        );
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.stderr).toContain('不存在');
      }
    });
  });

  describe('superspec change list', () => {
    it('should list changes', () => {
      execSync(
        `${CLI} change create list-test-a --why "测试A"`,
        { encoding: 'utf-8' }
      );
      execSync(
        `${CLI} change create list-test-b --why "测试B"`,
        { encoding: 'utf-8' }
      );

      const output = execSync(
        `${CLI} change list`,
        { encoding: 'utf-8' }
      );
      expect(output).toContain('list-test-a');
      expect(output).toContain('list-test-b');

      // 清理
      rmSync(join('.superspec', 'changes', 'list-test-a'), { recursive: true, force: true });
      rmSync(join('.superspec', 'changes', 'list-test-b'), { recursive: true, force: true });
    });

    it('should show empty message when no changes', () => {
      const output = execSync(
        `${CLI} change list`,
        { encoding: 'utf-8' }
      );
      // 如果没有变更目录，应显示提示
      expect(output).toContain('暂无');
    });
  });

  describe('superspec change apply --dry-run', () => {
    it('should dry-run apply delta specs', () => {
      // 创建变更
      execSync(
        `${CLI} change create apply-test --why "应用测试"`,
        { encoding: 'utf-8' }
      );

      // 手动添加 delta spec
      const changeDir = join('.superspec', 'changes', 'apply-test');
      const specDir = join(changeDir, 'specs', 'test-cap');
      mkdirSync(specDir, { recursive: true });
      writeFileSync(join(specDir, 'spec.md'), [
        '## ADDED Requirements',
        '',
        '### Requirement: Test Feature',
        'System SHALL do something.',
        '',
        '#### Scenario: Normal flow',
        '- **WHEN** something happens',
        '- **THEN** something occurs',
      ].join('\n'), 'utf-8');

      const output = execSync(
        `${CLI} change apply apply-test --dry-run`,
        { encoding: 'utf-8' }
      );
      expect(output).toContain('dry-run');
      expect(output).toContain('test-cap');

      // 确认没有实际写入主 spec
      expect(existsSync(join('.superspec', 'specs', 'test-cap', 'spec.md'))).toBe(false);

      // 清理
      rmSync(join('.superspec', 'changes', 'apply-test'), { recursive: true, force: true });
    });
  });
});
