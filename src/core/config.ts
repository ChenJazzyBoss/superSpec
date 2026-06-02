/**
 * 校验配置常量
 * 定义 superSpec 规范校验所需的各项配置参数
 */

/**
 * Purpose 最少字符数
 * 规范文档的 Purpose（目的）描述不得少于此字符数，以确保描述充分完整
 */
export const MIN_PURPOSE_LENGTH = 50;

/**
 * 每个需求最少场景数
 * 每条需求（Requirement）至少需要关联的场景（Scenario）数量，
 * 以确保需求有足够的上下文支撑
 */
export const MIN_SCENARIO_COUNT = 2;

/**
 * 场景描述最少字符数
 * 每个场景的描述文本不得少于此字符数，以保证场景描述具备基本的清晰度
 */
export const MIN_SCENARIO_TEXT_LENGTH = 10;

/**
 * 需求必须包含的关键词
 * 需求描述中必须包含以下至少一个关键词（如 SHALL、MUST），
 * 以符合规范中对需求强制性的语义表达要求
 */
export const REQUIREMENT_KEYWORDS = ['SHALL', 'MUST'] as const;

/**
 * 规范格式版本号
 * 用于标识当前 superSpec 规范的格式版本，遵循语义化版本规范
 */
export const SPEC_FORMAT_VERSION = '1.0.0';

/**
 * 工具名称
 * superSpec 工具的标识名称，用于 CLI 调用、日志输出及报告生成等场景
 */
export const TOOL_NAME = 'superspec';
