/**
 * superSpec 校验配置常量
 *
 * 所有可配置的校验阈值统一定义在此处。
 * 模板生成器和校验引擎均引用这些常量，确保同源。
 */

/**
 * Purpose 概述的最少字符数
 * Purpose 概述是 spec 的核心描述，过短无法充分表达功能的目的、
 * 价值和边界，导致后续需求分解缺乏依据。
 */
export const MIN_PURPOSE_LENGTH = 50;

/**
 * 每个 Requirement 最少需要的 Scenario 数量（Zod Schema 硬底线）
 * Scenario 是需求的可执行验收条件，少于 2 个无法覆盖正常流程和异常流程。
 */
export const MIN_SCENARIO_COUNT = 2;

/**
 * 每个 Requirement 推荐的 Scenario 数量（业务规则 WARNING 阈值）
 * 3 个场景（正常/异常/边界）能更全面地验证需求，但不作为硬性要求。
 * strictMode 下此 WARNING 会升级为失败。
 */
export const RECOMMENDED_SCENARIO_COUNT = 3;

/**
 * Scenario 原始文本的最少字符数
 * Scenario 应包含完整的 Given/When/Then 上下文，过短说明描述不充分，
 * 无法为后续测试生成提供足够信息。
 */
export const MIN_SCENARIO_TEXT_LENGTH = 10;

/**
 * Requirement 文本中必须包含的约束关键词
 * 使用 RFC 2119 关键词（SHALL/MUST）明确区分强制行为和可选行为，
 * 确保需求定义无歧义，可直接映射为验证条件。
 */
export const REQUIREMENT_KEYWORDS = ['SHALL', 'MUST'] as const;

/**
 * Spec 格式版本号
 * 格式变更时递增版本号，确保 superSpec 工具在处理不同版本的
 * spec 文件时能够正确识别和兼容。
 */
export const SPEC_FORMAT_VERSION = '1.0.0';

/**
 * 工具名称
 * superSpec 工具在输出、日志和 CLI 中使用的统一标识符，
 * 用于区分 superSpec 生成的产物和其他工具的产物。
 */
export const TOOL_NAME = 'superspec';
