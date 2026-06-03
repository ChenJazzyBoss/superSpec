/**
 * 图表集成器
 *
 * 将 Mermaid 图表嵌入到 Markdown 内容中。
 * 支持两种集成方式：
 * 1. 替换占位符：查找 <!-- DIAGRAM:type --> 占位符并替换为图表
 * 2. 追加到头部：在 Markdown 内容开头追加图表区块
 */

import { generateFlowchart, generateStateDiagram, generateDecisionDiagram } from './index.js';
import type { Spec } from '../spec-schema.js';
import type { ValidationReport } from '../validator.js';

/** 支持的图表类型 */
export type DiagramType = 'flowchart' | 'state' | 'decision' | 'test-coverage' | 'dependency';

/** 图表类型对应的中文标题 */
const DIAGRAM_TITLES: Record<DiagramType, string> = {
  flowchart: '任务分解图',
  state: '状态流转图',
  decision: '校验决策流程',
  'test-coverage': '测试覆盖度图',
  dependency: '依赖关系图',
};

/**
 * 构建 Mermaid 图表 Markdown 区块
 *
 * @param type - 图表类型
 * @param mermaidCode - Mermaid 代码字符串
 * @returns 格式化的 Markdown 图表区块
 */
function buildDiagramBlock(type: DiagramType, mermaidCode: string): string {
  const title = DIAGRAM_TITLES[type];
  return `## 📊 ${title}\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n\n`;
}

/**
 * 将图表嵌入 Markdown 内容
 *
 * 集成策略：
 * 1. 查找 `<!-- DIAGRAM:type -->` 占位符并替换为图表区块
 * 2. 未找到占位符时，在内容开头（第一个 `#` 标题之前）插入图表区块
 *
 * @param content - 原始 Markdown 内容
 * @param type - 图表类型
 * @param mermaidCode - Mermaid 代码字符串
 * @returns 嵌入图表后的 Markdown 内容
 */
export function embedDiagram(
  content: string,
  type: DiagramType,
  mermaidCode: string,
): string {
  const block = buildDiagramBlock(type, mermaidCode);
  const placeholder = `<!-- DIAGRAM:${type} -->`;

  // 策略 1：查找并替换匹配的占位符
  if (content.includes(placeholder)) {
    return content.replace(placeholder, block);
  }

  // 策略 2：追加到内容开头（第一个 # 标题之前）
  const headingIndex = content.search(/^#{1,6}\s/m);
  if (headingIndex !== -1) {
    return content.slice(0, headingIndex) + block + content.slice(headingIndex);
  }

  // 没有标题时直接追加到最前面
  return block + content;
}

/**
 * 从 Spec 数据生成所有适用的图表并嵌入 Markdown
 *
 * 生成规则：
 * - flowchart：始终生成（从 Spec 数据）
 * - decision：始终生成（静态决策流程图）
 * - state：仅在提供 report 时生成（校验状态流转图）
 *
 * @param content - 原始 Markdown 内容
 * @param spec - Spec 数据对象
 * @param report - 可选的校验报告，提供时生成状态流转图
 * @param options - 可选配置
 * @param options.strictMode - 是否启用严格模式，传递给 decision 和 state 图表生成器
 * @returns 嵌入所有图表后的 Markdown 内容
 */
export function embedAllDiagrams(
  content: string,
  spec: Spec,
  report?: ValidationReport,
  options?: { strictMode?: boolean },
): string {
  // 按顺序嵌入图表：decision → state → flowchart
  // 后嵌入的会出现在内容更靠前的位置（因为都尝试追加到开头）
  // 实际顺序：flowchart → state → decision（最先嵌入的在最上面）

  // 1. 始终生成 flowchart
  const flowchartCode = generateFlowchart(spec);
  let result = embedDiagram(content, 'flowchart', flowchartCode);

  // 2. 始终生成 decision
  const decisionCode = generateDecisionDiagram(options);
  result = embedDiagram(result, 'decision', decisionCode);

  // 3. 仅在提供 report 时生成 state
  if (report) {
    const stateCode = generateStateDiagram(report, options?.strictMode);
    result = embedDiagram(result, 'state', stateCode);
  }

  return result;
}
