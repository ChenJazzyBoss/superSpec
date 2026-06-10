/**
 * 路由评估器
 *
 * 根据用户意图和变更规模评估复杂度，选择合适的路径深度。
 *
 * 路径类型：
 * - lightweight: 简单新功能，直接 generate-spec 写入 specs/
 * - full:        复杂新功能或需求变更，走 change 目录 + delta spec
 * - debug:       排障路径，跳过 spec 阶段
 */

/** 路径类型 */
export type RouteType = 'lightweight' | 'full' | 'debug';

/** 用户意图类型 */
export type IntentType = 'new-feature' | 'modification' | 'bug-fix';

/** 路由评估结果 */
export interface RouteDecision {
  /** 推荐路径 */
  route: RouteType;
  /** 推荐原因 */
  reason: string;
  /** 评估依据 */
  evidence: {
    /** 用户意图 */
    intent: IntentType;
    /** 涉及的 capability 数量 */
    capabilityCount: number;
    /** 是否涉及已有 spec */
    affectsExistingSpec: boolean;
    /** 估算的 requirement 数量 */
    estimatedRequirements: number;
  };
}

/**
 * 评估用户意图
 *
 * @param userInput - 用户的原始输入
 * @returns 意图类型
 */
export function detectIntent(userInput: string): IntentType {
  const input = userInput.toLowerCase();

  // 排障关键词
  const debugKeywords = [
    'bug', '修复', '报错', '出错', '失败', '异常', '崩溃', 'crash',
    '报障', '排障', 'debug', '错误', '报 bug', '测试失败', 'test fail',
    '不工作', '不生效', '不生效', '挂了', 'down', 'broken',
  ];
  if (debugKeywords.some(kw => input.includes(kw))) {
    return 'bug-fix';
  }

  // 需求变更关键词
  const modificationKeywords = [
    '修改', '变更', '改为', '换成', '删掉', '移除', '重命名', '更新',
    '调整', '增加', '修改已有', '改一下', '不要了', '去掉',
    'modif', 'change', 'update', 'remove', 'rename', 'replace',
  ];

  // 新功能关键词
  const newFeatureKeywords = [
    '新增', '添加', '新建', '创建', '实现', '开发', '新功能', '支持',
    'add', 'new', 'create', 'implement', 'build', 'feature',
  ];

  // 如果同时有"新"和"改"，看哪个更多
  let modScore = 0;
  let newScore = 0;

  for (const kw of modificationKeywords) {
    if (input.includes(kw)) modScore++;
  }
  for (const kw of newFeatureKeywords) {
    if (input.includes(kw)) newScore++;
  }

  if (modScore > newScore) return 'modification';
  if (newScore > 0) return 'new-feature';

  // 默认为新功能
  return 'new-feature';
}

/**
 * 评估路由并给出推荐
 *
 * @param intent - 用户意图
 * @param options - 评估参数
 * @returns 路由决策
 */
export function evaluateRoute(
  intent: IntentType,
  options: {
    capabilityCount?: number;
    affectsExistingSpec?: boolean;
    estimatedRequirements?: number;
  } = {},
): RouteDecision {
  const capabilityCount = options.capabilityCount ?? 1;
  const affectsExistingSpec = options.affectsExistingSpec ?? false;
  const estimatedRequirements = options.estimatedRequirements ?? 1;

  const evidence = {
    intent,
    capabilityCount,
    affectsExistingSpec,
    estimatedRequirements,
  };

  // 排障路径
  if (intent === 'bug-fix') {
    return {
      route: 'debug',
      reason: '检测到排障场景，跳过 spec 阶段，直接进入 debug 流程',
      evidence,
    };
  }

  // 需求变更 → 必须走完整路径
  if (intent === 'modification' || affectsExistingSpec) {
    return {
      route: 'full',
      reason: '需求变更涉及已有 spec，必须走完整路径（change 目录 + delta spec）以确保审计完整性',
      evidence,
    };
  }

  // 新功能 → 根据复杂度判断
  if (capabilityCount > 1 || estimatedRequirements > 2) {
    return {
      route: 'full',
      reason: `复杂新功能（${capabilityCount} 个 capability，约 ${estimatedRequirements} 个 requirement），建议走完整路径以确保质量`,
      evidence,
    };
  }

  // 简单新功能 → 轻量路径
  return {
    route: 'lightweight',
    reason: '简单新功能（单 capability，少量 requirement），使用轻量路径直接生成 spec',
    evidence,
  };
}

/**
 * 格式化路由决策为可读输出
 *
 * @param decision - 路由决策
 * @returns 格式化的字符串
 */
export function formatRouteDecision(decision: RouteDecision): string {
  const routeLabels: Record<RouteType, string> = {
    lightweight: '🚀 轻量路径（直接写入 specs/）',
    full: '📦 完整路径（change 目录 + delta spec）',
    debug: '🔧 排障路径（跳过 spec 阶段）',
  };

  const lines = [
    `路由决策: ${routeLabels[decision.route]}`,
    `推荐原因: ${decision.reason}`,
    '',
    '评估依据:',
    `  意图: ${decision.evidence.intent}`,
    `  Capability 数: ${decision.evidence.capabilityCount}`,
    `  涉及已有 spec: ${decision.evidence.affectsExistingSpec ? '是' : '否'}`,
    `  预估 requirement 数: ${decision.evidence.estimatedRequirements}`,
  ];

  return lines.join('\n');
}
