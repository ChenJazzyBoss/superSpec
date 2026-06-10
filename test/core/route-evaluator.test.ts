import { describe, it, expect } from 'vitest';
import {
  detectIntent,
  evaluateRoute,
  formatRouteDecision,
  type IntentType,
  type RouteType,
} from '../../src/core/route-evaluator.js';

describe('route-evaluator', () => {
  describe('detectIntent', () => {
    it('should detect bug-fix intent', () => {
      expect(detectIntent('PDF导出报错了')).toBe('bug-fix');
      expect(detectIntent('测试失败，认证模块有 bug')).toBe('bug-fix');
      expect(detectIntent('系统崩溃了')).toBe('bug-fix');
      expect(detectIntent('debug the login issue')).toBe('bug-fix');
    });

    it('should detect modification intent', () => {
      expect(detectIntent('修改导出格式为 PDF')).toBe('modification');
      expect(detectIntent('删掉旧的导出功能')).toBe('modification');
      expect(detectIntent('把认证改为 OAuth2')).toBe('modification');
      expect(detectIntent('update the export module')).toBe('modification');
    });

    it('should detect new-feature intent', () => {
      expect(detectIntent('新增批量导出功能')).toBe('new-feature');
      expect(detectIntent('添加用户注册')).toBe('new-feature');
      expect(detectIntent('实现 PDF 导出')).toBe('new-feature');
      expect(detectIntent('add new export feature')).toBe('new-feature');
    });

    it('should default to new-feature for ambiguous input', () => {
      expect(detectIntent('我想做一个导出')).toBe('new-feature');
      expect(detectIntent('需要导出功能')).toBe('new-feature');
    });
  });

  describe('evaluateRoute', () => {
    it('should route bug-fix to debug path', () => {
      const decision = evaluateRoute('bug-fix');
      expect(decision.route).toBe('debug');
      expect(decision.reason).toContain('排障');
    });

    it('should route modification to full path', () => {
      const decision = evaluateRoute('modification');
      expect(decision.route).toBe('full');
      expect(decision.reason).toContain('需求变更');
    });

    it('should route simple new feature to lightweight path', () => {
      const decision = evaluateRoute('new-feature', {
        capabilityCount: 1,
        estimatedRequirements: 1,
      });
      expect(decision.route).toBe('lightweight');
      expect(decision.reason).toContain('轻量');
    });

    it('should route complex new feature to full path', () => {
      const decision = evaluateRoute('new-feature', {
        capabilityCount: 3,
        estimatedRequirements: 5,
      });
      expect(decision.route).toBe('full');
      expect(decision.reason).toContain('复杂');
    });

    it('should route to full path when affecting existing spec', () => {
      const decision = evaluateRoute('new-feature', {
        affectsExistingSpec: true,
        capabilityCount: 1,
        estimatedRequirements: 1,
      });
      expect(decision.route).toBe('full');
      expect(decision.evidence.affectsExistingSpec).toBe(true);
    });

    it('should route to full path for multiple capabilities', () => {
      const decision = evaluateRoute('new-feature', {
        capabilityCount: 2,
        estimatedRequirements: 2,
      });
      expect(decision.route).toBe('full');
    });

    it('should include correct evidence', () => {
      const decision = evaluateRoute('modification', {
        capabilityCount: 2,
        affectsExistingSpec: true,
        estimatedRequirements: 3,
      });
      expect(decision.evidence.intent).toBe('modification');
      expect(decision.evidence.capabilityCount).toBe(2);
      expect(decision.evidence.affectsExistingSpec).toBe(true);
      expect(decision.evidence.estimatedRequirements).toBe(3);
    });
  });

  describe('formatRouteDecision', () => {
    it('should format lightweight route', () => {
      const decision = evaluateRoute('new-feature', { capabilityCount: 1 });
      const output = formatRouteDecision(decision);
      expect(output).toContain('轻量路径');
      expect(output).toContain('new-feature');
    });

    it('should format full route', () => {
      const decision = evaluateRoute('modification');
      const output = formatRouteDecision(decision);
      expect(output).toContain('完整路径');
      expect(output).toContain('modification');
    });

    it('should format debug route', () => {
      const decision = evaluateRoute('bug-fix');
      const output = formatRouteDecision(decision);
      expect(output).toContain('排障路径');
      expect(output).toContain('bug-fix');
    });
  });

  describe('integration scenarios', () => {
    it('should handle the 3-path decision flow correctly', () => {
      // 简单新功能 → 轻量
      const simple = evaluateRoute(detectIntent('新增导出按钮'), { capabilityCount: 1 });
      expect(simple.route).toBe('lightweight');

      // 复杂新功能 → 完整
      const complex = evaluateRoute(detectIntent('实现完整的用户认证系统'), { capabilityCount: 3 });
      expect(complex.route).toBe('full');

      // 需求变更 → 完整
      const mod = evaluateRoute(detectIntent('修改导出格式为 PDF'));
      expect(mod.route).toBe('full');

      // 排障 → debug
      const bug = evaluateRoute(detectIntent('导出功能报错了'));
      expect(bug.route).toBe('debug');
    });

    it('should allow user to force full path for simple feature', () => {
      // 用户可以通过 --existing-spec 强制走完整路径
      const decision = evaluateRoute('new-feature', {
        affectsExistingSpec: true,
        capabilityCount: 1,
        estimatedRequirements: 1,
      });
      expect(decision.route).toBe('full');
    });
  });
});
