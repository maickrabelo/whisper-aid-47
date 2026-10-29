import { describe, expect, test } from 'bun:test';
import { getHealthImpact, getHseitHealthLegend, normalizeScore } from './hseitQuestions';

describe('HSE-IT semáforo', () => {
  test('questões negativas são invertidas', () => {
    expect(normalizeScore(1, true)).toBe(5);
    expect(normalizeScore(5, true)).toBe(1);
    expect(normalizeScore(4, false)).toBe(4);
  });
  test('4,57 é favorável', () => expect(getHealthImpact(4.57)).toBe('favorable'));
  test('3,64 é intermediário', () => expect(getHealthImpact(3.64)).toBe('intermediate'));
  test('2,32 é risco', () => expect(getHealthImpact(2.32)).toBe('risk'));
  test('legenda: verde no topo da escala', () => {
    expect(getHseitHealthLegend().map(l => l.range)).toEqual(['3,67 a 5,00', '2,33 a 3,66', 'abaixo de 2,33']);
  });
});
