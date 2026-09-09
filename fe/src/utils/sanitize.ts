import DOMPurify from 'dompurify';

const ALLOWED_URI_REGEXP =
  /^(?!(?:javascript|data|vbscript):)(?!\/\/)(?:(?:https?|mailto|tel):|[#/?]|\.{1,2}\/|[a-z0-9])/i;
const SAFE_LINK_TARGETS = new Set(['_blank', '_self', '_parent', '_top']);

DOMPurify.addHook('uponSanitizeAttribute', (node, hookEvent) => {
  if (hookEvent.attrName !== 'target') return;

  const isSafeTarget =
    node.tagName === 'A' &&
    SAFE_LINK_TARGETS.has(hookEvent.attrValue.toLowerCase());
  hookEvent.keepAttr = isSafeTarget;
  hookEvent.forceKeepAttr = isSafeTarget;
});

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A' || !node.hasAttribute('target')) return;

  const relValues = new Set(
    (node.getAttribute('rel') || '').split(/\s+/).filter(Boolean),
  );
  relValues.add('noopener');
  relValues.add('noreferrer');
  node.setAttribute('rel', Array.from(relValues).join(' '));
});

/**
 * Sanitize HTML string for safe rendering (e.g. welcome_message).
 * Allows basic formatting tags; strips scripts and dangerous attributes.
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'u',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP,
  });
}
