import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { JsonLd, Skeleton } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { load } from "@/lib/fetch";
import {
  getSocietySummaryBySlug,
  listSocietyOptions,
} from "@/lib/queries";
import type { SocietySummary } from "@/lib/marketplace";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

// SSR: the compared set lives in `?ids=` so a comparison is shareable. Each
// combination is a legitimate distinct page, so the canonical points to itself
// (seo.mdc) — not collapsed to a single /compare. Reading searchParams already
// opts this route into dynamic rendering.

const MAX_COMPARE = 3;

// The comparison widget is interactive and heavier than the rest of the page,
// so it is code-split via next/dynamic (seo.mdc — keep the base bundle lean).
const CompareTool = dynamic(
  () =>
    import("@/components/marketplace/compare-tool").then((m) => m.CompareTool),
  {
    loading: () => <Skeleton className="h-96 w-full rounded-xl" />,
  },
);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Parses `?ids=a,b,c` into a de-duplicated, capped list of society slugs. */
function parseIds(
  params: Record<string, string | string[] | undefined>,
): string[] {
  const raw = params.ids;
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0),
    ),
  ].slice(0, MAX_COMPARE);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const ids = parseIds(await searchParams);
  const path = ids.length > 0 ? `/compare?ids=${ids.join(",")}` : "/compare";
  return pageMetadata({
    title: "Compare housing societies side by side",
    description: `Compare verified housing societies across Pakistan on price, approvals, development stage and buyer ratings — side by side on ${SITE.name}.`,
    path,
  });
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ids = parseIds(await searchParams);

  const [summaries, options] = await Promise.all([
    Promise.all(ids.map((slug) => getSocietySummaryBySlug(slug))),
    load(() => listSocietyOptions()),
  ]);

  const societies = summaries.filter(
    (summary): summary is SocietySummary => summary !== null,
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
        ])}
      />

      <SectionHeading
        eyebrow="Compare"
        title="Society comparison"
        description="Put up to three societies side by side. The best value in each row is highlighted, and the comparison stays in the URL so you can share it."
      />

      <div className="mt-8">
        <CompareTool
          societies={societies}
          options={options.status === "success" ? options.data : []}
        />
      </div>
    </div>
  );
}
