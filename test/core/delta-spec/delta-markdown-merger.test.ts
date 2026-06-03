import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  parseMarkdownSections,
  findSection,
  assembleMarkdown,
  applyDeltaToMarkdown,
  mergeDeltaToSpecs,
} from '../../../src/core/delta-spec/markdown-merger.js';
import type { DeltaSpec } from '../../../src/core/delta-spec/types.js';

describe('Markdown 章节解析', () => {
  it('正确拆分多层级标题', () => {
    const content = `# 一级标题

一些内容

## 二级标题 A

内容 A

### 三级标题

三级内容

## 二级标题 B

内容 B
`;
    const sections = parseMarkdownSections(content);
    expect(sections).toHaveLength(4);
    expect(sections[0].heading).toBe('# 一级标题');
    expect(sections[0].level).toBe(1);
    expect(sections[1].heading).toBe('## 二级标题 A');
    expect(sections[2].heading).toBe('### 三级标题');
    expect(sections[3].heading).toBe('## 二级标题 B');
  });

  it('标题前的内容被跳过', () => {
    const content = `前置内容

## 标题

正文
`;
    const sections = parseMarkdownSections(content);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('## 标题');
  });

  it('空内容返回空数组', () => {
    const sections = parseMarkdownSections('');
    expect(sections).toHaveLength(0);
  });
});

describe('章节查找', () => {
  const sections = parseMarkdownSections(`## 需求一

内容一

## 需求二

内容二

## 异常处理

异常内容
`);

  it('精确匹配标题', () => {
    const found = findSection(sections, '需求一');
    expect(found).toBeDefined();
    expect(found!.heading).toBe('## 需求一');
  });

  it('模糊匹配标题', () => {
    const found = findSection(sections, '异常');
    expect(found).toBeDefined();
    expect(found!.heading).toBe('## 异常处理');
  });

  it('找不到返回 undefined', () => {
    const found = findSection(sections, '不存在的章节');
    expect(found).toBeUndefined();
  });

  it('支持路径格式查找', () => {
    const nested = parseMarkdownSections(`## 需求一

内容一

### 场景 A

场景内容

## 需求二

内容二
`);
    const found = findSection(nested, '需求一/场景 A');
    expect(found).toBeDefined();
    expect(found!.heading).toBe('### 场景 A');
  });
});

describe('applyDeltaToMarkdown', () => {
  let tmpDir: string;
  let specPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delta-merge-'));
    specPath = path.join(tmpDir, 'test-spec.md');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('ADDED: 追加新章节', () => {
    fs.writeFileSync(specPath, `## 需求一

内容一
`);
    const delta: DeltaSpec = {
      baseSpec: 'specs/test-spec.md',
      operations: [
        {
          operation: 'ADDED',
          path: '需求一',
          content: `## 需求二\n\n内容二`,
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = applyDeltaToMarkdown(specPath, delta);
    expect(result).toContain('## 需求一');
    expect(result).toContain('## 需求二');
    expect(result).toContain('内容二');
  });

  it('MODIFIED: 替换章节内容', () => {
    fs.writeFileSync(specPath, `## 需求一

旧内容
`);
    const delta: DeltaSpec = {
      baseSpec: 'specs/test-spec.md',
      operations: [
        {
          operation: 'MODIFIED',
          path: '需求一',
          before: '旧内容',
          after: `## 需求一\n\n新内容`,
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = applyDeltaToMarkdown(specPath, delta);
    expect(result).toContain('新内容');
    expect(result).not.toContain('旧内容');
  });

  it('REMOVED: 删除章节', () => {
    fs.writeFileSync(specPath, `## 需求一

内容一

## 需求二

内容二
`);
    const delta: DeltaSpec = {
      baseSpec: 'specs/test-spec.md',
      operations: [
        {
          operation: 'REMOVED',
          path: '需求一',
          content: '内容一',
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = applyDeltaToMarkdown(specPath, delta);
    expect(result).not.toContain('需求一');
    expect(result).toContain('需求二');
  });

  it('REMOVED: 删除父章节时连带子章节', () => {
    fs.writeFileSync(specPath, `## 需求一

内容一

### 场景 1

场景内容

## 需求二

内容二
`);
    const delta: DeltaSpec = {
      baseSpec: 'specs/test-spec.md',
      operations: [
        {
          operation: 'REMOVED',
          path: '需求一',
          content: '内容一',
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = applyDeltaToMarkdown(specPath, delta);
    expect(result).not.toContain('需求一');
    expect(result).not.toContain('场景 1');
    expect(result).toContain('需求二');
  });

  it('RENAMED: 重命名章节', () => {
    fs.writeFileSync(specPath, `## 旧标题

内容
`);
    const delta: DeltaSpec = {
      baseSpec: 'specs/test-spec.md',
      operations: [
        {
          operation: 'RENAMED',
          path: '旧标题',
          oldPath: '旧标题',
          newPath: '新标题',
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = applyDeltaToMarkdown(specPath, delta);
    expect(result).not.toContain('旧标题');
    expect(result).toContain('## 新标题');
    expect(result).toContain('内容');
  });

  it('多个操作按顺序执行', () => {
    fs.writeFileSync(specPath, `## 需求一

内容一

## 需求二

内容二
`);
    const delta: DeltaSpec = {
      baseSpec: 'specs/test-spec.md',
      operations: [
        { operation: 'REMOVED', path: '需求二', content: '内容二' },
        {
          operation: 'ADDED',
          path: '需求一',
          content: `## 需求三\n\n内容三`,
        },
        {
          operation: 'MODIFIED',
          path: '需求一',
          before: '内容一',
          after: `## 需求一\n\n修改后的内容一`,
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = applyDeltaToMarkdown(specPath, delta);
    expect(result).not.toContain('需求二');
    expect(result).toContain('需求三');
    expect(result).toContain('修改后的内容一');
  });
});

describe('mergeDeltaToSpecs', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-specs-'));
    fs.mkdirSync(path.join(tmpDir, 'specs'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('合并到已存在的 spec 文件', () => {
    const specsDir = path.join(tmpDir, 'specs');
    fs.writeFileSync(path.join(specsDir, 'test-capability.md'), `## 需求一

旧内容
`);
    const delta: DeltaSpec = {
      baseSpec: 'specs/test-capability.md',
      operations: [
        {
          operation: 'MODIFIED',
          path: '需求一',
          before: '旧内容',
          after: `## 需求一\n\n新内容`,
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = mergeDeltaToSpecs(specsDir, delta);
    expect(result.merged).toBe(true);
    expect(result.content).toContain('新内容');
    expect(result.specPath).toContain('test-capability.md');
  });

  it('目标不存在时创建新 spec', () => {
    const specsDir = path.join(tmpDir, 'specs');
    const delta: DeltaSpec = {
      baseSpec: 'specs/new-capability.md',
      operations: [
        {
          operation: 'ADDED',
          path: 'root',
          content: `## 新需求\n\n新内容`,
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    const result = mergeDeltaToSpecs(specsDir, delta);
    expect(result.merged).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('目标不存在但有修改操作时抛出错误', () => {
    const specsDir = path.join(tmpDir, 'specs');
    const delta: DeltaSpec = {
      baseSpec: 'specs/nonexistent.md',
      operations: [
        {
          operation: 'MODIFIED',
          path: '需求一',
          before: '旧',
          after: '新',
        },
      ],
      metadata: { author: 'test', timestamp: '2026-01-01', description: 'test' },
    };

    expect(() => mergeDeltaToSpecs(specsDir, delta)).toThrow();
  });
});
