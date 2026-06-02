/**
 * 决策点图生成器
 * 从校验配置生成 Mermaid flowchart，展示校验流程中的决策逻辑。
 * 这是一个静态图，不依赖具体数据，完整展示从开始到结束的所有路径。
 */

/**
 * 生成校验决策流程图的 Mermaid 字符串
 *
 * @param options - 可选配置
 * @param options.strictMode - 是否为严格模式，影响标签文字（默认 false）
 * @returns Mermaid flowchart 字符串
 *
 * @example
 * ```ts
 * const diagram = generateDecisionDiagram({ strictMode: true });
 * console.log(diagram);
 * // flowchart TD
 * //   Start["开始校验"] --> Parse["解析 Spec 文件"]
 * //   ...
 * ```
 */
export function generateDecisionDiagram(options?: { strictMode?: boolean }): string {
  const strictMode = options?.strictMode ?? false;
  const lines: string[] = [];

  lines.push('flowchart TD');

  // 开始节点
  lines.push('  Start["开始校验"] --> Parse["解析 Spec 文件"]');

  // Schema 校验决策点
  lines.push('  Parse --> SchemaCheck{"Schema 校验<br/>通过？"}');
  lines.push('  SchemaCheck -->|否| SchemaFail["❌ Schema 校验失败<br/>返回 ERROR"]');
  lines.push('  SchemaCheck -->|是| RuleCheck["规则引擎校验"]');

  // 规则引擎校验后的决策点
  lines.push('  RuleCheck --> HasError{"存在 ERROR？"}');
  lines.push('  HasError -->|是| ErrorResult["❌ 校验失败"]');
  lines.push('  HasError -->|否| HasWarning{"存在 WARNING？"}');

  // WARNING 分支
  lines.push('  HasWarning -->|是| StrictCheck{"strictMode？"}');

  if (strictMode) {
    lines.push('  StrictCheck -->|是| StrictFail["⚠️ strictMode 失败"]');
    lines.push('  StrictCheck -->|否| WarnResult["⚠️ 通过（有警告）"]');
  } else {
    lines.push('  StrictCheck -->|是| StrictFail["⚠️ strictMode 失败"]');
    lines.push('  StrictCheck -->|否| WarnResult["⚠️ 通过（有警告）"]');
  }

  // 无 WARNING 分支
  lines.push('  HasWarning -->|否| Pass["✅ 校验通过"]');

  // 所有路径汇聚到结束节点
  lines.push('  SchemaFail --> End["结束"]');
  lines.push('  ErrorResult --> End');
  lines.push('  StrictFail --> End');
  lines.push('  WarnResult --> End');
  lines.push('  Pass --> End');

  return lines.join('\n');
}
