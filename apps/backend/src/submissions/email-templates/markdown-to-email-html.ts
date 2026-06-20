const inlineTokenPattern =
  /(\[([^\]]+)\]\(([^)]+)\))|(\+\+([^+]+)\+\+)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

export function markdownToEmailHtml(markdown: string): string {
  if (!markdown.trim()) {
    return '';
  }

  const autoLinkedMarkdown = autoLinkUrls(markdown);
  const paragraphs = autoLinkedMarkdown.split(/\n{2,}/);
  const html = paragraphs
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(renderParagraph)
    .join('');

  return html || '<p></p>';
}

function renderParagraph(paragraph: string): string {
  if (paragraph === '&nbsp;' || paragraph === '&amp;nbsp;') {
    return '<p><br></p>';
  }

  const content = paragraph.split(/ *\n/).map(parseInlineMarkdown).join('<br>');

  return `<p>${content}</p>`;
}

function parseInlineMarkdown(value: string): string {
  let html = '';
  let lastIndex = 0;

  for (const match of value.matchAll(inlineTokenPattern)) {
    html += escapeHtml(value.slice(lastIndex, match.index));
    html += renderInlineMatch(match);
    lastIndex = match.index + match[0].length;
  }

  return html + escapeHtml(value.slice(lastIndex));
}

function renderInlineMatch(match: RegExpMatchArray): string {
  if (match[1]) {
    return renderLink(match[2], match[3]);
  }

  if (match[4]) {
    return `<u>${escapeHtml(match[5])}</u>`;
  }

  if (match[6]) {
    return `<strong>${escapeHtml(match[7])}</strong>`;
  }

  if (match[8]) {
    return `<em>${escapeHtml(match[9])}</em>`;
  }

  if (match[10]) {
    return escapeHtml(match[11]);
  }

  return escapeHtml(match[0]);
}

function renderLink(label: string, href: string): string {
  const safeHref = sanitizeHref(href);

  if (!safeHref) {
    return escapeHtml(label);
  }

  return `<a href="${escapeHtml(safeHref)}">${escapeHtml(label)}</a>`;
}

function autoLinkUrls(markdown: string): string {
  return markdown.replace(
    /(^|[\s(])((?:https?:\/\/|www\.)[^\s<>"\u00A0]+)/g,
    (match: string, prefix: string, url: string, offset: number) => {
      if (isInsideMarkdownLink(markdown, offset + prefix.length)) {
        return match;
      }

      const normalizedUrl = url.startsWith('www.') ? `https://${url}` : url;

      return `${prefix}[${url}](${normalizedUrl})`;
    },
  );
}

function isInsideMarkdownLink(markdown: string, urlOffset: number): boolean {
  return markdown.slice(Math.max(0, urlOffset - 2), urlOffset) === '](';
}

function sanitizeHref(href: string): string {
  const trimmedHref = href.trim();

  if (/^(https?:\/\/|mailto:)/i.test(trimmedHref)) {
    return trimmedHref;
  }

  return '';
}

function escapeHtml(value: string | undefined): string {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
