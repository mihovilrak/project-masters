import { parsePositiveInteger, parseIdParam, toTimestamp } from '../requestParsing';

describe('parsePositiveInteger', () => {
  it('accepts positive integer strings and numbers', () => {
    expect(parsePositiveInteger('5')).toBe(5);
    expect(parsePositiveInteger(5)).toBe(5);
  });

  it('rejects zero, negatives, decimals, and non-numeric input', () => {
    expect(parsePositiveInteger('0')).toBeNull();
    expect(parsePositiveInteger('-1')).toBeNull();
    expect(parsePositiveInteger('1.5')).toBeNull();
    expect(parsePositiveInteger('abc')).toBeNull();
    expect(parsePositiveInteger(undefined)).toBeNull();
    expect(parsePositiveInteger(null)).toBeNull();
    expect(parsePositiveInteger({})).toBeNull();
  });
});

describe('parseIdParam', () => {
  it('returns null for missing or empty values', () => {
    expect(parseIdParam(undefined)).toBeNull();
    expect(parseIdParam('')).toBeNull();
    expect(parseIdParam('  ')).toBeNull();
  });

  it('parses a single numeric value', () => {
    expect(parseIdParam('7')).toBe(7);
  });

  it('parses comma-separated values into an array of numbers', () => {
    expect(parseIdParam('1,2,3')).toEqual([1, 2, 3]);
  });

  it('drops invalid entries from a comma-separated list', () => {
    expect(parseIdParam('1,abc,3')).toEqual([1, 3]);
  });

  it('returns null when every entry in a comma-separated list is invalid', () => {
    expect(parseIdParam('abc,def')).toBeNull();
  });

  it('joins a repeated query param array before parsing', () => {
    expect(parseIdParam(['1', '2'])).toEqual([1, 2]);
  });

  it('returns null for a single non-numeric value', () => {
    expect(parseIdParam('abc')).toBeNull();
  });
});

describe('toTimestamp', () => {
  it('returns NaN for null or undefined', () => {
    expect(toTimestamp(null)).toBeNaN();
    expect(toTimestamp(undefined)).toBeNaN();
  });

  it('converts a Date instance to its epoch timestamp', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(toTimestamp(date)).toBe(date.getTime());
  });

  it('converts an ISO string to a timestamp', () => {
    expect(toTimestamp('2026-01-01T00:00:00.000Z')).toBe(
      new Date('2026-01-01T00:00:00.000Z').getTime(),
    );
  });

  it('returns NaN for an unparseable string', () => {
    expect(toTimestamp('not-a-date')).toBeNaN();
  });
});
