/**
 * 上游对齐检测 — 报告生成
 * @module upstream/reporter
 */

import type { UpstreamReport, DiffEntry } from './types.js';

/** 差异严重程度对应中文标签 */
const SEVERITY_LABEL: Record<DiffEntry['severity'], string> = {
  'needs-sync': '需要同步',
  'intentional-divergence': '故意偏离',
  'needs-review': '待评估',
};

/** 差异动作对应中文标签 */
const TYPE_LABEL: Record<DiffEntry['type'], string> = {
  added: '新增',
  modified: '修改',
  removed: '删除',
};

/** 差异类别对应中文标签 */
const CATEGORY_LABEL: Record<DiffEntry['category'], string> = {
  'validation-rule': '校验规则',
  'skill-frontmatter': '技能 Frontmatter',
  'hook-script': 'Hook 脚本',
};

/**
 * 生成单条差异条目的 Markdown 文本
 * @param entry - 差异条目
 * @param index - 条目序号（从 1 开始）
 * @returns Markdown 格式文本
 */
function formatDiffEntry(entry: DiffEntry, index: number): string {
  const lines: string[] = [];
  lines.push(`### ${index}. ${entry.path}`);
  lines.push('');
  lines.push(`- **类型**: ${TYPE_LABEL[entry.type]}`);
  lines.push(`- **类别**: ${CATEGORY_LABEL[entry.category]}`);
  lines.push(`- **严重程度**: ${SEVERITY_LABEL[entry.severity]}`);
  lines.push(`- **详情**:`);
  lines.push('');
  lines.push('```');
  lines.push(entry.detail);
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

/**
 * 生成 Markdown 格式的差异报告
 * @param report - 上游差异报告
 * @returns Markdown 格式字符串
 */
export function generateReport(report: UpstreamReport): string {
  const lines: string[] = [];

  lines.push(`# 上游对齐检测报告 — ${report.source}`);
  lines.push('');
  lines.push(`**生成时间**: ${report.timestamp}`);
  lines.push('');
  lines.push('## 汇总');
  lines.push('');
  lines.push(`| 指标 | 数量 |`);
  lines.push(`|------|------|`);
  lines.push(`| 差异总数 | ${report.summary.total} |`);
  lines.push(`| 需要同步 | ${report.summary.needsSync} |`);
  lines.push(`| 故意偏离 | ${report.summary.intentional} |`);
  lines.push(`| 待评估 | ${report.summary.needsReview} |`);
  lines.push('');

  if (report.diffs.length === 0) {
    lines.push('> 所有文件与上游一致，无差异。');
    lines.push('');
  } else {
    lines.push('## 差异明细');
    lines.push('');
    report.diffs.forEach((entry, i) => {
      lines.push(formatDiffEntry(entry, i + 1));
    });
  }

  return lines.join('\n');
}

/**
 * 生成 JSON 格式的差异报告
 * @param report - 上游差异报告
 * @returns JSON 格式字符串（美化缩进）
 */
export function generateJsonReport(report: UpstreamReport): string {
  return JSON.stringify(report, null, 2);
}
