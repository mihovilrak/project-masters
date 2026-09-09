const isProduction = process.env.NODE_ENV === 'production';

const noop = (): void => {};

/** Keys redacted in production logs: password, token, authorization, cookie, session, etc. */
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'cookie',
  'session',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
]);

const REDACTED = '[REDACTED]';
const CIRCULAR = '[Circular]';
const MAX_DEPTH_REACHED = '[Max Depth]';
const MAX_LOG_DEPTH = 6;
const SENSITIVE_VALUE_PATTERN = new RegExp(
  `\\b(${Array.from(SENSITIVE_KEYS).join('|')})\\b(\\s*[=:]\\s*)(["'][^"']*["']|[^\\s&,;]+)`,
  'gi',
);

const sanitizeString = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.stringify(sanitizeForLog(JSON.parse(value)));
    } catch {
      // Continue with pattern-based redaction for non-JSON strings.
    }
  }

  return value
    .replace(
      /\bAuthorization\s*[:=]\s*[^\r\n,;]+/gi,
      `Authorization: ${REDACTED}`,
    )
    .replace(SENSITIVE_VALUE_PATTERN, `$1$2${REDACTED}`)
    .replace(/\bBearer\s+[^\s,;]+/gi, `Bearer ${REDACTED}`);
};

/**
 * Redacts sensitive values and safely traverses nested or circular log payloads.
 * Exported for testing.
 */
export function sanitizeForLog(value: unknown): unknown {
  const sanitize = (
    currentValue: unknown,
    depth: number,
    ancestors: WeakSet<object>,
  ): unknown => {
    if (typeof currentValue === 'string') {
      return sanitizeString(currentValue);
    }
    if (currentValue === null || typeof currentValue !== 'object') {
      return currentValue;
    }
    if (depth >= MAX_LOG_DEPTH) {
      return MAX_DEPTH_REACHED;
    }
    if (ancestors.has(currentValue)) {
      return CIRCULAR;
    }

    ancestors.add(currentValue);
    if (Array.isArray(currentValue)) {
      const sanitized = currentValue.map((item) =>
        sanitize(item, depth + 1, ancestors),
      );
      ancestors.delete(currentValue);
      return sanitized;
    }

    const obj = currentValue as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      const isSensitive = Array.from(SENSITIVE_KEYS).some((sensitiveKey) =>
        lower.includes(sensitiveKey.toLowerCase()),
      );
      try {
        out[key] = isSensitive
          ? REDACTED
          : sanitize(obj[key], depth + 1, ancestors);
      } catch {
        out[key] = '[Unserializable]';
      }
    }
    ancestors.delete(currentValue);
    return out;
  };

  return sanitize(value, 0, new WeakSet<object>());
}

function sanitizeArgs(args: unknown[]): unknown[] {
  return isProduction ? args.map(sanitizeForLog) : args;
}

const logger = {
  debug: isProduction ? noop : (...args: unknown[]) => console.debug(...args),
  info: isProduction ? noop : (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...sanitizeArgs(args)),
  error: (...args: unknown[]) => console.error(...sanitizeArgs(args)),
};

export default logger;
