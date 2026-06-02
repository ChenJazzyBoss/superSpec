/**
 * Adapter 接口定义
 *
 * Adapter 负责将 Spec 转换为特定语言的测试代码。
 * 每种语言实现一个 Adapter。
 */

import type { Spec } from '../core/spec-schema.js';

export interface Adapter {
  /** 语言标识符（如 'typescript', 'python'） */
  readonly language: string;

  /** 生成的文件扩展名（如 '.test.ts', '.py'） */
  readonly fileExtension: string;

  /** 语言显示名称（如 'TypeScript', 'Python'） */
  readonly displayName: string;

  /**
   * 将 Spec 转换为测试代码
   * @param spec 结构化的 Spec 对象
   * @returns 测试代码字符串
   */
  generate(spec: Spec): string;
}
