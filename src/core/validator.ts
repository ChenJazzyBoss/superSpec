/**
 * 双层校验引擎
 *
 * 第一层：Zod Schema 结构校验
 * 第二层：规则引擎（可配置业务规则）
 *
 * 可选增强：
 * - --deep: 逻辑一致性分析
 * - 图表自动生成（检测 DIAGRAM 标记）
 * - 源码关联追踪（检测 source 标记）
 * - 场景类型识别标注
 */

import { ZodError } from 'zod';
import { readFileSync, writeFileSync } from 'fs';
import { parseSpec } from './spec-parser.js';
import { SpecSchema } from './spec-schema.js';
import { runRules, builtinRules, type Rule, type RuleViolation } from './rules/index.js';
import { runDeepAnalysis } from './deep-analysis.js';
import { extractDiagramMarkers, embedDiagrams } from './diagram-generator.js';
import { extractSourceFiles, checkSourceSync } from './source-tracker.js';
import type { Spec } from './spec-schema.js';

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
  /** 场景类型标注（每条需求的每个场景的类型） */
  scenarioTypes?: Record<string, string[]>;
}

/**
 * 校验器选项
 */
export interface ValidatorOptions {
  strictMode?: boolean;
  deep?: boolean;
  rules?: Rule[];
}

/** 异常处理关键词 */
const ERROR_RE = /错误|失败|异常|超时|不可用|拒绝|无效|非法|error|fail|exception|timeout|invalid|reject/i;

/** 边界条件关键词 */
const BOUNDARY_RE = /为空|空值|null|undefined|超出|超过|恰好|最大|最小|上限|下限|边界|零|负数|edge|boundary|empty|zero|max|min/i;

/**
 * 从 rawText 中提取 Given/When/Then
 */
function extractGWT(rawText: string): { given: string; when: string; then: string } {
  const given = rawText.match(/Given\s+(.*?)(?:\n|$)/i)?.[1] ?? '';
  const when = rawText.match(/When\s+(.*?)(?:\n|$)/i)?.[1] ?? '';
  const then = rawText.match(/Then\s+(.*?)(?:\n|$)/i)?.[1] ?? '';
  return { given, when, then };
}

/**
 * 判断场景类型
 */
function classifyScenarioType(rawText: string): string {
  const { given, when, then } = extractGWT(rawText);
  const text = `${given} ${when} ${then}`;
  if (ERROR_RE.test(text)) return 'error';
  if (BOUNDARY_RE.test(text)) return 'boundary';
  return 'normal';
}

/**
 * 识别所有场景的类型
 */
function classifyAllScenarioTypes(spec: Spec): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [ri, req] of spec.requirements.entries()) {
    const types: string[] = [];
    for (const scenario of req.scenarios) {
      types.push(classifyScenarioType(scenario.rawText));
    }
    result[`requirements[${ri}]`] = types;
  }
  return result;
}

/**
 * 双层校验器
 */
export class Validator {
  private strictMode: boolean;
  private deep: boolean;
  private rules: Rule[];

  constructor(options: ValidatorOptions = {}) {
    this.strictMode = options.strictMode ?? false;
    this.deep = options.deep ?? false;
    this.rules = options.rules ?? builtinRules;
  }

  /**
   * 校验 Spec 文件
   * 读取文件内容 -> 解析 -> Schema 校验 -> 业务规则校验 -> 可选增强
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

      // 增强 1：场景类型识别
      const scenarioTypes = classifyAllScenarioTypes(spec);

      // 增强 2：深度逻辑一致性分析（可选）
      if (this.deep) {
        const deepResults = runDeepAnalysis(spec);
        issues.push(
          ...deepResults.map((r) => ({
            level: r.level as ValidationIssue['level'],
            path: r.path,
            message: `[逻辑一致性] ${r.message}`,
          }))
        );
      }

      // 增强 3：图表自动生成
      const diagramMarkers = extractDiagramMarkers(content);
      if (diagramMarkers.length > 0) {
        try {
          const updatedContent = embedDiagrams(content, spec);
          if (updatedContent !== content) {
            writeFileSync(filePath, updatedContent, 'utf-8');
            issues.push({
              level: 'INFO',
              path: 'diagram',
              message: `已自动生成 ${diagramMarkers.length} 个 Mermaid 图表`,
            });
          }
        } catch (err) {
          issues.push({
            level: 'INFO',
            path: 'diagram',
            message: `图表生成失败: ${err instanceof Error ? err.message : '未知错误'}`,
          });
        }
      }

      // 增强 4：源码关联追踪
      const sourceFiles = extractSourceFiles(content);
      if (sourceFiles.length > 0) {
        const projectRoot = this.extractProjectRoot(filePath);
        const trackingResults = checkSourceSync(filePath, sourceFiles, projectRoot);
        issues.push(
          ...trackingResults.map((r) => ({
            level: r.level as ValidationIssue['level'],
            path: r.path,
            message: `[源码追踪] ${r.message}`,
          }))
        );
      }

      const report = this.createReport(issues);

      // 校验通过时保存快照
      if (report.valid) {
        const { saveSnapshot } = await import('../history/snapshot.js');
        saveSnapshot(filePath, name);
      }

      return { ...report, scenarioTypes };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      issues.push({ level: 'ERROR', path: 'file', message });
      return this.createReport(issues);
    }
  }

  /**
   * 从字符串内容校验（不读文件，不写文件）
   */
  async validateSpecContent(specName: string, content: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];

    try {
      const spec = parseSpec(content, specName);

      const result = SpecSchema.safeParse(spec);
      if (!result.success) {
        issues.push(...this.convertZodErrors(result.error));
      }

      issues.push(...this.applyBusinessRules(spec));

      const scenarioTypes = classifyAllScenarioTypes(spec);

      if (this.deep) {
        const deepResults = runDeepAnalysis(spec);
        issues.push(
          ...deepResults.map((r) => ({
            level: r.level as ValidationIssue['level'],
            path: r.path,
            message: `[逻辑一致性] ${r.message}`,
          }))
        );
      }

      return { ...this.createReport(issues), scenarioTypes };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      issues.push({ level: 'ERROR', path: 'file', message });
      return this.createReport(issues);
    }
  }

  /**
   * 规则引擎校验
   */
  private applyBusinessRules(spec: Spec): ValidationIssue[] {
    const result = runRules(spec, this.rules);
    return result.violations.map((v: RuleViolation) => ({
      level: v.level,
      path: v.location ?? 'spec',
      message: `[${v.name}] ${v.message}`,
    }));
  }

  /**
   * 生成校验报告
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

    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] === 'specs' && i < parts.length - 1) {
        return parts[i + 1];
      }
    }

    const fileName = parts[parts.length - 1] ?? '';
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  }

  /**
   * 从 spec 文件路径推断项目根目录
   * 假设结构为 <projectRoot>/.superspec/specs/<name>/spec.md
   */
  private extractProjectRoot(specFilePath: string): string {
    const normalized = specFilePath.replace(/\\/g, '/');
    const superspecIndex = normalized.indexOf('/.superspec/');
    if (superspecIndex >= 0) {
      return normalized.slice(0, superspecIndex);
    }
    const parts = normalized.split('/');
    return parts.slice(0, -3).join('/');
  }
}
