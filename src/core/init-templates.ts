/**
 * superSpec Init Template 注册表
 *
 * 管理多项目类型的 Init Template：
 * - 模板注册与查询
 * - 模板文件加载
 * - 模板类型校验
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = join(__dirname, '..', '..', 'templates', 'init-templates');

/** 模板类型 */
export type TemplateType = 'general' | 'web-api' | 'cli' | 'library';

/** 模板元信息 */
export interface TemplateInfo {
  /** 模板类型标识 */
  type: TemplateType;
  /** 模板显示名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板文件名（相对于 templates/init-templates/） */
  filename: string;
}

/** 所有内置模板 */
const BUILTIN_TEMPLATES: TemplateInfo[] = [
  {
    type: 'general',
    name: '通用项目',
    description: '适用于任何类型的项目，收集通用的需求、用户和场景信息',
    filename: 'general.md',
  },
  {
    type: 'web-api',
    name: 'Web API',
    description: '针对 REST/GraphQL API 服务，收集端点设计、认证方式、数据模型等信息',
    filename: 'web-api.md',
  },
  {
    type: 'cli',
    name: 'CLI 工具',
    description: '针对命令行工具，收集命令结构、参数设计、输出格式等信息',
    filename: 'cli.md',
  },
  {
    type: 'library',
    name: '库/SDK',
    description: '针对可复用库或 SDK，收集公共 API、版本策略、兼容性约束等信息',
    filename: 'library.md',
  },
];

/**
 * 获取所有可用模板列表
 *
 * @returns 模板信息数组
 */
export function listTemplates(): TemplateInfo[] {
  return BUILTIN_TEMPLATES.filter((t) => {
    const filePath = join(TEMPLATES_ROOT, t.filename);
    return existsSync(filePath);
  });
}

/**
 * 获取模板信息
 *
 * @param type - 模板类型
 * @returns 模板信息，不存在返回 undefined
 */
export function getTemplateInfo(type: string): TemplateInfo | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.type === type);
}

/**
 * 判断模板类型是否有效
 *
 * @param type - 模板类型字符串
 * @returns 是否为有效模板类型
 */
export function isValidTemplateType(type: string): type is TemplateType {
  return BUILTIN_TEMPLATES.some((t) => t.type === type);
}

/**
 * 加载模板内容
 *
 * @param type - 模板类型
 * @returns 模板文件内容字符串
 * @throws 如果模板不存在或文件读取失败
 */
export function loadTemplateContent(type: TemplateType): string {
  const info = getTemplateInfo(type);
  if (!info) {
    throw new Error(`未知模板类型: "${type}"。可用模板: ${BUILTIN_TEMPLATES.map((t) => t.type).join(', ')}`);
  }

  const filePath = join(TEMPLATES_ROOT, info.filename);

  if (!existsSync(filePath)) {
    // 降级到通用模板
    console.warn(`警告: 模板文件 "${info.filename}" 不存在，回退使用通用模板。`);
    return loadTemplateContent('general');
  }

  return readFileSync(filePath, 'utf-8');
}

/**
 * 获取模板文件的源路径（用于文件复制）
 *
 * @param type - 模板类型
 * @returns 模板文件的绝对路径
 */
export function getTemplateFilePath(type: TemplateType): string {
  const info = getTemplateInfo(type);
  if (!info) {
    throw new Error(`未知模板类型: "${type}"`);
  }
  return join(TEMPLATES_ROOT, info.filename);
}

/**
 * 格式化模板列表为可读的表格输出
 *
 * @returns 格式化的字符串
 */
export function formatTemplateList(): string {
  const templates = listTemplates();
  if (templates.length === 0) {
    return '暂无可用模板。请使用默认通用模板。';
  }

  const lines = [
    '可用项目类型模板：\n',
    '  类型          名称            描述',
    '  ──────────── ─────────────── ────────────────────────────────────────',
  ];

  for (const t of templates) {
    lines.push(`  ${t.type.padEnd(12)} ${t.name.padEnd(15)} ${t.description}`);
  }

  lines.push(`\n共 ${templates.length} 个模板`);
  lines.push('\n使用方式: superspec init --template <类型>');

  return lines.join('\n');
}
