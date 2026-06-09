/**
 * 模块清单 Markdown 解析器
 *
 * 将 Markdown 格式的模块清单解析为结构化的 ModuleList 对象。
 * 支持表格格式和列表格式。
 */

import type { ModuleList, Module, ModuleDependency, ModuleInterface } from './module-schema.js';

/**
 * 解析模块清单 Markdown 内容
 *
 * @param content - Markdown 格式的模块清单内容
 * @param project - 项目名称
 * @returns 解析后的 ModuleList 对象
 * @throws 解析失败时抛出错误
 */
export function parseModuleList(content: string, project: string): ModuleList {
  const lines = content.split('\n');
  const modules: Module[] = [];

  let currentModule: Partial<Module> | null = null;
  let inTable = false;
  let tableHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) continue;

    // 检测模块标题（## 或 ### 开头）
    const moduleMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (moduleMatch) {
      // 保存之前的模块
      if (currentModule?.name) {
        modules.push(completeModule(currentModule));
      }

      currentModule = {
        name: moduleMatch[1].trim(),
        responsibility: '',
        dependencies: [],
        interfaces: [],
        priority: 'P1',
      };
      inTable = false;
      continue;
    }

    // 检测表格开始
    if (line.startsWith('|') && line.includes('模块')) {
      inTable = true;
      tableHeaders = line
        .split('|')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
      continue;
    }

    // 跳过表格分隔行
    if (inTable && /^\|[\s-:|]+\|$/.test(line)) {
      continue;
    }

    // 解析表格行
    if (inTable && line.startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (cells.length >= 2) {
        const module: Module = {
          name: cells[0],
          responsibility: cells[1] || '待补充',
          dependencies: parseDependencies(cells[2] || ''),
          interfaces: parseInterfaces(cells[3] || ''),
          priority: (cells[4] as 'P0' | 'P1' | 'P2') || 'P1',
        };
        modules.push(module);
      }
      continue;
    }

    // 检测表格结束
    if (inTable && !line.startsWith('|')) {
      inTable = false;
    }

    // 解析模块描述（当前模块的描述）
    if (currentModule && !inTable && !line.startsWith('#')) {
      const desc = line.trim();
      if (desc && !currentModule.responsibility) {
        currentModule.responsibility = desc;
      }
    }
  }

  // 保存最后一个模块
  if (currentModule?.name) {
    modules.push(completeModule(currentModule));
  }

  return {
    project,
    modules,
    metadata: {
      version: '1.0.0',
      format: 'module-list',
    },
  };
}

/**
 * 完成模块对象，填充默认值
 */
function completeModule(partial: Partial<Module>): Module {
  return {
    name: partial.name || 'unnamed',
    responsibility: partial.responsibility || '待补充',
    dependencies: partial.dependencies || [],
    interfaces: partial.interfaces || [],
    priority: partial.priority || 'P1',
  };
}

/**
 * 解析依赖字符串
 * 格式：模块A(必需), 模块B(可选)
 */
function parseDependencies(text: string): ModuleDependency[] {
  if (!text || text === '-' || text === '无') return [];

  return text.split(',').map((dep) => {
    const match = dep.trim().match(/^(.+?)(?:\((.+)\))?$/);
    if (match) {
      return {
        target: match[1].trim(),
        type: (match[2] as 'required' | 'optional') || 'required',
      };
    }
    return { target: dep.trim(), type: 'required' as const };
  });
}

/**
 * 解析接口字符串
 * 格式：API(用户接口), Event(订单事件)
 */
function parseInterfaces(text: string): ModuleInterface[] {
  if (!text || text === '-' || text === '无') return [];

  return text.split(',').map((iface) => {
    const match = iface.trim().match(/^(.+?)(?:\((.+)\))?$/);
    if (match) {
      return {
        name: match[2]?.trim() || match[1].trim(),
        type: (match[1].trim().toLowerCase() as 'api' | 'event' | 'library' | 'database') || 'api',
      };
    }
    return { name: iface.trim(), type: 'api' as const };
  });
}
