import { sanitizeHtml } from '../sanitize';

describe('sanitizeHtml', () => {
  it('removes dangerous URI schemes', () => {
    const sanitized = sanitizeHtml(
      '<a href="javascript:alert(1)">bad</a><a href="data:text/html,test">data</a>',
    );

    expect(sanitized).toBe('<a>bad</a><a>data</a>');
  });

  it('allows approved and relative links', () => {
    const sanitized = sanitizeHtml(
      '<a href="https://example.com">web</a><a href="/tasks/1">task</a><a href="#section">section</a>',
    );

    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).toContain('href="/tasks/1"');
    expect(sanitized).toContain('href="#section"');
  });

  it('forces safe rel values on targeted links', () => {
    const sanitized = sanitizeHtml(
      '<a href="https://example.com" target="_blank" rel="nofollow">web</a>',
    );

    expect(sanitized).toContain('rel="nofollow noopener noreferrer"');
  });
});
