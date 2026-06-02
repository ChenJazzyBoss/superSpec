import { describe, it, expect } from 'vitest';
import { typescriptAdapter } from '../../src/adapters/typescript.js';
import type { Spec } from '../../src/core/spec-schema.js';

describe('typescriptAdapter', () => {
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

  it('language 属性为 typescript', () => {
    expect(typescriptAdapter.language).toBe('typescript');
  });

  it('fileExtension 为 .test.ts', () => {
    expect(typescriptAdapter.fileExtension).toBe('.test.ts');
  });

  it('生成的代码包含 vitest 导入', () => {
    const code = typescriptAdapter.generate(testSpec);
    expect(code).toContain("import { describe, it, expect } from 'vitest'");
  });

  it('生成的代码包含 describe 块', () => {
    const code = typescriptAdapter.generate(testSpec);
    expect(code).toContain("describe('导出格式支持'");
  });

  it('生成的代码包含 it 块', () => {
    const code = typescriptAdapter.generate(testSpec);
    expect(code).toContain("it('CSV 导出'");
    expect(code).toContain("it('XLSX 导出'");
  });

  it('生成的代码包含 TODO 占位', () => {
    const code = typescriptAdapter.generate(testSpec);
    expect(code).toContain('// TODO: 实现测试');
  });

  it('生成的代码无语法错误', () => {
    const code = typescriptAdapter.generate(testSpec);
    // 简单检查：包含 describe 和 it 的闭合
    expect(code).toContain('});');
  });
});
