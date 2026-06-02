/**
 * 变更归档系统
 *
 * 将已完成的变更应用到 spec 并归档。
 * 流程：读取 delta.json -> 合并到 spec -> 归档变更目录 -> 保存快照 -> 校验
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
  rmSync,
} from 'fs';
import { join } from 'path';
import { applyDelta } from './delta-merge.js';
import { DeltaSchema, type Delta } from './delta-schema.js';
import { parseSpec } from './spec-parser.js';
import { generateSpecContent } from './delta-markdown.js';
import { Validator } from './validator.js';

export interface ArchiveResult {
  name: string;
  specName: string;
  changesCount: number;
  archivePath: string;
  validationPassed: boolean;
}

/**
 * 生成归档目录名：YYYY-MM-DD-<name>
 */
function getArchiveDirName(name: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}-${name}`;
}

/**
 * 归档已完成的变更
 *
 * 1. 读取 delta.json
 * 2. 读取当前 spec
 * 3. 调用 applyDelta 合并
 * 4. 写入更新后的 spec
 * 5. 创建归档目录
 * 6. 移动变更文件到归档目录
 * 7. 保存快照
 * 8. 运行校验
 */
export async function archiveChange(
  projectRoot: string,
  changeName: string
): Promise<ArchiveResult> {
  const changesDir = join(projectRoot, '.superspec', 'changes', changeName);
  const deltaPath = join(changesDir, 'delta.json');
  const archiveBase = join(projectRoot, '.superspec', 'changes', 'archive');

  // 1. 读取 delta.json
  if (!existsSync(deltaPath)) {
    throw new Error(`变更目录不存在或缺少 delta.json: ${changesDir}`);
  }

  let delta: Delta;
  try {
    const deltaJson = readFileSync(deltaPath, 'utf-8');
    delta = DeltaSchema.parse(JSON.parse(deltaJson));
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    throw new Error(`读取 delta.json 失败: ${message}`);
  }

  const specName = delta.specName;
  const specPath = join(projectRoot, '.superspec', 'specs', specName, 'spec.md');

  // 2. 读取当前 spec
  if (!existsSync(specPath)) {
    throw new Error(`spec 文件不存在: ${specPath}`);
  }

  const specContent = readFileSync(specPath, 'utf-8');
  const spec = parseSpec(specContent, specName);

  // 3. 调用 applyDelta 合并
  const updated = applyDelta(spec, delta);

  // 4. 写入更新后的 spec
  const newContent = generateSpecContent(updated);
  writeFileSync(specPath, newContent, 'utf-8');

  // 5. 创建归档目录
  const archiveDirName = getArchiveDirName(changeName);
  const archivePath = join(archiveBase, archiveDirName);
  if (!existsSync(archivePath)) {
    mkdirSync(archivePath, { recursive: true });
  }

  // 6. 复制变更文件到归档目录
  const files = readdirSync(changesDir);
  for (const file of files) {
    const src = join(changesDir, file);
    const dest = join(archivePath, file);
    copyFileSync(src, dest);
  }

  // 7. 保存合并后的快照到归档目录
  const snapshotPath = join(archivePath, 'merged-spec.md');
  writeFileSync(snapshotPath, newContent, 'utf-8');

  // 删除原始变更目录
  try {
    rmSync(changesDir, { recursive: true, force: true });
  } catch {
    // 删除失败不影响归档结果
  }

  // 8. 运行校验
  const validator = new Validator(false);
  const report = await validator.validateSpec(specPath, specName);
  const validationPassed = report.valid;

  if (!validationPassed) {
    console.warn(
      `校验未通过: ${report.summary.errors} error, ${report.summary.warnings} warning`
    );
    for (const issue of report.issues) {
      if (issue.level === 'ERROR') {
        console.warn(`  ERROR: ${issue.message}`);
      }
    }
  }

  return {
    name: changeName,
    specName,
    changesCount: delta.changes.length,
    archivePath,
    validationPassed,
  };
}
