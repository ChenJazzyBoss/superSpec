/**
 * 变更管理器
 *
 * 负责变更提案的创建、状态流转、任务管理和归档操作，
 * 所有数据以 JSON 文件持久化到 .superspec/changes/ 目录。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { ChangeState, ChangeMetadata, TaskItem } from './types.js';
import { canTransition } from './state-machine.js';

/** 变更数据文件完整结构 */
interface ChangeData {
  metadata: ChangeMetadata;
  description: string;
  tasks: TaskItem[];
}

/**
 * 变更管理器
 *
 * 提供变更提案的完整生命周期管理能力。
 */
export class ChangeManager {
  private readonly changesDir: string;

  /**
   * @param projectRoot - 项目根目录
   */
  constructor(projectRoot: string) {
    this.changesDir = path.join(projectRoot, '.superspec', 'changes');
  }

  /**
   * 确保 changes 目录存在
   */
  private ensureDir(): void {
    fs.mkdirSync(this.changesDir, { recursive: true });
  }

  /**
   * 生成变更 ID（时间戳 + 短哈希）
   */
  private generateId(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const hash = crypto.randomBytes(3).toString('hex');
    return `${datePart}-${hash}`;
  }

  /**
   * 读取变更数据文件
   *
   * @param changeId - 变更 ID
   * @returns 变更数据，不存在时返回 null
   */
  private readChange(changeId: string): ChangeData | null {
    const filePath = path.join(this.changesDir, changeId, 'change.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ChangeData;
  }

  /**
   * 写入变更数据文件
   *
   * @param changeId - 变更 ID
   * @param data - 变更数据
   */
  private writeChange(changeId: string, data: ChangeData): void {
    const dirPath = path.join(this.changesDir, changeId);
    fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, 'change.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 获取当前时间 ISO 字符串
   */
  private now(): string {
    return new Date().toISOString();
  }

  /**
   * 创建变更提案
   *
   * @param title - 变更标题
   * @param description - 变更描述
   * @returns 创建的变更元数据
   */
  createChange(title: string, description: string): ChangeMetadata {
    this.ensureDir();
    const id = this.generateId();
    const now = this.now();
    const metadata: ChangeMetadata = {
      id,
      title,
      state: 'draft',
      createdAt: now,
      updatedAt: now,
      specs: [],
    };
    const data: ChangeData = { metadata, description, tasks: [] };
    this.writeChange(id, data);
    return metadata;
  }

  /**
   * 获取单个变更的元数据
   *
   * @param changeId - 变更 ID
   * @returns 变更元数据，不存在时返回 null
   */
  getChange(changeId: string): ChangeMetadata | null {
    const data = this.readChange(changeId);
    return data?.metadata ?? null;
  }

  /**
   * 列出所有变更
   *
   * @returns 变更元数据列表，按创建时间倒序排列
   */
  listChanges(): ChangeMetadata[] {
    if (!fs.existsSync(this.changesDir)) {
      return [];
    }
    const entries = fs.readdirSync(this.changesDir, { withFileTypes: true });
    const changes: ChangeMetadata[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const data = this.readChange(entry.name);
        if (data) {
          changes.push(data.metadata);
        }
      }
    }
    return changes.sort((a, b) => {
      const timeDiff = b.createdAt.localeCompare(a.createdAt);
      if (timeDiff !== 0) return timeDiff;
      // 相同时间戳时按 ID 降序（ID 包含随机 hash，保证稳定性）
      return b.id.localeCompare(a.id);
    });
  }

  /**
   * 将变更流转到目标状态
   *
   * @param changeId - 变更 ID
   * @param targetState - 目标状态
   * @returns 操作结果
   */
  transitionTo(changeId: string, targetState: ChangeState): { success: boolean; error?: string } {
    const data = this.readChange(changeId);
    if (!data) {
      return { success: false, error: `变更 ${changeId} 不存在` };
    }
    if (!canTransition(data.metadata.state, targetState)) {
      return {
        success: false,
        error: `不允许从 ${data.metadata.state} 跳转到 ${targetState}`,
      };
    }
    data.metadata.state = targetState;
    data.metadata.updatedAt = this.now();
    this.writeChange(changeId, data);
    return { success: true };
  }

  /**
   * 为变更添加任务项
   *
   * @param changeId - 变更 ID
   * @param description - 任务描述
   * @param criteria - 完成标准
   * @returns 创建的任务项
   */
  addTask(changeId: string, description: string, criteria: string): TaskItem {
    const data = this.readChange(changeId);
    if (!data) {
      throw new Error(`变更 ${changeId} 不存在`);
    }
    const nextId = data.tasks.length > 0
      ? Math.max(...data.tasks.map(t => t.id)) + 1
      : 1;
    const task: TaskItem = {
      id: nextId,
      description,
      criteria,
      status: 'todo',
    };
    data.tasks.push(task);
    data.metadata.updatedAt = this.now();
    this.writeChange(changeId, data);
    return task;
  }

  /**
   * 完成指定任务
   *
   * @param changeId - 变更 ID
   * @param taskId - 任务编号
   * @returns 操作结果
   */
  completeTask(changeId: string, taskId: number): { success: boolean; error?: string } {
    const data = this.readChange(changeId);
    if (!data) {
      return { success: false, error: `变更 ${changeId} 不存在` };
    }
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, error: `任务 ${taskId} 不存在` };
    }
    if (task.status === 'done') {
      return { success: false, error: `任务 ${taskId} 已完成` };
    }
    task.status = 'done';
    task.completedAt = this.now();
    data.metadata.updatedAt = this.now();
    this.writeChange(changeId, data);
    return { success: true };
  }

  /**
   * 获取变更的所有任务项
   *
   * @param changeId - 变更 ID
   * @returns 任务项列表
   */
  getTasks(changeId: string): TaskItem[] {
    const data = this.readChange(changeId);
    return data?.tasks ?? [];
  }

  /**
   * 归档已完成的变更
   *
   * @param changeId - 变更 ID
   * @returns 操作结果
   */
  archiveChange(changeId: string): { success: boolean; error?: string } {
    const data = this.readChange(changeId);
    if (!data) {
      return { success: false, error: `变更 ${changeId} 不存在` };
    }
    if (data.metadata.state !== 'done') {
      return {
        success: false,
        error: `变更处于 ${data.metadata.state} 状态，必须为 done 才能归档`,
      };
    }
    data.metadata.state = 'archived';
    data.metadata.updatedAt = this.now();
    this.writeChange(changeId, data);
    return { success: true };
  }
}
