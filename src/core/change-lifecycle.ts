/**
 * 变更目录生命周期管理
 *
 * 管理变更目录的创建、查询、状态跟踪。
 * 借鉴 OpenSpec 的统一变更模型：
 *   .superspec/changes/<name>/
 *     ├── proposal.md    — 变更提案（为什么做、做什么、影响）
 *     ├── specs/          — Delta Spec（ADDED/MODIFIED/REMOVED/RENAMED）
 *     │   └── <capability>/spec.md
 *     └── plan.md         — 实现计划（可选）
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 变更阶段 */
export type ChangePhase =
  | 'proposal'    // 仅有 proposal.md
  | 'spec'        // 有 delta spec
  | 'plan'        // 有实现计划
  | 'implement'   // 实施中
  | 'verify'      // 验证中
  | 'ready';      // 就绪可归档

/** 变更信息 */
export interface ChangeInfo {
  /** 变更名称 */
  name: string;
  /** 当前阶段 */
  phase: ChangePhase;
  /** 关联的 capability 列表 */
  capabilities: string[];
  /** 变更目录路径 */
  path: string;
}

/** Proposal 内容 */
export interface Proposal {
  /** 为什么做 */
  why: string;
  /** 改什么 */
  whatChanges: string;
  /** 新建的 capability */
  newCapabilities: string[];
  /** 修改的 capability */
  modifiedCapabilities: string[];
  /** 影响范围 */
  impact: string;
}

/**
 * 创建变更目录
 *
 * @param projectRoot - 项目根目录
 * @param name - 变更名称（kebab-case）
 * @param proposal - 变更提案内容
 * @returns 创建的变更目录路径
 * @throws 如果变更目录已存在
 */
export function createChange(
  projectRoot: string,
  name: string,
  proposal: Proposal,
): string {
  const changeDir = join(projectRoot, '.superspec', 'changes', name);

  if (existsSync(changeDir)) {
    throw new Error(`变更目录已存在: ${changeDir}`);
  }

  // 创建目录结构
  mkdirSync(changeDir, { recursive: true });
  mkdirSync(join(changeDir, 'specs'), { recursive: true });

  // 生成 proposal.md
  const proposalContent = generateProposalMarkdown(name, proposal);
  writeFileSync(join(changeDir, 'proposal.md'), proposalContent, 'utf-8');

  return changeDir;
}

/**
 * 查询变更的当前阶段
 *
 * @param changeDir - 变更目录路径
 * @returns 变更阶段
 */
export function getChangePhase(changeDir: string): ChangePhase {
  if (!existsSync(changeDir)) {
    throw new Error(`变更目录不存在: ${changeDir}`);
  }

  // 检查各阶段文件
  const hasPlan = existsSync(join(changeDir, 'plan.md'));
  const specsDir = join(changeDir, 'specs');

  let hasDeltaSpec = false;
  if (existsSync(specsDir)) {
    const entries = readdirSync(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && existsSync(join(specsDir, entry.name, 'spec.md'))) {
        hasDeltaSpec = true;
        break;
      }
    }
  }

  // 判断阶段（从后往前判断）
  if (hasPlan && hasDeltaSpec) return 'plan';
  if (hasDeltaSpec) return 'spec';
  return 'proposal';
}

/**
 * 列出变更目录下的所有 capability（delta spec）
 *
 * @param changeDir - 变更目录路径
 * @returns capability 名称列表
 */
export function listChangeCapabilities(changeDir: string): string[] {
  const specsDir = join(changeDir, 'specs');

  if (!existsSync(specsDir)) {
    return [];
  }

  const capabilities: string[] = [];
  const entries = readdirSync(specsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && existsSync(join(specsDir, entry.name, 'spec.md'))) {
      capabilities.push(entry.name);
    }
  }

  return capabilities.sort();
}

/**
 * 获取变更信息
 *
 * @param projectRoot - 项目根目录
 * @param name - 变更名称
 * @returns 变更信息
 */
