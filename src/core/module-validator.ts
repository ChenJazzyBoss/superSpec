/**
 * 模块清单校验器
 *
 * 对模块清单进行程序化校验，确保结构完整、依赖合理。
 */

import { ModuleListSchema, type ModuleList, type Module } from './module-schema.js';
import { parseModuleList } from './module-parser.js';

/**
 * 校验问题级别
 */
export type IssueLevel = 'ERROR' | 'WARNING' | 'INFO';

/**
 * 校验问题
 */
export interface ModuleIssue {
  level: IssueLevel;
  rule: string;
  message: string;
  module?: string;
}

/**
 * 校验报告
 */
export interface ModuleValidationReport {
  valid: boolean;
  issues: ModuleIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    modules: number;
  };
}

/**
 * 校验模块清单
 *
 * @param content - Markdown 格式的模块清单内容
 * @param project - 项目名称
 * @returns 校验报告
 */
export function validateModuleList(content: string, project: string): ModuleValidationReport {
  const issues: ModuleIssue[] = [];

  // 1. 解析模块清单
  let moduleList: ModuleList;
  try {
    moduleList = parseModuleList(content, project);
  } catch (err) {
    issues.push({
      level: 'ERROR',
      rule: 'parse-error',
      message: `模块清单解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
    });
    return createReport(issues, 0);
  }

  // 2. Schema 校验
  const schemaResult = ModuleListSchema.safeParse(moduleList);
  if (!schemaResult.success) {
    for (const error of schemaResult.error.errors) {
      issues.push({
        level: 'ERROR',
        rule: 'schema',
        message: error.message,
        module: error.path.length > 0 ? String(error.path[0]) : undefined,
      });
    }
  }

  // 3. 业务规则校验
  const ruleIssues = validateBusinessRules(moduleList);
  issues.push(...ruleIssues);

  return createReport(issues, moduleList.modules.length);
}

/**
 * 业务规则校验
 */
function validateBusinessRules(moduleList: ModuleList): ModuleIssue[] {
  const issues: ModuleIssue[] = [];
  const { modules } = moduleList;

  // 规则 1: 模块名称唯一性
  const nameCount = new Map<string, number>();
  for (const mod of modules) {
    nameCount.set(mod.name, (nameCount.get(mod.name) || 0) + 1);
  }
  for (const [name, count] of nameCount) {
    if (count > 1) {
      issues.push({
        level: 'ERROR',
        rule: 'unique-names',
        message: `模块名称重复: ${name}`,
        module: name,
      });
    }
  }

  // 规则 2: 循环依赖检测
  const cycleIssues = detectCircularDependencies(modules);
  issues.push(...cycleIssues);

  // 规则 3: 依赖目标存在性
  const moduleNames = new Set(modules.map((m) => m.name));
  for (const mod of modules) {
    for (const dep of mod.dependencies) {
      if (!moduleNames.has(dep.target)) {
        issues.push({
          level: 'WARNING',
          rule: 'dependency-exists',
          message: `模块 ${mod.name} 依赖的模块 ${dep.target} 不存在于清单中`,
          module: mod.name,
        });
      }
    }
  }

  // 规则 4: 职责描述质量
  for (const mod of modules) {
    if (mod.responsibility.length < 10) {
      issues.push({
        level: 'WARNING',
        rule: 'responsibility-length',
        message: `模块 ${mod.name} 的职责描述过短 (${mod.responsibility.length} 字符)`,
        module: mod.name,
      });
    }
  }

  // 规则 5: P0 模块必须有接口
  for (const mod of modules) {
    if (mod.priority === 'P0' && mod.interfaces.length === 0) {
      issues.push({
        level: 'WARNING',
        rule: 'p0-has-interface',
        message: `P0 模块 ${mod.name} 没有定义对外接口`,
        module: mod.name,
      });
    }
  }

  return issues;
}

/**
 * 检测循环依赖
 * 使用拓扑排序算法
 */
function detectCircularDependencies(modules: Module[]): ModuleIssue[] {
  const issues: ModuleIssue[] = [];
  const graph = new Map<string, string[]>();

  // 构建依赖图
  for (const mod of modules) {
    graph.set(
      mod.name,
      mod.dependencies.filter((d) => d.type !== 'optional').map((d) => d.target),
    );
  }

  // 拓扑排序检测环
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(node: string, path: string[]): boolean {
    if (visiting.has(node)) {
      // 找到环
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      issues.push({
        level: 'ERROR',
        rule: 'no-circular-dependency',
        message: `检测到循环依赖: ${cycle.join(' → ')}`,
      });
      return true;
    }

    if (visited.has(node)) return false;

    visiting.add(node);
    path.push(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (dfs(dep, path)) return true;
    }

    visiting.delete(node);
    path.pop();
    visited.add(node);
    return false;
  }

  for (const mod of modules) {
    if (!visited.has(mod.name)) {
      dfs(mod.name, []);
    }
  }

  return issues;
}

/**
 * 创建校验报告
 */
function createReport(issues: ModuleIssue[], moduleCount: number): ModuleValidationReport {
  const errors = issues.filter((i) => i.level === 'ERROR').length;
  const warnings = issues.filter((i) => i.level === 'WARNING').length;
  const info = issues.filter((i) => i.level === 'INFO').length;

  return {
    valid: errors === 0,
    issues,
    summary: {
      errors,
      warnings,
      info,
      modules: moduleCount,
    },
  };
}
