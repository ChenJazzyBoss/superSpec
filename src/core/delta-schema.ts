/**
 * Delta 增量变更 Schema
 *
 * 用于描述 spec 的增量变更，支持四种操作类型：
 * - ADDED: 新增
 * - REMOVED: 删除
 * - MODIFIED: 修改
 * - RENAMED: 重命名
 *
 * 变更目标分三种：
 * - overview: 概述
 * - requirement: 需求
 * - scenario: 场景
 */

import { z } from 'zod';

/** 变更类型枚举 */
export const ChangeTypeSchema = z.enum(['ADDED', 'REMOVED', 'MODIFIED', 'RENAMED']);

/** 变更目标分组 */
export const ChangeSectionSchema = z.enum(['overview', 'requirement', 'scenario']);

/** 单项变更 */
export const ChangeSchema = z.object({
  type: ChangeTypeSchema,
  section: ChangeSectionSchema,
  /** 变更目标名称（requirement 或 scenario 的名称） */
  target: z.string().min(1, '变更目标名称不能为空'),
  /** 新增内容（ADDED 时必填） */
  content: z.string().optional(),
  /** 修改后的值（MODIFIED/RENAMED 时必填） */
  newValue: z.string().optional(),
  /** 修改前的值（MODIFIED 时可选，用于记录） */
  oldValue: z.string().optional(),
  /** 父级需求名称（scenario 变更时必填） */
  parent: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'ADDED' && !data.content) return false;
    if ((data.type === 'MODIFIED' || data.type === 'RENAMED') && !data.newValue) return false;
    if (data.section === 'scenario' && !data.parent) return false;
    return true;
  },
  { message: '变更字段不完整：ADDED 需要 content，MODIFIED/RENAMED 需要 newValue，scenario 需要 parent' }
);

/** Delta 增量变更描述 */
export const DeltaSchema = z.object({
  /** 目标 spec 名称 */
  specName: z.string().min(1, 'spec 名称不能为空'),
  /** 变更列表 */
  changes: z.array(ChangeSchema).min(1, '至少需要一项变更'),
});

export type ChangeType = z.infer<typeof ChangeTypeSchema>;
export type ChangeSection = z.infer<typeof ChangeSectionSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type Delta = z.infer<typeof DeltaSchema>;
