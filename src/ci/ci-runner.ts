/**
 * CI 批量校验运行器
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Validator, type ValidationReport } from '../core/validator.js';

export interface CiResult {
  specName: string;
  filePath: string;
  report: ValidationReport;
}

export interface CiSummary {
  total: number;
  passed: number;
  failed: number;
  results: CiResult[];
  valid: boolean;
}

function findSpecFiles(specsDir: string): Array<{ name: string; path: string }> {
  const specs: Array<{ name: string; path: string }> = [];
  try {
    const entries = readdirSync(specsDir);
    for (const entry of entries) {
      const entryPath = join(specsDir, entry);
      try {
        const stat = statSync(entryPath);
        if (stat.isDirectory()) {
          const specFile = join(entryPath, 'spec.md');
          try {
            statSync(specFile);
            specs.push({ name: entry, path: specFile });
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
  } catch { /* specs dir not found */ }
  return specs;
}

export async function runCi(projectRoot: string, strictMode: boolean = false): Promise<CiSummary> {
  const specsDir = join(projectRoot, '.superspec', 'specs');
  const specFiles = findSpecFiles(specsDir);
  const validator = new Validator({ strictMode });
  const results: CiResult[] = [];

  for (const { name, path } of specFiles) {
    const report = await validator.validateSpec(path, name);
    results.push({ specName: name, filePath: path, report });
  }

  const passed = results.filter(r => r.report.valid).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results, valid: failed === 0 };
}

export function printCiResult(summary: CiSummary): void {
  console.log(`\nsuperSpec CI 校验结果\n`);
  console.log(`总计: ${summary.total} 个 spec`);
  console.log(`通过: ${summary.passed}`);
  console.log(`失败: ${summary.failed}`);
  console.log('');

  for (const result of summary.results) {
    const status = result.report.valid ? '✅ PASS' : '❌ FAIL';
    const errors = result.report.summary.errors;
    const warnings = result.report.summary.warnings;
    console.log(`  ${status} ${result.specName} (${errors} error, ${warnings} warning)`);

    if (!result.report.valid) {
      for (const issue of result.report.issues) {
        if (issue.level === 'ERROR') {
          console.log(`    ❌ ${issue.message}`);
        }
      }
    }
  }
  console.log('');
}
