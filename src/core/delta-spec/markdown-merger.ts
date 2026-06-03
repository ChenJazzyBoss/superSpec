import * as fs from 'fs';
import * as path from 'path';
import { DeltaSpec, DeltaOperation, AddedOperation, ModifiedOperation, RemovedOperation, RenamedOperation } from './types';
import { validateDeltaFormat } from './validator';

/**
 * Markdown 章节
 */
interface MarkdownSection {
  heading: string;     // 完整标题行 "## xxx"
  level: number;       // 标题层级 1-6
  content: string;     // 章节内容（不含标题行，保留尾部换行）
  startLine: number;   // 起始行号
  endLine: number;     // 结束行号（不含）
}

/**
 * 将 Markdown 拆分为章节
 */
export function parseMarkdownSections(content: string): MarkdownSection[] {
  const lines = content.split('\n');
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      if (current) {
        current.endLine = i;
        sections.push(current);
      }
      current = {
        heading: line,
        level: headingMatch[1].length,
        content: '',
        startLine: i,
        endLine: -1,
      };
    } else if (current) {
      current.content += line + '\n';
    }
  }

  if (current) {
    current.endLine = lines.length;
    sections.push(current);
  }

  return sections;
}

/**
 * 在 sections 中查找匹配的章节
 * path 格式: "需求名称" 或 "父章节/子章节"
 */
