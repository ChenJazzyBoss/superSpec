import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { archiveChange } from '../../src/core/archive.js';
import { listChanges } from '../../src/core/changes.js';

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

describe('归档系统', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `superspec-archive-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // 创建 .superspec 目录结构
    const specDir = join(testDir, '.superspec', 'specs', 'batch-export');
    mkdirSync(specDir, { recursive: true });
    writeFileSync(join(specDir, 'spec.md'), VALID_SPEC);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('archiveChange', () => {
    it('归档 ADDED 变更', async () => {
      // 创建变更目录
      const changeDir = join(testDir, '.superspec', 'changes', 'add-pdf-export');
      mkdirSync(changeDir, { recursive: true });

      const delta = {
        specName: 'batch-export',
        changes: [
          {
            type: 'ADDED',
            section: 'requirement',
            target: 'PDF 导出',
            content: '系统 SHALL 支持 PDF 格式导出。'
          },
          {
            type: 'ADDED',
            section: 'scenario',
            target: 'PDF 导出成功',
            parent: 'PDF 导出',
            content: 'Given 用户在导出页面\nWhen 选择 PDF 格式\nThen 生成 PDF 文件'
          },
          {
            type: 'ADDED',
            section: 'scenario',
            target: 'PDF 导出失败',
            parent: 'PDF 导出',
            content: 'Given 用户在导出页面\nWhen PDF 生成失败\nThen 显示错误提示'
          }
        ]
      };

      writeFileSync(join(changeDir, 'delta.json'), JSON.stringify(delta, null, 2));
      writeFileSync(join(changeDir, 'metadata.yaml'), 'createdAt: 2026-06-02\n');

      // 执行归档
      const result = await archiveChange(testDir, 'add-pdf-export');

      expect(result.name).toBe('add-pdf-export');
      expect(result.specName).toBe('batch-export');
      expect(result.changesCount).toBe(3);
      expect(result.validationPassed).toBe(true);

      // 验证归档目录存在
      expect(existsSync(result.archivePath)).toBe(true);
      expect(existsSync(join(result.archivePath, 'delta.json'))).toBe(true);
      expect(existsSync(join(result.archivePath, 'merged-spec.md'))).toBe(true);

      // 验证原始变更目录被删除
      expect(existsSync(changeDir)).toBe(false);

      // 验证 spec 被更新
      const updatedSpec = readFileSync(
        join(testDir, '.superspec', 'specs', 'batch-export', 'spec.md'),
        'utf-8'
      );
      expect(updatedSpec).toContain('PDF 导出');
    });

    it('delta.json 不存在时抛出错误', async () => {
      await expect(archiveChange(testDir, 'nonexistent')).rejects.toThrow(
        '变更目录不存在或缺少 delta.json'
      );
    });

    it('delta 格式错误时抛出错误', async () => {
      const changeDir = join(testDir, '.superspec', 'changes', 'bad-delta');
      mkdirSync(changeDir, { recursive: true });
      writeFileSync(join(changeDir, 'delta.json'), '{"invalid": true}');

      await expect(archiveChange(testDir, 'bad-delta')).rejects.toThrow(
        '读取 delta.json 失败'
      );
    });
  });

  describe('listChanges', () => {
    it('列出进行中的变更', () => {
      // 创建两个变更目录
      const change1 = join(testDir, '.superspec', 'changes', 'change-a');
      const change2 = join(testDir, '.superspec', 'changes', 'change-b');
      mkdirSync(change1, { recursive: true });
      mkdirSync(change2, { recursive: true });

      writeFileSync(
        join(change1, 'delta.json'),
        JSON.stringify({
          specName: 'batch-export',
          changes: [{ type: 'ADDED', section: 'requirement', target: 'test', content: 'test' }]
        })
      );
      writeFileSync(join(change1, 'metadata.yaml'), 'createdAt: 2026-06-01\n');

      writeFileSync(
        join(change2, 'delta.json'),
        JSON.stringify({
          specName: 'batch-export',
          changes: [{ type: 'ADDED', section: 'requirement', target: 'test', content: 'test' }]
        })
      );
      writeFileSync(join(change2, 'metadata.yaml'), 'createdAt: 2026-06-02\n');

      const changes = listChanges(testDir);

      expect(changes.length).toBe(2);
      // 按创建时间倒序排列，change-b (2026-06-02) 在前
      expect(changes[0].name).toBe('change-b');
      expect(changes[1].name).toBe('change-a');
    });

    it('无变更时返回空数组', () => {
      const changes = listChanges(testDir);
      expect(changes.length).toBe(0);
    });

    it('跳过 archive 目录', () => {
      // 创建变更目录和 archive 目录
      const change1 = join(testDir, '.superspec', 'changes', 'change-a');
      const archive = join(testDir, '.superspec', 'changes', 'archive');
      mkdirSync(change1, { recursive: true });
      mkdirSync(archive, { recursive: true });

      writeFileSync(
        join(change1, 'delta.json'),
        JSON.stringify({
          specName: 'batch-export',
          changes: [{ type: 'ADDED', section: 'requirement', target: 'test', content: 'test' }]
        })
      );
      writeFileSync(join(change1, 'metadata.yaml'), 'createdAt: 2026-06-01\n');

      const changes = listChanges(testDir);

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('change-a');
    });
  });
});
