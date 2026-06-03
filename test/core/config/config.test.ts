/**
 * 配置分层系统测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { deepMerge, resolveConfig } from '../../../src/core/config/merger.js';
import { loadConfig } from '../../../src/core/config/loader.js';

describe('deepMerge', () => {
  it('对象深度合并：嵌套对象属性递归合并', () => {
    const target = {
      validation: {
        rules: {
          'no-trailing-spaces': true,
          'max-line-length': 120,
        },
      },
    };
    const source = {
      validation: {
        rules: {
          'max-line-length': 80,
        },
      },
    };
    const result = deepMerge(target, source);
    expect(result).toEqual({
      validation: {
        rules: {
          'no-trailing-spaces': true,
          'max-line-length': 80,
        },
      },
    });
  });

  it('数组直接覆盖：source 的数组完全替换 target 的数组', () => {
    const target = {
      hooks: {
        'pre-validate': ['check-branch', 'check-commits'],
      },
    };
    const source = {
      hooks: {
        'pre-validate': ['lint-staged'],
      },
    };
    const result = deepMerge(target, source);
    expect(result).toEqual({
      hooks: {
        'pre-validate': ['lint-staged'],
      },
    });
  });

  it('基础类型直接覆盖', () => {
    const target = { strict: false, language: 'en' };
    const source = { strict: true };
    const result = deepMerge(target, source);
    expect(result).toEqual({ strict: true, language: 'en' });
  });

  it('source 中的新键添加到 result', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('不修改原始对象', () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    const result = deepMerge(target, source);
    expect(target).toEqual({ a: { b: 1 } });
    expect(result).toEqual({ a: { b: 1, c: 2 } });
  });
});

describe('resolveConfig', () => {
  it('优先级正确：CLI > change > project > global', () => {
    const global = { strict: false, language: 'en', level: 'global' };
    const project = { strict: true, project: 'alpha', level: 'project' };
    const change = { schema: 'v2', level: 'change' };
    const cli = { level: 'cli' };

    const result = resolveConfig(global, project, change, cli);

    expect(result.strict).toBe(true);         // project 覆盖 global
    expect(result.language).toBe('en');        // global 兜底
    expect(result.project).toBe('alpha');      // project 设置
    expect(result.schema).toBe('v2');          // change 设置
    expect(result.level).toBe('cli');          // CLI 最高优先级
  });

  it('只有全局配置时使用其值', () => {
    const global = { defaultLanguage: 'zh', strict: false };
    const result = resolveConfig(global, null, null, null);

    expect(result.defaultLanguage).toBe('zh');
    expect(result.strict).toBe(false);
  });

  it('所有配置缺失时返回空对象加 sources', () => {
    const result = resolveConfig(null, null, null, null);

    expect(result._sources).toEqual({});
  });

  it('sources 记录存在的配置层', () => {
    const global = { a: 1 };
    const project = { b: 2 };
    const result = resolveConfig(global, project, null, null);

    expect(result._sources.global).toBe('global');
    expect(result._sources.project).toBe('project');
    expect(result._sources.change).toBeUndefined();
  });
});

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'superspec-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('文件不存在返回 null', () => {
    const result = loadConfig(path.join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('解析 JSON 文件', () => {
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify({ strict: true, lang: 'en' }));
    const result = loadConfig(filePath);

    expect(result).toEqual({ strict: true, lang: 'en' });
  });

  it('解析 YAML 文件', () => {
    const filePath = path.join(tmpDir, 'config.yaml');
    fs.writeFileSync(filePath, 'strict: true\nlang: en\n');
    const result = loadConfig(filePath);

    expect(result).toEqual({ strict: true, lang: 'en' });
  });

  it('JSON 解析失败抛出明确错误', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, '{ invalid json }');

    expect(() => loadConfig(filePath)).toThrow('解析配置文件失败');
  });

  it('YAML 解析失败抛出明确错误', () => {
    const filePath = path.join(tmpDir, 'bad.yaml');
    fs.writeFileSync(filePath, ':\n  :\n    bad: [unterminated');

    expect(() => loadConfig(filePath)).toThrow('解析配置文件失败');
  });

  it('不支持的文件格式抛出错误', () => {
    const filePath = path.join(tmpDir, 'config.toml');
    fs.writeFileSync(filePath, 'key = "value"');

    expect(() => loadConfig(filePath)).toThrow('不支持的配置文件格式');
  });
});

describe('完整 resolve 流程', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'superspec-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('三层配置文件均存在时正确合并', () => {
    // 全局配置
    const globalPath = path.join(tmpDir, 'global.json');
    fs.writeFileSync(globalPath, JSON.stringify({
      defaultLanguage: 'en',
      strict: false,
      validation: {
        rules: {
          'no-trailing-spaces': true,
          'max-line-length': 120,
        },
      },
    }));

    // 项目配置
    const projectPath = path.join(tmpDir, 'project.yaml');
    fs.writeFileSync(projectPath, [
      'project: alpha',
      'strict: true',
      'validation:',
      '  rules:',
      '    max-line-length: 80',
    ].join('\n'));

    // 变更配置
    const changePath = path.join(tmpDir, 'change.yaml');
    fs.writeFileSync(changePath, [
      'schema: v2',
      'validation:',
      '  rules:',
      '    indent: 4',
    ].join('\n'));

    const global = loadConfig(globalPath);
    const project = loadConfig(projectPath);
    const change = loadConfig(changePath);

    const result = resolveConfig(global, project, change, { strict: false });

    // CLI 覆盖 project 的 strict: true
    expect(result.strict).toBe(false);
    // global 兜底
    expect(result.defaultLanguage).toBe('en');
    // project 设置
    expect(result.project).toBe('alpha');
    // change 设置
    expect(result.schema).toBe('v2');
    // 深度合并 validation.rules
    expect(result.validation).toEqual({
      rules: {
        'no-trailing-spaces': true,   // 来自 global
        'max-line-length': 80,         // project 覆盖 global 的 120
        indent: 4,                     // 来自 change
      },
    });
  });

  it('只有全局配置时使用其值和内置默认值', () => {
    const globalPath = path.join(tmpDir, 'global.json');
    fs.writeFileSync(globalPath, JSON.stringify({ defaultLanguage: 'zh' }));

    const global = loadConfig(globalPath);
    const result = resolveConfig(global, null, null, null);

    expect(result.defaultLanguage).toBe('zh');
    expect(result.project).toBeUndefined();
    expect(result.strict).toBeUndefined();
  });

  it('所有配置文件缺失时使用内置默认值', () => {
    const global = loadConfig(path.join(tmpDir, 'missing-global.json'));
    const project = loadConfig(path.join(tmpDir, 'missing-project.yaml'));

    expect(global).toBeNull();
    expect(project).toBeNull();

    const result = resolveConfig(global, project, null, null);

    expect(result._sources).toEqual({});
    expect(result.strict).toBeUndefined();
  });
});
