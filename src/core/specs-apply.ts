/**
 * Specs Apply 合并引擎
 *
 * 将变更目录下的 delta spec 合并到主 spec。
 * 借鉴 OpenSpec 的 specs-apply.ts 设计。
 *
 * 合并顺序：RENAMED → REMOVED → MODIFIED → ADDED
 * 支持 dry-run 模式（校验但不写入）。
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'fs';
import { join, dirname } from 'path';
import {
  parseDeltaSpec,
  validateDeltaSpec,
  type ParsedDeltaSpec,
  type RequirementBlock,
} from './delta-spec-parser.js';

/** 合并操作计数 */
export interface ApplyCounts {
  added: number;
  modified: number;
  removed: number;
  renamed: number;
}

/** 单个 capability 的 apply 结果 */
export interface SpecApplyResult {
  /** capability 名称 */
  capability: string;
  /** 是否为新创建的 spec */
  isNew: boolean;
  /** 操作计数 */
  counts: ApplyCounts;
  /** 合并后的内容 */
  rebuilt: string;
}

/** 整体 apply 结果 */
export interface SpecsApplyOutput {
  /** 变更名称 */
  changeName: string;
  /** 各 capability 的 apply 结果 */
  capabilities: SpecApplyResult[];
  /** 总计数 */
  totals: ApplyCounts;
  /** 是否没有任何变更 */
  noChanges: boolean;
}

/** 需求块（从主 spec 中解析） */
interface MainRequirementBlock {
  /** 需求名称 */
  name: string;
  /** 规范化名称（用于匹配） */
  normalizedName: string;
  /** 完整内容（从 ### Requirement 开始） */
  raw: string;
  /** 在 Requirements section 中的起始行号 */
  startIndex: number;
}

/**
 * 规范化需求名称（用于匹配）
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * 从主 spec 内容中提取 Requirements section 和各个 requirement block
 */
