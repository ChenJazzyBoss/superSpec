/**
 * spec 快照管理
 *
 * 在 spec 校验通过时，自动保存一份快照到 history/ 目录。
 * 快照文件名格式：YYYY-MM-DDTHH-mm-ss.md
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

function getTimestampFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}-${min}-${s}.md`;
}

export function saveSnapshot(specPath: string, specName: string): string | null {
  try {
    const content = readFileSync(specPath, 'utf-8');
    const specDir = join(specPath, '..');
    const historyDir = join(specDir, 'history');

    if (!existsSync(historyDir)) {
      mkdirSync(historyDir, { recursive: true });
    }

    const filename = getTimestampFilename();
    const snapshotPath = join(historyDir, filename);
    writeFileSync(snapshotPath, content, 'utf-8');
    return snapshotPath;
  } catch {
    return null;
  }
}

export function listSnapshots(specDir: string): string[] {
  const historyDir = join(specDir, 'history');
  if (!existsSync(historyDir)) return [];

  try {
    return readdirSync(historyDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function getLatestSnapshot(specDir: string): string | null {
  const snapshots = listSnapshots(specDir);
  if (snapshots.length === 0) return null;

  try {
    return readFileSync(join(specDir, 'history', snapshots[0]), 'utf-8');
  } catch {
    return null;
  }
}

export function readSnapshot(specDir: string, filename: string): string | null {
  try {
    return readFileSync(join(specDir, 'history', filename), 'utf-8');
  } catch {
    return null;
  }
}
