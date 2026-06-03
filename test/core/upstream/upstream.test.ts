/**
 * 上游对齐检测 — 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadUpstreamConfig,
  validateUpstreamConfig,
  compareFiles,
  generateReport,
  generateJsonReport,
  detectDrift,
} from '../../../src/core/upstream/index.js';
import type { UpstreamReport, UpstreamConfig } from '../../../src/core/upstream/types.js';

/** 测试用临时目录 */
const TMP_DIR = join(process.cwd(), '.tmp-upstream-test');

beforeEach(() => {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

describe('loadUpstreamConfig', () => {
  it('加载合法配置文件', () => {
    const configPath = join(TMP_DIR, 'upstream.json');
    const data = {
      sources: [
        {
          name: 'openspec',
          type: 'git',
          url: 'https://github.com/example/openspec',
          paths: ['rules/base.yaml'],
          branch: 'main',
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');

    const config = loadUpstreamConfig(configPath);
    expect(config.sources).toHaveLength(1);
    expect(config.sources[0].name).toBe('openspec');
    expect(config.sources[0].type).toBe('git');
  });

  it('配置文件不存在时抛出错误', () => {
    expect(() => loadUpstreamConfig(join(TMP_DIR, 'not-exist.json'))).toThrow('配置文件不存在');
  });

  it('JSON 格式错误时抛出错误', () => {
    const configPath = join(TMP_DIR, 'bad.json');
    writeFileSync(configPath, '{ invalid json }', 'utf-8');
    expect(() => loadUpstreamConfig(configPath)).toThrow('JSON 格式错误');
  });
});

describe('validateUpstreamConfig', () => {
  it('合法配置校验通过', () => {
    const config: UpstreamConfig = {
      sources: [
        {
          name: 'openspec',
          type: 'git',
          url: 'https://github.com/example/openspec',
          paths: ['rules/base.yaml'],
          branch: 'main',
        },
        {
          name: 'superpowers',
          type: 'http',
          url: 'https://example.com/templates',
          paths: ['templates/skill.yaml'],
        },
      ],
    };
    const result = validateUpstreamConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('缺少必填字段时校验失败', () => {
    const config = {
      sources: [
        {
          name: '',
          type: 'invalid',
          url: '',
          paths: [],
        },
      ],
    } as unknown as UpstreamConfig;
    const result = validateUpstreamConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
    expect(result.errors.some((e) => e.includes('type'))).toBe(true);
  });

  it('sources 不是数组时校验失败', () => {
    const config = { sources: 'not-array' } as unknown as UpstreamConfig;
    const result = validateUpstreamConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('sources');
  });

  it('重复源名称时校验失败', () => {
    const config: UpstreamConfig = {
      sources: [
        { name: 'same', type: 'git', url: 'https://a.com', paths: ['a.yaml'] },
        { name: 'same', type: 'http', url: 'https://b.com', paths: ['b.yaml'] },
      ],
    };
    const result = validateUpstreamConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('重复'))).toBe(true);
  });
});

describe('compareFiles', () => {
  it('内容相同时返回无变化', () => {
    const fileA = join(TMP_DIR, 'a.yaml');
    const fileB = join(TMP_DIR, 'b.yaml');
    const content = 'name: test\nversion: 1\n';
    writeFileSync(fileA, content, 'utf-8');
    writeFileSync(fileB, content, 'utf-8');

    const result = compareFiles(fileA, fileB);
    expect(result.changed).toBe(false);
    expect(result.diffs).toHaveLength(0);
  });

  it('内容不同时返回变化详情', () => {
    const fileA = join(TMP_DIR, 'local.yaml');
    const fileB = join(TMP_DIR, 'upstream.yaml');
    writeFileSync(fileA, 'version: 1\nname: local', 'utf-8');
    writeFileSync(fileB, 'version: 2\nname: upstream', 'utf-8');

    const result = compareFiles(fileA, fileB);
    expect(result.changed).toBe(true);
    expect(result.diffs.length).toBeGreaterThan(0);
    expect(result.diffs[0]).toContain('第 1 行');
  });

  it('上游文件不存在时标记为本地独有', () => {
    const fileA = join(TMP_DIR, 'only-local.yaml');
    writeFileSync(fileA, 'content', 'utf-8');

    const result = compareFiles(fileA, join(TMP_DIR, 'nonexistent.yaml'));
    expect(result.changed).toBe(true);
    expect(result.diffs[0]).toContain('本地文件在上游已不存在');
  });

  it('本地文件不存在时标记为上游新增', () => {
    const fileB = join(TMP_DIR, 'only-upstream.yaml');
    writeFileSync(fileB, 'content', 'utf-8');

    const result = compareFiles(join(TMP_DIR, 'nonexistent.yaml'), fileB);
    expect(result.changed).toBe(true);
    expect(result.diffs[0]).toContain('上游新增文件');
  });
});

describe('generateReport', () => {
  it('生成 Markdown 格式报告（有差异）', () => {
    const report: UpstreamReport = {
      source: 'openspec',
      timestamp: '2026-06-03T12:00:00.000Z',
      diffs: [
        {
          path: 'rules/no-double-blank.yaml',
          type: 'added',
          category: 'validation-rule',
          severity: 'needs-review',
          detail: '上游新增文件，本地不存在',
        },
        {
          path: 'templates/skill.yaml',
          type: 'modified',
          category: 'skill-frontmatter',
          severity: 'needs-sync',
          detail: '第 3 行: 本地="version: 1" vs 上游="version: 2"',
        },
      ],
      summary: { total: 2, needsSync: 1, intentional: 0, needsReview: 1 },
    };

    const md = generateReport(report);
    expect(md).toContain('# 上游对齐检测报告 — openspec');
    expect(md).toContain('2026-06-03T12:00:00.000Z');
    expect(md).toContain('| 差异总数 | 2 |');
    expect(md).toContain('no-double-blank.yaml');
    expect(md).toContain('skill.yaml');
    expect(md).toContain('校验规则');
    expect(md).toContain('技能 Frontmatter');
  });

  it('无差异时显示空报告提示', () => {
    const report: UpstreamReport = {
      source: 'clean-source',
      timestamp: '2026-06-03T12:00:00.000Z',
      diffs: [],
      summary: { total: 0, needsSync: 0, intentional: 0, needsReview: 0 },
    };

    const md = generateReport(report);
    expect(md).toContain('所有文件与上游一致，无差异');
  });
});

describe('generateJsonReport', () => {
  it('生成合法 JSON 字符串', () => {
    const report: UpstreamReport = {
      source: 'openspec',
      timestamp: '2026-06-03T12:00:00.000Z',
      diffs: [
        {
          path: 'rules/test.yaml',
          type: 'modified',
          category: 'validation-rule',
          severity: 'needs-sync',
          detail: '内容变更',
        },
      ],
      summary: { total: 1, needsSync: 1, intentional: 0, needsReview: 0 },
    };

    const json = generateJsonReport(report);
    const parsed = JSON.parse(json) as UpstreamReport;
    expect(parsed.source).toBe('openspec');
    expect(parsed.diffs).toHaveLength(1);
    expect(parsed.diffs[0].path).toBe('rules/test.yaml');
    expect(parsed.summary.total).toBe(1);
  });
});

describe('detectDrift', () => {
  it('检测文件差异并生成报告', () => {
    // 准备本地目录
    const localDir = join(TMP_DIR, 'local');
    const cacheDir = join(TMP_DIR, 'cache');
    mkdirSync(join(localDir, 'rules'), { recursive: true });
    mkdirSync(join(cacheDir, 'rules'), { recursive: true });

    // 本地文件
    writeFileSync(join(localDir, 'rules/base.yaml'), 'version: 1\n', 'utf-8');
    // 上游缓存文件
    writeFileSync(join(cacheDir, 'rules/base.yaml'), 'version: 2\n', 'utf-8');

    const config: UpstreamConfig = {
      sources: [
        {
          name: 'test-source',
          type: 'git',
          url: 'https://example.com',
          paths: ['rules/base.yaml'],
        },
      ],
    };

    const reports = detectDrift(config, localDir, cacheDir);
    expect(reports).toHaveLength(1);
    expect(reports[0].source).toBe('test-source');
    expect(reports[0].summary.total).toBe(1);
    expect(reports[0].diffs[0].type).toBe('modified');
  });

  it('无差异时报告为空', () => {
    const localDir = join(TMP_DIR, 'local2');
    const cacheDir = join(TMP_DIR, 'cache2');
    mkdirSync(localDir, { recursive: true });
    mkdirSync(cacheDir, { recursive: true });

    const content = 'same content\n';
    writeFileSync(join(localDir, 'file.yaml'), content, 'utf-8');
    writeFileSync(join(cacheDir, 'file.yaml'), content, 'utf-8');

    const config: UpstreamConfig = {
      sources: [
        {
          name: 'clean',
          type: 'git',
          url: 'https://example.com',
          paths: ['file.yaml'],
        },
      ],
    };

    const reports = detectDrift(config, localDir, cacheDir);
    expect(reports[0].summary.total).toBe(0);
    expect(reports[0].diffs).toHaveLength(0);
  });
});