export function getChangeInfo(projectRoot: string, name: string): ChangeInfo {
  const changeDir = join(projectRoot, '.superspec', 'changes', name);

  if (!existsSync(changeDir)) {
    throw new Error(`变更不存在: ${name}`);
  }

  return {
    name,
    phase: getChangePhase(changeDir),
    capabilities: listChangeCapabilities(changeDir),
    path: changeDir,
  };
}

/**
 * 列出所有变更
 *
 * @param projectRoot - 项目根目录
 * @returns 变更信息列表
 */
export function listAllChanges(projectRoot: string): ChangeInfo[] {
  const changesDir = join(projectRoot, '.superspec', 'changes');

  if (!existsSync(changesDir)) {
    return [];
  }

  const changes: ChangeInfo[] = [];
  const entries = readdirSync(changesDir, { withFileTypes: true });

  for (const entry of entries) {
    // 跳过 archive 目录和非目录
    if (entry.name === 'archive' || !entry.isDirectory()) continue;

    const changeDir = join(changesDir, entry.name);

    try {
      changes.push({
        name: entry.name,
        phase: getChangePhase(changeDir),
        capabilities: listChangeCapabilities(changeDir),
        path: changeDir,
      });
    } catch {
      // 跳过无法解析的目录
    }
  }

  return changes;
}

/**
 * 为变更目录添加 delta spec 文件
 *
 * @param changeDir - 变更目录路径
 * @param capability - capability 名称
 * @param content - delta spec 的 Markdown 内容
 */
export function addDeltaSpec(
  changeDir: string,
  capability: string,
  content: string,
): void {
  const specDir = join(changeDir, 'specs', capability);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'spec.md'), content, 'utf-8');
}

/**
 * 读取变更目录下的 delta spec 内容
 *
 * @param changeDir - 变更目录路径
 * @param capability - capability 名称
 * @returns delta spec 的 Markdown 内容
 */
export function readDeltaSpec(changeDir: string, capability: string): string {
  const specPath = join(changeDir, 'specs', capability, 'spec.md');

  if (!existsSync(specPath)) {
    throw new Error(`Delta spec 不存在: ${specPath}`);
  }

  return readFileSync(specPath, 'utf-8');
}

/**
 * 生成 proposal.md 内容
 */
function generateProposalMarkdown(name: string, proposal: Proposal): string {
  const lines: string[] = [
    `# ${name}`,
    '',
    '## Why',
    '',
    proposal.why,
    '',
    '## What Changes',
    '',
    proposal.whatChanges,
    '',
    '## Capabilities',
    '',
  ];

  if (proposal.newCapabilities.length > 0) {
    lines.push('### New Capabilities');
    for (const cap of proposal.newCapabilities) {
      lines.push(`- \`${cap}\``);
    }
    lines.push('');
  }

  if (proposal.modifiedCapabilities.length > 0) {
    lines.push('### Modified Capabilities');
    for (const cap of proposal.modifiedCapabilities) {
      lines.push(`- \`${cap}\``);
    }
    lines.push('');
  }

  if (proposal.newCapabilities.length === 0 && proposal.modifiedCapabilities.length === 0) {
    lines.push('<!-- 无关联 capability -->');
    lines.push('');
  }

  lines.push('## Impact');
  lines.push('');
  lines.push(proposal.impact);
  lines.push('');

  return lines.join('\n');
}

/**
 * 格式化变更信息为可读输出
 *
 * @param info - 变更信息
 * @returns 格式化的字符串
 */
export function formatChangeInfo(info: ChangeInfo): string {
  const lines: string[] = [
    `变更: ${info.name}`,
    `阶段: ${info.phase}`,
    `路径: ${info.path}`,
  ];

  if (info.capabilities.length > 0) {
    lines.push(`Capabilities: ${info.capabilities.join(', ')}`);
  } else {
    lines.push('Capabilities: 无');
  }

  return lines.join('\n');
}
