import {
  EmailTemplateRenderContext,
  replaceEmailTemplateVariables,
} from './email-template-variables';
import { markdownToEmailHtml } from './markdown-to-email-html';

export type RenderedEmailTemplate = {
  html: string;
  markdown: string;
};

export function renderEmailTemplate(
  markdown: string,
  context: EmailTemplateRenderContext,
): RenderedEmailTemplate {
  const renderedMarkdown = replaceEmailTemplateVariables(markdown, context);

  return {
    html: markdownToEmailHtml(renderedMarkdown),
    markdown: renderedMarkdown,
  };
}
