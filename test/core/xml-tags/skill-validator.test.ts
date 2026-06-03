import { describe, it, expect } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  validateSkillFile,
  validateSkillContent,
} from '../../../src/core/xml-tags/skill-validator.js';

describe('validateSkillContent', () => {
  it('包含合法标签 → valid: true, tags: N', () => {
    const content = [
      '# My Skill',
      '',
      '<HARD-GATE>禁止在 main 分支开发</HARD-GATE>',
      '<EXTREMELY-IMPORTANT>你必须运行测试</EXTREMELY-IMPORTANT>',
      '<CHECKLIST>- [ ] 检查项一\n- [ ] 检查项二</CHECKLIST>',
    ].join('\n');

    const result = validateSkillContent(content);

    expect(result.valid).toBe(true);
    expect(result.tags).toBe(3);
    expect(result.issues).toHaveLength(0);
  });

  it('包含格式错误标签 → valid: false, issues 非空', () => {
    const content = [
      '# My Skill',
      '',
      '<HARD-GATE></HARD-GATE>',
    ].join('\n');

    const result = validateSkillContent(content);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.level === 'ERROR')).toBe(true);
  });

  it('空文件 → valid: true, tags: 0', () => {
    const result = validateSkillContent('');

    expect(result.valid).toBe(true);
    expect(result.tags).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it('纯空白内容 → valid: true, tags: 0', () => {
    const result = validateSkillContent('   \n\n  ');

    expect(result.valid).toBe(true);
    expect(result.tags).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it('不含标签的正常 SKILL.md → valid: true, tags: 0', () => {
    const content = [
      '# My Skill',
      '',
      '这是一个技能文件的描述。',
      '',
      '## 功能说明',
      '',
      '- 功能一',
      '- 功能二',
      '',
      '## 使用方法',
      '',
      '```bash',
      'superspec validate',
      '```',
    ].join('\n');

    const result = validateSkillContent(content);

    expect(result.valid).toBe(true);
    expect(result.tags).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it('包含代码块内标签 → tags: 0（代码块内不解析）', () => {
    const content = [
      '# My Skill',
      '',
      '```',
      '<HARD-GATE>这是代码块内的示例</HARD-GATE>',
      '<CHECKLIST>- [ ] 示例检查项</CHECKLIST>',
      '```',
      '',
      '正常内容。',
    ].join('\n');

    const result = validateSkillContent(content);

    expect(result.valid).toBe(true);
    expect(result.tags).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it('包含未知标签 → WARNING issue', () => {
    const content = [
      '# My Skill',
      '',
      '<UNKNOWN-TAG>某些内容</UNKNOWN-TAG>',
    ].join('\n');

    const result = validateSkillContent(content);

    expect(result.issues.length).toBeGreaterThan(0);
    const warningIssue = result.issues.find(i => i.level === 'WARNING');
    expect(warningIssue).toBeDefined();
    expect(warningIssue!.tag).toBe('UNKNOWN-TAG');
    expect(warningIssue!.message).toContain('未定义的标签类型');
  });

  it('混合合法标签和未知标签', () => {
    const content = [
      '# My Skill',
      '',
      '<HARD-GATE>合法标签</HARD-GATE>',
      '<CUSTOM-TAG>未知标签</CUSTOM-TAG>',
    ].join('\n');

    const result = validateSkillContent(content);

    // 两个标签都被解析（包括未知标签）
    expect(result.tags).toBe(2);
    // 未知标签产生 WARNING
    expect(result.issues.some(i => i.level === 'WARNING' && i.tag === 'CUSTOM-TAG')).toBe(true);
    // 没有 ERROR，所以 valid 为 true
    expect(result.valid).toBe(true);
  });

  it('多个格式错误', () => {
    const content = [
      '# My Skill',
      '',
      '<HARD-GATE></HARD-GATE>',
      '<CHECKLIST>   </CHECKLIST>',
      '<HARD-GATE>缺少闭合标签',
    ].join('\n');

    const result = validateSkillContent(content);

    expect(result.valid).toBe(false);
    expect(result.issues.filter(i => i.level === 'ERROR').length).toBeGreaterThanOrEqual(2);
  });

  it('标签在多行内容中正确记录行号', () => {
    const content = [
      '第一行',
      '第二行',
      '<HARD-GATE>第三行的标签</HARD-GATE>',
      '第四行',
    ].join('\n');

    const result = validateSkillContent(content);

    expect(result.tags).toBe(1);
    expect(result.issues).toHaveLength(0);
  });
});

describe('validateSkillFile', () => {
  const testDir = join(tmpdir(), 'superspec-test-skill-validator');

  // 测试前创建临时目录
  it('准备工作目录', () => {
    try {
      mkdirSync(testDir, { recursive: true });
    } catch {
      // 目录已存在
    }
  });

  it('包含合法标签的文件 → valid: true, tags: N', () => {
    const filePath = join(testDir, 'valid-skill.md');
    const content = [
      '# Valid Skill',
      '',
      '<HARD-GATE>禁止跳过校验</HARD-GATE>',
      '<EXTREMELY-IMPORTANT>必须运行测试</EXTREMELY-IMPORTANT>',
    ].join('\n');

    writeFileSync(filePath, content, 'utf-8');

    try {
      const result = validateSkillFile(filePath);

      expect(result.valid).toBe(true);
      expect(result.tags).toBe(2);
      expect(result.issues).toHaveLength(0);
    } finally {
      unlinkSync(filePath);
    }
  });

  it('包含格式错误标签的文件 → valid: false', () => {
    const filePath = join(testDir, 'invalid-skill.md');
    const content = [
      '# Invalid Skill',
      '',
      '<HARD-GATE></HARD-GATE>',
    ].join('\n');

    writeFileSync(filePath, content, 'utf-8');

    try {
      const result = validateSkillFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    } finally {
      unlinkSync(filePath);
    }
  });

  it('空文件 → valid: true, tags: 0', () => {
    const filePath = join(testDir, 'empty-skill.md');

    writeFileSync(filePath, '', 'utf-8');

    try {
      const result = validateSkillFile(filePath);

      expect(result.valid).toBe(true);
      expect(result.tags).toBe(0);
      expect(result.issues).toHaveLength(0);
    } finally {
      unlinkSync(filePath);
    }
  });

  it('不存在的文件 → 抛出异常', () => {
    const filePath = join(testDir, 'nonexistent.md');

    expect(() => validateSkillFile(filePath)).toThrow();
  });

  // 测试后清理临时目录
  it('清理工作目录', () => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });
});
