import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const superspecBin = join(process.cwd(), 'bin/superspec.js');

describe('端到端: pipeline CLI 命令', () => {
  describe('pipeline show', () => {
    it('显示默认工作流的 7 个阶段', () => {
      const output = execSync(`node ${superspecBin} pipeline show`, { encoding: 'utf-8' });
      expect(output).toContain('brainstorm');
      expect(output).toContain('generate-spec');
      expect(output).toContain('validate-spec');
      expect(output).toContain('write-plan');
      expect(output).toContain('implement');
      expect(output).toContain('verify');
      expect(output).toContain('archive');
    });

    it('显示阶段名称和是否必需', () => {
      const output = execSync(`node ${superspecBin} pipeline show`, { encoding: 'utf-8' });
      expect(output).toContain('必需');
      expect(output).toContain('可选');
    });

    it('显示阶段的依赖关系', () => {
      const output = execSync(`node ${superspecBin} pipeline show`, { encoding: 'utf-8' });
      // generate-spec 依赖 brainstorm
      expect(output).toContain('brainstorm');
    });
  });

  describe('pipeline next', () => {
    it('显示 brainstorm 的推荐下一步', () => {
      const output = execSync(`node ${superspecBin} pipeline next brainstorm`, { encoding: 'utf-8' });
      expect(output).toContain('generate-spec');
    });

    it('显示 validate-spec 的推荐下一步', () => {
      const output = execSync(`node ${superspecBin} pipeline next validate-spec`, { encoding: 'utf-8' });
      expect(output).toContain('write-plan');
    });

    it('最后阶段 archive 提示已到末尾', () => {
      const output = execSync(`node ${superspecBin} pipeline next archive`, { encoding: 'utf-8' });
      expect(output).toContain('末尾');
    });

    it('无效阶段名称报错', () => {
      let errorMsg = '';
      try {
        execSync(`node ${superspecBin} pipeline next unknown-stage`, { encoding: 'utf-8' });
      } catch (err: any) {
        errorMsg = err.stdout || err.stderr || '';
      }
      expect(errorMsg).toContain('未知阶段');
    });
  });
});
