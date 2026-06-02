import { describe, it, expect } from 'vitest';
import { pythonAdapter } from '../../src/adapters/python.js';
import type { Spec } from '../../src/core/spec-schema.js';

describe('pythonAdapter', () => {
  const testSpec: Spec = {
    name: 'test',
    overview: '测试 spec',
    requirements: [
      {
        name: '导出格式支持',
        text: '系统 SHALL 支持 CSV 格式',
        scenarios: [
          { name: 'CSV 导出', rawText: 'Given 用户在导出页面\nWhen 选择 CSV\nThen 生成文件' },
          { name: 'XLSX 导出', rawText: 'Given 用户在导出页面\nWhen 选择 XLSX\nThen 生成文件' },
        ],
      },
    ],
    metadata: { version: '1.0.0', format: 'superspec' as const },
  };

  it('language 属性为 python', () => {
    expect(pythonAdapter.language).toBe('python');
  });

  it('fileExtension 为 .py', () => {
    expect(pythonAdapter.fileExtension).toBe('.py');
  });

  it('生成的代码包含 pytest 导入', () => {
    const code = pythonAdapter.generate(testSpec);
    expect(code).toContain('import pytest');
  });

  it('生成的代码包含 class 块', () => {
    const code = pythonAdapter.generate(testSpec);
    expect(code).toContain('class Test');
  });

  it('生成的代码包含 test_ 函数', () => {
    const code = pythonAdapter.generate(testSpec);
    expect(code).toContain('def test_');
  });

  it('生成的代码包含 assert True 占位', () => {
    const code = pythonAdapter.generate(testSpec);
    expect(code).toContain('assert True');
  });
});
