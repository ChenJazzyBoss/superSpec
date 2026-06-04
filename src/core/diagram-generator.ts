/**
 * 图表自动生成器
 *
 * 检测 spec 内容中的 <!-- DIAGRAM:xxx --> 标记，
 * 调用对应的图表生成器，将 Mermaid 代码嵌入 spec 文件。
 */

import type { Spec } from './spec-schema.js';
import { generateFlowchart } from './diagrams/flowchart.js';

/** 支持的图表类型 */
type DiagramType = 'flowchart' | 'state';

/** 图表标记正则：匹配 <!-- DIAGRAM:flowchart --> 或 <!-- DIAGRAM:state --> */
const DIAGRAM_MARKER_RE = /<!--\s*DIAGRAM:(\w+)\s*-->/g;

/** 已有 Mermaid 代码块正则 */
const MERMAID_BLOCK_RE = /```mermaid\n[\s\S]*?```/g;

/**
 * 从 spec 内容中提取所有图表标记
 */
export function extractDiagramMarkers(content: string): DiagramType[] {
  const markers: DiagramType[] = [];
  let match;
  const re = new RegExp(DIAGRAM_MARKER_RE.source, 'g');
  while ((match = re.exec(content)) !== null) {
    const type = match[1] as DiagramType;
    if (type === 'flowchart' || type === 'state') {
      markers.push(type);
    }
  }
  return markers;
}

/**
 * 生成指定类型的 Mermaid 图表代码
 */
export function generateDiagram(type: DiagramType, spec: Spec): string {
  switch (type) {
    case 'flowchart':
      return generateFlowchart(spec);
    case 'state':
      return generateStateFromSpec(spec);
    default:
      return `<!-- 不支持的图表类型: ${type} -->`;
  }
}

/**
 * 从 Spec 内容生成简单的状态图
 * 提取需求中的状态转换关键词
 */
function generateStateFromSpec(spec: Spec): string {
  const lines: string[] = [];
  lines.push('stateDiagram-v2');
  lines.push('  [*] --> 待处理');

  for (const req of spec.requirements) {
    for (const scenario of req.scenarios) {
      // 从 rawText 的 Then 部分提取状态
      const thenMatch = scenario.rawText.match(/Then\s+.*?(?:进入|变为|转为|状态为?|迁移到)\s*[「""]?([^」""\s]+)[」""]?/i);
      if (thenMatch) {
        const state = thenMatch[1];
        lines.push(`  待处理 --> ${state} : ${scenario.name}`);
      }
    }
  }

  if (lines.length === 2) {
    lines.push('  待处理 --> 完成 : 执行完成');
  }

  lines.push('  完成 --> [*]');
  return lines.join('\n');
}

/**
 * 将图表代码嵌入 spec 内容
 *
 * 规则：
 * 1. 找到 <!-- DIAGRAM:xxx --> 标记
 * 2. 检查标记后面是否已有 Mermaid 代码块
 * 3. 有则替换，无则在标记后插入
 */
export function embedDiagrams(content: string, spec: Spec): string {
  let result = content;
  const markers = extractDiagramMarkers(content);

  for (const type of markers) {
    const diagramCode = generateDiagram(type, spec);
    const mermaidBlock = '```mermaid\n' + diagramCode + '\n```';

    // 找到对应的标记行
    const markerPattern = new RegExp(`(<!--\\s*DIAGRAM:${type}\\s*-->)`);
    const markerMatch = result.match(markerPattern);

    if (!markerMatch) continue;

    const markerIndex = result.indexOf(markerMatch[0]);
    const afterMarker = result.slice(markerIndex + markerMatch[0].length);

    // 检查标记后是否有 Mermaid 代码块
    const mermaidMatch = afterMarker.match(/^\s*\n```mermaid\n[\s\S]*?```/);

    if (mermaidMatch) {
      // 替换已有的 Mermaid 代码块
      const replaceStart = markerIndex + markerMatch[0].length + afterMarker.indexOf(mermaidMatch[0]);
      const replaceEnd = replaceStart + mermaidMatch[0].length;
      result = result.slice(0, replaceStart) + '\n\n' + mermaidBlock + result.slice(replaceEnd);
    } else {
      // 在标记后插入新的 Mermaid 代码块
      const insertPoint = markerIndex + markerMatch[0].length;
      result = result.slice(0, insertPoint) + '\n\n' + mermaidBlock + result.slice(insertPoint);
    }
  }

  return result;
}
