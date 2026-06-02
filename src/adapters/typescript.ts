/**
 * TypeScript Adapter
 *
 * 将 Spec 转换为 vitest 测试骨架。
 * 生成的测试包含 describe/it 结构，每个 scenario 对应一个 it 块。
 */

import type { Adapter } from './types.js';
import type { Spec, Requirement } from '../core/spec-schema.js';
import { adapterRegistry } from './registry.js';

/**
 * 清理名称，移除 "Requirement:" / "Scenario:" 前缀
 */
function cleanName(name: string): string {
  return name
    .replace(/^Requirement:\s*/i, '')
    .replace(/^Scenario:\s*/i, '')
    .trim();
}

/**
 * 将中文名称转为合法的 JS 标识符（简单处理）
 */
function toIdentifier(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9一-鿿]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function generateForRequirement(req: Requirement): string {
  const reqName = cleanName(req.name);
  const lines: string[] = [];

  lines.push(`  describe('${reqName}', () => {`);

  for (const scenario of req.scenarios) {
    const scenarioName = cleanName(scenario.name);
    lines.push(`    it('${scenarioName}', () => {`);
    lines.push(`      // TODO: 实现测试`);
    lines.push(`      // ${scenario.rawText.split('\n')[0]}`);
    lines.push(`      expect(true).toBe(true); // 占位`);
    lines.push(`    });`);
    lines.push('');
  }

  lines.push(`  });`);
  return lines.join('\n');
}

export const typescriptAdapter: Adapter = {
  language: 'typescript',
  fileExtension: '.test.ts',
  displayName: 'TypeScript (vitest)',

  generate(spec: Spec): string {
    const lines: string[] = [];

    lines.push(`import { describe, it, expect } from 'vitest';`);
    lines.push('');

    for (const req of spec.requirements) {
      lines.push(generateForRequirement(req));
      lines.push('');
    }

    return lines.join('\n');
  },
};

// 自动注册到全局注册表
adapterRegistry.register(typescriptAdapter);
