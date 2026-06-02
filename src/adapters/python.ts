/**
 * Python Adapter
 *
 * 将 Spec 转换为 pytest 测试骨架。
 * 生成的测试包含 class/test_ 结构，每个 scenario 对应一个 test_ 函数。
 */

import type { Adapter } from './types.js';
import type { Spec, Requirement } from '../core/spec-schema.js';
import { adapterRegistry } from './registry.js';

function cleanName(name: string): string {
  return name
    .replace(/^Requirement:\s*/i, '')
    .replace(/^Scenario:\s*/i, '')
    .trim();
}

function toPythonIdentifier(name: string): string {
  let id = name.replace(/[^a-zA-Z0-9一-鿿]/g, '_');
  if (/^\d/.test(id)) id = '_' + id;
  id = id.replace(/_+/g, '_').replace(/^_|_$/g, '');
  return id || 'unnamed';
}

function toClassName(name: string): string {
  const id = toPythonIdentifier(name);
  return 'Test' + id.charAt(0).toUpperCase() + id.slice(1);
}

function toFunctionName(name: string): string {
  const id = toPythonIdentifier(name);
  return 'test_' + id.toLowerCase();
}

function generateForRequirement(req: Requirement): string {
  const reqName = cleanName(req.name);
  const className = toClassName(reqName);
  const lines: string[] = [];

  lines.push(`class ${className}:`);
  lines.push(`    """${reqName}"""`);
  lines.push('');

  for (const scenario of req.scenarios) {
    const scenarioName = cleanName(scenario.name);
    const funcName = toFunctionName(scenarioName);
    lines.push(`    def ${funcName}(self):`);
    lines.push(`        """${scenarioName}"""`);
    lines.push(`        # TODO: 实现测试`);
    lines.push(`        # ${scenario.rawText.split('\n')[0]}`);
    lines.push(`        assert True  # 占位`);
    lines.push('');
  }

  return lines.join('\n');
}

export const pythonAdapter: Adapter = {
  language: 'python',
  fileExtension: '.py',
  displayName: 'Python (pytest)',

  generate(spec: Spec): string {
    const lines: string[] = [];

    lines.push(`import pytest`);
    lines.push('');
    lines.push('');

    for (const req of spec.requirements) {
      lines.push(generateForRequirement(req));
      lines.push('');
      lines.push('');
    }

    return lines.join('\n');
  },
};

adapterRegistry.register(pythonAdapter);
