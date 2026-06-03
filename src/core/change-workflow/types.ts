/**
 * 变更工作流类型定义
 *
 * 定义变更生命周期的核心数据结构，包括变更状态、元数据和任务项。
 */

/** 变更状态枚举，沿 draft -> in-progress -> review -> done -> archived 流转 */
export type ChangeState = 'draft' | 'in-progress' | 'review' | 'done' | 'archived';

/** 变更元数据 */
export interface ChangeMetadata {
  /** 变更唯一标识 */
  id: string;
  /** 变更标题 */
  title: string;
  /** 当前状态 */
  state: ChangeState;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
  /** 最后更新时间 ISO 字符串 */
  updatedAt: string;
  /** 关联的 spec 文件列表 */
  specs: string[];
}

/** 任务项 */
export interface TaskItem {
  /** 任务编号 */
  id: number;
  /** 任务描述 */
  description: string;
  /** 完成标准 */
  criteria: string;
  /** 任务状态 */
  status: 'todo' | 'done';
  /** 完成时间 ISO 字符串（仅 status 为 done 时有值） */
  completedAt?: string;
}
