import { describe, it, expect } from 'vitest';
import {
  ModuleSchema,
  ModuleListSchema,
  ModuleDependencySchema,
  ModuleInterfaceSchema,
} from '../../src/core/module-schema.js';

describe('ModuleSchema', () => {
  const validModule = {
    name: 'user-service',
    responsibility: '负责用户注册、登录、权限管理等核心功能',
    dependencies: [],
    interfaces: [],
    priority: 'P1' as const,
  };

  it('正确数据通过校验', () => {
    const result = ModuleSchema.safeParse(validModule);
    expect(result.success).toBe(true);
  });

  it('空名称被拒绝', () => {
    const result = ModuleSchema.safeParse({ ...validModule, name: '' });
    expect(result.success).toBe(false);
  });

  it('名称包含特殊字符被拒绝', () => {
    const result = ModuleSchema.safeParse({ ...validModule, name: 'user@service' });
    expect(result.success).toBe(false);
  });

  it('名称以数字开头被拒绝', () => {
    const result = ModuleSchema.safeParse({ ...validModule, name: '1user-service' });
    expect(result.success).toBe(false);
  });

  it('名称包含连字符通过', () => {
    const result = ModuleSchema.safeParse({ ...validModule, name: 'user-service-v2' });
    expect(result.success).toBe(true);
  });

  it('名称包含下划线通过', () => {
    const result = ModuleSchema.safeParse({ ...validModule, name: 'user_service' });
    expect(result.success).toBe(true);
  });

  it('职责描述过短被拒绝', () => {
    const result = ModuleSchema.safeParse({ ...validModule, responsibility: '太短' });
    expect(result.success).toBe(false);
  });

  it('默认优先级为 P1', () => {
    const result = ModuleSchema.safeParse(validModule);
    if (result.success) {
      expect(result.data.priority).toBe('P1');
    }
  });

  it('P0 优先级通过', () => {
    const result = ModuleSchema.safeParse({ ...validModule, priority: 'P0' });
    expect(result.success).toBe(true);
  });

  it('无效优先级被拒绝', () => {
    const result = ModuleSchema.safeParse({ ...validModule, priority: 'P3' });
    expect(result.success).toBe(false);
  });
});

describe('ModuleDependencySchema', () => {
  it('正确数据通过校验', () => {
    const result = ModuleDependencySchema.safeParse({
      target: 'order-service',
      type: 'required',
    });
    expect(result.success).toBe(true);
  });

  it('空目标被拒绝', () => {
    const result = ModuleDependencySchema.safeParse({
      target: '',
      type: 'required',
    });
    expect(result.success).toBe(false);
  });

  it('默认类型为 required', () => {
    const result = ModuleDependencySchema.safeParse({ target: 'order-service' });
    if (result.success) {
      expect(result.data.type).toBe('required');
    }
  });
});

describe('ModuleInterfaceSchema', () => {
  it('正确数据通过校验', () => {
    const result = ModuleInterfaceSchema.safeParse({
      name: '用户接口',
      type: 'api',
    });
    expect(result.success).toBe(true);
  });

  it('空名称被拒绝', () => {
    const result = ModuleInterfaceSchema.safeParse({
      name: '',
      type: 'api',
    });
    expect(result.success).toBe(false);
  });
});

describe('ModuleListSchema', () => {
  const validModuleList = {
    project: 'user-system',
    modules: [
      {
        name: 'user-service',
        responsibility: '负责用户注册、登录、权限管理等核心功能',
        dependencies: [],
        interfaces: [],
        priority: 'P1' as const,
      },
      {
        name: 'order-service',
        responsibility: '负责订单创建、查询、状态管理等业务功能',
        dependencies: [
          { target: 'user-service', type: 'required' as const },
        ],
        interfaces: [],
        priority: 'P1' as const,
      },
    ],
    metadata: {
      version: '1.0.0',
      format: 'module-list' as const,
    },
  };

  it('正确数据通过校验', () => {
    const result = ModuleListSchema.safeParse(validModuleList);
    expect(result.success).toBe(true);
  });

  it('空项目名被拒绝', () => {
    const result = ModuleListSchema.safeParse({ ...validModuleList, project: '' });
    expect(result.success).toBe(false);
  });

  it('模块数不足 2 个被拒绝', () => {
    const result = ModuleListSchema.safeParse({
      ...validModuleList,
      modules: [validModuleList.modules[0]],
    });
    expect(result.success).toBe(false);
  });

  it('模块数超过 8 个被拒绝', () => {
    const modules = Array.from({ length: 9 }, (_, i) => ({
      ...validModuleList.modules[0],
      name: `module-${i}`,
    }));
    const result = ModuleListSchema.safeParse({ ...validModuleList, modules });
    expect(result.success).toBe(false);
  });

  it('格式必须为 module-list', () => {
    const result = ModuleListSchema.safeParse({
      ...validModuleList,
      metadata: { version: '1.0.0', format: 'wrong' },
    });
    expect(result.success).toBe(false);
  });
});
