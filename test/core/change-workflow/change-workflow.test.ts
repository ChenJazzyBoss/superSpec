import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { canTransition, getValidTransitions } from '../../../src/core/change-workflow/state-machine.js';
import { ChangeManager } from '../../../src/core/change-workflow/change-manager.js';
import type { ChangeState } from '../../../src/core/change-workflow/types.js';

/** 创建临时目录用于测试 */
function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'change-workflow-test-'));
}

/** 清理临时目录 */
function cleanTmpDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('状态机 — canTransition', () => {
  it('合法跳转：draft -> in-progress', () => {
    expect(canTransition('draft', 'in-progress')).toBe(true);
  });

  it('合法跳转：in-progress -> review', () => {
    expect(canTransition('in-progress', 'review')).toBe(true);
  });

  it('合法跳转：review -> done', () => {
    expect(canTransition('review', 'done')).toBe(true);
  });

  it('合法跳转：done -> archived', () => {
    expect(canTransition('done', 'archived')).toBe(true);
  });

  it('合法跳转：状态回退 review -> in-progress', () => {
    expect(canTransition('review', 'in-progress')).toBe(true);
  });

  it('合法跳转：状态回退 in-progress -> draft', () => {
    expect(canTransition('in-progress', 'draft')).toBe(true);
  });

  it('非法跳转：draft -> review（跳过中间状态）', () => {
    expect(canTransition('draft', 'review')).toBe(false);
  });

  it('非法跳转：draft -> done', () => {
    expect(canTransition('draft', 'done')).toBe(false);
  });

  it('非法跳转：draft -> archived', () => {
    expect(canTransition('draft', 'archived')).toBe(false);
  });

  it('非法跳转：archived -> 任何状态', () => {
    const allStates: ChangeState[] = ['draft', 'in-progress', 'review', 'done', 'archived'];
    for (const state of allStates) {
      expect(canTransition('archived', state)).toBe(false);
    }
  });

  it('非法跳转：相同状态', () => {
    expect(canTransition('draft', 'draft')).toBe(false);
    expect(canTransition('in-progress', 'in-progress')).toBe(false);
  });
});

describe('状态机 — getValidTransitions', () => {
  it('draft 只能到 in-progress', () => {
    expect(getValidTransitions('draft')).toEqual(['in-progress']);
  });

  it('in-progress 可到 review 或 draft', () => {
    expect(getValidTransitions('in-progress')).toEqual(expect.arrayContaining(['review', 'draft']));
    expect(getValidTransitions('in-progress')).toHaveLength(2);
  });

  it('review 可到 done 或 in-progress', () => {
    expect(getValidTransitions('review')).toEqual(expect.arrayContaining(['done', 'in-progress']));
    expect(getValidTransitions('review')).toHaveLength(2);
  });

  it('done 只能到 archived', () => {
    expect(getValidTransitions('done')).toEqual(['archived']);
  });

  it('archived 无可用跳转', () => {
    expect(getValidTransitions('archived')).toEqual([]);
  });
});

