/**
 * 图表生成器统一导出
 *
 * 将 Spec / 校验报告等结构化数据转换为 Mermaid 图表字符串。
 * 所有图表均可嵌入 Markdown 文件，在 VS Code 中直接预览。
 */

export { generateFlowchart } from './flowchart.js';
export { generateStateDiagram } from './state.js';
export { generateDecisionDiagram } from './decision.js';
