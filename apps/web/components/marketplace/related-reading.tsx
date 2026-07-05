import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { ArticleCard } from "@/components/marketplace/article-card";
import type { ArticlePublic } from "@/lib/article";
import { blogPath } from "@/lib/marketplace";

interface RelatedReadingProps {
  readonly articles: readonly ArticlePublic[];
  readonly contextLabel?: string;
}

/**
 * Optional editorial block on society/developer profiles when tagged articles exist.
 * Returns null when the list is empty — callers do not need to branch.
 */
export function RelatedReading({
  articles,
  contextLabel,
}: RelatedReadingProps) {
  if (articles.length === 0) return null;

  const description = contextLabel
    ? `Editorial guides and market insights related to ${contextLabel}.`
    : "Editorial guides and market insights from the Sectoria team.";

  return (
    <section className="border-t border-border-base bg-surface-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Related reading"
            title="See what's happening"
            description={description}
          />
          <Button asChild variant="ghost" size="sm" className="shrink-0 self-start sm:self-auto">
            <Link href={blogPath()}>
              All articles
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <ul
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-live="polite"
        >
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </ul>
      </div>
    </section>
  );
}
