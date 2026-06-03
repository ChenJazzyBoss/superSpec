import { describe, it, expect } from 'vitest';
import { parseXmlTags } from '../../../src/core/xml-tags/parser.js';
import { validateTagFormat, validateAllFormats } from '../../../src/core/xml-tags/format-validator.js';
import { KNOWN_TAGS, TAG_PRIORITY } from '../../../src/core/xml-tags/types.js';

describe('parseXmlTags', () => {
  it('解析单个 HARD-GATE 标签', () => {
    const content = '<HARD-GATE>禁止在 main 分支开发</HARD-GATE>';
    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].type).toBe('HARD-GATE');
    expect(result.tags[0].content).toBe('禁止在 main 分支开发');
    expect(result.tags[0].line).toBe(1);
    expect(result.tags[0].raw).toBe(content);
    expect(result.issues).toHaveLength(0);
  });

  it('解析多个不同类型标签', () => {
    const content = [
      '<HARD-GATE>禁止跳过校验</HARD-GATE>',
      '<EXTREMELY-IMPORTANT>你必须运行测试</EXTREMELY-IMPORTANT>',
      '<SUBAGENT-STOP>子代理跳过此技能</SUBAGENT-STOP>',
      '<CHECKLIST>- [ ] 检查项一\n- [ ] 检查项二</CHECKLIST>',
    ].join('\n');

    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(4);
    expect(result.tags[0].type).toBe('HARD-GATE');
    expect(result.tags[1].type).toBe('EXTREMELY-IMPORTANT');
    expect(result.tags[2].type).toBe('SUBAGENT-STOP');
    expect(result.tags[3].type).toBe('CHECKLIST');
    expect(result.issues).toHaveLength(0);
  });

  it('标签内容为空 → ERROR', () => {
    const content = '<HARD-GATE></HARD-GATE>';
    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].content).toBe('');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].level).toBe('ERROR');
    expect(result.issues[0].message).toContain('内容不能为空');
  });

  it('标签内容为纯空白 → ERROR', () => {
    const content = '<HARD-GATE>   \n  </HARD-GATE>';
    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].level).toBe('ERROR');
    expect(result.issues[0].message).toContain('内容不能为空');
  });

  it('缺少闭合标签 → ERROR', () => {
    const content = '<HARD-GATE>禁止跳过校验';
    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].level).toBe('ERROR');
    expect(result.issues[0].tag).toBe('HARD-GATE');
    expect(result.issues[0].message).toContain('缺少闭合标签');
    expect(result.issues[0].line).toBe(1);
  });

  it('未知标签类型 → WARNING', () => {
    const content = '<UNKNOWN-TAG>某些内容</UNKNOWN-TAG>';
    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].type).toBe('UNKNOWN-TAG');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].level).toBe('WARNING');
    expect(result.issues[0].message).toContain('未定义的标签类型');
  });

  it('代码块内的标签不被识别', () => {
    const content = [
      '正常内容',
      '```',
      '<HARD-GATE>这是代码块内的示例</HARD-GATE>',
      '```',
      '<HARD-GATE>这是真实的标签</HARD-GATE>',
    ].join('\n');

    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].content).toBe('这是真实的标签');
    expect(result.issues).toHaveLength(0);
  });

  it('空文件返回空结果', () => {
    const result = parseXmlTags('');

    expect(result.tags).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  it('纯空白内容返回空结果', () => {
    const result = parseXmlTags('   \n\n  ');

    expect(result.tags).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });

  it('同类型标签嵌套 → ERROR', () => {
    const content = '<HARD-GATE>外层 <HARD-GATE>内层</HARD-GATE> 结尾</HARD-GATE>';
    const result = parseXmlTags(content);

    // 非贪婪匹配会先匹配内层闭合，导致外层标签内容包含内层开标签
    const nestingIssue = result.issues.find(
      (i) => i.level === 'ERROR' && i.message.includes('嵌套')
    );
    expect(nestingIssue).toBeDefined();
    expect(nestingIssue!.tag).toBe('HARD-GATE');
  });

  it('不同类型的标签可以相邻出现', () => {
    const content = '<HARD-GATE>规则一</HARD-GATE><CHECKLIST>清单</CHECKLIST>';
    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(2);
    expect(result.issues).toHaveLength(0);
  });

  it('标签在多行内容中正确记录行号', () => {
    const content = [
      '第一行',
      '第二行',
      '<HARD-GATE>第三行的标签</HARD-GATE>',
      '第四行',
    ].join('\n');

    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].line).toBe(3);
  });

  it('多个代码块正确处理', () => {
    const content = [
      '```',
      '<HARD-GATE>代码块一</HARD-GATE>',
      '```',
      '<HARD-GATE>真实标签</HARD-GATE>',
      '```',
      '<CHECKLIST>代码块二</CHECKLIST>',
      '```',
    ].join('\n');

    const result = parseXmlTags(content);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].type).toBe('HARD-GATE');
    expect(result.tags[0].content).toBe('真实标签');
  });
});

