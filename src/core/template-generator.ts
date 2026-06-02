/**
 * 模板生成器
 * 提供规范文档模板的生成与保存功能
 */

import { writeFileSync } from 'node:fs';
import {
  MIN_PURPOSE_LENGTH,
  MIN_SCENARIO_COUNT,
  REQUIREMENT_KEYWORDS,
} from './config.js';

const SPEC_TEMPLATE = `# <功能名称>

## Purpose

<!-- 至少 ${MIN_PURPOSE_LENGTH} 字描述这个功能的目的和价值，必须让读者理解为什么需要这个功能 -->

## Requirements

### Requirement: <需求名称>
<!-- 需求描述，必须包含 ${REQUIREMENT_KEYWORDS[0]} 或 ${REQUIREMENT_KEYWORDS[1]} 关键词，明确约束行为 -->

#### Scenario: <场景名称 1 - 正常流程>
Given <前置条件>
When <触发动作>
Then <预期结果>

#### Scenario: <场景名称 2 - 异常/边界>
Given <前置条件>
When <触发动作>
Then <预期结果>

#### Scenario: <场景名称 3 - 边界条件>
Given <前置条件>
When <触发动作>
Then <预期结果>
`;

/**
 * 生成规范文档模板
 * @returns Markdown 格式的规范模板字符串
 */
export function generateSpecTemplate(): string {
  return SPEC_TEMPLATE;
}

/**
 * 将规范模板保存到指定路径
 * @param outputPath - 输出文件路径
 */
export function saveTemplate(outputPath: string): void {
  writeFileSync(outputPath, SPEC_TEMPLATE, 'utf-8');
}
