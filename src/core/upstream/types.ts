/**
 * 上游对齐检测 — 类型定义
 * @module upstream/types
 */

/** 上游源配置 */
export interface UpstreamSource {
  /** 源名称，用作缓存目录名 */
  name: string;
  /** 获取方式：git clone 或 HTTP 直接下载 */
  type: 'git' | 'http';
  /** 仓库地址或文件基础 URL */
  url: string;
  /** 需要追踪的文件路径列表（相对于仓库根目录） */
  paths: string[];
  /** 分支名称，仅 git 类型有效，默认 main */
  branch?: string;
}

/** 上游配置文件结构（.superspec/upstream.json） */
export interface UpstreamConfig {
  /** 已注册的上游源列表 */
  sources: UpstreamSource[];
}

/** 单条差异条目 */
export interface DiffEntry {
  /** 上游文件路径 */
  path: string;
  /** 差异动作类型 */
  type: 'added' | 'modified' | 'removed';
  /** 差异所属类别 */
  category: 'validation-rule' | 'skill-frontmatter' | 'hook-script';
  /** 严重程度 */
  severity: 'needs-sync' | 'intentional-divergence' | 'needs-review';
  /** 差异详情描述 */
  detail: string;
}

/** 上游差异检测报告 */
export interface UpstreamReport {
  /** 上游源名称 */
  source: string;
  /** 报告生成时间 ISO 字符串 */
  timestamp: string;
  /** 差异条目列表 */
  diffs: DiffEntry[];
  /** 汇总统计 */
  summary: {
    /** 差异总数 */
    total: number;
    /** 需要同步的数量 */
    needsSync: number;
    /** 故意偏离的数量 */
    intentional: number;
    /** 需要审查的数量 */
    needsReview: number;
  };
}
