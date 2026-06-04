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
 * 排除反引号内的标记（需求描述中的示例）
 */
export function extractDiagramMarkers(content: string): DiagramType[] {
  const markers: DiagramType[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // 跳过包含反引号的行（需求描述中的示例）
    if (line.includes('`')) continue;

    let match;
    const re = new RegExp(DIAGRAM_MARKER_RE.source, 'g');
    while ((match = re.exec(line)) !== null) {
      const type = match[1] as DiagramType;
      if (type === 'flowchart' || type === 'state') {
        markers.push(type);
      }
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
 * 2. 检查标记后面紧邻的 3 行内是否有 Mermaid 代码块
 * 3. 有则替换，无则在标记后插入
 *
 * 只检查标记后紧邻的区域，避免误匹配到需求描述中的 mermaid 示例。
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

    // 只检查标记后紧邻的区域（最多 5 行），避免误匹配需求描述中的 mermaid 示例
    const nearbyLines = afterMarker.split('\n').slice(0, 5).join('\n');
    const mermaidMatch = nearbyLines.match(/^\s*\n```mermaid\n[\s\S]*?```/);

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
