/**
 * 配置分层系统类型定义
 *
 * 支持三级配置：全局配置、项目配置、变更配置。
 * 每层配置文件均为可选，缺失时使用下一层级的默认值。
 */

/** 全局配置（~/.config/superspec/config.json） */
export interface GlobalConfig {
  /** 默认语言 */
  defaultLanguage?: string;
  /** 严格模式 */
  strict?: boolean;
  /** 允许扩展字段 */
  [key: string]: unknown;
}

/** 项目配置（.superspec/config.yaml） */
export interface ProjectConfig {
  /** 项目名称 */
  project?: string;
  /** 语言 */
  language?: string;
  /** 严格模式 */
  strict?: boolean;
  /** 校验阈值配置 */
  spec?: {
    /** Purpose 概述最少字符数 */
    min_purpose_length?: number;
    /** 每个 Requirement 最少 Scenario 数量 */
    min_scenario_count?: number;
    /** 每个 Requirement 推荐 Scenario 数量 */
    recommended_scenario_count?: number;
  };
  /** 允许扩展字段 */
  [key: string]: unknown;
}

/** 变更配置（.superspec/changes/<name>/.superspec.yaml） */
export interface ChangeConfig {
  /** 校验 schema 引用 */
  schema?: string;
  /** 严格模式 */
  strict?: boolean;
  /** 允许扩展字段 */
  [key: string]: unknown;
}

/** 合并后的最终配置 */
export interface ResolvedConfig extends ProjectConfig {
  /** 各层配置来源路径 */
  _sources: {
    global?: string;
    project?: string;
    change?: string;
  };
}

/** 配置文件路径常量 */
export const CONFIG_PATHS = {
  global: '.config/superspec/config.json',
  project: '.superspec/config.yaml',
  change: '.superspec.yaml',
} as const;
