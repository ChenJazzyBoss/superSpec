import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createChange,
  getChangePhase,
  listChangeCapabilities,
  getChangeInfo,
  listAllChanges,
  addDeltaSpec,
  readDeltaSpec,
  formatChangeInfo,
  type Proposal,
} from '../../src/core/change-lifecycle.js';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_ROOT = join(process.cwd(), '.test-change-lifecycle');

beforeEach(() => {
  if (!existsSync(TEST_ROOT)) {
    mkdirSync(TEST_ROOT, { recursive: true });
  }
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

const sampleProposal: Proposal = {
  why: '用户需要批量导出数据',
  whatChanges: '新增 CSV/XLSX/PDF 三种格式的导出功能',
  newCapabilities: ['batch-export'],
  modifiedCapabilities: [],
  impact: '影响数据处理模块和 API 层',
};

describe('change-lifecycle', () => {
  describe('createChange', () => {
    it('should create change directory with proposal', () => {
      const dir = createChange(TEST_ROOT, 'batch-export', sampleProposal);
      expect(existsSync(dir)).toBe(true);
      expect(existsSync(join(dir, 'proposal.md'))).toBe(true);
      expect(existsSync(join(dir, 'specs'))).toBe(true);
    });

    it('should throw if change already exists', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      expect(() => createChange(TEST_ROOT, 'batch-export', sampleProposal)).toThrow('已存在');
    });

    it('should generate proposal.md with correct sections', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const proposalPath = join(TEST_ROOT, '.superspec', 'changes', 'batch-export', 'proposal.md');
      const content = require('fs').readFileSync(proposalPath, 'utf-8');
      expect(content).toContain('## Why');
      expect(content).toContain('用户需要批量导出数据');
      expect(content).toContain('## What Changes');
      expect(content).toContain('## Capabilities');
      expect(content).toContain('`batch-export`');
    });

    it('should include modified capabilities in proposal', () => {
      const proposal: Proposal = {
        ...sampleProposal,
        newCapabilities: ['export-engine'],
        modifiedCapabilities: ['user-auth'],
      };
      createChange(TEST_ROOT, 'modify-auth', proposal);
      const proposalPath = join(TEST_ROOT, '.superspec', 'changes', 'modify-auth', 'proposal.md');
      const content = require('fs').readFileSync(proposalPath, 'utf-8');
      expect(content).toContain('### New Capabilities');
      expect(content).toContain('`export-engine`');
      expect(content).toContain('### Modified Capabilities');
      expect(content).toContain('`user-auth`');
    });
  });

  describe('getChangePhase', () => {
    it('should return proposal phase for new change', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      expect(getChangePhase(changeDir)).toBe('proposal');
    });

    it('should return spec phase after adding delta spec', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      addDeltaSpec(changeDir, 'batch-export', '## ADDED Requirements\n\n### Requirement: Test\nContent');
      expect(getChangePhase(changeDir)).toBe('spec');
    });

    it('should return plan phase after adding plan', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      addDeltaSpec(changeDir, 'batch-export', '## ADDED Requirements\n\n### Requirement: Test\nContent');
      writeFileSync(join(changeDir, 'plan.md'), '# Plan', 'utf-8');
      expect(getChangePhase(changeDir)).toBe('plan');
    });
  });

  describe('listChangeCapabilities', () => {
    it('should return empty list for new change', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      expect(listChangeCapabilities(changeDir)).toEqual([]);
    });

    it('should list added capabilities', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      addDeltaSpec(changeDir, 'batch-export', '## ADDED Requirements');
      addDeltaSpec(changeDir, 'export-engine', '## ADDED Requirements');
      expect(listChangeCapabilities(changeDir)).toEqual(['batch-export', 'export-engine']);
    });
  });

  describe('addDeltaSpec and readDeltaSpec', () => {
    it('should write and read delta spec', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      const content = '## ADDED Requirements\n\n### Requirement: Export\nSystem SHALL export data.';
      addDeltaSpec(changeDir, 'batch-export', content);
      expect(readDeltaSpec(changeDir, 'batch-export')).toBe(content);
    });

    it('should throw when reading non-existent delta spec', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      expect(() => readDeltaSpec(changeDir, 'nonexistent')).toThrow('不存在');
    });
  });

  describe('listAllChanges', () => {
    it('should list all changes', () => {
      createChange(TEST_ROOT, 'change-a', sampleProposal);
      createChange(TEST_ROOT, 'change-b', sampleProposal);
      const changes = listAllChanges(TEST_ROOT);
      expect(changes.length).toBe(2);
      expect(changes.map(c => c.name).sort()).toEqual(['change-a', 'change-b']);
    });

    it('should skip archive directory', () => {
      mkdirSync(join(TEST_ROOT, '.superspec', 'changes', 'archive'), { recursive: true });
      createChange(TEST_ROOT, 'change-a', sampleProposal);
      const changes = listAllChanges(TEST_ROOT);
      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('change-a');
    });
  });

  describe('getChangeInfo', () => {
    it('should return full change info', () => {
      createChange(TEST_ROOT, 'batch-export', sampleProposal);
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'batch-export');
      addDeltaSpec(changeDir, 'batch-export', '## ADDED Requirements');
      const info = getChangeInfo(TEST_ROOT, 'batch-export');
      expect(info.name).toBe('batch-export');
      expect(info.phase).toBe('spec');
      expect(info.capabilities).toEqual(['batch-export']);
    });

    it('should throw for non-existent change', () => {
      expect(() => getChangeInfo(TEST_ROOT, 'nonexistent')).toThrow('不存在');
    });
  });

  describe('formatChangeInfo', () => {
    it('should format change info for display', () => {
      const output = formatChangeInfo({
        name: 'test-change',
        phase: 'spec',
        capabilities: ['cap-a', 'cap-b'],
        path: '/path/to/change',
      });
      expect(output).toContain('test-change');
      expect(output).toContain('spec');
      expect(output).toContain('cap-a');
    });
  });
});
