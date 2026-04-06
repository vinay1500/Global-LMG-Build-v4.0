import React, { type CSSProperties, Fragment } from 'react';

interface SafeRichTextProps {
  html: string;
  className?: string;
  style?: CSSProperties;
}

const ALLOWED_TAGS = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br']);

const toSafeHref = (value: string | null) => {
  if (!value) {
    return undefined;
  }

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const renderNodes = (nodes: NodeListOf<ChildNode> | ChildNode[], keyPrefix: string) => {
  return Array.from(nodes).map((node, index) => renderNode(node, `${keyPrefix}-${index}`));
};

const renderNode = (node: ChildNode, key: string): React.ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = renderNodes(element.childNodes as NodeListOf<ChildNode>, key);

  if (!ALLOWED_TAGS.has(tag)) {
    return <Fragment key={key}>{children}</Fragment>;
  }

  if (tag === 'a') {
    const href = toSafeHref(element.getAttribute('href'));

    return (
      <a
        key={key}
        href={href}
        target={href ? '_blank' : undefined}
        rel={href ? 'noopener noreferrer nofollow' : undefined}
        className="text-blue-600 underline underline-offset-4 hover:text-blue-700"
      >
        {children}
      </a>
    );
  }

  return React.createElement(tag, { key }, children);
};

export const SafeRichText = ({ html, className, style }: SafeRichTextProps) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  const content = renderNodes(document.body.childNodes as NodeListOf<ChildNode>, 'safe-rich-text');

  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
};
