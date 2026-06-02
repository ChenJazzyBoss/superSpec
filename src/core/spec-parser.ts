/**
 * Markdown Spec 解析器
 *
 * 将 Markdown 格式的 spec 文件解析为结构化数据。
 * 核心能力：Code Fence Masking、标题层级解析、Spec 结构提取。
 * 参考：OpenSpec markdown-parser.ts（裁剪版，只保留 Spec 解析）
 */

import type { Spec, Requirement, Scenario } from './spec-schema.js';

interface Section {
  level: number;
  title: string;
  content: string;
  children: Section[];
}

/**
 * 构建代码围栏掩码
 * 防止代码块内的 # 被误识别为标题
 */
function buildCodeFenceMask(lines: string[]): boolean[] {
  const mask = new Array(lines.length).fill(false);
  let activeFence: { marker: '`' | '~'; length: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const fence = getFenceMarker(lines[i]);

    if (!activeFence) {
      if (fence) {
        activeFence = fence;
        mask[i] = true;
      }
      continue;
    }

    mask[i] = true;
    if (isClosingFence(lines[i], activeFence)) {
      activeFence = null;
    }
  }

  return mask;
}

function getFenceMarker(line: string): { marker: '`' | '~'; length: number } | null {
  const match = line.match(/^\s*(`{3,}|~{3,})/);
  if (!match) return null;
  return {
    marker: match[1][0] as '`' | '~',
    length: match[1].length,
  };
}

function isClosingFence(
  line: string,
  activeFence: { marker: '`' | '~'; length: number }
): boolean {
  const match = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  return Boolean(
    match && match[1][0] === activeFence.marker && match[1].length >= activeFence.length
  );
}

/**
 * 解析 Markdown 标题层级结构
 */
function parseSections(lines: string[], codeFenceMask: boolean[]): Section[] {
  const sections: Section[] = [];
  const stack: Section[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (codeFenceMask[i]) continue;

    const headerMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      const content = getContentUntilNextHeader(lines, codeFenceMask, i + 1, level);

      const section: Section = { level, title, content, children: [] };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        sections.push(section);
      } else {
        stack[stack.length - 1].children.push(section);
      }

      stack.push(section);
    }
  }

  return sections;
}

function getContentUntilNextHeader(
  lines: string[],
  codeFenceMask: boolean[],
  startLine: number,
  currentLevel: number
): string {
  const contentLines: string[] = [];

  for (let i = startLine; i < lines.length; i++) {
    if (codeFenceMask[i]) {
      contentLines.push(lines[i]);
      continue;
    }

    const headerMatch = lines[i].match(/^(#{1,6})\s+/);
    if (headerMatch && headerMatch[1].length <= currentLevel) break;

    contentLines.push(lines[i]);
  }

  return contentLines.join('\n').trim();
}

function findSection(sections: Section[], title: string): Section | undefined {
  for (const section of sections) {
    if (section.title.toLowerCase() === title.toLowerCase()) return section;
    const child = findSection(section.children, title);
    if (child) return child;
  }
  return undefined;
}

function parseRequirements(section: Section): Requirement[] {
  const requirements: Requirement[] = [];

  for (const child of section.children) {
    let text = child.title;

    if (child.content.trim()) {
      const lines = child.content.split('\n');
      const contentBeforeChildren: string[] = [];

      for (const line of lines) {
        if (line.trim().startsWith('#')) break;
        contentBeforeChildren.push(line);
      }

      const directContent = contentBeforeChildren.join('\n').trim();
      if (directContent) {
        const firstLine = directContent.split('\n').find(l => l.trim());
        if (firstLine) text = firstLine.trim();
      }
    }

    const scenarios = parseScenarios(child);
    requirements.push({ name: child.title, text, scenarios });
  }

  return requirements;
}

function parseScenarios(section: Section): Scenario[] {
  const scenarios: Scenario[] = [];

  for (const child of section.children) {
    if (child.content.trim()) {
      scenarios.push({
        name: child.title,
        rawText: child.content,
      });
    }
  }

  return scenarios;
}

export function parseSpec(content: string, name: string): Spec {
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const codeFenceMask = buildCodeFenceMask(lines);
  const sections = parseSections(lines, codeFenceMask);

  const purposeSection = findSection(sections, 'Purpose');
  const requirementsSection = findSection(sections, 'Requirements');

  if (!purposeSection) {
    throw new Error('Spec must have a Purpose section');
  }

  if (!requirementsSection) {
    throw new Error('Spec must have a Requirements section');
  }

  const overview = purposeSection.content.trim();
  const requirements = parseRequirements(requirementsSection);

  return {
    name,
    overview,
    requirements,
    metadata: {
      version: '1.0.0',
      format: 'superspec',
    },
  };
}