describe('validateTagFormat', () => {
  it('合法标签通过验证', () => {
    const tag = {
      type: 'HARD-GATE' as const,
      content: '禁止在 main 分支开发',
      line: 1,
      raw: '<HARD-GATE>禁止在 main 分支开发</HARD-GATE>',
    };

    const issues = validateTagFormat(tag);

    expect(issues).toHaveLength(0);
  });

  it('非法标签名报错', () => {
    const tag = {
      type: 'bad-tag' as any,
      content: '某些内容',
      line: 1,
      raw: '<bad-tag>某些内容</bad-tag>',
    };

    const issues = validateTagFormat(tag);

    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe('ERROR');
    expect(issues[0].message).toContain('命名规范');
  });

  it('内容为空白报错', () => {
    const tag = {
      type: 'HARD-GATE' as const,
      content: '   ',
      line: 1,
      raw: '<HARD-GATE>   </HARD-GATE>',
    };

    const issues = validateTagFormat(tag);

    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe('ERROR');
    expect(issues[0].message).toContain('内容不能为空');
  });
});

describe('validateAllFormats', () => {
  it('对解析结果中所有标签执行格式验证', () => {
    const content = [
      '<HARD-GATE>合法标签</HARD-GATE>',
      '<HARD-GATE></HARD-GATE>',
    ].join('\n');

    const parseResult = parseXmlTags(content);
    const issues = validateAllFormats(parseResult);

    // 第二个标签内容为空，会产生格式错误
    const emptyContentIssue = issues.find((i) => i.message.includes('内容不能为空'));
    expect(emptyContentIssue).toBeDefined();
  });

  it('所有标签合法时返回空问题列表', () => {
    const content = '<HARD-GATE>合法标签</HARD-GATE>';
    const parseResult = parseXmlTags(content);
    const issues = validateAllFormats(parseResult);

    expect(issues).toHaveLength(0);
  });
});

describe('KNOWN_TAGS 和 TAG_PRIORITY', () => {
  it('包含四种标准标签', () => {
    expect(KNOWN_TAGS.size).toBe(4);
    expect(KNOWN_TAGS.has('HARD-GATE')).toBe(true);
    expect(KNOWN_TAGS.has('EXTREMELY-IMPORTANT')).toBe(true);
    expect(KNOWN_TAGS.has('SUBAGENT-STOP')).toBe(true);
    expect(KNOWN_TAGS.has('CHECKLIST')).toBe(true);
  });

  it('HARD-GATE 优先级最高', () => {
    expect(TAG_PRIORITY['HARD-GATE']).toBe(1);
    expect(TAG_PRIORITY['HARD-GATE']).toBeLessThan(TAG_PRIORITY['CHECKLIST']);
    expect(TAG_PRIORITY['HARD-GATE']).toBeLessThan(TAG_PRIORITY['EXTREMELY-IMPORTANT']);
    expect(TAG_PRIORITY['HARD-GATE']).toBeLessThan(TAG_PRIORITY['SUBAGENT-STOP']);
  });
});
