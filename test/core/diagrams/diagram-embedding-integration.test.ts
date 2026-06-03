import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { embedDiagram } from '../../../src/core/diagrams/diagram-integration.js';
import { diagramPresenceRule } from '../../../src/core/rules/builtin/diagram-presence.js';
import type { DiagramType } from '../../../src/core/diagrams/diagram-integration.js';

const ROOT = resolve(import.meta.dirname, '../../..');

describe('图表嵌入集成测试', () => {
  describe('embedDiagram 支持新类型', () => {
    it('test-coverage 类型可正确嵌入', () => {
      const content = '# 标题\n\n<!-- DIAGRAM:test-coverage -->\n\n正文';
      const mermaidCode = 'pie title 测试覆盖度\n  "已覆盖" : 80\n  "未覆盖" : 20';

      const result = embedDiagram(content, 'test-coverage', mermaidCode);

      expect(result).toContain('## 📊 测试覆盖度图');
      expect(result).toContain('```mermaid');
      expect(result).toContain('pie title 测试覆盖度');
      expect(result).not.toContain('<!-- DIAGRAM:test-coverage -->');
    });

    it('dependency 类型可正确嵌入', () => {
      const content = '# 标题\n\n<!-- DIAGRAM:dependency -->\n\n正文';
      const mermaidCode = 'flowchart LR\n  A --> B\n  B --> C';

      const result = embedDiagram(content, 'dependency', mermaidCode);

      expect(result).toContain('## 📊 依赖关系图');
      expect(result).toContain('```mermaid');
      expect(result).toContain('flowchart LR');
      expect(result).not.toContain('<!-- DIAGRAM:dependency -->');
    });

    it.each<[DiagramType, string]>([
      ['flowchart', '任务分解图'],
      ['state', '状态流转图'],
      ['decision', '校验决策流程'],
      ['test-coverage', '测试覆盖度图'],
      ['dependency', '依赖关系图'],
    ])('DiagramType=%s 映射到标题"%s"', (type, expectedTitle) => {
      const content = `<!-- DIAGRAM:${type} -->`;
      const result = embedDiagram(content, type, 'graph TB\n  A --> B');
      expect(result).toContain(`## 📊 ${expectedTitle}`);
    });
  });

  describe('模板包含占位符', () => {
    it('spec-template.md 包含 DIAGRAM:flowchart 占位符', () => {
      const templatePath = resolve(ROOT, 'templates/spec-template.md');
      const templateContent = readFileSync(templatePath, 'utf-8');

      expect(templateContent).toContain('<!-- DIAGRAM:flowchart -->');
    });

    it('占位符位于 Purpose 和 Requirements 之间', () => {
      const templatePath = resolve(ROOT, 'templates/spec-template.md');
      const templateContent = readFileSync(templatePath, 'utf-8');

      const purposeIdx = templateContent.indexOf('## Purpose');
      const placeholderIdx = templateContent.indexOf('<!-- DIAGRAM:flowchart -->');
      const requirementsIdx = templateContent.indexOf('## Requirements');

      expect(purposeIdx).toBeGreaterThanOrEqual(0);
      expect(placeholderIdx).toBeGreaterThan(purposeIdx);
      expect(requirementsIdx).toBeGreaterThan(placeholderIdx);
    });
  });

  describe('图表校验规则', () => {
    it('diagramPresenceRule 已定义且包含必要字段', () => {
      expect(diagramPresenceRule).toBeDefined();
      expect(diagramPresenceRule.id).toBe('diagram-presence');
      expect(diagramPresenceRule.name).toBe('图表存在性检查');
      expect(diagramPresenceRule.level).toBe('WARNING');
      expect(diagramPresenceRule.target).toBe('spec');
      expect(typeof diagramPresenceRule.check).toBe('function');
    });

    it('diagramPresenceRule.check 目前返回 null（占位实现）', () => {
      const mockCtx = {
        spec: {
          name: 'test',
          overview: '测试概述',
          requirements: [],
          metadata: { version: '1.0.0', format: 'superspec' },
        },
      };

      const result = diagramPresenceRule.check(mockCtx);
      expect(result).toBeNull();
    });
  });
});
