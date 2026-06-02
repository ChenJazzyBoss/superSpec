import { Spec } from './spec-schema.js';

interface Section {
  level: number;
  title: string;
  content: string;
  children: Section[];
}

/**
 * 将 content 中的换行符统一为 \n
 */
function normalizeContent(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

/**
 * 构建代码围栏掩码，标记属于代码块的行
 * 防止代码块内部的 # 被误识别为标题
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
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
  if (!fenceMatch) {
    return null;
  }
  return {
    marker: fenceMatch[1][0] as '`' | '~',
    length: fenceMatch[1].length,
  };
}

function isClosingFence(
  line: string,
  activeFence: { marker: '`' | '~'; length: number },
): boolean {
  const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  return Boolean(
    fenceMatch &&
      fenceMatch[1][0] === activeFence.marker &&
      fenceMatch[1].length >= activeFence.length,
  );
}

/**
 * 解析 Markdown 内容为层级 Section 树
 */
function parseSections(lines: string[], codeFenceLineMask: boolean[]): Section[] {
  const sections: Section[] = [];
  const stack: Section[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (codeFenceLineMask[i]) {
      continue;
    }
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      const content = getContentUntilNextHeader(lines, codeFenceLineMask, i + 1, level);

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
  codeFenceLineMask: boolean[],
  startLine: number,
  currentLevel: number,
): string {
  const contentLines: string[] = [];

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = codeFenceLineMask[i] ? null : line.match(/^(#{1,6})\s+/);

    if (headerMatch && headerMatch[1].length <= currentLevel) {
      break;
    }

    contentLines.push(line);
  }

  return contentLines.join('\n').trim();
}

/**
 * 在 Section 树中按标题名递归查找
 */
function findSection(sections: Section[], title: string): Section | undefined {
  for (const section of sections) {
    if (section.title.toLowerCase() === title.toLowerCase()) {
      return section;
    }
    const child = findSection(section.children, title);
    if (child) {
      return child;
    }
  }
  return undefined;
}

/**
 * 从标题中提取冒号后的名称
 * 例如 "Requirement: User Login" -> "User Login"
 *      "Scenario: Valid credentials" -> "Valid credentials"
 * 如果没有冒号则返回完整标题
 */
function extractNameFromTitle(title: string): string {
  const colonIndex = title.indexOf(':');
  if (colonIndex !== -1) {
    return title.substring(colonIndex + 1).trim();
  }
  return title.trim();
}

/**
 * 从需求 Section 的直接内容（不包含子 Section）中提取需求文本
 */
function extractRequirementText(section: Section): string {
  if (!section.content.trim()) {
    return '';
  }
  const lines = section.content.split('\n');
  const contentBeforeChildren: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('#')) {
      break;
    }
    contentBeforeChildren.push(line);
  }

  return contentBeforeChildren.join('\n').trim();
}

function parseScenarios(requirementSection: Section): { name: string; rawText: string }[] {
  const scenarios: { name: string; rawText: string }[] = [];

  for (const child of requirementSection.children) {
    if (child.content.trim()) {
      scenarios.push({
        name: extractNameFromTitle(child.title),
        rawText: child.content,
      });
    }
  }

  return scenarios;
}

function parseRequirements(section: Section): { name: string; text: string; scenarios: { name: string; rawText: string }[] }[] {
  const requirements: { name: string; text: string; scenarios: { name: string; rawText: string }[] }[] = [];

  for (const child of section.children) {
    const name = extractNameFromTitle(child.title);
    const text = extractRequirementText(child) || name;
    const scenarios = parseScenarios(child);

    requirements.push({ name, text, scenarios });
  }

  return requirements;
}

/**
 * 解析 Markdown 格式的 Spec 内容，返回符合 SpecSchema 的 Spec 对象
 *
 * 预期的 Markdown 结构：
 *   ## Purpose
 *   ...概述内容...
 *   ## Requirements
 *   ### Requirement: 需求名称
 *   包含 SHALL 或 MUST 的需求描述
 *   #### Scenario: 场景名称
 *   场景原始文本
 *
 * @param content Markdown 文本内容
 * @param name 规格名称
 */
export function parseSpec(content: string, name: string): Spec {
  const normalized = normalizeContent(content);
  const lines = normalized.split('\n');
  const codeFenceLineMask = buildCodeFenceMask(lines);
  const sections = parseSections(lines, codeFenceLineMask);

  const purposeSection = findSection(sections, 'Purpose');
  if (!purposeSection) {
    throw new Error('Spec must have a Purpose section');
  }

  const requirementsSection = findSection(sections, 'Requirements');
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
