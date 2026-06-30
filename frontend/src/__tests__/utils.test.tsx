import { describe, it, expect } from 'vitest';
import { formatTokenAmount } from '../utils';

describe('formatTokenAmount', () => {
  it('formats integer amounts with no decimals', () => {
    expect(formatTokenAmount(1234567n, 0)).toBe('1,234,567');
  });

  it('formats amounts with decimals and appends CVT', () => {
    expect(formatTokenAmount(1234500n, 4)).toBe('123.45 CVT');
    expect(formatTokenAmount(1n, 6)).toBe('0.00 CVT');
  });
});
