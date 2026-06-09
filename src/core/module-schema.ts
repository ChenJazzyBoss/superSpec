import { z } from 'zod';

/**
 * 模块依赖 Schema
 * 描述模块之间的依赖关系
 */
export const ModuleDependencySchema = z.object({
  /** 依赖的模块名称 */
  target: z.string().min(1, '依赖目标不能为空'),
  /** 依赖类型 */
  type: z.enum(['required', 'optional', 'circular']).default('required'),
  /** 依赖说明 */
  description: z.string().optional(),
});

export type ModuleDependency = z.infer<typeof ModuleDependencySchema>;

/**
 * 模块接口 Schema
 * 描述模块对外提供的接口
 */
export const ModuleInterfaceSchema = z.object({
  /** 接口名称 */
  name: z.string().min(1, '接口名称不能为空'),
  /** 接口类型 */
  type: z.enum(['api', 'event', 'library', 'database']).default('api'),
  /** 接口说明 */
  description: z.string().optional(),
});

export type ModuleInterface = z.infer<typeof ModuleInterfaceSchema>;

/**
 * 单个模块 Schema
 * 描述模块的基本信息
 */
export const ModuleSchema = z.object({
  /** 模块名称 */
  name: z
    .string()
    .min(1, '模块名称不能为空')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      '模块名称必须以字母开头，只能包含字母、数字、下划线和连字符',
    ),
  /** 模块职责描述 */
  responsibility: z.string().min(10, '模块职责描述至少需要 10 个字符'),
  /** 模块依赖列表 */
  dependencies: z.array(ModuleDependencySchema).default([]),
  /** 模块对外接口列表 */
  interfaces: z.array(ModuleInterfaceSchema).default([]),
  /** 模块优先级 */
  priority: z.enum(['P0', 'P1', 'P2']).default('P1'),
});

export type Module = z.infer<typeof ModuleSchema>;

/**
 * 模块清单顶层 Schema
 * 描述完整的模块清单结构
 */
export const ModuleListSchema = z.object({
  /** 项目名称 */
  project: z.string().min(1, '项目名称不能为空'),
  /** 模块列表 */
  modules: z
    .array(ModuleSchema)
    .min(2, '模块清单至少需要包含 2 个模块')
    .max(8, '模块清单最多包含 8 个模块'),
  /** 元数据 */
  metadata: z.object({
    version: z.string({ required_error: '版本号不能为空' }),
    format: z.literal('module-list', {
      errorMap: () => ({ message: '格式必须为 module-list' }),
    }),
  }),
});

export type ModuleList = z.infer<typeof ModuleListSchema>;
