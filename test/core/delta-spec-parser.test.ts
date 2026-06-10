import { describe, it, expect } from 'vitest';
import {
  parseDeltaSpec,
  validateDeltaSpec,
  generateDeltaSpecTemplate,
} from '../../src/core/delta-spec-parser.js';

describe('delta-spec-parser', () => {
  describe('parseDeltaSpec', () => {
    it('should parse ADDED requirements', () => {
      const markdown = [
        '## ADDED Requirements',
        '',
        '### Requirement: Export CSV',
        'System SHALL export data in CSV format.',
        '',
        '#### Scenario: Normal flow',
        '- **WHEN** user clicks export',
        '- **THEN** system downloads CSV file',
      ].join('\n');

      const result = parseDeltaSpec(markdown);
      expect(result.added.length).toBe(1);
      expect(result.added[0].name).toBe('Export CSV');
      expect(result.added[0].content).toContain('System SHALL export');
      expect(result.modified.length).toBe(0);
      expect(result.removed.length).toBe(0);
      expect(result.renamed.length).toBe(0);
    });

    it('should parse MODIFIED requirements', () => {
      const markdown = [
        '## MODIFIED Requirements',
        '',
        '### Requirement: Export Format',
        'System SHALL support CSV, XLSX and PDF export.',
        '',
        '#### Scenario: PDF export',
        '- **WHEN** user selects PDF format',
        '- **THEN** system generates PDF file',
      ].join('\n');

      const result = parseDeltaSpec(markdown);
      expect(result.modified.length).toBe(1);
      expect(result.modified[0].name).toBe('Export Format');
      expect(result.modified[0].content).toContain('CSV, XLSX and PDF');
    });

    it('should parse REMOVED requirements with meta', () => {
      const markdown = [
        '## REMOVED Requirements',
        '',
        '### Requirement: Legacy Export',
        '- **Reason**: Replaced by new export system',
        '- **Migration**: Use new export endpoint',
      ].join('\n');

      const result = parseDeltaSpec(markdown);
      expect(result.removed.length).toBe(1);
      expect(result.removed[0].name).toBe('Legacy Export');
      expect(result.removed[0].meta?.reason).toBe('Replaced by new export system');
      expect(result.removed[0].meta?.migration).toBe('Use new export endpoint');
    });

    it('should parse RENAMED requirements with meta', () => {
      const markdown = [
        '## RENAMED Requirements',
        '',
        '### Requirement: Data Export',
        '- **FROM**: Export Data',
        '- **TO**: Data Export',
      ].join('\n');

      const result = parseDeltaSpec(markdown);
      expect(result.renamed.length).toBe(1);
      expect(result.renamed[0].name).toBe('Data Export');
      expect(result.renamed[0].meta?.from).toBe('Export Data');
      expect(result.renamed[0].meta?.to).toBe('Data Export');
    });

    it('should parse multiple operation types', () => {
      const markdown = [
        '## ADDED Requirements',
        '',
        '### Requirement: PDF Export',
        'System SHALL support PDF.',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: CSV Export',
        'System SHALL support UTF-8 CSV.',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Old Export',
        '- **Reason**: Deprecated',
      ].join('\n');

      const result = parseDeltaSpec(markdown);
      expect(result.added.length).toBe(1);
      expect(result.modified.length).toBe(1);
      expect(result.removed.length).toBe(1);
    });

    it('should parse Purpose section', () => {
      const markdown = [
        '## Purpose',
        '',
        'This feature provides batch export capability.',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Export',
        'System SHALL export data.',
      ].join('\n');

      const result = parseDeltaSpec(markdown);
      expect(result.purpose).toContain('batch export');
      expect(result.added.length).toBe(1);
    });

    it('should return empty result for empty markdown', () => {
      const result = parseDeltaSpec('');
      expect(result.added.length).toBe(0);
      expect(result.modified.length).toBe(0);
      expect(result.removed.length).toBe(0);
      expect(result.renamed.length).toBe(0);
    });

    it('should handle mixed content gracefully', () => {
      const markdown = [
        'Some random text',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Feature A',
        'Description',
        '',
        'Some text between',
        '',
        '### Requirement: Feature B',
        'Description B',
      ].join('\n');

      const result = parseDeltaSpec(markdown);
      expect(result.added.length).toBe(2);
      expect(result.added[0].name).toBe('Feature A');
      expect(result.added[1].name).toBe('Feature B');
    });
  });

  describe('validateDeltaSpec', () => {
    it('should pass for valid delta spec', () => {
      const delta = parseDeltaSpec([
        '## ADDED Requirements',
        '',
        '### Requirement: Export CSV',
        'System SHALL export CSV.',
        '',
        '#### Scenario: Normal',
        '- **WHEN** user clicks export',
        '- **THEN** file is downloaded',
      ].join('\n'));

      const issues = validateDeltaSpec(delta);
      expect(issues).toEqual([]);
    });

    it('should report when no operations found', () => {
      const delta = parseDeltaSpec('## Some Other Header\n\nContent');
      const issues = validateDeltaSpec(delta);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('没有找到任何操作');
    });

    it('should report RENAMED missing FROM/TO', () => {
      const delta = parseDeltaSpec([
        '## RENAMED Requirements',
        '',
        '### Requirement: New Name',
        'Just a rename without FROM/TO.',
      ].join('\n'));

      const issues = validateDeltaSpec(delta);
      expect(issues.some(i => i.includes('FROM 或 TO'))).toBe(true);
    });

    it('should report duplicate names across operations', () => {
      const delta = {
        added: [{ type: 'ADDED' as const, name: 'Export', content: 'Content A' }],
        modified: [{ type: 'MODIFIED' as const, name: 'Export', content: 'Content B' }],
        removed: [],
        renamed: [],
      };
      // 直接构造带重复名称的 delta
      const issues = validateDeltaSpec(delta);
      expect(issues.some(i => i.includes('重复'))).toBe(true);
    });
  });

  describe('generateDeltaSpecTemplate', () => {
    it('should generate template for new capability', () => {
      const template = generateDeltaSpecTemplate('user-auth', 'new');
      expect(template).toContain('ADDED Requirements');
      expect(template).toContain('Purpose');
    });

    it('should generate template for modification', () => {
      const template = generateDeltaSpecTemplate('user-auth', 'modify');
      expect(template).toContain('MODIFIED Requirements');
      expect(template).toContain('Scenario');
    });
  });
});
