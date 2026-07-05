import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, EmptyState, ErrorState, JsonLd } from "@sectoria/ui";
import { ArticleCard } from "@/components/marketplace/article-card";
import { SectionHeading } from "@/components/marketplace/section-heading";
import type { ArticlePublic } from "@/lib/article";
import { load } from "@/lib/fetch";
import { blogPath } from "@/lib/marketplace";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { getApi } from "@/lib/trpc/server";
import { SITE } from "@/lib/site";

export const revalidate = 21600;

const loadArticles = cache(async (): Promise<ArticlePublic[]> => {
  const articles = await getApi().article.list({ limit: 50 });
  return articles as ArticlePublic[];
});

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: `Insights & guides — ${SITE.name} blog`,
    description: `Editorial guides on verified housing societies, developer track records, and smart property decisions in Pakistan — from the ${SITE.name} team.`,
    path: blogPath(),
    keywords: [
      "Pakistan housing blog",
      "gated communities Lahore",
      "housing society investment",
      "real estate guides Pakistan",
    ],
  });
}

export default async function BlogIndexPage() {
  const result = await load(() => loadArticles());

  if (result.status === "error") {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <ErrorState
          title="Couldn't load articles"
          message="We're having trouble reaching our content service. Please try again in a moment."
          supportHref="/support"
        />
      </div>
    );
  }

  const articles = result.data;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: blogPath() },
        ])}
      />

      <nav aria-label="Breadcrumb" className="mb-8">
        <Button asChild variant="ghost" size="sm" className="min-h-[44px] px-0">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </Button>
      </nav>

      <SectionHeading
        eyebrow="Content hub"
        title="See what's happening"
        description={`Market insights, society spotlights, and developer credibility guides — curated by the ${SITE.name} editorial team.`}
      />

      <div className="mt-10">
        {articles.length === 0 ? (
          <EmptyState
            heading="No published articles yet"
            description="Editorial guides will appear here once the team publishes them."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/societies">Browse societies</Link>
              </Button>
            }
          />
        ) : (
          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-live="polite"
          >
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
