jest.unmock('../logger');
import { sanitizeForLog } from '../logger';

describe('logger sanitizeForLog', () => {
  it('redacts password key in objects', () => {
    const input = { user: 'john', password: 'secret123' };
    const result = sanitizeForLog(input) as Record<string, unknown>;
    expect(result.password).toBe('[REDACTED]');
    expect(result.user).toBe('john');
  });

  it('redacts token and authorization keys', () => {
    const input = { token: 'abc', authorization: 'Bearer xyz' };
    const result = sanitizeForLog(input) as Record<string, unknown>;
    expect(result.token).toBe('[REDACTED]');
    expect(result.authorization).toBe('[REDACTED]');
  });

  it('redacts secrets in pre-stringified payloads', () => {
    const result = sanitizeForLog(
      JSON.stringify({ login: 'john', password: 'secret123' }),
    );

    expect(result).toBe('{"login":"john","password":"[REDACTED]"}');
  });

  it('redacts authorization values in plain strings', () => {
    expect(sanitizeForLog('Authorization: Bearer abc.def')).toBe(
      'Authorization: [REDACTED]',
    );
  });

  it('handles circular objects', () => {
    const input: Record<string, unknown> = { name: 'root' };
    input.self = input;

    expect(sanitizeForLog(input)).toEqual({
      name: 'root',
      self: '[Circular]',
    });
  });

  it('caps traversal depth', () => {
    const input = { a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } } };
    const result = sanitizeForLog(input) as Record<string, any>;

    expect(result.a.b.c.d.e.f).toBe('[Max Depth]');
  });

  it('returns safe non-string primitives as-is', () => {
    expect(sanitizeForLog('hello')).toBe('hello');
    expect(sanitizeForLog(42)).toBe(42);
    expect(sanitizeForLog(null)).toBe(null);
  });
});
