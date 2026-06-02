import { z } from 'zod';

/**
 * 场景 Schema
 * 描述单个测试/验证场景
 */
export const ScenarioSchema = z.object({
  name: z.string().min(1, '场景名称不能为空'),
  rawText: z.string().min(10, '场景原始文本至少需要 10 个字符'),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

/**
 * 需求 Schema
 * 描述单条需求及其关联的验证场景
 */
export const RequirementSchema = z.object({
  name: z.string().min(1, '需求名称不能为空'),
  text: z
    .string()
    .refine(
      (val) => val.includes('SHALL') || val.includes('MUST'),
      '需求文本必须包含 SHALL 或 MUST 关键词',
    ),
  scenarios: z
    .array(ScenarioSchema)
    .min(2, '每条需求至少需要关联 2 个场景'),
});

export type Requirement = z.infer<typeof RequirementSchema>;

/**
 * 规格说明书顶层 Schema
 * 描述完整的 Spec 文档结构
 */
export const SpecSchema = z.object({
  name: z.string().min(1, '规格名称不能为空'),
  overview: z.string().min(50, '概述内容至少需要 50 个字符'),
  requirements: z
    .array(RequirementSchema)
    .min(1, '规格中至少需要包含 1 条需求'),
  metadata: z.object({
    version: z.string({ required_error: '版本号不能为空' }),
    format: z.literal('superspec', {
      errorMap: () => ({ message: '格式必须为 superspec' }),
    }),
  }),
});

export type Spec = z.infer<typeof SpecSchema>;
