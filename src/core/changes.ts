/**
 * 变更目录管理
 *
 * 列出进行中的变更，检查变更状态。
 * 变更目录结构：.superspec/changes/<name>/
 *   - delta.json: 变更描述
 *   - metadata.yaml: 变更元数据（可选）
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { DeltaSchema } from './delta-schema.js';

export interface ChangeInfo {
  name: string;
  specName: string;
  createdAt: string;
  status: 'pending' | 'ready' | 'conflict';
}

/**
 * 解析 metadata.yaml（简单 key: value 格式）
 */
function parseMetadataYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * 检查变更状态
 *
 * - ready: delta.json 存在且格式正确
 * - conflict: delta.json 存在但格式不正确
 * - pending: delta.json 不存在（仅有 metadata）
 */
function detectStatus(changeDir: string): ChangeInfo['status'] {
  const deltaPath = join(changeDir, 'delta.json');

  if (!existsSync(deltaPath)) {
    return 'pending';
  }

  try {
    const deltaJson = readFileSync(deltaPath, 'utf-8');
    const parsed = JSON.parse(deltaJson);
    DeltaSchema.parse(parsed);
    return 'ready';
  } catch {
    return 'conflict';
  }
}

/**
 * 列出所有进行中的变更
 *
 * 扫描 .superspec/changes/ 目录，解析每个子目录的元数据和状态。
 * 跳过 archive 子目录。
 */
export function listChanges(projectRoot: string): ChangeInfo[] {
  const changesDir = join(projectRoot, '.superspec', 'changes');

  if (!existsSync(changesDir)) {
    return [];
  }

  const entries = readdirSync(changesDir);
  const changes: ChangeInfo[] = [];

  for (const entry of entries) {
    // 跳过 archive 目录
    if (entry === 'archive') continue;

    const entryPath = join(changesDir, entry);

    // 只处理目录
    try {
      if (!statSync(entryPath).isDirectory()) continue;
    } catch {
      continue;
    }

    const metadataPath = join(entryPath, 'metadata.yaml');
    const deltaPath = join(entryPath, 'delta.json');

    let specName = '';
    let createdAt = '';

    // 尝试从 metadata.yaml 读取
    if (existsSync(metadataPath)) {
      try {
        const content = readFileSync(metadataPath, 'utf-8');
        const metadata = parseMetadataYaml(content);
        specName = metadata['spec'] ?? metadata['specName'] ?? '';
        createdAt = metadata['createdAt'] ?? metadata['created'] ?? '';
      } catch {
        // 解析失败，继续处理
      }
    }

    // 如果 metadata 中没有 specName，尝试从 delta.json 读取
    if (!specName && existsSync(deltaPath)) {
      try {
        const deltaJson = readFileSync(deltaPath, 'utf-8');
        const parsed = JSON.parse(deltaJson);
        const delta = DeltaSchema.parse(parsed);
        specName = delta.specName;
      } catch {
        // 解析失败，继续处理
      }
    }

    // 如果没有 createdAt，使用目录的创建时间
    if (!createdAt) {
      try {
        const stats = statSync(entryPath);
        createdAt = stats.birthtime.toISOString();
      } catch {
        createdAt = '';
      }
    }

    const status = detectStatus(entryPath);

    changes.push({
      name: entry,
      specName,
      createdAt,
      status,
    });
  }

  return changes.sort((a, b) => {
    // 按创建时间倒序排列
    if (a.createdAt && b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return a.name.localeCompare(b.name);
  });
}
