import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findSpecUpdates,
  buildUpdatedSpec,
  applySpecs,
} from '../../src/core/specs-apply.js';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_ROOT = join(process.cwd(), '.test-specs-apply');

beforeEach(() => {
  if (!existsSync(TEST_ROOT)) {
    mkdirSync(TEST_ROOT, { recursive: true });
  }
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

/** 创建测试用主 spec */
function createMainSpec(specsDir: string, capability: string, content: string): void {
  const specDir = join(specsDir, capability);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'spec.md'), content, 'utf-8');
}

/** 创建测试用 delta spec */
function createDeltaSpec(changeDir: string, capability: string, content: string): void {
  const specDir = join(changeDir, 'specs', capability);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'spec.md'), content, 'utf-8');
}

const MAIN_SPEC_CONTENT = `# Export Feature

## Purpose

Data export functionality for the application.

## Requirements

### Requirement: CSV Export
System SHALL export data in CSV format.

#### Scenario: Normal flow
- **WHEN** user clicks export
- **THEN** system downloads CSV file

### Requirement: XLSX Export
System SHALL export data in XLSX format.

#### Scenario: Normal flow
- **WHEN** user clicks export
- **THEN** system downloads XLSX file
`;

describe('specs-apply', () => {
  describe('findSpecUpdates', () => {
    it('should find delta specs in change directory', () => {
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'test-change');
      const mainSpecsDir = join(TEST_ROOT, '.superspec', 'specs');
      createDeltaSpec(changeDir, 'export', '## ADDED Requirements');
      createDeltaSpec(changeDir, 'import', '## ADDED Requirements');

      const updates = findSpecUpdates(changeDir, mainSpecsDir);
      expect(updates.length).toBe(2);
      expect(updates[0].capability).toBe('export');
      expect(updates[1].capability).toBe('import');
    });

    it('should detect if target exists', () => {
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'test-change');
      const mainSpecsDir = join(TEST_ROOT, '.superspec', 'specs');
      createDeltaSpec(changeDir, 'export', '## ADDED Requirements');
      createMainSpec(mainSpecsDir, 'export', MAIN_SPEC_CONTENT);

      const updates = findSpecUpdates(changeDir, mainSpecsDir);
      expect(updates[0].exists).toBe(true);
    });

    it('should return empty when no specs in change', () => {
      const changeDir = join(TEST_ROOT, '.superspec', 'changes', 'test-change');
      mkdirSync(join(changeDir, 'specs'), { recursive: true });
      const mainSpecsDir = join(TEST_ROOT, '.superspec', 'specs');

      const updates = findSpecUpdates(changeDir, mainSpecsDir);
      expect(updates).toEqual([]);
    });
  });

  describe('buildUpdatedSpec', () => {
    it('should apply ADDED requirements to existing spec', () => {
      const delta = [
        '## ADDED Requirements',
        '',
        '### Requirement: PDF Export',
        'System SHALL export data in PDF format.',
        '',
        '#### Scenario: PDF export',
        '- **WHEN** user selects PDF',
        '- **THEN** system downloads PDF',
      ].join('\n');

      const result = buildUpdatedSpec(delta, MAIN_SPEC_CONTENT, 'export', 'add-pdf');
      expect(result.counts.added).toBe(1);
      expect(result.rebuilt).toContain('PDF Export');
      expect(result.rebuilt).toContain('CSV Export'); // 原有的保留
      expect(result.isNew).toBe(false);
    });

    it('should apply MODIFIED requirements', () => {
      const delta = [
        '## MODIFIED Requirements',
        '',
        '### Requirement: CSV Export',
        'System SHALL export data in UTF-8 CSV format with BOM.',
        '',
        '#### Scenario: UTF-8 export',
        '- **WHEN** user clicks export',
        '- **THEN** system downloads UTF-8 CSV with BOM',
      ].join('\n');

      const result = buildUpdatedSpec(delta, MAIN_SPEC_CONTENT, 'export', 'modify-csv');
      expect(result.counts.modified).toBe(1);
      expect(result.rebuilt).toContain('UTF-8 CSV format with BOM');
      expect(result.rebuilt).not.toContain('System SHALL export data in CSV format.');
    });

    it('should apply REMOVED requirements', () => {
      const delta = [
        '## REMOVED Requirements',
        '',
        '### Requirement: XLSX Export',
        '- **Reason**: Replaced by PDF export',
        '- **Migration**: Use PDF export endpoint',
      ].join('\n');

      const result = buildUpdatedSpec(delta, MAIN_SPEC_CONTENT, 'export', 'remove-xlsx');
      expect(result.counts.removed).toBe(1);
      expect(result.rebuilt).not.toContain('XLSX Export');
      expect(result.rebuilt).toContain('CSV Export'); // 其他的保留
    });

    it('should apply RENAMED requirements', () => {
      const delta = [
        '## RENAMED Requirements',
        '',
        '### Requirement: Spreadsheet Export',
        '- **FROM**: XLSX Export',
        '- **TO**: Spreadsheet Export',
      ].join('\n');

      const result = buildUpdatedSpec(delta, MAIN_SPEC_CONTENT, 'export', 'rename-xlsx');
      expect(result.counts.renamed).toBe(1);
      expect(result.rebuilt).toContain('Spreadsheet Export');
      expect(result.rebuilt).not.toContain('### Requirement: XLSX Export');
    });

    it('should create new spec for new capability', () => {
      const delta = [
        '## Purpose',
        '',
        'New import feature for the application.',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: CSV Import',
        'System SHALL import CSV files.',
        '',
        '#### Scenario: Import CSV',
        '- **WHEN** user uploads CSV file',
        '- **THEN** system parses and stores data',
      ].join('\n');

      const result = buildUpdatedSpec(delta, undefined, 'import', 'add-import');
      expect(result.isNew).toBe(true);
      expect(result.counts.added).toBe(1);
      expect(result.rebuilt).toContain('CSV Import');
      expect(result.rebuilt).toContain('New import feature');
    });

    it('should reject MODIFIED for new capability', () => {
      const delta = [
        '## MODIFIED Requirements',
        '',
        '### Requirement: Something',
        'Modified content here.',
        '',
        '#### Scenario: Test',
        '- **WHEN** something happens',
        '- **THEN** something occurs',
      ].join('\n');

      expect(() => buildUpdatedSpec(delta, undefined, 'new-cap', 'test')).toThrow('只允许 ADDED');
    });

    it('should reject ADDED for existing requirement', () => {
      const delta = [
        '## ADDED Requirements',
        '',
        '### Requirement: CSV Export',
        'This already exists.',
      ].join('\n');

      expect(() => buildUpdatedSpec(delta, MAIN_SPEC_CONTENT, 'export', 'test')).toThrow('已存在');
    });

    it('should reject REMOVED for non-existent requirement', () => {
      const delta = [
        '## REMOVED Requirements',
        '',
        '### Requirement: NonExistent',
        '- **Reason**: Test',
      ].join('\n');

      expect(() => buildUpdatedSpec(delta, MAIN_SPEC_CONTENT, 'export', 'test')).toThrow('未找到');
    });

    it('should apply mixed operations in correct order', () => {
      const delta = [
        '## ADDED Requirements',
        '',
        '### Requirement: PDF Export',
        'System SHALL export PDF.',
        '',
        '#### Scenario: PDF export',
        '- **WHEN** user selects PDF',
        '- **THEN** system downloads PDF',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: CSV Export',
        'System SHALL export UTF-8 CSV.',
        '',
        '#### Scenario: UTF-8 export',
        '- **WHEN** user clicks export',
        '- **THEN** system downloads UTF-8 CSV',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: XLSX Export',
        '- **Reason**: Deprecated',
      ].join('\n');

      const result = buildUpdatedSpec(delta, MAIN_SPEC_CONTENT, 'export', 'mixed');
      expect(result.counts.added).toBe(1);
      expect(result.counts.modified).toBe(1);
      expect(result.counts.removed).toBe(1);
      expect(result.rebuilt).toContain('PDF Export');
      expect(result.rebuilt).toContain('UTF-8 CSV');
      expect(result.rebuilt).not.toContain('XLSX Export');
    });
  });

  describe('applySpecs', () => {
    it('should apply all delta specs in dry-run mode', async () => {
      const projectRoot = TEST_ROOT;
      const changeDir = join(projectRoot, '.superspec', 'changes', 'test-change');
      const mainSpecsDir = join(projectRoot, '.superspec', 'specs');

      // 准备主 spec
      createMainSpec(mainSpecsDir, 'export', MAIN_SPEC_CONTENT);

      // 准备 delta spec
      createDeltaSpec(changeDir, 'export', [
        '## ADDED Requirements',
        '',
        '### Requirement: PDF Export',
        'System SHALL export PDF.',
        '',
        '#### Scenario: PDF export',
        '- **WHEN** user selects PDF',
        '- **THEN** system downloads PDF',
      ].join('\n'));

      // Dry-run
      const result = await applySpecs(projectRoot, 'test-change', { dryRun: true });
      expect(result.noChanges).toBe(false);
      expect(result.capabilities.length).toBe(1);
      expect(result.totals.added).toBe(1);

      // 主 spec 不应该被修改
      const mainContent = readFileSync(join(mainSpecsDir, 'export', 'spec.md'), 'utf-8');
      expect(mainContent).not.toContain('PDF Export');
    });

    it('should write to main spec in non-dry-run mode', async () => {
      const projectRoot = TEST_ROOT;
      const changeDir = join(projectRoot, '.superspec', 'changes', 'test-change');
      const mainSpecsDir = join(projectRoot, '.superspec', 'specs');

      createMainSpec(mainSpecsDir, 'export', MAIN_SPEC_CONTENT);
      createDeltaSpec(changeDir, 'export', [
        '## ADDED Requirements',
        '',
        '### Requirement: PDF Export',
        'System SHALL export PDF.',
      ].join('\n'));

      const result = await applySpecs(projectRoot, 'test-change');
      expect(result.totals.added).toBe(1);

      // 主 spec 应该被修改
      const mainContent = readFileSync(join(mainSpecsDir, 'export', 'spec.md'), 'utf-8');
      expect(mainContent).toContain('PDF Export');
    });

    it('should create new spec file for new capability', async () => {
      const projectRoot = TEST_ROOT;
      const changeDir = join(projectRoot, '.superspec', 'changes', 'test-change');

      createDeltaSpec(changeDir, 'import', [
        '## Purpose',
        '',
        'Import feature.',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: CSV Import',
        'System SHALL import CSV.',
      ].join('\n'));

      const result = await applySpecs(projectRoot, 'test-change');
      expect(result.capabilities[0].isNew).toBe(true);

      const specPath = join(projectRoot, '.superspec', 'specs', 'import', 'spec.md');
      expect(existsSync(specPath)).toBe(true);
      expect(readFileSync(specPath, 'utf-8')).toContain('CSV Import');
    });

    it('should throw for non-existent change', async () => {
      await expect(applySpecs(TEST_ROOT, 'nonexistent')).rejects.toThrow('不存在');
    });

    it('should return noChanges when no delta specs', async () => {
      const projectRoot = TEST_ROOT;
      const changeDir = join(projectRoot, '.superspec', 'changes', 'test-change');
      mkdirSync(join(changeDir, 'specs'), { recursive: true });

      const result = await applySpecs(projectRoot, 'test-change');
      expect(result.noChanges).toBe(true);
    });
  });
});
