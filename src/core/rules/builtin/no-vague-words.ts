import type { Rule } from '../types.js';

/**
 * 禁用模糊词汇
 * 检测需求文本中不应出现的模糊表述
 */
const VAGUE_WORDS = [
  '尽快',
  '多种',
  '适当',
  '等等',
  '若干',
  '一些',
  '良好',
  '合理',
  '必要时',
  '可能的话',
  '尽量',
  '差不多',
  '大概',
  '基本',
];

export const noVagueWordsRule: Rule = {
  id: 'no-vague-words',
  name: '禁用模糊词',
  level: 'WARNING',
  target: 'requirement',
  check: (ctx) => {
    const text = ctx.requirement!.text;
    const found = VAGUE_WORDS.filter((word) => text.includes(word));
    if (found.length > 0) {
      return {
        message: `需求文本包含模糊词汇: ${found.join(', ')}。建议使用可量化的表述`,
      };
    }
    return null;
  },
};
