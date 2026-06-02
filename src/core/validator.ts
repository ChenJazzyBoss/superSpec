/**
 * 双层校验引擎
 *
 * 第一层：Zod Schema 结构校验
 * 第二层：规则引擎（可配置业务规则）
 *
 * 参考 OpenSpec validator.ts（裁剪版，只保留 Spec 校验）
 */

import { ZodError } from 'zod';
import { readFileSync } from 'fs';
import { parseSpec } from './spec-parser.js';
import { SpecSchema } from './spec-schema.js';
import { runRules, builtinRules, type Rule, type RuleViolation } from './rules/index.js';

/**
 * 校验问题条目
 */
export interface ValidationIssue {
  level: 'ERROR' | 'WARNING' | 'INFO';
  path: string;
  message: string;
}

/**
 * 校验报告
 */
export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  summary: { errors: number; warnings: number; info: number };
}

/**
 * 双层校验器
 */
export class Validator {
  private strictMode: boolean;
  private rules: Rule[];

  constructor(strictMode: boolean = false, rules: Rule[] = builtinRules) {
    this.strictMode = strictMode;
    this.rules = rules;
  }

  /**
   * 校验 Spec 文件
   * 读取文件内容 -> 解析 -> Schema 校验 -> 业务规则校验
   */
  async validateSpec(filePath: string, specName?: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const name = specName ?? this.extractNameFromPath(filePath);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const spec = parseSpec(content, name);

      // 第一层：Zod Schema 结构校验
      const result = SpecSchema.safeParse(spec);
      if (!result.success) {
        issues.push(...this.convertZodErrors(result.error));
      }

      // 第二层：业务规则校验
      issues.push(...this.applyBusinessRules(spec));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      issues.push({ level: 'ERROR', path: 'file', message });
    }

    const report = this.createReport(issues);

    // 校验通过时保存快照
    if (report.valid) {
      const { saveSnapshot } = await import('../history/snapshot.js');
      saveSnapshot(filePath, name);
    }

    return report;
  }

  /**
   * 从字符串内容校验（不读文件）
   */
  async validateSpecContent(specName: string, content: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];

    try {
      const spec = parseSpec(content, specName);

      // 第一层：Zod Schema 结构校验
      const result = SpecSchema.safeParse(spec);
      if (!result.success) {
        issues.push(...this.convertZodErrors(result.error));
      }

      // 第二层：业务规则校验
      issues.push(...this.applyBusinessRules(spec));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      issues.push({ level: 'ERROR', path: 'file', message });
    }

    return this.createReport(issues);
  }

  /**
   * 规则引擎校验
   * 遍历所有已注册规则，对 Spec 进行检查
   */
  private applyBusinessRules(spec: import('./spec-schema.js').Spec): ValidationIssue[] {
    const result = runRules(spec, this.rules);
    return result.violations.map((v: RuleViolation) => ({
      level: v.level,
      path: v.location ?? 'spec',
      message: `[${v.name}] ${v.message}`,
    }));
  }

  /**
   * 生成校验报告
   * strictMode 下 WARNING 也导致 valid: false
   */
  private createReport(issues: ValidationIssue[]): ValidationReport {
    const errors = issues.filter((i) => i.level === 'ERROR').length;
    const warnings = issues.filter((i) => i.level === 'WARNING').length;
    const info = issues.filter((i) => i.level === 'INFO').length;

    const valid = this.strictMode ? errors === 0 && warnings === 0 : errors === 0;

    return {
      valid,
      issues,
      summary: { errors, warnings, info },
    };
  }

  /**
   * 将 ZodError 转换为 ValidationIssue[]
   */
  private convertZodErrors(error: ZodError): ValidationIssue[] {
    return error.issues.map((err) => ({
      level: 'ERROR' as const,
      path: err.path.join('.'),
      message: err.message,
    }));
  }

  /**
   * 从文件路径提取 spec 名称
   */
  private extractNameFromPath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');

    // 尝试从 specs/<name>/spec.md 结构中提取
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] === 'specs' && i < parts.length - 1) {
        return parts[i + 1];
      }
    }

    // 回退：使用文件名（去掉扩展名）
    const fileName = parts[parts.length - 1] ?? '';
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  }
}
