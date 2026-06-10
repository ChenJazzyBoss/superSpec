import { describe, it, expect } from 'vitest';
import {
  listTemplates,
  getTemplateInfo,
  isValidTemplateType,
  loadTemplateContent,
  formatTemplateList,
  type TemplateType,
} from '../../src/core/init-templates.js';

describe('init-templates', () => {
  describe('listTemplates', () => {
    it('should return at least 4 builtin templates', () => {
      const templates = listTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(4);
    });

    it('should include general, web-api, cli, library types', () => {
      const templates = listTemplates();
      const types = templates.map((t) => t.type);
      expect(types).toContain('general');
      expect(types).toContain('web-api');
      expect(types).toContain('cli');
      expect(types).toContain('library');
    });

    it('should have required fields for each template', () => {
      const templates = listTemplates();
      for (const t of templates) {
        expect(t.type).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.filename).toMatch(/\.md$/);
      }
    });
  });

  describe('getTemplateInfo', () => {
    it('should return info for valid template type', () => {
      const info = getTemplateInfo('web-api');
      expect(info).toBeDefined();
      expect(info!.type).toBe('web-api');
      expect(info!.name).toBe('Web API');
    });

    it('should return undefined for invalid template type', () => {
      const info = getTemplateInfo('nonexistent');
      expect(info).toBeUndefined();
    });

    it('should return info for each builtin type', () => {
      const types: TemplateType[] = ['general', 'web-api', 'cli', 'library'];
      for (const type of types) {
        const info = getTemplateInfo(type);
        expect(info).toBeDefined();
        expect(info!.type).toBe(type);
      }
    });
  });

  describe('isValidTemplateType', () => {
    it('should return true for valid types', () => {
      expect(isValidTemplateType('general')).toBe(true);
      expect(isValidTemplateType('web-api')).toBe(true);
      expect(isValidTemplateType('cli')).toBe(true);
      expect(isValidTemplateType('library')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isValidTemplateType('invalid')).toBe(false);
      expect(isValidTemplateType('')).toBe(false);
      expect(isValidTemplateType('WebApi')).toBe(false);
    });
  });

  describe('loadTemplateContent', () => {
    it('should load general template content', () => {
      const content = loadTemplateContent('general');
      expect(content).toBeTruthy();
      expect(content).toContain('背景情报简报');
      expect(content).toContain('§1');
      expect(content).toContain('§2');
    });

    it('should load web-api template with API-specific fields', () => {
      const content = loadTemplateContent('web-api');
      expect(content).toBeTruthy();
      expect(content).toContain('API');
      expect(content).toContain('端点');
    });

    it('should load cli template with command-specific fields', () => {
      const content = loadTemplateContent('cli');
      expect(content).toBeTruthy();
      expect(content).toContain('命令');
      expect(content).toContain('参数');
    });

    it('should load library template with SDK-specific fields', () => {
      const content = loadTemplateContent('library');
      expect(content).toBeTruthy();
      expect(content).toContain('API');
      expect(content).toContain('版本');
    });

    it('should throw for unknown template type', () => {
      expect(() => loadTemplateContent('unknown' as TemplateType)).toThrow('未知模板类型');
    });

    it('should produce non-empty content for all templates', () => {
      const types: TemplateType[] = ['general', 'web-api', 'cli', 'library'];
      for (const type of types) {
        const content = loadTemplateContent(type);
        expect(content.length).toBeGreaterThan(100);
      }
    });
  });

  describe('formatTemplateList', () => {
    it('should produce formatted output with all template names', () => {
      const output = formatTemplateList();
      expect(output).toContain('general');
      expect(output).toContain('web-api');
      expect(output).toContain('cli');
      expect(output).toContain('library');
      expect(output).toContain('superspec init --template');
    });

    it('should include template count', () => {
      const output = formatTemplateList();
      expect(output).toMatch(/共 \d+ 个模板/);
    });
  });
});
