import { describe, it, expect } from 'vitest';
import { parseModuleList } from '../../src/core/module-parser.js';

describe('parseModuleList', () => {
  it('解析标准 Markdown 模块清单', () => {
    const content = `# 用户管理系统

## user-service

负责用户注册、登录、权限管理等核心功能。

## order-service

负责订单创建、查询、状态管理等业务功能。
`;

    const result = parseModuleList(content, 'user-system');
    expect(result.project).toBe('user-system');
    expect(result.modules).toHaveLength(2);
    expect(result.modules[0].name).toBe('user-service');
    expect(result.modules[1].name).toBe('order-service');
  });

  it('解析带依赖的模块清单', () => {
    const content = `# 系统

## user-service

用户服务模块。

## order-service

订单服务模块，依赖用户服务。
`;

    const result = parseModuleList(content, 'system');
    expect(result.modules).toHaveLength(2);
  });

  it('空内容返回空模块列表', () => {
    const result = parseModuleList('', 'empty');
    expect(result.modules).toHaveLength(0);
  });

  it('只有标题没有描述的模块', () => {
    const content = `# 系统

## module-a

## module-b
`;

    const result = parseModuleList(content, 'system');
    expect(result.modules).toHaveLength(2);
    expect(result.modules[0].name).toBe('module-a');
    expect(result.modules[1].name).toBe('module-b');
  });

  it('解析表格格式的模块清单', () => {
    const content = `# 系统

| 模块 | 职责 | 依赖 | 接口 | 优先级 |
|------|------|------|------|--------|
| user-service | 用户管理 | - | API(用户接口) | P0 |
| order-service | 订单管理 | user-service | API(订单接口) | P1 |
`;

    const result = parseModuleList(content, 'system');
    expect(result.modules).toHaveLength(2);
    expect(result.modules[0].name).toBe('user-service');
    expect(result.modules[0].priority).toBe('P0');
  });

  it('metadata 格式正确', () => {
    const content = `# 系统

## module-a

模块 A。

## module-b

模块 B。
`;

    const result = parseModuleList(content, 'system');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.metadata.format).toBe('module-list');
  });

  it('解析多个模块', () => {
    const content = `# 系统

## module-a

模块 A 的职责描述。

## module-b

模块 B 的职责描述。

## module-c

模块 C 的职责描述。

## module-d

模块 D 的职责描述。
`;

    const result = parseModuleList(content, 'system');
    expect(result.modules).toHaveLength(4);
    expect(result.modules.map((m) => m.name)).toEqual([
      'module-a',
      'module-b',
      'module-c',
      'module-d',
    ]);
  });
});