function extractMainRequirements(content: string): {
  before: string;
  reqHeaderLine: string;
  preamble: string;
  blocks: MainRequirementBlock[];
  after: string;
} {
  const lines = content.split('\n');
  const reqHeaderIndex = lines.findIndex(l => /^##\s+Requirements\s*$/i.test(l));

  if (reqHeaderIndex === -1) {
    return {
      before: content,
      reqHeaderLine: '## Requirements',
      preamble: '',
      blocks: [],
      after: '',
    };
  }

  // 找到 Requirements section 的结束（下一个 ## 标题）
  let endIndex = lines.length;
  for (let i = reqHeaderIndex + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const before = lines.slice(0, reqHeaderIndex).join('\n');
  const reqHeaderLine = lines[reqHeaderIndex];
  const sectionLines = lines.slice(reqHeaderIndex + 1, endIndex);
  const after = lines.slice(endIndex).join('\n');

  // 解析 requirement blocks
  const blocks: MainRequirementBlock[] = [];
  let currentBlock: { name: string; normalizedName: string; lines: string[]; startIndex: number } | null = null;
  let preambleLines: string[] = [];
  let foundFirstReq = false;

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const match = line.match(/^###\s*Requirement:\s*(.+)\s*$/i);

    if (match) {
      if (currentBlock) {
        blocks.push({
          name: currentBlock.name,
          normalizedName: currentBlock.normalizedName,
          raw: currentBlock.lines.join('\n'),
          startIndex: currentBlock.startIndex,
        });
      }
      foundFirstReq = true;
      currentBlock = {
        name: match[1].trim(),
        normalizedName: normalizeName(match[1]),
        lines: [line],
        startIndex: i,
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    } else if (!foundFirstReq) {
      preambleLines.push(line);
    }
  }

  if (currentBlock) {
    blocks.push({
      name: currentBlock.name,
      normalizedName: currentBlock.normalizedName,
      raw: currentBlock.lines.join('\n'),
      startIndex: currentBlock.startIndex,
    });
  }

  return {
    before,
    reqHeaderLine,
    preamble: preambleLines.join('\n'),
    blocks,
    after,
  };
}

/**
 * 查找变更目录下所有待合并的 delta spec
 */
export function findSpecUpdates(changeDir: string, mainSpecsDir: string): Array<{
  source: string;
  target: string;
  capability: string;
  exists: boolean;
}> {
  const updates: Array<{
    source: string;
    target: string;
    capability: string;
    exists: boolean;
  }> = [];

  const specsDir = join(changeDir, 'specs');

  if (!existsSync(specsDir)) {
    return updates;
  }

  const entries = readdirSync(specsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sourcePath = join(specsDir, entry.name, 'spec.md');
    if (!existsSync(sourcePath)) continue;

    const targetPath = join(mainSpecsDir, entry.name, 'spec.md');
    const targetExists = existsSync(targetPath);

    updates.push({
      source: sourcePath,
      target: targetPath,
      capability: entry.name,
      exists: targetExists,
    });
  }

  return updates;
}

/**
 * 构建 delta spec 的 requirement blocks
 */
function extractDeltaRequirements(delta: ParsedDeltaSpec): RequirementBlock[] {
  return [
    ...delta.added,
    ...delta.modified,
    ...delta.removed,
    ...delta.renamed,
  ];
}

/**
 * 构建合并后的 spec 内容
 *
 * @param deltaContent - delta spec 的 Markdown 内容
 * @param mainContent - 主 spec 的 Markdown 内容（可选，新 spec 时为空）
 * @param capability - capability 名称
 * @param changeName - 变更名称
 * @returns 合并结果
 */
export function buildUpdatedSpec(
  deltaContent: string,
  mainContent: string | undefined,
  capability: string,
  changeName: string,
): { rebuilt: string; counts: ApplyCounts; isNew: boolean } {
  const delta = parseDeltaSpec(deltaContent);
  const issues = validateDeltaSpec(delta);
  if (issues.length > 0) {
    throw new Error(`Delta spec 校验失败: ${issues.join('; ')}`);
  }

  let isNew = false;
  let content: string;

  if (!mainContent) {
    // 新 spec：不允许 MODIFIED/RENAMED
    if (delta.modified.length > 0 || delta.renamed.length > 0) {
      throw new Error(
        `${capability}: 主 spec 不存在，只允许 ADDED 操作。MODIFIED 和 RENAMED 需要已有 spec。`
      );
    }
    isNew = true;
    const purpose = delta.purpose ?? `TBD - created by archiving change ${changeName}.`;
    content = `# ${capability}\n\n## Purpose\n\n${purpose}\n\n## Requirements\n`;
  } else {
    content = mainContent;
  }

  // 解析主 spec 的 Requirements section
  const parsed = extractMainRequirements(content);
  const nameToBlock = new Map<string, MainRequirementBlock>();
  for (const block of parsed.blocks) {
    nameToBlock.set(block.normalizedName, block);
  }

  // 按顺序执行操作：RENAMED → REMOVED → MODIFIED → ADDED

  // RENAMED
  for (const ren of delta.renamed) {
    const fromNorm = normalizeName(ren.meta?.from ?? ren.name);
    const toName = ren.meta?.to ?? ren.name;
    if (!nameToBlock.has(fromNorm)) {
      throw new Error(`${capability} RENAMED 失败: "${ren.meta?.from}" 未找到`);
    }
    if (nameToBlock.has(normalizeName(toName))) {
      throw new Error(`${capability} RENAMED 失败: "${toName}" 已存在`);
    }
    const block = nameToBlock.get(fromNorm)!;
    const newHeader = `### Requirement: ${toName}`;
    const rawLines = block.raw.split('\n');
    rawLines[0] = newHeader;
    nameToBlock.delete(fromNorm);
    nameToBlock.set(normalizeName(toName), {
      ...block,
      name: toName,
      normalizedName: normalizeName(toName),
      raw: rawLines.join('\n'),
    });
  }

  // REMOVED
  for (const rem of delta.removed) {
    const key = normalizeName(rem.name);
    if (!nameToBlock.has(key)) {
      if (!isNew) {
        throw new Error(`${capability} REMOVED 失败: "${rem.name}" 未找到`);
      }
      continue; // 新 spec 忽略 REMOVED
    }
    nameToBlock.delete(key);
  }

  // MODIFIED
  for (const mod of delta.modified) {
    const key = normalizeName(mod.name);
    if (!nameToBlock.has(key)) {
      throw new Error(`${capability} MODIFIED 失败: "${mod.name}" 未找到`);
    }
    // 替换为 delta 中的完整内容
    nameToBlock.set(key, {
      name: mod.name,
      normalizedName: key,
      raw: mod.content,
      startIndex: nameToBlock.get(key)!.startIndex,
    });
  }

  // ADDED
  for (const add of delta.added) {
    const key = normalizeName(add.name);
    if (nameToBlock.has(key)) {
      throw new Error(`${capability} ADDED 失败: "${add.name}" 已存在`);
    }
    nameToBlock.set(key, {
      name: add.name,
      normalizedName: key,
      raw: add.content,
      startIndex: -1, // 新增的，排在最后
    });
  }

  // 重组 Requirements section，保持原有顺序
  const keptOrder: MainRequirementBlock[] = [];
  const seen = new Set<string>();

  // 先按原有顺序
  for (const block of parsed.blocks) {
    const replacement = nameToBlock.get(block.normalizedName);
    if (replacement) {
      keptOrder.push(replacement);
      seen.add(block.normalizedName);
    }
  }

  // 追加新增的
  for (const [, block] of nameToBlock) {
    if (!seen.has(block.normalizedName)) {
      keptOrder.push(block);
    }
  }

  // 重组内容
  const reqBody = [parsed.preamble.trim()]
    .filter(Boolean)
    .concat(keptOrder.map(b => b.raw))
    .join('\n\n')
    .trimEnd();

  const parts = [parsed.before.trimEnd(), parsed.reqHeaderLine, reqBody];
  if (parsed.after.trim()) {
    parts.push(parsed.after.trim());
  }

  const rebuilt = parts
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n');

  return {
    rebuilt,
    counts: {
      added: delta.added.length,
      modified: delta.modified.length,
      removed: delta.removed.length,
      renamed: delta.renamed.length,
    },
    isNew,
  };
}

/**
 * Apply 所有 delta spec（dry-run 或实际写入）
 *
 * @param projectRoot - 项目根目录
 * @param changeName - 变更名称
 * @param options - 选项
 * @returns apply 结果
 */
export async function applySpecs(
  projectRoot: string,
  changeName: string,
  options: {
    dryRun?: boolean;
    skipValidation?: boolean;
  } = {},
): Promise<SpecsApplyOutput> {
  const changeDir = join(projectRoot, '.superspec', 'changes', changeName);
  const mainSpecsDir = join(projectRoot, '.superspec', 'specs');

  if (!existsSync(changeDir)) {
    throw new Error(`变更不存在: ${changeName}`);
  }

  const updates = findSpecUpdates(changeDir, mainSpecsDir);

  if (updates.length === 0) {
    return {
      changeName,
      capabilities: [],
      totals: { added: 0, modified: 0, removed: 0, renamed: 0 },
      noChanges: true,
    };
  }

  const capabilities: SpecApplyResult[] = [];
  const totals: ApplyCounts = { added: 0, modified: 0, removed: 0, renamed: 0 };

  for (const update of updates) {
    const deltaContent = readFileSync(update.source, 'utf-8');
    const mainContent = update.exists ? readFileSync(update.target, 'utf-8') : undefined;

    const result = buildUpdatedSpec(deltaContent, mainContent, update.capability, changeName);

    // 写入
    if (!options.dryRun) {
      const targetDir = dirname(update.target);
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(update.target, result.rebuilt, 'utf-8');
    }

    capabilities.push({
      capability: update.capability,
      isNew: result.isNew,
      counts: result.counts,
      rebuilt: result.rebuilt,
    });

    totals.added += result.counts.added;
    totals.modified += result.counts.modified;
    totals.removed += result.counts.removed;
    totals.renamed += result.counts.renamed;
  }

  return {
    changeName,
    capabilities,
    totals,
    noChanges: false,
  };
}
