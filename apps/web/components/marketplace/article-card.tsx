import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { formatDate } from "@sectoria/ui";
import type { ArticlePublic } from "@/lib/article";
import { resolveArticleCoverUrl } from "@/lib/article";
import { blogPath } from "@/lib/marketplace";

export function ArticleCard({ article }: { article: ArticlePublic }) {
  const coverUrl = resolveArticleCoverUrl(article.coverKey);
  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt)
    : null;

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border-base bg-surface-card shadow-sm transition-shadow duration-150 hover:shadow-md">
      <Link
        href={blogPath(article.slug)}
        className="group flex min-h-[44px] flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[16/9] w-full bg-surface-subtle">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center text-brand-navy-mid"
            >
              <FileText className="h-10 w-10" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          {publishedLabel ? (
            <time
              dateTime={article.publishedAt ?? undefined}
              className="font-sans text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary"
            >
              {publishedLabel}
            </time>
          ) : null}
          <h2 className="font-sans text-md font-semibold text-text-primary group-hover:text-brand-navy-mid">
            {article.title}
          </h2>
          <p className="line-clamp-3 font-sans text-sm text-text-secondary">
            {article.excerpt}
          </p>
          <span className="mt-auto pt-2 font-sans text-xs text-text-tertiary">
            By {article.authorName}
          </span>
        </div>
      </Link>
    </li>
  );
}