describe('ChangeManager — createChange', () => {
  let tmpDir: string;
  let manager: ChangeManager;

  beforeEach(() => {
    tmpDir = createTmpDir();
    manager = new ChangeManager(tmpDir);
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('创建变更后返回正确的元数据', () => {
    const change = manager.createChange('测试变更', '这是描述');
    expect(change.title).toBe('测试变更');
    expect(change.state).toBe('draft');
    expect(change.id).toBeTruthy();
    expect(change.createdAt).toBeTruthy();
    expect(change.updatedAt).toBeTruthy();
    expect(change.specs).toEqual([]);
  });

  it('创建的变更可通过 getChange 读取', () => {
    const created = manager.createChange('可读变更', '描述');
    const loaded = manager.getChange(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe('可读变更');
    expect(loaded!.state).toBe('draft');
  });

  it('不存在的变更返回 null', () => {
    expect(manager.getChange('nonexistent')).toBeNull();
  });
});

describe('ChangeManager — transitionTo 状态流转', () => {
  let tmpDir: string;
  let manager: ChangeManager;

  beforeEach(() => {
    tmpDir = createTmpDir();
    manager = new ChangeManager(tmpDir);
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('draft -> in-progress 成功', () => {
    const change = manager.createChange('状态流转', '描述');
    const result = manager.transitionTo(change.id, 'in-progress');
    expect(result.success).toBe(true);
    expect(manager.getChange(change.id)!.state).toBe('in-progress');
  });

  it('完整流转 draft -> in-progress -> review -> done -> archived', () => {
    const change = manager.createChange('完整流转', '描述');
    const steps: ChangeState[] = ['in-progress', 'review', 'done', 'archived'];
    for (const step of steps) {
      const result = manager.transitionTo(change.id, step);
      expect(result.success).toBe(true);
      expect(manager.getChange(change.id)!.state).toBe(step);
    }
  });

  it('非法跳转被拒绝并返回错误信息', () => {
    const change = manager.createChange('非法跳转', '描述');
    const result = manager.transitionTo(change.id, 'review');
    expect(result.success).toBe(false);
    expect(result.error).toContain('draft');
    expect(result.error).toContain('review');
  });

  it('状态回退 in-progress -> draft', () => {
    const change = manager.createChange('状态回退', '描述');
    manager.transitionTo(change.id, 'in-progress');
    const result = manager.transitionTo(change.id, 'draft');
    expect(result.success).toBe(true);
    expect(manager.getChange(change.id)!.state).toBe('draft');
  });

  it('不存在的变更返回错误', () => {
    const result = manager.transitionTo('nonexistent', 'in-progress');
    expect(result.success).toBe(false);
    expect(result.error).toContain('不存在');
  });
});

describe('ChangeManager — addTask 和 completeTask', () => {
  let tmpDir: string;
  let manager: ChangeManager;

  beforeEach(() => {
    tmpDir = createTmpDir();
    manager = new ChangeManager(tmpDir);
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('添加任务后可在 getTasks 中看到', () => {
    const change = manager.createChange('任务管理', '描述');
    const task = manager.addTask(change.id, '实现功能', '功能可正常运行');
    expect(task.description).toBe('实现功能');
    expect(task.criteria).toBe('功能可正常运行');
    expect(task.status).toBe('todo');
    expect(task.id).toBe(1);

    const tasks = manager.getTasks(change.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe('实现功能');
  });

  it('多个任务 ID 递增', () => {
    const change = manager.createChange('多任务', '描述');
    const t1 = manager.addTask(change.id, '任务一', '标准一');
    const t2 = manager.addTask(change.id, '任务二', '标准二');
    expect(t2.id).toBe(t1.id + 1);
  });

  it('完成任务后状态变为 done 并记录时间', () => {
    const change = manager.createChange('完成任务', '描述');
    manager.addTask(change.id, '待完成', '标准');
    const result = manager.completeTask(change.id, 1);
    expect(result.success).toBe(true);

    const tasks = manager.getTasks(change.id);
    expect(tasks[0].status).toBe('done');
    expect(tasks[0].completedAt).toBeTruthy();
  });

  it('完成不存在的任务返回错误', () => {
    const change = manager.createChange('不存在任务', '描述');
    const result = manager.completeTask(change.id, 999);
    expect(result.success).toBe(false);
    expect(result.error).toContain('不存在');
  });

  it('重复完成已 done 的任务返回错误', () => {
    const change = manager.createChange('重复完成', '描述');
    manager.addTask(change.id, '任务', '标准');
    manager.completeTask(change.id, 1);
    const result = manager.completeTask(change.id, 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('已完成');
  });

  it('不存在的变更返回错误', () => {
    expect(() => manager.addTask('nonexistent', 'desc', 'crit')).toThrow('不存在');
    expect(manager.completeTask('nonexistent', 1).success).toBe(false);
    expect(manager.getTasks('nonexistent')).toEqual([]);
  });
});

describe('ChangeManager — archiveChange', () => {
  let tmpDir: string;
  let manager: ChangeManager;

  beforeEach(() => {
    tmpDir = createTmpDir();
    manager = new ChangeManager(tmpDir);
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('done 状态的变更可归档', () => {
    const change = manager.createChange('归档测试', '描述');
    manager.transitionTo(change.id, 'in-progress');
    manager.transitionTo(change.id, 'review');
    manager.transitionTo(change.id, 'done');
    const result = manager.archiveChange(change.id);
    expect(result.success).toBe(true);
    expect(manager.getChange(change.id)!.state).toBe('archived');
  });

  it('非 done 状态拒绝归档', () => {
    const change = manager.createChange('非done归档', '描述');
    const result = manager.archiveChange(change.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain('draft');
    expect(result.error).toContain('done');
  });

  it('不存在的变更归档返回错误', () => {
    const result = manager.archiveChange('nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('不存在');
  });
});

describe('ChangeManager — listChanges', () => {
  let tmpDir: string;
  let manager: ChangeManager;

  beforeEach(() => {
    tmpDir = createTmpDir();
    manager = new ChangeManager(tmpDir);
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('列出所有已创建的变更', () => {
    manager.createChange('变更一', '描述一');
    manager.createChange('变更二', '描述二');
    const list = manager.listChanges();
    expect(list).toHaveLength(2);
    const titles = list.map(c => c.title);
    expect(titles).toContain('变更一');
    expect(titles).toContain('变更二');
  });

  it('changes 目录为空时返回空数组', () => {
    expect(manager.listChanges()).toEqual([]);
  });

  it('changes 目录不存在时返回空数组', () => {
    const emptyManager = new ChangeManager(path.join(tmpDir, 'nonexistent'));
    expect(emptyManager.listChanges()).toEqual([]);
  });

  it('变更按创建时间倒序排列', () => {
    const first = manager.createChange('先创建', '描述');
    // 确保时间戳不同
    const second = manager.createChange('后创建', '描述');
    const list = manager.listChanges();
    expect(list[0].id).toBe(second.id);
    expect(list[1].id).toBe(first.id);
  });
});
