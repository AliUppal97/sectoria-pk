import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { ArticleConsole } from "@/components/admin/article-console";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Articles",
  robots: { index: false, follow: false },
};

export default async function AdminArticlesPage() {
  const api = await getAuthedApi();
  const articles = await api.article.listForAdmin();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Articles"
        description="Author blog posts and editorial content for the content hub."
      />
      <Card className="p-6">
        <ArticleConsole
          initialArticles={
            articles as Parameters<typeof ArticleConsole>[0]["initialArticles"]
          }
        />
      </Card>
    </div>
  );
}
