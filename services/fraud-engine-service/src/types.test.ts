import { scoreToRiskLevel } from './types';

describe('scoreToRiskLevel', () => {
  it('maps score bands to risk levels', () => {
    expect(scoreToRiskLevel(10)).toBe('low');
    expect(scoreToRiskLevel(45)).toBe('medium');
    expect(scoreToRiskLevel(75)).toBe('high');
    expect(scoreToRiskLevel(92)).toBe('critical');
  });
});