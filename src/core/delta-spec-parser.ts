/**
 * Markdown Delta Spec 解析器
 *
 * 解析变更目录下的 delta spec Markdown 文件。
 * 支持 4 种操作类型：ADDED / MODIFIED / REMOVED / RENAMED
 *
 * 借鉴 OpenSpec 的 Markdown delta 格式，同时保持 superSpec 的校验能力。
 */

/** Delta 操作类型 */
export type DeltaOperationType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED';

/** 需求块 */
export interface RequirementBlock {
  /** 操作类型 */
  type: DeltaOperationType;
  /** 需求名称 */
  name: string;
  /** 完整内容（包含 Scenario） */
  content: string;
  /** 附加信息（REMOVED 的 Reason/Migration，RENAMED 的 FROM/TO） */
  meta?: {
    reason?: string;
    migration?: string;
    from?: string;
    to?: string;
  };
}

/** Delta Spec 解析结果 */
export interface ParsedDeltaSpec {
  /** Purpose 部分（如果有） */
  purpose?: string;
  /** 各操作类型的需求列表 */
  added: RequirementBlock[];
  modified: RequirementBlock[];
  removed: RequirementBlock[];
  renamed: RequirementBlock[];
}

/** 操作类型正则匹配 */
const SECTION_HEADER_REGEX = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements?\s*$/i;
const REQUIREMENT_HEADER_REGEX = /^###\s+Requirement:\s*(.+)\s*$/i;
const PURPOSE_HEADER_REGEX = /^##\s+Purpose\s*$/i;

/**
 * 解析 Markdown delta spec
 *
 * @param markdown - delta spec 的 Markdown 内容
 * @returns 解析结果
 */
export function parseDeltaSpec(markdown: string): ParsedDeltaSpec {
  const result: ParsedDeltaSpec = {
    added: [],
    modified: [],
    removed: [],
    renamed: [],
  };

  const lines = markdown.split('\n');
  let currentSection: DeltaOperationType | null = null;
  let inPurpose = false;
  let purposeLines: string[] = [];
  let currentRequirement: RequirementBlock | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测 Purpose 区域
    if (PURPOSE_HEADER_REGEX.test(line)) {
      inPurpose = true;
      flushRequirement();
      continue;
    }

    if (inPurpose) {
      if (/^##\s+/.test(line)) {
        result.purpose = purposeLines.join('\n').trim();
        inPurpose = false;
        purposeLines = [];
        // 不 continue，继续处理当前行
      } else {
        purposeLines.push(line);
        continue;
      }
    }

    // 检测操作类型区域
    const sectionMatch = line.match(SECTION_HEADER_REGEX);
    if (sectionMatch) {
      flushRequirement();
      currentSection = sectionMatch[1].toUpperCase() as DeltaOperationType;
      continue;
    }

    // 检测需求块
    const reqMatch = line.match(REQUIREMENT_HEADER_REGEX);
    if (reqMatch && currentSection) {
      flushRequirement();
      currentRequirement = {
        type: currentSection,
        name: reqMatch[1].trim(),
        content: '',
      };
      contentLines = [line];
      continue;
    }

    // 收集需求内容
    if (currentRequirement) {
      contentLines.push(line);
    }
  }

  // 刷新最后一个需求
  flushRequirement();

  // 如果还在 Purpose 区域
  if (inPurpose) {
    result.purpose = purposeLines.join('\n').trim();
  }

  function flushRequirement(): void {
    if (currentRequirement) {
      currentRequirement.content = contentLines.join('\n').trim();

      // 解析 REMOVED 的 meta
      if (currentRequirement.type === 'REMOVED') {
        const reasonMatch = currentRequirement.content.match(/\*\*Reason\*\*:\s*(.+)/);
        const migrationMatch = currentRequirement.content.match(/\*\*Migration\*\*:\s*(.+)/);
        if (reasonMatch || migrationMatch) {
          currentRequirement.meta = {
            reason: reasonMatch?.[1]?.trim(),
            migration: migrationMatch?.[1]?.trim(),
          };
        }
      }

      // 解析 RENAMED 的 meta
      if (currentRequirement.type === 'RENAMED') {
        const fromMatch = currentRequirement.content.match(/\*\*FROM\*\*:\s*(.+)/);
        const toMatch = currentRequirement.content.match(/\*\*TO\*\*:\s*(.+)/);
        if (fromMatch || toMatch) {
          currentRequirement.meta = {
            from: fromMatch?.[1]?.trim(),
            to: toMatch?.[1]?.trim(),
          };
        }
      }

      // 添加到对应列表
      switch (currentRequirement.type) {
        case 'ADDED':
          result.added.push(currentRequirement);
          break;
        case 'MODIFIED':
          result.modified.push(currentRequirement);
          break;
        case 'REMOVED':
          result.removed.push(currentRequirement);
          break;
        case 'RENAMED':
          result.renamed.push(currentRequirement);
          break;
      }

      currentRequirement = null;
      contentLines = [];
    }
  }

  return result;
}

