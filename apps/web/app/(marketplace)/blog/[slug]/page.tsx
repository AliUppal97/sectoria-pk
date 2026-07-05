import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button, ErrorState, JsonLd, formatDate } from "@sectoria/ui";
import { ArticleMarkdown } from "@/components/marketplace/article-markdown";
import { QuoteRequestForm } from "@/components/marketplace/quote-request-form";
import { LeadSource } from "@sectoria/types";
import type { ArticlePublic } from "@/lib/article";
import { resolveArticleCoverUrl } from "@/lib/article";
import { isNotFound } from "@/lib/fetch";
import { blogPath } from "@/lib/marketplace";
import {
  articlePageMetadata,
  articleSchema,
  breadcrumbSchema,
} from "@/lib/seo";
import { getApi } from "@/lib/trpc/server";
import { SITE } from "@/lib/site";

export const revalidate = 21600;

export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

type LoadResult =
  | { readonly ok: true; readonly article: ArticlePublic }
  | { readonly ok: false; readonly reason: "not_found" | "error" };

const loadArticle = cache(async (slug: string): Promise<LoadResult> => {
  try {
    const article = await getApi().article.getBySlug({ slug });
    return { ok: true, article: article as ArticlePublic };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, reason: "not_found" };
    if (process.env.NODE_ENV !== "production") {
      console.error("[blog] article load failed:", error);
    }
    return { ok: false, reason: "error" };
  }
});

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const articles = await getApi().article.list({ limit: 50 });
    return articles.map((article) => ({ slug: article.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadArticle(slug);
  if (!result.ok) {
    return { title: "Article not found", robots: { index: false } };
  }

  const { article } = result;
  const coverUrl = resolveArticleCoverUrl(article.coverKey);

  return articlePageMetadata({
    title: article.title,
    description: article.excerpt,
    path: blogPath(slug),
    authorName: article.authorName,
    publishedAt: article.publishedAt,
    ...(coverUrl ? { ogImage: coverUrl } : {}),
    keywords: [article.title, "Pakistan housing", "housing society guide"],
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const result = await loadArticle(slug);

  if (result.ok === false && result.reason === "not_found") {
    notFound();
  }

  if (result.ok === false) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-12 sm:px-6">
        <ErrorState
          title="Couldn't load this article"
          message="We're having trouble reaching our content service. Please try again in a moment."
          supportHref="/support"
        />
      </div>
    );
  }

  const { article } = result;
  const coverUrl = resolveArticleCoverUrl(article.coverKey);
  const publishedLabel = article.publishedAt
    ? formatDate(article.publishedAt)
    : null;
  const path = blogPath(slug);

  return (
    <article className="mx-auto w-full max-w-[720px] px-4 py-12 sm:px-6">
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: blogPath() },
            { name: article.title, path },
          ]),
          articleSchema({
            title: article.title,
            description: article.excerpt,
            path,
            authorName: article.authorName,
            publishedAt: article.publishedAt,
            modifiedAt: article.publishedAt ?? article.createdAt,
            ...(coverUrl ? { imageUrl: coverUrl } : {}),
          }),
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-8">
        <Button asChild variant="ghost" size="sm" className="min-h-[44px] px-0">
          <Link href={blogPath()}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            All articles
          </Link>
        </Button>
      </nav>

      <header className="flex flex-col gap-4 border-b border-border-base pb-8">
        {publishedLabel ? (
          <time
            dateTime={article.publishedAt ?? undefined}
            className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary"
          >
            {publishedLabel}
          </time>
        ) : null}
        <h1 className="font-sans text-2xl font-bold text-text-primary sm:text-3xl">
          {article.title}
        </h1>
        <p className="font-sans text-base text-text-secondary">{article.excerpt}</p>
        <p className="font-sans text-sm text-text-tertiary">
          By {article.authorName}
        </p>
      </header>

      {coverUrl ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl border border-border-base bg-surface-subtle">
          <Image
            src={coverUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="mt-8 flex aspect-[16/9] items-center justify-center rounded-xl border border-border-base bg-surface-subtle text-brand-navy-mid"
        >
          <FileText className="h-12 w-12" />
        </div>
      )}

      <div className="mt-10">
        <ArticleMarkdown content={article.body} />
      </div>

      <aside className="mt-12 border-t border-border-base pt-12">
        <QuoteRequestForm
          societyIds={article.societyId ? [article.societyId] : []}
          source={LeadSource.SUPPORT}
          heading="Compare options with an advisor"
          description={`Interested after reading this guide? A ${SITE.name} advisor can negotiate the best authorized-dealer price — no direct builder contact upfront.`}
        />
      </aside>
    </article>
  );
}
