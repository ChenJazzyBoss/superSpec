import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const superspecRoot = process.cwd();
const CLI = join(superspecRoot, 'bin/superspec.js');

describe('端到端: 新增命令', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `superspec-e2e-new-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('guard 命令', () => {
    it('检查有红线表的技能文件通过', () => {
      const skillContent = `---
name: test-skill
description: 测试技能
---

# 测试技能

## 红线

| 跳步借口 | 现实 |
|----------|------|
| "太简单了" | 简单也要做 |
`;

      const skillPath = join(testDir, 'SKILL.md');
      writeFileSync(skillPath, skillContent);

      const result = execSync(
        `node ${CLI} guard ${skillPath}`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      expect(result).toContain('✅');
    });

    it('检查没有红线表的技能文件失败', () => {
      const skillContent = `---
name: test-skill
description: 测试技能
---

# 测试技能

没有红线表。
`;

      const skillPath = join(testDir, 'SKILL.md');
      writeFileSync(skillPath, skillContent);

      try {
        execSync(
          `node ${CLI} guard ${skillPath}`,
          { cwd: testDir, encoding: 'utf-8' }
        );
        expect.fail('应该抛出异常');
      } catch (err: any) {
        expect(err.status).toBe(1);
        expect(err.stdout).toContain('❌');
      }
    });

    it('JSON 输出格式正确', () => {
      const skillContent = `---
name: test-skill
description: 测试技能
---

# 测试技能

## 红线

| 跳步借口 | 现实 |
|----------|------|
| "太简单了" | 简单也要做 |
`;

      const skillPath = join(testDir, 'SKILL.md');
      writeFileSync(skillPath, skillContent);

      const result = execSync(
        `node ${CLI} guard ${skillPath} --json`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      const json = JSON.parse(result);
      expect(json).toHaveProperty('allowed');
      expect(json).toHaveProperty('issues');
      expect(json.allowed).toBe(true);
    });
  });

  describe('validate-modules 命令', () => {
    it('有效模块清单通过校验', () => {
      const moduleContent = `# 系统

## user-service

负责用户注册、登录、权限管理等核心功能。

## order-service

负责订单创建、查询、状态管理等业务功能。
`;

      const modulePath = join(testDir, 'modules.md');
      writeFileSync(modulePath, moduleContent);

      const result = execSync(
        `node ${CLI} validate-modules ${modulePath} -p test-system`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      expect(result).toContain('✅');
      expect(result).toContain('模块数: 2');
    });

    it('模块数量不足报错', () => {
      const moduleContent = `# 系统

## single-module

唯一的模块。
`;

      const modulePath = join(testDir, 'modules.md');
      writeFileSync(modulePath, moduleContent);

      try {
        execSync(
          `node ${CLI} validate-modules ${modulePath} -p test-system`,
          { cwd: testDir, encoding: 'utf-8' }
        );
        expect.fail('应该抛出异常');
      } catch (err: any) {
        expect(err.status).toBe(1);
        expect(err.stdout).toContain('❌');
      }
    });

    it('JSON 输出格式正确', () => {
      const moduleContent = `# 系统

## user-service

负责用户注册、登录、权限管理等核心功能。

## order-service

负责订单创建、查询、状态管理等业务功能。
`;

      const modulePath = join(testDir, 'modules.md');
      writeFileSync(modulePath, moduleContent);

      const result = execSync(
        `node ${CLI} validate-modules ${modulePath} -p test-system --json`,
        { cwd: testDir, encoding: 'utf-8' }
      );

      const json = JSON.parse(result);
      expect(json).toHaveProperty('valid');
      expect(json).toHaveProperty('issues');
      expect(json).toHaveProperty('summary');
      expect(json.valid).toBe(true);
      expect(json.summary.modules).toBe(2);
    });

    it('文件不存在报错', () => {
      try {
        execSync(
          `node ${CLI} validate-modules non-existent.md -p test-system`,
          { cwd: testDir, encoding: 'utf-8' }
        );
        expect.fail('应该抛出异常');
      } catch (err: any) {
        expect(err.status).toBe(1);
      }
    });
  });
});