/**
 * 验证 delta spec 的基本完整性
 *
 * @param delta - 解析后的 delta spec
 * @returns 验证问题列表（空列表表示通过）
 */
export function validateDeltaSpec(delta: ParsedDeltaSpec): string[] {
  const issues: string[] = [];

  // 检查是否有任何操作
  const totalOps = delta.added.length + delta.modified.length + delta.removed.length + delta.renamed.length;
  if (totalOps === 0) {
    issues.push('Delta spec 中没有找到任何操作（ADDED/MODIFIED/REMOVED/RENAMED）');
  }

  // 检查 MODIFIED 和 RENAMED 的需求名称
  for (const mod of delta.modified) {
    if (!mod.name) {
      issues.push(`MODIFIED 需求缺少名称`);
    }
    if (!mod.content || mod.content.trim().split('\n').length < 2) {
      issues.push(`MODIFIED 需求 "${mod.name}" 内容不完整，应包含完整的修改后内容`);
    }
  }

  // 检查 RENAMED 的 meta
  for (const ren of delta.renamed) {
    if (!ren.meta?.from || !ren.meta?.to) {
      issues.push(`RENAMED 需求 "${ren.name}" 缺少 FROM 或 TO 字段`);
    }
  }

  // 检查名称冲突
  const allNames = [
    ...delta.added.map(r => r.name),
    ...delta.modified.map(r => r.name),
    ...delta.removed.map(r => r.name),
  ];
  const seen = new Set<string>();
  for (const name of allNames) {
    if (seen.has(name)) {
      issues.push(`需求名称重复: "${name}" 出现在多个操作中`);
    }
    seen.add(name);
  }

  return issues;
}

/**
 * 生成空的 delta spec 模板
 *
 * @param capability - capability 名称
 * @param type - 操作类型（new 为 ADDED，modify 为混合）
 * @returns Markdown 模板
 */
export function generateDeltaSpecTemplate(
  capability: string,
  type: 'new' | 'modify' = 'new',
): string {
  if (type === 'new') {
    return [
      `## Purpose`,
      ``,
      `<!-- ${capability} 的功能描述，至少 50 个字符 -->`,
      ``,
      `## ADDED Requirements`,
      ``,
      `### Requirement: <!-- 需求名称 -->`,
      `<!-- 需求描述，必须包含 SHALL 或 MUST -->`,
      ``,
      `#### Scenario: <!-- 正常场景 -->`,
      `- **WHEN** <!-- 触发条件 -->`,
      `- **THEN** <!-- 预期结果 -->`,
      ``,
      `#### Scenario: <!-- 异常场景 -->`,
      `- **WHEN** <!-- 触发条件 -->`,
      `- **THEN** <!-- 预期结果 -->`,
      ``,
    ].join('\n');
  }

  return [
    `## MODIFIED Requirements`,
    ``,
    `### Requirement: <!-- 需求名称 -->`,
    `<!-- 完整的修改后内容 -->`,
    ``,
    `#### Scenario: <!-- 场景名称 -->`,
    `- **WHEN** <!-- 触发条件 -->`,
    `- **THEN** <!-- 预期结果 -->`,
    ``,
  ].join('\n');
}
