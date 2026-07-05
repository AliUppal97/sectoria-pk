import type { JSX } from "react";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mt-10 font-sans text-xl font-bold text-text-primary first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-8 font-sans text-lg font-bold text-text-primary first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-6 font-sans text-md font-semibold text-text-primary first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mt-4 font-sans text-base leading-relaxed text-text-secondary first:mt-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 font-sans text-base text-text-secondary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 font-sans text-base text-text-secondary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-4 border-border-strong pl-4 font-sans text-base italic text-text-secondary">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    const isExternal =
      href?.startsWith("http://") || href?.startsWith("https://");
    return (
      <a
        href={href}
        className="font-medium text-text-accent underline-offset-2 hover:underline"
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-sm text-text-primary">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-border-base bg-surface-subtle p-4 font-mono text-sm text-text-primary">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-border-base" />,
};

/**
 * Renders article markdown on the server with GFM support and HTML sanitization.
 * Raw HTML in the source is stripped — only safe markdown elements survive.
 */
export function ArticleMarkdown({ content }: { content: string }): JSX.Element {
  return (
    <div className="article-markdown max-w-none">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </Markdown>
    </div>
  );
}
