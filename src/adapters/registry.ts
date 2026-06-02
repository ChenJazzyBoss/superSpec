/**
 * Adapter 注册表
 *
 * 管理所有已注册的语言适配器。
 */

import type { Adapter } from './types.js';

export class AdapterRegistry {
  private adapters = new Map<string, Adapter>();

  register(adapter: Adapter): void {
    this.adapters.set(adapter.language.toLowerCase(), adapter);
  }

  get(language: string): Adapter {
    const adapter = this.adapters.get(language.toLowerCase());
    if (!adapter) {
      const supported = Array.from(this.adapters.keys()).join(', ');
      throw new Error(`不支持的语言: ${language}。支持的语言: ${supported || '无'}`);
    }
    return adapter;
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.adapters.keys());
  }

  has(language: string): boolean {
    return this.adapters.has(language.toLowerCase());
  }
}

export const adapterRegistry = new AdapterRegistry();