export function findSection(sections: MarkdownSection[], sectionPath: string): MarkdownSection | undefined {
  // 支持 "父/子" 格式：先找父，再在父之后找子
  const parts = sectionPath.split('/');
  let searchFrom = 0;
  let found: MarkdownSection | undefined;

  for (const part of parts) {
    const partLower = part.toLowerCase();
    found = sections.slice(searchFrom).find(s => {
      const titleText = s.heading.replace(/^#{1,6}\s+/, '').toLowerCase();
      return titleText.includes(partLower) || partLower.includes(titleText);
    });
    if (!found) return undefined;
    searchFrom = sections.indexOf(found) + 1;
  }

  return found;
}

/**
 * 将 sections 重组为 Markdown 文本
 */
export function assembleMarkdown(sections: MarkdownSection[]): string {
  return sections.map(s => s.heading + '\n' + s.content).join('');
}

/**
 * 从 path 中提取章节名（取最后一段）
 */
function extractSectionName(sectionPath: string): string {
  const parts = sectionPath.split('/');
  return parts[parts.length - 1];
}

/**
 * 应用 ADDED 操作
 */
function applyAdded(sections: MarkdownSection[], op: AddedOperation): MarkdownSection[] {
  const newContent = op.content;
  const newLines = newContent.split('\n');
  const headingLine = newLines.find(l => l.match(/^#{1,6}\s+/)) || `## ${extractSectionName(op.path)}`;
  const headingLevel = (headingLine.match(/^(#{1,6})/) || ['##', '##'])[1].length;
  const bodyLines = newLines.filter(l => !l.match(/^#{1,6}\s+/));
  const body = bodyLines.join('\n').trim() + '\n';

  const newSection: MarkdownSection = {
    heading: headingLine,
    level: headingLevel,
    content: body ? '\n' + body : '\n',
    startLine: -1,
    endLine: -1,
  };

  // 在目标章节后插入
  const target = findSection(sections, op.path);
  if (target) {
    const targetIndex = sections.indexOf(target);
    const newSections = [...sections];
    newSections.splice(targetIndex + 1, 0, newSection);
    return newSections;
  }

  return [...sections, newSection];
}

/**
 * 应用 MODIFIED 操作
 */
function applyModified(sections: MarkdownSection[], op: ModifiedOperation): MarkdownSection[] {
  const target = findSection(sections, op.path);
  if (!target) {
    console.warn(`[delta-merge] MODIFIED 目标未找到: ${op.path}`);
    return sections;
  }

  const targetIndex = sections.indexOf(target);
  const newSections = [...sections];

  // after 是完整的新章节内容（包含标题）
  const afterLines = op.after.split('\n');
  const headingLine = afterLines.find(l => l.match(/^#{1,6}\s+/));
  if (headingLine) {
    const headingLevel = (headingLine.match(/^(#{1,6})/) || ['##', '##'])[1].length;
    const bodyLines = afterLines.filter(l => !l.match(/^#{1,6}\s+/));
    newSections[targetIndex] = {
      heading: headingLine,
      level: headingLevel,
      content: bodyLines.join('\n').trim() + '\n',
      startLine: target.startLine,
      endLine: target.endLine,
    };
  } else {
    // 没有标题，只替换内容
    newSections[targetIndex] = {
      ...target,
      content: op.after.trim() + '\n',
    };
  }

  return newSections;
}

/**
 * 应用 REMOVED 操作
 */
function applyRemoved(sections: MarkdownSection[], op: RemovedOperation): MarkdownSection[] {
  const target = findSection(sections, op.path);
  if (!target) {
    console.warn(`[delta-merge] REMOVED 目标未找到: ${op.path}`);
    return sections;
  }

  const targetIndex = sections.indexOf(target);
  const targetLevel = target.level;

  // 删除目标章节及其所有子章节
  let endIndex = targetIndex + 1;
  while (endIndex < sections.length && sections[endIndex].level > targetLevel) {
    endIndex++;
  }

  const newSections = [...sections];
  newSections.splice(targetIndex, endIndex - targetIndex);
  return newSections;
}

/**
 * 应用 RENAMED 操作
 */
function applyRenamed(sections: MarkdownSection[], op: RenamedOperation): MarkdownSection[] {
  const target = findSection(sections, op.oldPath);
  if (!target) {
    console.warn(`[delta-merge] RENAMED 目标未找到: ${op.oldPath}`);
    return sections;
  }

  const targetIndex = sections.indexOf(target);
  const newSections = [...sections];
  const prefix = target.heading.match(/^#{1,6}/)?.[0] || '##';
  const newName = extractSectionName(op.newPath);
  newSections[targetIndex] = {
    ...target,
    heading: `${prefix} ${newName}`,
  };
  return newSections;
}

/**
 * 将 DeltaSpec 应用到 Markdown 能力 spec
 *
 * @param specPath — 能力 spec 文件路径
 * @param delta    — DeltaSpec 对象
 * @returns 合并后的 Markdown 文本（不写入文件）
 */
export function applyDeltaToMarkdown(specPath: string, delta: DeltaSpec): string {
  const validation = validateDeltaFormat(delta);
  if (!validation.valid) {
    throw new Error(`Delta 格式校验失败: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  const content = fs.readFileSync(specPath, 'utf-8');
  let sections = parseMarkdownSections(content);

  for (const op of delta.operations) {
    switch (op.operation) {
      case 'ADDED':
        sections = applyAdded(sections, op);
        break;
      case 'MODIFIED':
        sections = applyModified(sections, op);
        break;
      case 'REMOVED':
        sections = applyRemoved(sections, op);
        break;
      case 'RENAMED':
        sections = applyRenamed(sections, op);
        break;
    }
  }

  return assembleMarkdown(sections);
}

/**
 * 合并 delta 到 specs 目录
 */
export function mergeDeltaToSpecs(
  specsDir: string,
  delta: DeltaSpec
): { merged: boolean; specPath: string; content: string; warnings: string[] } {
  const warnings: string[] = [];

  // 从 baseSpec 提取文件名
  const baseName = path.basename(delta.baseSpec, '.md').toLowerCase();
  const possibleFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));

  const targetFile = possibleFiles.find(f => {
    const name = f.replace('.md', '').toLowerCase();
    return name.includes(baseName) || baseName.includes(name);
  });

  if (!targetFile) {
    if (delta.operations.some(op => op.operation === 'REMOVED' || op.operation === 'MODIFIED' || op.operation === 'RENAMED')) {
      throw new Error(`目标 spec "${delta.baseSpec}" 不存在，但 delta 包含修改/删除/重命名操作`);
    }

    const newSpecPath = path.join(specsDir, `${baseName}.md`);
    const addedContent = delta.operations
      .filter((op): op is AddedOperation => op.operation === 'ADDED')
      .map(op => op.content)
      .join('\n\n');

    return {
      merged: true,
      specPath: newSpecPath,
      content: addedContent,
      warnings: [`目标 spec 不存在，将创建新文件: ${baseName}.md`],
    };
  }

  const specPath = path.join(specsDir, targetFile);
  const mergedContent = applyDeltaToMarkdown(specPath, delta);

  return {
    merged: true,
    specPath,
    content: mergedContent,
    warnings,
  };
}
